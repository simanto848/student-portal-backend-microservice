import { z } from 'zod';

export const createDepartmentSchema = z.object({
    body: z.object({
        name: z.string({
            required_error: 'Department name is required',
        })
        .min(3, 'Department name must be at least 3 characters')
        .max(100, 'Department name must not exceed 100 characters')
        .trim(),

        shortName: z.string({
            required_error: 'Short name is required',
        })
        .min(2, 'Short name must be at least 2 characters')
        .max(20, 'Short name must not exceed 20 characters')
        .trim()
        .toUpperCase(),

        email: z.string({
            required_error: 'Email is required',
        })
        .email('Invalid email format')
        .toLowerCase()
        .trim(),

        phone: z.string()
            .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/, 'Invalid phone number format')
            .optional(),

        facultyId: z.string({
            required_error: 'Faculty ID is required',
        })
        .uuid('Invalid faculty ID format'),

        departmentHeadId: z.string()
            .uuid('Invalid department head ID format')
            .optional(),

        isActingHead: z.boolean().optional().default(false),

        status: z.boolean().optional().default(true),
    }),
});

export const updateDepartmentSchema = z.object({
    body: z.object({
        name: z.string()
            .min(3, 'Department name must be at least 3 characters')
            .max(100, 'Department name must not exceed 100 characters')
            .trim()
            .optional(),

        shortName: z.string()
            .min(2, 'Short name must be at least 2 characters')
            .max(20, 'Short name must not exceed 20 characters')
            .trim()
            .toUpperCase()
            .optional(),

        email: z.string()
            .email('Invalid email format')
            .toLowerCase()
            .trim()
            .optional(),

        phone: z.string()
            .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/, 'Invalid phone number format')
            .optional(),

        facultyId: z.string()
            .uuid('Invalid faculty ID format')
            .optional(),

        departmentHeadId: z.string()
            .uuid('Invalid department head ID format')
            .optional()
            .nullable(),

        isActingHead: z.boolean().optional(),

        status: z.boolean().optional(),
    }),
});

export const getDepartmentByIdSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Department ID is required',
        })
        .uuid('Invalid department ID format'),
    }),
});

export const deleteDepartmentSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Department ID is required',
        })
        .uuid('Invalid department ID format'),
    }),
});

export const getDepartmentsSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
        limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
        facultyId: z.string().uuid().optional(),
        status: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
        search: z.string().optional(),
    }),
});

export const assignDepartmentHeadSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Department ID is required',
        })
        .uuid('Invalid department ID format'),
    }),
    body: z.object({
        headId: z.string({
            required_error: 'Head ID is required',
        })
        .uuid('Invalid head ID format'),
        isActingHead: z.boolean().optional().default(false),
    }),
});

export const removeDepartmentHeadSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Department ID is required',
        })
        .uuid('Invalid department ID format'),
    }),
});

