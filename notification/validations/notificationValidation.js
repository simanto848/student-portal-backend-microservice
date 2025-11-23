import { z } from 'zod';
import ApiResponse from '../utils/ApiResponser.js';

const baseSchema = {
  title: z.string().min(3),
  content: z.string().min(3),
  summary: z.string().optional(),
  targetType: z.enum(['all','students','teachers','department','batch','custom']).default('all'),
  targetDepartmentIds: z.array(z.string()).optional(),
  targetBatchIds: z.array(z.string()).optional(),
  targetUserIds: z.array(z.string()).optional(),
  priority: z.enum(['low','medium','high','urgent']).default('medium'),
  requireAcknowledgment: z.boolean().optional(),
  sendEmail: z.boolean().optional(),
  deliveryChannels: z.array(z.enum(['socket','email'])).optional(),
  scheduleAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional()
};

const createSchema = z.object(baseSchema).superRefine((data, ctx) => {
  if (data.targetType === 'department' && (!data.targetDepartmentIds || data.targetDepartmentIds.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'targetDepartmentIds required for department targetType', path: ['targetDepartmentIds'] });
  }
  if (data.targetType === 'batch' && (!data.targetBatchIds || data.targetBatchIds.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'targetBatchIds required for batch targetType', path: ['targetBatchIds'] });
  }
  if (data.targetType === 'custom' && (!data.targetUserIds || data.targetUserIds.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'targetUserIds required for custom targetType', path: ['targetUserIds'] });
  }
  if (data.expiresAt && data.scheduleAt && data.expiresAt < data.scheduleAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'expiresAt must be after scheduleAt', path: ['expiresAt'] });
  }
});

const updateSchema = z.object(baseSchema).partial();

export function validateNotificationCreate(req, res, next) {
  try {
    const parsed = createSchema.parse(req.body);
    req.body = parsed;
    next();
  } catch (err) {
    const errors = err.errors?.map(e => ({ field: e.path.join('.'), message: e.message })) || [];
    return ApiResponse.validationError(res, 'Validation failed', errors);
  }
}

export function validateNotificationUpdate(req, res, next) {
  try {
    const parsed = updateSchema.parse(req.body);
    req.body = parsed;
    next();
  } catch (err) {
    const errors = err.errors?.map(e => ({ field: e.path.join('.'), message: e.message })) || [];
    return ApiResponse.validationError(res, 'Validation failed', errors);
  }
}
