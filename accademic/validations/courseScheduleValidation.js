import { z } from 'zod';

export const createCourseScheduleSchema = z.object({
    body: z.object({
        batchId: z.string({
            required_error: 'Batch ID is required',
        })
        .uuid('Invalid batch ID format'),

        sessionCourseId: z.string({
            required_error: 'SessionCourse ID is required',
        })
        .uuid('Invalid sessionCourse ID format'),

        teacherId: z.string({
            required_error: 'Teacher ID is required',
        })
        .uuid('Invalid teacher ID format'),

        dayOfWeek: z.enum([
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
        ], {
            required_error: 'Day of week is required',
        }),

        startTime: z.string({
            required_error: 'Start time is required',
        })
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM (24-hour format)'),

        endTime: z.string({
            required_error: 'End time is required',
        })
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM (24-hour format)'),

        roomNumber: z.string()
            .uuid('Invalid classroom ID format')
            .optional(),

        building: z.string()
            .max(100, 'Building name must not exceed 100 characters')
            .optional(),

        isRecurring: z.boolean().optional().default(true),

        startDate: z.string({
            required_error: 'Start date is required',
        })
        .datetime({ message: 'Invalid start date format' })
        .or(z.date()),

        endDate: z.string()
            .datetime({ message: 'Invalid end date format' })
            .or(z.date())
            .optional(),

        classType: z.enum([
            'Lecture',
            'Tutorial',
            'Lab',
            'Seminar',
            'Workshop',
            'Other'
        ]).optional().default('Lecture'),

        isActive: z.boolean().optional().default(true),
    })
    .refine((data) => {
        const [startHour, startMin] = data.startTime.split(':').map(Number);
        const [endHour, endMin] = data.endTime.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        return endMinutes > startMinutes;
    }, {
        message: 'End time must be after start time',
        path: ['endTime'],
    })
    .refine((data) => {
        if (data.endDate) {
            const start = new Date(data.startDate);
            const end = new Date(data.endDate);
            return end > start;
        }
        return true;
    }, {
        message: 'End date must be after start date',
        path: ['endDate'],
    }),
});

export const updateCourseScheduleSchema = z.object({
    body: z.object({
        batchId: z.string()
            .uuid('Invalid batch ID format')
            .optional(),

        sessionCourseId: z.string()
            .uuid('Invalid sessionCourse ID format')
            .optional(),

        teacherId: z.string()
            .uuid('Invalid teacher ID format')
            .optional(),

        dayOfWeek: z.enum([
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
        ]).optional(),

        startTime: z.string()
            .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM (24-hour format)')
            .optional(),

        endTime: z.string()
            .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM (24-hour format)')
            .optional(),

        roomNumber: z.string()
            .uuid('Invalid classroom ID format')
            .optional()
            .nullable(),

        building: z.string()
            .max(100, 'Building name must not exceed 100 characters')
            .optional(),

        isRecurring: z.boolean().optional(),

        startDate: z.string()
            .datetime({ message: 'Invalid start date format' })
            .or(z.date())
            .optional(),

        endDate: z.string()
            .datetime({ message: 'Invalid end date format' })
            .or(z.date())
            .optional()
            .nullable(),

        classType: z.enum([
            'Lecture',
            'Tutorial',
            'Lab',
            'Seminar',
            'Workshop',
            'Other'
        ]).optional(),

        isActive: z.boolean().optional(),
    })
    .refine((data) => {
        if (data.startTime && data.endTime) {
            const [startHour, startMin] = data.startTime.split(':').map(Number);
            const [endHour, endMin] = data.endTime.split(':').map(Number);
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            return endMinutes > startMinutes;
        }
        return true;
    }, {
        message: 'End time must be after start time',
        path: ['endTime'],
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
    }),
});

export const getCourseScheduleByIdSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'CourseSchedule ID is required',
        })
        .uuid('Invalid courseSchedule ID format'),
    }),
});

export const deleteCourseScheduleSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'CourseSchedule ID is required',
        })
        .uuid('Invalid courseSchedule ID format'),
    }),
});

export const getCourseSchedulesSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
        limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
        batchId: z.string().uuid().optional(),
        sessionCourseId: z.string().uuid().optional(),
        teacherId: z.string().uuid().optional(),
        dayOfWeek: z.enum([
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
        ]).optional(),
        classType: z.enum([
            'Lecture',
            'Tutorial',
            'Lab',
            'Seminar',
            'Workshop',
            'Other'
        ]).optional(),
        isActive: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
        search: z.string().optional(),
    }),
});

export const getBatchScheduleSchema = z.object({
    params: z.object({
        batchId: z.string({
            required_error: 'Batch ID is required',
        })
        .uuid('Invalid batch ID format'),
    }),
});

export const getTeacherScheduleSchema = z.object({
    params: z.object({
        teacherId: z.string({
            required_error: 'Teacher ID is required',
        })
        .uuid('Invalid teacher ID format'),
    }),
});

