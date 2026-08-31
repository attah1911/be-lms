import { Response } from "express";
import { IReqUser } from "../utils/interfaces";
import { prisma } from "../utils/prisma";
import response from "../utils/response";
import { ROLES } from "../utils/constant";

type RecipientFilter = { recipientStudentId: string } | { recipientTeacherId: string };

/** Map the logged-in user to a notification-recipient filter, or null if not found. */
async function resolveRecipient(user: IReqUser["user"]): Promise<RecipientFilter | null> {
  if (user?.role === ROLES.MURID) {
    const student = await prisma.student.findUnique({ where: { userId: user.id } });
    return student ? { recipientStudentId: student.id } : null;
  }
  if (user?.role === ROLES.GURU) {
    const teacher = await prisma.teacher.findUnique({ where: { userId: user.id } });
    return teacher ? { recipientTeacherId: teacher.id } : null;
  }
  return null;
}

const mataPelajaranTitle = { mataPelajaran: { select: { judul: true } } };

export default {
  async getMyNotifications(req: IReqUser, res: Response) {
    try {
      if (req.user?.role !== ROLES.MURID) {
        return response.error(res, null, "Hanya murid yang dapat mengakses endpoint ini");
      }
      const recipient = await resolveRecipient(req.user);
      if (!recipient) return response.error(res, null, "Data murid tidak ditemukan");

      const notifications = await prisma.notification.findMany({
        where: recipient,
        include: mataPelajaranTitle,
        orderBy: { createdAt: "desc" },
      });

      response.success(res, notifications, "Sukses mengambil data notifikasi");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data notifikasi");
    }
  },

  async getTeacherNotifications(req: IReqUser, res: Response) {
    try {
      if (req.user?.role !== ROLES.GURU) {
        return response.error(res, null, "Hanya guru yang dapat mengakses endpoint ini");
      }
      const recipient = await resolveRecipient(req.user);
      if (!recipient) return response.error(res, null, "Data guru tidak ditemukan");

      const pageNumber = parseInt((req.query.page as string) ?? "1", 10);
      const limitNumber = parseInt((req.query.limit as string) ?? "10", 10);
      const where = { ...recipient, ...(req.query.unread === "true" ? { isRead: false } : {}) };

      const [total, notifications] = await Promise.all([
        prisma.notification.count({ where }),
        prisma.notification.findMany({
          where,
          include: mataPelajaranTitle,
          orderBy: { createdAt: "desc" },
          skip: (pageNumber - 1) * limitNumber,
          take: limitNumber,
        }),
      ]);

      response.success(
        res,
        {
          data: notifications,
          pagination: {
            total,
            totalPages: Math.ceil(total / limitNumber),
            current: pageNumber,
            limit: limitNumber,
          },
        },
        "Sukses mengambil data notifikasi"
      );
    } catch (error) {
      response.error(res, error, "Gagal mengambil data notifikasi");
    }
  },

  async getUnreadNotificationsCount(req: IReqUser, res: Response) {
    try {
      if (!req.user) return response.error(res, null, "User tidak terautentikasi");
      const recipient = await resolveRecipient(req.user);
      if (!recipient) {
        return response.error(res, null, "Role tidak valid untuk fitur notifikasi");
      }

      const count = await prisma.notification.count({ where: { ...recipient, isRead: false } });
      response.success(res, { count }, "Sukses mengambil jumlah notifikasi yang belum dibaca");
    } catch (error) {
      response.error(res, error, "Gagal mengambil jumlah notifikasi yang belum dibaca");
    }
  },

  async markAsRead(req: IReqUser, res: Response) {
    try {
      if (!req.user) return response.error(res, null, "User tidak terautentikasi");
      const recipient = await resolveRecipient(req.user);
      if (!recipient) {
        return response.error(res, null, "Role tidak valid untuk fitur notifikasi");
      }

      const { count } = await prisma.notification.updateMany({
        where: { id: req.params.id, ...recipient },
        data: { isRead: true },
      });
      if (count === 0) {
        return response.error(res, null, "Notifikasi tidak ditemukan");
      }

      const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
      response.success(res, notification, "Notifikasi berhasil ditandai sebagai telah dibaca");
    } catch (error) {
      response.error(res, error, "Gagal menandai notifikasi sebagai telah dibaca");
    }
  },

  async markAllAsRead(req: IReqUser, res: Response) {
    try {
      if (!req.user) return response.error(res, null, "User tidak terautentikasi");
      const recipient = await resolveRecipient(req.user);
      if (!recipient) {
        return response.error(res, null, "Role tidak valid untuk fitur notifikasi");
      }

      const result = await prisma.notification.updateMany({
        where: { ...recipient, isRead: false },
        data: { isRead: true },
      });

      response.success(
        res,
        { modifiedCount: result.count },
        "Semua notifikasi berhasil ditandai sebagai telah dibaca"
      );
    } catch (error) {
      response.error(res, error, "Gagal menandai semua notifikasi sebagai telah dibaca");
    }
  },

  async createNotification(req: IReqUser, res: Response) {
    try {
      if (req.user?.role !== ROLES.ADMIN && req.user?.role !== ROLES.GURU) {
        return response.error(res, null, "Anda tidak memiliki akses untuk membuat notifikasi");
      }

      const { type, title, description, mataPelajaran, recipientType, recipientId, relatedItem } =
        req.body;

      if (!type || !title || !description || !mataPelajaran || !recipientType || !recipientId) {
        return response.error(res, null, "Semua field wajib harus diisi");
      }

      const notification = await prisma.notification.create({
        data: {
          type,
          title,
          description,
          mataPelajaranId: mataPelajaran,
          ...(recipientType === "teacher"
            ? { recipientTeacherId: recipientId }
            : { recipientStudentId: recipientId }),
          ...(relatedItem ? { relatedAssignmentId: relatedItem } : {}),
        },
      });

      response.success(res, notification, "Notifikasi berhasil dibuat");
    } catch (error) {
      response.error(res, error, "Gagal membuat notifikasi");
    }
  },

  async deleteNotification(req: IReqUser, res: Response) {
    try {
      if (req.user?.role !== ROLES.ADMIN && req.user?.role !== ROLES.GURU) {
        return response.error(res, null, "Anda tidak memiliki akses untuk menghapus notifikasi");
      }

      const { count } = await prisma.notification.deleteMany({ where: { id: req.params.id } });
      if (count === 0) {
        return response.error(res, null, "Notifikasi tidak ditemukan");
      }

      response.success(res, null, "Notifikasi berhasil dihapus");
    } catch (error) {
      response.error(res, error, "Gagal menghapus notifikasi");
    }
  },
};
