import { z } from 'zod';

export const createCourseSchema = z.object({
    body: z.object({
        name: z.string({
            required_error: 'Course name is required',
        })
        .min(3, 'Course name must be at least 3 characters')
        .max(100, 'Course name must not exceed 100 characters')
        .trim(),

        code: z.string({
            required_error: 'Course code is required',
        })
        .min(3, 'Course code must be at least 3 characters')
        .max(15, 'Course code must not exceed 15 characters')
        .trim()
        .toUpperCase(),

        credit: z.number({
            required_error: 'Credit is required',
        })
        .min(0.5, 'Credit must be at least 0.5')
        .max(10, 'Credit must not exceed 10'),

        courseType: z.enum(['theory', 'lab', 'project'], {
            required_error: 'Course type is required',
        }).default('theory'),

        duration: z.number()
            .int('Duration must be an integer')
            .min(1, 'Duration must be at least 1')
            .optional(),

        isElective: z.boolean().optional().default(false),

        description: z.string()
            .max(1000, 'Description must not exceed 1000 characters')
            .optional(),

        departmentId: z.string({
            required_error: 'Department ID is required',
        })
        .uuid('Invalid department ID format'),

        status: z.boolean().optional().default(true),
    }),
});

export const updateCourseSchema = z.object({
    body: z.object({
        name: z.string()
            .min(3, 'Course name must be at least 3 characters')
            .max(100, 'Course name must not exceed 100 characters')
            .trim()
            .optional(),

        code: z.string()
            .min(3, 'Course code must be at least 3 characters')
            .max(15, 'Course code must not exceed 15 characters')
            .trim()
            .toUpperCase()
            .optional(),

        credit: z.number()
            .min(0.5, 'Credit must be at least 0.5')
            .max(10, 'Credit must not exceed 10')
            .optional(),

        courseType: z.enum(['theory', 'lab', 'project']).optional(),

        duration: z.number()
            .int('Duration must be an integer')
            .min(1, 'Duration must be at least 1')
            .optional(),

        isElective: z.boolean().optional(),

        description: z.string()
            .max(1000, 'Description must not exceed 1000 characters')
            .optional(),

        departmentId: z.string()
            .uuid('Invalid department ID format')
            .optional(),

        status: z.boolean().optional(),
    }),
});

export const getCourseByIdSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Course ID is required',
        })
        .uuid('Invalid course ID format'),
    }),
});

export const deleteCourseSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Course ID is required',
        })
        .uuid('Invalid course ID format'),
    }),
});

export const getCoursesSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
        limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
        departmentId: z.string().uuid().optional(),
        courseType: z.enum(['theory', 'lab', 'project']).optional(),
        isElective: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
        status: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
        search: z.string().optional(),
    }),
});

