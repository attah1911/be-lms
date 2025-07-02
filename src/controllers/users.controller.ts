import { Response } from "express";
import { IPaginationQuery, IReqUser } from "../utils/interfaces";
import UserModel from "../models/user.model";
import { userDAO, userUpdateDAO } from "../models/user.dao";
import { encrypt } from "../utils/encryption";
import response from "../utils/response";
import mongoose from "mongoose";

export default {
  async create(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['User']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.requestBody = {
       required: true,
       schema: { $ref: "#/components/schemas/CreateUserRequest" }
     }
     */
    try {
      await userDAO.validate(req.body);
      const result = await UserModel.create(req.body);
      response.success(res, result, "Sukses membuat data pengguna");
    } catch (error) {
      response.error(res, error, "Gagal membuat data pengguna");
    }
  },

  async findAll(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['User']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.parameters['page'] = {
       in: 'query',
       description: 'Page number',
       required: false
     }
     #swagger.parameters['limit'] = {
       in: 'query',
       description: 'Items per page',
       required: false
     }
     #swagger.parameters['search'] = {
       in: 'query',
       description: 'Search term',
       required: false
     }
     */
    const {
      page = 1,
      limit = 10,
      search,
    } = req.query as unknown as IPaginationQuery;
    try {
      const query: any = {};

      if (search) {
        Object.assign(query, {
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { username: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        });
      }

      const result = await UserModel.find(query)
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
        .exec();

      const count = await UserModel.countDocuments(query);
      response.pagination(
        res,
        result,
        {
          total: count,
          totalPages: Math.ceil(count / limit),
          current: page,
        },
        "Sukses mengambil data pengguna"
      );
    } catch (error) {
      response.error(res, error, "Gagal mengambil data pengguna");
    }
  },

  async findOne(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['User']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.parameters['id'] = {
       in: 'path',
       description: 'User ID',
       required: true
     }
     */
    try {
      const { id } = req.params;
      const result = await UserModel.findById(id);
      if (!result) {
        return response.error(res, null, "Data pengguna tidak ditemukan");
      }
      response.success(res, result, "Sukses mengambil data pengguna");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data pengguna");
    }
  },

  async update(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['User']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.parameters['id'] = {
       in: 'path',
       description: 'User ID',
       required: true
     }
     #swagger.requestBody = {
       required: true,
       schema: { $ref: "#/components/schemas/UpdateUserRequest" }
     }
     */
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;
      const updateData = req.body;

      await userUpdateDAO.validate(updateData);

      if (updateData.password) {
        updateData.password = encrypt(updateData.password);
      }

      const user = await UserModel.findById(id);
      if (!user) {
        return response.error(res, null, "Data pengguna tidak ditemukan");
      }

      if (updateData.role && updateData.role !== user.role) {
        if (user.role === 'GURU') {
          await mongoose.model('Teacher').findOneAndDelete({ userId: user._id }, { session });
        } else if (user.role === 'MURID') {
          await mongoose.model('Student').findOneAndDelete({ userId: user._id }, { session });
        }
      }

      const result = await UserModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, session }
      );

      await session.commitTransaction();
      response.success(res, result, "Sukses mengupdate data pengguna");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal mengupdate data pengguna");
    } finally {
      session.endSession();
    }
  },

  async remove(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['User']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.parameters['id'] = {
       in: 'path',
       description: 'User ID',
       required: true
     }
     */
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;
      
      const user = await UserModel.findById(id);
      if (!user) {
        return response.error(res, null, "Data pengguna tidak ditemukan");
      }

      if (user.role === 'GURU') {
        await mongoose.model('Teacher').findOneAndDelete({ userId: user._id }, { session });
      } else if (user.role === 'MURID') {
        await mongoose.model('Student').findOneAndDelete({ userId: user._id }, { session });
      }

      await UserModel.findByIdAndDelete(id, { session });

      await session.commitTransaction();
      response.success(res, null, "Sukses menghapus data pengguna");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal menghapus data pengguna");
    } finally {
      session.endSession();
    }
  },
};