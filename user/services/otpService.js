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
            secure: process.env.MAIL_PORT === '465',
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

    generateOTP(length = 6) {
        let otp = '';
        for (let i = 0; i < length; i++) {
            otp += crypto.randomInt(0, 10).toString();
        }
        return otp;
    }


    async saveOTP(userId, otp, purpose, expiresInMinutes = 10) {
        const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
        
        await UserOTP.deleteMany({ user: userId, purpose });

        const userOTP = await UserOTP.create({
            user: userId,
            otp,
            purpose,
            expiresAt,
        });

        return userOTP;
    }

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

        await UserOTP.deleteOne({ _id: userOTP._id });
        return true;
    }

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
            case 'result_submission':
                subject = 'Result Submission Verification';
                title = 'Result Submission';
                message = 'Please use the code below to verify your result submission.';
                expiryMinutes = 5;
                break;
            case 'result_approval':
                subject = 'Result Approval Verification';
                title = 'Result Approval';
                message = 'Please use the code below to verify your result approval.';
                expiryMinutes = 5;
                break;
            case 'result_publication':
                subject = 'Result Publication Verification';
                title = 'Result Publication';
                message = 'Please use the code below to verify result publication.';
                expiryMinutes = 5;
                break;
            case 'result_return':
                subject = 'Result Return Verification';
                title = 'Result Return';
                message = 'Please use the code below to verify returning the result.';
                expiryMinutes = 5;
                break;
            case 'result_return_approval':
                subject = 'Result Return Approval Verification';
                title = 'Return Approval';
                message = 'Please use the code below to verify approving the return request.';
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
                companyName: 'Dhaka International University',
            });

            const mailOptions = {
                from: process.env.MAIL_FROM || '"Dhaka International University" <noreply@studentportal.com>',
                to: email,
                subject,
                html,
            };

            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            if (process.env.NODE_ENV === 'production') {
                throw new ApiError(500, 'Failed to send OTP email');
            }
        }
    }
}

export default new OtpService();
