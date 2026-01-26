import resultWorkflowService from "../services/resultWorkflowService.js";
import { ApiResponse } from "shared";

class CommitteeResultController {
    async listWorkflows(req, res, next) {
        try {
            const workflows = await resultWorkflowService.listWorkflows(req.user);
            return ApiResponse.success(res, workflows);
        } catch (error) {
            next(error);
        }
    }

    async approveResult(req, res, next) {
        try {
            const { id } = req.params;
            const { comment } = req.body;
            const memberId = req.user.id || req.user.sub;
            const memberName = req.user.fullName;

            const workflow = await resultWorkflowService.approveByCommittee(id, memberId, comment, memberName);
            return ApiResponse.success(res, workflow, "Result approved");
        } catch (error) {
            next(error);
        }
    }

    async returnResult(req, res, next) {
        try {
            const { id } = req.params;
            const { comment } = req.body;
            const memberId = req.user.id || req.user.sub;

            const workflow = await resultWorkflowService.returnToTeacher(id, memberId, comment);
            return ApiResponse.success(res, workflow, "Result returned to teacher");
        } catch (error) {
            next(error);
        }
    }

    async publishResult(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id || req.user.sub;
            const userRole = req.user.role;

            const committeeMemberId = userId;

            const workflow = await resultWorkflowService.publishResult(id, userId, userRole, committeeMemberId);
            return ApiResponse.success(res, workflow, "Result published successfully");
        } catch (error) {
            next(error);
        }
    }
}

export default new CommitteeResultController();
