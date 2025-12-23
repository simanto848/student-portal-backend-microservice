import cron from 'node-cron';
import BookTakenHistory from '../models/BookTakenHistory.js';
import emailService from '../utils/emailService.js';
import userServiceClient from '../clients/userServiceClient.js';
import borrowingService from './borrowingService.js';

class NotificationService {
    constructor() {
        this.emailSentLog = new Map();
    }

    async sendDueReminders() {
        try {
            console.log('Checking for books due for reminder emails...');

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Find books due in 7 days
            const oneWeekFromNow = new Date(today);
            oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
            const oneWeekEnd = new Date(oneWeekFromNow);
            oneWeekEnd.setHours(23, 59, 59, 999);

            // Find books due in 2 days
            const twoDaysFromNow = new Date(today);
            twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
            const twoDaysEnd = new Date(twoDaysFromNow);
            twoDaysEnd.setHours(23, 59, 59, 999);

            // Get borrowings due in 7 days
            const sevenDayReminders = await BookTakenHistory.find({
                status: 'borrowed',
                dueDate: { $gte: oneWeekFromNow, $lte: oneWeekEnd },
                deletedAt: null
            })
                .populate('bookId', 'title author')
                .populate('libraryId', 'name finePerDay')
                .lean();

            // Get borrowings due in 2 days
            const twoDayReminders = await BookTakenHistory.find({
                status: 'borrowed',
                dueDate: { $gte: twoDaysFromNow, $lte: twoDaysEnd },
                deletedAt: null
            })
                .populate('bookId', 'title author')
                .populate('libraryId', 'name finePerDay')
                .lean();

            let emailsSent = 0;
            let emailsFailed = 0;

            // Send 7-day reminders
            for (const borrowing of sevenDayReminders) {
                const logKey = `${borrowing.id || borrowing._id}-7days`;
                if (this.emailSentLog.has(logKey)) {
                    continue; // Already sent today
                }

                try {
                    // Get user details
                    const user = await userServiceClient.getUserById(borrowing.borrowerId);
                    const userData = user.data || user;

                    await emailService.sendOverdueReminder(userData.email, {
                        userName: userData.fullName || userData.name || 'Student',
                        userEmail: userData.email,
                        bookTitle: borrowing.bookId.title,
                        author: borrowing.bookId.author,
                        dueDate: borrowing.dueDate,
                        daysUntilDue: 7,
                        finePerDay: borrowing.libraryId.finePerDay
                    });

                    this.emailSentLog.set(logKey, today);
                    emailsSent++;
                    console.log(`Sent 7-day reminder to ${userData.email} for book: ${borrowing.bookId.title}`);
                } catch (error) {
                    emailsFailed++;
                    console.error(`Failed to send 7-day reminder for borrowing ${borrowing.id || borrowing._id}:`, error.message);
                }
            }

            // Send 2-day reminders
            for (const borrowing of twoDayReminders) {
                const logKey = `${borrowing.id || borrowing._id}-2days`;
                if (this.emailSentLog.has(logKey)) {
                    continue; // Already sent today
                }

                try {
                    // Get user details
                    const user = await userServiceClient.getUserById(borrowing.borrowerId);
                    const userData = user.data || user;

                    await emailService.sendOverdueReminder(userData.email, {
                        userName: userData.fullName || userData.name || 'Student',
                        userEmail: userData.email,
                        bookTitle: borrowing.bookId.title,
                        author: borrowing.bookId.author,
                        dueDate: borrowing.dueDate,
                        daysUntilDue: 2,
                        finePerDay: borrowing.libraryId.finePerDay
                    });

                    this.emailSentLog.set(logKey, today);
                    emailsSent++;
                    console.log(`Sent 2-day reminder to ${userData.email} for book: ${borrowing.bookId.title}`);
                } catch (error) {
                    emailsFailed++;
                    console.error(`Failed to send 2-day reminder for borrowing ${borrowing.id || borrowing._id}:`, error.message);
                }
            }

            // Clean up old entries in emailSentLog (keep only last 30 days)
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            for (const [key, date] of this.emailSentLog.entries()) {
                if (date < thirtyDaysAgo) {
                    this.emailSentLog.delete(key);
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
            today.setHours(0, 0, 0, 0);

            // Find overdue books
            const overdueBorrowings = await BookTakenHistory.find({
                status: 'overdue',
                finePaid: false,
                deletedAt: null
            })
                .populate('bookId', 'title author')
                .populate('libraryId', 'name finePerDay')
                .lean();

            let emailsSent = 0;
            let emailsFailed = 0;

            for (const borrowing of overdueBorrowings) {
                const dueDate = new Date(borrowing.dueDate);
                const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
                const totalFine = daysOverdue * borrowing.libraryId.finePerDay;

                // Send overdue notice every 7 days
                const logKey = `${borrowing.id || borrowing._id}-overdue-${Math.floor(daysOverdue / 7)}`;
                if (this.emailSentLog.has(logKey)) {
                    continue; // Already sent for this week
                }

                try {
                    // Get user details
                    const user = await userServiceClient.getUserById(borrowing.borrowerId);
                    const userData = user.data || user;

                    await emailService.sendBookOverdueNotice(userData.email, {
                        userName: userData.fullName || userData.name || 'Student',
                        userEmail: userData.email,
                        bookTitle: borrowing.bookId.title,
                        author: borrowing.bookId.author,
                        dueDate: borrowing.dueDate,
                        daysOverdue,
                        totalFine
                    });

                    this.emailSentLog.set(logKey, today);
                    emailsSent++;
                    console.log(`Sent overdue notice to ${userData.email} for book: ${borrowing.bookId.title}`);
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