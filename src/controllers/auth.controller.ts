import { Request, Response } from "express";
import * as Yup from "yup";
import mongoose from "mongoose";

import UserModel from "../models/user.model";
import StudentModel from "../models/student.model";
import { studentDAO } from "../models/student.model";
import { encrypt } from "../utils/encryption";
import { generateToken } from "../utils/jwt";
import { IReqUser } from "../utils/interfaces";
import response from "../utils/response";
import { userUpdateDAO } from "../models/user.dao";
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

const registerValidateSchema = Yup.object({
  fullName: Yup.string().required(),
  username: Yup.string().required(),
  email: Yup.string().email().required(),
  password: Yup.string()
    .required()
    .min(6, "Password setidaknya harus 6 karakter")
    .test(
      "at-least-one-uppercase-letter",
      "Password harus memiliki setidaknya satu huruf kapital",
      (value) => {
        if (!value) return false;
        const regex = /^(?=.*[A-Z])/;
        return regex.test(value);
      }
    )
    .test(
      "at-least-one-number",
      "Password harus memiliki setidaknya satu angka",
      (value) => {
        if (!value) return false;
        const regex = /^(?=.*\d)/;
        return regex.test(value);
      }
    ),
  confirmPassword: Yup.string()
    .required()
    .oneOf([Yup.ref("password"), ""], "Password tidak sesuai"),
});

const authController = {
  async register(req: Request, res: Response) {
    const { fullName, username, email, password, confirmPassword } =
      req.body as TRegister;

    try {
      const existingUsername = await UserModel.findOne({ username });
      if (existingUsername) {
        return response.error(res, { field: 'username' }, "Username sudah digunakan");
      }

      const existingEmail = await UserModel.findOne({ email });
      if (existingEmail) {
        return response.error(res, { field: 'email' }, "Email sudah digunakan");
      }

      await registerValidateSchema.validate({
        fullName,
        username,
        email,
        password,
        confirmPassword,
      });

      const activationToken = generateActivationToken();

      // Pass raw password, let middleware handle encryption
      const result = await UserModel.create({
        fullName,
        email,
        username,
        password,
        activationToken,
        isActive: false
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

      const user = await UserModel.findOne({ email, isActive: false });
      if (!user) {
        return response.error(res, null, "Email tidak ditemukan atau akun sudah aktif");
      }

      const activationToken = generateActivationToken();

      await UserModel.updateOne(
        { _id: user._id },
        { activationToken }
      );

      await sendActivationEmail(email, user.username, user.fullName, activationToken);

      response.success(res, null, "Email aktivasi berhasil dikirim ulang");
    } catch (error) {
      response.error(res, error, "Gagal mengirim ulang email aktivasi");
    }
  },

  async activation(req: Request, res: Response) {
    try {
      const { token } = req.body;

      // Find user by activation token
      const user = await UserModel.findOne({ activationToken: token });
      
      if (!user) {
        return response.error(res, null, 'Token aktivasi tidak valid');
      }

      // Update user to be active and set role as murid
      const updatedUser = await UserModel.findByIdAndUpdate(
        user._id,
        {
          isActive: true,
          role: 'murid',
          $unset: { activationToken: 1 }
        },
        {
          new: true,
          select: '_id email fullName role isActive'
        }
      );

      if (!updatedUser) {
        return response.error(res, null, 'Gagal mengaktivasi akun');
      }

      // Generate auth token
      const authToken = generateToken({
        id: updatedUser._id,
        role: updatedUser.role,
      });

      response.success(
        res, 
        { 
          user: {
            _id: updatedUser._id,
            email: updatedUser.email,
            fullName: updatedUser.fullName,
            role: updatedUser.role,
            isActive: updatedUser.isActive
          }, 
          token: authToken 
        }, 
        "User berhasil diaktivasi"
      );
    } catch (error) {
      response.error(res, error, 'User gagal diaktivasi');
    }
  },

  async login(req: Request, res: Response) {
    const { identifier, password } = req.body as TLogin;

    try {
      // Find user by email or username
      const user = await UserModel.findOne({
        $or: [
          { email: identifier },
          { username: identifier },
        ]
      });

      if (!user) {
        return response.unauthorized(res, "User tidak ditemukan");
      }

      // Check if user is activated
      if (!user.isActive) {
        return response.unauthorized(res, "Akun belum diaktivasi. Silakan cek email Anda untuk aktivasi.");
      }

      // Validate password
      const validatePassword: boolean = encrypt(password) === user.password;

      if (!validatePassword) {
        return response.unauthorized(res, "Password Salah");
      }

      const token = generateToken({
        id: user._id,
        role: user.role,
      });

      response.success(
        res, 
        {
          user: {
            _id: user._id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            isActive: user.isActive
          },
          token
        }, 
        "Login Sukses"
      );
    } catch (error) {
      response.error(res, error, "Login Gagal");
    }
  },

  async me(req: IReqUser, res: Response) {
    try {
      const user = req.user;
      const result = await UserModel.findById(user?.id);

      response.success(res, result, "Sukses mengambil user profile");
    } catch (error) {
      response.error(res, error, "Gagal mengambil user profile");
    }
  },

  async updateProfile(req: IReqUser, res: Response) {
    try {
      const user = req.user;
      const { fullName, username, email, profilePicture } = req.body;

      const updateData = {
        fullName,
        username,
        email,
        profilePicture
      };

      await userUpdateDAO.validate(updateData);

      if (updateData.username) {
        const existingUser = await UserModel.findOne({
          username: updateData.username,
          _id: { $ne: user?.id }
        });
        if (existingUser) {
          return response.error(res, { field: 'username' }, "Username sudah digunakan");
        }
      }

      if (updateData.email) {
        const existingUser = await UserModel.findOne({
          email: updateData.email,
          _id: { $ne: user?.id }
        });
        if (existingUser) {
          return response.error(res, { field: 'email' }, "Email sudah digunakan");
        }
      }

      const result = await UserModel.findByIdAndUpdate(
        user?.id,
        updateData,
        { new: true }
      );

      if (!result) {
        return response.error(res, null, "Data pengguna tidak ditemukan");
      }

      response.success(res, result, "Sukses mengupdate profil");
    } catch (error) {
      response.error(res, error, "Gagal mengupdate profil");
    }
  },

  async verifyPassword(req: IReqUser, res: Response) {
    try {
      const { password } = req.body;
      
      if (!password) {
        return response.error(res, null, "Password diperlukan");
      }
      
      if (!req.user || !req.user.id) {
        return response.unauthorized(res, "User tidak terautentikasi");
      }
      
      // Get user from database
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return response.unauthorized(res, "User tidak ditemukan");
      }
      
      // Encrypt the provided password for comparison
      const encryptedPassword = encrypt(password);
      
      // Verify password
      const isPasswordValid = encryptedPassword === user.password;
      
      if (!isPasswordValid) {
        return response.error(res, null, "Invalid password");
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
        return response.error(res, null, "Password saat ini dan password baru diperlukan");
      }
      
      if (!req.user || !req.user.id) {
        return response.unauthorized(res, "User tidak terautentikasi");
      }
      
      // Validate new password
      if (newPassword.length < 6) {
        return response.error(res, null, "Password minimal harus 6 karakter");
      }
      
      if (!/[A-Z]/.test(newPassword)) {
        return response.error(res, null, "Password harus memiliki setidaknya satu huruf kapital");
      }
      
      if (!/\d/.test(newPassword)) {
        return response.error(res, null, "Password harus memiliki setidaknya satu angka");
      }
      
      // Get user from database
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return response.unauthorized(res, "User tidak ditemukan");
      }
      
      // Verify current password
      const isCurrentPasswordValid = encrypt(currentPassword) === user.password;
      
      if (!isCurrentPasswordValid) {
        return response.error(res, null, "Password saat ini tidak valid");
      }
      
      // Update password
      const encryptedNewPassword = encrypt(newPassword);
      
      await UserModel.updateOne(
        { _id: req.user.id },
        { password: encryptedNewPassword }
      );
      
      return response.success(res, null, "Password berhasil diperbarui");
    } catch (error) {
      return response.error(res, error, "Gagal memperbarui password");
    }
  },

  async submitStudentData(req: Request, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { nis, kelas, noTelp, email } = req.body;

      // Find the user and ensure they are a student
      const user = await UserModel.findOne({ 
        email, 
        role: 'murid',
        isActive: true 
      });

      if (!user) {
        return response.error(res, null, "Email tidak valid atau bukan email murid yang aktif");
      }

      // Check if student data already exists
      const existingStudent = await StudentModel.findOne({ 
        $or: [
          { userId: user._id },
          { nis: nis }
        ]
      });

      if (existingStudent) {
        if (existingStudent.userId.toString() === user._id.toString()) {
          return response.error(res, null, "Data murid sudah ada untuk akun ini");
        } else {
          return response.error(res, null, "NIS sudah digunakan oleh murid lain");
        }
      }

      // Create new student data
      const newStudentData = {
        fullName: user.fullName,
        email: user.email,
        nis,
        kelas,
        noTelp,
        userId: user._id
      };

      // Validate student data
      await studentDAO.validate(newStudentData);

      // Create student record
      const student = await StudentModel.create([newStudentData], { session });

      await session.commitTransaction();
      response.success(res, student[0], "Sukses membuat data murid. Silakan login.");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal membuat data murid");
    } finally {
      session.endSession();
    }
  },

  async getStudentData(req: Request, res: Response) {
    try {
      const { email } = req.query;

      if (!email) {
        return response.error(res, null, "Email harus disertakan");
      }

      // Find user and ensure they are a student
      const user = await UserModel.findOne({ 
        email, 
        role: 'murid',
        isActive: true 
      });

      if (!user) {
        return response.error(res, null, "Email tidak valid atau bukan email murid yang aktif");
      }

      // Find student data
      const student = await StudentModel.findOne({ userId: user._id });

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
