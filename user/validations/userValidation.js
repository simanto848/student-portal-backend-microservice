import { z } from 'zod';
import USER_TYPES from '../constants/USER_TYPES.js';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const userRegistrationValidation = (data) => {
    const schema = z.object({
        email: z.string({
            required_error: 'Email is required',
        })
            .email({ message: 'Email must be a valid email address' })
            .toLowerCase(),
        password: z.string({
            required_error: 'Password is required',
        })
            .min(8, { message: 'Password must be at least 8 characters long' })
            .regex(passwordPattern, {
                message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
            }),
        userType: z.enum(Object.values(USER_TYPES), {
            errorMap: () => ({ message: `User type must be one of: ${Object.values(USER_TYPES).join(', ')}` }),
        }),
    });

    return schema.safeParse(data);
};

export const userLoginValidation = (data) => {
    const schema = z.object({
        email: z.string({
            required_error: 'Email is required',
        })
            .email({ message: 'Email must be a valid email address' })
            .toLowerCase(),
        password: z.string({
            required_error: 'Password is required',
        }),
    });

    return schema.safeParse(data);
};

export const userUpdateValidation = (data) => {
    const schema = z.object({
        email: z.string()
            .email({ message: 'Email must be a valid email address' })
            .toLowerCase()
            .optional(),
        twoFactorEnabled: z.boolean().optional(),
        isActive: z.boolean().optional(),
    }).strict().refine(obj => Object.keys(obj).length > 0, {
        message: 'At least one field must be provided',
    });

    return schema.safeParse(data);
};

export const changePasswordValidation = (data) => {
    const schema = z.object({
        currentPassword: z.string({
            required_error: 'Current password is required',
        }),
        newPassword: z.string({
            required_error: 'New password is required',
        })
            .min(8, { message: 'New password must be at least 8 characters long' })
            .regex(passwordPattern, {
                message: 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
            }),
        confirmPassword: z.string({
            required_error: 'Confirm password is required',
        }),
    }).refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Confirm password must match new password',
        path: ['confirmPassword'],
    });

    return schema.safeParse(data);
};

export const resetPasswordValidation = (data) => {
    const schema = z.object({
        token: z.string({
            required_error: 'Reset token is required',
        }),
        newPassword: z.string({
            required_error: 'New password is required',
        })
            .min(8, { message: 'New password must be at least 8 characters long' })
            .regex(passwordPattern, {
                message: 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
            }),
        confirmPassword: z.string({
            required_error: 'Confirm password is required',
        }),
    }).refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Confirm password must match new password',
        path: ['confirmPassword'],
    });

    return schema.safeParse(data);
};

