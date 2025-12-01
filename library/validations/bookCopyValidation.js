import { z } from 'zod';

export const bookCopyCreateValidation = z.object({
    body: z.object({
        copyNumber: z.string().min(1, 'Copy number is required').max(50, 'Copy number cannot exceed 50 characters').trim(),
        bookId: z.string().min(1, 'Book ID is required'),
        libraryId: z.string().min(1, 'Library ID is required'),
        acquisitionDate: z.preprocess((val) => {
            if (val === undefined || val === null || val === '') return null;
            if (val instanceof Date) return val;
            if (typeof val === 'string' || typeof val === 'number') {
                const d = new Date(val);
                return isNaN(d.getTime()) ? null : d;
            }
            return null;
        }, z.date().nullable().optional()),
        condition: z.enum(['excellent', 'good', 'fair', 'poor', 'damaged'], {
            errorMap: () => ({ message: 'Condition must be excellent, good, fair, poor, or damaged' })
        }).default('good'),
        location: z.string().max(100, 'Location cannot exceed 100 characters').trim().optional(),
        status: z.enum(['available', 'borrowed', 'reserved', 'maintenance', 'lost'], {
            errorMap: () => ({ message: 'Status must be available, borrowed, reserved, maintenance, or lost' })
        }).default('available'),
        notes: z.string().optional().default(''),
    })
});

export const bookCopyUpdateValidation = z.object({
    body: z.object({
        copyNumber: z.string().min(1, 'Copy number is required').max(50, 'Copy number cannot exceed 50 characters').trim().optional(),
        bookId: z.string().min(1, 'Book ID is required').optional(),
        libraryId: z.string().min(1, 'Library ID is required').optional(),
        acquisitionDate: z.preprocess((val) => {
            if (val === undefined || val === null || val === '') return null;
            if (val instanceof Date) return val;
            if (typeof val === 'string' || typeof val === 'number') {
                const d = new Date(val);
                return isNaN(d.getTime()) ? null : d;
            }
            return null;
        }, z.date().nullable().optional()),
        condition: z.enum(['excellent', 'good', 'fair', 'poor', 'damaged'], {
            errorMap: () => ({ message: 'Condition must be excellent, good, fair, poor, or damaged' })
        }).optional(),
        location: z.string().max(100, 'Location cannot exceed 100 characters').trim().optional(),
        status: z.enum(['available', 'borrowed', 'reserved', 'maintenance', 'lost'], {
            errorMap: () => ({ message: 'Status must be available, borrowed, reserved, maintenance, or lost' })
        }).optional(),
        notes: z.string().optional(),
    })
});