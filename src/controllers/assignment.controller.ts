import { Response } from "express";
import { IReqUser } from "../utils/interfaces";
import AssignmentModel, { assignmentDAO, SubmissionStatus } from "../models/assignment.model";
import MateriPelajaranModel from "../models/materiPelajaran.model";
import MataPelajaranModel from "../models/mataPelajaran.model";
import mongoose from "mongoose";
import response from "../utils/response";
import { ROLES } from "../utils/constant";
import NotificationModel from "../models/notification.model";
import TeacherModel from "../models/teacher.model";
import StudentModel from "../models/student.model";

// Define interface for populated mataPelajaran
interface PopulatedMataPelajaran {
  _id: mongoose.Types.ObjectId;
  judul: string;
  guru: mongoose.Types.ObjectId;
}

export default {
  async create(req: IReqUser, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate input
      await assignmentDAO.validate(req.body);

      // Verify that the materiId exists
      const materiId = req.body.materiId;
      const materi = await MateriPelajaranModel.findById(materiId);
      if (!materi) {
        return response.error(res, null, "Data materi tidak ditemukan");
      }

      // Verify that the mataPelajaranId exists
      const mataPelajaranId = req.body.mataPelajaranId;
      const mataPelajaran = await MataPelajaranModel.findById(mataPelajaranId);
      if (!mataPelajaran) {
        return response.error(res, null, "Data mata pelajaran tidak ditemukan");
      }

      // Check if user has permission (admin or guru of this subject)
      if (req.user?.role === ROLES.GURU) {
        const teacher = await mongoose.model('Teacher').findOne({ userId: req.user.id });
        if (!teacher || mataPelajaran.guru.toString() !== teacher._id.toString()) {
          return response.error(res, null, "Anda tidak memiliki akses ke mata pelajaran ini");
        }
      }

      // Create assignment
      const assignment = await AssignmentModel.create([{
        ...req.body,
        submissions: []
      }], { session });

      // Create notifications for enrolled students
      try {
        // Get all students enrolled in this mata pelajaran
        const enrollments = await mongoose.model('Enrollment').find({
          mataPelajaran: mataPelajaranId
        }).populate('student');
        
        // Create notifications for each student
        if (enrollments && enrollments.length > 0) {
          const notificationPromises = enrollments.map(enrollment => {
            if (enrollment.student) {
              return {
                type: 'tugas',
                title: 'Tugas Baru',
                description: `Tugas baru "${req.body.title}" telah ditambahkan di mata pelajaran "${mataPelajaran.judul}"`,
                mataPelajaran: mataPelajaranId,
                recipient: {
                  type: 'student',
                  id: enrollment.student._id
                },
                relatedItem: assignment[0]._id,
                isRead: false
              };
            }
            return null;
          }).filter(Boolean);
          
          if (notificationPromises.length > 0) {
            const notifications = await NotificationModel.insertMany(notificationPromises, { session });
          }
        }
      } catch (notifError) {
        // Don't fail the whole transaction if notification creation fails
      }

      await session.commitTransaction();
      response.success(res, assignment[0], "Sukses membuat tugas");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal membuat tugas");
    } finally {
      session.endSession();
    }
  },

  async findAll(req: IReqUser, res: Response) {
    try {
      const result = await AssignmentModel.find()
        .populate('materiId', 'judul')
        .populate('mataPelajaranId', 'judul')
        .sort({ createdAt: -1 });

      response.success(res, result, "Sukses mengambil data tugas");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data tugas");
    }
  },

  async findByMateriId(req: IReqUser, res: Response) {
    try {
      const { materiId } = req.params;

      const result = await AssignmentModel.find({ materiId })
        .populate({
          path: 'submissions.student',
          select: 'fullName email nis kelas'
        })
        .sort({ createdAt: -1 });

      response.success(res, result, "Sukses mengambil data tugas");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data tugas");
    }
  },

  async findOne(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      // Check if the ID is valid
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return response.error(res, null, "Format ID tugas tidak valid", 400);
      }

      const result = await AssignmentModel.findById(id)
        .populate({
          path: 'materiId',
          select: 'judul'
        })
        .populate({
          path: 'mataPelajaranId',
          select: 'judul'
        })
        .populate({
          path: 'submissions.student',
          select: 'fullName email nis kelas'
        });

      if (!result) {
        return response.error(res, null, "Data tugas tidak ditemukan", 404);
      }

      // Get student info if user is a student
      let studentId = null;
      if (req.user?.role === 'murid') {
        const student = await mongoose.model('Student').findOne({ userId: req.user.id });
        if (student) {
          studentId = student._id;
        }
      }
      
      // Ensure we have the right structure for client-side
      const responseData = {
        ...result.toObject(),
        title: result.title,
        description: result.description,
        submissions: result.submissions.map(sub => {
          const submission = sub.toObject();
          
          // Ensure additionalFiles is always an array
          if (!submission.additionalFiles) {
            submission.additionalFiles = [];
          }
          
          // Fix file structure if needed
          if (!submission.file) {
            submission.file = {
              url: submission.fileUrl,
              originalName: submission.fileName
            };
          }
          
          return submission;
        })
      };

      response.success(res, responseData, "Sukses mengambil data tugas");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data tugas");
    }
  },

  async update(req: IReqUser, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;

      // Find the assignment
      const assignment = await AssignmentModel.findById(id);
      if (!assignment) {
        return response.error(res, null, "Data tugas tidak ditemukan");
      }

      // Check if user has permission
      if (req.user?.role === ROLES.GURU) {
        const mataPelajaran = await MataPelajaranModel.findById(assignment.mataPelajaranId);
        const teacher = await mongoose.model('Teacher').findOne({ userId: req.user.id });
        if (!teacher || !mataPelajaran || mataPelajaran.guru.toString() !== teacher._id.toString()) {
          return response.error(res, null, "Anda tidak memiliki akses ke tugas ini");
        }
      }

      // Extract fields that need validation (excluding submissions and attachments)
      const { submissions, attachments, ...updateData } = req.body;
      
      // Only validate fields that mongoose schema knows about
      if (Object.keys(updateData).length > 0) {
        await assignmentDAO.validate(updateData);
      }

      // Prepare the final update data
      const finalUpdateData: any = { ...updateData };
      
      // Handle attachments separately if they exist
      if (attachments !== undefined) {
        finalUpdateData.attachments = attachments;
      }

      // Update the assignment (don't modify submissions here)
      const result = await AssignmentModel.findByIdAndUpdate(
        id,
        finalUpdateData,
        { new: true, session }
      ).populate({
        path: 'submissions.student',
        select: 'fullName email nis kelas'
      });

      await session.commitTransaction();
      response.success(res, result, "Sukses mengupdate tugas");
    } catch (error) {
      await session.abortTransaction();
      console.error("Assignment update error:", error);
      response.error(res, error, "Gagal mengupdate tugas");
    } finally {
      session.endSession();
    }
  },

  async remove(req: IReqUser, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;

      // Find the assignment
      const assignment = await AssignmentModel.findById(id);
      if (!assignment) {
        return response.error(res, null, "Data tugas tidak ditemukan");
      }

      // Check if user has permission
      if (req.user?.role === ROLES.GURU) {
        const mataPelajaran = await MataPelajaranModel.findById(assignment.mataPelajaranId);
        const teacher = await mongoose.model('Teacher').findOne({ userId: req.user.id });
        if (!teacher || !mataPelajaran || mataPelajaran.guru.toString() !== teacher._id.toString()) {
          return response.error(res, null, "Anda tidak memiliki akses ke tugas ini");
        }
      }

      // Delete the assignment
      await AssignmentModel.findByIdAndDelete(id, { session });

      await session.commitTransaction();
      response.success(res, null, "Sukses menghapus tugas");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal menghapus tugas");
    } finally {
      session.endSession();
    }
  },

  async submitAssignment(req: IReqUser, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;

      // Handle both single file and multiple files formats for backward compatibility
      let files = [];
      
      if (req.body.files && Array.isArray(req.body.files)) {
        // New format with files array
        files = req.body.files;
      } else if (req.body.fileUrl && req.body.fileName) {
        // Old format with single file
        files = [{ fileUrl: req.body.fileUrl, fileName: req.body.fileName }];
      } else {
        return response.error(res, null, "Format pengumpulan tidak valid. File tidak boleh kosong", 400);
      }

      // Validate files array
      if (!files || files.length === 0) {
        return response.error(res, null, "File tidak boleh kosong", 400);
      }

      // Limit to maximum 5 files
      if (files.length > 5) {
        return response.error(res, null, "Maksimal 5 file yang dapat diunggah", 400);
      }

      // Check if the assignment exists
      const assignment = await AssignmentModel.findById(id);
      if (!assignment) {
        return response.error(res, null, "Data tugas tidak ditemukan", 404);
      }

      // Check if deadline has passed (only for students)
      if (req.user?.role === ROLES.MURID && new Date(assignment.deadline) < new Date()) {
        return response.error(res, null, "Tenggat waktu pengumpulan tugas telah berakhir", 400);
      }

      // For students, get their student record
      let student;
      let submissionData: any = {};

      if (req.user?.role === ROLES.MURID) {
        student = await mongoose.model('Student').findOne({ userId: req.user?.id });
        if (!student) {
          return response.error(res, null, "Data murid tidak ditemukan", 404);
        }
      } else {
        // For admin/guru, create a special testing submission with more complete data
        const testingLabel = req.user?.role === ROLES.ADMIN ? "Admin (Testing)" : "Guru (Testing)";
        
        student = {
          _id: new mongoose.Types.ObjectId(),
          fullName: testingLabel,
          email: (req.user as any)?.email || `${testingLabel.toLowerCase().replace(' ', '.')}@testing.com`,
          kelas: "Testing"
        };
      }

      // Check if student/tester has already submitted an assignment
      const existingSubmissionIndex = assignment.submissions.findIndex(
        (submission) => {
          if (req.user?.role === ROLES.MURID) {
            return submission.student?.toString() === student._id.toString();
          } else {
            // For admin/guru, check if this is a test submission with the same role
            return submission.student && 
                  typeof submission.student === 'object' && 
                  'fullName' in submission.student && 
                  submission.student.fullName === student.fullName;
          }
        }
      );

      const existingSubmission = existingSubmissionIndex !== -1 ? 
        assignment.submissions[existingSubmissionIndex] : null;

      // Process the first file as the main file (for backward compatibility)
      const mainFile = files[0];
      
      if (existingSubmission) {
        // Update existing submission
        existingSubmission.fileUrl = mainFile.fileUrl;
        existingSubmission.fileName = mainFile.fileName;
        existingSubmission.submittedAt = new Date();
        existingSubmission.status = SubmissionStatus.SUBMITTED;
        
        // Add additional files if any
        if (files.length > 1) {
          existingSubmission.additionalFiles = files.slice(1).map((file: {fileUrl: string; fileName: string}) => ({
            fileUrl: file.fileUrl,
            fileName: file.fileName
          }));
        } else {
          // Clear additional files if there are none
          existingSubmission.additionalFiles = [];
        }
        
        // Save the reference for response
        submissionData = existingSubmission;
      } else {
        // Add new submission
        const newSubmission: any = {
          student: req.user?.role === ROLES.MURID ? student._id : student,
          fileUrl: mainFile.fileUrl,
          fileName: mainFile.fileName,
          submittedAt: new Date(),
          status: SubmissionStatus.SUBMITTED
        };
        
        // Add additional files if any
        if (files.length > 1) {
          newSubmission.additionalFiles = files.slice(1).map((file: {fileUrl: string; fileName: string}) => ({
            fileUrl: file.fileUrl,
            fileName: file.fileName
          }));
        } else {
          // Initialize empty array for additionalFiles
          newSubmission.additionalFiles = [];
        }
        
        assignment.submissions.push(newSubmission);
        
        // Save the reference for response
        submissionData = assignment.submissions[assignment.submissions.length - 1];
      }

      // Save the updated assignment
      await assignment.save({ session });

      // Get the updated assignment with populated fields
      const updatedAssignment = await AssignmentModel.findById(id)
        .populate({
          path: 'materiId',
          select: 'judul'
        })
        .populate({
          path: 'mataPelajaranId',
          select: 'judul'
        })
        .populate({
          path: 'submissions.student',
          select: 'fullName email nis kelas'
        });
      
      // Find the submission in the populated result for response
      const returnSubmission = updatedAssignment?.submissions.find(sub => 
        sub._id.toString() === submissionData._id.toString()
      );
      
      // If a student submitted the assignment, create a notification for the teacher
      if (req.user?.role === ROLES.MURID && assignment.mataPelajaranId) {
        try {
          // Get the mata pelajaran to find the teacher
          const mataPelajaran = await MataPelajaranModel.findById(assignment.mataPelajaranId).populate('guru');
          
          if (mataPelajaran && mataPelajaran.guru) {
            // Create a notification for the teacher
            const studentName = student.fullName || 'Seorang murid';
            const notificationData = {
              type: 'submission',
              title: 'Pengumpulan Tugas Baru',
              description: `${studentName} telah mengumpulkan tugas "${assignment.title}"`,
              mataPelajaran: assignment.mataPelajaranId,
              recipient: {
                type: 'teacher',
                id: mataPelajaran.guru._id
              },
              relatedItem: assignment._id,
              isRead: false
            };
            
            const notification = await NotificationModel.create([notificationData], { session });
          }
        } catch (notifError) {
          // Don't fail the whole transaction if notification creation fails
        }
      }

      await session.commitTransaction();
      
      // Return both the assignment and the specific submission
      response.success(res, {
        assignment: updatedAssignment,
        submission: returnSubmission || submissionData
      }, "Sukses mengumpulkan tugas");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal mengumpulkan tugas");
    } finally {
      session.endSession();
    }
  },

  async updateSubmissionStatus(req: IReqUser, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id, submissionId } = req.params;
      const { status, feedback } = req.body;

      // Check if status is valid
      if (!Object.values(SubmissionStatus).includes(status)) {
        return response.error(res, null, "Status tidak valid");
      }

      // Find the assignment
      const assignment = await AssignmentModel.findById(id);
      if (!assignment) {
        return response.error(res, null, "Data tugas tidak ditemukan");
      }

      // Check permission (admin or the teacher of this subject)
      if (req.user?.role === ROLES.GURU) {
        const mataPelajaran = await MataPelajaranModel.findById(assignment.mataPelajaranId);
        const teacher = await mongoose.model('Teacher').findOne({ userId: req.user.id });
        if (!teacher || !mataPelajaran || mataPelajaran.guru.toString() !== teacher._id.toString()) {
          return response.error(res, null, "Anda tidak memiliki akses ke tugas ini");
        }
      }

      // Find the submission
      const submissionIndex = assignment.submissions.findIndex(
        (sub: any) => sub._id && sub._id.toString() === submissionId
      );
      
      if (submissionIndex === -1) {
        return response.error(res, null, "Data pengumpulan tugas tidak ditemukan");
      }
      
      const submission = assignment.submissions[submissionIndex];

      // Update the submission status and feedback
      if (submission) {
        assignment.submissions[submissionIndex].status = status as SubmissionStatus;
        if (feedback !== undefined) {
          assignment.submissions[submissionIndex].feedback = feedback;
        }
      }

      // Save the changes
      await assignment.save({ session });

      await session.commitTransaction();
      response.success(res, assignment, "Sukses mengupdate status pengumpulan tugas");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal mengupdate status pengumpulan tugas");
    } finally {
      session.endSession();
    }
  },

  async updateSubmissionScore(req: IReqUser, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id, submissionId } = req.params;
      const { score } = req.body;

      // Check if score is valid
      if (score === undefined || score < 0 || score > 100) {
        return response.error(res, null, "Nilai tidak valid. Harus berupa angka antara 0-100");
      }

      // Find the assignment
      const assignment = await AssignmentModel.findById(id);
      if (!assignment) {
        return response.error(res, null, "Data tugas tidak ditemukan");
      }

      // Check permission (admin or the teacher of this subject)
      if (req.user?.role === ROLES.GURU) {
        const mataPelajaran = await MataPelajaranModel.findById(assignment.mataPelajaranId);
        const teacher = await mongoose.model('Teacher').findOne({ userId: req.user.id });
        if (!teacher || !mataPelajaran || mataPelajaran.guru.toString() !== teacher._id.toString()) {
          return response.error(res, null, "Anda tidak memiliki akses ke tugas ini");
        }
      }

      // Find the submission
      const submissionIndex = assignment.submissions.findIndex(
        (sub: any) => sub._id && sub._id.toString() === submissionId
      );
      
      if (submissionIndex === -1) {
        return response.error(res, null, "Data pengumpulan tugas tidak ditemukan");
      }
      
      const submission = assignment.submissions[submissionIndex];

      // Update the submission score
      if (submission) {
        assignment.submissions[submissionIndex].score = score;
        // Ensure submission is marked as reviewed when score is set
        if (assignment.submissions[submissionIndex].status !== SubmissionStatus.REVIEWED) {
          assignment.submissions[submissionIndex].status = SubmissionStatus.REVIEWED;
        }
      }

      // Save the changes
      await assignment.save({ session });
      
      // Check for other ungraded submissions and create reminders if needed
      if (assignment.mataPelajaranId) {
        try {
          const teacher = await TeacherModel.findOne({ userId: req.user?.id });
          
          if (teacher) {
            // Count ungraded submissions for this assignment
            const ungradedCount = assignment.submissions.filter(
              (sub) => sub.status === SubmissionStatus.SUBMITTED && !sub.score
            ).length;
            
            // If there are still ungraded submissions, create a reminder notification
            if (ungradedCount > 0) {
              const notificationData = {
                type: 'grading_reminder',
                title: 'Pengingat Penilaian',
                description: `Anda masih memiliki ${ungradedCount} tugas yang belum dinilai untuk "${assignment.title}"`,
                mataPelajaran: assignment.mataPelajaranId,
                recipient: {
                  type: 'teacher',
                  id: teacher._id
                },
                relatedItem: assignment._id,
                isRead: false
              };
              
              // Check if a similar notification already exists (to avoid duplicates)
              const existingNotification = await NotificationModel.findOne({
                'recipient.id': teacher._id,
                'recipient.type': 'teacher',
                type: 'grading_reminder',
                relatedItem: assignment._id,
                isRead: false
              });
              
              // Create reminder only if none exists
              if (!existingNotification) {
                await NotificationModel.create([notificationData], { session });
              }
            }
          }
        } catch (notifError) {
          // Don't fail the transaction if notification creation fails
        }
      }

      await session.commitTransaction();
      response.success(res, assignment, "Sukses mengupdate nilai tugas");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal mengupdate nilai tugas");
    } finally {
      session.endSession();
    }
  },

  async deleteSubmission(req: IReqUser, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id, submissionId } = req.params;

      // Find the assignment
      const assignment = await AssignmentModel.findById(id);
      if (!assignment) {
        return response.error(res, null, "Data tugas tidak ditemukan");
      }

      // Find the submission
      const submissionIndex = assignment.submissions.findIndex(
        (sub: any) => sub._id && sub._id.toString() === submissionId
      );
      
      if (submissionIndex === -1) {
        return response.error(res, null, "Data pengumpulan tugas tidak ditemukan");
      }

      // Get submission data for response
      const deletedSubmission = assignment.submissions[submissionIndex];
      
      // Check permission based on role
      if (req.user?.role === ROLES.MURID) {
        // For students, they can only delete their own submissions
        const student = await mongoose.model('Student').findOne({ userId: req.user.id });
        if (!student) {
          return response.error(res, null, "Data murid tidak ditemukan");
        }
        
        // Check if this is the student's own submission
        if (deletedSubmission.student.toString() !== student._id.toString()) {
          return response.error(res, null, "Anda hanya dapat menghapus pengumpulan tugas Anda sendiri");
        }
        
        // Check if the deadline has passed
        if (new Date(assignment.deadline) < new Date()) {
          return response.error(res, null, "Batas waktu pengumpulan telah berakhir");
        }
        
        // Check if the submission has already been graded
        if (deletedSubmission.status !== SubmissionStatus.SUBMITTED) {
          return response.error(res, null, "Pengumpulan tugas yang sudah dinilai tidak dapat dihapus");
        }
      } else if (req.user?.role === ROLES.GURU) {
        // For teachers, check if they own the mata pelajaran
        const mataPelajaran = await MataPelajaranModel.findById(assignment.mataPelajaranId);
        const teacher = await mongoose.model('Teacher').findOne({ userId: req.user.id });
        if (!teacher || !mataPelajaran || mataPelajaran.guru.toString() !== teacher._id.toString()) {
          return response.error(res, null, "Anda tidak memiliki akses ke tugas ini");
        }
      }
      // Admin can delete any submission

      // Remove the submission
      assignment.submissions.splice(submissionIndex, 1);

      // Save the changes
      await assignment.save({ session });

      // Get the updated assignment with populated fields
      const updatedAssignment = await AssignmentModel.findById(id)
        .populate({
          path: 'materiId',
          select: 'judul'
        })
        .populate({
          path: 'mataPelajaranId',
          select: 'judul'
        })
        .populate({
          path: 'submissions.student',
          select: 'fullName email nis kelas'
        });

      await session.commitTransaction();
      response.success(res, { 
        deletedSubmission,
        assignment: updatedAssignment
      }, "Sukses menghapus pengumpulan tugas");
    } catch (error) {
      await session.abortTransaction();
      response.error(res, error, "Gagal menghapus pengumpulan tugas");
    } finally {
      session.endSession();
    }
  },

  async checkClosedAssignments(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Assignment']
     #swagger.description = 'Check for assignments that have passed their deadline and create notifications for teachers'
     */
    try {
      // Find all assignments where deadline has passed (with a small buffer to avoid race conditions)
      // Only consider assignments from the last 24 hours to avoid creating notifications for old assignments
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const now = new Date();
      // Use an explicit type for the populated field to help TypeScript 
      interface AssignmentWithPopulated extends mongoose.Document {
        mataPelajaranId: {
          _id: mongoose.Types.ObjectId;
          judul: string;
          guru: mongoose.Types.ObjectId;
        };
        // Add other assignment properties as needed
        _id: mongoose.Types.ObjectId;
        title: string;
        submissions: any[];
      }

      const closedAssignments = await AssignmentModel.find({
        deadline: { 
          $lt: now, 
          $gte: oneDayAgo 
        }
      })
      .populate('mataPelajaranId', 'judul guru')
      .exec() as unknown as AssignmentWithPopulated[];
      
      // Process each closed assignment
      const processedNotifications = [];
      for (const assignment of closedAssignments) {
        // Only process if there are submissions to grade
        const submissionsToGrade = assignment.submissions.filter(
          sub => sub.status === SubmissionStatus.SUBMITTED && !sub.score
        );
        
        if (submissionsToGrade.length === 0) {
          continue;
        }
        
        if (!assignment.mataPelajaranId) {
          continue;
        }
        
        if (!assignment.mataPelajaranId.guru) {
          continue;
        }
        
        // Check if the notification for this assignment already exists
        const existingNotification = await NotificationModel.findOne({
          'recipient.type': 'teacher',
          'recipient.id': assignment.mataPelajaranId.guru,
          type: 'grading_reminder',
          relatedItem: assignment._id,
          isRead: false,
          createdAt: { $gte: oneDayAgo }
        });
        
        if (existingNotification) {
          continue;
        }
        
        // Create a notification for the teacher
        const notificationData = {
          type: 'grading_reminder',
          title: 'Pengingat Penilaian Tugas',
          description: `Batas waktu pengumpulan tugas "${assignment.title}" telah berakhir. Terdapat ${submissionsToGrade.length} tugas yang perlu dinilai.`,
          mataPelajaran: assignment.mataPelajaranId._id,
          recipient: {
            type: 'teacher',
            id: assignment.mataPelajaranId.guru
          },
          relatedItem: assignment._id,
          isRead: false
        };
        
        const newNotification = await NotificationModel.create(notificationData);
        processedNotifications.push(newNotification);
      }
      
      response.success(
        res, 
        {
          checked: closedAssignments.length,
          notificationsCreated: processedNotifications.length
        }, 
        `Berhasil memeriksa ${closedAssignments.length} tugas yang telah ditutup dan membuat ${processedNotifications.length} notifikasi`
      );
    } catch (error) {
      response.error(res, error, "Gagal memeriksa tugas yang telah ditutup");
    }
  }
}; 