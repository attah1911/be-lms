import mongoose, { Document, Schema } from "mongoose";

// Define the enum for submission status
export enum SubmissionStatus {
  SUBMITTED = 'submitted',
  REVIEWED = 'reviewed',
  REJECTED = 'rejected'
}

// Interface for file attachments
export interface IFileAttachment {
  url: string;
  name: string;
}

// Interface for additional file in submission
export interface ISubmissionFile {
  fileUrl: string;
  fileName: string;
}

// Interface for assignment submission
export interface IAssignmentSubmission extends Document {
  student: Schema.Types.ObjectId;
  fileUrl: string;
  fileName: string;
  submittedAt: Date;
  status: SubmissionStatus;
  feedback?: string;
  score?: number;
  additionalFiles?: ISubmissionFile[];
}

// Interface for assignment
export interface IAssignment extends Document {
  title: string;
  description: string;
  deadline: Date;
  materiId: Schema.Types.ObjectId;
  mataPelajaranId: Schema.Types.ObjectId;
  submissions: Array<IAssignmentSubmission & { _id: mongoose.Types.ObjectId }>;
  attachments?: IFileAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

// Schema for file attachment
const FileAttachmentSchema = new Schema<IFileAttachment>({
  url: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  }
});

// Schema for additional file in submission
const SubmissionFileSchema = new Schema<ISubmissionFile>({
  fileUrl: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  }
});

// Schema for assignment submission
const AssignmentSubmissionSchema = new Schema<IAssignmentSubmission>({
  student: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: Object.values(SubmissionStatus),
    default: SubmissionStatus.SUBMITTED
  },
  feedback: {
    type: String
  },
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  additionalFiles: [SubmissionFileSchema]
});

// Schema for assignment
const AssignmentSchema = new Schema<IAssignment>({
  title: {
    type: String,
    required: [true, 'Title is required']
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  deadline: {
    type: Date,
    required: [true, 'Deadline is required']
  },
  materiId: {
    type: Schema.Types.ObjectId,
    ref: 'MateriPelajaran',
    required: [true, 'Materi ID is required']
  },
  mataPelajaranId: {
    type: Schema.Types.ObjectId,
    ref: 'MataPelajaran',
    required: [true, 'Mata Pelajaran ID is required']
  },
  submissions: [AssignmentSubmissionSchema],
  attachments: [FileAttachmentSchema]
}, {
  timestamps: true,
  versionKey: false
});

// Create and export the Assignment model
const AssignmentModel = mongoose.model<IAssignment>('Assignment', AssignmentSchema);

export default AssignmentModel;

// Data access object for validation
export const assignmentDAO = {
  validate: async (data: Partial<IAssignment>) => {
    const assignment = new AssignmentModel(data);
    await assignment.validate();
    return true;
  }
}; 