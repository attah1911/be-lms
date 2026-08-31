import { Response } from "express";
import { Prisma, SubmissionStatus } from "@prisma/client";
import { IReqUser } from "../utils/interfaces";
import { prisma } from "../utils/prisma";
import { assignmentDAO } from "../validators";
import response from "../utils/response";
import { ROLES } from "../utils/constant";

type SubmissionFile = { fileUrl: string; fileName: string };

// Keep the old response shapes: `materiId` / `mataPelajaranId` as populated
// objects, and each submission carrying a `file` + defaulted `additionalFiles`.
const shapeSubmission = (s: any) => ({
  ...s,
  additionalFiles: s.additionalFiles ?? [],
  file: { url: s.fileUrl, originalName: s.fileName },
});

const shapeAssignment = (a: any) => ({
  ...a,
  ...(a.materi ? { materiId: a.materi } : {}),
  ...(a.mataPelajaran ? { mataPelajaranId: a.mataPelajaran } : {}),
  ...(Array.isArray(a.submissions) ? { submissions: a.submissions.map(shapeSubmission) } : {}),
});

const fullAssignmentInclude = {
  materi: { select: { id: true, judul: true } },
  mataPelajaran: { select: { id: true, judul: true } },
  submissions: {
    include: { student: { select: { id: true, fullName: true, email: true, nis: true, kelas: true } } },
  },
} satisfies Prisma.AssignmentInclude;

/** Ensure the logged-in guru owns the mata pelajaran of this assignment. */
async function assertGuruOwnsAssignment(req: IReqUser, mataPelajaranId: string): Promise<string | null> {
  if (req.user?.role !== ROLES.GURU) return null;
  const [teacher, mataPelajaran] = await Promise.all([
    prisma.teacher.findUnique({ where: { userId: req.user.id } }),
    prisma.mataPelajaran.findUnique({ where: { id: mataPelajaranId } }),
  ]);
  if (!teacher || !mataPelajaran || mataPelajaran.guruId !== teacher.id) {
    return "Anda tidak memiliki akses ke tugas ini";
  }
  return null;
}

export default {
  async create(req: IReqUser, res: Response) {
    try {
      await assignmentDAO.validate(req.body);
      const { title, description, deadline, materiId, mataPelajaranId, attachments } = req.body;

      const [materi, mataPelajaran] = await Promise.all([
        prisma.materiPelajaran.findUnique({ where: { id: materiId } }),
        prisma.mataPelajaran.findUnique({ where: { id: mataPelajaranId } }),
      ]);
      if (!materi) return response.error(res, null, "Data materi tidak ditemukan");
      if (!mataPelajaran) return response.error(res, null, "Data mata pelajaran tidak ditemukan");

      const denied = await assertGuruOwnsAssignment(req, mataPelajaranId);
      if (denied) return response.error(res, null, denied);

      const assignment = await prisma.assignment.create({
        data: {
          title,
          description,
          deadline: new Date(deadline),
          materiId,
          mataPelajaranId,
          attachments: (attachments ?? []) as Prisma.InputJsonValue,
        },
      });

      try {
        const enrollments = await prisma.enrollment.findMany({
          where: { mataPelajaranId },
          select: { studentId: true },
        });
        if (enrollments.length) {
          await prisma.notification.createMany({
            data: enrollments.map((e) => ({
              type: "tugas" as const,
              title: "Tugas Baru",
              description: `Tugas baru "${title}" telah ditambahkan di mata pelajaran "${mataPelajaran.judul}"`,
              mataPelajaranId,
              recipientStudentId: e.studentId,
              relatedAssignmentId: assignment.id,
            })),
          });
        }
      } catch {
        /* notifications are best-effort */
      }

      response.success(res, assignment, "Sukses membuat tugas");
    } catch (error) {
      response.error(res, error, "Gagal membuat tugas");
    }
  },

  async findAll(_req: IReqUser, res: Response) {
    try {
      const rows = await prisma.assignment.findMany({
        include: {
          materi: { select: { id: true, judul: true } },
          mataPelajaran: { select: { id: true, judul: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      response.success(res, rows.map(shapeAssignment), "Sukses mengambil data tugas");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data tugas");
    }
  },

  async findByMateriId(req: IReqUser, res: Response) {
    try {
      const rows = await prisma.assignment.findMany({
        where: { materiId: req.params.materiId },
        include: fullAssignmentInclude,
        orderBy: { createdAt: "desc" },
      });
      response.success(res, rows.map(shapeAssignment), "Sukses mengambil data tugas");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data tugas");
    }
  },

  async findOne(req: IReqUser, res: Response) {
    try {
      const result = await prisma.assignment.findUnique({
        where: { id: req.params.id },
        include: fullAssignmentInclude,
      });
      if (!result) {
        return response.error(res, null, "Data tugas tidak ditemukan", 404);
      }
      response.success(res, shapeAssignment(result), "Sukses mengambil data tugas");
    } catch (error) {
      response.error(res, error, "Gagal mengambil data tugas");
    }
  },

  async update(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      const assignment = await prisma.assignment.findUnique({ where: { id } });
      if (!assignment) {
        return response.error(res, null, "Data tugas tidak ditemukan");
      }

      const denied = await assertGuruOwnsAssignment(req, assignment.mataPelajaranId);
      if (denied) return response.error(res, null, denied);

      const { submissions, attachments, ...updateData } = req.body;
      if (Object.keys(updateData).length > 0) {
        await assignmentDAO.validate(updateData);
      }

      const result = await prisma.assignment.update({
        where: { id },
        data: {
          ...(updateData.title !== undefined ? { title: updateData.title } : {}),
          ...(updateData.description !== undefined ? { description: updateData.description } : {}),
          ...(updateData.deadline !== undefined ? { deadline: new Date(updateData.deadline) } : {}),
          ...(updateData.materiId !== undefined ? { materiId: updateData.materiId } : {}),
          ...(updateData.mataPelajaranId !== undefined
            ? { mataPelajaranId: updateData.mataPelajaranId }
            : {}),
          ...(attachments !== undefined
            ? { attachments: attachments as Prisma.InputJsonValue }
            : {}),
        },
        include: fullAssignmentInclude,
      });

      response.success(res, shapeAssignment(result), "Sukses mengupdate tugas");
    } catch (error) {
      response.error(res, error, "Gagal mengupdate tugas");
    }
  },

  async remove(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;
      const assignment = await prisma.assignment.findUnique({ where: { id } });
      if (!assignment) {
        return response.error(res, null, "Data tugas tidak ditemukan");
      }

      const denied = await assertGuruOwnsAssignment(req, assignment.mataPelajaranId);
      if (denied) return response.error(res, null, denied);

      await prisma.assignment.delete({ where: { id } });
      response.success(res, null, "Sukses menghapus tugas");
    } catch (error) {
      response.error(res, error, "Gagal menghapus tugas");
    }
  },

  async submitAssignment(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      if (req.user?.role !== ROLES.MURID) {
        return response.error(res, null, "Hanya murid yang dapat mengumpulkan tugas", 403);
      }

      let files: SubmissionFile[] = [];
      if (Array.isArray(req.body.files)) {
        files = req.body.files;
      } else if (req.body.fileUrl && req.body.fileName) {
        files = [{ fileUrl: req.body.fileUrl, fileName: req.body.fileName }];
      }

      if (files.length === 0) {
        return response.error(res, null, "File tidak boleh kosong", 400);
      }
      if (files.length > 5) {
        return response.error(res, null, "Maksimal 5 file yang dapat diunggah", 400);
      }

      const assignment = await prisma.assignment.findUnique({ where: { id } });
      if (!assignment) {
        return response.error(res, null, "Data tugas tidak ditemukan", 404);
      }
      if (assignment.deadline < new Date()) {
        return response.error(res, null, "Tenggat waktu pengumpulan tugas telah berakhir", 400);
      }

      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (!student) {
        return response.error(res, null, "Data murid tidak ditemukan", 404);
      }

      const [main, ...rest] = files;
      const additionalFiles = rest.map((f) => ({
        fileUrl: f.fileUrl,
        fileName: f.fileName,
      })) as unknown as Prisma.InputJsonValue;

      const submission = await prisma.submission.upsert({
        where: { assignmentId_studentId: { assignmentId: id, studentId: student.id } },
        create: {
          assignmentId: id,
          studentId: student.id,
          fileUrl: main.fileUrl,
          fileName: main.fileName,
          additionalFiles,
          status: SubmissionStatus.submitted,
        },
        update: {
          fileUrl: main.fileUrl,
          fileName: main.fileName,
          additionalFiles,
          status: SubmissionStatus.submitted,
          submittedAt: new Date(),
        },
      });

      try {
        const mataPelajaran = await prisma.mataPelajaran.findUnique({
          where: { id: assignment.mataPelajaranId },
        });
        if (mataPelajaran) {
          await prisma.notification.create({
            data: {
              type: "submission",
              title: "Pengumpulan Tugas Baru",
              description: `${student.fullName} telah mengumpulkan tugas "${assignment.title}"`,
              mataPelajaranId: assignment.mataPelajaranId,
              recipientTeacherId: mataPelajaran.guruId,
              relatedAssignmentId: assignment.id,
            },
          });
        }
      } catch {
        /* best-effort */
      }

      const updatedAssignment = await prisma.assignment.findUnique({
        where: { id },
        include: fullAssignmentInclude,
      });

      response.success(
        res,
        { assignment: shapeAssignment(updatedAssignment), submission: shapeSubmission(submission) },
        "Sukses mengumpulkan tugas"
      );
    } catch (error) {
      response.error(res, error, "Gagal mengumpulkan tugas");
    }
  },

  async updateSubmissionStatus(req: IReqUser, res: Response) {
    try {
      const { id, submissionId } = req.params;
      const { status, feedback } = req.body;

      if (!Object.values(SubmissionStatus).includes(status)) {
        return response.error(res, null, "Status tidak valid");
      }

      const assignment = await prisma.assignment.findUnique({ where: { id } });
      if (!assignment) {
        return response.error(res, null, "Data tugas tidak ditemukan");
      }

      const denied = await assertGuruOwnsAssignment(req, assignment.mataPelajaranId);
      if (denied) return response.error(res, null, denied);

      const submission = await prisma.submission.findFirst({
        where: { id: submissionId, assignmentId: id },
      });
      if (!submission) {
        return response.error(res, null, "Data pengumpulan tugas tidak ditemukan");
      }

      await prisma.submission.update({
        where: { id: submissionId },
        data: { status, ...(feedback !== undefined ? { feedback } : {}) },
      });

      const result = await prisma.assignment.findUnique({
        where: { id },
        include: fullAssignmentInclude,
      });
      response.success(res, shapeAssignment(result), "Sukses mengupdate status pengumpulan tugas");
    } catch (error) {
      response.error(res, error, "Gagal mengupdate status pengumpulan tugas");
    }
  },

  async updateSubmissionScore(req: IReqUser, res: Response) {
    try {
      const { id, submissionId } = req.params;
      const { score } = req.body;

      if (score === undefined || score < 0 || score > 100) {
        return response.error(res, null, "Nilai tidak valid. Harus berupa angka antara 0-100");
      }

      const assignment = await prisma.assignment.findUnique({ where: { id } });
      if (!assignment) {
        return response.error(res, null, "Data tugas tidak ditemukan");
      }

      const denied = await assertGuruOwnsAssignment(req, assignment.mataPelajaranId);
      if (denied) return response.error(res, null, denied);

      const submission = await prisma.submission.findFirst({
        where: { id: submissionId, assignmentId: id },
      });
      if (!submission) {
        return response.error(res, null, "Data pengumpulan tugas tidak ditemukan");
      }

      await prisma.submission.update({
        where: { id: submissionId },
        data: { score, status: SubmissionStatus.reviewed },
      });

      try {
        const teacher = await prisma.teacher.findUnique({ where: { userId: req.user?.id } });
        if (teacher) {
          const ungraded = await prisma.submission.count({
            where: { assignmentId: id, status: SubmissionStatus.submitted, score: null },
          });
          if (ungraded > 0) {
            const existing = await prisma.notification.findFirst({
              where: {
                recipientTeacherId: teacher.id,
                type: "grading_reminder",
                relatedAssignmentId: id,
                isRead: false,
              },
            });
            if (!existing) {
              await prisma.notification.create({
                data: {
                  type: "grading_reminder",
                  title: "Pengingat Penilaian",
                  description: `Anda masih memiliki ${ungraded} tugas yang belum dinilai untuk "${assignment.title}"`,
                  mataPelajaranId: assignment.mataPelajaranId,
                  recipientTeacherId: teacher.id,
                  relatedAssignmentId: id,
                },
              });
            }
          }
        }
      } catch {
        /* best-effort */
      }

      const result = await prisma.assignment.findUnique({
        where: { id },
        include: fullAssignmentInclude,
      });
      response.success(res, shapeAssignment(result), "Sukses mengupdate nilai tugas");
    } catch (error) {
      response.error(res, error, "Gagal mengupdate nilai tugas");
    }
  },

  async deleteSubmission(req: IReqUser, res: Response) {
    try {
      const { id, submissionId } = req.params;

      const assignment = await prisma.assignment.findUnique({ where: { id } });
      if (!assignment) {
        return response.error(res, null, "Data tugas tidak ditemukan");
      }

      const submission = await prisma.submission.findFirst({
        where: { id: submissionId, assignmentId: id },
      });
      if (!submission) {
        return response.error(res, null, "Data pengumpulan tugas tidak ditemukan");
      }

      if (req.user?.role === ROLES.MURID) {
        const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
        if (!student) {
          return response.error(res, null, "Data murid tidak ditemukan");
        }
        if (submission.studentId !== student.id) {
          return response.error(
            res,
            null,
            "Anda hanya dapat menghapus pengumpulan tugas Anda sendiri"
          );
        }
        if (assignment.deadline < new Date()) {
          return response.error(res, null, "Batas waktu pengumpulan telah berakhir");
        }
        if (submission.status !== SubmissionStatus.submitted) {
          return response.error(
            res,
            null,
            "Pengumpulan tugas yang sudah dinilai tidak dapat dihapus"
          );
        }
      } else {
        const denied = await assertGuruOwnsAssignment(req, assignment.mataPelajaranId);
        if (denied) return response.error(res, null, denied);
      }

      await prisma.submission.delete({ where: { id: submissionId } });

      const updatedAssignment = await prisma.assignment.findUnique({
        where: { id },
        include: fullAssignmentInclude,
      });
      response.success(
        res,
        { deletedSubmission: shapeSubmission(submission), assignment: shapeAssignment(updatedAssignment) },
        "Sukses menghapus pengumpulan tugas"
      );
    } catch (error) {
      response.error(res, error, "Gagal menghapus pengumpulan tugas");
    }
  },

  async checkClosedAssignments(_req: IReqUser, res: Response) {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const closed = await prisma.assignment.findMany({
        where: { deadline: { lt: now, gte: oneDayAgo } },
        include: {
          mataPelajaran: { select: { id: true, judul: true, guruId: true } },
          submissions: { select: { status: true, score: true } },
        },
      });

      let notificationsCreated = 0;
      for (const assignment of closed) {
        const toGrade = assignment.submissions.filter(
          (s) => s.status === SubmissionStatus.submitted && s.score == null
        );
        if (toGrade.length === 0 || !assignment.mataPelajaran) continue;

        const existing = await prisma.notification.findFirst({
          where: {
            recipientTeacherId: assignment.mataPelajaran.guruId,
            type: "grading_reminder",
            relatedAssignmentId: assignment.id,
            isRead: false,
            createdAt: { gte: oneDayAgo },
          },
        });
        if (existing) continue;

        await prisma.notification.create({
          data: {
            type: "grading_reminder",
            title: "Pengingat Penilaian Tugas",
            description: `Batas waktu pengumpulan tugas "${assignment.title}" telah berakhir. Terdapat ${toGrade.length} tugas yang perlu dinilai.`,
            mataPelajaranId: assignment.mataPelajaran.id,
            recipientTeacherId: assignment.mataPelajaran.guruId,
            relatedAssignmentId: assignment.id,
          },
        });
        notificationsCreated += 1;
      }

      response.success(
        res,
        { checked: closed.length, notificationsCreated },
        `Berhasil memeriksa ${closed.length} tugas yang telah ditutup dan membuat ${notificationsCreated} notifikasi`
      );
    } catch (error) {
      response.error(res, error, "Gagal memeriksa tugas yang telah ditutup");
    }
  },
};
