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
        if (forCommittee || user.isExamCommitteeMember) {
            const teacherId = user.id || user.sub;
            const committees = await academicClient.getTeacherCommittees(teacherId);
            if (!committees || committees.length === 0) {
                return [];
            }

            const shiftDepartmentPairs = committees.map(c => ({
                shift: c.shift,
                departmentId: typeof c.departmentId === 'object' ? c.departmentId.id : c.departmentId,
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

            if (batchQueries.length === 0) return [];

            const batches = await Batch.find({ $or: batchQueries });
            const batchIds = batches.map(b => b._id.toString());
            const batchDataMap = batches.reduce((acc, batch) => {
                acc[batch._id.toString()] = {
                    currentSemester: parseInt(batch.currentSemester) || 1,
                    sessionId: batch.sessionId?.toString() || batch.sessionId,
                    departmentId: batch.departmentId?.toString() || batch.departmentId
                };
                return acc;
            }, {});

            if (batchIds.length === 0) return [];

            const validCourseIdsPerBatch = {};
            for (const batch of batches) {
                try {
                    const batchId = batch._id.toString();
                    const currentSemester = parseInt(batch.currentSemester) || 1;
                    const sessionId = batch.sessionId?.toString() || batch.sessionId;
                    const departmentId = batch.departmentId?.toString() || batch.departmentId;

                    // Get session courses for this batch's session, department, and current semester
                    const sessionCoursesResponse = await academicClient.getSessionCourses(
                        sessionId,
                        currentSemester,
                        departmentId
                    );

                    let sessionCourses = [];
                    if (sessionCoursesResponse?.data?.data) {
                        sessionCourses = sessionCoursesResponse.data.data;
                    } else if (sessionCoursesResponse?.data && Array.isArray(sessionCoursesResponse.data)) {
                        sessionCourses = sessionCoursesResponse.data;
                    } else if (Array.isArray(sessionCoursesResponse)) {
                        sessionCourses = sessionCoursesResponse;
                    }

                    // Extract course IDs
                    validCourseIdsPerBatch[batchId] = new Set(
                        sessionCourses.map(sc => {
                            const courseId = typeof sc.courseId === 'object'
                                ? (sc.courseId.id || sc.courseId._id)
                                : sc.courseId;
                            return courseId?.toString();
                        }).filter(Boolean)
                    );
                } catch (error) {
                    validCourseIdsPerBatch[batch._id.toString()] = new Set();
                }
            }

            // 1. Get all Expected Courses (Active Assignments)
            const allAssignments = await BatchCourseInstructor.find({
                batchId: { $in: batchIds },
                status: 'active'
            }).lean();

            const assignments = allAssignments.filter(a => {
                const batchId = a.batchId.toString();
                const courseId = a.courseId.toString();
                const validCourseIds = validCourseIdsPerBatch[batchId];
                const isValid = validCourseIds && validCourseIds.has(courseId);

                return isValid;
            });

            // 2. Get all Existing Workflows for these batches
            const allWorkflows = await ResultWorkflow.find({
                batchId: { $in: batchIds }
            }).lean();

            const existingWorkflows = allWorkflows.filter(wf => {
                const batchId = wf.batchId.toString();
                const courseId = wf.courseId.toString();
                const validCourseIds = validCourseIdsPerBatch[batchId];
                return validCourseIds && validCourseIds.has(courseId);
            });

            // 3. Track processed workflow IDs
            const processedWorkflowIds = new Set();

            // 4. Merge assignments with workflows
            workflows = assignments.map(assignment => {
                const wf = existingWorkflows.find(w =>
                    w.batchId.toString() === assignment.batchId.toString() &&
                    w.courseId.toString() === assignment.courseId.toString()
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
        workflow.approvals = [];
        workflow.history.push({
            status: "RETURNED_TO_TEACHER",
            changedBy: reviewerId,
            comment,
        });

        await workflow.save();
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
                    // Send notification via HTTP client
                    await notificationServiceClient.sendResultReturnedNotification(
                        assignment.instructorId,
                        {
                            courseName: course.title || course.name,
                            courseCode: course.code,
                            batchName: batch.name,
                            batchShift: batch.shift,
                            semester: workflow.semester,
                            comment: comment,
                            workflowId: workflow._id.toString(),
                            courseId: workflow.courseId.toString(),
                            batchId: workflow.batchId.toString()
                        }
                    );
                }
            }
        } catch (error) {}

        return workflow;
    }

    async publishResult(workflowId, userId, userRole, committeeMemberId = null) {
        const workflow = await ResultWorkflow.findById(workflowId);
        if (!workflow) throw new ApiError(404, "Workflow not found");

        if (workflow.status !== "COMMITTEE_APPROVED") {
            throw new ApiError(400, "Result must be fully approved by committee first");
        }

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

    async publishBatchSemesterResults(batchId, semester, userId, userRole, committeeMemberId = null) {
        const workflows = await ResultWorkflow.find({
            batchId,
            semester: parseInt(semester),
            status: "COMMITTEE_APPROVED"
        });

        if (workflows.length === 0) {
            throw new ApiError(400, "No approved results found for this batch and semester");
        }

        let isAuthorized = false;
        if (userRole === 'exam_controller') isAuthorized = true;

        if (!isAuthorized && committeeMemberId) {
            const batch = await Batch.findById(batchId);
            if (batch) {
                const { isMember } = await academicClient.checkExamCommitteeMembership(
                    batch.departmentId,
                    committeeMemberId,
                    batch.shift,
                    batchId
                );
                if (isMember) isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            throw new ApiError(403, "Not authorized to publish results");
        }

        const publishedWorkflows = [];
        const errors = [];
        for (const workflow of workflows) {
            try {
                workflow.status = "PUBLISHED";
                workflow.history.push({
                    status: "PUBLISHED",
                    changedBy: userId,
                    comment: "Result Published (Bulk)",
                });
                await workflow.save();
                await CourseGrade.updateMany(
                    {
                        batchId: workflow.batchId,
                        courseId: workflow.courseId,
                        semester: workflow.semester,
                    },
                    { isPublished: true, publishedAt: new Date() }
                );

                publishedWorkflows.push(workflow);
            } catch (error) {
                errors.push({ workflowId: workflow._id, error: error.message });
            }
        }

        const batch = await Batch.findById(batchId).lean();

        return {
            batchId,
            batchName: batch?.name,
            semester,
            totalApproved: workflows.length,
            publishedCount: publishedWorkflows.length,
            failedCount: errors.length,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    async getApprovedWorkflowsSummary(user) {
        const teacherId = user.id || user.sub;
        const committees = await academicClient.getTeacherCommittees(teacherId);
        if (!committees || committees.length === 0) {
            return [];
        }

        const shiftDepartmentPairs = committees.map(c => ({
            shift: c.shift,
            departmentId: typeof c.departmentId === 'object' ? c.departmentId.id : c.departmentId,
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

        const batches = await Batch.find({ $or: batchQueries }).lean();
        const batchIds = batches.map(b => b._id.toString());
        if (batchIds.length === 0) return [];

        const approvedWorkflows = await ResultWorkflow.aggregate([
            {
                $match: {
                    batchId: { $in: batchIds },
                    status: "COMMITTEE_APPROVED"
                }
            },
            {
                $group: {
                    _id: { batchId: "$batchId", semester: "$semester" },
                    count: { $sum: 1 },
                    workflows: { $push: "$$ROOT" }
                }
            }
        ]);

        const batchMap = batches.reduce((acc, b) => ({ ...acc, [b._id.toString()]: b }), {});

        return approvedWorkflows.map(group => ({
            batchId: group._id.batchId,
            batch: batchMap[group._id.batchId],
            semester: group._id.semester,
            approvedCount: group.count,
            workflows: group.workflows
        }));
    }
}

export default new ResultWorkflowService();
