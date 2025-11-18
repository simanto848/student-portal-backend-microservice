import { z } from 'zod';

export const createSubmissionSchema = z.object({
    body: z.object({
        assessmentId: z.string().uuid('Invalid assessment ID format'),
        enrollmentId: z.string().uuid('Invalid enrollment ID format'),
        content: z.string().max(10000, 'Content cannot exceed 10000 characters').optional(),
        attachments: z.array(z.object({
            filename: z.string(),
            url: z.string().url('Invalid URL format'),
        })).optional(),
    }),
});

export const updateSubmissionSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid ID format'),
    }),
    body: z.object({
        content: z.string().max(10000).optional(),
        attachments: z.array(z.object({
            filename: z.string(),
            url: z.string().url(),
        })).optional(),
    }),
});

export const gradeSubmissionSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid ID format'),
    }),
    body: z.object({
        marksObtained: z.number().min(0, 'Marks must be non-negative'),
        feedback: z.string().max(2000, 'Feedback cannot exceed 2000 characters').optional(),
    }),
});

export const getSubmissionSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid ID format'),
    }),
});

export const listSubmissionsSchema = z.object({
    query: z.object({
        assessmentId: z.string().uuid('Invalid assessment ID format').optional(),
        studentId: z.string().uuid('Invalid student ID format').optional(),
        status: z.enum(['submitted', 'graded', 'pending', 'late']).optional(),
    }),
});
