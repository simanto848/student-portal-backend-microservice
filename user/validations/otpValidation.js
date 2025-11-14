import { z } from 'zod';
import OTP_PURPOSES from '../constants/OTP_PURPOSE.js';

export const otpCreateValidation = (data) => {
    const schema = z.object({
        user: z.string({
            required_error: 'User ID is required',
        }),
        otp: z.string({
            required_error: 'OTP is required',
        })
            .length(6, { message: 'OTP must be exactly 6 digits' })
            .regex(/^\d+$/, { message: 'OTP must contain only numbers' }),
        purpose: z.enum(Object.values(OTP_PURPOSES), {
            errorMap: () => ({ message: `Purpose must be one of: ${Object.values(OTP_PURPOSES).join(', ')}` }),
        }),
        expiresAt: z.coerce.date({
            required_error: 'ExpiresAt is required',
            invalid_type_error: 'ExpiresAt must be a valid date',
        }),
    });

    return schema.safeParse(data);
};

export const otpVerificationValidation = (data) => {
    const schema = z.object({
        user: z.string({
            required_error: 'User ID is required',
        }),
        otp: z.string({
            required_error: 'OTP is required',
        })
            .length(6, { message: 'OTP must be exactly 6 digits' })
            .regex(/^\d+$/, { message: 'OTP must contain only numbers' }),
        purpose: z.enum(Object.values(OTP_PURPOSES), {
            errorMap: () => ({ message: `Purpose must be one of: ${Object.values(OTP_PURPOSES).join(', ')}` }),
        }),
    });

    return schema.safeParse(data);
};

