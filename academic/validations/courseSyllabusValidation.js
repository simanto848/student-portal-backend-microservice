import { z } from 'zod';

export const createCourseSyllabusSchema = z.object({
    body: z.object({
        sessionCourseId: z.string({
            required_error: 'SessionCourse ID is required',
        })
        .uuid('Invalid sessionCourse ID format'),

        version: z.string()
            .regex(/^\d+\.\d+$/, 'Version must be in format X.Y (e.g., 1.0, 2.1)')
            .optional()
            .default('1.0'),

        overview: z.string()
            .max(2000, 'Overview must not exceed 2000 characters')
            .optional(),

        objectives: z.string()
            .max(2000, 'Objectives must not exceed 2000 characters')
            .optional(),

        prerequisites: z.string()
            .max(1000, 'Prerequisites must not exceed 1000 characters')
            .optional(),

        textbooks: z.array(z.object({
            title: z.string(),
            author: z.string().optional(),
            edition: z.string().optional(),
            isbn: z.string().optional(),
            required: z.boolean().optional().default(true),
        })).optional(),

        gradingPolicy: z.string()
            .max(2000, 'Grading policy must not exceed 2000 characters')
            .optional(),

        assessmentBreakdown: z.object({
            midterm: z.number().min(0).max(100).optional(),
            final: z.number().min(0).max(100).optional(),
            assignments: z.number().min(0).max(100).optional(),
            quizzes: z.number().min(0).max(100).optional(),
            project: z.number().min(0).max(100).optional(),
            participation: z.number().min(0).max(100).optional(),
            lab: z.number().min(0).max(100).optional(),
        }).optional(),

        weeklySchedule: z.array(z.object({
            week: z.number().int().min(1),
            topic: z.string(),
            readings: z.string().optional(),
            assignments: z.string().optional(),
        })).optional(),

        additionalResources: z.array(z.object({
            type: z.enum(['book', 'article', 'video', 'website', 'other']).optional(),
            title: z.string(),
            url: z.string().url().optional(),
            description: z.string().optional(),
        })).optional(),

        policies: z.string()
            .max(2000, 'Policies must not exceed 2000 characters')
            .optional(),

        status: z.enum(['Draft', 'Pending Approval', 'Approved', 'Published', 'Archived'])
            .optional()
            .default('Draft'),

        createdById: z.string()
            .uuid('Invalid creator ID format')
            .optional(),
    }),
});

export const updateCourseSyllabusSchema = z.object({
    body: z.object({
        sessionCourseId: z.string()
            .uuid('Invalid sessionCourse ID format')
            .optional(),

        version: z.string()
            .regex(/^\d+\.\d+$/, 'Version must be in format X.Y (e.g., 1.0, 2.1)')
            .optional(),

        overview: z.string()
            .max(2000, 'Overview must not exceed 2000 characters')
            .optional(),

        objectives: z.string()
            .max(2000, 'Objectives must not exceed 2000 characters')
            .optional(),

        prerequisites: z.string()
            .max(1000, 'Prerequisites must not exceed 1000 characters')
            .optional(),

        textbooks: z.array(z.object({
            title: z.string(),
            author: z.string().optional(),
            edition: z.string().optional(),
            isbn: z.string().optional(),
            required: z.boolean().optional().default(true),
        })).optional(),

        gradingPolicy: z.string()
            .max(2000, 'Grading policy must not exceed 2000 characters')
            .optional(),

        assessmentBreakdown: z.object({
            midterm: z.number().min(0).max(100).optional(),
            final: z.number().min(0).max(100).optional(),
            assignments: z.number().min(0).max(100).optional(),
            quizzes: z.number().min(0).max(100).optional(),
            project: z.number().min(0).max(100).optional(),
            participation: z.number().min(0).max(100).optional(),
            lab: z.number().min(0).max(100).optional(),
        }).optional(),

        weeklySchedule: z.array(z.object({
            week: z.number().int().min(1),
            topic: z.string(),
            readings: z.string().optional(),
            assignments: z.string().optional(),
        })).optional(),

        additionalResources: z.array(z.object({
            type: z.enum(['book', 'article', 'video', 'website', 'other']).optional(),
            title: z.string(),
            url: z.string().url().optional(),
            description: z.string().optional(),
        })).optional(),

        policies: z.string()
            .max(2000, 'Policies must not exceed 2000 characters')
            .optional(),

        status: z.enum(['Draft', 'Pending Approval', 'Approved', 'Published', 'Archived'])
            .optional(),
    }),
});

export const getCourseSyllabusByIdSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'CourseSyllabus ID is required',
        })
        .uuid('Invalid courseSyllabus ID format'),
    }),
});

export const deleteCourseSyllabusSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'CourseSyllabus ID is required',
        })
        .uuid('Invalid courseSyllabus ID format'),
    }),
});

export const getCourseSyllabusesSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
        limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
        sessionCourseId: z.string().uuid().optional(),
        status: z.enum(['Draft', 'Pending Approval', 'Approved', 'Published', 'Archived']).optional(),
        search: z.string().optional(),
    }),
});

export const approveSyllabusSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'CourseSyllabus ID is required',
        })
        .uuid('Invalid courseSyllabus ID format'),
    }),
    body: z.object({
        approvedById: z.string({
            required_error: 'Approver ID is required',
        })
        .uuid('Invalid approver ID format'),
    }),
});

export const publishSyllabusSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'CourseSyllabus ID is required',
        })
        .uuid('Invalid courseSyllabus ID format'),
    }),
    body: z.object({
        publishedById: z.string({
            required_error: 'Publisher ID is required',
        })
        .uuid('Invalid publisher ID format'),
    }),
});

