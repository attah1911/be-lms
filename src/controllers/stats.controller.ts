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
    if (req.user?.role !== ROLES.ADMIN) {
      return response.error(res, null, "Anda tidak memiliki akses untuk fitur ini", 403);
    }

    try {
      const studentCount = await StudentModel.countDocuments();
      
      const teacherCount = await TeacherModel.countDocuments();
      
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
    if (req.user?.role !== ROLES.GURU) {
      return response.error(res, null, "Anda tidak memiliki akses untuk fitur ini", 403);
    }

    try {
      const teacher = await TeacherModel.findOne({ userId: req.user.id });
      if (!teacher) {
        return response.error(res, null, "Data guru tidak ditemukan");
      }
      
      const mataPelajaranCount = await MataPelajaranModel.countDocuments({ guru: teacher._id });
      
      const subjects = await MataPelajaranModel.find({ guru: teacher._id });
      const subjectIds = subjects.map(subject => subject._id);
      
      const muridCount = 0;
      
      const materiCount = await MateriPelajaranModel.countDocuments({
        mataPelajaran: { $in: subjectIds }
      });
      
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