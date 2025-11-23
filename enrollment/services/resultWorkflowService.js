import ResultWorkflow from '../models/ResultWorkflow.js';
import CourseGrade from '../models/CourseGrade.js';
import BatchCourseInstructor from '../models/BatchCourseInstructor.js';
import { Course, Batch } from '../models/external/Academic.js';
import { ApiError } from '../utils/ApiResponser.js';

class ResultWorkflowService {
    async getWorkflow(batchId, courseId, semester) {
        let workflow = await ResultWorkflow.findOne({ batchId, courseId, semester });
        if (!workflow) {
            workflow = await ResultWorkflow.create({ batchId, courseId, semester });
        }
        return workflow;
    }

    async submitToCommittee(batchId, courseId, semester, teacherId) {
        const workflow = await this.getWorkflow(batchId, courseId, semester);
        const assignment = await BatchCourseInstructor.findOne({
            batchId, courseId, instructorId: teacherId, status: 'active'
        });
        if (!assignment) throw new ApiError(403, 'Not authorized');

        if (workflow.status !== 'DRAFT' && workflow.status !== 'RETURNED_TO_TEACHER') {
            throw new ApiError(400, 'Cannot submit in current status');
        }

        workflow.status = 'SUBMITTED_TO_COMMITTEE';
        workflow.history.push({
            status: 'SUBMITTED_TO_COMMITTEE',
            changedBy: teacherId,
            comment: 'Submitted for review'
        });
        return workflow.save();
    }

    async approveByCommittee(workflowId, committeeMemberId, comment) {
        const workflow = await ResultWorkflow.findById(workflowId);
        if (!workflow) throw new ApiError(404, 'Workflow not found');

        if (workflow.status !== 'SUBMITTED_TO_COMMITTEE') {
            throw new ApiError(400, 'Result is not pending committee approval');
        }

        workflow.status = 'COMMITTEE_APPROVED';
        workflow.history.push({
            status: 'COMMITTEE_APPROVED',
            changedBy: committeeMemberId,
            comment
        });
        return workflow.save();
    }

    async returnToTeacher(workflowId, reviewerId, comment) {
        const workflow = await ResultWorkflow.findById(workflowId);
        if (!workflow) throw new ApiError(404, 'Workflow not found');

        if (workflow.status !== 'SUBMITTED_TO_COMMITTEE' && workflow.status !== 'COMMITTEE_APPROVED') {
            throw new ApiError(400, 'Cannot return result in current status');
        }

        workflow.status = 'RETURNED_TO_TEACHER';
        workflow.returnRequested = false;
        workflow.history.push({
            status: 'RETURNED_TO_TEACHER',
            changedBy: reviewerId,
            comment
        });
        return workflow.save();
    }

    async publishResult(workflowId, headId) {
        const workflow = await ResultWorkflow.findById(workflowId);
        if (!workflow) throw new ApiError(404, 'Workflow not found');

        if (workflow.status !== 'COMMITTEE_APPROVED') {
            throw new ApiError(400, 'Result must be approved by committee first');
        }

        // TODO: Verify if headId is actually the Department Head (requires Academic Service call or trusted role)
        
        workflow.status = 'PUBLISHED';
        workflow.history.push({
            status: 'PUBLISHED',
            changedBy: headId,
            comment: 'Result Published'
        });
        
        await CourseGrade.updateMany(
            { batchId: workflow.batchId, courseId: workflow.courseId, semester: workflow.semester },
            { isPublished: true, publishedAt: new Date() }
        );

        return workflow.save();
    }

    async requestReturn(workflowId, teacherId, comment) {
        const workflow = await ResultWorkflow.findById(workflowId);
        if (!workflow) throw new ApiError(404, 'Workflow not found');

        if (workflow.status !== 'PUBLISHED') {
            throw new ApiError(400, 'Can only request return for published results');
        }

        workflow.returnRequested = true;
        workflow.returnRequestComment = comment;
        workflow.history.push({
            status: 'PUBLISHED',
            changedBy: teacherId,
            comment: `Return Requested: ${comment}`
        });
        return workflow.save();
    }

    async approveReturnRequest(workflowId, headId) {
        const workflow = await ResultWorkflow.findById(workflowId);
        if (!workflow) throw new ApiError(404, 'Workflow not found');

        if (!workflow.returnRequested) {
            throw new ApiError(400, 'No return request pending');
        }

        workflow.status = 'RETURNED_TO_TEACHER';
        workflow.returnRequested = false;
        workflow.history.push({
            status: 'RETURNED_TO_TEACHER',
            changedBy: headId,
            comment: 'Return Request Approved'
        });

        await CourseGrade.updateMany(
            { batchId: workflow.batchId, courseId: workflow.courseId, semester: workflow.semester },
            { isPublished: false, publishedAt: null }
        );

        return workflow.save();
    }
}

export default new ResultWorkflowService();
