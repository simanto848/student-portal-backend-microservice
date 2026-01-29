import ResultWorkflow from "../models/ResultWorkflow.js";
import CourseGrade from "../models/CourseGrade.js";
import BatchCourseInstructor from "../models/BatchCourseInstructor.js";
import { Batch, Course } from "../models/external/Academic.js";
import notificationServiceClient from "../client/notificationServiceClient.js";
import academicClient from "../client/academicServiceClient.js";
import { ApiError, createLogger } from "shared";

const logger = createLogger('RESULT_WORKFLOW');

class ResultWorkflowService {
    async getWorkflow(batchId, courseId, semester) {
        let workflow = await ResultWorkflow.findOne({
            batchId,
            courseId,
            semester,
        }).lean();

        if (!workflow) {
            workflow = await ResultWorkflow.create({ batchId, courseId, semester });
            workflow = workflow.toObject();
        }

        const [course, batch] = await Promise.all([
            Course.findById(courseId).lean(),
            Batch.findById(batchId).lean()
        ]);

        return {
            ...workflow,
            grade: {
                course,
                batch: batch ? { ...batch, code: batch.name } : null,
                semester
            }
        };
    }

    async getWorkflowById(id) {
        if (id.startsWith('virtual-')) {
            const parts = id.split('-');
            if (parts.length >= 3) {
                const batchId = parts[1];
                const courseId = parts[2];
                const assignment = await BatchCourseInstructor.findOne({
                    batchId,
                    courseId,
                    status: 'active'
                });

                if (!assignment) throw new ApiError(404, "Assignment not found for virtual workflow");

                return this.getWorkflow(batchId, courseId, assignment.semester);
            }
        }

        const workflow = await ResultWorkflow.findById(id).lean();
        if (!workflow) throw new ApiError(404, "Workflow not found");

        const [course, batch] = await Promise.all([
            Course.findById(workflow.courseId).lean(),
            Batch.findById(workflow.batchId).lean()
        ]);

        return {
            ...workflow,
            grade: {
                course,
                batch: batch ? { ...batch, code: batch.name } : null,
                semester: workflow.semester
            }
        };
    }

    async listWorkflows(user, forCommittee = false) {
        let workflows = [];

        // If called for committee view, check committee membership first
        if (forCommittee || user.isExamCommitteeMember) {
            const teacherId = user.id || user.sub;
            const committees = await academicClient.getTeacherCommittees(teacherId);

            if (!committees || committees.length === 0) {
                logger.info(`[Committee] No committees found for teacher ${teacherId}`);
                return [];
            }

            // Handle departmentId being either a string or an object {id, name}
            const shiftDepartmentPairs = committees.map(c => ({
                shift: c.shift,
                departmentId: typeof c.departmentId === 'object' ? c.departmentId.id : c.departmentId,
                batchId: c.batchId
            }));

            logger.info(`[Committee] Found ${committees.length} committees, shift/dept pairs: ${JSON.stringify(shiftDepartmentPairs)}`);

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

            if (batchQueries.length === 0) return [];

            logger.info(`[Committee] Batch queries: ${JSON.stringify(batchQueries)}`);
            const batches = await Batch.find({ $or: batchQueries }, '_id');
            const batchIds = batches.map(b => b._id.toString());
            logger.info(`[Committee] Found ${batches.length} batches: ${batchIds.join(', ')}`);

            if (batchIds.length === 0) return [];

            // 1. Get all Expected Courses (Active Assignments)
            const assignments = await BatchCourseInstructor.find({
                batchId: { $in: batchIds },
                status: 'active'
            }).lean();

            logger.info(`[Committee] Found ${assignments.length} active assignments`);

            // 2. Get all Existing Workflows for these batches
            const existingWorkflows = await ResultWorkflow.find({
                batchId: { $in: batchIds }
            }).lean();

            logger.info(`[Committee] Found ${existingWorkflows.length} existing workflows for batches: ${batchIds.join(', ')}`);
            existingWorkflows.forEach(wf => {
                logger.info(`[Committee] Workflow ${wf._id}: status=${wf.status}, courseId=${wf.courseId}`);
            });

            // 3. Track processed workflow IDs
            const processedWorkflowIds = new Set();

            // 4. Merge assignments with workflows
            workflows = assignments.map(assignment => {
                const wf = existingWorkflows.find(w =>
                    w.batchId.toString() === assignment.batchId.toString() &&
                    w.courseId.toString() === assignment.courseId.toString() &&
                    w.semester === assignment.semester
                );

                if (wf) {
                    processedWorkflowIds.add(wf._id.toString());
                    if (['SUBMITTED_TO_COMMITTEE', 'COMMITTEE_APPROVED', 'PUBLISHED'].includes(wf.status)) {
                        return { ...wf, instructorId: assignment.instructorId };
                    }
                }

                return {
                    _id: wf ? wf._id : `virtual-${assignment.batchId}-${assignment.courseId}`,
                    batchId: assignment.batchId,
                    courseId: assignment.courseId,
                    semester: assignment.semester,
                    status: 'WITH_INSTRUCTOR',
                    updatedAt: wf ? wf.updatedAt : assignment.updatedAt,
                    instructorId: assignment.instructorId
                };
            });

            // 5. Add orphaned workflows (submitted/approved but no active assignment)
            const orphanedWorkflows = existingWorkflows.filter(wf =>
                !processedWorkflowIds.has(wf._id.toString()) &&
                ['SUBMITTED_TO_COMMITTEE', 'COMMITTEE_APPROVED'].includes(wf.status)
            );

            workflows = [...workflows, ...orphanedWorkflows];

            workflows.sort((a, b) => {
                const priority = {
                    'SUBMITTED_TO_COMMITTEE': 0,
                    'COMMITTEE_APPROVED': 1,
                    'PUBLISHED': 2,
                    'WITH_INSTRUCTOR': 3
                };
                const pA = priority[a.status] ?? 99;
                const pB = priority[b.status] ?? 99;

                if (pA !== pB) return pA - pB;
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            });

        } else if (user.role === "teacher") {
            // Teacher viewing their own courses (not committee view)
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

            workflows = await ResultWorkflow.find({
                $or: queries,
            })
                .sort({ updatedAt: -1 })
                .lean();

        } else {
            // Admin or other roles - show all workflows
            workflows = await ResultWorkflow.find().sort({ updatedAt: -1 }).lean();
        }

        if (workflows.length > 0) {
            const courseIds = [...new Set(workflows.map(w => w.courseId.toString()))];
            const batchIds = [...new Set(workflows.map(w => w.batchId.toString()))];

            const [courses, batches] = await Promise.all([
                Course.find({ _id: { $in: courseIds } }).lean(),
                Batch.find({ _id: { $in: batchIds } }).lean()
            ]);

            const courseMap = courses.reduce((acc, c) => ({ ...acc, [c._id.toString()]: c }), {});
            const batchMap = batches.reduce((acc, b) => ({ ...acc, [b._id.toString()]: b }), {});

            workflows = workflows.map(w => ({
                ...w,
                grade: {
                    course: courseMap[w.courseId.toString()],
                    batch: batchMap[w.batchId.toString()] ? { ...batchMap[w.batchId.toString()], code: batchMap[w.batchId.toString()].name } : null,
                    semester: w.semester
                }
            }));
        }

        logger.info(`[Committee] Returning ${workflows.length} workflows total`);
        return workflows;
    }

    async submitToCommittee(batchId, courseId, semester, teacherId) {
        let workflow = await ResultWorkflow.findOne({
            batchId,
            courseId,
            semester,
        });

        if (!workflow) {
            workflow = await ResultWorkflow.create({ batchId, courseId, semester });
        }

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

        // Check committee membership via academic service API
        const { isMember } = await academicClient.checkExamCommitteeMembership(
            batch.departmentId,
            committeeMemberId,
            batch.shift,
            workflow.batchId
        );

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

        // Single member approval is sufficient now
        workflow.status = "COMMITTEE_APPROVED";
        workflow.history.push({
            status: "COMMITTEE_APPROVED",
            changedBy: committeeMemberId,
            comment: "Approved by committee member",
        });

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

        await workflow.save();

        // Send Anonymous Notification to Instructor (Email + In-App)
        try {
            // 1. Find the instructor
            const assignment = await BatchCourseInstructor.findOne({
                batchId: workflow.batchId,
                courseId: workflow.courseId,
                semester: workflow.semester,
                status: 'active'
            });

            if (assignment) {
                const [course, batch] = await Promise.all([
                    Course.findById(workflow.courseId),
                    Batch.findById(workflow.batchId)
                ]);

                if (course && batch) {
                    // Send notification via HTTP client - keeps it anonymous
                    // We do NOT pass reviewerId to maintain anonymity
                    await notificationServiceClient.sendResultReturnedNotification(
                        assignment.instructorId,
                        {
                            courseName: course.title || course.name,
                            courseCode: course.code,
                            batchName: batch.name,
                            batchShift: batch.shift, // Include shift for D-/E- prefix
                            semester: workflow.semester,
                            comment: comment,
                            workflowId: workflow._id.toString(),
                            courseId: workflow.courseId.toString(),
                            batchId: workflow.batchId.toString()
                        }
                    );
                    logger.info(`Result return notification sent to instructor ${assignment.instructorId} for course ${course.code}`);
                }
            }
        } catch (error) {
            logger.error("Failed to send return notification:", error.message);
            // Don't fail the transaction just because notification failed
        }

        return workflow;
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
            const { isMember } = await academicClient.checkExamCommitteeMembership(
                batch.departmentId,
                committeeMemberId,
                batch.shift,
                workflow.batchId
            );
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
