import { z } from 'zod';

export const createBatchCourseInstructorSchema = z.object({
    body: z.object({
        batchId: z.string().uuid('Invalid batch ID format'),
        courseId: z.string().uuid('Invalid course ID format'),
        sessionId: z.string().uuid('Invalid session ID format'),
        semester: z.number().int().min(1, 'Semester must be at least 1'),
        instructorId: z.string().uuid('Invalid instructor ID format'),
    }),
});

export const updateBatchCourseInstructorSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid ID format'),
    }),
    body: z.object({
        instructorId: z.string().uuid('Invalid instructor ID format').optional(),
        status: z.enum(['active', 'completed', 'reassigned']).optional(),
    }),
});

export const getBatchCourseInstructorSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid ID format'),
    }),
});

export const listBatchCourseInstructorsSchema = z.object({
    query: z.object({
        batchId: z.string().uuid('Invalid batch ID format').optional(),
        courseId: z.string().uuid('Invalid course ID format').optional(),
        instructorId: z.string().uuid('Invalid instructor ID format').optional(),
        semester: z.string().regex(/^\d+$/, 'Semester must be a number').optional(),
        status: z.enum(['active', 'completed', 'reassigned']).optional(),
    }),
});