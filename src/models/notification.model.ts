import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  type: string; // 'tugas' | 'materi' | 'info' | 'enrollment' | 'submission' | 'grading_reminder'
  title: string;
  description: string;
  mataPelajaran: mongoose.Types.ObjectId;
  recipient: {
    type: string; // 'student' | 'teacher'
    id: mongoose.Types.ObjectId;
  };
  isRead: boolean;
  relatedItem?: mongoose.Types.ObjectId; // Reference to related item (assignment submission, enrollment, etc.)
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      required: true,
      enum: ['tugas', 'materi', 'info', 'enrollment', 'submission', 'grading_reminder'],
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    mataPelajaran: {
      type: Schema.Types.ObjectId,
      ref: 'MataPelajaran',
      required: true,
    },
    recipient: {
      type: {
        type: String,
        required: true,
        enum: ['student', 'teacher']
      },
      id: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'recipient.type',
      },
    },
    relatedItem: {
      type: Schema.Types.ObjectId,
      refPath: 'type',
      required: false
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const NotificationModel = mongoose.model<INotification>('Notification', notificationSchema);

export default NotificationModel;