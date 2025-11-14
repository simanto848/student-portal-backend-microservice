import { z } from 'zod';

export const createFacultySchema = z.object({
    body: z.object({
        name: z.string({
            required_error: 'Faculty name is required',
        })
        .min(3, 'Faculty name must be at least 3 characters')
        .max(100, 'Faculty name must not exceed 100 characters')
        .trim(),

        email: z.string({
            required_error: 'Email is required',
        })
        .email('Invalid email format')
        .toLowerCase()
        .trim(),

        phone: z.string()
            .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/, 'Invalid phone number format')
            .optional(),

        deanId: z.string()
            .uuid('Invalid dean ID format')
            .optional(),

        establishedAt: z.string()
            .datetime({ message: 'Invalid date format' })
            .or(z.date())
            .optional(),

        status: z.boolean().optional().default(true),
    }),
});

export const updateFacultySchema = z.object({
    body: z.object({
        name: z.string()
            .min(3, 'Faculty name must be at least 3 characters')
            .max(100, 'Faculty name must not exceed 100 characters')
            .trim()
            .optional(),

        email: z.string()
            .email('Invalid email format')
            .toLowerCase()
            .trim()
            .optional(),

        phone: z.string()
            .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/, 'Invalid phone number format')
            .optional(),

        deanId: z.string()
            .uuid('Invalid dean ID format')
            .optional()
            .nullable(),

        establishedAt: z.string()
            .datetime({ message: 'Invalid date format' })
            .or(z.date())
            .optional(),

        status: z.boolean().optional(),
    }),
});

export const getFacultyByIdSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Faculty ID is required',
        })
        .uuid('Invalid faculty ID format'),
    }),
});

export const deleteFacultySchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Faculty ID is required',
        })
        .uuid('Invalid faculty ID format'),
    }),
});

export const getFacultiesSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
        limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
        status: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
        search: z.string().optional(),
    }),
});

export const assignDeanSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Faculty ID is required',
        })
        .uuid('Invalid faculty ID format'),
    }),
    body: z.object({
        deanId: z.string({
            required_error: 'Dean ID is required',
        })
        .uuid('Invalid dean ID format'),
    }),
});

export const removeDeanSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Faculty ID is required',
        })
        .uuid('Invalid faculty ID format'),
    }),
});

