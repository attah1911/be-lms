import { Response } from "express";
import { IPaginationQuery, IReqUser } from "../utils/interfaces";
import MataPelajaranModel, { mataPelajaranDAO } from "../models/mataPelajaran.model";
import MateriPelajaranModel from "../models/materiPelajaran.model";
import EnrollmentModel from "../models/enrollment.model";
import StudentModel from "../models/student.model";
import NotificationModel from "../models/notification.model";
import response from "../utils/response";
import mongoose from "mongoose";
import { ROLES } from "../utils/constant";

export default {
  async create(req: IReqUser, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await mataPelajaranDAO.validate(req.body);

      let guruId = req.body.guru;
      if (req.user?.role === ROLES.GURU) {
        const teacher = await mongoose.model('Teacher').findOne({ userId: req.user.id });
        if (!teacher) {
          return response.error(res, null, "Data guru tidak ditemukan");
        }
        guruId = teacher._id;
      }

      const guru = await mongoose.model('Teacher').findById(guruId);
      if (!guru) {
        return response.error(res, null, "Data guru tidak ditemukan");
      }

      const mataPelajaran = await MataPelajaranModel.create([{
        ...req.body,
        guru: guruId
      }], { session });

      const populatedMataPelajaran = await MataPelajaranModel.findById(mataPelajaran[0]._id)
        .populate('guru', 'fullName email nip');

      await session.commitTransaction();
      response.success(res, populatedMataPelajaran, "Sukses membuat mata pelajaran");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal membuat mata pelajaran");
    } finally {
      session.endSession();
    }
  },

  async findAll(req: IReqUser, res: Response) {
    const {
      page = 1,
      limit = 10,
      search,
      kategori,
      guru
    } = req.query as unknown as IPaginationQuery & { kategori?: string; guru?: string };

    try {
      const query: any = {};

      if (search) {
        Object.assign(query, {
          $or: [
            { judul: { $regex: search, $options: "i" } },
            { deskripsi: { $regex: search, $options: "i" } },
          ],
        });
      }

      if (kategori) {
        query.kategori = kategori;
      }

      if (guru) {
        query.guru = guru;
      }

      if (req.user?.role === ROLES.GURU) {
        const teacher = await mongoose.model('Teacher').findOne({ userId: req.user.id });
        if (!teacher) {
          return response.error(res, null, "Data guru tidak ditemukan");
        }
        query.guru = teacher._id;
      }

      const result = await MataPelajaranModel.find(query)
        .populate('guru', 'fullName email nip')
        .populate({
          path: 'materiPelajaranList',
          options: { sort: { order: 1 } }
        })
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
        .exec();

      const count = await MataPelajaranModel.countDocuments(query);
      response.pagination(
        res,
        result,
        {
          total: count,
          totalPages: Math.ceil(count / limit),
          current: page,
        },
        "Sukses mengambil data mata pelajaran"
      );
    } catch (error) {
      response.error(res, error, "Gagal mengambil data mata pelajaran");
    }
  },

  async findOne(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      const result = await MataPelajaranModel.findById(id)
        .populate('guru', 'fullName email nip')
        .populate({
          path: 'materiPelajaranList',
          options: { sort: { order: 1 } }
        });

      if (!result) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      if (req.user?.role === ROLES.GURU) {
        const teacher = await mongoose.model('Teacher').findOne({ userId: req.user.id });
        if (!teacher || result.guru._id.toString() !== teacher._id.toString()) {
          return response.error(res, null, "Anda tidak memiliki akses ke mata pelajaran ini");
        }
      }

      response.success(res, result, "Sukses mengambil data mata pelajaran");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data mata pelajaran");
    }
  },

  async update(req: IReqUser, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;

      await mataPelajaranDAO.validate(req.body);

      const mataPelajaran = await MataPelajaranModel.findById(id);
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      if (req.user?.role === ROLES.GURU) {
        const teacher = await mongoose.model('Teacher').findOne({ userId: req.user.id });
        if (!teacher || mataPelajaran.guru.toString() !== teacher._id.toString()) {
          return response.error(res, null, "Anda tidak memiliki akses ke mata pelajaran ini");
        }
      }

      const result = await MataPelajaranModel.findByIdAndUpdate(
        id,
        req.body,
        { new: true, session }
      ).populate('guru', 'fullName email nip')
       .populate({
         path: 'materiPelajaranList',
         options: { sort: { order: 1 } }
       });

      await session.commitTransaction();
      response.success(res, result, "Sukses mengupdate mata pelajaran");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal mengupdate mata pelajaran");
    } finally {
      session.endSession();
    }
  },

  async remove(req: IReqUser, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;

      const mataPelajaran = await MataPelajaranModel.findById(id);
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      if (req.user?.role === ROLES.GURU) {
        const teacher = await mongoose.model('Teacher').findOne({ userId: req.user.id });
        if (!teacher || mataPelajaran.guru.toString() !== teacher._id.toString()) {
          return response.error(res, null, "Anda tidak memiliki akses ke mata pelajaran ini");
        }
      }

      await MateriPelajaranModel.deleteMany(
        { mataPelajaran: id },
        { session }
      );

      await MataPelajaranModel.findByIdAndDelete(id, { session });

      await session.commitTransaction();
      response.success(res, null, "Sukses menghapus mata pelajaran");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal menghapus mata pelajaran");
    } finally {
      session.endSession();
    }
  },

  async getEnrolledStudents(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      const mataPelajaran = await MataPelajaranModel.findById(id);
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      const enrollments = await EnrollmentModel.find({ mataPelajaran: id })
        .populate('student', 'fullName email nis kelas noTelp');

      const students = enrollments.map(enrollment => enrollment.student);

      response.success(res, students, "Sukses mengambil data murid yang terdaftar");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data murid yang terdaftar");
    }
  },

  async enrollStudent(req: IReqUser, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id, studentId } = req.params;

      const mataPelajaran = await MataPelajaranModel.findById(id);
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      let actualStudentId = studentId;

      if (req.user?.role === ROLES.MURID) {
        const studentRecord = await StudentModel.findOne({ userId: req.user.id });
        if (!studentRecord) {
          return response.error(res, null, "Data murid tidak ditemukan untuk pengguna ini");
        }
        
        actualStudentId = studentRecord._id.toString();
        
      }

      const student = await StudentModel.findById(actualStudentId);
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      const existingEnrollment = await EnrollmentModel.findOne({
        mataPelajaran: id,
        student: actualStudentId
      });

      if (existingEnrollment) {
        return response.error(res, null, "Murid sudah terdaftar pada mata pelajaran ini");
      }

      const enrollment = await EnrollmentModel.create([{
        mataPelajaran: id,
        student: actualStudentId
      }], { session });
      
      try {
        const guruId = mataPelajaran.guru;
        
        const notificationData = {
          type: 'enrollment',
          title: 'Pendaftaran Baru',
          description: `${student.fullName} telah mendaftar pada mata pelajaran "${mataPelajaran.judul}"`,
          mataPelajaran: id,
          recipient: {
            type: 'teacher',
            id: guruId
          },
          isRead: false
        };
        
        await NotificationModel.create([notificationData], { session });
      } catch (notifError) {
      }

      await session.commitTransaction();
      response.success(res, enrollment[0], "Sukses mendaftarkan murid ke mata pelajaran");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal mendaftarkan murid ke mata pelajaran");
    } finally {
      session.endSession();
    }
  },

  async unenrollStudent(req: IReqUser, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id, studentId } = req.params;

      const mataPelajaran = await MataPelajaranModel.findById(id);
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      const student = await StudentModel.findById(studentId);
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      const result = await EnrollmentModel.findOneAndDelete({
        mataPelajaran: id,
        student: studentId
      }, { session });

      if (!result) {
        return response.error(res, null, "Murid tidak terdaftar pada mata pelajaran ini");
      }

      await session.commitTransaction();
      response.success(res, null, "Sukses menghapus murid dari mata pelajaran");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal menghapus murid dari mata pelajaran");
    } finally {
      session.endSession();
    }
  },

  async findAllForGuru(req: IReqUser, res: Response) {
    const {
      page = 1,
      limit = 10,
      search,
      kategori,
    } = req.query as unknown as IPaginationQuery & { kategori?: string };

    try {
      const query: any = {};

      if (search) {
        Object.assign(query, {
          $or: [
            { judul: { $regex: search, $options: "i" } },
            { deskripsi: { $regex: search, $options: "i" } },
          ],
        });
      }

      if (kategori) {
        query.kategori = kategori;
      }

      const teacher = await mongoose.model('Teacher').findOne({ userId: req.user?.id });
      if (!teacher) {
        return response.error(res, null, "Data guru tidak ditemukan");
      }
      query.guru = teacher._id;

      const result = await MataPelajaranModel.find(query)
        .populate('guru', 'fullName email nip') 
        .populate({
          path: 'materiPelajaranList',
          options: { sort: { order: 1 } }
        })
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
        .exec();

      const count = await MataPelajaranModel.countDocuments(query);
      
      response.pagination(
        res,
        result,
        {
          total: count,
          totalPages: Math.ceil(count / limit),
          current: page,
        },
        "Sukses mengambil data mata pelajaran guru"
      );
    } catch (error) {
      response.error(res, error, "Gagal mengambil data mata pelajaran guru");
    }
  },

  async selfEnrollStudent(req: IReqUser, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;

      if (req.user?.role !== ROLES.MURID) {
        return response.error(res, null, "Hanya murid yang dapat mendaftarkan dirinya sendiri");
      }

      const mataPelajaran = await MataPelajaranModel.findById(id);
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      const student = await StudentModel.findOne({ userId: req.user.id });
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan untuk pengguna ini");
      }
      
      const studentId = student._id;

      const existingEnrollment = await EnrollmentModel.findOne({
        mataPelajaran: id,
        student: studentId
      });

      if (existingEnrollment) {
        return response.error(res, null, "Anda sudah terdaftar pada mata pelajaran ini");
      }

      const enrollment = await EnrollmentModel.create([{
        mataPelajaran: id,
        student: studentId
      }], { session });
      
      try {
        const guruId = mataPelajaran.guru;
        
        const notificationData = {
          type: 'enrollment',
          title: 'Pendaftaran Baru',
          description: `${student.fullName} telah mendaftar pada mata pelajaran "${mataPelajaran.judul}"`,
          mataPelajaran: id,
          recipient: {
            type: 'teacher',
            id: guruId
          },
          isRead: false
        };
        
        await NotificationModel.create([notificationData], { session });
      } catch (notifError) {
      }

      await session.commitTransaction();
      response.success(res, enrollment[0], "Sukses mendaftar ke mata pelajaran");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal mendaftar ke mata pelajaran");
    } finally {
      session.endSession();
    }
  }
};