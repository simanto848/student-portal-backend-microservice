import { z } from 'zod';

export const workspaceCreateSchema = z.object({ body: z.object({ courseId: z.string(), batchId: z.string(), departmentId: z.string().optional(), title: z.string().min(2).optional(), teacherIds: z.array(z.string()).optional() }) });
export const topicCreateSchema = z.object({ body: z.object({ workspaceId: z.string(), title: z.string().min(1), order: z.number().optional() }) });
export const materialCreateSchema = z.object({ body: z.object({ workspaceId: z.string(), topicId: z.string().optional(), title: z.string(), type: z.enum(['file', 'link', 'text']), content: z.string().optional(), attachments: z.array(z.any()).optional() }) });
export const assignmentCreateSchema = z.object({ body: z.object({ workspaceId: z.string(), topicId: z.string().optional(), title: z.string(), description: z.string().optional(), attachments: z.array(z.any()).optional(), dueAt: z.string().datetime().optional(), allowLate: z.boolean().optional(), maxScore: z.number().min(1).optional(), rubricId: z.string().optional() }) });
export const submissionSchema = z.object({ params: z.object({ assignmentId: z.string() }), body: z.object({ files: z.array(z.any()).optional(), textAnswer: z.string().optional() }) });
export const gradeSchema = z.object({ params: z.object({ id: z.string() }), body: z.object({ grade: z.number().min(0), rubricScores: z.array(z.any()).optional() }) });
export const feedbackSchema = z.object({ params: z.object({ id: z.string() }), body: z.object({ message: z.string().min(1), type: z.enum(['comment', 'inline', 'score_change']).optional() }) });
