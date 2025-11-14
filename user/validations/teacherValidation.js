import { z } from 'zod';

export const teacherCreateValidation = (data) => {
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
        departmentId: z.string({
            required_error: 'Department ID is required',
        }),
        designation: z.enum(['professor', 'associate_professor', 'assistant_professor', 'lecturer', 'instructor', 'adjunct_professor', 'visiting_professor', 'emeritus_professor']).optional(),
        joiningDate: z.coerce.date({
            invalid_type_error: 'Joining date must be a valid date',
        }).optional(),
        registeredIpAddress: z.array(z.string()).optional(),
    });

    return schema.safeParse(data);
};

export const teacherUpdateValidation = (data) => {
    const schema = z.object({
        fullName: z.string()
            .trim()
            .min(1, { message: 'Full name cannot be empty' })
            .optional(),
        designation: z.enum(['professor', 'associate_professor', 'assistant_professor', 'lecturer', 'instructor', 'adjunct_professor', 'visiting_professor', 'emeritus_professor']).optional(),
        joiningDate: z.coerce.date({
            invalid_type_error: 'Joining date must be a valid date',
        }).optional(),
        registeredIpAddress: z.array(z.string()).optional(),
    }).refine(obj => Object.keys(obj).length > 0, {
        message: 'At least one field must be provided',
    });

    return schema.safeParse(data);
};

