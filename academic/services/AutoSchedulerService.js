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

    async generateSchedule(sessionId, generatedBy, options = {}) {
        const {
            batchIds, departmentId, selectionMode = 'all',
            classDurationMinutes, classDurations,
            workingDays, offDays, customTimeSlots, preferredRooms,
            targetShift = null,
            groupLabsTogether = true
        } = options;

        // Derive shift-specific working days if the user didn't override them
        const SHIFT_DEFAULT_WORKING_DAYS = {
            day: ['Saturday', 'Sunday', 'Wednesday', 'Thursday'],
            evening: ['Tuesday', 'Friday']
        };
        const effectiveWorkingDays = workingDays && workingDays.length > 0
            ? workingDays
            : (targetShift && SHIFT_DEFAULT_WORKING_DAYS[targetShift]
                ? SHIFT_DEFAULT_WORKING_DAYS[targetShift]
                : workingDays);

        timeSlotEngine.configure({
            classDurationMinutes, classDurations,
            workingDays: effectiveWorkingDays, offDays, customTimeSlots,
            targetShift,
            groupLabsTogether
        });
        clearTimeCache();

        const validation = await scheduleDataService.validatePrerequisites(sessionId, batchIds, departmentId);
        if (!validation.valid) {
            throw {
                type: 'VALIDATION_ERROR',
                message: 'Prerequisites not met for schedule generation',
                errors: validation.errors,
                unassignedCourses: validation.unassignedCourses
            };
        }

        const data = await scheduleDataService.gatherSchedulingData(sessionId, timeSlotEngine, batchIds, departmentId);

        if (data.batches.length === 0) throw new Error("No batches found for scheduling");
        if (data.courses.length === 0) throw new Error("No courses found for scheduling");
        if (data.classrooms.length === 0) throw new Error("No classrooms available");

        const existingScheduleEntries = await this._buildExistingScheduleEntries(
            sessionId, data.batches.map(b => b.id.toString())
        );

        const allTasks = this._buildTasks(data, timeSlotEngine, preferredRooms);
        if (allTasks.length === 0) {
            throw new Error("No scheduling tasks generated. Ensure courses have teachers assigned.");
        }

        const { schedule, unscheduled, newScheduleStartIndex } = this._runSchedulingPipeline(
            allTasks, data.batches, data.classrooms, existingScheduleEntries, timeSlotEngine, groupLabsTogether
        );

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
            totalTasks: allTasks.length,
            unscheduledCount: unscheduled.length,
            conflictsCount: timeSlotEngine.conflicts.length,
            warningsCount: timeSlotEngine.warnings.length,
            selectionMode,
            batchIds: batchIds || [],
            departmentId: departmentId || null,
            algorithm: 'shift_separated_sequential',
            classDurationMinutes: timeSlotEngine.classDurationMinutes,
            classDurations: timeSlotEngine.classDurations,
            workingDays: timeSlotEngine.workingDays,
            shiftConfig: timeSlotEngine.shiftConfig,
            targetShift: targetShift,
            groupLabsTogether: groupLabsTogether,
            batchRoomAssignments: timeSlotEngine.getBatchRoomAssignments(),
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
                unscheduledCourses: unscheduled.map(t => ({
                    courseCode: t.course.code,
                    courseName: t.course.name,
                    courseType: t.course.type,
                    batchName: t.batch.name,
                    batchShift: t.batch.shift,
                    teacherName: t.teacherName,
                    reason: 'No available time slot found'
                })),
                conflicts: timeSlotEngine.conflicts,
                warnings: timeSlotEngine.warnings,
                existingSchedulesConsidered: existingScheduleEntries.length,
                batchRoomAssignments: timeSlotEngine.getBatchRoomAssignments()
            }
        };
    }

    async _buildExistingScheduleEntries(sessionId, schedulingBatchIds) {
        const existingActiveSchedules = await CourseSchedule.getActiveSchedules(schedulingBatchIds);
        const entries = existingActiveSchedules.map(s => ({
            batchId: s.batchId, teacherId: s.teacherId,
            classroomId: s.classroomId, daysOfWeek: s.daysOfWeek,
            startTime: s.startTime, endTime: s.endTime,
            sessionCourseId: s.sessionCourseId,
            batchShift: s.batchShift
        }));

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
                    batchShift: s.batchShift,
                    isPending: true
                })));
            }
        }
        return entries;
    }

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

                const batchShift = engine.getShiftForBatch(batch);
                const sessionsPerWeek = engine.getSessionsPerWeek(course.credits, course.type, batchShift);

                // Evening theory: 100 minutes per session (single longer session)
                let taskDuration = course.durationMinutes;
                if (batchShift === 'evening' && course.type === 'theory') {
                    taskDuration = engine.classDurations.lab || 100;
                }

                for (let session = 0; session < sessionsPerWeek; session++) {
                    tasks.push({
                        batch, course,
                        teacherId: assignment.teacherId,
                        teacherName: assignment.teacherName,
                        sessionNumber: session + 1,
                        durationMinutes: taskDuration,
                        preferredRoomId: preferredRooms
                            ? (preferredRooms[course.type] || (course.type === 'project' ? preferredRooms.lab : null))
                            : null
                    });
                }
            }
        }
        return tasks;
    }

    _runSchedulingPipeline(allTasks, batches, classrooms, existingEntries, engine, groupLabsTogether) {
        const schedule = [...existingEntries];
        const newScheduleStartIndex = schedule.length;
        const unscheduled = [];

        const dayBatches = batches.filter(b => engine.getShiftForBatch(b) === 'day');
        const eveningBatches = batches.filter(b => engine.getShiftForBatch(b) === 'evening');

        /**
         * Schedule labs for all batches first (best-effort grouping).
         * Labs are done first so they get priority on lab rooms and days.
         */
        const scheduleLabsForGroup = (batchGroup) => {
            for (const batch of batchGroup) {
                const batchTasks = allTasks.filter(t => t.batch.id.toString() === batch.id.toString());
                const labTasks = batchTasks.filter(t => t.course.type === 'lab' || t.course.type === 'project');
                if (labTasks.length === 0) continue;

                if (groupLabsTogether) {
                    const labResult = engine.scheduleLabsForBatch(batch, labTasks, classrooms, schedule);
                    for (const t of labResult.unscheduled) unscheduled.push(t);
                } else {
                    for (const task of labTasks) {
                        const scheduled = engine.scheduleTask(task, classrooms, schedule);
                        if (!scheduled) unscheduled.push(task);
                    }
                }
            }
        };

        /**
         * Schedule theory tasks using round-robin interleaving across batches.
         * Round 1: schedule session 1 of each course for each batch (one per batch per round)
         * Round 2: schedule session 2 of each course for each batch
         */
        const scheduleTheoryRoundRobin = (batchGroup) => {
            // Group theory tasks by batch, then by session number
            const batchTaskQueues = batchGroup.map(batch => {
                const batchTasks = allTasks.filter(t =>
                    t.batch.id.toString() === batch.id.toString() &&
                    t.course.type === 'theory'
                );
                // Sort by session number so session 1 comes before session 2
                return batchTasks.sort((a, b) => a.sessionNumber - b.sessionNumber);
            }).filter(q => q.length > 0);

            // Round-robin: take one task from each batch queue per round
            let anyProgress = true;
            while (anyProgress) {
                anyProgress = false;
                for (const queue of batchTaskQueues) {
                    if (queue.length === 0) continue;
                    const task = queue.shift();
                    const scheduled = engine.scheduleTask(task, classrooms, schedule);
                    if (!scheduled) {
                        unscheduled.push(task);
                    }
                    anyProgress = true;
                }
            }
        };

        // Process day shift
        scheduleLabsForGroup(dayBatches);
        scheduleTheoryRoundRobin(dayBatches);

        // Process evening shift
        scheduleLabsForGroup(eveningBatches);
        scheduleTheoryRoundRobin(eveningBatches);

        // Retry pass: allow same-day scheduling for tasks that failed
        const retry1 = [...unscheduled];
        unscheduled.length = 0;
        for (const task of retry1) {
            const scheduled = engine.scheduleTaskRelaxed(task, classrooms, schedule);
            if (!scheduled) {
                unscheduled.push(task);
                engine.conflicts.push({
                    type: 'UNSCHEDULED_FINAL',
                    courseCode: task.course.code,
                    courseName: task.course.name,
                    batchName: task.batch.name,
                    teacherName: task.teacherName,
                    reason: 'No available time slot found in batch shift'
                });
            }
        }

        // Post-optimization: rebalance theory classes for even day distribution
        engine.rebalanceSchedule(schedule, newScheduleStartIndex, [...dayBatches, ...eveningBatches], classrooms);

        return { schedule, unscheduled, newScheduleStartIndex };
    }

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

    async checkExistingConflicts(batchIds, sessionId) {
        const schedules = await CourseSchedule.find({
            batchId: { $in: batchIds },
            isActive: true, status: 'active'
        }).lean();
        return timeSlotEngine.detectConflicts(schedules);
    }

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
