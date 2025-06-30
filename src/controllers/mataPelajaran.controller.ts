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
      // Validate input
      await mataPelajaranDAO.validate(req.body);

      // If user is a GURU, automatically use their ID as the guru
      let guruId = req.body.guru;
      if (req.user?.role === ROLES.GURU) {
        const teacher = await mongoose.model('Teacher').findOne({ userId: req.user.id });
        if (!teacher) {
          return response.error(res, null, "Data guru tidak ditemukan");
        }
        // Override the guru ID with the current teacher's ID
        guruId = teacher._id;
      }

      // Verify that the guru exists
      const guru = await mongoose.model('Teacher').findById(guruId);
      if (!guru) {
        return response.error(res, null, "Data guru tidak ditemukan");
      }

      // Create mata pelajaran
      const mataPelajaran = await MataPelajaranModel.create([{
        ...req.body,
        guru: guruId
      }], { session });

      // Populate the guru data before sending response
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
        .populate('guru', 'fullName email nip') // Include necessary teacher fields
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

  // Student enrollment methods
  async getEnrolledStudents(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      // Check if mata pelajaran exists
      const mataPelajaran = await MataPelajaranModel.findById(id);
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      // Get all enrollments for this mata pelajaran
      const enrollments = await EnrollmentModel.find({ mataPelajaran: id })
        .populate('student', 'fullName email nis kelas noTelp');

      // Extract student data from enrollments
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

      // Check if mata pelajaran exists
      const mataPelajaran = await MataPelajaranModel.findById(id);
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      let actualStudentId = studentId;

      // If student is requesting to enroll themself
      if (req.user?.role === ROLES.MURID) {
        // Find the student record for the logged-in user
        const studentRecord = await StudentModel.findOne({ userId: req.user.id });
        if (!studentRecord) {
          return response.error(res, null, "Data murid tidak ditemukan untuk pengguna ini");
        }
        
        // Use the student's own ID from their record
        actualStudentId = studentRecord._id.toString();
        
        // Remove the comparison that's causing problems
        // Students should be able to enroll themselves regardless of the studentId parameter
      }

      // Check if student exists
      const student = await StudentModel.findById(actualStudentId);
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      // Check if student is already enrolled
      const existingEnrollment = await EnrollmentModel.findOne({
        mataPelajaran: id,
        student: actualStudentId
      });

      if (existingEnrollment) {
        return response.error(res, null, "Murid sudah terdaftar pada mata pelajaran ini");
      }

      // Create enrollment
      const enrollment = await EnrollmentModel.create([{
        mataPelajaran: id,
        student: actualStudentId
      }], { session });
      
      // Create notification for the teacher about new student enrollment
      try {
        // Get teacher details from mata pelajaran
        const guruId = mataPelajaran.guru;
        
        // Create notification
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
        // Don't fail the transaction if notification creation fails
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

      // Check if mata pelajaran exists
      const mataPelajaran = await MataPelajaranModel.findById(id);
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      // Check if student exists
      const student = await StudentModel.findById(studentId);
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      // Find and delete enrollment
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

      // Always filter by the current teacher
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

      // Ensure the requester is a student
      if (req.user?.role !== ROLES.MURID) {
        return response.error(res, null, "Hanya murid yang dapat mendaftarkan dirinya sendiri");
      }

      // Check if mata pelajaran exists
      const mataPelajaran = await MataPelajaranModel.findById(id);
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      // Find the student record for the logged-in user
      const student = await StudentModel.findOne({ userId: req.user.id });
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan untuk pengguna ini");
      }
      
      const studentId = student._id;

      // Check if student is already enrolled
      const existingEnrollment = await EnrollmentModel.findOne({
        mataPelajaran: id,
        student: studentId
      });

      if (existingEnrollment) {
        return response.error(res, null, "Anda sudah terdaftar pada mata pelajaran ini");
      }

      // Create enrollment
      const enrollment = await EnrollmentModel.create([{
        mataPelajaran: id,
        student: studentId
      }], { session });
      
      // Create notification for the teacher about new student enrollment
      try {
        // Get teacher details from mata pelajaran
        const guruId = mataPelajaran.guru;
        
        // Create notification
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
        // Don't fail the transaction if notification creation fails
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