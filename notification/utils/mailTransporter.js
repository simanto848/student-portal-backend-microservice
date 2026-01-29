import nodemailer from 'nodemailer';
import { config } from 'shared';

const transportConfig = {
    auth: {
        user: config.email.user,
        pass: config.email.pass,
    },
};

if (config.email.host) {
    transportConfig.service = config.email.host;
} else {
    transportConfig.host = config.email.host;
    transportConfig.port = parseInt(config.email.port) || 587;
    transportConfig.secure = config.email.secure === 'true';
}

const transporter = nodemailer.createTransport(transportConfig);
transporter.verify((error, success) => {
    if (error) {
        console.error('[MailTransporter] SMTP connection failed:', error.message);
    } else {
        console.log('[MailTransporter] SMTP server is ready to send emails');
    }
});

export default transporter;
