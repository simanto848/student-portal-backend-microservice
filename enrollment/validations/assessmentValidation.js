import { z } from 'zod';

export const createAssessmentSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
        description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
        courseId: z.string().uuid('Invalid course ID format'),
        batchId: z.string().uuid('Invalid batch ID format'),
        semester: z.number().int().min(1, 'Semester must be at least 1'),
        assessmentTypeId: z.string().uuid('Invalid assessment type ID format'),
        totalMarks: z.number().min(0, 'Total marks must be non-negative'),
        weightage: z.number().min(0).max(100, 'Weightage must be between 0 and 100'),
        dueDate: z.string().datetime('Invalid due date format').or(z.date()).optional(),
        status: z.enum(['draft', 'published', 'closed', 'graded']).optional(),
    }),
});

export const updateAssessmentSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid ID format'),
    }),
    body: z.object({
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional(),
        totalMarks: z.number().min(0).optional(),
        weightage: z.number().min(0).max(100).optional(),
        dueDate: z.string().datetime().or(z.date()).optional(),
        status: z.enum(['draft', 'published', 'closed', 'graded']).optional(),
    }),
});

export const getAssessmentSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid ID format'),
    }),
});

export const listAssessmentsSchema = z.object({
    query: z.object({
        courseId: z.string().uuid('Invalid course ID format').optional(),
        batchId: z.string().uuid('Invalid batch ID format').optional(),
        semester: z.string().regex(/^\d+$/, 'Semester must be a number').optional(),
        instructorId: z.string().uuid('Invalid instructor ID format').optional(),
        status: z.enum(['draft', 'published', 'closed', 'graded']).optional(),
    }),
});
