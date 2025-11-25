import assessmentService from '../../services/assessments/assessmentService.js';
import { ApiResponse } from 'shared';

class AssessmentController {
    async createAssessment(req, res, next) {
        try {
            const assessment = await assessmentService.createAssessment(req.body, req.user.sub);
            return ApiResponse.created(res, assessment, 'Assessment created successfully');
        } catch (error) {
            next(error);
        }
    }

    async updateAssessment(req, res, next) {
        try {
            const assessment = await assessmentService.updateAssessment(req.params.id, req.body, req.user.sub);
            return ApiResponse.success(res, assessment, 'Assessment updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async getAssessment(req, res, next) {
        try {
            const assessment = await assessmentService.getAssessmentById(req.params.id);
            return ApiResponse.success(res, assessment);
        } catch (error) {
            next(error);
        }
    }

    async listAssessments(req, res, next) {
        try {
            const result = await assessmentService.listAssessments(req.query);
            return ApiResponse.success(res, result);
        } catch (error) {
            next(error);
        }
    }

    async publishAssessment(req, res, next) {
        try {
            const assessment = await assessmentService.publishAssessment(req.params.id, req.user.sub);
            return ApiResponse.success(res, assessment, 'Assessment published successfully');
        } catch (error) {
            next(error);
        }
    }

    async closeAssessment(req, res, next) {
        try {
            const assessment = await assessmentService.closeAssessment(req.params.id, req.user.sub);
            return ApiResponse.success(res, assessment, 'Assessment closed successfully');
        } catch (error) {
            next(error);
        }
    }

    async markAsGraded(req, res, next) {
        try {
            const assessment = await assessmentService.markAsGraded(req.params.id, req.user.sub);
            return ApiResponse.success(res, assessment, 'Assessment marked as graded successfully');
        } catch (error) {
            next(error);
        }
    }

    async deleteAssessment(req, res, next) {
        try {
            const assessment = await assessmentService.deleteAssessment(req.params.id, req.user.sub);
            return ApiResponse.success(res, assessment, 'Assessment deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async getStudentAssessments(req, res, next) {
        try {
            const { studentId, courseId } = req.params;
            const assessments = await assessmentService.getStudentAssessments(studentId, courseId);
            return ApiResponse.success(res, assessments);
        } catch (error) {
            next(error);
        }
    }
}

export default new AssessmentController();
