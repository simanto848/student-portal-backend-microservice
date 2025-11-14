import { z } from 'zod';

export const createCoursePrerequisiteSchema = z.object({
    body: z.object({
        courseId: z.string({
            required_error: 'Course ID is required',
        })
        .uuid('Invalid course ID format'),

        prerequisiteId: z.string({
            required_error: 'Prerequisite course ID is required',
        })
        .uuid('Invalid prerequisite course ID format'),
    })
    .refine((data) => {
        return data.courseId !== data.prerequisiteId;
    }, {
        message: 'A course cannot be a prerequisite of itself',
        path: ['prerequisiteId'],
    }),
});

export const getCoursePrerequisiteByIdSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'CoursePrerequisite ID is required',
        })
        .uuid('Invalid coursePrerequisite ID format'),
    }),
});

export const deleteCoursePrerequisiteSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'CoursePrerequisite ID is required',
        })
        .uuid('Invalid coursePrerequisite ID format'),
    }),
});

export const getCoursePrerequisitesSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
        limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
        courseId: z.string().uuid().optional(),
        prerequisiteId: z.string().uuid().optional(),
    }),
});

export const getPrerequisitesByCourseSchema = z.object({
    params: z.object({
        courseId: z.string({
            required_error: 'Course ID is required',
        })
        .uuid('Invalid course ID format'),
    }),
});

