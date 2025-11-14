import { z } from 'zod';

export const roleCreateValidation = (data) => {
    const schema = z.object({
        name: z.string({
            required_error: 'Role name is required',
        })
            .trim()
            .min(1, { message: 'Role name cannot be empty' }),
        description: z.string()
            .trim()
            .optional(),
    });

    return schema.safeParse(data);
};

export const roleUpdateValidation = (data) => {
    const schema = z.object({
        name: z.string()
            .trim()
            .min(1, { message: 'Role name cannot be empty' })
            .optional(),
        description: z.string()
            .trim()
            .optional(),
    }).refine(obj => Object.keys(obj).length > 0, {
        message: 'At least one field must be provided',
    });

    return schema.safeParse(data);
};

