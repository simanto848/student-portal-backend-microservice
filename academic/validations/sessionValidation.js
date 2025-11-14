import { z } from 'zod';

export const createSessionSchema = z.object({
    body: z.object({
        name: z.string({
            required_error: 'Session name is required',
        })
        .min(3, 'Session name must be at least 3 characters')
        .max(50, 'Session name must not exceed 50 characters')
        .trim(),
        
        year: z.number({
            required_error: 'Year is required',
        })
        .int('Year must be an integer')
        .min(2000, 'Year must be 2000 or later')
        .max(2100, 'Year must be 2100 or earlier'),
        
        startDate: z.string({
            required_error: 'Start date is required',
        })
        .datetime({ message: 'Invalid start date format' })
        .or(z.date()),
        
        endDate: z.string({
            required_error: 'End date is required',
        })
        .datetime({ message: 'Invalid end date format' })
        .or(z.date()),
        
        status: z.boolean().optional().default(true),
    })
    .refine((data) => {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return end > start;
    }, {
        message: 'End date must be after start date',
        path: ['endDate'],
    }),
});

export const updateSessionSchema = z.object({
    body: z.object({
        name: z.string()
            .min(3, 'Session name must be at least 3 characters')
            .max(50, 'Session name must not exceed 50 characters')
            .trim()
            .optional(),
        
        year: z.number()
            .int('Year must be an integer')
            .min(2000, 'Year must be 2000 or later')
            .max(2100, 'Year must be 2100 or earlier')
            .optional(),
        
        startDate: z.string()
            .datetime({ message: 'Invalid start date format' })
            .or(z.date())
            .optional(),
        
        endDate: z.string()
            .datetime({ message: 'Invalid end date format' })
            .or(z.date())
            .optional(),
        
        status: z.boolean().optional(),
    })
    .refine((data) => {
        if (data.startDate && data.endDate) {
            const start = new Date(data.startDate);
            const end = new Date(data.endDate);
            return end > start;
        }
        return true;
    }, {
        message: 'End date must be after start date',
        path: ['endDate'],
    }),
});

export const getSessionByIdSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Session ID is required',
        })
        .uuid('Invalid session ID format'),
    }),
});

export const deleteSessionSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Session ID is required',
        })
        .uuid('Invalid session ID format'),
    }),
});

export const getSessionsSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
        limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
        year: z.string().regex(/^\d+$/).transform(Number).optional(),
        status: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
        search: z.string().optional(),
    }),
});

