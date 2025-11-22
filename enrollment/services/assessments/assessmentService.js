import Assessment from '../../models/Assessment.js';
import AssessmentType from '../../models/AssessmentType.js';
import BatchCourseInstructor from '../../models/BatchCourseInstructor.js';
import { ApiError } from '../../utils/ApiResponser.js';
import academicServiceClient from '../../client/academicServiceClient.js';

class AssessmentService {
    async createAssessment(data, instructorId) {
        try {
            await Promise.all([
                academicServiceClient.verifyCourse(data.courseId),
                academicServiceClient.verifyBatch(data.batchId),
            ]);

            await AssessmentType.findById(data.assessmentTypeId);
            const assignment = await BatchCourseInstructor.findOne({
                batchId: data.batchId,
                courseId: data.courseId,
                semester: data.semester,
                instructorId,
                status: 'active',
            });

            if (!assignment) {
                throw new ApiError(403, 'You are not assigned to teach this course');
            }

            const assessment = await Assessment.create({
                ...data,
                instructorId,
            });

            return assessment;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, error.message || 'Failed to create assessment');
        }
    }

    async getAssessmentById(id) {
        const assessment = await Assessment.findById(id).populate('assessmentTypeId');
        if (!assessment) {
            throw new ApiError(404, 'Assessment not found');
        }
        return assessment;
    }

    async listAssessments(filters = {}) {
        const query = {};

        if (filters.courseId) query.courseId = filters.courseId;
        if (filters.batchId) query.batchId = filters.batchId;
        if (filters.semester) query.semester = parseInt(filters.semester);
        if (filters.instructorId) query.instructorId = filters.instructorId;
        if (filters.status) query.status = filters.status;

        const assessments = await Assessment.find(query)
            .populate('assessmentTypeId')
            .sort({ dueDate: -1, createdAt: -1 });

        return assessments;
    }

    async updateAssessment(id, data, instructorId) {
        const assessment = await this.getAssessmentById(id);
        if (assessment.instructorId !== instructorId) {
            throw new ApiError(403, 'You do not have permission to update this assessment');
        }

        Object.assign(assessment, data);
        await assessment.save();
        return assessment;
    }

    async deleteAssessment(id, instructorId) {
        const assessment = await this.getAssessmentById(id);
        if (assessment.instructorId !== instructorId) {
            throw new ApiError(403, 'You do not have permission to delete this assessment');
        }

        await assessment.softDelete();
        return assessment;
    }

    async publishAssessment(id, instructorId) {
        const assessment = await this.getAssessmentById(id);
        if (assessment.instructorId !== instructorId) {
            throw new ApiError(403, 'You do not have permission to publish this assessment');
        }

        if (assessment.status !== 'draft') {
            throw new ApiError(400, 'Only draft assessments can be published');
        }

        assessment.status = 'published';
        assessment.publishDate = new Date();
        await assessment.save();
        return assessment;
    }

    async closeAssessment(id, instructorId) {
        const assessment = await this.getAssessmentById(id);
        if (assessment.instructorId !== instructorId) {
            throw new ApiError(403, 'You do not have permission to close this assessment');
        }

        if (assessment.status === 'closed' || assessment.status === 'graded') {
            throw new ApiError(400, 'Assessment is already closed or graded');
        }

        assessment.status = 'closed';
        await assessment.save();
        return assessment;
    }

    async markAsGraded(id, instructorId) {
        const assessment = await this.getAssessmentById(id);
        if (assessment.instructorId !== instructorId) {
            throw new ApiError(403, 'You do not have permission to update this assessment');
        }

        assessment.status = 'graded';
        await assessment.save();
        return assessment;
    }

    async getStudentAssessments(studentId, courseId) {
        const assessments = await Assessment.find({
            courseId,
            status: { $in: ['published', 'closed', 'graded'] },
        }).populate('assessmentTypeId').sort({ dueDate: -1 });

        return assessments;
    }
}

export default new AssessmentService();