import { Response } from "express";
import { Prisma } from "@prisma/client";
import { IPaginationQuery, IReqUser } from "../utils/interfaces";
import { prisma } from "../utils/prisma";
import { userDAO, userUpdateDAO } from "../validators";
import { encrypt } from "../utils/encryption";
import response from "../utils/response";

export default {
  async create(req: IReqUser, res: Response) {
    try {
      await userDAO.validate(req.body);
      const { fullName, username, email, password, role, profilePicture, isActive } = req.body;

      const result = await prisma.user.create({
        data: {
          fullName,
          username,
          email,
          password: encrypt(password),
          role,
          ...(profilePicture ? { profilePicture } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });

      response.success(res, result, "Sukses membuat data pengguna");
    } catch (error) {
      response.error(res, error, "Gagal membuat data pengguna");
    }
  },

  async findAll(req: IReqUser, res: Response) {
    const { page = 1, limit = 10, search } = req.query as unknown as IPaginationQuery;

    try {
      const take = Number(limit);
      const current = Number(page);
      const where: Prisma.UserWhereInput = search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { username: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {};

      const [result, count] = await Promise.all([
        prisma.user.findMany({
          where,
          take,
          skip: (current - 1) * take,
          orderBy: { createdAt: "desc" },
        }),
        prisma.user.count({ where }),
      ]);

      response.pagination(
        res,
        result,
        { total: count, totalPages: Math.ceil(count / take), current },
        "Sukses mengambil data pengguna"
      );
    } catch (error) {
      response.error(res, error, "Gagal mengambil data pengguna");
    }
  },

  async findOne(req: IReqUser, res: Response) {
    try {
      const result = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (!result) {
        return response.notFound(res, "Data pengguna tidak ditemukan");
      }
      response.success(res, result, "Sukses mengambil data pengguna");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data pengguna");
    }
  },

  async update(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;
      await userUpdateDAO.validate(req.body);

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return response.notFound(res, "Data pengguna tidak ditemukan");
      }

      const { fullName, username, email, profilePicture, password, role } = req.body;
      const result = await prisma.user.update({
        where: { id },
        data: {
          ...(fullName !== undefined ? { fullName } : {}),
          ...(username !== undefined ? { username } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(profilePicture !== undefined ? { profilePicture } : {}),
          ...(password ? { password: encrypt(password) } : {}),
          ...(role ? { role } : {}),
        },
      });

      response.success(res, result, "Sukses mengupdate data pengguna");
    } catch (error) {
      response.error(res, error, "Gagal mengupdate data pengguna");
    }
  },

  async remove(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return response.notFound(res, "Data pengguna tidak ditemukan");
      }

      // Cascades to teacher/student/todo rows (onDelete: Cascade).
      await prisma.user.delete({ where: { id } });

      response.success(res, null, "Sukses menghapus data pengguna");
    } catch (error) {
      response.error(res, error, "Gagal menghapus data pengguna");
    }
  },
};
