import mongoose, { Schema } from "mongoose";
import * as Yup from "yup";

export const studentDAO = Yup.object({
  fullName: Yup.string().required(),
  email: Yup.string().email().required(),
  nis: Yup.string().required(),
  kelas: Yup.string().required(),
  noTelp: Yup.string().required(),
});

export interface Student {
  fullName: string;
  email: string;
  nis: string;
  kelas: string;
  noTelp: string;
  userId: mongoose.Types.ObjectId;
  completedAssignments?: string[];
}

const StudentSchema = new Schema<Student>(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    nis: {
      type: String,
      required: true,
      unique: true,
    },
    kelas: {
      type: String,
      required: true,
    },
    noTelp: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    completedAssignments: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const StudentModel = mongoose.model('Student', StudentSchema);

export default StudentModel;