import { Response } from "express";
import { Prisma } from "@prisma/client";
import { IPaginationQuery, IReqUser } from "../utils/interfaces";
import { prisma } from "../utils/prisma";
import { materiPelajaranDAO } from "../validators";
import response from "../utils/response";
import { ROLES } from "../utils/constant";

type MateriRow = Prisma.MateriPelajaranGetPayload<{}>;

// DB stores kontenTeks + files; the API keeps the old `konten: { teks, files }` shape.
const toApi = (m: MateriRow) => {
  const { kontenTeks, ...rest } = m;
  return { ...rest, konten: { teks: kontenTeks ?? "", files: (m.files as unknown[]) ?? [] } };
};

const kontenToData = (konten: { teks?: string; files?: unknown[] } = {}) => ({
  kontenTeks: konten.teks ?? null,
  files: (konten.files ?? []) as Prisma.InputJsonValue,
});

/** Ensure the logged-in guru owns this mata pelajaran. Returns an error message or null. */
async function assertGuruAccess(req: IReqUser, guruId: string): Promise<string | null> {
  if (req.user?.role !== ROLES.GURU) return null;
  const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
  if (!teacher || teacher.id !== guruId) {
    return "Anda tidak memiliki akses ke mata pelajaran ini";
  }
  return null;
}

export default {
  async create(req: IReqUser, res: Response) {
    try {
      const mataPelajaranId = req.params.mataPelajaranId || req.body.mataPelajaran;
      await materiPelajaranDAO.validate(req.body);

      const mataPelajaran = await prisma.mataPelajaran.findUnique({ where: { id: mataPelajaranId } });
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      const denied = await assertGuruAccess(req, mataPelajaran.guruId);
      if (denied) return response.error(res, null, denied);

      const last = await prisma.materiPelajaran.findFirst({
        where: { mataPelajaranId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const materi = await prisma.materiPelajaran.create({
        data: {
          judul: req.body.judul,
          ...kontenToData(req.body.konten),
          order: last ? last.order + 1 : 1,
          mataPelajaranId,
        },
      });

      response.success(res, toApi(materi), "Sukses membuat materi pelajaran");
    } catch (error) {
      response.error(res, error, "Gagal membuat materi pelajaran");
    }
  },

  async findAll(req: IReqUser, res: Response) {
    const { page = 1, limit = 10, search } = req.query as unknown as IPaginationQuery;
    const { mataPelajaranId } = req.params;

    try {
      const mataPelajaran = await prisma.mataPelajaran.findUnique({ where: { id: mataPelajaranId } });
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      const denied = await assertGuruAccess(req, mataPelajaran.guruId);
      if (denied) return response.error(res, null, denied);

      const take = Number(limit);
      const current = Number(page);
      const where: Prisma.MateriPelajaranWhereInput = { mataPelajaranId };
      if (search) {
        where.OR = [
          { judul: { contains: search, mode: "insensitive" } },
          { kontenTeks: { contains: search, mode: "insensitive" } },
        ];
      }

      const [rows, count] = await Promise.all([
        prisma.materiPelajaran.findMany({
          where,
          take,
          skip: (current - 1) * take,
          orderBy: { order: "asc" },
        }),
        prisma.materiPelajaran.count({ where }),
      ]);

      response.pagination(
        res,
        rows.map(toApi),
        { total: count, totalPages: Math.ceil(count / take), current },
        "Sukses mengambil data materi pelajaran"
      );
    } catch (error) {
      response.error(res, error, "Gagal mengambil data materi pelajaran");
    }
  },

  async findOne(req: IReqUser, res: Response) {
    try {
      const { id, mataPelajaranId } = req.params;

      const materi = await prisma.materiPelajaran.findFirst({ where: { id, mataPelajaranId } });
      if (!materi) {
        return response.error(res, null, "Data materi pelajaran tidak ditemukan");
      }

      const mataPelajaran = await prisma.mataPelajaran.findUnique({ where: { id: mataPelajaranId } });
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      const denied = await assertGuruAccess(req, mataPelajaran.guruId);
      if (denied) return response.error(res, null, denied);

      response.success(res, toApi(materi), "Sukses mengambil data materi pelajaran");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data materi pelajaran");
    }
  },

  async update(req: IReqUser, res: Response) {
    try {
      const { id, mataPelajaranId } = req.params;
      await materiPelajaranDAO.validate(req.body);

      const materi = await prisma.materiPelajaran.findFirst({ where: { id, mataPelajaranId } });
      if (!materi) {
        return response.error(res, null, "Data materi pelajaran tidak ditemukan");
      }

      const mataPelajaran = await prisma.mataPelajaran.findUnique({ where: { id: mataPelajaranId } });
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      const denied = await assertGuruAccess(req, mataPelajaran.guruId);
      if (denied) return response.error(res, null, denied);

      const newOrder: number | undefined = req.body.order;

      const result = await prisma.$transaction(async (tx) => {
        if (newOrder && newOrder !== materi.order) {
          const count = await tx.materiPelajaran.count({ where: { mataPelajaranId } });
          if (newOrder < 1 || newOrder > count) {
            throw new Error("Urutan tidak valid");
          }
          if (newOrder > materi.order) {
            await tx.materiPelajaran.updateMany({
              where: { mataPelajaranId, order: { gt: materi.order, lte: newOrder } },
              data: { order: { decrement: 1 } },
            });
          } else {
            await tx.materiPelajaran.updateMany({
              where: { mataPelajaranId, order: { gte: newOrder, lt: materi.order } },
              data: { order: { increment: 1 } },
            });
          }
        }

        return tx.materiPelajaran.update({
          where: { id },
          data: {
            ...(req.body.judul !== undefined ? { judul: req.body.judul } : {}),
            ...(req.body.konten !== undefined ? kontenToData(req.body.konten) : {}),
            ...(newOrder !== undefined ? { order: newOrder } : {}),
          },
        });
      });

      response.success(res, toApi(result), "Sukses mengupdate materi pelajaran");
    } catch (error) {
      response.error(res, error, "Gagal mengupdate materi pelajaran");
    }
  },

  async remove(req: IReqUser, res: Response) {
    try {
      const { id, mataPelajaranId } = req.params;

      const materi = await prisma.materiPelajaran.findFirst({ where: { id, mataPelajaranId } });
      if (!materi) {
        return response.error(res, null, "Data materi pelajaran tidak ditemukan");
      }

      const mataPelajaran = await prisma.mataPelajaran.findUnique({ where: { id: mataPelajaranId } });
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      const denied = await assertGuruAccess(req, mataPelajaran.guruId);
      if (denied) return response.error(res, null, denied);

      await prisma.$transaction([
        prisma.materiPelajaran.delete({ where: { id } }),
        prisma.materiPelajaran.updateMany({
          where: { mataPelajaranId, order: { gt: materi.order } },
          data: { order: { decrement: 1 } },
        }),
      ]);

      response.success(res, null, "Sukses menghapus materi pelajaran");
    } catch (error) {
      response.error(res, error, "Gagal menghapus materi pelajaran");
    }
  },
};
