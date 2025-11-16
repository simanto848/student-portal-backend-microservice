import { z } from 'zod';

const dateCoerceOptional = () =>
    z.preprocess((v) => {
        if (v === undefined || v === null || v === '') return undefined;
        if (v instanceof Date) return v;
        if (typeof v === 'string' || typeof v === 'number') {
            const d = new Date(v);
            return isNaN(d.getTime()) ? undefined : d;
        }
        return undefined;
    }, z.date({ invalid_type_error: 'Joining date must be a valid date' })).optional();

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
        departmentId: z.string({
            required_error: 'Department ID is required',
        })
            .trim()
            .min(1, { message: 'Department ID cannot be empty' }),
        designation: z.enum(['professor', 'associate_professor', 'assistant_professor', 'lecturer', 'instructor', 'adjunct_professor', 'visiting_professor', 'emeritus_professor']).optional(),
        joiningDate: dateCoerceOptional(),
        registeredIpAddress: z.array(z.string()).optional(),
        profile: z.any().optional(),
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
        joiningDate: dateCoerceOptional(),
        registeredIpAddress: z.array(z.string()).optional(),
        departmentId: z.string().optional(),
        profile: z.any().optional(),
    }).refine(obj => Object.keys(obj).length > 0, {
        message: 'At least one field must be provided',
    });

    return schema.safeParse(data);
};
