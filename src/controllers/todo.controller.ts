import { Response } from "express";
import { IPaginationQuery, IReqUser } from "../utils/interfaces";
import { prisma } from "../utils/prisma";
import { todoDAO } from "../validators";
import response from "../utils/response";

export default {
  async create(req: IReqUser, res: Response) {
    try {
      await todoDAO.validate(req.body);

      if (!req.user?.id) {
        return response.unauthenticated(res, "User tidak terautentikasi");
      }

      const { title, description, dueDate, completed } = req.body;
      const todo = await prisma.todo.create({
        data: {
          title,
          description: description ?? null,
          dueDate: dueDate ? new Date(dueDate) : null,
          completed: completed ?? false,
          userId: req.user.id,
        },
      });

      response.success(res, todo, "Sukses membuat todo");
    } catch (error) {
      response.error(res, error, "Gagal membuat todo");
    }
  },

  async findAll(req: IReqUser, res: Response) {
    const { page = 1, limit = 10, completed } = req.query as unknown as IPaginationQuery & {
      completed?: string;
    };

    try {
      if (!req.user?.id) {
        return response.unauthenticated(res, "User tidak terautentikasi");
      }

      const take = Number(limit);
      const current = Number(page);
      const where = {
        userId: req.user.id,
        ...(completed !== undefined ? { completed: completed === "true" } : {}),
      };

      const [result, count] = await Promise.all([
        prisma.todo.findMany({
          where,
          take,
          skip: (current - 1) * take,
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        }),
        prisma.todo.count({ where }),
      ]);

      response.pagination(
        res,
        result,
        { total: count, totalPages: Math.ceil(count / take), current },
        "Sukses mengambil data todo"
      );
    } catch (error) {
      response.error(res, error, "Gagal mengambil data todo");
    }
  },

  async findOne(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      if (!req.user?.id) {
        return response.unauthenticated(res, "User tidak terautentikasi");
      }

      const todo = await prisma.todo.findFirst({ where: { id, userId: req.user.id } });
      if (!todo) {
        return response.notFound(res, "Data todo tidak ditemukan");
      }

      response.success(res, todo, "Sukses mengambil data todo");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data todo");
    }
  },

  async update(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      if (!req.user?.id) {
        return response.unauthenticated(res, "User tidak terautentikasi");
      }

      await todoDAO.validate(req.body);

      const existing = await prisma.todo.findFirst({ where: { id, userId: req.user.id } });
      if (!existing) {
        return response.notFound(res, "Data todo tidak ditemukan");
      }

      const { title, description, dueDate, completed } = req.body;
      const updatedTodo = await prisma.todo.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
          ...(completed !== undefined ? { completed } : {}),
        },
      });

      response.success(res, updatedTodo, "Sukses memperbarui todo");
    } catch (error) {
      response.error(res, error, "Gagal memperbarui todo");
    }
  },

  async remove(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      if (!req.user?.id) {
        return response.unauthenticated(res, "User tidak terautentikasi");
      }

      const existing = await prisma.todo.findFirst({ where: { id, userId: req.user.id } });
      if (!existing) {
        return response.notFound(res, "Data todo tidak ditemukan");
      }

      await prisma.todo.delete({ where: { id } });
      response.success(res, null, "Sukses menghapus todo");
    } catch (error) {
      response.error(res, error, "Gagal menghapus todo");
    }
  },

  async toggleCompleted(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      if (!req.user?.id) {
        return response.unauthenticated(res, "User tidak terautentikasi");
      }

      const todo = await prisma.todo.findFirst({ where: { id, userId: req.user.id } });
      if (!todo) {
        return response.notFound(res, "Data todo tidak ditemukan");
      }

      const updatedTodo = await prisma.todo.update({
        where: { id },
        data: { completed: !todo.completed },
      });

      response.success(res, updatedTodo, "Sukses mengubah status todo");
    } catch (error) {
      response.error(res, error, "Gagal mengubah status todo");
    }
  },
};
