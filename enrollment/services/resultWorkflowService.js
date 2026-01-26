import ResultWorkflow from "../models/ResultWorkflow.js";
import CourseGrade from "../models/CourseGrade.js";
import BatchCourseInstructor from "../models/BatchCourseInstructor.js";
import { Batch, } from "../models/external/Academic.js";
import { ExamCommittee } from "../models/external/ExamCommittee.js";
import { ApiError } from "shared";

class ResultWorkflowService {
    async getWorkflow(batchId, courseId, semester) {
        let workflow = await ResultWorkflow.findOne({
            batchId,
            courseId,
            semester,
        });
        if (!workflow) {
            workflow = await ResultWorkflow.create({ batchId, courseId, semester });
        }
        return workflow;
    }

    async listWorkflows(user) {
        if (user.role === "teacher") {
            const assignments = await BatchCourseInstructor.find({
                instructorId: user.id || user.sub,
                status: "active",
            });

            if (!assignments.length) return [];

            const queries = assignments.map((a) => ({
                batchId: a.batchId,
                courseId: a.courseId,
                semester: a.semester,
            }));

            if (queries.length === 0) return [];

            return ResultWorkflow.find({
                $or: queries,
            })
                .sort({ updatedAt: -1 })
                .lean();
        } else if (user.isExamCommitteeMember) {
            const teacherId = user.id || user.sub;
            const committees = await ExamCommittee.find({
                teacherId: teacherId,
                status: true
            });

            if (!committees || committees.length === 0) return [];

            const shiftDepartmentPairs = committees.map(c => ({
                shift: c.shift,
                departmentId: c.departmentId,
                batchId: c.batchId
            }));

            const batchQueries = shiftDepartmentPairs.map(criteria => {
                const query = {
                    shift: criteria.shift,
                    departmentId: criteria.departmentId
                };
                if (criteria.batchId) {
                    query._id = criteria.batchId;
                }
                return query;
            });

            const batches = await Batch.find({ $or: batchQueries }, '_id');
            const batchIds = batches.map(b => b._id.toString());

            if (batchIds.length === 0) return [];

            return ResultWorkflow.find({
                batchId: { $in: batchIds },
                status: { $in: ['SUBMITTED_TO_COMMITTEE', 'COMMITTEE_APPROVED', 'PUBLISHED'] }
            })
                .sort({ updatedAt: -1 })
                .lean();
        }

        return ResultWorkflow.find().sort({ updatedAt: -1 }).lean();
    }

    async submitToCommittee(batchId, courseId, semester, teacherId) {
        const workflow = await this.getWorkflow(batchId, courseId, semester);
        const assignment = await BatchCourseInstructor.findOne({
            batchId,
            courseId,
            instructorId: teacherId,
            status: "active",
        });
        if (!assignment) throw new ApiError(403, "Not authorized");

        if (
            workflow.status !== "DRAFT" &&
            workflow.status !== "RETURNED_TO_TEACHER"
        ) {
            throw new ApiError(400, "Cannot submit in current status");
        }

        workflow.status = "SUBMITTED_TO_COMMITTEE";
        workflow.approvals = [];
        workflow.history.push({
            status: "SUBMITTED_TO_COMMITTEE",
            changedBy: teacherId,
            comment: "Submitted for review",
        });
        return workflow.save();
    }

    async approveByCommittee(workflowId, committeeMemberId, comment, memberName) {
        const workflow = await ResultWorkflow.findById(workflowId);
        if (!workflow) throw new ApiError(404, "Workflow not found");

        if (workflow.status !== "SUBMITTED_TO_COMMITTEE" && workflow.status !== "COMMITTEE_APPROVED") {
            throw new ApiError(400, "Result is not pending committee approval");
        }

        const batch = await Batch.findById(workflow.batchId);
        if (!batch) throw new ApiError(404, "Batch not found");

        const isMember = await ExamCommittee.findOne({
            departmentId: batch.departmentId,
            teacherId: committeeMemberId,
            status: true,
            shift: batch.shift,
            $or: [{ batchId: null }, { batchId: workflow.batchId }],
        });

        if (!isMember) {
            throw new ApiError(
                403,
                `You are not a member of the ${batch.shift} shift Exam Committee for this batch/department`
            );
        }

        // Check if already approved
        const alreadyApproved = workflow.approvals.some(a => a.memberId === committeeMemberId);
        if (alreadyApproved) {
            throw new ApiError(400, "You have already approved this result");
        }

        workflow.approvals.push({
            memberId: committeeMemberId,
            name: memberName || "Committee Member",
            timestamp: new Date()
        });

        // Check if ALL members have approved
        const totalMembers = await ExamCommittee.countDocuments({
            departmentId: batch.departmentId,
            shift: batch.shift,
            status: true,
            $or: [{ batchId: null }, { batchId: workflow.batchId }],
        });

        const approvedCount = workflow.approvals.length;

        // If all members have approved
        if (approvedCount >= totalMembers) {
            workflow.status = "COMMITTEE_APPROVED";
            workflow.history.push({
                status: "COMMITTEE_APPROVED",
                changedBy: committeeMemberId,
                comment: "Approved by all committee members",
            });
        } else {
            workflow.history.push({
                status: "SUBMITTED_TO_COMMITTEE",
                changedBy: committeeMemberId,
                comment: `Approved by 1 member (${approvedCount}/${totalMembers})`,
            });
        }

        return workflow.save();
    }

    async returnToTeacher(workflowId, reviewerId, comment) {
        const workflow = await ResultWorkflow.findById(workflowId);
        if (!workflow) throw new ApiError(404, "Workflow not found");

        if (
            workflow.status !== "SUBMITTED_TO_COMMITTEE" &&
            workflow.status !== "COMMITTEE_APPROVED"
        ) {
            throw new ApiError(400, "Cannot return result in current status");
        }

        workflow.status = "RETURNED_TO_TEACHER";
        workflow.returnRequested = false;
        workflow.approvals = []; // Reset approvals
        workflow.history.push({
            status: "RETURNED_TO_TEACHER",
            changedBy: reviewerId,
            comment,
        });
        return workflow.save();
    }

    async publishResult(workflowId, userId, userRole, committeeMemberId = null) {
        const workflow = await ResultWorkflow.findById(workflowId);
        if (!workflow) throw new ApiError(404, "Workflow not found");

        if (workflow.status !== "COMMITTEE_APPROVED") {
            throw new ApiError(400, "Result must be fully approved by committee first");
        }

        // Allowed roles: exam_controller OR a valid committee member
        let isAuthorized = false;
        if (userRole === 'exam_controller') isAuthorized = true;

        if (!isAuthorized && committeeMemberId) {
            const batch = await Batch.findById(workflow.batchId);
            const isMember = await ExamCommittee.findOne({
                departmentId: batch.departmentId,
                teacherId: committeeMemberId,
                status: true,
                shift: batch.shift,
                $or: [{ batchId: null }, { batchId: workflow.batchId }],
            });
            if (isMember) isAuthorized = true;
        }

        if (!isAuthorized) {
            throw new ApiError(403, "Not authorized to publish results");
        }

        workflow.status = "PUBLISHED";
        workflow.history.push({
            status: "PUBLISHED",
            changedBy: userId,
            comment: "Result Published",
        });

        await CourseGrade.updateMany(
            {
                batchId: workflow.batchId,
                courseId: workflow.courseId,
                semester: workflow.semester,
            },
            { isPublished: true, publishedAt: new Date() }
        );

        return workflow.save();
    }

    async requestReturn(workflowId, teacherId, comment) {
        const workflow = await ResultWorkflow.findById(workflowId);
        if (!workflow) throw new ApiError(404, "Workflow not found");

        if (workflow.status !== "PUBLISHED") {
            throw new ApiError(400, "Can only request return for published results");
        }

        workflow.returnRequested = true;
        workflow.returnRequestComment = comment;
        workflow.history.push({
            status: "PUBLISHED",
            changedBy: teacherId,
            comment: `Return Requested: ${comment}`,
        });
        return workflow.save();
    }

    async approveReturnRequest(workflowId, userId, userRole) {
        const workflow = await ResultWorkflow.findById(workflowId);
        if (!workflow) throw new ApiError(404, "Workflow not found");

        if (!workflow.returnRequested) {
            throw new ApiError(400, "No return request pending");
        }

        if (userRole !== 'exam_controller') {
            throw new ApiError(
                403,
                "Only the Exam Controller can approve return requests"
            );
        }

        workflow.status = "RETURNED_TO_TEACHER";
        workflow.returnRequested = false;
        workflow.history.push({
            status: "RETURNED_TO_TEACHER",
            changedBy: headId,
            comment: "Return Request Approved",
        });

        await CourseGrade.updateMany(
            {
                batchId: workflow.batchId,
                courseId: workflow.courseId,
                semester: workflow.semester,
            },
            { isPublished: false, publishedAt: null }
        );

        return workflow.save();
    }
}

export default new ResultWorkflowService();
