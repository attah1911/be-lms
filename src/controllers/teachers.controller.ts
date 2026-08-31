import { Response } from "express";
import { Prisma } from "@prisma/client";
import { IPaginationQuery, IReqUser } from "../utils/interfaces";
import { prisma } from "../utils/prisma";
import { teacherDAO } from "../validators";
import response from "../utils/response";
import { ROLES } from "../utils/constant";
import { encrypt } from "../utils/encryption";

const default_password_guru = "Smpn37Jakartaguru";

export default {
  async getTeacherProfile(req: IReqUser, res: Response) {
    try {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user?.id } });
      if (!teacher) {
        return response.error(res, null, "Data guru tidak ditemukan");
      }
      response.success(res, teacher, "Sukses mengambil data guru");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data guru");
    }
  },

  async updateTeacherProfile(req: IReqUser, res: Response) {
    try {
      const { nrk, noTelp } = req.body;

      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user?.id } });
      if (!teacher) {
        return response.error(res, null, "Data guru tidak ditemukan");
      }

      const updatedTeacher = await prisma.teacher.update({
        where: { id: teacher.id },
        data: { nrk, noTelp },
      });

      response.success(res, updatedTeacher, "Sukses mengupdate data guru");
    } catch (error) {
      response.error(res, error, "Gagal mengupdate data guru");
    }
  },

  async create(req: IReqUser, res: Response) {
    try {
      await teacherDAO.validate(req.body);

      const { fullName, email, nrk, noTelp } = req.body;
      const username = email.split("@")[0];

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            fullName,
            username,
            email,
            password: encrypt(default_password_guru),
            role: ROLES.GURU,
            isActive: true,
          },
        });

        const teacher = await tx.teacher.create({
          data: { fullName, email, nrk, noTelp, userId: user.id },
        });

        return { user, teacher };
      });

      response.success(res, result, "Sukses membuat data guru");
    } catch (error) {
      response.error(res, error, "Gagal membuat data guru");
    }
  },

  async findAll(req: IReqUser, res: Response) {
    const { page = 1, limit = 10, search } = req.query as unknown as IPaginationQuery;

    try {
      const take = Number(limit);
      const current = Number(page);
      const where: Prisma.TeacherWhereInput = search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { nrk: { contains: search, mode: "insensitive" } },
              { noTelp: { contains: search, mode: "insensitive" } },
            ],
          }
        : {};

      const [result, count] = await Promise.all([
        prisma.teacher.findMany({
          where,
          take,
          skip: (current - 1) * take,
          orderBy: { createdAt: "desc" },
        }),
        prisma.teacher.count({ where }),
      ]);

      return response.pagination(
        res,
        result,
        { total: count, totalPages: Math.ceil(count / take), current },
        "Sukses mengambil data guru"
      );
    } catch (error) {
      return response.error(res, error, "Gagal mengambil data guru");
    }
  },

  async findOne(req: IReqUser, res: Response) {
    try {
      const result = await prisma.teacher.findUnique({ where: { id: req.params.id } });
      if (!result) {
        return response.error(res, null, "Data guru tidak ditemukan");
      }
      response.success(res, result, "Sukses mengambil data guru");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data guru");
    }
  },

  async update(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;
      const { fullName, email, nrk, noTelp } = req.body;

      const teacher = await prisma.teacher.findUnique({ where: { id } });
      if (!teacher) {
        return response.error(res, null, "Data guru tidak ditemukan");
      }

      const updatedTeacher = await prisma.$transaction(async (tx) => {
        const updated = await tx.teacher.update({
          where: { id },
          data: { fullName, email, nrk, noTelp },
        });
        await tx.user.update({
          where: { id: teacher.userId },
          data: { fullName, email },
        });
        return updated;
      });

      response.success(res, updatedTeacher, "Sukses mengupdate data guru");
    } catch (error) {
      response.error(res, error, "Gagal mengupdate data guru");
    }
  },

  async remove(req: IReqUser, res: Response) {
    try {
      const teacher = await prisma.teacher.findUnique({ where: { id: req.params.id } });
      if (!teacher) {
        return response.error(res, null, "Data guru tidak ditemukan");
      }

      // Deleting the User cascades to the Teacher row (onDelete: Cascade).
      await prisma.user.delete({ where: { id: teacher.userId } });

      response.success(res, null, "Sukses menghapus data guru");
    } catch (error) {
      response.error(res, error, "Gagal menghapus data guru");
    }
  },
};
