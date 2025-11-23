import resultWorkflowService from '../services/resultWorkflowService.js';
import ApiResponse from '../utils/ApiResponser.js';

class ResultWorkflowController {
    async getWorkflow(req, res, next) {
        try {
            const { batchId, courseId, semester } = req.query;
            const workflow = await resultWorkflowService.getWorkflow(batchId, courseId, parseInt(semester));
            return ApiResponse.success(res, workflow);
        } catch (error) {
            next(error);
        }
    }

    async submitToCommittee(req, res, next) {
        try {
            const { batchId, courseId, semester } = req.body;
            const workflow = await resultWorkflowService.submitToCommittee(batchId, courseId, parseInt(semester), req.user.sub);
            return ApiResponse.success(res, workflow, 'Result submitted to committee');
        } catch (error) {
            next(error);
        }
    }

    async approveByCommittee(req, res, next) {
        try {
            const { id } = req.params;
            const { comment } = req.body;
            const workflow = await resultWorkflowService.approveByCommittee(id, req.user.sub, comment);
            return ApiResponse.success(res, workflow, 'Result approved by committee');
        } catch (error) {
            next(error);
        }
    }

    async returnToTeacher(req, res, next) {
        try {
            const { id } = req.params;
            const { comment } = req.body;
            const workflow = await resultWorkflowService.returnToTeacher(id, req.user.sub, comment);
            return ApiResponse.success(res, workflow, 'Result returned to teacher');
        } catch (error) {
            next(error);
        }
    }

    async publishResult(req, res, next) {
        try {
            const { id } = req.params;
            const workflow = await resultWorkflowService.publishResult(id, req.user.sub);
            return ApiResponse.success(res, workflow, 'Result published');
        } catch (error) {
            next(error);
        }
    }

    async requestReturn(req, res, next) {
        try {
            const { id } = req.params;
            const { comment } = req.body;
            const workflow = await resultWorkflowService.requestReturn(id, req.user.sub, comment);
            return ApiResponse.success(res, workflow, 'Return request submitted');
        } catch (error) {
            next(error);
        }
    }

    async approveReturnRequest(req, res, next) {
        try {
            const { id } = req.params;
            const workflow = await resultWorkflowService.approveReturnRequest(id, req.user.sub);
            return ApiResponse.success(res, workflow, 'Return request approved');
        } catch (error) {
            next(error);
        }
    }
}

export default new ResultWorkflowController();
