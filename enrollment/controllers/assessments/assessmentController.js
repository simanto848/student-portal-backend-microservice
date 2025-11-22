import assessmentService from '../../services/assessments/assessmentService.js';
import ApiResponse from '../../utils/ApiResponser.js';

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

    async getAssessmentById(req, res, next) {
        try {
            const assessment = await assessmentService.getAssessmentById(req.params.id);
            return ApiResponse.success(res, assessment);
        } catch (error) {
            next(error);
        }
    }

    async getAssessments(req, res, next) {
        try {
            const result = await assessmentService.getAssessments(req.query);
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

    async deleteAssessment(req, res, next) {
        try {
            const assessment = await assessmentService.deleteAssessment(req.params.id, req.user.sub);
            return ApiResponse.success(res, assessment, 'Assessment deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async restoreAssessment(req, res, next) {
        try {
            const assessment = await assessmentService.restoreAssessment(req.params.id, req.user.sub);
            return ApiResponse.success(res, assessment, 'Assessment restored successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new AssessmentController();

