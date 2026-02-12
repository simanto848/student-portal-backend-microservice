import cron from 'node-cron';
import BookTakenHistory from '../models/BookTakenHistory.js';
import emailService from '../utils/emailService.js';
import userServiceClient from '../clients/userServiceClient.js';
import borrowingService from './borrowingService.js';
import reservationService from './reservationService.js';
import notificationServiceClient from '../clients/notificationServiceClient.js';

class NotificationService {
    async sendDueReminders() {
        try {
            console.log('Checking for books due for reminder emails...');

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 7-Day Reminder Window: Due in 4 to 8 days
            const sevenDayStart = new Date(today);
            sevenDayStart.setDate(sevenDayStart.getDate() + 4);
            const sevenDayEnd = new Date(today);
            sevenDayEnd.setDate(sevenDayEnd.getDate() + 8);
            sevenDayEnd.setHours(23, 59, 59, 999);

            // 2-Day Reminder Window: Due in 0 to 3 days
            const twoDayStart = new Date(today);
            const twoDayEnd = new Date(today);
            twoDayEnd.setDate(twoDayEnd.getDate() + 3);
            twoDayEnd.setHours(23, 59, 59, 999);

            const populateOpts = [
                { path: 'copyId', populate: { path: 'bookId', select: 'title author' } },
                { path: 'libraryId', select: 'name finePerDay' },
            ];

            const [sevenDayReminders, twoDayReminders] = await Promise.all([
                BookTakenHistory.find({
                    status: 'borrowed',
                    dueDate: { $gte: sevenDayStart, $lte: sevenDayEnd },
                    sevenDayWarningSent: { $ne: true },
                    deletedAt: null,
                }).populate(populateOpts).lean(),
                BookTakenHistory.find({
                    status: 'borrowed',
                    dueDate: { $gte: twoDayStart, $lte: twoDayEnd },
                    twoDayWarningSent: { $ne: true },
                    deletedAt: null,
                }).populate(populateOpts).lean(),
            ]);

            let emailsSent = 0;
            let emailsFailed = 0;

            // Process both windows with shared logic
            const results7 = await this._processReminderBatch(sevenDayReminders, 'sevenDayWarningSent', today, 1);
            const results2 = await this._processReminderBatch(twoDayReminders, 'twoDayWarningSent', today, 0);

            emailsSent = results7.emailsSent + results2.emailsSent;
            emailsFailed = results7.emailsFailed + results2.emailsFailed;

            console.log(`Reminder emails sent: ${emailsSent}, failed: ${emailsFailed}`);
            return { emailsSent, emailsFailed };
        } catch (error) {
            console.error('Error in sendDueReminders:', error);
            throw error;
        }
    }

    // Shared reminder processing
    async _processReminderBatch(borrowings, flagField, today, minDays) {
        let emailsSent = 0;
        let emailsFailed = 0;

        for (const borrowing of borrowings) {
            await new Promise((resolve) => setTimeout(resolve, 1500));

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

            const daysTotal = Math.max(minDays, Math.ceil((new Date(borrowing.dueDate) - today) / (1000 * 60 * 60 * 24)));

            // Try sending email
            try {
                await emailService.sendOverdueReminder(userData.email, {
                    userName: userData.fullName || userData.name || 'Student',
                    userEmail: userData.email,
                    bookTitle: borrowing.copyId.bookId.title,
                    author: borrowing.copyId.bookId.author,
                    dueDate: borrowing.dueDate,
                    daysUntilDue: daysTotal,
                    finePerDay: borrowing.libraryId.finePerDay,
                });
                emailSuccess = true;
                emailsSent++;
                console.log(`Sent ${daysTotal}-day reminder to ${userData.email} for book: ${borrowing.copyId.bookId.title}`);
            } catch (error) {
                emailsFailed++;
                console.error(`Failed to send reminder email for ${borrowing._id}:`, error.message);
            }

            // Try sending app notification
            try {
                await notificationServiceClient.sendDueReminder(borrowing.borrowerId, {
                    bookTitle: borrowing.copyId.bookId.title,
                    author: borrowing.copyId.bookId.author,
                    daysUntilDue: daysTotal,
                });
                notificationSuccess = true;
                console.log(`Sent ${daysTotal}-day app notification to ${borrowing.borrowerId}`);
            } catch (error) {
                console.error(`Failed to send app notification for ${borrowing._id}:`, error.message);
            }

            if (emailSuccess || notificationSuccess) {
                await BookTakenHistory.updateOne({ _id: borrowing._id }, { [flagField]: true });
            }
        }

        return { emailsSent, emailsFailed };
    }

    async sendOverdueNotices() {
        try {
            console.log('Checking for overdue books...');

            const today = new Date();

            const overdueBorrowings = await BookTakenHistory.find({
                status: 'overdue',
                finePaid: false,
                deletedAt: null,
            })
                .populate([
                    { path: 'copyId', populate: { path: 'bookId', select: 'title author' } },
                    { path: 'libraryId', select: 'name finePerDay' },
                ])
                .lean();

            let emailsSent = 0;
            let emailsFailed = 0;

            for (const borrowing of overdueBorrowings) {
                await new Promise((resolve) => setTimeout(resolve, 1500));

                const dueDate = new Date(borrowing.dueDate);
                const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
                const totalFine = daysOverdue * borrowing.libraryId.finePerDay;

                // Throttle: only send if never sent, or last sent 7+ days ago
                if (borrowing.lastOverdueNoticeSent) {
                    const lastSent = new Date(borrowing.lastOverdueNoticeSent);
                    const daysSinceLastNotice = Math.ceil((today - lastSent) / (1000 * 60 * 60 * 24));
                    if (daysSinceLastNotice < 7) continue;
                }

                try {
                    const user = await userServiceClient.getUserById(borrowing.borrowerId);
                    const userData = user.data || user;

                    await emailService.sendBookOverdueNotice(userData.email, {
                        userName: userData.fullName || userData.name || 'Student',
                        userEmail: userData.email,
                        bookTitle: borrowing.copyId.bookId.title,
                        author: borrowing.copyId.bookId.author,
                        dueDate: borrowing.dueDate,
                        daysOverdue,
                        totalFine,
                    });

                    try {
                        await notificationServiceClient.sendOverdueNotice(borrowing.borrowerId, {
                            bookTitle: borrowing.copyId.bookId.title,
                            author: borrowing.copyId.bookId.author,
                            daysOverdue,
                            totalFine,
                        });
                        console.log(`Sent overdue app notification to ${borrowing.borrowerId}`);
                    } catch (error) {
                        console.error(`Failed to send overdue app notification for ${borrowing._id}:`, error.message);
                    }

                    await BookTakenHistory.updateOne({ _id: borrowing._id }, { lastOverdueNoticeSent: new Date() });

                    emailsSent++;
                    console.log(`Sent overdue notice to ${userData.email} for book: ${borrowing.copyId.bookId.title}`);
                } catch (error) {
                    emailsFailed++;
                    console.error(`Failed to send overdue notice for borrowing ${borrowing._id}:`, error.message);
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
        // Run at 6:00 AM, 10:00 AM, and 6:00 PM every day
        cron.schedule('0 6,10,18 * * *', async () => {
            console.log('Running scheduled reminder emails and notifications job...');
            try {
                await borrowingService.checkAndUpdateOverdueBooks();
                await reservationService.checkAndExpireReservations();

                await this.sendDueReminders();
                await this.sendOverdueNotices();
            } catch (error) {
                console.error('Error in scheduled job:', error);
            }
        });

        console.log('Scheduled jobs started: Daily reminders at 6:00 AM, 10:00 AM, and 6:00 PM');
    }
}

export default new NotificationService();