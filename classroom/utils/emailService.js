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

    async sendWelcomeEmailWithCredentials(to, userData) {
        try {
            const { fullName, email, temporaryPassword } = userData;

            const emailTemplatePath = path.join(
                __dirname,
                '../views/emails/sendWelcomeEmailWithCredentials.ejs'
            );

            const html = await ejs.renderFile(emailTemplatePath, {
                userName: fullName,
                userEmail: email,
                temporaryPassword: temporaryPassword,
                companyName: this.companyName,
                companyLogoUrl: this.companyLogoUrl,
                supportEmail: this.supportEmail,
                loginUrl: this.loginUrl,
                helpCenterUrl: this.helpCenterUrl,
            });

            const mailOptions = {
                from: `"${this.from}" <${process.env.MAIL_USER}>`,
                to: to,
                subject: `Welcome to ${this.companyName} - Your Account Credentials`,
                html: html,
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Welcome email sent successfully:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending welcome email:', error);
            throw new Error('Failed to send welcome email: ' + error.message);
        }
    }

    async send2FAEnabledEmail(to, userData) {
        try {
            const { fullName, email } = userData;

            const emailTemplatePath = path.join(
                __dirname,
                '../views/emails/twoFactorEnabled.ejs'
            );

            const html = await ejs.renderFile(emailTemplatePath, {
                userName: fullName,
                userEmail: email,
                companyName: this.companyName,
                companyLogoUrl: this.companyLogoUrl,
                supportEmail: this.supportEmail,
                loginUrl: this.loginUrl,
                helpCenterUrl: this.helpCenterUrl,
            });

            const mailOptions = {
                from: `"${this.from}" <${process.env.MAIL_USER}>`,
                to: to,
                subject: `Two-Factor Authentication Enabled - ${this.companyName}`,
                html: html,
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('2FA enabled email sent successfully:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending 2FA enabled email:', error);
            throw new Error('Failed to send 2FA enabled email: ' + error.message);
        }
    }

    async send2FADisabledEmail(to, userData) {
        try {
            const { fullName, email } = userData;

            const emailTemplatePath = path.join(
                __dirname,
                '../views/emails/twoFactorDisabled.ejs'
            );

            const html = await ejs.renderFile(emailTemplatePath, {
                userName: fullName,
                userEmail: email,
                companyName: this.companyName,
                companyLogoUrl: this.companyLogoUrl,
                supportEmail: this.supportEmail,
                loginUrl: this.loginUrl,
                helpCenterUrl: this.helpCenterUrl,
            });

            const mailOptions = {
                from: `"${this.from}" <${process.env.MAIL_USER}>`,
                to: to,
                subject: `Two-Factor Authentication Disabled - ${this.companyName}`,
                html: html,
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('2FA disabled email sent successfully:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending 2FA disabled email:', error);
            throw new Error('Failed to send 2FA disabled email: ' + error.message);
        }
    }
}

export default new EmailService();

