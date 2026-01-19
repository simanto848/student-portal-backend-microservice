import { z } from 'zod';

export const bookCreateValidation = z.object({
    body: z.object({
        title: z.string().min(1, 'Book title is required').max(100, 'Title cannot exceed 100 characters').trim(),
        author: z.string().min(1, 'Author name is required').max(100, 'Author name cannot exceed 100 characters').trim(),
        isbn: z.string().max(20, 'ISBN cannot exceed 20 characters').trim().optional(),
        publisher: z.string().max(100, 'Publisher name cannot exceed 100 characters').trim().optional(),
        publicationYear: z.number().min(1000, 'Publication year must be valid').max(new Date().getFullYear() + 1, 'Publication year cannot be in the future').optional(),
        edition: z.string().max(50, 'Edition cannot exceed 50 characters').trim().optional(),
        category: z.string().min(1, 'Category is required').max(50, 'Category cannot exceed 50 characters').trim(),
        subject: z.string().max(100, 'Subject cannot exceed 100 characters').trim().optional(),
        description: z.string().optional().default(''),
        language: z.string().max(30, 'Language cannot exceed 30 characters').trim().default('English'),
        pages: z.number().min(1, 'Pages must be at least 1').optional(),
        price: z.number().min(0, 'Price cannot be negative').optional(),
        status: z.enum(['active', 'inactive', 'archived'], {
            errorMap: () => ({ message: 'Status must be active, inactive, or archived' })
        }).default('active'),
        libraryId: z.string().min(1, 'Library ID is required'),
        numberOfCopies: z.number().min(0, 'Number of copies cannot be negative').optional().default(0),
        copyCondition: z.enum(['excellent', 'good', 'fair', 'poor', 'damaged']).optional().default('excellent'),
        copyLocation: z.string().max(100, 'Location cannot exceed 100 characters').optional().default(''),
    })
});

export const bookUpdateValidation = z.object({
    body: z.object({
        title: z.string().min(1, 'Book title is required').max(100, 'Title cannot exceed 100 characters').trim().optional(),
        author: z.string().min(1, 'Author name is required').max(100, 'Author name cannot exceed 100 characters').trim().optional(),
        isbn: z.string().max(20, 'ISBN cannot exceed 20 characters').trim().optional(),
        publisher: z.string().max(100, 'Publisher name cannot exceed 100 characters').trim().optional(),
        publicationYear: z.number().min(1000, 'Publication year must be valid').max(new Date().getFullYear() + 1, 'Publication year cannot be in the future').optional(),
        edition: z.string().max(50, 'Edition cannot exceed 50 characters').trim().optional(),
        category: z.string().min(1, 'Category is required').max(50, 'Category cannot exceed 50 characters').trim().optional(),
        subject: z.string().max(100, 'Subject cannot exceed 100 characters').trim().optional(),
        description: z.string().optional(),
        language: z.string().max(30, 'Language cannot exceed 30 characters').trim().optional(),
        pages: z.number().min(1, 'Pages must be at least 1').optional(),
        price: z.number().min(0, 'Price cannot be negative').optional(),
        status: z.enum(['active', 'inactive', 'archived'], {
            errorMap: () => ({ message: 'Status must be active, inactive, or archived' })
        }).optional(),
        libraryId: z.string().min(1, 'Library ID is required').optional(),
    })
});