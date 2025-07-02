import { Response } from "express";
import { IPaginationQuery, IReqUser } from "../utils/interfaces";
import TodoModel, { todoDAO } from "../models/todo.model";
import response from "../utils/response";

export default {
  async create(req: IReqUser, res: Response) {
    try {
      await todoDAO.validate(req.body);

      if (!req.user?.id) {
        return response.error(res, null, "User tidak terautentikasi");
      }

      const todo = await TodoModel.create({
        ...req.body,
        userId: req.user.id
      });

      response.success(res, todo, "Sukses membuat todo");
    } catch (error) {
      response.error(res, error, "Gagal membuat todo");
    }
  },

  async findAll(req: IReqUser, res: Response) {
    const {
      page = 1,
      limit = 10,
      completed,
    } = req.query as unknown as IPaginationQuery & { completed?: string };

    try {
      if (!req.user?.id) {
        return response.error(res, null, "User tidak terautentikasi");
      }

      const query: any = { userId: req.user.id };

      if (completed !== undefined) {
        query.completed = completed === 'true';
      }

      const result = await TodoModel.find(query)
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .sort({ dueDate: 1, createdAt: -1 })
        .exec();

      const count = await TodoModel.countDocuments(query);
      response.pagination(
        res,
        result,
        {
          total: count,
          totalPages: Math.ceil(count / Number(limit)),
          current: Number(page),
        },
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
        return response.error(res, null, "User tidak terautentikasi");
      }

      const todo = await TodoModel.findOne({
        _id: id,
        userId: req.user.id
      });

      if (!todo) {
        return response.error(res, null, "Data todo tidak ditemukan");
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
        return response.error(res, null, "User tidak terautentikasi");
      }

      await todoDAO.validate(req.body);

      const todo = await TodoModel.findOne({
        _id: id,
        userId: req.user.id
      });

      if (!todo) {
        return response.error(res, null, "Data todo tidak ditemukan");
      }

      const updatedTodo = await TodoModel.findByIdAndUpdate(
        id,
        { ...req.body },
        { new: true }
      );

      response.success(res, updatedTodo, "Sukses memperbarui todo");
    } catch (error) {
      response.error(res, error, "Gagal memperbarui todo");
    }
  },

  async remove(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      if (!req.user?.id) {
        return response.error(res, null, "User tidak terautentikasi");
      }

      const todo = await TodoModel.findOne({
        _id: id,
        userId: req.user.id
      });

      if (!todo) {
        return response.error(res, null, "Data todo tidak ditemukan");
      }

      await TodoModel.findByIdAndDelete(id);

      response.success(res, null, "Sukses menghapus todo");
    } catch (error) {
      response.error(res, error, "Gagal menghapus todo");
    }
  },

  async toggleCompleted(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      if (!req.user?.id) {
        return response.error(res, null, "User tidak terautentikasi");
      }

      const todo = await TodoModel.findOne({
        _id: id,
        userId: req.user.id
      });

      if (!todo) {
        return response.error(res, null, "Data todo tidak ditemukan");
      }

      const updatedTodo = await TodoModel.findByIdAndUpdate(
        id,
        { completed: !todo.completed },
        { new: true }
      );

      response.success(res, updatedTodo, "Sukses mengubah status todo");
    } catch (error) {
      response.error(res, error, "Gagal mengubah status todo");
    }
  }
}; 