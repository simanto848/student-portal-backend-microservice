import CourseSchedule from "../models/CourseSchedule.js";
import ScheduleProposal from "../models/ScheduleProposal.js";

import { clearTimeCache } from "./utils/timeUtils.js";
import timeSlotEngine from "./scheduler/TimeSlotEngine.js";
import scheduleDataService from "./scheduler/ScheduleDataService.js";
import scheduleProposalService from "./scheduler/ScheduleProposalService.js";

class AutoSchedulerService {
    async validatePrerequisites(sessionId, batchIds, departmentId = null) {
        return scheduleDataService.validatePrerequisites(sessionId, batchIds, departmentId);
    }

    // Main scheduling algorithm using constraint satisfaction with backtracking
    async generateSchedule(sessionId, generatedBy, options = {}) {
        const {
            batchIds, departmentId, selectionMode = 'all',
            classDurationMinutes, classDurations,
            workingDays, offDays, customTimeSlots, preferredRooms
        } = options;

        // Configure the engine for this run
        timeSlotEngine.configure({
            classDurationMinutes, classDurations,
            workingDays, offDays, customTimeSlots
        });
        clearTimeCache();

        // Validate prerequisites
        const validation = await scheduleDataService.validatePrerequisites(sessionId, batchIds, departmentId);
        if (!validation.valid) {
            throw {
                type: 'VALIDATION_ERROR',
                message: 'Prerequisites not met for schedule generation',
                errors: validation.errors,
                unassignedCourses: validation.unassignedCourses
            };
        }

        // Gather data
        const data = await scheduleDataService.gatherSchedulingData(sessionId, timeSlotEngine, batchIds, departmentId);

        if (data.batches.length === 0) throw new Error("No batches found for scheduling");
        if (data.courses.length === 0) throw new Error("No courses found for scheduling");
        if (data.classrooms.length === 0) throw new Error("No classrooms available");

        // Build initial schedule from existing active schedules + pending proposals
        const existingScheduleEntries = await this._buildExistingScheduleEntries(
            sessionId, data.batches.map(b => b.id.toString())
        );

        // Build scheduling tasks
        const tasks = this._buildTasks(data, timeSlotEngine, preferredRooms);
        if (tasks.length === 0) {
            throw new Error("No scheduling tasks generated. Ensure courses have teachers assigned.");
        }

        // Sort: labs first, then by batch size (descending)
        tasks.sort((a, b) => {
            if (a.course.type !== b.course.type) {
                if (a.course.type === 'lab') return -1;
                if (b.course.type === 'lab') return 1;
            }
            return b.batch.studentCount - a.batch.studentCount;
        });

        // Run the 4-level scheduling (strict → relaxed → same-day → alternate-shift)
        const { schedule, unscheduled, newScheduleStartIndex } = this._runSchedulingPipeline(
            tasks, data.classrooms, existingScheduleEntries, timeSlotEngine
        );

        // Create proposal from new schedules only
        const newSchedules = schedule.slice(newScheduleStartIndex);
        const scheduleData = newSchedules.map(s => ({
            sessionId, sessionCourseId: s.sessionCourseId,
            batchId: s.batchId, classroomId: s.classroomId,
            teacherId: s.teacherId, daysOfWeek: s.daysOfWeek,
            startTime: s.startTime, endTime: s.endTime,
            classType: s.classType,
            batchName: s.batchName, batchShift: s.batchShift,
            courseName: s.courseName, courseCode: s.courseCode,
            teacherName: s.teacherName,
            roomName: `${s.roomNumber} (${s.building})`,
            isRecurring: true, status: 'active'
        }));

        const proposal = await scheduleProposalService.createProposal(
            sessionId, generatedBy, scheduleData, {
            generatedAt: new Date(),
            itemCount: scheduleData.length,
            totalTasks: tasks.length,
            unscheduledCount: unscheduled.length,
            conflictsCount: timeSlotEngine.conflicts.length,
            warningsCount: timeSlotEngine.warnings.length,
            selectionMode,
            batchIds: batchIds || [],
            departmentId: departmentId || null,
            algorithm: 'constraint_satisfaction_greedy',
            classDurationMinutes: timeSlotEngine.classDurationMinutes,
            classDurations: timeSlotEngine.classDurations,
            workingDays: timeSlotEngine.workingDays,
            shiftConfig: timeSlotEngine.shiftConfig,
            conflicts: timeSlotEngine.conflicts.slice(0, 10),
            warnings: timeSlotEngine.warnings.slice(0, 10),
            existingSchedulesConsidered: existingScheduleEntries.length
        }
        );

        return {
            proposal,
            stats: {
                scheduled: newSchedules.length,
                unscheduled: unscheduled.length,
                conflicts: timeSlotEngine.conflicts,
                warnings: timeSlotEngine.warnings,
                existingSchedulesConsidered: existingScheduleEntries.length
            }
        };
    }

    // Build the initial schedule entries from existing active schedules and pending proposals
    async _buildExistingScheduleEntries(sessionId, schedulingBatchIds) {
        const existingActiveSchedules = await CourseSchedule.getActiveSchedules(schedulingBatchIds);
        const entries = existingActiveSchedules.map(s => ({
            batchId: s.batchId, teacherId: s.teacherId,
            classroomId: s.classroomId, daysOfWeek: s.daysOfWeek,
            startTime: s.startTime, endTime: s.endTime,
            sessionCourseId: s.sessionCourseId
        }));

        // Include pending proposals to avoid overlap with unapproved schedules
        const pendingProposals = await ScheduleProposal.find({ sessionId, status: 'pending' }).lean();
        const schedulingBatchIdSet = new Set(schedulingBatchIds.map(id => id.toString()));

        for (const p of pendingProposals) {
            if (p.scheduleData && Array.isArray(p.scheduleData)) {
                const relevantSchedules = p.scheduleData.filter(s =>
                    !schedulingBatchIdSet.has(s.batchId?.toString()) &&
                    !schedulingBatchIdSet.has(s.batchId?._id?.toString())
                );
                entries.push(...relevantSchedules.map(s => ({
                    batchId: s.batchId?._id || s.batchId,
                    teacherId: s.teacherId?._id || s.teacherId,
                    classroomId: s.classroomId?._id || s.classroomId,
                    daysOfWeek: s.daysOfWeek,
                    startTime: s.startTime, endTime: s.endTime,
                    sessionCourseId: s.sessionCourseId,
                    isPending: true
                })));
            }
        }
        return entries;
    }

    // Build the list of scheduling tasks from gathered data
    _buildTasks(data, engine, preferredRooms) {
        const tasks = [];
        for (const batch of data.batches) {
            const batchCourses = data.courses.filter(c =>
                c.departmentId?.toString() === batch.departmentId?.toString() &&
                c.semester === batch.semester
            );

            for (const course of batchCourses) {
                const assignment = data.assignmentMap.get(`${batch.id}_${course.id}`);
                if (!assignment) {
                    engine.warnings.push(`No teacher assigned for ${course.code} in batch ${batch.name}`);
                    continue;
                }

                const sessionsPerWeek = engine.getSessionsPerWeek(course.credits, course.type);
                for (let session = 0; session < sessionsPerWeek; session++) {
                    tasks.push({
                        batch, course,
                        teacherId: assignment.teacherId,
                        teacherName: assignment.teacherName,
                        sessionNumber: session + 1,
                        durationMinutes: course.durationMinutes,
                        preferredRoomId: preferredRooms
                            ? (preferredRooms[course.type] || (course.type === 'project' ? preferredRooms.lab : null))
                            : null
                    });
                }
            }
        }
        return tasks;
    }

    // Run the 4-level scheduling pipeline: strict → relaxed → same-day → alternate-shift
    _runSchedulingPipeline(tasks, classrooms, existingEntries, engine) {
        const schedule = [...existingEntries];
        const newScheduleStartIndex = schedule.length;
        let unscheduled = [];

        // Level 1: Strict constraints
        for (const task of tasks) {
            const scheduled = engine.scheduleTask(task, classrooms, schedule);
            if (scheduled) {
                schedule.push(scheduled);
            } else {
                unscheduled.push(task);
                engine.conflicts.push({ type: 'UNSCHEDULED', task, reason: 'Could not find available slot' });
            }
        }

        // Level 2: Relaxed room constraints
        let retry = [...unscheduled];
        unscheduled = [];
        for (const task of retry) {
            const scheduled = engine.scheduleTaskRelaxed(task, classrooms, schedule);
            if (scheduled) {
                schedule.push(scheduled);
            } else {
                unscheduled.push(task);
            }
        }

        // Level 3: Same-day scheduling
        retry = [...unscheduled];
        unscheduled = [];
        for (const task of retry) {
            const scheduled = engine.scheduleTaskSameDay(task, classrooms, schedule);
            if (scheduled) {
                schedule.push(scheduled);
                engine.warnings.push(`${task.course.code} has multiple sessions on the same day due to limited slots`);
            } else {
                unscheduled.push(task);
            }
        }

        // Level 4: Alternate shift
        retry = [...unscheduled];
        unscheduled = [];
        for (const task of retry) {
            const scheduled = engine.scheduleTaskAlternateShift(task, classrooms, schedule);
            if (scheduled) {
                schedule.push(scheduled);
                engine.warnings.push(`${task.course.code} scheduled in alternate shift due to limited slots in primary shift`);
            } else {
                unscheduled.push(task);
                engine.conflicts.push({
                    type: 'UNSCHEDULED_FINAL',
                    courseCode: task.course.code, courseName: task.course.name,
                    batchName: task.batch.name, teacherName: task.teacherName,
                    reason: 'No available time slot found after trying all scheduling strategies'
                });
            }
        }

        return { schedule, unscheduled, newScheduleStartIndex };
    }

    // Proposal delegation

    async getProposals(sessionId) {
        return scheduleProposalService.getProposals(sessionId);
    }

    async getProposalById(id) {
        return scheduleProposalService.getProposalById(id);
    }

    async applyProposal(proposalId) {
        return scheduleProposalService.applyProposal(proposalId);
    }

    async deleteProposal(proposalId) {
        return scheduleProposalService.deleteProposal(proposalId);
    }

    // Conflict detection delegation

    async checkExistingConflicts(batchIds, sessionId) {
        const schedules = await CourseSchedule.find({
            batchId: { $in: batchIds },
            isActive: true, status: 'active'
        }).lean();
        return timeSlotEngine.detectConflicts(schedules);
    }

    //Schedule lifecycle delegation

    async closeSchedulesForBatches(batchIds) {
        const result = await CourseSchedule.closeBatchSchedules(batchIds);
        return {
            success: true,
            message: `Closed ${result.modifiedCount} schedules for ${batchIds.length} batches`,
            closedCount: result.modifiedCount
        };
    }

    async closeSchedulesForSession(sessionId) {
        const result = await CourseSchedule.closeSessionSchedules(sessionId);
        return {
            success: true,
            message: `Closed ${result.modifiedCount} schedules for session`,
            closedCount: result.modifiedCount
        };
    }

    async reopenSchedulesForBatches(batchIds) {
        const result = await CourseSchedule.updateMany(
            { batchId: { $in: batchIds }, status: 'closed', deletedAt: null },
            { $set: { status: 'active', closedAt: null } }
        );
        return {
            success: true,
            message: `Reopened ${result.modifiedCount} schedules for ${batchIds.length} batches`,
            reopenedCount: result.modifiedCount
        };
    }

    async getScheduleStatusSummary(batchIds = null) {
        const matchQuery = { isActive: true, deletedAt: null };
        if (batchIds && batchIds.length > 0) {
            matchQuery.batchId = { $in: batchIds };
        }
        const summary = await CourseSchedule.aggregate([
            { $match: matchQuery },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        return summary.reduce((acc, item) => ({
            ...acc, [item._id]: item.count
        }), { active: 0, closed: 0, archived: 0 });
    }

    async getActiveSchedules(batchIds = null) {
        const query = { status: 'active', isActive: true, deletedAt: null };
        if (batchIds && batchIds.length > 0) {
            query.batchId = { $in: batchIds };
        }
        return CourseSchedule.find(query)
            .populate('batchId')
            .populate('sessionCourseId')
            .populate('classroomId')
            .lean();
    }
}

export default new AutoSchedulerService();
