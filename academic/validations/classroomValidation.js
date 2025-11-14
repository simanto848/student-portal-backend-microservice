import { z } from 'zod';

export const createClassroomSchema = z.object({
    body: z.object({
        roomNumber: z.string({
            required_error: 'Room number is required',
        })
        .min(1, 'Room number must be at least 1 character')
        .max(20, 'Room number must not exceed 20 characters')
        .trim(),

        buildingName: z.string({
            required_error: 'Building name is required',
        })
        .min(1, 'Building name must be at least 1 character')
        .max(50, 'Building name must not exceed 50 characters')
        .trim(),

        floor: z.number()
            .int('Floor must be an integer')
            .optional(),

        capacity: z.number({
            required_error: 'Capacity is required',
        })
        .int('Capacity must be an integer')
        .min(1, 'Capacity must be at least 1')
        .max(1000, 'Capacity must not exceed 1000'),

        roomType: z.enum([
            'Lecture Hall',
            'Laboratory',
            'Seminar Room',
            'Computer Lab',
            'Conference Room',
            'Virtual',
            'Other'
        ]).optional().default('Lecture Hall'),

        facilities: z.string()
            .max(500, 'Facilities description must not exceed 500 characters')
            .optional(),

        isActive: z.boolean().optional().default(true),

        isUnderMaintenance: z.boolean().optional().default(false),

        maintenanceNotes: z.string()
            .max(500, 'Maintenance notes must not exceed 500 characters')
            .optional(),
    }),
});

export const updateClassroomSchema = z.object({
    body: z.object({
        roomNumber: z.string()
            .min(1, 'Room number must be at least 1 character')
            .max(20, 'Room number must not exceed 20 characters')
            .trim()
            .optional(),

        buildingName: z.string()
            .min(1, 'Building name must be at least 1 character')
            .max(50, 'Building name must not exceed 50 characters')
            .trim()
            .optional(),

        floor: z.number()
            .int('Floor must be an integer')
            .optional(),

        capacity: z.number()
            .int('Capacity must be an integer')
            .min(1, 'Capacity must be at least 1')
            .max(1000, 'Capacity must not exceed 1000')
            .optional(),

        roomType: z.enum([
            'Lecture Hall',
            'Laboratory',
            'Seminar Room',
            'Computer Lab',
            'Conference Room',
            'Virtual',
            'Other'
        ]).optional(),

        facilities: z.string()
            .max(500, 'Facilities description must not exceed 500 characters')
            .optional(),

        isActive: z.boolean().optional(),

        isUnderMaintenance: z.boolean().optional(),

        maintenanceNotes: z.string()
            .max(500, 'Maintenance notes must not exceed 500 characters')
            .optional(),
    }),
});

export const getClassroomByIdSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Classroom ID is required',
        })
        .uuid('Invalid classroom ID format'),
    }),
});

export const deleteClassroomSchema = z.object({
    params: z.object({
        id: z.string({
            required_error: 'Classroom ID is required',
        })
        .uuid('Invalid classroom ID format'),
    }),
});

export const getClassroomsSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
        limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
        buildingName: z.string().optional(),
        roomType: z.enum([
            'Lecture Hall',
            'Laboratory',
            'Seminar Room',
            'Computer Lab',
            'Conference Room',
            'Virtual',
            'Other'
        ]).optional(),
        isActive: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
        isUnderMaintenance: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
        minCapacity: z.string().regex(/^\d+$/).transform(Number).optional(),
        search: z.string().optional(),
    }),
});

