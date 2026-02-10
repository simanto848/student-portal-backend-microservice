import resultWorkflowService from '../services/resultWorkflowService.js';
import { ApiResponse, ApiError, config } from 'shared';
import axios from 'axios';

const USER_SERVICE_URL = config.services.user || 'http://localhost:8007';

class ResultWorkflowController {
    async verifyOTP(userId, otp, purpose, token) {
        try {
            const response = await axios.post(`${USER_SERVICE_URL}/auth/otp/verify`, {
                otp,
                purpose
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cookie': `accessToken=${token}`
                }
            });
            return response.data.success;
        } catch (error) {
            throw new ApiError(400, 'OTP Verification Failed: ' + (error.response?.data?.message || error.message));
        }
    }
    async getWorkflow(req, res, next) {
        try {
            const { batchId, courseId, semester } = req.query;
            if (!batchId || !courseId || !semester) {
                const workflows = await resultWorkflowService.listWorkflows(req.user);
                return ApiResponse.success(res, workflows);
            }

            const workflow = await resultWorkflowService.getWorkflow(batchId, courseId, parseInt(semester));
            return ApiResponse.success(res, workflow);
        } catch (error) {
            next(error);
        }
    }

    async submitToCommittee(req, res, next) {
        try {
            const { batchId, courseId, semester, otp } = req.body;
            const token = req.cookies.accessToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
            await this.verifyOTP(req.user.sub, otp, 'result_submission', token);
            const workflow = await resultWorkflowService.submitToCommittee(batchId, courseId, parseInt(semester), req.user.sub);
            return ApiResponse.success(res, workflow, 'Result submitted to committee');
        } catch (error) {
            next(error);
        }
    }

    async approveByCommittee(req, res, next) {
        try {
            const { id } = req.params;
            const { comment, otp } = req.body;
            await this.verifyOTP(req.user.sub, otp, 'result_approval', req.cookies.accessToken || req.headers.authorization?.split(' ')[1]);
            const workflow = await resultWorkflowService.approveByCommittee(id, req.user.sub, comment);
            return ApiResponse.success(res, workflow, 'Result approved by committee');
        } catch (error) {
            next(error);
        }
    }

    async returnToTeacher(req, res, next) {
        try {
            const { id } = req.params;
            const { comment, otp } = req.body;
            await this.verifyOTP(req.user.sub, otp, 'result_return', req.cookies.accessToken || req.headers.authorization?.split(' ')[1]);
            const workflow = await resultWorkflowService.returnToTeacher(id, req.user.sub, comment);
            return ApiResponse.success(res, workflow, 'Result returned to teacher');
        } catch (error) {
            next(error);
        }
    }

    async publishResult(req, res, next) {
        try {
            const { id } = req.params;
            const { otp } = req.body;
            await this.verifyOTP(req.user.sub, otp, 'result_publication', req.cookies.accessToken || req.headers.authorization?.split(' ')[1]);
            const committeeMemberId = req.user.role === 'teacher' ? req.user.sub : null;
            const workflow = await resultWorkflowService.publishResult(id, req.user.sub, req.user.role, committeeMemberId);
            return ApiResponse.success(res, workflow, 'Result published');
        } catch (error) {
            next(error);
        }
    }

    async requestReturn(req, res, next) {
        try {
            const { id } = req.params;
            const { comment, otp } = req.body;
            await this.verifyOTP(req.user.sub, otp, 'result_return', req.cookies.accessToken || req.headers.authorization?.split(' ')[1]);
            const workflow = await resultWorkflowService.requestReturn(id, req.user.sub, comment);
            return ApiResponse.success(res, workflow, 'Return request submitted');
        } catch (error) {
            next(error);
        }
    }

    async approveReturnRequest(req, res, next) {
        try {
            const { id } = req.params;
            const { otp } = req.body;
            await this.verifyOTP(req.user.sub, otp, 'result_return_approval', req.cookies.accessToken || req.headers.authorization?.split(' ')[1]);
            const workflow = await resultWorkflowService.approveReturnRequest(id, req.user.sub, req.user.role);
            return ApiResponse.success(res, workflow, 'Return request approved');
        } catch (error) {
            next(error);
        }
    }

    async bulkPublishResults(req, res, next) {
        try {
            const { batchId, semester, otp } = req.body;
            if (!batchId || !semester) {
                throw new ApiError(400, "Batch ID and semester are required");
            }

            await this.verifyOTP(req.user.sub, otp, 'result_publication', req.cookies.accessToken || req.headers.authorization?.split(' ')[1]);
            const committeeMemberId = req.user.role === 'teacher' ? req.user.sub : null;
            const result = await resultWorkflowService.publishBatchSemesterResults(
                batchId,
                semester,
                req.user.sub,
                req.user.role,
                committeeMemberId
            );

            return ApiResponse.success(res, result, `Published ${result.publishedCount} results for semester ${semester}`);
        } catch (error) {
            next(error);
        }
    }

    async getApprovedSummary(req, res, next) {
        try {
            const summary = await resultWorkflowService.getApprovedWorkflowsSummary(req.user);
            return ApiResponse.success(res, summary);
        } catch (error) {
            next(error);
        }
    }

    constructor() {
        this.verifyOTP = this.verifyOTP.bind(this);
        this.getWorkflow = this.getWorkflow.bind(this);
        this.submitToCommittee = this.submitToCommittee.bind(this);
        this.approveByCommittee = this.approveByCommittee.bind(this);
        this.returnToTeacher = this.returnToTeacher.bind(this);
        this.publishResult = this.publishResult.bind(this);
        this.requestReturn = this.requestReturn.bind(this);
        this.approveReturnRequest = this.approveReturnRequest.bind(this);
        this.bulkPublishResults = this.bulkPublishResults.bind(this);
        this.getApprovedSummary = this.getApprovedSummary.bind(this);
    }
}

export default new ResultWorkflowController();
