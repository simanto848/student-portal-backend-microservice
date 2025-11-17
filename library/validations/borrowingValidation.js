import { z } from 'zod';

export const borrowBookValidation = z.object({
    copyId: z.string().min(1, 'Copy ID is required'),
    notes: z.string().optional().default(''),
});

export const returnBookValidation = z.object({
    notes: z.string().optional().default(''),
});

export const updateBorrowingValidation = z.object({
    status: z.enum(['borrowed', 'returned', 'overdue', 'lost'], {
        errorMap: () => ({ message: 'Status must be borrowed, returned, overdue, or lost' })
    }).optional(),
    fineAmount: z.number().min(0, 'Fine amount cannot be negative').optional(),
    finePaid: z.boolean().optional(),
    notes: z.string().optional(),
    returnDate: z.preprocess((val) => {
        if (val === undefined || val === null || val === '') return null;
        if (val instanceof Date) return val;
        if (typeof val === 'string' || typeof val === 'number') {
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
        }
        return null;
    }, z.date().nullable().optional()),
});
