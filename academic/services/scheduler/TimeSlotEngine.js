import { timeToMinutes, minutesToTime } from '../utils/timeUtils.js';

/**
 * Shift time blocks.
 *
 * Day Shift:
 *   Block 1: 08:30 – 13:30  (classes must START and END within this block)
 *   Block 2: 14:00 – 17:20
 *
 * Evening Shift – Friday:
 *   Block 1: 08:30 – 13:00
 *   Block 2: 14:00 – 21:40
 *
 * Evening Shift – Tuesday:
 *   Block 1: 18:00 – 21:40  (Labs/Projects ONLY)
 *
 * Evening Shift – other days:
 *   Block 1: 18:00 – 21:40
 *
 * RULE: A class must start AND end within the same block.
 *       A batch's classes CANNOT cross from one block to another.
 *       A batch's classes CANNOT cross from one shift to another.
 */
const DEFAULT_SHIFT_CONFIG = {
    day: {
        blocks: [
            { start: '08:30', end: '13:30' },
            { start: '14:00', end: '17:20' }
        ]
    },
    evening: {
        Friday: {
            blocks: [
                { start: '08:30', end: '13:00' },
                { start: '14:00', end: '21:40' }
            ]
        },
        Tuesday: {
            blocks: [{ start: '18:00', end: '21:40' }],
            labOnly: true
        },
        default: {
            blocks: [{ start: '18:00', end: '21:40' }]
        }
    }
};

const ALL_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DEFAULT_WORKING_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

const DEFAULT_CLASS_DURATIONS_MINUTES = { theory: 75, lab: 100, project: 100 };

const ROOM_TYPE_REQUIREMENTS = {
    theory: ['Lecture Hall', 'Seminar Room', 'Conference Room'],
    lab: ['Laboratory', 'Computer Lab'],
    project: ['Laboratory', 'Computer Lab', 'Seminar Room']
};

class TimeSlotEngine {
    constructor() { this.reset(); }

    reset() {
        this.classDurations = { ...DEFAULT_CLASS_DURATIONS_MINUTES };
        this.workingDays = [...DEFAULT_WORKING_DAYS];
        this.shiftConfig = JSON.parse(JSON.stringify(DEFAULT_SHIFT_CONFIG));
        this.conflicts = [];
        this.warnings = [];
        this.batchRoomAssignments = new Map();
        this.targetShift = null;
        this.groupLabsTogether = true;
    }

    configure(options = {}) {
        const {
            classDurationMinutes,
            classDurations = null,
            workingDays = null,
            offDays = null,
            targetShift = null,
            groupLabsTogether = true
        } = options;

        this.classDurations = classDurations
            ? {
                theory: Number(classDurations.theory) || 75,
                lab: Number(classDurations.lab) || 100,
                project: Number(classDurations.project) || 100
            }
            : { ...DEFAULT_CLASS_DURATIONS_MINUTES };

        if (workingDays && workingDays.length > 0) {
            this.workingDays = [...workingDays];
        } else if (offDays && offDays.length > 0) {
            this.workingDays = ALL_DAYS.filter(d => !offDays.includes(d));
        } else {
            this.workingDays = [...DEFAULT_WORKING_DAYS];
        }

        this.shiftConfig = JSON.parse(JSON.stringify(DEFAULT_SHIFT_CONFIG));
        this.targetShift = targetShift;
        this.groupLabsTogether = groupLabsTogether;
        this.conflicts = [];
        this.warnings = [];
        this.batchRoomAssignments = new Map();
    }

    // ─── Shift Helpers ────────────────────────────────────────────────────────

    getShiftForBatch(batch) {
        if (this.targetShift) return this.targetShift;
        return batch?.shift || 'day';
    }

    getShiftBlocks(shift, day) {
        const cfg = this.shiftConfig[shift];
        if (!cfg) return this.shiftConfig.day.blocks;

        if (shift === 'evening') {
            if (day === 'Friday' && cfg.Friday) return cfg.Friday.blocks;
            if (day === 'Tuesday' && cfg.Tuesday) return cfg.Tuesday.blocks;
            return cfg.default?.blocks || [];
        }

        return cfg.blocks || [];
    }

    isLabOnlySlot(shift, day) {
        if (shift !== 'evening') return false;
        return day === 'Tuesday' && this.shiftConfig.evening.Tuesday?.labOnly === true;
    }

    // ─── Core Slot Finder ─────────────────────────────────────────────────────

    /**
     * Find the earliest available slot within the shift's blocks for a given day.
     *
     * Strategy:
     *   For each block, scan from blockStart forward in 1-minute increments,
     *   skipping past any entry that conflicts with batch, teacher, or room.
     *   The slot MUST fit entirely within the block (no cross-block classes).
     */
    getNextAvailableSlot(batchId, day, durationMinutes, shift, currentSchedule, teacherId = null, roomId = null) {
        const batchIdStr = batchId?.toString();
        const teacherIdStr = teacherId?.toString() || null;
        const roomIdStr = roomId?.toString() || null;
        const blocks = this.getShiftBlocks(shift, day);

        // Build a sorted list of all busy intervals on this day that affect us
        const busyIntervals = currentSchedule
            .filter(s => s.daysOfWeek?.includes(day))
            .map(s => ({
                batchId: s.batchId?.toString(),
                teacherId: s.teacherId?.toString(),
                classroomId: s.classroomId?.toString(),
                start: timeToMinutes(s.startTime),
                end: timeToMinutes(s.endTime)
            }))
            .filter(e =>
                e.batchId === batchIdStr ||
                (teacherIdStr && e.teacherId === teacherIdStr) ||
                (roomIdStr && e.classroomId === roomIdStr)
            )
            .sort((a, b) => a.start - b.start);

        for (const block of blocks) {
            const blockStart = timeToMinutes(block.start);
            const blockEnd = timeToMinutes(block.end);

            let candidateStart = blockStart;

            while (candidateStart + durationMinutes <= blockEnd) {
                const candidateEnd = candidateStart + durationMinutes;

                // Find the first busy interval that overlaps [candidateStart, candidateEnd)
                const blocker = busyIntervals.find(e =>
                    e.start < candidateEnd && e.end > candidateStart
                );

                if (!blocker) {
                    // Free slot found — verify it's still within the block
                    if (candidateEnd <= blockEnd) {
                        return {
                            start: minutesToTime(candidateStart),
                            end: minutesToTime(candidateEnd)
                        };
                    }
                    break; // Can't fit in this block
                }

                // Jump past the blocker
                candidateStart = blocker.end;
            }
        }

        return null;
    }

    // ─── Conflict Check ───────────────────────────────────────────────────────

    checkSlotConflict(slot, day, batchId, teacherId, classroomId, currentSchedule) {
        const slotStart = timeToMinutes(slot.start);
        const slotEnd = timeToMinutes(slot.end);
        const batchIdStr = batchId?.toString();
        const teacherIdStr = teacherId?.toString();
        const classroomIdStr = classroomId?.toString();

        for (const entry of currentSchedule) {
            if (!entry.daysOfWeek?.includes(day)) continue;
            const es = timeToMinutes(entry.startTime);
            const ee = timeToMinutes(entry.endTime);
            if (slotEnd <= es || slotStart >= ee) continue;

            if (entry.batchId?.toString() === batchIdStr)
                return { conflict: true, reason: 'batch_busy' };
            if (entry.teacherId?.toString() === teacherIdStr)
                return { conflict: true, reason: 'teacher_busy' };
            if (entry.classroomId?.toString() === classroomIdStr)
                return { conflict: true, reason: 'room_busy' };
        }
        return { conflict: false };
    }

    // ─── Room Assignment ──────────────────────────────────────────────────────

    getRoomForBatch(batchId, classrooms, courseType, batchStudentCount) {
        const batchIdStr = batchId?.toString();
        const category = (courseType === 'lab' || courseType === 'project') ? 'lab' : 'theory';

        if (!this.batchRoomAssignments.has(batchIdStr)) {
            this.batchRoomAssignments.set(batchIdStr, {});
        }
        const assignments = this.batchRoomAssignments.get(batchIdStr);

        // Return cached room if still valid
        if (assignments[category]) {
            const room = classrooms.find(r => r.id?.toString() === assignments[category]);
            if (room && room.capacity >= batchStudentCount) return room;
        }

        const requiredTypes = ROOM_TYPE_REQUIREMENTS[courseType] || ROOM_TYPE_REQUIREMENTS.theory;
        let candidates = classrooms.filter(r =>
            r.capacity >= batchStudentCount && requiredTypes.includes(r.roomType)
        );

        if (candidates.length === 0) {
            candidates = classrooms.filter(r => r.capacity >= batchStudentCount);
            if (candidates.length > 0)
                this.warnings.push(`No ${courseType} room for batch ${batchIdStr}, using fallback`);
        }

        if (candidates.length === 0) return null;

        // Round-robin: find a room not already assigned to another batch for this category
        const assignedRoomIds = new Set(
            [...this.batchRoomAssignments.values()]
                .map(a => a[category])
                .filter(Boolean)
        );

        // Prefer a room not yet assigned to any batch
        const unassigned = candidates.filter(r => !assignedRoomIds.has(r.id?.toString()));
        const selected = unassigned.length > 0 ? unassigned[0] : candidates[0];

        assignments[category] = selected.id?.toString();
        return selected;
    }

    // ─── Utility ──────────────────────────────────────────────────────────────

    getSessionsPerWeek(credits, courseType) {
        return (courseType === 'lab' || courseType === 'project') ? 1 : 2;
    }

    getBatchUsedDays(batchId, schedule) {
        const days = new Set();
        const batchIdStr = batchId?.toString();
        for (const entry of schedule) {
            if (entry.batchId?.toString() === batchIdStr)
                entry.daysOfWeek?.forEach(d => days.add(d));
        }
        return [...days];
    }

    getCourseScheduledDays(batchId, courseId, schedule) {
        const days = new Set();
        const batchIdStr = batchId?.toString();
        const courseIdStr = courseId?.toString();
        for (const entry of schedule) {
            if (entry.batchId?.toString() === batchIdStr &&
                entry.sessionCourseId?.toString() === courseIdStr)
                entry.daysOfWeek?.forEach(d => days.add(d));
        }
        return [...days];
    }

    detectConflicts(schedules) {
        const conflicts = [];
        const byDay = new Map();
        for (const s of schedules) {
            for (const day of (s.daysOfWeek || [])) {
                if (!byDay.has(day)) byDay.set(day, []);
                byDay.get(day).push({
                    ...s,
                    _start: timeToMinutes(s.startTime),
                    _end: timeToMinutes(s.endTime)
                });
            }
        }
        for (const [, entries] of byDay) {
            entries.sort((a, b) => a._start - b._start);
            for (let i = 0; i < entries.length; i++) {
                for (let j = i + 1; j < entries.length; j++) {
                    if (entries[j]._start >= entries[i]._end) break;
                    if (entries[i].teacherId?.toString() === entries[j].teacherId?.toString())
                        conflicts.push({ type: 'TEACHER', entries: [entries[i], entries[j]] });
                    if (entries[i].classroomId?.toString() === entries[j].classroomId?.toString())
                        conflicts.push({ type: 'ROOM', entries: [entries[i], entries[j]] });
                }
            }
        }
        return conflicts;
    }

    // ─── Task Scheduling ──────────────────────────────────────────────────────

    /**
     * Schedule a single task.
     * - Only uses the batch's own shift (never crosses to another shift).
     * - Pushes the entry to currentSchedule on success.
     * - Returns the entry or null.
     */
    scheduleTask(task, classrooms, currentSchedule, options = {}) {
        const { allowSameDay = false } = options;
        const { batch, course, teacherId, teacherName, durationMinutes } = task;

        const shift = this.getShiftForBatch(batch);
        const batchStudentCount = batch?.studentCount || 40;
        const room = this.getRoomForBatch(batch.id, classrooms, course.type, batchStudentCount);

        if (!room) {
            this.warnings.push(`No room for ${course.code} in batch ${batch.name}`);
            return null;
        }

        const courseDays = allowSameDay
            ? []
            : this.getCourseScheduledDays(batch.id, course.id, currentSchedule);

        const availableDays = this.workingDays.filter(d => !courseDays.includes(d));

        // Prefer days the batch already uses (pack classes together on fewer days)
        const batchUsedDays = this.getBatchUsedDays(batch.id, currentSchedule);
        const preferred = availableDays.filter(d => batchUsedDays.includes(d));
        const others = availableDays.filter(d => !batchUsedDays.includes(d));
        const dayOrder = [...preferred, ...others];

        for (const day of dayOrder) {
            // Tuesday Evening: labs/projects only
            if (this.isLabOnlySlot(shift, day) && course.type === 'theory') continue;

            const slot = this.getNextAvailableSlot(
                batch.id, day, durationMinutes, shift, currentSchedule,
                teacherId, room.id
            );
            if (!slot) continue;

            const check = this.checkSlotConflict(slot, day, batch.id, teacherId, room.id, currentSchedule);
            if (check.conflict) continue;

            const entry = this._buildEntry(slot, day, task, room, shift, course);
            currentSchedule.push(entry);
            return entry;
        }

        return null;
    }

    /**
     * Retry with same-day allowed.
     */
    scheduleTaskRelaxed(task, classrooms, currentSchedule) {
        return this.scheduleTask(task, classrooms, currentSchedule, { allowSameDay: true });
    }

    /**
     * Schedule all lab tasks for a batch.
     *
     * Strategy (best-effort grouping):
     *   1. Try to fit ALL labs on a single day.
     *   2. If not all fit on one day, schedule each lab individually on any available day.
     */
    scheduleLabsForBatch(batch, labTasks, classrooms, currentSchedule) {
        const shift = this.getShiftForBatch(batch);
        const batchStudentCount = batch?.studentCount || 40;
        const labDuration = this.classDurations.lab;

        const room = this.getRoomForBatch(batch.id, classrooms, 'lab', batchStudentCount);
        if (!room) {
            this.warnings.push(`No lab room for batch ${batch.name}`);
            return { scheduled: [], unscheduled: [...labTasks] };
        }

        const scheduledLabs = [];
        const remaining = [...labTasks];

        // ── Step 1: Try to fit ALL labs on one day ──────────────────────────
        for (const day of this.workingDays) {
            if (remaining.length === 0) break;

            const blocks = this.getShiftBlocks(shift, day);
            if (blocks.length === 0) continue;

            // Simulate scheduling all remaining labs on this day
            const simulatedSchedule = [...currentSchedule];
            const dayScheduled = [];
            let allFit = true;

            for (const labTask of remaining) {
                const slot = this.getNextAvailableSlot(
                    batch.id, day, labDuration, shift, simulatedSchedule,
                    labTask.teacherId, room.id
                );

                if (!slot) { allFit = false; break; }

                const check = this.checkSlotConflict(slot, day, batch.id, labTask.teacherId, room.id, simulatedSchedule);
                if (check.conflict) { allFit = false; break; }

                const entry = this._buildEntry(slot, day, labTask, room, shift, labTask.course);
                dayScheduled.push(entry);
                simulatedSchedule.push(entry);
            }

            if (allFit && dayScheduled.length === remaining.length) {
                for (const entry of dayScheduled) {
                    currentSchedule.push(entry);
                    scheduledLabs.push(entry);
                }
                remaining.length = 0;
                break;
            }
        }

        // ── Step 2: Schedule remaining labs individually ─────────────────────
        for (const labTask of [...remaining]) {
            const scheduled = this.scheduleTask(
                { ...labTask, durationMinutes: labDuration },
                classrooms,
                currentSchedule
            );
            if (scheduled) {
                scheduledLabs.push(scheduled);
                remaining.splice(remaining.indexOf(labTask), 1);
            }
        }

        return { scheduled: scheduledLabs, unscheduled: remaining };
    }

    _buildEntry(slot, day, task, room, shift, course) {
        const { batch, teacherId, teacherName } = task;
        return {
            sessionCourseId: course.id,
            batchId: batch.id,
            classroomId: room.id,
            teacherId,
            daysOfWeek: [day],
            startTime: slot.start,
            endTime: slot.end,
            classType: (course.type === 'lab' || course.type === 'project') ? 'Lab' : 'Lecture',
            batchName: batch.name,
            batchShift: shift,
            courseName: course.name,
            courseCode: course.code,
            teacherName,
            roomNumber: room.roomNumber,
            building: room.building
        };
    }

    getBatchRoomAssignments() {
        const result = {};
        for (const [batchId, rooms] of this.batchRoomAssignments) {
            result[batchId] = rooms;
        }
        return result;
    }
}

export default new TimeSlotEngine();
