import { z } from 'zod';

export const libraryCreateValidation = z.object({
    body: z.object({
        name: z.string().min(1, 'Library name is required').max(100, 'Library name cannot exceed 100 characters').trim(),
        code: z.string().min(1, 'Library code is required').max(50, 'Library code cannot exceed 50 characters').trim().toUpperCase(),
        description: z.string().optional().default(''),
        address: z.string().optional().default(''),
        phone: z.string().max(20, 'Phone number cannot exceed 20 characters').optional(),
        email: z.string().email('Please provide a valid email address').max(100, 'Email cannot exceed 100 characters').optional(),
        operatingHours: z.record(z.string(), z.string()).optional().default({}),
        maxBorrowLimit: z.number().min(1, 'Maximum borrow limit must be at least 1').default(3),
        borrowDuration: z.number().min(1, 'Borrow duration must be at least 1 day').default(14),
        finePerDay: z.number().min(0, 'Fine per day cannot be negative').optional().nullable(),
        status: z.enum(['active', 'inactive', 'maintenance'], {
            errorMap: () => ({ message: 'Status must be either active, inactive, or maintenance' })
        }).default('active'),
    })
});

export const libraryUpdateValidation = z.object({
    body: z.object({
        name: z.string().min(1, 'Library name is required').max(100, 'Library name cannot exceed 100 characters').trim().optional(),
        code: z.string().min(1, 'Library code is required').max(50, 'Library code cannot exceed 50 characters').trim().toUpperCase().optional(),
        description: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().max(20, 'Phone number cannot exceed 20 characters').optional(),
        email: z.string().email('Please provide a valid email address').max(100, 'Email cannot exceed 100 characters').optional(),
        operatingHours: z.record(z.string(), z.string()).optional(),
        maxBorrowLimit: z.number().min(1, 'Maximum borrow limit must be at least 1').optional(),
        borrowDuration: z.number().min(1, 'Borrow duration must be at least 1 day').optional(),
        finePerDay: z.number().min(0, 'Fine per day cannot be negative').optional().nullable(),
        status: z.enum(['active', 'inactive', 'maintenance'], {
            errorMap: () => ({ message: 'Status must be either active, inactive, or maintenance' })
        }).optional(),
    })
});

