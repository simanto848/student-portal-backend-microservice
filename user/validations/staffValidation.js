import { z } from 'zod';

export const staffCreateValidation = (data) => {
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
        joiningDate: z.coerce.date({
            invalid_type_error: 'Joining date must be a valid date',
        }).optional(),
        registeredIpAddress: z.array(z.string()).optional(),
        role: z.enum(['program_controller', 'admission', 'exam', 'finance', 'library', 'transport', 'hr', 'it', 'hostel', 'hostel_warden', 'hostel_supervisor', 'maintenance'], {
            errorMap: () => ({ message: 'Role must be one of: program_controller, admission, exam, finance, library, transport, hr, it, hostel, hostel_warden, hostel_supervisor, maintenance' }),
        }),
    });

    return schema.safeParse(data);
};

export const staffUpdateValidation = (data) => {
    const schema = z.object({
        fullName: z.string()
            .trim()
            .min(1, { message: 'Full name cannot be empty' })
            .optional(),
        departmentId: z.string().optional(),
        joiningDate: z.coerce.date({
            invalid_type_error: 'Joining date must be a valid date',
        }).optional(),
        registeredIpAddress: z.array(z.string()).optional(),
        role: z.enum(['program_controller', 'admission', 'exam', 'finance', 'library', 'transport', 'hr', 'it', 'hostel', 'hostel_warden', 'hostel_supervisor', 'maintenance'], {
            errorMap: () => ({ message: 'Role must be one of: program_controller, admission, exam, finance, library, transport, hr, it, hostel, hostel_warden, hostel_supervisor, maintenance' }),
        }).optional(),
    }).refine(obj => Object.keys(obj).length > 0, {
        message: 'At least one field must be provided',
    });

    return schema.safeParse(data);
};

