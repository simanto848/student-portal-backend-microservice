import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import apiRoutes from './routes/index.js';
import { ApiResponse, ApiError } from 'shared';
import { authenticate } from 'shared';

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());
app.use(morgan('dev'));

app.use('/', apiRoutes);

app.get('/health', authenticate, (req, res) => {
  return ApiResponse.success(res, { service: 'notification', time: new Date().toISOString() }, 'Notification Service Healthy');
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return ApiResponse.error(res, err.message, err.statusCode, err.errors);
  }
  console.error('Unhandled error:', err);
  return ApiResponse.serverError(res, process.env.NODE_ENV === 'development' ? err.message : 'Internal server error');
});

export default app;
