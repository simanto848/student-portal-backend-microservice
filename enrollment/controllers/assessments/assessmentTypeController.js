import assessmentTypeService from '../../services/assessments/assessmentTypeService.js';
import ApiResponse from '../../utils/ApiResponser.js';

class AssessmentTypeController {
    // Create assessment type
    async createAssessmentType(req, res, next) {
        try {
            const assessmentType = await assessmentTypeService.createAssessmentType(req.body);
            return ApiResponse.created(res, assessmentType, 'Assessment type created successfully');
        } catch (error) {
            next(error);
        }
    }

    // Get assessment type by ID
    async getAssessmentType(req, res, next) {
        try {
            const assessmentType = await assessmentTypeService.getAssessmentTypeById(req.params.id);
            return ApiResponse.success(res, assessmentType);
        } catch (error) {
            next(error);
        }
    }

    // List all assessment types
    async listAssessmentTypes(req, res, next) {
        try {
            const assessmentTypes = await assessmentTypeService.listAssessmentTypes();
            return ApiResponse.success(res, assessmentTypes);
        } catch (error) {
            next(error);
        }
    }

    // Update assessment type
    async updateAssessmentType(req, res, next) {
        try {
            const assessmentType = await assessmentTypeService.updateAssessmentType(req.params.id, req.body);
            return ApiResponse.success(res, assessmentType, 'Assessment type updated successfully');
        } catch (error) {
            next(error);
        }
    }

    // Delete assessment type
    async deleteAssessmentType(req, res, next) {
        try {
            await assessmentTypeService.deleteAssessmentType(req.params.id);
            return ApiResponse.success(res, null, 'Assessment type deleted successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new AssessmentTypeController();
