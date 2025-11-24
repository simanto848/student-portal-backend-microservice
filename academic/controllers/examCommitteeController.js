import examCommitteeService from '../services/examCommitteeService.js';
import ApiResponse from '../utils/ApiResponser.js';

class ExamCommitteeController {
    async addMember(req, res, next) {
        try {
            const { departmentId, teacherId, batchId } = req.body;
            const member = await examCommitteeService.addMember(departmentId, teacherId, batchId);
            return ApiResponse.created(res, member, 'Committee member added');
        } catch (error) {
            next(error);
        }
    }

    async removeMember(req, res, next) {
        try {
            const { id } = req.params;
            await examCommitteeService.removeMember(id);
            return ApiResponse.success(res, null, 'Committee member removed');
        } catch (error) {
            next(error);
        }
    }

    async listMembers(req, res, next) {
        try {
            const { departmentId, batchId } = req.query;
            const members = await examCommitteeService.listMembers(departmentId, batchId);
            return ApiResponse.success(res, members);
        } catch (error) {
            next(error);
        }
    }
}

export default new ExamCommitteeController();
