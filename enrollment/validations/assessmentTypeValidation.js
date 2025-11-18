import { z } from 'zod';

export const createAssessmentTypeSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
        description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
        defaultWeightage: z.number().min(0).max(100).optional(),
    }),
});

export const updateAssessmentTypeSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid ID format'),
    }),
    body: z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(1000).optional(),
        defaultWeightage: z.number().min(0).max(100).optional(),
    }),
});

export const getAssessmentTypeSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid ID format'),
    }),
});
