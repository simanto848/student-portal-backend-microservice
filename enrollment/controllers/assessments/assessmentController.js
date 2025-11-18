import assessmentService from '../../services/assessments/assessmentService.js';
import ApiResponse from '../../utils/ApiResponser.js';

class AssessmentController {
    // Create assessment
    async createAssessment(req, res, next) {
        try {
            const assessment = await assessmentService.createAssessment(req.body, req.user.id);
            return ApiResponse.created(res, assessment, 'Assessment created successfully');
        } catch (error) {
            next(error);
        }
    }

    // Get assessment by ID
    async getAssessment(req, res, next) {
        try {
            const assessment = await assessmentService.getAssessmentById(req.params.id);
            
            // Students can only view published, closed, or graded assessments
            if (req.user.role === 'student' && assessment.status === 'draft') {
                return ApiResponse.forbidden(res, 'This assessment is not available yet');
            }

            return ApiResponse.success(res, assessment);
        } catch (error) {
            next(error);
        }
    }

    // List assessments with filters
    async listAssessments(req, res, next) {
        try {
            const filters = { ...req.query };
            
            // Students can only view published, closed, or graded assessments
            if (req.user.role === 'student') {
                filters.status = filters.status || { $in: ['published', 'closed', 'graded'] };
            }

            const assessments = await assessmentService.listAssessments(filters);
            return ApiResponse.success(res, assessments);
        } catch (error) {
            next(error);
        }
    }

    // Update assessment
    async updateAssessment(req, res, next) {
        try {
            const assessment = await assessmentService.updateAssessment(req.params.id, req.body, req.user.id);
            return ApiResponse.success(res, assessment, 'Assessment updated successfully');
        } catch (error) {
            next(error);
        }
    }

    // Delete assessment
    async deleteAssessment(req, res, next) {
        try {
            await assessmentService.deleteAssessment(req.params.id, req.user.id);
            return ApiResponse.success(res, null, 'Assessment deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    // Publish assessment
    async publishAssessment(req, res, next) {
        try {
            const assessment = await assessmentService.publishAssessment(req.params.id, req.user.id);
            return ApiResponse.success(res, assessment, 'Assessment published successfully');
        } catch (error) {
            next(error);
        }
    }

    // Close assessment
    async closeAssessment(req, res, next) {
        try {
            const assessment = await assessmentService.closeAssessment(req.params.id, req.user.id);
            return ApiResponse.success(res, assessment, 'Assessment closed successfully');
        } catch (error) {
            next(error);
        }
    }

    // Mark assessment as graded
    async markAsGraded(req, res, next) {
        try {
            const assessment = await assessmentService.markAsGraded(req.params.id, req.user.id);
            return ApiResponse.success(res, assessment, 'Assessment marked as graded');
        } catch (error) {
            next(error);
        }
    }

    // Get student assessments
    async getStudentAssessments(req, res, next) {
        try {
            const { studentId, courseId } = req.params;
            
            // Students can only view their own assessments
            if (req.user.role === 'student' && req.user.id !== studentId) {
                return ApiResponse.forbidden(res, 'You can only view your own assessments');
            }

            const assessments = await assessmentService.getStudentAssessments(studentId, courseId);
            return ApiResponse.success(res, assessments);
        } catch (error) {
            next(error);
        }
    }
}

export default new AssessmentController();
