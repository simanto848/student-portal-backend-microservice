import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import transporter from './mailTransporter.js';
import { config } from 'shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
    constructor() {
        this.from = config.email.from;
        this.companyName = config.app.companyName;
        this.supportEmail = config.email.user;
        this.loginUrl = `${config.client.frontendUrl}/login`;
        this.helpCenterUrl = config.app.helpCenterUrl;
        this.companyLogoUrl = config.app.companyLogoUrl;
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
                from: `"${this.from}" <${config.email.user}>`,
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
                from: `"${this.from}" <${config.email.user}>`,
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

    async sendGenericNotification(to, data) {
        try {
            const templatePath = path.join(__dirname, '../views/emails/genericNotification.ejs');
            const html = await ejs.renderFile(templatePath, {
                title: data.title,
                summary: data.summary,
                content: data.content,
                publishedAt: new Date(data.publishedAt).toLocaleString(),
                priority: data.priority,
                companyName: this.companyName,
                companyLogoUrl: this.companyLogoUrl,
                supportEmail: this.supportEmail,
                loginUrl: this.loginUrl,
                helpCenterUrl: this.helpCenterUrl,
            });
            const subject = `[${data.priority}] ${data.title}`;
            const mailOptions = { from: `"${this.from}" <${config.email.user}>`, to, subject, html };
            const info = await transporter.sendMail(mailOptions);
            console.log('Generic notification email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending generic notification email:', error);
            throw new Error('Failed to send generic notification email: ' + error.message);
        }
    }
}

export default new EmailService();