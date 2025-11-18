import { z } from 'zod';

export const createAttendanceSchema = z.object({
    body: z.object({
        enrollmentId: z.string().uuid('Invalid enrollment ID format'),
        date: z.string().datetime('Invalid date format').or(z.date()),
        status: z.enum(['present', 'absent', 'late', 'excused']),
        remarks: z.string().max(500, 'Remarks cannot exceed 500 characters').optional(),
    }),
});

export const bulkAttendanceSchema = z.object({
    body: z.object({
        courseId: z.string().uuid('Invalid course ID format'),
        batchId: z.string().uuid('Invalid batch ID format'),
        date: z.string().datetime('Invalid date format').or(z.date()),
        attendances: z.array(z.object({
            studentId: z.string().uuid('Invalid student ID format'),
            status: z.enum(['present', 'absent', 'late', 'excused']),
            remarks: z.string().max(500).optional(),
        })).min(1, 'At least one attendance record is required'),
    }),
});

export const updateAttendanceSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid ID format'),
    }),
    body: z.object({
        status: z.enum(['present', 'absent', 'late', 'excused']).optional(),
        remarks: z.string().max(500, 'Remarks cannot exceed 500 characters').optional(),
    }),
});

export const getAttendanceSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid ID format'),
    }),
});

export const listAttendanceSchema = z.object({
    query: z.object({
        studentId: z.string().uuid('Invalid student ID format').optional(),
        courseId: z.string().uuid('Invalid course ID format').optional(),
        batchId: z.string().uuid('Invalid batch ID format').optional(),
        startDate: z.string().datetime('Invalid start date format').optional(),
        endDate: z.string().datetime('Invalid end date format').optional(),
        status: z.enum(['present', 'absent', 'late', 'excused']).optional(),
    }),
});
