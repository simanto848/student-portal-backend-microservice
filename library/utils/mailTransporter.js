import nodemailer from 'nodemailer';
import { config } from 'shared';

const transporter = nodemailer.createTransport({
    host: config.email.host || 'smtp.gmail.com',
    port: parseInt(config.email.port) || 587,
    secure: false,
    auth: {
        user: config.email.user,
        pass: config.email.pass,
    },
});

export default transporter;