import { Response } from "express";
import { IReqUser } from "../utils/interfaces";
import UserModel from "../models/user.model";
import TeacherModel from "../models/teacher.model";
import StudentModel from "../models/student.model";
import MataPelajaranModel from "../models/mataPelajaran.model";
import MateriPelajaranModel from "../models/materiPelajaran.model";
import response from "../utils/response";
import { ROLES } from "../utils/constant";

export default {
  async dashboardStats(req: IReqUser, res: Response) {
    // Hanya admin yang boleh mengakses
    if (req.user?.role !== ROLES.ADMIN) {
      return response.error(res, null, "Anda tidak memiliki akses untuk fitur ini", 403);
    }

    try {
      // Ambil jumlah murid
      const studentCount = await StudentModel.countDocuments();
      
      // Ambil jumlah guru
      const teacherCount = await TeacherModel.countDocuments();
      
      // Ambil jumlah mata pelajaran
      const subjectCount = await MataPelajaranModel.countDocuments();
      
      const recentSubjects = await MataPelajaranModel.find()
        .populate('guru', 'fullName')
        .sort({ createdAt: -1 })
        .limit(5);

      const stats = {
        studentCount,
        teacherCount,
        subjectCount,
        recentSubjects
      };

      response.success(res, stats, "Berhasil mengambil statistik dashboard");
    } catch (error) {
      response.error(res, error, "Gagal mengambil statistik dashboard");
    }
  },
  
  async guruDashboardStats(req: IReqUser, res: Response) {
    // Hanya guru yang boleh mengakses
    if (req.user?.role !== ROLES.GURU) {
      return response.error(res, null, "Anda tidak memiliki akses untuk fitur ini", 403);
    }

    try {
      // Cari data guru berdasarkan user ID
      const teacher = await TeacherModel.findOne({ userId: req.user.id });
      if (!teacher) {
        return response.error(res, null, "Data guru tidak ditemukan");
      }
      
      // Ambil jumlah mata pelajaran guru
      const mataPelajaranCount = await MataPelajaranModel.countDocuments({ guru: teacher._id });
      
      // Ambil jumlah murid yang mengambil mata pelajaran guru
      // Ini perlu aggregation untuk mendapatkan jumlah unik murid
      const subjects = await MataPelajaranModel.find({ guru: teacher._id });
      const subjectIds = subjects.map(subject => subject._id);
      
      // Asumsi: jumlah murid adalah jumlah pendaftaran mata pelajaran
      // Untuk mendapatkan jumlah unik murid perlu diimplementasikan 
      // berdasarkan struktur data pendaftaran yang ada
      const muridCount = 0; // Perlu implementasi sesuai model data
      
      // Ambil jumlah materi yang dibuat guru
      const materiCount = await MateriPelajaranModel.countDocuments({
        mataPelajaran: { $in: subjectIds }
      });
      
      // Ambil mata pelajaran terbaru dari guru
      const recentSubjects = await MataPelajaranModel.find({ guru: teacher._id })
        .populate('guru', 'fullName')
        .sort({ createdAt: -1 })
        .limit(5);

      const stats = {
        mataPelajaranCount,
        muridCount,
        materiCount,
        recentSubjects
      };

      response.success(res, stats, "Berhasil mengambil statistik dashboard guru");
    } catch (error) {
      response.error(res, error, "Gagal mengambil statistik dashboard guru");
    }
  }
}; 