import { Request, Response } from 'express';
import { IPaginationQuery, IReqUser } from '../utils/interfaces';
import NotificationModel from '../models/notification.model';
import StudentModel from '../models/student.model';
import TeacherModel from '../models/teacher.model';
import response from '../utils/response';
import { ROLES } from '../utils/constant';
import mongoose from 'mongoose';

export default {
  async getMyNotifications(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Notification']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.description = 'Get all notifications for the logged-in student'
     */
    try {
      if (!req.user || req.user.role !== ROLES.MURID) {
        return response.error(res, null, 'Hanya murid yang dapat mengakses endpoint ini');
      }

      // Find the student data for the logged-in user
      const student = await StudentModel.findOne({ userId: req.user.id });
      if (!student) {
        return response.error(res, null, 'Data murid tidak ditemukan');
      }
      
      // Get all notifications for this student
      const notifications = await NotificationModel.find({ 
        'recipient.type': 'student',
        'recipient.id': student._id 
      })
        .populate('mataPelajaran', 'judul')
        .sort({ createdAt: -1 }); // Sort by newest first

      response.success(res, notifications, 'Sukses mengambil data notifikasi');
    } catch (error) {
      response.error(res, error, 'Gagal mengambil data notifikasi');
    }
  },

  async getTeacherNotifications(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Notification']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.description = 'Get all notifications for the logged-in teacher'
     */
    try {
      if (!req.user || req.user.role !== ROLES.GURU) {
        return response.error(res, null, 'Hanya guru yang dapat mengakses endpoint ini');
      }

      // Find the teacher data for the logged-in user
      const teacher = await TeacherModel.findOne({ userId: req.user.id });
      if (!teacher) {
        return response.error(res, null, 'Data guru tidak ditemukan');
      }

      const { page = '1', limit = '10', unread } = req.query;
      const pageNumber = parseInt(page as string, 10);
      const limitNumber = parseInt(limit as string, 10);
      const skip = (pageNumber - 1) * limitNumber;

      // Build query
      const query: any = { 
        'recipient.type': 'teacher',
        'recipient.id': teacher._id 
      };

      if (unread === 'true') {
        query.isRead = false;
      }

      // Count total documents
      const total = await NotificationModel.countDocuments(query);

      // Get notifications with pagination - Fix the populate method
      const notifications = await NotificationModel.find(query)
        .populate('mataPelajaran', 'judul')
        // Don't try to populate relatedItem directly since it uses refPath
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber);

      response.success(
        res, 
        {
          data: notifications,
          pagination: {
            total,
            totalPages: Math.ceil(total / limitNumber),
            current: pageNumber,
            limit: limitNumber,
          }
        }, 
        'Sukses mengambil data notifikasi'
      );
    } catch (error) {
      response.error(res, error, 'Gagal mengambil data notifikasi');
    }
  },

  async debugTeacherNotifications(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Notification']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.description = 'Debug endpoint for teacher notifications'
     */
    try {
      if (!req.user || req.user.role !== ROLES.GURU) {
        return response.error(res, null, 'Hanya guru yang dapat mengakses endpoint ini');
      }

      // Find the teacher data for the logged-in user
      const teacher = await TeacherModel.findOne({ userId: req.user.id });
      if (!teacher) {
        return response.error(res, null, 'Data guru tidak ditemukan');
      }

      // Get all notifications for this teacher without pagination
      const allNotifications = await NotificationModel.find({ 
        'recipient.type': 'teacher',
        'recipient.id': teacher._id 
      })
      .populate('mataPelajaran', 'judul')
      .sort({ createdAt: -1 });

      // Get unread notifications
      const unreadNotifications = await NotificationModel.find({ 
        'recipient.type': 'teacher',
        'recipient.id': teacher._id,
        isRead: false
      })
      .populate('mataPelajaran', 'judul')
      .sort({ createdAt: -1 });

      // Count unread notifications
      const unreadCount = await NotificationModel.countDocuments({
        'recipient.type': 'teacher',
        'recipient.id': teacher._id,
        isRead: false
      });

      // Get information about all notifications in the system
      const totalNotifications = await NotificationModel.countDocuments({});
      const teacherNotifications = await NotificationModel.countDocuments({ 'recipient.type': 'teacher' });
      const studentNotifications = await NotificationModel.countDocuments({ 'recipient.type': 'student' });
      
      // Get notification types breakdown
      const notificationTypes = await NotificationModel.aggregate([
        { $match: { 'recipient.type': 'teacher', 'recipient.id': teacher._id } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]);

      response.success(
        res, 
        {
          teacherId: teacher._id,
          allNotifications: {
            count: allNotifications.length,
            data: allNotifications
          },
          unreadNotifications: {
            count: unreadNotifications.length,
            data: unreadNotifications
          },
          unreadCount,
          systemStats: {
            totalNotifications,
            teacherNotifications,
            studentNotifications,
            notificationTypes
          }
        }, 
        'Debug information for teacher notifications'
      );
    } catch (error) {
      response.error(res, error, 'Gagal mendapatkan debug information');
    }
  },

  async getUnreadNotificationsCount(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Notification']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.description = 'Get count of unread notifications for user'
     */
    try {
      if (!req.user) {
        return response.error(res, null, 'User tidak terautentikasi');
      }

      let recipientId;
      let recipientType;

      if (req.user.role === ROLES.MURID) {
        const student = await StudentModel.findOne({ userId: req.user.id });
        if (!student) {
          return response.error(res, null, 'Data murid tidak ditemukan');
        }
        recipientId = student._id;
        recipientType = 'student';
      } else if (req.user.role === ROLES.GURU) {
        const teacher = await TeacherModel.findOne({ userId: req.user.id });
        if (!teacher) {
          return response.error(res, null, 'Data guru tidak ditemukan');
        }
        recipientId = teacher._id;
        recipientType = 'teacher';
      } else {
        return response.error(res, null, 'Role tidak valid untuk fitur notifikasi');
      }

      // Count unread notifications
      const unreadCount = await NotificationModel.countDocuments({
        'recipient.type': recipientType,
        'recipient.id': recipientId,
        isRead: false
      });

      response.success(
        res,
        { count: unreadCount },
        'Sukses mengambil jumlah notifikasi yang belum dibaca'
      );
    } catch (error) {
      response.error(res, error, 'Gagal mengambil jumlah notifikasi yang belum dibaca');
    }
  },

  async markAsRead(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Notification']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.description = 'Mark a notification as read'
     */
    try {
      if (!req.user) {
        return response.error(res, null, 'User tidak terautentikasi');
      }

      const { id } = req.params;
      let recipientId;
      let recipientType;

      if (req.user.role === ROLES.MURID) {
      const student = await StudentModel.findOne({ userId: req.user.id });
      if (!student) {
        return response.error(res, null, 'Data murid tidak ditemukan');
      }
        recipientId = student._id;
        recipientType = 'student';
      } else if (req.user.role === ROLES.GURU) {
        const teacher = await TeacherModel.findOne({ userId: req.user.id });
        if (!teacher) {
          return response.error(res, null, 'Data guru tidak ditemukan');
        }
        recipientId = teacher._id;
        recipientType = 'teacher';
      } else {
        return response.error(res, null, 'Role tidak valid untuk fitur notifikasi');
      }

      // Find the notification and ensure it belongs to this user
      const notification = await NotificationModel.findOne({
        _id: id,
        'recipient.type': recipientType,
        'recipient.id': recipientId
      });

      if (!notification) {
        return response.error(res, null, 'Notifikasi tidak ditemukan');
      }

      // Mark as read
      notification.isRead = true;
      await notification.save();

      response.success(res, notification, 'Notifikasi berhasil ditandai sebagai telah dibaca');
    } catch (error) {
      response.error(res, error, 'Gagal menandai notifikasi sebagai telah dibaca');
    }
  },

  async markAllAsRead(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Notification']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.description = 'Mark all notifications as read for the logged-in user'
     */
    try {
      if (!req.user) {
        return response.error(res, null, 'User tidak terautentikasi');
      }

      let recipientId;
      let recipientType;

      if (req.user.role === ROLES.MURID) {
      const student = await StudentModel.findOne({ userId: req.user.id });
      if (!student) {
        return response.error(res, null, 'Data murid tidak ditemukan');
      }
        recipientId = student._id;
        recipientType = 'student';
      } else if (req.user.role === ROLES.GURU) {
        const teacher = await TeacherModel.findOne({ userId: req.user.id });
        if (!teacher) {
          return response.error(res, null, 'Data guru tidak ditemukan');
        }
        recipientId = teacher._id;
        recipientType = 'teacher';
      } else {
        return response.error(res, null, 'Role tidak valid untuk fitur notifikasi');
      }

      // Update all unread notifications for this user
      const result = await NotificationModel.updateMany(
        { 
          'recipient.type': recipientType,
          'recipient.id': recipientId,
          isRead: false 
        },
        { isRead: true }
      );

      response.success(
        res,
        { modifiedCount: result.modifiedCount },
        'Semua notifikasi berhasil ditandai sebagai telah dibaca'
      );
    } catch (error) {
      response.error(res, error, 'Gagal menandai semua notifikasi sebagai telah dibaca');
    }
  },

  async createNotification(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Notification']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.description = 'Create a new notification'
     */
    try {
      if (!req.user || (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.GURU)) {
        return response.error(res, null, 'Anda tidak memiliki akses untuk membuat notifikasi');
      }

      const { type, title, description, mataPelajaran, recipientType, recipientId, relatedItem } = req.body;

      // Validate required fields
      if (!type || !title || !description || !mataPelajaran || !recipientType || !recipientId) {
        return response.error(res, null, 'Semua field wajib harus diisi');
      }

      // Create new notification
      const notification = new NotificationModel({
        type,
        title,
        description,
        mataPelajaran,
        recipient: {
          type: recipientType,
          id: recipientId
        },
        relatedItem,
        isRead: false,
      });

      await notification.save();

      response.success(res, notification, 'Notifikasi berhasil dibuat');
    } catch (error) {
      response.error(res, error, 'Gagal membuat notifikasi');
    }
  },

  async deleteNotification(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Notification']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.description = 'Delete a notification'
     */
    try {
      if (!req.user || (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.GURU)) {
        return response.error(res, null, 'Anda tidak memiliki akses untuk menghapus notifikasi');
      }

      const { id } = req.params;

      const notification = await NotificationModel.findByIdAndDelete(id);

      if (!notification) {
        return response.error(res, null, 'Notifikasi tidak ditemukan');
      }

      response.success(res, notification, 'Notifikasi berhasil dihapus');
    } catch (error) {
      response.error(res, error, 'Gagal menghapus notifikasi');
    }
  },
  
  async createTestNotification(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Notification']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.description = 'Create a test notification for the current user'
     */
    try {
      if (!req.user) {
        return response.error(res, null, 'User tidak terautentikasi');
      }

      let recipientId;
      let recipientType;
      let mataPelajaranId;

      if (req.user.role === ROLES.MURID) {
        const student = await StudentModel.findOne({ userId: req.user.id });
        if (!student) {
          return response.error(res, null, 'Data murid tidak ditemukan');
        }
        recipientId = student._id;
        recipientType = 'student';
      } else if (req.user.role === ROLES.GURU) {
        const teacher = await TeacherModel.findOne({ userId: req.user.id });
        if (!teacher) {
          return response.error(res, null, 'Data guru tidak ditemukan');
        }
        recipientId = teacher._id;
        recipientType = 'teacher';
      } else {
        return response.error(res, null, 'Role tidak valid untuk fitur notifikasi');
      }

      // Find a mata pelajaran to associate with the notification
      const mataPelajaran = await mongoose.model('MataPelajaran').findOne();
      if (!mataPelajaran) {
        return response.error(res, null, 'Tidak ada mata pelajaran yang tersedia');
      }
      mataPelajaranId = mataPelajaran._id;

      // Create a test notification
      const notification = new NotificationModel({
        type: req.user.role === ROLES.GURU ? 'submission' : 'tugas',
        title: 'Notifikasi Test',
        description: `Ini adalah notifikasi test untuk ${req.user.role === ROLES.GURU ? 'guru' : 'murid'}`,
        mataPelajaran: mataPelajaranId,
        recipient: {
          type: recipientType,
          id: recipientId
        },
        relatedItem: mataPelajaranId, // Just use mata pelajaran ID as related item for testing
        isRead: false
      });

      await notification.save();

      response.success(res, notification, 'Notifikasi test berhasil dibuat');
    } catch (error) {
      response.error(res, error, 'Gagal membuat notifikasi test');
    }
  }
};