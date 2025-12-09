import { z } from 'zod';

export const createEnrollmentSchema = z.object({
    body: z.object({
        studentId: z.string().uuid('Invalid student ID format'),
        batchId: z.string().uuid('Invalid batch ID format'),
        sessionId: z.string().uuid('Invalid session ID format'),
        semester: z.number().int().min(1, 'Semester must be at least 1'),
    }),
});

export const bulkEnrollSchema = z.object({
    body: z.object({
        batchId: z.string().uuid('Invalid batch ID format'),
        semester: z.number().int().min(1, 'Semester must be at least 1'),
        courses: z.array(z.object({
            courseId: z.string().uuid('Invalid course ID format'),
            instructorId: z.string().uuid('Invalid instructor ID format'),
        })).min(1, 'At least one course is required'),
    }),
});

export const updateEnrollmentSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid ID format'),
    }),
    body: z.object({
        status: z.enum(['active', 'completed']).optional(),
    }),
});

export const getEnrollmentSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid ID format'),
    }),
});

export const listEnrollmentsSchema = z.object({
    query: z.object({
        studentId: z.string().uuid('Invalid student ID format').optional(),
        batchId: z.string().uuid('Invalid batch ID format').optional(),
        courseId: z.string().uuid('Invalid course ID format').optional(),
        semester: z.string().regex(/^\d+$/, 'Semester must be a number').optional(),
        status: z.enum(['active', 'completed']).optional(),
        limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional(),
        page: z.string().regex(/^\d+$/, 'Page must be a number').optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
    }),
});