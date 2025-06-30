import { Router } from "express";
import authController from "../controllers/auth.controller";
import authMiddleware from "../middlewares/auth.middleware";
import aclMiddleware from "../middlewares/acl.middleware";
import { ROLES } from "../utils/constant";
import mataPelajaranController from "../controllers/mataPelajaran.controller";
import materiPelajaranController from "../controllers/materiPelajaran.controller";
import teachersController from "../controllers/teachers.controller";
import studentsController from "../controllers/students.controller";
import usersController from "../controllers/users.controller";
import mediaMiddleware from "../middlewares/media.middleware";
import mediaController from "../controllers/media.controller";
import statsController from "../controllers/stats.controller";
import assignmentController from "../controllers/assignment.controller";
import todoController from "../controllers/todo.controller";
import notificationController from "../controllers/notification.controller";

const router = Router();

// Auth Routes
router.post("/auth/register", authController.register);
router.post("/auth/resend-activation", authController.resendActivation);
router.post("/auth/activation", authController.activation);
router.post("/auth/login", authController.login);
router.get("/auth/me", authMiddleware, authController.me);
router.put("/auth/me", authMiddleware, authController.updateProfile);
router.post("/auth/change-password", authMiddleware, authController.changePassword);
router.post("/auth/submit-student-data", authController.submitStudentData);
router.get("/auth/student-data", authController.getStudentData); // Add new endpoint

// Admin Routes
router.post("/users", authMiddleware, aclMiddleware([ROLES.ADMIN]), usersController.create);
router.get("/users", authMiddleware, aclMiddleware([ROLES.ADMIN]), usersController.findAll);
router.get("/users/:id", authMiddleware, aclMiddleware([ROLES.ADMIN]), usersController.findOne);
router.put("/users/:id", authMiddleware, aclMiddleware([ROLES.ADMIN]), usersController.update);
router.delete("/users/:id", authMiddleware, aclMiddleware([ROLES.ADMIN]), usersController.remove);

// Teacher Routes
// GURU-specific routes - these MUST come before parametric routes to avoid conflicts
router.get("/teachers/me", authMiddleware, aclMiddleware([ROLES.GURU]), teachersController.getTeacherProfile);
router.put("/teachers/me", authMiddleware, aclMiddleware([ROLES.GURU]), teachersController.updateTeacherProfile);

// Admin routes for teacher management
router.post("/teachers", authMiddleware, aclMiddleware([ROLES.ADMIN]), teachersController.create);
router.get("/teachers", authMiddleware, aclMiddleware([ROLES.ADMIN]), teachersController.findAll);
router.get("/teachers/:id", authMiddleware, aclMiddleware([ROLES.ADMIN]), teachersController.findOne);
router.put("/teachers/:id", authMiddleware, aclMiddleware([ROLES.ADMIN]), teachersController.update);
router.delete("/teachers/:id", authMiddleware, aclMiddleware([ROLES.ADMIN]), teachersController.remove);

// Student Routes
// MURID-specific routes - these MUST come before parametric routes to avoid conflicts
router.get("/students/me", authMiddleware, aclMiddleware([ROLES.MURID]), studentsController.getStudentProfile);
router.put("/students/me", authMiddleware, aclMiddleware([ROLES.MURID]), studentsController.updateStudentProfile);
router.get("/students/me/mata-pelajaran", authMiddleware, aclMiddleware([ROLES.MURID]), studentsController.getMyEnrolledMataPelajaran);
router.get("/students/me/assignments", authMiddleware, aclMiddleware([ROLES.MURID]), studentsController.getMyAssignments);
router.put("/students/me/assignments/:id/completion", authMiddleware, aclMiddleware([ROLES.MURID]), studentsController.markAssignmentCompletion);

// Admin routes for student management
router.post("/students", authMiddleware, aclMiddleware([ROLES.ADMIN]), studentsController.create);
router.get("/students", authMiddleware, aclMiddleware([ROLES.ADMIN]), studentsController.findAll);
router.get("/students/:id", authMiddleware, aclMiddleware([ROLES.ADMIN]), studentsController.findOne);
router.put("/students/:id", authMiddleware, aclMiddleware([ROLES.ADMIN]), studentsController.update);
router.delete("/students/:id", authMiddleware, aclMiddleware([ROLES.ADMIN]), studentsController.remove);

// Student Enrollment Routes - Get mata pelajaran enrolled by a student
router.get("/students/:id/mata-pelajaran", authMiddleware, aclMiddleware([ROLES.ADMIN, ROLES.GURU, ROLES.MURID]), studentsController.getEnrolledMataPelajaran);

// Student Assignments Routes
router.get("/students/:id/assignments", authMiddleware, aclMiddleware([ROLES.ADMIN, ROLES.GURU, ROLES.MURID]), studentsController.getStudentAssignments);

// Mata Pelajaran Routes
router.post("/mata-pelajaran", authMiddleware, aclMiddleware([ROLES.ADMIN, ROLES.GURU]), mataPelajaranController.create);
router.get("/mata-pelajaran", authMiddleware, mataPelajaranController.findAll);
router.get("/mata-pelajaran/:id", authMiddleware, mataPelajaranController.findOne);
router.put("/mata-pelajaran/:id", authMiddleware, aclMiddleware([ROLES.ADMIN, ROLES.GURU]), mataPelajaranController.update);
router.delete("/mata-pelajaran/:id", authMiddleware, aclMiddleware([ROLES.ADMIN, ROLES.GURU]), mataPelajaranController.remove);

// Student Enrollment Routes
router.get("/mata-pelajaran/:id/students", authMiddleware, mataPelajaranController.getEnrolledStudents);
router.post("/mata-pelajaran/:id/enroll/:studentId", authMiddleware, aclMiddleware([ROLES.ADMIN, ROLES.MURID]), mataPelajaranController.enrollStudent);
router.post("/mata-pelajaran/:id/self-enroll", authMiddleware, aclMiddleware([ROLES.MURID]), mataPelajaranController.selfEnrollStudent);
router.delete("/mata-pelajaran/:id/unenroll/:studentId", authMiddleware, aclMiddleware([ROLES.ADMIN]), mataPelajaranController.unenrollStudent);

// Guru-specific Routes
router.get("/guru/mata-pelajaran", authMiddleware, aclMiddleware([ROLES.GURU]), mataPelajaranController.findAllForGuru);

// Todo Routes
router.post("/todos", authMiddleware, todoController.create);
router.get("/todos", authMiddleware, todoController.findAll);
router.get("/todos/:id", authMiddleware, todoController.findOne);
router.put("/todos/:id", authMiddleware, todoController.update);
router.delete("/todos/:id", authMiddleware, todoController.remove);
router.patch("/todos/:id/toggle", authMiddleware, todoController.toggleCompleted);

// Materi Pelajaran Routes
router.post("/materi-pelajaran", authMiddleware, aclMiddleware([ROLES.GURU]), materiPelajaranController.create);
router.get("/materi-pelajaran", authMiddleware, materiPelajaranController.findAll);
router.get("/materi-pelajaran/:id", authMiddleware, materiPelajaranController.findOne);
router.put("/materi-pelajaran/:id", authMiddleware, aclMiddleware([ROLES.GURU]), materiPelajaranController.update);
router.delete("/materi-pelajaran/:id", authMiddleware, aclMiddleware([ROLES.GURU]), materiPelajaranController.remove);

// Add new route for creating materials for a specific mata pelajaran
router.post("/mata-pelajaran/:mataPelajaranId/materi", authMiddleware, aclMiddleware([ROLES.ADMIN, ROLES.GURU]), materiPelajaranController.create);
// Add new route for getting materials for a specific mata pelajaran 
router.get("/mata-pelajaran/:mataPelajaranId/materi", authMiddleware, materiPelajaranController.findAll);
// Add new route for getting a single material by ID
router.get("/materi-pelajaran/:materiPelajaranId/materi/:id", authMiddleware, materiPelajaranController.findOne);
// Add new route for updating a material
router.put("/materi-pelajaran/:materiPelajaranId/materi/:id", authMiddleware, aclMiddleware([ROLES.ADMIN, ROLES.GURU]), materiPelajaranController.update);
// Add new route for deleting a material
router.delete("/materi-pelajaran/:materiPelajaranId/materi/:id", authMiddleware, aclMiddleware([ROLES.ADMIN, ROLES.GURU]), materiPelajaranController.remove);

// Assignment routes
router.post("/assignments", authMiddleware, aclMiddleware([ROLES.GURU, ROLES.ADMIN]), assignmentController.create);
router.get("/assignments", authMiddleware, assignmentController.findAll);
router.get("/assignments/:id", authMiddleware, assignmentController.findOne);
router.put("/assignments/:id", authMiddleware, aclMiddleware([ROLES.GURU, ROLES.ADMIN]), assignmentController.update);
router.delete("/assignments/:id", authMiddleware, aclMiddleware([ROLES.GURU, ROLES.ADMIN]), assignmentController.remove);

// Get assignments for a specific material
router.get("/assignments/materi/:materiId", authMiddleware, assignmentController.findByMateriId);

// Student submission
router.post("/assignments/:id/submit", authMiddleware, aclMiddleware([ROLES.MURID, ROLES.ADMIN, ROLES.GURU]), assignmentController.submitAssignment);

// Update submission status (for teachers/admins)
router.put("/assignments/:id/submissions/:submissionId", 
  authMiddleware, 
  aclMiddleware([ROLES.ADMIN, ROLES.GURU]), 
  assignmentController.updateSubmissionStatus
);

// Update submission score (for teachers/admins)
router.put("/assignments/:id/submissions/:submissionId/score", 
  authMiddleware, 
  aclMiddleware([ROLES.ADMIN, ROLES.GURU]), 
  assignmentController.updateSubmissionScore
);

// Delete submission (for teachers/admins and students for their own submissions)
router.delete("/assignments/:id/submissions/:submissionId", 
  authMiddleware, 
  assignmentController.deleteSubmission
);

// Check closed assignments and create notifications
router.get("/assignments/check-closed", authMiddleware, aclMiddleware([ROLES.ADMIN]), assignmentController.checkClosedAssignments);

// Notification routes
router.get("/notifications", authMiddleware, aclMiddleware([ROLES.MURID]), notificationController.getMyNotifications);
router.get("/notifications/teacher", authMiddleware, aclMiddleware([ROLES.GURU]), notificationController.getTeacherNotifications);
router.get("/notifications/teacher/debug", authMiddleware, aclMiddleware([ROLES.GURU]), notificationController.debugTeacherNotifications);
router.get("/notifications/unread/count", authMiddleware, notificationController.getUnreadNotificationsCount);
router.put("/notifications/:id/read", authMiddleware, notificationController.markAsRead);
router.put("/notifications/read/all", authMiddleware, notificationController.markAllAsRead);
router.post("/notifications", authMiddleware, aclMiddleware([ROLES.ADMIN, ROLES.GURU]), notificationController.createNotification);
router.post("/notifications/test", authMiddleware, notificationController.createTestNotification);
router.delete("/notifications/:id", authMiddleware, aclMiddleware([ROLES.ADMIN, ROLES.GURU]), notificationController.deleteNotification);

// Media Routes
router.post("/media/single", authMiddleware, mediaMiddleware.single("file"), mediaController.single);
router.post("/media/multiple", authMiddleware, mediaMiddleware.multiple("files"), mediaController.multiple);
router.delete("/media", authMiddleware, mediaController.remove);

// Dashboard Stats Routes
router.get("/stats/dashboard", authMiddleware, aclMiddleware([ROLES.ADMIN]), statsController.dashboardStats);
router.get("/stats/guru/dashboard", authMiddleware, aclMiddleware([ROLES.GURU]), statsController.guruDashboardStats);

export default router;
