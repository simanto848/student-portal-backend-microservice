import { z } from 'zod';

export const adminCreateValidation = (data) => {
    const schema = z.object({
        email: z.string({
            required_error: 'Email is required',
        }).email({ message: 'Invalid email address' }),
        fullName: z.string({
            required_error: 'Full name is required',
        })
        .trim()
        .min(1, { message: 'Full name cannot be empty' }),
        role: z.enum(['super_admin', 'admin', 'moderator'], {
            errorMap: () => ({ message: 'Role must be one of: super_admin, admin, moderator' }),
        }).optional(),
        joiningDate: z.coerce.date({
            invalid_type_error: 'Joining date must be a valid date',
        }).optional(),
        registeredIpAddress: z.array(z.string()).optional(),
    });

    return schema.safeParse(data);
};

export const adminUpdateValidation = (data) => {
    const schema = z.object({
        fullName: z.string()
            .trim()
            .min(1, { message: 'Full name cannot be empty' })
            .optional(),
        role: z.enum(['super_admin', 'admin', 'moderator'], {
            errorMap: () => ({ message: 'Role must be one of: super_admin, admin, moderator' }),
        }).optional(),
        joiningDate: z.coerce.date({
            invalid_type_error: 'Joining date must be a valid date',
        }).optional(),
        registeredIpAddress: z.array(z.string()).optional(),
    }).refine(obj => Object.keys(obj).length > 0, {
        message: 'At least one field must be provided',
    });

    return schema.safeParse(data);
};

export const adminUpdateRoleValidation = (data) => {
    const schema = z.object({
        role: z.enum(['super_admin', 'admin', 'moderator'], {
            required_error: 'Role is required',
            invalid_type_error: 'Invalid role',
        }),
    });

    return schema.safeParse(data);
};

// Aliases for better naming consistency
export const createAdminSchema = adminCreateValidation;
export const updateAdminSchema = adminUpdateValidation;
export const updateAdminRoleSchema = adminUpdateRoleValidation;
