import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import transporter from './mailTransporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
    constructor() {
        this.from = process.env.MAIL_FROM || 'EDUCATION HUB';
        this.companyName = 'EDUCATION HUB';
        this.supportEmail = process.env.MAIL_USER || 'support@educationhub.com';
        this.loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000/login';
        this.helpCenterUrl = process.env.HELP_CENTER_URL || 'http://localhost:3000/help';
        this.companyLogoUrl = process.env.COMPANY_LOGO_URL || '';
    }

    async sendOverdueReminder(to, reminderData) {
        try {
            const { userName, userEmail, bookTitle, author, dueDate, daysUntilDue, finePerDay } = reminderData;
            const emailTemplatePath = path.join(__dirname, '../views/emails/overdueReminder.ejs');

            const html = await ejs.renderFile(emailTemplatePath, {
                userName,
                userEmail,
                bookTitle,
                author,
                dueDate: new Date(dueDate).toLocaleDateString(),
                daysUntilDue,
                finePerDay,
                companyName: this.companyName,
                companyLogoUrl: this.companyLogoUrl,
                supportEmail: this.supportEmail,
                loginUrl: this.loginUrl,
                helpCenterUrl: this.helpCenterUrl,
            });

            const subject = daysUntilDue > 2 ? `Reminder: Book Due in ${daysUntilDue} Days - ${this.companyName}` : `Urgent: Book Due in ${daysUntilDue} Days - ${this.companyName}`;
            const mailOptions = {
                from: `"${this.from}" <${process.env.MAIL_USER}>`,
                to: to,
                subject: subject,
                html: html,
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Overdue reminder email sent successfully:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending overdue reminder email:', error);
            throw new Error('Failed to send overdue reminder email: ' + error.message);
        }
    }

    async sendBookOverdueNotice(to, noticeData) {
        try {
            const { userName, userEmail, bookTitle, author, dueDate, daysOverdue, totalFine } = noticeData;

            const emailTemplatePath = path.join(__dirname, '../views/emails/bookOverdueNotice.ejs');
            const html = await ejs.renderFile(emailTemplatePath, {
                userName,
                userEmail,
                bookTitle,
                author,
                dueDate: new Date(dueDate).toLocaleDateString(),
                daysOverdue,
                totalFine,
                companyName: this.companyName,
                companyLogoUrl: this.companyLogoUrl,
                supportEmail: this.supportEmail,
                loginUrl: this.loginUrl,
                helpCenterUrl: this.helpCenterUrl,
            });

            const mailOptions = {
                from: `"${this.from}" <${process.env.MAIL_USER}>`,
                to: to,
                subject: `Book Overdue Notice - ${this.companyName}`,
                html: html,
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Book overdue notice sent successfully:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending book overdue notice:', error);
            throw new Error('Failed to send book overdue notice: ' + error.message);
        }
    }
}

export default new EmailService();