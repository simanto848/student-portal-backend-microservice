
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root (../../.env from here)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: rootEnvPath });

const getEnv = (key, defaultValue) => {
    const value = process.env[key];
    if (value === undefined && defaultValue === undefined) {
        console.warn(`[CONFIG] Warning: Environment variable ${key} is missing`);
    }
    return value || defaultValue;
};

export const config = {
    env: getEnv('NODE_ENV', 'development'),
    jwt: {
        secret: getEnv('JWT_SECRET', 'mysupersecrectkey'),
        expiresIn: getEnv('JWT_EXPIRES_IN', '7d'),
        refreshExpiresIn: getEnv('REFRESH_TOKEN_EXPIRES_IN', '30d')
    },
    ports: {
        gateway: getEnv('GATEWAY_PORT', 8000),
        user: getEnv('USER_SERVICE_PORT', 8001),
        academic: getEnv('ACADEMIC_SERVICE_PORT', 8002),
        classroom: getEnv('CLASSROOM_SERVICE_PORT', 8003),
        communication: getEnv('COMMUNICATION_SERVICE_PORT', 8004),
        enrollment: getEnv('ENROLLMENT_SERVICE_PORT', 8005),
        library: getEnv('LIBRARY_SERVICE_PORT', 8006),
        notification: getEnv('NOTIFICATION_SERVICE_PORT', 8007)
    },
    services: {
        gateway: getEnv('GATEWAY_URL', 'http://localhost:8000'),
        user: getEnv('USER_SERVICE_URL', 'http://localhost:8001'),
        academic: getEnv('ACADEMIC_SERVICE_URL', 'http://localhost:8002'),
        classroom: getEnv('CLASSROOM_SERVICE_URL', 'http://localhost:8003'),
        communication: getEnv('COMMUNICATION_SERVICE_URL', 'http://localhost:8004'),
        enrollment: getEnv('ENROLLMENT_SERVICE_URL', 'http://localhost:8005'),
        library: getEnv('LIBRARY_SERVICE_URL', 'http://localhost:8006'),
        notification: getEnv('NOTIFICATION_SERVICE_URL', 'http://localhost:8007')
    },
    db: {
        user: getEnv('USER_MONGO_URI', 'mongodb://localhost:27017/student_portal_user_service'),
        academic: getEnv('ACADEMIC_MONGO_URI', 'mongodb://localhost:27017/student_portal_academic_service'),
        classroom: getEnv('CLASSROOM_MONGO_URI', 'mongodb://localhost:27017/student_portal_classroom_service'),
        communication: getEnv('COMMUNICATION_MONGO_URI', 'mongodb://localhost:27017/student_portal_communication_service'),
        enrollment: getEnv('ENROLLMENT_MONGO_URI', 'mongodb://localhost:27017/student_portal_enrollment_service'),
        library: getEnv('LIBRARY_MONGO_URI', 'mongodb://localhost:27017/student_portal_library_service'),
        notification: getEnv('NOTIFICATION_MONGO_URI', 'mongodb://localhost:27017/student_portal_notification_service')
    },
    rabbitmq: {
        url: getEnv('RABBITMQ_URL', 'amqp://localhost:5672')
    },
    redis: {
        url: getEnv('REDIS_URL', 'redis://localhost:6379')
    },
    email: {
        host: getEnv('MAIL_HOST'),
        port: getEnv('MAIL_PORT'),
        user: getEnv('MAIL_USER'),
        pass: getEnv('MAIL_PASS'),
        from: getEnv('MAIL_FROM'),
        secure: getEnv('MAIL_SECURE') === 'true',
        maxPerNotification: getEnv('MAX_EMAILS_PER_NOTIFICATION', 2000),
        batchSize: getEnv('EMAIL_BATCH_SIZE', 10),
        batchDelay: getEnv('EMAIL_BATCH_DELAY_MS', 1000)
    },
    external: {
        geminiApiKey: getEnv('GEMINI_API')
    },
    app: {
        companyName: getEnv('COMPANY_NAME', 'Dhaka International University'),
        maxUploadMb: getEnv('MAX_UPLOAD_MB', 15),
        helpCenterUrl: getEnv('HELP_CENTER_URL', 'http://localhost:3000/help'),
        companyLogoUrl: getEnv('COMPANY_LOGO_URL', '')
    },
    client: {
        frontendUrl: getEnv('FRONTEND_URL', 'http://localhost:3000')
    }
};

export default config;
