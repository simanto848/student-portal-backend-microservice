import cron from 'node-cron';
import BookTakenHistory from '../models/BookTakenHistory.js';
import emailService from '../utils/emailService.js';
import userServiceClient from '../clients/userServiceClient.js';
import borrowingService from './borrowingService.js';
import reservationService from './reservationService.js';
import notificationServiceClient from '../clients/notificationServiceClient.js';

class NotificationService {
    constructor() {
        this.emailSentLog = new Map();
    }

    async sendDueReminders() {
        try {
            console.log('Checking for books due for reminder emails...');

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 7-Day Reminder Window: Due in 4 to 8 days (covers the "7 days" target plus buffer)
            const sevenDayStart = new Date(today);
            sevenDayStart.setDate(sevenDayStart.getDate() + 4);
            const sevenDayEnd = new Date(today);
            sevenDayEnd.setDate(sevenDayEnd.getDate() + 8);
            sevenDayEnd.setHours(23, 59, 59, 999);

            // 2-Day Reminder Window: Due in 0 to 3 days (covers "2 days" target plus buffer/catch-up)
            const twoDayStart = new Date(today);
            const twoDayEnd = new Date(today);
            twoDayEnd.setDate(twoDayEnd.getDate() + 3);
            twoDayEnd.setHours(23, 59, 59, 999);

            // Get borrowings needing 7-day reminder
            // Logic: Due within window AND flag is false
            const sevenDayReminders = await BookTakenHistory.find({
                status: 'borrowed',
                dueDate: { $gte: sevenDayStart, $lte: sevenDayEnd },
                sevenDayWarningSent: { $ne: true },
                deletedAt: null
            })
                .populate({
                    path: 'copyId',
                    populate: { path: 'bookId', select: 'title author' }
                })
                .populate('libraryId', 'name finePerDay')
                .lean();

            // Get borrowings needing 2-day reminder
            // Logic: Due within window AND flag is false
            const twoDayReminders = await BookTakenHistory.find({
                status: 'borrowed',
                dueDate: { $gte: twoDayStart, $lte: twoDayEnd },
                twoDayWarningSent: { $ne: true },
                deletedAt: null
            })
                .populate({
                    path: 'copyId',
                    populate: { path: 'bookId', select: 'title author' }
                })
                .populate('libraryId', 'name finePerDay')
                .lean();

            let emailsSent = 0;
            let emailsFailed = 0;

            // Send 7-day reminders
            for (const borrowing of sevenDayReminders) {
                let emailSuccess = false;
                let notificationSuccess = false;

                // Get user details once
                let userData;
                try {
                    const user = await userServiceClient.getUserById(borrowing.borrowerId);
                    userData = user.data || user;
                } catch (err) {
                    console.error(`Failed to fetch user ${borrowing.borrowerId}:`, err.message);
                    continue;
                }

                // 1. Try Sending Email
                try {
                    await emailService.sendOverdueReminder(userData.email, {
                        userName: userData.fullName || userData.name || 'Student',
                        userEmail: userData.email,
                        bookTitle: borrowing.copyId.bookId.title,
                        author: borrowing.copyId.bookId.author,
                        dueDate: borrowing.dueDate,
                        daysUntilDue: 7,
                        finePerDay: borrowing.libraryId.finePerDay
                    });
                    emailSuccess = true;
                    emailsSent++;
                    console.log(`Sent 7-day reminder to ${userData.email} for book: ${borrowing.copyId.bookId.title}`);
                } catch (error) {
                    emailsFailed++;
                    console.error(`Failed to send 7-day reminder email for ${borrowing.id || borrowing._id}:`, error.message);
                }

                // 2. Try Sending App Notification
                try {
                    await notificationServiceClient.sendDueReminder(borrowing.borrowerId, {
                        bookTitle: borrowing.copyId.bookId.title,
                        author: borrowing.copyId.bookId.author,
                        daysUntilDue: 7
                    });
                    notificationSuccess = true;
                    console.log(`Sent 7-day app notification to ${borrowing.borrowerId}`);
                } catch (error) {
                    console.error(`Failed to send 7-day app notification for ${borrowing.id || borrowing._id}:`, error.message);
                }

                // Update Flag if AT LEAST ONE succeeded (or maybe simply if we attempted? 
                // User requirement: "if not sent... it should sent". If we tried and failed, maybe we should retry?
                // But preventing spam loop is key. Let's update flag if we made a solid attempt.
                // Given the rate limit error, we DO want to suppressing the flag update so it retries? 
                // NO, if we suppress flag, it will retry forever and hit rate limit forever.
                // Better to update flag. 

                if (emailSuccess || notificationSuccess) {
                    await BookTakenHistory.updateOne({ _id: borrowing._id }, { sevenDayWarningSent: true });
                }
            }

            // Send 2-day reminders
            for (const borrowing of twoDayReminders) {
                let emailSuccess = false;
                let notificationSuccess = false;

                let userData;
                try {
                    const user = await userServiceClient.getUserById(borrowing.borrowerId);
                    userData = user.data || user;
                } catch (err) {
                    console.error(`Failed to fetch user ${borrowing.borrowerId}:`, err.message);
                    continue;
                }

                try {
                    await emailService.sendOverdueReminder(userData.email, {
                        userName: userData.fullName || userData.name || 'Student',
                        userEmail: userData.email,
                        bookTitle: borrowing.copyId.bookId.title,
                        author: borrowing.copyId.bookId.author,
                        dueDate: borrowing.dueDate,
                        daysUntilDue: 2,
                        finePerDay: borrowing.libraryId.finePerDay
                    });
                    emailSuccess = true;
                    emailsSent++;
                    console.log(`Sent 2-day reminder to ${userData.email} for book: ${borrowing.copyId.bookId.title}`);
                } catch (error) {
                    emailsFailed++;
                    console.error(`Failed to send 2-day reminder email for ${borrowing.id || borrowing._id}:`, error.message);
                }

                try {
                    await notificationServiceClient.sendDueReminder(borrowing.borrowerId, {
                        bookTitle: borrowing.copyId.bookId.title,
                        author: borrowing.copyId.bookId.author,
                        daysUntilDue: 2
                    });
                    notificationSuccess = true;
                    console.log(`Sent 2-day app notification to ${borrowing.borrowerId}`);
                } catch (error) {
                    console.error(`Failed to send 2-day app notification for ${borrowing.id || borrowing._id}:`, error.message);
                }

                if (emailSuccess || notificationSuccess) {
                    await BookTakenHistory.updateOne({ _id: borrowing._id }, { twoDayWarningSent: true });
                }
            }

            console.log(`Reminder emails sent: ${emailsSent}, failed: ${emailsFailed}`);
            return { emailsSent, emailsFailed };
        } catch (error) {
            console.error('Error in sendDueReminders:', error);
            throw error;
        }
    }

    async sendOverdueNotices() {
        try {
            console.log('Checking for overdue books...');

            const today = new Date();

            // Find overdue books
            const overdueBorrowings = await BookTakenHistory.find({
                status: 'overdue',
                finePaid: false,
                deletedAt: null
            })
                .populate({
                    path: 'copyId',
                    populate: { path: 'bookId', select: 'title author' }
                })
                .populate('libraryId', 'name finePerDay')
                .lean();

            let emailsSent = 0;
            let emailsFailed = 0;

            for (const borrowing of overdueBorrowings) {
                const dueDate = new Date(borrowing.dueDate);
                const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
                const totalFine = daysOverdue * borrowing.libraryId.finePerDay;

                // Check if we should send notice (if never sent, or if sent > 7 days ago)
                let shouldSend = false;
                if (!borrowing.lastOverdueNoticeSent) {
                    shouldSend = true;
                } else {
                    const lastSent = new Date(borrowing.lastOverdueNoticeSent);
                    const daysSinceLastNotice = Math.ceil((today - lastSent) / (1000 * 60 * 60 * 24));
                    if (daysSinceLastNotice >= 7) {
                        shouldSend = true;
                    }
                }

                if (!shouldSend) continue;

                try {
                    // Get user details
                    const user = await userServiceClient.getUserById(borrowing.borrowerId);
                    const userData = user.data || user;

                    await emailService.sendBookOverdueNotice(userData.email, {
                        userName: userData.fullName || userData.name || 'Student',
                        userEmail: userData.email,
                        bookTitle: borrowing.copyId.bookId.title,
                        author: borrowing.copyId.bookId.author,
                        dueDate: borrowing.dueDate,
                        daysOverdue,
                        totalFine
                    });

                    // Update DB Flag
                    await BookTakenHistory.updateOne({ _id: borrowing._id }, { lastOverdueNoticeSent: new Date() });

                    emailsSent++;
                    console.log(`Sent overdue notice to ${userData.email} for book: ${borrowing.copyId.bookId.title}`);
                } catch (error) {
                    emailsFailed++;
                    console.error(`Failed to send overdue notice for borrowing ${borrowing.id || borrowing._id}:`, error.message);
                }
            }

            console.log(`Overdue notices sent: ${emailsSent}, failed: ${emailsFailed}`);
            return { emailsSent, emailsFailed };
        } catch (error) {
            console.error('Error in sendOverdueNotices:', error);
            throw error;
        }
    }

    startScheduledJobs() {
        // Run at 9:00 AM every day
        cron.schedule('0 9 * * *', async () => {
            console.log('Running scheduled reminder emails job...');
            try {
                // Ensure overdue status is up to date before sending notices
                await borrowingService.checkAndUpdateOverdueBooks();
                await reservationService.checkAndExpireReservations();

                await this.sendDueReminders();
                await this.sendOverdueNotices();
            } catch (error) {
                console.error('Error in scheduled job:', error);
            }
        });

        console.log('Scheduled jobs started: Daily reminders at 9:00 AM');
    }
}

export default new NotificationService();