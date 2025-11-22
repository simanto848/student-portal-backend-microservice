import AssessmentType from '../../models/AssessmentType.js';
import { ApiError } from '../../utils/ApiResponser.js';

class AssessmentTypeService {
    async createAssessmentType(data) {
        try {
            const assessmentType = await AssessmentType.create(data);
            return assessmentType;
        } catch (error) {
            if (error.code === 11000) {
                throw new ApiError(409, 'Assessment type with this name already exists');
            }
            throw new ApiError(500, error.message || 'Failed to create assessment type');
        }
    }

    async getAssessmentTypeById(id) {
        const assessmentType = await AssessmentType.findById(id);
        if (!assessmentType) {
            throw new ApiError(404, 'Assessment type not found');
        }
        return assessmentType;
    }

    async listAssessmentTypes() {
        const assessmentTypes = await AssessmentType.find().sort({ name: 1 });
        return assessmentTypes;
    }

    async updateAssessmentType(id, data) {
        const assessmentType = await this.getAssessmentTypeById(id);
        Object.assign(assessmentType, data);
        await assessmentType.save();
        return assessmentType;
    }

    async deleteAssessmentType(id) {
        const assessmentType = await this.getAssessmentTypeById(id);
        await assessmentType.softDelete();
        return assessmentType;
    }
}

export default new AssessmentTypeService();