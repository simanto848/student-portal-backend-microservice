import { z } from 'zod';

export const studentCreateValidation = (data) => {
    const schema = z.object({
        email: z.string({
            required_error: 'Email is required',
        }).email({ message: 'Invalid email address' }),
        fullName: z.string({
            required_error: 'Full name is required',
        })
            .trim()
            .min(1, { message: 'Full name cannot be empty' }),
        registrationNumber: z.string({
            required_error: 'Registration number is required',
        })
            .trim()
            .min(1, { message: 'Registration number cannot be empty' }),
        departmentId: z.string().optional(),
        programId: z.string().optional(),
        batchId: z.string().optional(),
        enrollmentStatus: z.enum(['not_enrolled', 'enrolled', 'graduated', 'dropped_out', 'suspended', 'on_leave', 'transferred_out', 'transferred_in']).optional(),
        currentSemester: z.number()
            .int({ message: 'Current semester must be an integer' })
            .min(1, { message: 'Current semester must be at least 1' })
            .optional(),
        admissionDate: z.coerce.date({
            invalid_type_error: 'Admission date must be a valid date',
        }).optional(),
        expectedGraduationDate: z.coerce.date({
            invalid_type_error: 'Expected graduation date must be a valid date',
        }).optional(),
    });

    return schema.safeParse(data);
};

export const studentUpdateValidation = (data) => {
    const schema = z.object({
        fullName: z.string()
            .trim()
            .min(1, { message: 'Full name cannot be empty' })
            .optional(),
        departmentId: z.string().optional(),
        programId: z.string().optional(),
        batchId: z.string().optional(),
        enrollmentStatus: z.enum(['not_enrolled', 'enrolled', 'graduated', 'dropped_out', 'suspended', 'on_leave', 'transferred_out', 'transferred_in']).optional(),
        currentSemester: z.number()
            .int({ message: 'Current semester must be an integer' })
            .min(1, { message: 'Current semester must be at least 1' })
            .optional(),
        expectedGraduationDate: z.coerce.date({
            invalid_type_error: 'Expected graduation date must be a valid date',
        }).optional(),
        actualGraduationDate: z.coerce.date({
            invalid_type_error: 'Actual graduation date must be a valid date',
        }).optional(),
    }).refine(obj => Object.keys(obj).length > 0, {
        message: 'At least one field must be provided',
    });

    return schema.safeParse(data);
};

