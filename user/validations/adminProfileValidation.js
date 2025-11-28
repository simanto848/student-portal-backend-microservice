import { z } from 'zod';

export const adminProfileCreateValidation = (data) => {
    const schema = z.object({
        firstName: z.string({
            required_error: 'First name is required',
        }).trim().min(1, { message: 'First name cannot be empty' }),
        lastName: z.string({
            required_error: 'Last name is required',
        }).trim().min(1, { message: 'Last name cannot be empty' }),
        middleName: z.string().trim().optional(),
        dateOfBirth: z.coerce.date({
            invalid_type_error: 'Date of birth must be a valid date',
        }).optional(),
        gender: z.enum(['Male', 'Female', 'Other'], {
            errorMap: () => ({ message: 'Gender must be Male, Female, or Other' }),
        }).optional(),
        phoneNumber: z.string().trim().optional(),
        avatar: z.string().url({ message: 'Avatar must be a valid URL' }).optional(),
    });

    return schema.safeParse(data);
};

export const adminProfileUpdateValidation = (data) => {
    const schema = z.object({
        firstName: z.string().trim().min(1, { message: 'First name cannot be empty' }).optional(),
        lastName: z.string().trim().min(1, { message: 'Last name cannot be empty' }).optional(),
        middleName: z.string().trim().optional(),
        dateOfBirth: z.coerce.date({
            invalid_type_error: 'Date of birth must be a valid date',
        }).optional(),
        gender: z.enum(['Male', 'Female', 'Other'], {
            errorMap: () => ({ message: 'Gender must be Male, Female, or Other' }),
        }).optional(),
        phoneNumber: z.string().trim().optional(),
        avatar: z.string().url({ message: 'Avatar must be a valid URL' }).optional(),
    }).refine(obj => Object.keys(obj).length > 0, {
        message: 'At least one field must be provided',
    });

    return schema.safeParse(data);
};

