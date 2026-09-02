import { Response } from "express";
import { Prisma } from "@prisma/client";
import { IPaginationQuery, IReqUser } from "../utils/interfaces";
import { prisma } from "../utils/prisma";
import { mataPelajaranDAO } from "../validators";
import response from "../utils/response";
import { ROLES } from "../utils/constant";

const guruSelect = { select: { fullName: true, email: true, nrk: true } };
const withRelations = {
  guru: guruSelect,
  materiPelajaran: { orderBy: { order: "asc" } as const },
};

/** Resolve the Teacher row for the logged-in guru, or null. */
const teacherOf = (userId?: string) =>
  userId ? prisma.teacher.findUnique({ where: { userId } }) : Promise.resolve(null);

async function notifyGuru(guruId: string, mataPelajaranId: string, title: string, description: string) {
  try {
    await prisma.notification.create({
      data: {
        type: "enrollment",
        title,
        description,
        mataPelajaranId,
        recipientTeacherId: guruId,
      },
    });
  } catch {
    /* notification is best-effort */
  }
}

export default {
  async create(req: IReqUser, res: Response) {
    try {
      await mataPelajaranDAO.validate(req.body);
      const { judul, deskripsi, tingkatKelas, kategori } = req.body;

      let guruId: string = req.body.guru;
      if (req.user?.role === ROLES.GURU) {
        const teacher = await teacherOf(req.user.id);
        if (!teacher) return response.notFound(res, "Data guru tidak ditemukan");
        guruId = teacher.id;
      } else if (!(await prisma.teacher.findUnique({ where: { id: guruId } }))) {
        return response.notFound(res, "Data guru tidak ditemukan");
      }

      const mataPelajaran = await prisma.mataPelajaran.create({
        data: { judul, deskripsi, tingkatKelas, kategori, guruId },
        include: withRelations,
      });

      response.success(res, mataPelajaran, "Sukses membuat mata pelajaran");
    } catch (error) {
      response.error(res, error, "Gagal membuat mata pelajaran");
    }
  },

  async findAll(req: IReqUser, res: Response) {
    const { page = 1, limit = 10, search, kategori, guru } = req.query as unknown as IPaginationQuery & {
      kategori?: string;
      guru?: string;
    };

    try {
      const take = Number(limit);
      const current = Number(page);
      const where: Prisma.MataPelajaranWhereInput = {};

      if (search) {
        where.OR = [
          { judul: { contains: search, mode: "insensitive" } },
          { deskripsi: { contains: search, mode: "insensitive" } },
        ];
      }
      if (kategori) where.kategori = kategori;
      if (guru) where.guruId = guru;

      if (req.user?.role === ROLES.GURU) {
        const teacher = await teacherOf(req.user.id);
        if (!teacher) return response.notFound(res, "Data guru tidak ditemukan");
        where.guruId = teacher.id;
      }

      const [result, count] = await Promise.all([
        prisma.mataPelajaran.findMany({
          where,
          include: withRelations,
          take,
          skip: (current - 1) * take,
          orderBy: { createdAt: "desc" },
        }),
        prisma.mataPelajaran.count({ where }),
      ]);

      response.pagination(
        res,
        result,
        { total: count, totalPages: Math.ceil(count / take), current },
        "Sukses mengambil data mata pelajaran"
      );
    } catch (error) {
      response.error(res, error, "Gagal mengambil data mata pelajaran");
    }
  },

  async findOne(req: IReqUser, res: Response) {
    try {
      const result = await prisma.mataPelajaran.findUnique({
        where: { id: req.params.id },
        include: withRelations,
      });
      if (!result) {
        return response.notFound(res, "Data mata pelajaran tidak ditemukan");
      }

      if (req.user?.role === ROLES.GURU) {
        const teacher = await teacherOf(req.user.id);
        if (!teacher || result.guruId !== teacher.id) {
          return response.unauthorized(res, "Anda tidak memiliki akses ke mata pelajaran ini");
        }
      }

      response.success(res, result, "Sukses mengambil data mata pelajaran");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data mata pelajaran");
    }
  },

  async update(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;
      await mataPelajaranDAO.validate(req.body);
      const { judul, deskripsi, tingkatKelas, kategori } = req.body;

      const mataPelajaran = await prisma.mataPelajaran.findUnique({ where: { id } });
      if (!mataPelajaran) {
        return response.notFound(res, "Data mata pelajaran tidak ditemukan");
      }

      if (req.user?.role === ROLES.GURU) {
        const teacher = await teacherOf(req.user.id);
        if (!teacher || mataPelajaran.guruId !== teacher.id) {
          return response.unauthorized(res, "Anda tidak memiliki akses ke mata pelajaran ini");
        }
      }

      const result = await prisma.mataPelajaran.update({
        where: { id },
        data: {
          judul,
          deskripsi,
          tingkatKelas,
          kategori,
          ...(req.body.guru && req.user?.role !== ROLES.GURU ? { guruId: req.body.guru } : {}),
        },
        include: withRelations,
      });

      response.success(res, result, "Sukses mengupdate mata pelajaran");
    } catch (error) {
      response.error(res, error, "Gagal mengupdate mata pelajaran");
    }
  },

  async remove(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;
      const mataPelajaran = await prisma.mataPelajaran.findUnique({ where: { id } });
      if (!mataPelajaran) {
        return response.notFound(res, "Data mata pelajaran tidak ditemukan");
      }

      if (req.user?.role === ROLES.GURU) {
        const teacher = await teacherOf(req.user.id);
        if (!teacher || mataPelajaran.guruId !== teacher.id) {
          return response.unauthorized(res, "Anda tidak memiliki akses ke mata pelajaran ini");
        }
      }

      // Cascades to materiPelajaran / assignments / enrollments / notifications.
      await prisma.mataPelajaran.delete({ where: { id } });

      response.success(res, null, "Sukses menghapus mata pelajaran");
    } catch (error) {
      response.error(res, error, "Gagal menghapus mata pelajaran");
    }
  },

  async getEnrolledStudents(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;
      const mataPelajaran = await prisma.mataPelajaran.findUnique({ where: { id } });
      if (!mataPelajaran) {
        return response.notFound(res, "Data mata pelajaran tidak ditemukan");
      }

      const enrollments = await prisma.enrollment.findMany({
        where: { mataPelajaranId: id },
        include: {
          student: {
            select: { id: true, fullName: true, email: true, nis: true, kelas: true, noTelp: true },
          },
        },
      });

      response.success(
        res,
        enrollments.map((e) => e.student),
        "Sukses mengambil data murid yang terdaftar"
      );
    } catch (error) {
      response.error(res, error, "Gagal mengambil data murid yang terdaftar");
    }
  },

  async enrollStudent(req: IReqUser, res: Response) {
    try {
      const { id, studentId } = req.params;

      const mataPelajaran = await prisma.mataPelajaran.findUnique({ where: { id } });
      if (!mataPelajaran) {
        return response.notFound(res, "Data mata pelajaran tidak ditemukan");
      }

      let actualStudentId = studentId;
      if (req.user?.role === ROLES.MURID) {
        const self = await prisma.student.findUnique({ where: { userId: req.user.id } });
        if (!self) {
          return response.notFound(res, "Data murid tidak ditemukan untuk pengguna ini");
        }
        actualStudentId = self.id;
      }

      const student = await prisma.student.findUnique({ where: { id: actualStudentId } });
      if (!student) {
        return response.notFound(res, "Data murid tidak ditemukan");
      }

      const existing = await prisma.enrollment.findUnique({
        where: { mataPelajaranId_studentId: { mataPelajaranId: id, studentId: actualStudentId } },
      });
      if (existing) {
        return response.badRequest(res, "Murid sudah terdaftar pada mata pelajaran ini");
      }

      const enrollment = await prisma.enrollment.create({
        data: { mataPelajaranId: id, studentId: actualStudentId },
      });

      await notifyGuru(
        mataPelajaran.guruId,
        id,
        "Pendaftaran Baru",
        `${student.fullName} telah mendaftar pada mata pelajaran "${mataPelajaran.judul}"`
      );

      response.success(res, enrollment, "Sukses mendaftarkan murid ke mata pelajaran");
    } catch (error) {
      response.error(res, error, "Gagal mendaftarkan murid ke mata pelajaran");
    }
  },

  async selfEnrollStudent(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      if (req.user?.role !== ROLES.MURID) {
        return response.unauthorized(res, "Hanya murid yang dapat mendaftarkan dirinya sendiri");
      }

      const mataPelajaran = await prisma.mataPelajaran.findUnique({ where: { id } });
      if (!mataPelajaran) {
        return response.notFound(res, "Data mata pelajaran tidak ditemukan");
      }

      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (!student) {
        return response.notFound(res, "Data murid tidak ditemukan untuk pengguna ini");
      }

      const existing = await prisma.enrollment.findUnique({
        where: { mataPelajaranId_studentId: { mataPelajaranId: id, studentId: student.id } },
      });
      if (existing) {
        return response.badRequest(res, "Anda sudah terdaftar pada mata pelajaran ini");
      }

      const enrollment = await prisma.enrollment.create({
        data: { mataPelajaranId: id, studentId: student.id },
      });

      await notifyGuru(
        mataPelajaran.guruId,
        id,
        "Pendaftaran Baru",
        `${student.fullName} telah mendaftar pada mata pelajaran "${mataPelajaran.judul}"`
      );

      response.success(res, enrollment, "Sukses mendaftar ke mata pelajaran");
    } catch (error) {
      response.error(res, error, "Gagal mendaftar ke mata pelajaran");
    }
  },

  async unenrollStudent(req: IReqUser, res: Response) {
    try {
      const { id, studentId } = req.params;

      const { count } = await prisma.enrollment.deleteMany({
        where: { mataPelajaranId: id, studentId },
      });
      if (count === 0) {
        return response.notFound(res, "Murid tidak terdaftar pada mata pelajaran ini");
      }

      response.success(res, null, "Sukses menghapus murid dari mata pelajaran");
    } catch (error) {
      response.error(res, error, "Gagal menghapus murid dari mata pelajaran");
    }
  },

  async findAllForGuru(req: IReqUser, res: Response) {
    const { page = 1, limit = 10, search, kategori } = req.query as unknown as IPaginationQuery & {
      kategori?: string;
    };

    try {
      const teacher = await teacherOf(req.user?.id);
      if (!teacher) {
        return response.notFound(res, "Data guru tidak ditemukan");
      }

      const take = Number(limit);
      const current = Number(page);
      const where: Prisma.MataPelajaranWhereInput = { guruId: teacher.id };

      if (search) {
        where.OR = [
          { judul: { contains: search, mode: "insensitive" } },
          { deskripsi: { contains: search, mode: "insensitive" } },
        ];
      }
      if (kategori) where.kategori = kategori;

      const [result, count] = await Promise.all([
        prisma.mataPelajaran.findMany({
          where,
          include: withRelations,
          take,
          skip: (current - 1) * take,
          orderBy: { createdAt: "desc" },
        }),
        prisma.mataPelajaran.count({ where }),
      ]);

      response.pagination(
        res,
        result,
        { total: count, totalPages: Math.ceil(count / take), current },
        "Sukses mengambil data mata pelajaran guru"
      );
    } catch (error) {
      response.error(res, error, "Gagal mengambil data mata pelajaran guru");
    }
  },
};
