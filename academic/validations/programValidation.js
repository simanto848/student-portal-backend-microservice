import { z } from 'zod';

export const createProgramSchema = z.object({
    body: z.object({
        departmentId: z.string({
            required_error: 'Department ID is required',
        })
        .uuid('Invalid department ID format'),

        name: z.string({
            required_error: 'Program name is required',
        })
        .min(3, 'Program name must be at least 3 characters')
        .max(100, 'Program name must not exceed 100 characters')
        .trim(),

        shortName: z.string({
            required_error: 'Short name is required',
        })
        .min(2, 'Short name must be at least 2 characters')
        .max(30, 'Short name must not exceed 30 characters')
        .trim()
        .toUpperCase(),

        description: z.string()
            .max(1000, 'Description must not exceed 1000 characters')
            .optional(),

        duration: z.number({
            required_error: 'Duration is required',
        })
        .int('Duration must be an integer')
        .min(1, 'Duration must be at least 1 year')
        .max(10, 'Duration must not exceed 10 years'),

        totalCredits: z.number({
            required_error: 'Total credits is required',
        })
        .min(1, 'Total credits must be at least 1')
        .max(300, 'Total credits must not exceed 300'),

        status: z.boolean().optional().default(true),
    }),
});

export const updateProgramSchema = z.object({
    body: z.object({
        departmentId: z.string()
            .uuid('Invalid department ID format')
            .optional(),

        name: z.string()
            .min(3, 'Program name must be at least 3 characters')
            .max(100, 'Program name must not exceed 100 characters')
            .trim()
            .optional(),

        shortName: z.string()
            .min(2, 'Short name must be at least 2 characters')
            .max(30, 'Short name must not exceed 30 characters')
            .trim()
            .toUpperCase()
            .optional(),

        description: z.string()
            .max(1000, 'Description must not exceed 1000 characters')
            .optional(),

        duration: z.number()
            .int('Duration must be an integer')
            .min(1, 'Duration must be at least 1 year')
            .max(10, 'Duration must not exceed 10 years')
            .optional(),

        totalCredits: z.number()
            .min(1, 'Total credits must be at least 1')
            .max(300, 'Total credits must not exceed 300')
            .optional(),

        status: z.boolean().optional(),
    }),
});

export const getProgramByIdSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Program ID is required',
        })
        .uuid('Invalid program ID format'),
    }),
});

export const deleteProgramSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Program ID is required',
        })
        .uuid('Invalid program ID format'),
    }),
});

export const getProgramsSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
        limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
        departmentId: z.string().uuid().optional(),
        status: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
        search: z.string().optional(),
    }),
});

