import { Request, Response } from "express";

import { prisma } from "../utils/prisma";
import { registerDAO, userUpdateDAO, studentDAO } from "../validators";
import { encrypt, verify } from "../utils/encryption";
import { generateToken } from "../utils/jwt";
import { IReqUser } from "../utils/interfaces";
import response from "../utils/response";
import { generateActivationToken, sendActivationEmail } from "../utils/mail/mail";

type TRegister = {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type TLogin = {
  identifier: string;
  password: string;
};

const authController = {
  async register(req: Request, res: Response) {
    const { fullName, username, email, password, confirmPassword } = req.body as TRegister;

    try {
      if (await prisma.user.findUnique({ where: { username } })) {
        return response.error(res, { field: "username" }, "Username sudah digunakan");
      }
      if (await prisma.user.findUnique({ where: { email } })) {
        return response.error(res, { field: "email" }, "Email sudah digunakan");
      }

      await registerDAO.validate({ fullName, username, email, password, confirmPassword });

      const activationToken = generateActivationToken();

      const result = await prisma.user.create({
        data: {
          fullName,
          email,
          username,
          password: encrypt(password),
          activationToken,
          isActive: false,
        },
      });

      await sendActivationEmail(email, username, fullName, activationToken);

      response.success(res, result, "Registrasi Sukses");
    } catch (error) {
      response.error(res, error, "Registrasi gagal");
    }
  },

  async resendActivation(req: Request, res: Response) {
    try {
      const { email } = req.body;

      const user = await prisma.user.findFirst({ where: { email, isActive: false } });
      if (!user) {
        return response.notFound(res, "Email tidak ditemukan atau akun sudah aktif");
      }

      const activationToken = generateActivationToken();
      await prisma.user.update({ where: { id: user.id }, data: { activationToken } });

      await sendActivationEmail(email, user.username, user.fullName, activationToken);

      response.success(res, null, "Email aktivasi berhasil dikirim ulang");
    } catch (error) {
      response.error(res, error, "Gagal mengirim ulang email aktivasi");
    }
  },

  async activation(req: Request, res: Response) {
    try {
      const { token } = req.body;

      const user = await prisma.user.findUnique({ where: { activationToken: token } });
      if (!user) {
        return response.badRequest(res, "Token aktivasi tidak valid");
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { isActive: true, role: "murid", activationToken: null },
      });

      const authToken = generateToken({ id: updatedUser.id, role: updatedUser.role });

      response.success(
        res,
        {
          user: {
            _id: updatedUser.id,
            email: updatedUser.email,
            fullName: updatedUser.fullName,
            role: updatedUser.role,
            isActive: updatedUser.isActive,
          },
          token: authToken,
        },
        "User berhasil diaktivasi"
      );
    } catch (error) {
      response.error(res, error, "User gagal diaktivasi");
    }
  },

  async login(req: Request, res: Response) {
    const { identifier, password } = req.body as TLogin;

    try {
      const user = await prisma.user.findFirst({
        where: { OR: [{ email: identifier }, { username: identifier }] },
        omit: { password: false },
      });

      if (!user) {
        return response.unauthenticated(res, "User tidak ditemukan");
      }
      if (!user.isActive) {
        return response.unauthorized(
          res,
          "Akun belum diaktivasi. Silakan cek email Anda untuk aktivasi."
        );
      }
      if (!verify(password, user.password)) {
        return response.unauthenticated(res, "Password Salah");
      }

      const token = generateToken({ id: user.id, role: user.role });

      response.success(
        res,
        {
          user: {
            _id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            isActive: user.isActive,
          },
          token,
        },
        "Login Sukses"
      );
    } catch (error) {
      response.error(res, error, "Login Gagal");
    }
  },

  async me(req: IReqUser, res: Response) {
    try {
      if (!req.user?.id) {
        return response.unauthenticated(res);
      }
      const result = await prisma.user.findUnique({ where: { id: req.user.id } });
      response.success(res, result, "Sukses mengambil user profile");
    } catch (error) {
      response.error(res, error, "Gagal mengambil user profile");
    }
  },

  async updateProfile(req: IReqUser, res: Response) {
    try {
      if (!req.user?.id) {
        return response.unauthenticated(res);
      }
      const userId = req.user.id;
      const { fullName, username, email, profilePicture } = req.body;

      await userUpdateDAO.validate({ fullName, username, email, profilePicture });

      if (username) {
        const existing = await prisma.user.findFirst({
          where: { username, NOT: { id: userId } },
        });
        if (existing) {
          return response.error(res, { field: "username" }, "Username sudah digunakan");
        }
      }

      if (email) {
        const existing = await prisma.user.findFirst({
          where: { email, NOT: { id: userId } },
        });
        if (existing) {
          return response.error(res, { field: "email" }, "Email sudah digunakan");
        }
      }

      const result = await prisma.user.update({
        where: { id: userId },
        data: { fullName, username, email, profilePicture },
      });

      response.success(res, result, "Sukses mengupdate profil");
    } catch (error) {
      response.error(res, error, "Gagal mengupdate profil");
    }
  },

  async verifyPassword(req: IReqUser, res: Response) {
    try {
      const { password } = req.body;
      if (!password) {
        return response.badRequest(res, "Password diperlukan");
      }
      if (!req.user?.id) {
        return response.unauthenticated(res, "User tidak terautentikasi");
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        omit: { password: false },
      });
      if (!user) {
        return response.unauthenticated(res, "User tidak ditemukan");
      }

      if (!verify(password, user.password)) {
        return response.unauthenticated(res, "Invalid password");
      }

      return response.success(res, { success: true }, "Password valid");
    } catch (error) {
      return response.error(res, error, "Gagal memverifikasi password");
    }
  },

  async changePassword(req: IReqUser, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return response.badRequest(res, "Password saat ini dan password baru diperlukan");
      }
      if (!req.user?.id) {
        return response.unauthenticated(res, "User tidak terautentikasi");
      }
      if (newPassword.length < 6) {
        return response.badRequest(res, "Password minimal harus 6 karakter");
      }
      if (!/[A-Z]/.test(newPassword)) {
        return response.badRequest(res, "Password harus memiliki setidaknya satu huruf kapital");
      }
      if (!/\d/.test(newPassword)) {
        return response.badRequest(res, "Password harus memiliki setidaknya satu angka");
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        omit: { password: false },
      });
      if (!user) {
        return response.unauthenticated(res, "User tidak ditemukan");
      }
      if (!verify(currentPassword, user.password)) {
        return response.badRequest(res, "Password saat ini tidak valid");
      }

      await prisma.user.update({
        where: { id: req.user.id },
        data: { password: encrypt(newPassword) },
      });

      return response.success(res, null, "Password berhasil diperbarui");
    } catch (error) {
      return response.error(res, error, "Gagal memperbarui password");
    }
  },

  async submitStudentData(req: Request, res: Response) {
    try {
      const { nis, kelas, noTelp, email } = req.body;

      const user = await prisma.user.findFirst({
        where: { email, role: "murid", isActive: true },
      });
      if (!user) {
        return response.badRequest(
          res,
          "Email tidak valid atau bukan email murid yang aktif"
        );
      }

      const existingStudent = await prisma.student.findFirst({
        where: { OR: [{ userId: user.id }, { nis }] },
      });
      if (existingStudent) {
        return existingStudent.userId === user.id
          ? response.badRequest(res, "Data murid sudah ada untuk akun ini")
          : response.badRequest(res, "NIS sudah digunakan oleh murid lain");
      }

      const newStudentData = {
        fullName: user.fullName,
        email: user.email,
        nis,
        kelas,
        noTelp,
        userId: user.id,
      };
      await studentDAO.validate(newStudentData);

      const student = await prisma.student.create({ data: newStudentData });

      response.success(res, student, "Sukses membuat data murid. Silakan login.");
    } catch (error) {
      response.error(res, error, "Gagal membuat data murid");
    }
  },

  async getStudentData(req: Request, res: Response) {
    try {
      const { email } = req.query;

      if (!email || typeof email !== "string") {
        return response.badRequest(res, "Email harus disertakan");
      }

      const user = await prisma.user.findFirst({
        where: { email, role: "murid", isActive: true },
      });
      if (!user) {
        return response.badRequest(
          res,
          "Email tidak valid atau bukan email murid yang aktif"
        );
      }

      const student = await prisma.student.findUnique({ where: { userId: user.id } });
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan", 404);
      }

      response.success(res, student, "Sukses mengambil data murid");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data murid");
    }
  },
};

export default authController;
