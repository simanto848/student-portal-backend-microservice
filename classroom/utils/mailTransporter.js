import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { config } from 'shared';
dotenv.config();

const transporter = nodemailer.createTransport({
    service: config.email.host,
    port: config.email.port,
    secure: false,
    auth: {
        user: config.email.user,
        pass: config.email.pass,
    },
});

export default transporter;
