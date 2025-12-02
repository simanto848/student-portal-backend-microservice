import { z } from 'zod';

// user action
export const createReservationValidation = z.object({
    body: z.object({
        copyId: z.string().min(1, 'Copy ID is required').trim(),
        libraryId: z.string().min(1, 'Library ID is required').trim(),
        userId: z.string().min(1, 'User ID is required').trim(),
        userType: z.enum(['student', 'teacher', 'staff']),
        notes: z.string().optional().default(''),
    })
});

// user action
export const cancelReservationValidation = z.object({
    body: z.object({
        notes: z.string().optional().default(''),
    }).optional().default({})
});

// staff action - when user picks up the book
export const fulfillReservationValidation = z.object({
    body: z.object({
        notes: z.string().optional().default(''),
    }).optional().default({})
});

// admin/library staff action
export const updateReservationValidation = z.object({
    body: z.object({
        status: z.enum(['pending', 'fulfilled', 'expired', 'cancelled'], {
            errorMap: () => ({ message: 'Status must be pending, fulfilled, expired, or cancelled' })
        }).optional(),
        notes: z.string().optional(),
        expiryDate: z.coerce.date().optional(),
    })
});
