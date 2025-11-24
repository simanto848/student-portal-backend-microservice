import { z } from 'zod';

export const submitToCommitteeSchema = z.object({
    body: z.object({
        batchId: z.string().min(1, 'Batch ID is required'),
        courseId: z.string().min(1, 'Course ID is required'),
        semester: z.number().min(1, 'Semester is required')
    })
});

export const approveByCommitteeSchema = z.object({
    body: z.object({
        comment: z.string().optional()
    })
});

export const returnToTeacherSchema = z.object({
    body: z.object({
        comment: z.string().min(1, 'Comment is required')
    })
});

export const requestReturnSchema = z.object({
    body: z.object({
        comment: z.string().min(1, 'Comment is required')
    })
});
