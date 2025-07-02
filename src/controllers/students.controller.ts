import { Response } from "express";
import { IPaginationQuery, IReqUser } from "../utils/interfaces";
import UserModel from "../models/user.model";
import StudentModel from "../models/student.model";
import { studentDAO } from "../models/student.model";
import response from "../utils/response";
import { ROLES } from "../utils/constant";
import mongoose from "mongoose";
import { encrypt } from "../utils/encryption";
import EnrollmentModel from "../models/enrollment.model";
import MataPelajaranModel from "../models/mataPelajaran.model";
import AssignmentModel from "../models/assignment.model";

interface ICompletionToggle {
  isCompleted: boolean;
}

const default_password_murid = "Smpn37Jakartamurid";
export default {
  async getEnrolledMataPelajaran(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Student']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.description = 'Get all mata pelajaran enrolled by a student'
     */
    try {
      const { id } = req.params;

      const student = await StudentModel.findById(id);
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      if (req.user?.role === ROLES.MURID) {
        const requestingStudent = await StudentModel.findOne({ userId: req.user.id });
        if (!requestingStudent || requestingStudent._id.toString() !== id) {
          return response.error(res, null, "Anda tidak memiliki akses ke data ini");
        }
      }

      const enrollments = await EnrollmentModel.find({ student: id })
        .populate({
          path: 'mataPelajaran',
          populate: {
            path: 'guru',
            select: 'fullName email nip'
          }
        });

      const mataPelajaranList = enrollments.map(enrollment => enrollment.mataPelajaran);

      response.success(res, mataPelajaranList, "Sukses mengambil data mata pelajaran yang diikuti");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data mata pelajaran yang diikuti");
    }
  },

  async getMyEnrolledMataPelajaran(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Student']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.description = 'Get all mata pelajaran enrolled by the logged-in student'
     */
    try {
      if (!req.user || req.user.role !== ROLES.MURID) {
        return response.error(res, null, "Hanya murid yang dapat mengakses endpoint ini");
      }

      const student = await StudentModel.findOne({ userId: req.user.id });
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      const enrollments = await EnrollmentModel.find({ student: student._id })
        .populate({
          path: 'mataPelajaran',
          populate: {
            path: 'guru',
            select: 'fullName email nip'
          }
        });

      const mataPelajaranList = enrollments.map(enrollment => enrollment.mataPelajaran);

      response.success(res, mataPelajaranList, "Sukses mengambil data mata pelajaran yang diikuti");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data mata pelajaran yang diikuti");
    }
  },

  async getMyAssignments(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Student']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.description = 'Get all assignments for the logged-in student'
     */
    try {
      if (!req.user || req.user.role !== ROLES.MURID) {
        return response.error(res, null, "Hanya murid yang dapat mengakses endpoint ini");
      }

      const student = await StudentModel.findOne({ userId: req.user.id });
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      const enrollments = await EnrollmentModel.find({ student: student._id });
      const mataPelajaranIds = enrollments.map(enrollment => enrollment.mataPelajaran);

      const assignments = await AssignmentModel.find({ 
        mataPelajaranId: { $in: mataPelajaranIds } 
      })
      .populate({
        path: 'mataPelajaranId',
        select: 'judul kategori'
      })
      .populate({
        path: 'materiId',
        select: 'judul'
      });

      const transformedAssignments = assignments.map(assignment => {
        const assignmentObj = assignment.toObject();
        
        const mataPelajaranObj = assignmentObj.mataPelajaranId as any;
        
        const isSubmitted = assignment.submissions?.some(sub => 
          sub.student.toString() === student._id.toString()
        );
        
        const isCompleted = student.completedAssignments?.includes((assignment._id as mongoose.Types.ObjectId).toString()) || false;
        
        return {
          ...assignmentObj,
          mataPelajaran: {
            _id: mataPelajaranObj?._id?.toString() || "",
            judul: mataPelajaranObj?.judul || "Mata Pelajaran Tidak Ditemukan",
            kategori: mataPelajaranObj?.kategori || ""
          },
          judul: assignmentObj.title || "",
          deskripsi: assignmentObj.description || "",
          status: isSubmitted ? 'selesai' : 'belum_dikerjakan',
          isSubmitted: isSubmitted,
          isCompleted: isCompleted
        };
      });

      response.success(res, transformedAssignments, "Sukses mengambil data tugas murid");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data tugas murid");
    }
  },

  async getStudentAssignments(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Student']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.description = 'Get all assignments for a specific student'
     */
    try {
      const { id } = req.params;

      const student = await StudentModel.findById(id);
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      if (req.user?.role === ROLES.MURID) {
        const requestingStudent = await StudentModel.findOne({ userId: req.user.id });
        if (!requestingStudent || requestingStudent._id.toString() !== id) {
          return response.error(res, null, "Anda tidak memiliki akses ke data ini");
        }
      }


      const enrollments = await EnrollmentModel.find({ student: id });
      const mataPelajaranIds = enrollments.map(enrollment => enrollment.mataPelajaran);

      const assignments = await AssignmentModel.find({ 
        mataPelajaranId: { $in: mataPelajaranIds } 
      })
      .populate({
        path: 'mataPelajaranId',
        select: 'judul kategori'
      })
      .populate({
        path: 'materiId',
        select: 'judul'
      });

      const transformedAssignments = assignments.map(assignment => {
        const assignmentObj = assignment.toObject();
        
        const mataPelajaranObj = assignmentObj.mataPelajaranId as any;
        
        return {
          ...assignmentObj,
          mataPelajaran: {
            _id: mataPelajaranObj?._id?.toString() || "",
            judul: mataPelajaranObj?.judul || "Mata Pelajaran Tidak Ditemukan",
            kategori: mataPelajaranObj?.kategori || ""
          },
          judul: assignmentObj.title || "",
          deskripsi: assignmentObj.description || "",
          status: assignment.submissions?.some(sub => 
            sub.student.toString() === student._id.toString()
          ) ? 'selesai' : 'belum_dikerjakan'
        };
      });

      response.success(res, transformedAssignments, "Sukses mengambil data tugas murid");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data tugas murid");
    }
  },

  async getStudentProfile(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Student']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.description = 'Get profile for the logged-in student'
     */
    try {
      if (!req.user || req.user.role !== ROLES.MURID) {
        return response.error(res, null, "Hanya murid yang dapat mengakses endpoint ini");
      }

      const student = await StudentModel.findOne({ userId: req.user.id });
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      response.success(res, student, "Sukses mengambil data profil murid");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data profil murid");
    }
  },

  async updateStudentProfile(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Student']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.description = 'Update profile for the logged-in student'
     #swagger.requestBody = {
       required: true,
       schema: { $ref: "#/components/schemas/UpdateStudentProfileRequest" }
     }
     */
    try {
      if (!req.user || req.user.role !== ROLES.MURID) {
        return response.error(res, null, "Hanya murid yang dapat mengakses endpoint ini");
      }

      const student = await StudentModel.findOne({ userId: req.user.id });
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      const { nis, kelas, noTelp } = req.body;

      const updatedStudent = await StudentModel.findByIdAndUpdate(
        student._id,
        { nis, kelas, noTelp },
        { new: true }
      );

      response.success(res, updatedStudent, "Sukses mengupdate data profil murid");
    } catch (error) {
      response.error(res, error, "Gagal mengupdate data profil murid");
    }
  },

  async create(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Student']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.requestBody = {
       required: true,
       schema: { $ref: "#/components/schemas/CreateStudentRequest" }
     }
     */
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await studentDAO.validate(req.body);
      
      const { fullName, email, nis, kelas, noTelp } = req.body;

      const username = email.split('@')[0];
      const password = default_password_murid;

      const userData = {
        fullName,
        username,
        email,
        password,
        role: ROLES.MURID,
        isActive: true
      };

      const user = await UserModel.create([userData], { session });
      
      const studentData = {
        fullName,
        email,
        nis,
        kelas,
        noTelp,
        userId: user[0]._id
      };

      const student = await StudentModel.create([studentData], { session });

      await session.commitTransaction();
      response.success(res, { user: user[0], student: student[0] }, "Sukses membuat data murid");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal membuat data murid");
    } finally {
      session.endSession();
    }
  },

  async findAll(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Student']
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
            { nis: { $regex: search, $options: "i" } },
            { kelas: { $regex: search, $options: "i" } },
            { noTelp: { $regex: search, $options: "i" } },
          ],
        });
      }

      const resultPromise = StudentModel.find(query)
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
        .select('fullName email nis kelas noTelp')
        .lean()
        .exec();

      const countPromise = StudentModel.countDocuments(query).exec();

      const [result, count] = await Promise.all([resultPromise, countPromise]);

      return response.pagination(
        res,
        result,
        {
          total: count,
          totalPages: Math.ceil(count / limit),
          current: page,
        },
        "Sukses mengambil data murid"
      );
    } catch (error) {
      return response.error(res, error, "Gagal mengambil data murid");
    }
  },

  async findOne(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Student']
     #swagger.security = [{
       "bearerAuth": []
     }]
     */
     try {
      const { id } = req.params;
      const result = await StudentModel.findById(id);
      if (!result) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }
      response.success(res, result, "Sukses mengambil data murid");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data murid");
    }
  },

  async update(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Student']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.requestBody = {
       required: true,
       schema: { $ref: "#/components/schemas/UpdateStudentRequest" }
     }
     */
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;
      const { fullName, email, nis, kelas, noTelp } = req.body;

      const student = await StudentModel.findById(id);
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      const updatedStudent = await StudentModel.findByIdAndUpdate(
        id,
        { fullName, email, nis, kelas, noTelp },
        { new: true, session }
      );

      await UserModel.findByIdAndUpdate(
        student.userId,
        { fullName, email },
        { session }
      );

      await session.commitTransaction();
      response.success(res, updatedStudent, "Sukses mengupdate data murid");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal mengupdate data murid");
    } finally {
      session.endSession();
    }
  },

  async remove(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Student']
     #swagger.security = [{
       "bearerAuth": []
     }]
     */
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;
      const student = await StudentModel.findById(id);
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      await StudentModel.findByIdAndDelete(id, { session });
      await UserModel.findByIdAndDelete(student.userId, { session });

      await session.commitTransaction();
      response.success(res, null, "Sukses menghapus data murid");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal menghapus data murid");
    } finally {
      session.endSession();
    }
  },

  async markAssignmentCompletion(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Student']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.description = 'Mark assignment as completed or not completed by student'
     */
    try {
      if (!req.user || req.user.role !== ROLES.MURID) {
        return response.error(res, null, "Hanya murid yang dapat mengakses endpoint ini");
      }

      const { id } = req.params;
      const { isCompleted } = req.body as ICompletionToggle;

      if (isCompleted === undefined) {
        return response.error(res, null, "Status penyelesaian (isCompleted) harus disertakan");
      }

      const student = await StudentModel.findOne({ userId: req.user.id });
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      const assignment = await AssignmentModel.findById(id);
      if (!assignment) {
        return response.error(res, null, "Tugas tidak ditemukan");
      }

      const hasSubmission = assignment.submissions.some(sub => 
        sub.student.toString() === student._id.toString()
      );

      if (!hasSubmission) {
        return response.error(res, null, "Anda belum mengumpulkan tugas ini");
      }

      if (!student.completedAssignments) {
        student.completedAssignments = [];
      }

      if (isCompleted) {
        if (!student.completedAssignments.includes(id)) {
          student.completedAssignments.push(id);
        }
      } else {
        student.completedAssignments = student.completedAssignments.filter(
          (assignmentId: string) => assignmentId !== id
        );
      }

      await student.save();

      response.success(res, { isCompleted }, "Status penyelesaian tugas berhasil diperbarui");
    } catch (error) {
      response.error(res, error, "Gagal memperbarui status penyelesaian tugas");
    }
  },
};