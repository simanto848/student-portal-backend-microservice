import { z } from 'zod';

export const createSessionCourseSchema = z.object({
    body: z.object({
        sessionId: z.string({
            required_error: 'Session ID is required',
        })
        .uuid('Invalid session ID format'),

        courseId: z.string({
            required_error: 'Course ID is required',
        })
        .uuid('Invalid course ID format'),

        semester: z.number({
            required_error: 'Semester is required',
        })
        .int('Semester must be an integer')
        .min(1, 'Semester must be at least 1')
        .max(12, 'Semester must not exceed 12'),

        departmentId: z.string({
            required_error: 'Department ID is required',
        })
        .uuid('Invalid department ID format'),
    }),
});

export const updateSessionCourseSchema = z.object({
    body: z.object({
        sessionId: z.string()
            .uuid('Invalid session ID format')
            .optional(),

        courseId: z.string()
            .uuid('Invalid course ID format')
            .optional(),

        semester: z.number()
            .int('Semester must be an integer')
            .min(1, 'Semester must be at least 1')
            .max(12, 'Semester must not exceed 12')
            .optional(),

        departmentId: z.string()
            .uuid('Invalid department ID format')
            .optional(),
    }),
});

export const getSessionCourseByIdSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'SessionCourse ID is required',
        })
        .uuid('Invalid sessionCourse ID format'),
    }),
});

export const deleteSessionCourseSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'SessionCourse ID is required',
        })
        .uuid('Invalid sessionCourse ID format'),
    }),
});

export const getSessionCoursesSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
        limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
        sessionId: z.string().uuid().optional(),
        courseId: z.string().uuid().optional(),
        departmentId: z.string().uuid().optional(),
        semester: z.string().regex(/^\d+$/).transform(Number).optional(),
        search: z.string().optional(),
    }),
});

export const getBatchSessionCoursesSchema = z.object({
    params: z.object({
        batchId: z.string({
            required_error: 'Batch ID is required',
        })
        .uuid('Invalid batch ID format'),
    }),
});

