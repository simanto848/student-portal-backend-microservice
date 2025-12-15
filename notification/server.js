import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import connectDB from "./config/db.js";
import { initSocket } from './socket.js';
import schedulingService from './services/schedulingService.js';
import { initRedis } from './utils/redisClient.js';
import subscribeToStudentEvents from './subscribers/studentSubscriber.js';

dotenv.config();

const PORT = process.env.NOTIFICATION_SERVICE_PORT || 8010;

// Check email configuration
function checkEmailConfig() {
    const requiredEmailVars = ['MAIL_USER', 'MAIL_PASS'];
    const missingVars = requiredEmailVars.filter(v => !process.env[v]);

    if (missingVars.length > 0) {
        console.warn('========================================');
        console.warn('[EmailConfig] WARNING: Email sending is NOT configured!');
        console.warn(`[EmailConfig] Missing environment variables: ${missingVars.join(', ')}`);
        console.warn('[EmailConfig] Notifications will be delivered via socket only.');
        console.warn('[EmailConfig] To enable email notifications, set the following:');
        console.warn('  - MAIL_HOST (default: smtp.gmail.com)');
        console.warn('  - MAIL_PORT (default: 587)');
        console.warn('  - MAIL_USER (your email address)');
        console.warn('  - MAIL_PASS (your email password or app password)');
        console.warn('  - MAIL_FROM (display name, default: EDUCATION HUB)');
        console.warn('========================================');
        return false;
    }

    console.log('[EmailConfig] ✓ Email configuration found');
    console.log(`[EmailConfig]   Host: ${process.env.MAIL_HOST || 'smtp.gmail.com'}`);
    console.log(`[EmailConfig]   Port: ${process.env.MAIL_PORT || '587'}`);
    console.log(`[EmailConfig]   User: ${process.env.MAIL_USER.substring(0, 3)}***`);
    console.log(`[EmailConfig]   From: ${process.env.MAIL_FROM || 'EDUCATION HUB'}`);
    console.log('========================================');
    console.log(`[Config] Gateway URL: ${process.env.GATEWAY_URL || 'http://localhost:8000'}`);
    return true;
}

async function start() {
    try {
        console.log('========================================');
        console.log('Starting Notification Service...');
        console.log('========================================');

        // Check email configuration
        const emailConfigured = checkEmailConfig();

        // Connect to database
        console.log('[Database] Connecting to MongoDB...');
        await connectDB();
        console.log('[Database] ✓ Connected to MongoDB');

        // Initialize Redis
        console.log('[Redis] Initializing Redis connection...');
        await initRedis();
        console.log('[Redis] ✓ Redis initialized');

        // Create HTTP server and initialize Socket.IO
        const server = http.createServer(app);
        initSocket(server);
        console.log('[Socket.IO] ✓ Socket.IO initialized');

        // Start scheduling service for scheduled notifications
        schedulingService.start();
        console.log('[Scheduler] ✓ Scheduling service started');

        // Subscribe to student events
        await subscribeToStudentEvents();
        console.log('[Events] ✓ Subscribed to student events');

        // Start listening
        server.listen(PORT, () => {
            console.log('========================================');
            console.log(`✓ Notification service running on port ${PORT}`);
            console.log(`✓ Email notifications: ${emailConfigured ? 'ENABLED' : 'DISABLED'}`);
            console.log('========================================');
        });
    } catch (err) {
        console.error('========================================');
        console.error('Failed to start notification service:', err);
        console.error('========================================');
        process.exit(1);
    }
}

start();
