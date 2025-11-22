import assessmentTypeService from '../../services/assessments/assessmentTypeService.js';
import ApiResponse from '../../utils/ApiResponser.js';

class AssessmentTypeController {
    async createAssessmentType(req, res, next) {
        try {
            const assessmentType = await assessmentTypeService.createAssessmentType(req.body, req.user.sub);
            return ApiResponse.created(res, assessmentType, 'Assessment type created successfully');
        } catch (error) {
            next(error);
        }
    }

    async updateAssessmentType(req, res, next) {
        try {
            const assessmentType = await assessmentTypeService.updateAssessmentType(req.params.id, req.body, req.user.sub);
            return ApiResponse.success(res, assessmentType, 'Assessment type updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async getAssessmentType(req, res, next) {
        try {
            const assessmentType = await assessmentTypeService.getAssessmentTypeById(req.params.id);
            return ApiResponse.success(res, assessmentType);
        } catch (error) {
            next(error);
        }
    }

    async listAssessmentTypes(req, res, next) {
        try {
            const assessmentTypes = await assessmentTypeService.listAssessmentTypes();
            return ApiResponse.success(res, assessmentTypes);
        } catch (error) {
            next(error);
        }
    }

    async deleteAssessmentType(req, res, next) {
        try {
            const assessmentType = await assessmentTypeService.deleteAssessmentType(req.params.id, req.user.sub);
            return ApiResponse.success(res, assessmentType, 'Assessment type deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async restoreAssessmentType(req, res, next) {
        try {
            const assessmentType = await assessmentTypeService.restoreAssessmentType(req.params.id, req.user.sub);
            return ApiResponse.success(res, assessmentType, 'Assessment type restored successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new AssessmentTypeController();
