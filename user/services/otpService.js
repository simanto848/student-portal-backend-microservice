import crypto from 'crypto';
import nodemailer from 'nodemailer';
import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import UserOTP from '../models/OTP.js';
import { ApiError } from 'shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class OtpService {
    constructor() {
        const mailConfig = {
            host: process.env.MAIL_HOST,
            port: process.env.MAIL_PORT,
            secure: process.env.MAIL_PORT === '465', // true for 465, false for other ports
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        };

        if (process.env.MAIL_HOST === 'gmail') {
            mailConfig.service = 'gmail';
        }

        this.transporter = nodemailer.createTransport(mailConfig);
    }

    /**
     * Generate a numeric OTP of given length
     * @param {number} length 
     * @returns {string}
     */
    generateOTP(length = 6) {
        let otp = '';
        for (let i = 0; i < length; i++) {
            otp += crypto.randomInt(0, 10).toString();
        }
        return otp;
    }

    /**
     * Save OTP to database
     * @param {string} userId 
     * @param {string} otp 
     * @param {string} purpose 
     * @param {number} expiresInMinutes 
     */
    async saveOTP(userId, otp, purpose, expiresInMinutes = 10) {
        const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
        
        // Invalidate previous OTPs for the same user and purpose
        await UserOTP.deleteMany({ user: userId, purpose });

        const userOTP = await UserOTP.create({
            user: userId,
            otp, // In a real app, you might want to hash this
            purpose,
            expiresAt,
        });

        return userOTP;
    }

    /**
     * Verify OTP
     * @param {string} userId 
     * @param {string} otp 
     * @param {string} purpose 
     * @returns {boolean}
     */
    async verifyOTP(userId, otp, purpose) {
        const userOTP = await UserOTP.findOne({
            user: userId,
            purpose,
            expiresAt: { $gt: new Date() },
        });

        if (!userOTP) {
            return false;
        }

        if (userOTP.otp !== otp) {
            return false;
        }

        // OTP is valid, delete it (one-time use)
        await UserOTP.deleteOne({ _id: userOTP._id });
        return true;
    }

    /**
     * Send OTP via Email
     * @param {string} email 
     * @param {string} otp 
     * @param {string} purpose 
     */
    /**
     * Send OTP via Email
     * @param {string} email 
     * @param {string} otp 
     * @param {string} purpose 
     * @param {string} userName 
     */
    async sendOTPEmail(email, otp, purpose, userName = 'User') {
        let subject = 'Your OTP Code';
        let title = 'Verification Code';
        let message = `Your OTP code is: ${otp}`;
        let expiryMinutes = 10;

        switch (purpose) {
            case 'email_verification':
                subject = 'Verify your email';
                title = 'Email Verification';
                message = 'Please use the verification code below to verify your email address.';
                break;
            case 'password_reset':
                subject = 'Password Reset Request';
                title = 'Reset Password';
                message = 'You have requested to reset your password. Use the code below to proceed.';
                break;
            case 'two_factor_auth':
                subject = '2FA Login Code';
                title = 'Two-Factor Authentication';
                message = 'Please enter the code below to complete your login.';
                expiryMinutes = 5;
                break;
        }

        try {
            const templatePath = path.join(__dirname, '../views/emails/otp.ejs');
            const html = await ejs.renderFile(templatePath, {
                title,
                message,
                otp,
                expiryMinutes,
                userName,
                subject,
                companyName: 'Student Portal', // Or from env
            });

            const mailOptions = {
                from: process.env.MAIL_FROM || '"Student Portal" <noreply@studentportal.com>',
                to: email,
                subject,
                html,
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`OTP sent to ${email} for ${purpose}`);
        } catch (error) {
            console.error('Error sending OTP email:', error);
            // In development, don't block the flow if email fails
            if (process.env.NODE_ENV === 'production') {
                throw new ApiError(500, 'Failed to send OTP email');
            }
            console.log(`[DEV MODE] OTP for ${email}: ${otp}`);
        }
    }
}

export default new OtpService();
