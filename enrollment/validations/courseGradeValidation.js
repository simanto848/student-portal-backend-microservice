import { z } from 'zod';

export const courseGradeIdSchema = z.object({
    id: z.string().uuid({ message: "Invalid grade ID format" }),
});

export const calculateGradeSchema = z.object({
    enrollmentId: z.string().uuid({ message: "Invalid enrollment ID format" }),
});

export const updateGradeSchema = z.object({
    id: z.string().uuid({ message: "Invalid grade ID format" }),
    remarks: z.string().optional(),
    status: z.enum(['pending', 'calculated', 'finalized', 'published']).optional(),
});

export const studentGradesSchema = z.object({
    studentId: z.string().uuid({ message: "Invalid student ID format" }),
    sessionId: z.string().uuid({ message: "Invalid session ID format" }).optional(),
    status: z.enum(['pending', 'calculated', 'finalized', 'published']).optional(),
    page: z.string().optional().transform(val => val ? parseInt(val) : undefined),
    limit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
});

export const courseGradesSchema = z.object({
    courseId: z.string().uuid({ message: "Invalid course ID format" }),
    sessionId: z.string().uuid({ message: "Invalid session ID format" }),
    status: z.enum(['pending', 'calculated', 'finalized', 'published']).optional(),
    page: z.string().optional().transform(val => val ? parseInt(val) : undefined),
    limit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
});

export const publishGradesSchema = z.object({
    courseId: z.string().uuid({ message: "Invalid course ID format" }),
    sessionId: z.string().uuid({ message: "Invalid session ID format" }),
});

export const finalizeGradeSchema = z.object({
    id: z.string().uuid({ message: "Invalid grade ID format" }),
});
import { z } from 'zod';

export const createCourseGradeSchema = z.object({
    body: z.object({
        studentId: z.string().uuid('Invalid student ID format'),
        enrollmentId: z.string().uuid('Invalid enrollment ID format'),
        courseId: z.string().uuid('Invalid course ID format'),
        batchId: z.string().uuid('Invalid batch ID format'),
        semester: z.number().int().min(1, 'Semester must be at least 1'),
        totalMarksObtained: z.number().min(0, 'Total marks obtained must be non-negative'),
        totalMarks: z.number().min(0, 'Total marks must be non-negative'),
        remarks: z.string().max(500, 'Remarks cannot exceed 500 characters').optional(),
    }),
});

export const updateCourseGradeSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid ID format'),
    }),
    body: z.object({
        totalMarksObtained: z.number().min(0).optional(),
        totalMarks: z.number().min(0).optional(),
        remarks: z.string().max(500).optional(),
    }),
});

export const publishGradeSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid ID format'),
    }),
});

export const getCourseGradeSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid ID format'),
    }),
});

export const listCourseGradesSchema = z.object({
    query: z.object({
        studentId: z.string().uuid('Invalid student ID format').optional(),
        courseId: z.string().uuid('Invalid course ID format').optional(),
        batchId: z.string().uuid('Invalid batch ID format').optional(),
        semester: z.string().regex(/^\d+$/, 'Semester must be a number').optional(),
        isPublished: z.enum(['true', 'false']).optional(),
    }),
});
**/