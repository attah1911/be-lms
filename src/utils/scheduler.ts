import mongoose from 'mongoose';
import AssignmentModel, { SubmissionStatus } from '../models/assignment.model';
import NotificationModel from '../models/notification.model';
import { logger } from './logger';

// Function to check for closed assignments and send notifications to teachers
export async function checkClosedAssignments() {
  try {
    logger.info('Scheduler: Checking for closed assignments...');
    
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
    
    logger.info(`Found ${closedAssignments.length} closed assignments in the last 24 hours`);
    
    // Process each closed assignment
    const processedNotifications = [];
    for (const assignment of closedAssignments) {
      // Only process if there are submissions to grade
      const submissionsToGrade = assignment.submissions.filter(
        sub => sub.status === SubmissionStatus.SUBMITTED && !sub.score
      );
      
      if (submissionsToGrade.length === 0) {
        logger.info(`Assignment ${assignment._id}: No submissions to grade`);
        continue;
      }
      
      if (!assignment.mataPelajaranId) {
        logger.info(`Assignment ${assignment._id}: No mata pelajaran associated`);
        continue;
      }
      
      if (!assignment.mataPelajaranId.guru) {
        logger.info(`Assignment ${assignment._id}: No guru associated with mata pelajaran`);
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
        logger.info(`Assignment ${assignment._id}: Notification already exists`);
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
      logger.info(`Created notification for teacher about closed assignment ${assignment._id}`);
    }
    
    logger.info(`Finished processing assignments: created ${processedNotifications.length} notifications`);
    return {
      checked: closedAssignments.length,
      notificationsCreated: processedNotifications.length
    };
  } catch (error) {
    logger.error('Error checking closed assignments:', error);
    throw error;
  }
}

// Initialize scheduler
export function initScheduler() {
  // Schedule the job to run every hour
  const ONE_HOUR = 60 * 60 * 1000;
  
  logger.info('Initializing scheduler...');
  
  // Run the job immediately on startup
  checkClosedAssignments().catch(err => {
    logger.error('Error running scheduled job checkClosedAssignments:', err);
  });
  
  // Then schedule it to run every hour
  setInterval(() => {
    checkClosedAssignments().catch(err => {
      logger.error('Error running scheduled job checkClosedAssignments:', err);
    });
  }, ONE_HOUR);
  
  logger.info('Scheduler initialized successfully');
}

export default {
  initScheduler,
  checkClosedAssignments
}; 