import { z } from 'zod';

export const createBatchSchema = z.object({
    body: z.object({
        name: z.string({
            required_error: 'Batch name is required',
        })
        .min(3, 'Batch name must be at least 3 characters')
        .max(50, 'Batch name must not exceed 50 characters')
        .trim(),
        
        year: z.number({
            required_error: 'Year is required',
        })
        .int('Year must be an integer')
        .min(2000, 'Year must be 2000 or later')
        .max(2100, 'Year must be 2100 or earlier'),
        
        programId: z.string({
            required_error: 'Program ID is required',
        })
        .uuid('Invalid program ID format'),
        
        departmentId: z.string({
            required_error: 'Department ID is required',
        })
        .uuid('Invalid department ID format'),
        
        sessionId: z.string({
            required_error: 'Session ID is required',
        })
        .uuid('Invalid session ID format'),
        
        counselorId: z.string()
            .uuid('Invalid counselor ID format')
            .optional(),
        
        currentSemester: z.number()
            .int('Current semester must be an integer')
            .min(1, 'Current semester must be at least 1')
            .optional()
            .default(1),
        
        startDate: z.string()
            .datetime({ message: 'Invalid start date format' })
            .or(z.date())
            .optional(),
        
        endDate: z.string()
            .datetime({ message: 'Invalid end date format' })
            .or(z.date())
            .optional(),
        
        maxStudents: z.number({
            required_error: 'Max students is required',
        })
        .int('Max students must be an integer')
        .min(1, 'Max students must be at least 1')
        .max(500, 'Max students must not exceed 500')
        .default(50),
        
        currentStudents: z.number()
            .int('Current students must be an integer')
            .min(0, 'Current students must be at least 0')
            .optional()
            .default(0),
        
        status: z.boolean().optional().default(true),
    })
    .refine((data) => {
        if (data.startDate && data.endDate) {
            const start = new Date(data.startDate);
            const end = new Date(data.endDate);
            return end > start;
        }
        return true;
    }, {
        message: 'End date must be after start date',
        path: ['endDate'],
    })
    .refine((data) => {
        return data.currentStudents <= data.maxStudents;
    }, {
        message: 'Current students cannot exceed max students',
        path: ['currentStudents'],
    }),
});

export const updateBatchSchema = z.object({
    body: z.object({
        name: z.string()
            .min(3, 'Batch name must be at least 3 characters')
            .max(50, 'Batch name must not exceed 50 characters')
            .trim()
            .optional(),
        
        year: z.number()
            .int('Year must be an integer')
            .min(2000, 'Year must be 2000 or later')
            .max(2100, 'Year must be 2100 or earlier')
            .optional(),
        
        programId: z.string()
            .uuid('Invalid program ID format')
            .optional(),
        
        departmentId: z.string()
            .uuid('Invalid department ID format')
            .optional(),
        
        sessionId: z.string()
            .uuid('Invalid session ID format')
            .optional(),
        
        counselorId: z.string()
            .uuid('Invalid counselor ID format')
            .optional()
            .nullable(),
        
        currentSemester: z.number()
            .int('Current semester must be an integer')
            .min(1, 'Current semester must be at least 1')
            .optional(),
        
        startDate: z.string()
            .datetime({ message: 'Invalid start date format' })
            .or(z.date())
            .optional(),
        
        endDate: z.string()
            .datetime({ message: 'Invalid end date format' })
            .or(z.date())
            .optional(),
        
        maxStudents: z.number()
            .int('Max students must be an integer')
            .min(1, 'Max students must be at least 1')
            .max(500, 'Max students must not exceed 500')
            .optional(),
        
        currentStudents: z.number()
            .int('Current students must be an integer')
            .min(0, 'Current students must be at least 0')
            .optional(),
        
        status: z.enum(['active', 'inactive']).optional(),
    })
    .refine((data) => {
        if (data.startDate && data.endDate) {
            const start = new Date(data.startDate);
            const end = new Date(data.endDate);
            return end > start;
        }
        return true;
    }, {
        message: 'End date must be after start date',
        path: ['endDate'],
    })
    .refine((data) => {
        if (data.currentStudents !== undefined && data.maxStudents !== undefined) {
            return data.currentStudents <= data.maxStudents;
        }
        return true;
    }, {
        message: 'Current students cannot exceed max students',
        path: ['currentStudents'],
    }),
});

export const getBatchByIdSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Batch ID is required',
        })
        .uuid('Invalid batch ID format'),
    }),
});

export const deleteBatchSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Batch ID is required',
        })
        .uuid('Invalid batch ID format'),
    }),
});

export const getBatchesSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
        limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
        year: z.string().regex(/^\d+$/).transform(Number).optional(),
        programId: z.string().uuid().optional(),
        departmentId: z.string().uuid().optional(),
        sessionId: z.string().uuid().optional(),
        counselorId: z.string().uuid().optional(),
        status: z.enum(['active', 'inactive']).optional(),
        search: z.string().optional(),
    }),
});

export const assignCounselorSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Batch ID is required',
        })
        .uuid('Invalid batch ID format'),
    }),
    body: z.object({
        counselorId: z.string({
            required_error: 'Counselor ID is required',
        })
        .uuid('Invalid counselor ID format'),
    }),
});

export const updateSemesterSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Batch ID is required',
        })
        .uuid('Invalid batch ID format'),
    }),
    body: z.object({
        currentSemester: z.number({
            required_error: 'Current semester is required',
        })
        .int('Current semester must be an integer')
        .min(1, 'Current semester must be at least 1')
        .max(12, 'Current semester must not exceed 12'),
    }),
});

export const assignClassRepresentativeSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Batch ID is required',
        })
        .uuid('Invalid batch ID format'),
    }),
    body: z.object({
        studentId: z.string({
            required_error: 'Student ID is required',
        })
        .uuid('Invalid student ID format'),
    }),
});

