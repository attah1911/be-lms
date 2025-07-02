import { Response } from "express";
import { IPaginationQuery, IReqUser } from "../utils/interfaces";
import UserModel from "../models/user.model";
import TeacherModel from "../models/teacher.model";
import { teacherDAO } from "../models/teacher.model";
import response from "../utils/response";
import { ROLES } from "../utils/constant";
import mongoose from "mongoose";
import { encrypt } from "../utils/encryption";

const default_password_guru = "Smpn37Jakartaguru";

export default {
  async getTeacherProfile(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Teacher']
     #swagger.security = [{
       "bearerAuth": []
     }]
     */
    try {
      const teacher = await TeacherModel.findOne({ userId: req.user?.id });
      
      if (!teacher) {
        return response.error(res, null, "Data guru tidak ditemukan");
      }
      
      response.success(res, teacher, "Sukses mengambil data guru");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data guru");
    }
  },
  
  async updateTeacherProfile(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Teacher']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.requestBody = {
       required: true,
       schema: { $ref: "#/components/schemas/UpdateTeacherProfileRequest" }
     }
     */
    try {
      const { nrk, noTelp } = req.body;
      
      const teacher = await TeacherModel.findOne({ userId: req.user?.id });
      
      if (!teacher) {
        return response.error(res, null, "Data guru tidak ditemukan");
      }
      
      const updatedTeacher = await TeacherModel.findByIdAndUpdate(
        teacher._id,
        { nrk, noTelp },
        { new: true }
      );
      
      response.success(res, updatedTeacher, "Sukses mengupdate data guru");
    } catch (error) {
      response.error(res, error, "Gagal mengupdate data guru");
    }
  },

  async create(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Teacher']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.requestBody = {
       required: true,
       schema: { $ref: "#/components/schemas/CreateTeacherRequest" }
     }
     */
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await teacherDAO.validate(req.body);

      const { fullName, email, nrk, noTelp } = req.body;

      const username = email.split("@")[0];
      const password = default_password_guru;

      const userData = {
        fullName,
        username,
        email,
        password,
        role: ROLES.GURU,
        isActive: true,
      };

      const user = await UserModel.create([userData], { session });

      const teacherData = {
        fullName,
        email,
        nrk,
        noTelp,
        userId: user[0]._id,
      };

      const teacher = await TeacherModel.create([teacherData], { session });

      await session.commitTransaction();
      response.success(
        res,
        { user: user[0], teacher: teacher[0] },
        "Sukses membuat data guru"
      );
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal membuat data guru");
    } finally {
      session.endSession();
    }
  },

  async findAll(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Teacher']
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
            { nrk: { $regex: search, $options: "i" } },
            { noTelp: { $regex: search, $options: "i" } },
          ],
        });
      }

      const resultPromise = TeacherModel.find(query)
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      const countPromise = TeacherModel.countDocuments(query).exec();

      const [result, count] = await Promise.all([resultPromise, countPromise]);

      return response.pagination(
        res,
        result,
        {
          total: count,
          totalPages: Math.ceil(count / limit),
          current: page,
        },
        "Sukses mengambil data guru"
      );
    } catch (error) {
      return response.error(res, error, "Gagal mengambil data guru");
    }
  },

  async findOne(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Teacher']
     #swagger.security = [{
       "bearerAuth": []
     }]
     */
    try {
      const { id } = req.params;
      const result = await TeacherModel.findById(id);
      if (!result) {
        return response.error(res, null, "Data guru tidak ditemukan");
      }
      response.success(res, result, "Sukses mengambil data guru");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data guru");
    }
  },

  async update(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Teacher']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.requestBody = {
       required: true,
       schema: { $ref: "#/components/schemas/UpdateTeacherRequest" }
     }
     */
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;
      const { fullName, email, nrk, noTelp } = req.body;

      const teacher = await TeacherModel.findById(id);
      if (!teacher) {
        return response.error(res, null, "Data guru tidak ditemukan");
      }

      const updatedTeacher = await TeacherModel.findByIdAndUpdate(
        id,
        { fullName, email, nrk, noTelp },
        { new: true, session }
      );

      await UserModel.findByIdAndUpdate(
        teacher.userId,
        { fullName, email },
        { session }
      );

      await session.commitTransaction();
      response.success(res, updatedTeacher, "Sukses mengupdate data guru");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal mengupdate data guru");
    } finally {
      session.endSession();
    }
  },

  async remove(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Teacher']
     #swagger.security = [{
       "bearerAuth": []
     }]
     */
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;
      const teacher = await TeacherModel.findById(id);
      if (!teacher) {
        return response.error(res, null, "Data guru tidak ditemukan");
      }

      await TeacherModel.findByIdAndDelete(id, { session });
      await UserModel.findByIdAndDelete(teacher.userId, { session });

      await session.commitTransaction();
      response.success(res, null, "Sukses menghapus data guru");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal menghapus data guru");
    } finally {
      session.endSession();
    }
  },
};