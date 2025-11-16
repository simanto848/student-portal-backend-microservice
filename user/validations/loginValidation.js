import { z } from 'zod';

const loginSchema = z.object({
    email: z.string({
        required_error: 'Email is required',
        invalid_type_error: 'Email must be a string'
    }).email({ message: 'Invalid email address' }),
    password: z.string({
        required_error: 'Password is required',
        invalid_type_error: 'Password must be a string'
    }).min(6, { message: 'Password must be at least 6 characters long' })
});

const buildLoginValidation = () => (data) => loginSchema.safeParse(data);

export const adminLoginSchema = buildLoginValidation();
export const staffLoginSchema = buildLoginValidation();
export const teacherLoginSchema = buildLoginValidation();
export const studentLoginSchema = buildLoginValidation();

export default {
    adminLoginSchema,
    staffLoginSchema,
    teacherLoginSchema,
    studentLoginSchema,
};
