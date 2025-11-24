import { z } from 'zod';

export const addMemberSchema = z.object({
    body: z.object({
        departmentId: z.string().min(1, 'Department ID is required'),
        teacherId: z.string().min(1, 'Teacher ID is required'),
        batchId: z.string().optional().nullable()
    })
});
