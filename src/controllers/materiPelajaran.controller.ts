import { Response } from "express";
import { IPaginationQuery, IReqUser } from "../utils/interfaces";
import MateriPelajaranModel, { materiPelajaranDAO } from "../models/materiPelajaran.model";
import MataPelajaranModel from "../models/mataPelajaran.model";
import response from "../utils/response";
import mongoose from "mongoose";
import { ROLES } from "../utils/constant";

export default {
  async create(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['MateriPelajaran']
     #swagger.security = [{
       "bearerAuth": []
     }]
     */
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { mataPelajaranId } = req.params;
      
      await materiPelajaranDAO.validate(req.body);

      const mataPelajaran = await MataPelajaranModel.findById(mataPelajaranId);
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      if (req.user?.role === ROLES.GURU) {
        const teacher = await mongoose.model('Teacher').findOne({ userId: req.user.id });
        if (!teacher || mataPelajaran.guru.toString() !== teacher._id.toString()) {
          return response.error(res, null, "Anda tidak memiliki akses ke mata pelajaran ini");
        }
      }

      const maxOrder = await MateriPelajaranModel.findOne({ mataPelajaran: mataPelajaranId })
        .sort({ order: -1 })
        .select('order');
      
      const nextOrder = maxOrder ? maxOrder.order + 1 : 1;

      const materiPelajaran = await MateriPelajaranModel.create([{
        ...req.body,
        mataPelajaran: mataPelajaranId,
        order: nextOrder
      }], { session });

      await MataPelajaranModel.findByIdAndUpdate(
        mataPelajaranId,
        { $push: { materiPelajaran: materiPelajaran[0]._id } },
        { session }
      );

      await session.commitTransaction();
      response.success(res, materiPelajaran[0], "Sukses membuat materi pelajaran");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal membuat materi pelajaran");
    } finally {
      session.endSession();
    }
  },

  async findAll(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['MateriPelajaran']
     #swagger.security = [{
       "bearerAuth": []
     }]
     */
    const {
      page = 1,
      limit = 10,
      search,
    } = req.query as unknown as IPaginationQuery;
    const { mataPelajaranId } = req.params;

    try {
      const mataPelajaran = await MataPelajaranModel.findById(mataPelajaranId);
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      if (req.user?.role === ROLES.GURU) {
        const teacher = await mongoose.model('Teacher').findOne({ userId: req.user.id });
        if (!teacher || mataPelajaran.guru.toString() !== teacher._id.toString()) {
          return response.error(res, null, "Anda tidak memiliki akses ke mata pelajaran ini");
        }
      }

      const query: any = { mataPelajaran: mataPelajaranId };

      if (search) {
        Object.assign(query, {
          $or: [
            { judul: { $regex: search, $options: "i" } },
            { "konten.teks": { $regex: search, $options: "i" } },
          ],
        });
      }

      const result = await MateriPelajaranModel.find(query)
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ order: 1 })
        .exec();

      const count = await MateriPelajaranModel.countDocuments(query);
      response.pagination(
        res,
        result,
        {
          total: count,
          totalPages: Math.ceil(count / limit),
          current: page,
        },
        "Sukses mengambil data materi pelajaran"
      );
    } catch (error) {
      response.error(res, error, "Gagal mengambil data materi pelajaran");
    }
  },

  async findOne(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['MateriPelajaran']
     #swagger.security = [{
       "bearerAuth": []
     }]
     */
    try {
      const { id, mataPelajaranId } = req.params;

      const materiPelajaran = await MateriPelajaranModel.findOne({
        _id: id,
        mataPelajaran: mataPelajaranId
      });

      if (!materiPelajaran) {
        return response.error(res, null, "Data materi pelajaran tidak ditemukan");
      }

      const mataPelajaran = await MataPelajaranModel.findById(mataPelajaranId);
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      if (req.user?.role === ROLES.GURU) {
        const teacher = await mongoose.model('Teacher').findOne({ userId: req.user.id });
        if (!teacher || mataPelajaran.guru.toString() !== teacher._id.toString()) {
          return response.error(res, null, "Anda tidak memiliki akses ke mata pelajaran ini");
        }
      }

      response.success(res, materiPelajaran, "Sukses mengambil data materi pelajaran");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data materi pelajaran");
    }
  },

  async update(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['MateriPelajaran']
     #swagger.security = [{
       "bearerAuth": []
     }]
     */
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id, mataPelajaranId } = req.params;

      await materiPelajaranDAO.validate(req.body);

      const materiPelajaran = await MateriPelajaranModel.findOne({
        _id: id,
        mataPelajaran: mataPelajaranId
      });

      if (!materiPelajaran) {
        return response.error(res, null, "Data materi pelajaran tidak ditemukan");
      }

      const mataPelajaran = await MataPelajaranModel.findById(mataPelajaranId);
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      if (req.user?.role === ROLES.GURU) {
        const teacher = await mongoose.model('Teacher').findOne({ userId: req.user.id });
        if (!teacher || mataPelajaran.guru.toString() !== teacher._id.toString()) {
          return response.error(res, null, "Anda tidak memiliki akses ke mata pelajaran ini");
        }
      }

      if (req.body.order && req.body.order !== materiPelajaran.order) {
        const count = await MateriPelajaranModel.countDocuments({ mataPelajaran: mataPelajaranId });
        if (req.body.order < 1 || req.body.order > count) {
          return response.error(res, null, "Urutan tidak valid");
        }

        if (req.body.order > materiPelajaran.order) {
          await MateriPelajaranModel.updateMany(
            {
              mataPelajaran: mataPelajaranId,
              order: { $gt: materiPelajaran.order, $lte: req.body.order }
            },
            { $inc: { order: -1 } },
            { session }
          );
        } else {
          await MateriPelajaranModel.updateMany(
            {
              mataPelajaran: mataPelajaranId,
              order: { $gte: req.body.order, $lt: materiPelajaran.order }
            },
            { $inc: { order: 1 } },
            { session }
          );
        }
      }

      const result = await MateriPelajaranModel.findByIdAndUpdate(
        id,
        req.body,
        { new: true, session }
      );

      await session.commitTransaction();
      response.success(res, result, "Sukses mengupdate materi pelajaran");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal mengupdate materi pelajaran");
    } finally {
      session.endSession();
    }
  },

  async remove(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['MateriPelajaran']
     #swagger.security = [{
       "bearerAuth": []
     }]
     */
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id, mataPelajaranId } = req.params;

      const materiPelajaran = await MateriPelajaranModel.findOne({
        _id: id,
        mataPelajaran: mataPelajaranId
      });

      if (!materiPelajaran) {
        return response.error(res, null, "Data materi pelajaran tidak ditemukan");
      }

      const mataPelajaran = await MataPelajaranModel.findById(mataPelajaranId);
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      if (req.user?.role === ROLES.GURU) {
        const teacher = await mongoose.model('Teacher').findOne({ userId: req.user.id });
        if (!teacher || mataPelajaran.guru.toString() !== teacher._id.toString()) {
          return response.error(res, null, "Anda tidak memiliki akses ke mata pelajaran ini");
        }
      }

      await MateriPelajaranModel.findByIdAndDelete(id, { session });

      await MateriPelajaranModel.updateMany(
        {
          mataPelajaran: mataPelajaranId,
          order: { $gt: materiPelajaran.order }
        },
        { $inc: { order: -1 } },
        { session }
      );

      await MataPelajaranModel.findByIdAndUpdate(
        mataPelajaranId,
        { $pull: { materiPelajaran: id } },
        { session }
      );

      await session.commitTransaction();
      response.success(res, null, "Sukses menghapus materi pelajaran");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal menghapus materi pelajaran");
    } finally {
      session.endSession();
    }
  },

  async reorder(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['MateriPelajaran']
     #swagger.security = [{
       "bearerAuth": []
     }]
     */
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { mataPelajaranId } = req.params;
      const { items } = req.body as { items: { id: string; order: number }[] };

      const mataPelajaran = await MataPelajaranModel.findById(mataPelajaranId);
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      if (req.user?.role === ROLES.GURU) {
        const teacher = await mongoose.model('Teacher').findOne({ userId: req.user.id });
        if (!teacher || mataPelajaran.guru.toString() !== teacher._id.toString()) {
          return response.error(res, null, "Anda tidak memiliki akses ke mata pelajaran ini");
        }
      }

      const count = await MateriPelajaranModel.countDocuments({ mataPelajaran: mataPelajaranId });
      const orderSet = new Set(items.map(item => item.order));
      if (orderSet.size !== items.length || 
          Math.min(...items.map(i => i.order)) < 1 || 
          Math.max(...items.map(i => i.order)) > count) {
        return response.error(res, null, "Urutan tidak valid");
      }

      const updates = items.map(item => 
        MateriPelajaranModel.findOneAndUpdate(
          { _id: item.id, mataPelajaran: mataPelajaranId },
          { order: item.order },
          { session }
        )
      );

      await Promise.all(updates);
      await session.commitTransaction();

      const result = await MateriPelajaranModel.find({ mataPelajaran: mataPelajaranId })
        .sort({ order: 1 });

      response.success(res, result, "Sukses mengubah urutan materi pelajaran");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal mengubah urutan materi pelajaran");
    } finally {
      session.endSession();
    }
  }
};