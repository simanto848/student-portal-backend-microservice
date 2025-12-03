import { z } from 'zod';

export const borrowBookValidation = z.object({
    body: z.object({
        userType: z.enum(['student', 'teacher', 'staff', 'admin'], {
            errorMap: () => ({ message: 'User type must be student, teacher, staff, or admin' })
        }),
        borrowerId: z.string().min(1, 'Borrower ID is required').trim(),
        copyId: z.string().min(1, 'Copy ID is required').trim(),
        libraryId: z.string().min(1, 'Library ID is required').trim(),
        notes: z.string().optional().default(''),
        dueDate: z.coerce.date().optional(),
    })
});

export const returnBookValidation = z.object({
    body: z.object({
        notes: z.string().optional().default(''),
    }).optional().default({})
});

// Validation for updating borrowing status (admin/library staff action)
export const updateBorrowingValidation = z.object({
    body: z.object({
        userType: z.enum(['student', 'teacher', 'staff', 'admin'], {
            errorMap: () => ({ message: 'User type must be student, teacher, staff, or admin' })
        }).optional(),
        borrowerId: z.string().trim().optional(),
        copyId: z.string().trim().optional(),
        libraryId: z.string().trim().optional(),
        status: z.enum(['borrowed', 'returned', 'overdue', 'lost'], {
            errorMap: () => ({ message: 'Status must be borrowed, returned, overdue, or lost' })
        }).optional(),
        fineAmount: z.number().min(0, 'Fine amount cannot be negative').optional(),
        finePaid: z.boolean().optional(),
        notes: z.string().optional(),
        returnDate: z.coerce.date().nullable().optional(),
        dueDate: z.coerce.date().optional(),
    })
});