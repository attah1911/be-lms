import { Response } from "express";
import { Prisma } from "@prisma/client";
import { IPaginationQuery, IReqUser } from "../utils/interfaces";
import { prisma } from "../utils/prisma";
import { studentDAO } from "../validators";
import response from "../utils/response";
import { ROLES } from "../utils/constant";
import { encrypt } from "../utils/encryption";

const default_password_murid = "Smpn37Jakartamurid";

const mataPelajaranWithGuru = {
  include: { guru: { select: { fullName: true, email: true, nrk: true } } },
};

async function studentAssignments(studentId: string, includeCompletion: boolean) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    select: { mataPelajaranId: true },
  });
  const mataPelajaranIds = enrollments.map((e) => e.mataPelajaranId);

  const assignments = await prisma.assignment.findMany({
    where: { mataPelajaranId: { in: mataPelajaranIds } },
    include: {
      mataPelajaran: { select: { id: true, judul: true, kategori: true } },
      materi: { select: { id: true, judul: true } },
      submissions: { where: { studentId }, select: { id: true } },
      ...(includeCompletion
        ? { completions: { where: { studentId }, select: { id: true } } }
        : {}),
    },
  });

  return assignments.map((a) => {
    const isSubmitted = a.submissions.length > 0;
    const isCompleted = includeCompletion ? (a as any).completions.length > 0 : undefined;
    return {
      ...a,
      mataPelajaran: {
        _id: a.mataPelajaran?.id ?? "",
        judul: a.mataPelajaran?.judul ?? "Mata Pelajaran Tidak Ditemukan",
        kategori: a.mataPelajaran?.kategori ?? "",
      },
      judul: a.title,
      deskripsi: a.description,
      status: isSubmitted ? "selesai" : "belum_dikerjakan",
      isSubmitted,
      ...(includeCompletion ? { isCompleted } : {}),
    };
  });
}

export default {
  async getEnrolledMataPelajaran(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;
      const student = await prisma.student.findUnique({ where: { id } });
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      if (req.user?.role === ROLES.MURID) {
        const self = await prisma.student.findUnique({ where: { userId: req.user.id } });
        if (!self || self.id !== id) {
          return response.error(res, null, "Anda tidak memiliki akses ke data ini");
        }
      }

      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: id },
        include: { mataPelajaran: mataPelajaranWithGuru },
      });

      response.success(
        res,
        enrollments.map((e) => e.mataPelajaran),
        "Sukses mengambil data mata pelajaran yang diikuti"
      );
    } catch (error) {
      response.error(res, error, "Gagal mengambil data mata pelajaran yang diikuti");
    }
  },

  async getMyEnrolledMataPelajaran(req: IReqUser, res: Response) {
    try {
      if (req.user?.role !== ROLES.MURID) {
        return response.error(res, null, "Hanya murid yang dapat mengakses endpoint ini");
      }
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: student.id },
        include: { mataPelajaran: mataPelajaranWithGuru },
      });

      response.success(
        res,
        enrollments.map((e) => e.mataPelajaran),
        "Sukses mengambil data mata pelajaran yang diikuti"
      );
    } catch (error) {
      response.error(res, error, "Gagal mengambil data mata pelajaran yang diikuti");
    }
  },

  async getMyAssignments(req: IReqUser, res: Response) {
    try {
      if (req.user?.role !== ROLES.MURID) {
        return response.error(res, null, "Hanya murid yang dapat mengakses endpoint ini");
      }
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      const data = await studentAssignments(student.id, true);
      response.success(res, data, "Sukses mengambil data tugas murid");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data tugas murid");
    }
  },

  async getStudentAssignments(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;
      const student = await prisma.student.findUnique({ where: { id } });
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      if (req.user?.role === ROLES.MURID) {
        const self = await prisma.student.findUnique({ where: { userId: req.user.id } });
        if (!self || self.id !== id) {
          return response.error(res, null, "Anda tidak memiliki akses ke data ini");
        }
      }

      const data = await studentAssignments(id, false);
      response.success(res, data, "Sukses mengambil data tugas murid");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data tugas murid");
    }
  },

  async getStudentProfile(req: IReqUser, res: Response) {
    try {
      if (req.user?.role !== ROLES.MURID) {
        return response.error(res, null, "Hanya murid yang dapat mengakses endpoint ini");
      }
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }
      response.success(res, student, "Sukses mengambil data profil murid");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data profil murid");
    }
  },

  async updateStudentProfile(req: IReqUser, res: Response) {
    try {
      if (req.user?.role !== ROLES.MURID) {
        return response.error(res, null, "Hanya murid yang dapat mengakses endpoint ini");
      }
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      const { nis, kelas, noTelp } = req.body;
      const updated = await prisma.student.update({
        where: { id: student.id },
        data: { nis, kelas, noTelp },
      });

      response.success(res, updated, "Sukses mengupdate data profil murid");
    } catch (error) {
      response.error(res, error, "Gagal mengupdate data profil murid");
    }
  },

  async create(req: IReqUser, res: Response) {
    try {
      await studentDAO.validate(req.body);
      const { fullName, email, nis, kelas, noTelp } = req.body;
      const username = email.split("@")[0];

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            fullName,
            username,
            email,
            password: encrypt(default_password_murid),
            role: ROLES.MURID,
            isActive: true,
          },
        });
        const student = await tx.student.create({
          data: { fullName, email, nis, kelas, noTelp, userId: user.id },
        });
        return { user, student };
      });

      response.success(res, result, "Sukses membuat data murid");
    } catch (error) {
      response.error(res, error, "Gagal membuat data murid");
    }
  },

  async findAll(req: IReqUser, res: Response) {
    const { page = 1, limit = 10, search } = req.query as unknown as IPaginationQuery;

    try {
      const take = Number(limit);
      const current = Number(page);
      const where: Prisma.StudentWhereInput = search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { nis: { contains: search, mode: "insensitive" } },
              { kelas: { contains: search, mode: "insensitive" } },
              { noTelp: { contains: search, mode: "insensitive" } },
            ],
          }
        : {};

      const [result, count] = await Promise.all([
        prisma.student.findMany({
          where,
          take,
          skip: (current - 1) * take,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            fullName: true,
            email: true,
            nis: true,
            kelas: true,
            noTelp: true,
          },
        }),
        prisma.student.count({ where }),
      ]);

      return response.pagination(
        res,
        result,
        { total: count, totalPages: Math.ceil(count / take), current },
        "Sukses mengambil data murid"
      );
    } catch (error) {
      return response.error(res, error, "Gagal mengambil data murid");
    }
  },

  async findOne(req: IReqUser, res: Response) {
    try {
      const result = await prisma.student.findUnique({ where: { id: req.params.id } });
      if (!result) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }
      response.success(res, result, "Sukses mengambil data murid");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data murid");
    }
  },

  async update(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;
      const { fullName, email, nis, kelas, noTelp } = req.body;

      const student = await prisma.student.findUnique({ where: { id } });
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      const updated = await prisma.$transaction(async (tx) => {
        const s = await tx.student.update({
          where: { id },
          data: { fullName, email, nis, kelas, noTelp },
        });
        await tx.user.update({ where: { id: student.userId }, data: { fullName, email } });
        return s;
      });

      response.success(res, updated, "Sukses mengupdate data murid");
    } catch (error) {
      response.error(res, error, "Gagal mengupdate data murid");
    }
  },

  async remove(req: IReqUser, res: Response) {
    try {
      const student = await prisma.student.findUnique({ where: { id: req.params.id } });
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      // Deleting the User cascades to the Student row.
      await prisma.user.delete({ where: { id: student.userId } });

      response.success(res, null, "Sukses menghapus data murid");
    } catch (error) {
      response.error(res, error, "Gagal menghapus data murid");
    }
  },

  async markAssignmentCompletion(req: IReqUser, res: Response) {
    try {
      if (req.user?.role !== ROLES.MURID) {
        return response.error(res, null, "Hanya murid yang dapat mengakses endpoint ini");
      }

      const { id } = req.params;
      const { isCompleted } = req.body as { isCompleted?: boolean };

      if (isCompleted === undefined) {
        return response.error(res, null, "Status penyelesaian (isCompleted) harus disertakan");
      }

      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan");
      }

      const assignment = await prisma.assignment.findUnique({ where: { id } });
      if (!assignment) {
        return response.error(res, null, "Tugas tidak ditemukan");
      }

      const submission = await prisma.submission.findUnique({
        where: { assignmentId_studentId: { assignmentId: id, studentId: student.id } },
      });
      if (!submission) {
        return response.error(res, null, "Anda belum mengumpulkan tugas ini");
      }

      if (isCompleted) {
        await prisma.assignmentCompletion.upsert({
          where: { studentId_assignmentId: { studentId: student.id, assignmentId: id } },
          create: { studentId: student.id, assignmentId: id },
          update: {},
        });
      } else {
        await prisma.assignmentCompletion.deleteMany({
          where: { studentId: student.id, assignmentId: id },
        });
      }

      response.success(res, { isCompleted }, "Status penyelesaian tugas berhasil diperbarui");
    } catch (error) {
      response.error(res, error, "Gagal memperbarui status penyelesaian tugas");
    }
  },
};
