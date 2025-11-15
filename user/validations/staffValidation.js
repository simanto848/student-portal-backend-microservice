import { z } from 'zod';

export const staffCreateValidation = (data) => {
    const schema = z.object({
        email: z.string({
            required_error: 'Email is required',
            invalid_type_error: 'Email must be a string',
        }).email({ message: 'Invalid email address' }),
        fullName: z.string({
            required_error: 'Full name is required',
            invalid_type_error: 'Full name must be a string',
        }).trim().min(1, { message: 'Full name cannot be empty' }),
        departmentId: z.string({
            required_error: 'Department ID is required',
            invalid_type_error: 'Department ID must be a string',
        }).min(1, { message: 'Department ID cannot be empty' }),
        joiningDate: z.coerce.date({
            invalid_type_error: 'Joining date must be a valid date',
        }).optional(),
        registeredIpAddress: z.array(z.string()).optional(),
        role: z.enum(['program_controller', 'admission', 'exam', 'finance', 'library', 'transport', 'hr', 'it', 'hostel', 'hostel_warden', 'hostel_supervisor', 'maintenance'], {
            errorMap: () => ({ message: 'Role must be one of: program_controller, admission, exam, finance, library, transport, hr, it, hostel, hostel_warden, hostel_supervisor, maintenance' }),
        }).optional(),
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

export const staffUpdateRoleValidation = (data) => {
    const schema = z.object({
        role: z.enum(['program_controller', 'admission', 'exam', 'finance', 'library', 'transport', 'hr', 'it', 'hostel', 'hostel_warden', 'hostel_supervisor', 'maintenance'], {
            required_error: 'Role is required',
            invalid_type_error: 'Invalid role',
        }),
    });

    return schema.safeParse(data);
};

export const createStaffSchema = staffCreateValidation;
export const updateStaffSchema = staffUpdateValidation;
export const updateStaffRoleSchema = staffUpdateRoleValidation;
