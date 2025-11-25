import AssessmentSubmission from '../../models/AssessmentSubmission.js';
import { ApiError } from 'shared';

import userServiceClient from '../../client/userServiceClient.js';

class AssessmentSubmissionService {
    async createSubmission(data) {
        try {
            const assessment = await Assessment.findById(data.assessmentId);
            if (!assessment) {
                throw new ApiError(404, 'Assessment not found');
            }

            await userServiceClient.verifyStudent(data.studentId);

            const existingSubmission = await AssessmentSubmission.findOne({
                assessmentId: data.assessmentId,
                studentId: data.studentId,
            });

            if (existingSubmission) {
                throw new ApiError(409, 'Submission already exists');
            }

            const submission = await AssessmentSubmission.create(data);
            return submission;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, error.message || 'Failed to create submission');
        }
    }

    async getSubmissionById(id) {
        const submission = await AssessmentSubmission.findById(id);
        if (!submission) {
            throw new ApiError(404, 'Submission not found');
        }
        return submission;
    }

    async listSubmissions(filters = {}) {
        const query = {};
        if (filters.assessmentId) query.assessmentId = filters.assessmentId;
        if (filters.studentId) query.studentId = filters.studentId;
        if (filters.status) query.status = filters.status;

        const submissions = await AssessmentSubmission.find(query).sort({ createdAt: -1 });
        return submissions;
    }

    async updateSubmission(id, data) {
        const submission = await this.getSubmissionById(id);
        Object.assign(submission, data);
        await submission.save();
        return submission;
    }

    async gradeSubmission(id, gradeData) {
        const submission = await this.getSubmissionById(id);
        submission.score = gradeData.score;
        submission.feedback = gradeData.feedback;
        submission.status = 'graded';
        submission.gradedAt = new Date();
        await submission.save();
        return submission;
    }

    async deleteSubmission(id) {
        const submission = await this.getSubmissionById(id);
        await submission.softDelete();
        return submission;
    }

    async getStudentSubmission(studentId, assessmentId) {
        const submission = await AssessmentSubmission.findOne({
            studentId,
            assessmentId,
        });
        if (!submission) {
            throw new ApiError(404, 'Submission not found');
        }
        return submission;
    }

    async getAssessmentSubmissionStats(assessmentId) {
        const submissions = await AssessmentSubmission.find({ assessmentId });
        const total = submissions.length;
        const graded = submissions.filter(s => s.status === 'graded').length;
        const pending = total - graded;
        
        return {
            total,
            graded,
            pending,
        };
    }
}

export default new AssessmentSubmissionService();
