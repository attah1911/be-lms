import mongoose, { Schema } from "mongoose";

export interface IEnrollment {
  mataPelajaran: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
}

const EnrollmentSchema = new Schema<IEnrollment>(
  {
    mataPelajaran: {
      type: Schema.Types.ObjectId,
      ref: 'MataPelajaran',
      required: true
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Create a compound index to ensure a student can only be enrolled once in a mata pelajaran
EnrollmentSchema.index({ mataPelajaran: 1, student: 1 }, { unique: true });

const EnrollmentModel = mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);

export default EnrollmentModel; 