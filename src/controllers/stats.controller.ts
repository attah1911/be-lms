import { Response } from "express";
import { IReqUser } from "../utils/interfaces";
import { prisma } from "../utils/prisma";
import response from "../utils/response";
import { ROLES } from "../utils/constant";

export default {
  async dashboardStats(req: IReqUser, res: Response) {
    if (req.user?.role !== ROLES.ADMIN) {
      return response.error(res, null, "Anda tidak memiliki akses untuk fitur ini", 403);
    }

    try {
      const [studentCount, teacherCount, subjectCount, recentSubjects] = await Promise.all([
        prisma.student.count(),
        prisma.teacher.count(),
        prisma.mataPelajaran.count(),
        prisma.mataPelajaran.findMany({
          include: { guru: { select: { fullName: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

      response.success(
        res,
        { studentCount, teacherCount, subjectCount, recentSubjects },
        "Berhasil mengambil statistik dashboard"
      );
    } catch (error) {
      response.error(res, error, "Gagal mengambil statistik dashboard");
    }
  },

  async guruDashboardStats(req: IReqUser, res: Response) {
    if (req.user?.role !== ROLES.GURU) {
      return response.error(res, null, "Anda tidak memiliki akses untuk fitur ini", 403);
    }

    try {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!teacher) {
        return response.notFound(res, "Data guru tidak ditemukan");
      }

      const [mataPelajaranCount, materiCount, recentSubjects] = await Promise.all([
        prisma.mataPelajaran.count({ where: { guruId: teacher.id } }),
        prisma.materiPelajaran.count({ where: { mataPelajaran: { guruId: teacher.id } } }),
        prisma.mataPelajaran.findMany({
          where: { guruId: teacher.id },
          include: { guru: { select: { fullName: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

      response.success(
        res,
        { mataPelajaranCount, muridCount: 0, materiCount, recentSubjects },
        "Berhasil mengambil statistik dashboard guru"
      );
    } catch (error) {
      response.error(res, error, "Gagal mengambil statistik dashboard guru");
    }
  },
};
