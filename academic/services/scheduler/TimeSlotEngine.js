import { timeToMinutes, minutesToTime } from '../utils/timeUtils.js';

/**
 * ┌────────────────────────────────────────────────────────────────────────────┐
 * │  TimeSlotEngine – Multi-block, Shift-isolated Academic Scheduler          │
 * │                                                                           │
 * │  CORE RULES                                                               │
 * │  1. Each shift has its own set of working days.                            │
 * │  2. Each working day has one or more TIME BLOCKS (contiguous windows).     │
 * │  3. A class MUST start AND end within the SAME block.                     │
 * │  4. A batch's classes CANNOT cross from one shift to another.             │
 * │  5. Different days within a shift may have different blocks.               │
 * │                                                                           │
 * │  DEFAULT CONFIGS                                                          │
 * │  Day   (Sat, Sun, Wed, Thu):                                              │
 * │    Block 1: 08:30-13:30   Block 2: 14:00-17:20                           │
 * │  Evening:                                                                 │
 * │    Friday  → Block 1: 08:30-13:00  Block 2: 14:00-21:40  (theory only)   │
 * │    Tuesday → Block 1: 18:00-21:40  (lab only)                            │
 * │                                                                           │
 * │  ALGORITHM (O(N log N) per slot query, backtracking rebalance)            │
 * │  1. Collect busy intervals for the (batch, teacher, room) triple.         │
 * │  2. Merge overlapping intervals.                                          │
 * │  3. Gap-scan each block to find the earliest fit.                         │
 * │  4. Multi-pass scheduling: Block-1 → Any-block → Relaxed (same-day).     │
 * │  5. Post-opt rebalance: redistribute theory across days for even load.    │
 * └────────────────────────────────────────────────────────────────────────────┘
 */

// ── Default shift configuration ────────────────────────────────────────────
const DEFAULT_SHIFT_CONFIG = {
    day: {
        defaultBlocks: [
            { start: '08:30', end: '13:30' },
            { start: '14:00', end: '17:20' }
        ],
        dayOverrides: {}
    },
    evening: {
        defaultBlocks: [
            { start: '18:00', end: '21:40' }
        ],
        dayOverrides: {
            Friday: {
                blocks: [
                    { start: '08:30', end: '13:00' },
                    { start: '14:00', end: '21:40' }
                ],
                classTypeConstraint: 'theory'
            },
            Tuesday: {
                blocks: [{ start: '18:00', end: '21:40' }],
                classTypeConstraint: 'lab'
            }
        }
    }
};

const ALL_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DEFAULT_WORKING_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

const SHIFT_DEFAULT_WORKING_DAYS = {
    day: ['Saturday', 'Sunday', 'Wednesday', 'Thursday'],
    evening: ['Tuesday', 'Friday']
};

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

    /**
     * Configure the engine.
     *
     * @param {object} options
     * @param {object} [options.customTimeSlots] - Multi-block format:
     *   {
     *     day:     { defaultBlocks: [{start,end},...], dayOverrides: { DayName: {blocks:[...], classTypeConstraint?} } },
     *     evening: { defaultBlocks: [{start,end},...], dayOverrides: { DayName: {blocks:[...], classTypeConstraint?} } }
     *   }
     */
    configure(options = {}) {
        const {
            classDurationMinutes,
            classDurations = null,
            workingDays = null,
            offDays = null,
            customTimeSlots = null,
            targetShift = null,
            groupLabsTogether = true
        } = options;

        // ── Class durations ──────────────────────────────────────────────
        this.classDurations = classDurations
            ? {
                theory: Number(classDurations.theory) || 75,
                lab: Number(classDurations.lab) || 100,
                project: Number(classDurations.project) || 100
            }
            : { ...DEFAULT_CLASS_DURATIONS_MINUTES };

        // ── Working days ─────────────────────────────────────────────────
        if (workingDays && workingDays.length > 0) {
            this.workingDays = [...workingDays];
        } else if (offDays && offDays.length > 0) {
            this.workingDays = ALL_DAYS.filter(d => !offDays.includes(d));
        } else if (targetShift && SHIFT_DEFAULT_WORKING_DAYS[targetShift]) {
            this.workingDays = [...SHIFT_DEFAULT_WORKING_DAYS[targetShift]];
        } else {
            this.workingDays = [...DEFAULT_WORKING_DAYS];
        }

        // ── Shift config (deep-clone defaults, then merge custom) ────────
        this.shiftConfig = JSON.parse(JSON.stringify(DEFAULT_SHIFT_CONFIG));

        if (customTimeSlots) {
            for (const shift of ['day', 'evening']) {
                const custom = customTimeSlots[shift];
                if (!custom) continue;

                if (!this.shiftConfig[shift]) {
                    this.shiftConfig[shift] = { defaultBlocks: [], dayOverrides: {} };
                }

                if (custom.defaultBlocks && custom.defaultBlocks.length > 0) {
                    this.shiftConfig[shift].defaultBlocks = custom.defaultBlocks.map(b => ({
                        start: b.start, end: b.end
                    }));
                }

                if (custom.dayOverrides) {
                    if (!this.shiftConfig[shift].dayOverrides) {
                        this.shiftConfig[shift].dayOverrides = {};
                    }
                    for (const [dayName, dayCfg] of Object.entries(custom.dayOverrides)) {
                        this.shiftConfig[shift].dayOverrides[dayName] = {
                            blocks: (dayCfg.blocks || []).map(b => ({ start: b.start, end: b.end })),
                            ...(dayCfg.classTypeConstraint ? { classTypeConstraint: dayCfg.classTypeConstraint } : {})
                        };
                    }
                }
            }
        }

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

    /**
     * Get time blocks for a shift + day combination.
     * Checks day-specific overrides first, falls back to default blocks.
     */
    getShiftBlocks(shift, day) {
        const cfg = this.shiftConfig[shift];
        if (!cfg) return this.shiftConfig.day?.defaultBlocks || [];

        if (cfg.dayOverrides && cfg.dayOverrides[day]) {
            return cfg.dayOverrides[day].blocks || [];
        }

        return cfg.defaultBlocks || [];
    }

    /**
     * Get the class type constraint for a shift+day.
     * Returns 'theory', 'lab', or null (no constraint, any type allowed).
     */
    getClassTypeConstraint(shift, day) {
        const cfg = this.shiftConfig[shift];
        if (!cfg) return null;
        if (cfg.dayOverrides && cfg.dayOverrides[day]?.classTypeConstraint) {
            return cfg.dayOverrides[day].classTypeConstraint;
        }
        return null;
    }

    /**
     * Check if a course type is allowed on this shift+day.
     * @returns {boolean} true if allowed
     */
    isCourseTypeAllowedOnDay(shift, day, courseType) {
        const constraint = this.getClassTypeConstraint(shift, day);
        if (!constraint) return true; // no constraint → any type
        if (constraint === 'theory') {
            return courseType !== 'lab' && courseType !== 'project';
        }
        if (constraint === 'lab') {
            return courseType === 'lab' || courseType === 'project';
        }
        return true;
    }

    /**
     * Get the valid working days for a specific shift.
     * Uses the user-configured working days directly (set via configure()).
     */
    getShiftWorkingDays(shift) {
        return this.workingDays;
    }

    // ─── Core Slot Finder ─────────────────────────────────────────────────────

    /**
     * Find the earliest available slot within the shift's blocks for a given day.
     *
     * O(n log n) approach:
     *   1. Collect busy intervals (batch, teacher, room) for the day.
     *   2. Sort + merge overlapping intervals.
     *   3. Gap-scan each block, jumping past merged intervals.
     *
     * @param {string} batchId
     * @param {string} day
     * @param {number} durationMinutes
     * @param {string} shift
     * @param {Array}  currentSchedule
     * @param {string} [teacherId]
     * @param {string} [roomId]
     * @param {object} [opts]
     * @param {number} [opts.blockIndex] - Restrict to a specific block index
     * @returns {{ start: string, end: string } | null}
     */
    getNextAvailableSlot(batchId, day, durationMinutes, shift, currentSchedule, teacherId = null, roomId = null, opts = {}) {
        const batchIdStr = batchId?.toString();
        const teacherIdStr = teacherId?.toString() || null;
        const roomIdStr = roomId?.toString() || null;
        const blocks = this.getShiftBlocks(shift, day);

        // ── Step 1: collect busy intervals ─────────────────────────────────
        const busy = [];
        for (const s of currentSchedule) {
            if (!s.daysOfWeek?.includes(day)) continue;
            const bs = s.batchId?.toString();
            const ts = s.teacherId?.toString();
            const rs = s.classroomId?.toString();
            if (
                bs === batchIdStr ||
                (teacherIdStr && ts === teacherIdStr) ||
                (roomIdStr && rs === roomIdStr)
            ) {
                busy.push({
                    start: timeToMinutes(s.startTime),
                    end: timeToMinutes(s.endTime)
                });
            }
        }

        // ── Step 2: sort + merge ────────────────────────────────────────────
        busy.sort((a, b) => a.start - b.start);
        const merged = [];
        for (const iv of busy) {
            if (merged.length && iv.start < merged[merged.length - 1].end) {
                merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, iv.end);
            } else {
                merged.push({ start: iv.start, end: iv.end });
            }
        }

        // ── Step 3: gap-scan each block ─────────────────────────────────────
        const blocksToScan = opts.blockIndex !== undefined
            ? (blocks[opts.blockIndex] ? [blocks[opts.blockIndex]] : [])
            : blocks;

        for (const block of blocksToScan) {
            const blockStart = timeToMinutes(block.start);
            const blockEnd = timeToMinutes(block.end);
            let cursor = blockStart;

            for (const iv of merged) {
                if (iv.end <= cursor) continue;
                if (iv.start >= cursor + durationMinutes) break;
                cursor = iv.end;
            }

            if (cursor + durationMinutes <= blockEnd) {
                return {
                    start: minutesToTime(cursor),
                    end: minutesToTime(cursor + durationMinutes)
                };
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

            if (entry.batchId?.toString() === batchIdStr) return { conflict: true, reason: 'batch_busy' };
            if (entry.teacherId?.toString() === teacherIdStr) return { conflict: true, reason: 'teacher_busy' };
            if (entry.classroomId?.toString() === classroomIdStr) return { conflict: true, reason: 'room_busy' };
        }
        return { conflict: false };
    }

    /**
     * Verify that a slot falls completely within a valid block for the shift+day.
     */
    isSlotWithinBlock(slot, shift, day) {
        const slotStart = timeToMinutes(slot.start);
        const slotEnd = timeToMinutes(slot.end);
        const blocks = this.getShiftBlocks(shift, day);
        return blocks.some(b => {
            const bStart = timeToMinutes(b.start);
            const bEnd = timeToMinutes(b.end);
            return slotStart >= bStart && slotEnd <= bEnd;
        });
    }

    // ─── Room Assignment ──────────────────────────────────────────────────────

    getRoomForBatch(batchId, classrooms, courseType, batchStudentCount) {
        const batchIdStr = batchId?.toString();
        const category = (courseType === 'lab' || courseType === 'project') ? 'lab' : 'theory';

        if (!this.batchRoomAssignments.has(batchIdStr)) {
            this.batchRoomAssignments.set(batchIdStr, {});
        }
        const assignments = this.batchRoomAssignments.get(batchIdStr);

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

        const assignedRoomIds = new Set(
            [...this.batchRoomAssignments.values()]
                .map(a => a[category])
                .filter(Boolean)
        );
        const unassigned = candidates.filter(r => !assignedRoomIds.has(r.id?.toString()));
        const selected = unassigned.length > 0 ? unassigned[0] : candidates[0];

        assignments[category] = selected.id?.toString();
        return selected;
    }

    // ─── Utility ──────────────────────────────────────────────────────────────

    getSessionsPerWeek(credits, courseType, shift = 'day') {
        if (courseType === 'lab' || courseType === 'project') return 1;
        if (shift === 'evening') return 1;
        return 2;
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

    /**
     * Compute total remaining capacity (minutes) for a batch on a given day.
     */
    _getRemainingCapacity(batchId, teacherId, day, shift, currentSchedule) {
        const blocks = this.getShiftBlocks(shift, day);
        let totalCapacity = 0;
        for (const block of blocks) {
            totalCapacity += timeToMinutes(block.end) - timeToMinutes(block.start);
        }

        const batchIdStr = batchId?.toString();
        const teacherIdStr = teacherId?.toString();
        for (const s of currentSchedule) {
            if (!s.daysOfWeek?.includes(day)) continue;
            const bs = s.batchId?.toString();
            const ts = s.teacherId?.toString();
            if (bs === batchIdStr || ts === teacherIdStr) {
                totalCapacity -= (timeToMinutes(s.endTime) - timeToMinutes(s.startTime));
            }
        }
        return Math.max(0, totalCapacity);
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
     *
     * Multi-pass with strict shift isolation:
     *   Pass 1 – Block 0 only (early slots preferred).
     *   Pass 2 – Any block (fallback).
     *
     * Day ordering uses weighted scoring:
     *   - Fewer existing classes → preferred
     *   - More remaining capacity → preferred
     *   - Avoid placing theory on lab days
     *   - Different day from course's other sessions
     */
    scheduleTask(task, classrooms, currentSchedule, options = {}) {
        const { allowSameDay = false } = options;
        const { batch, course, teacherId, durationMinutes } = task;

        const shift = this.getShiftForBatch(batch);
        const batchStudentCount = batch?.studentCount || 40;
        const primaryRoom = this.getRoomForBatch(batch.id, classrooms, course.type, batchStudentCount);

        if (!primaryRoom) {
            this.warnings.push(`No room for ${course.code} in batch ${batch.name}`);
            return null;
        }

        // ── Build ordered room list ──────────────────────────────────────────
        const category = (course.type === 'lab' || course.type === 'project') ? course.type : 'theory';
        const requiredTypes = ROOM_TYPE_REQUIREMENTS[category] || ROOM_TYPE_REQUIREMENTS.theory;
        let suitableRooms = classrooms.filter(r =>
            r.capacity >= batchStudentCount && requiredTypes.includes(r.roomType)
        );
        if (suitableRooms.length === 0) {
            suitableRooms = classrooms.filter(r => r.capacity >= batchStudentCount);
        }
        const primaryId = primaryRoom.id?.toString();
        const roomsToTry = [
            primaryRoom,
            ...suitableRooms.filter(r => r.id?.toString() !== primaryId)
        ];

        // ── Build ordered day list ───────────────────────────────────────────
        const validDays = this.getShiftWorkingDays(shift);

        const courseDays = allowSameDay
            ? []
            : this.getCourseScheduledDays(batch.id, course.id, currentSchedule);

        const availableDays = validDays.filter(d => !courseDays.includes(d));

        const dayClassCount = this._getDayClassCounts(batch.id, currentSchedule);
        const dayOrder = [...availableDays].sort((a, b) => {
            let scoreA = (dayClassCount[a] || 0);
            let scoreB = (dayClassCount[b] || 0);

            if (course.type === 'theory') {
                if (this._dayHasLabsForBatch(batch.id, a, currentSchedule)) scoreA += 100;
                if (this._dayHasLabsForBatch(batch.id, b, currentSchedule)) scoreB += 100;
            }

            const capA = this._getRemainingCapacity(batch.id, teacherId, a, shift, currentSchedule);
            const capB = this._getRemainingCapacity(batch.id, teacherId, b, shift, currentSchedule);
            scoreA -= capA / 60;
            scoreB -= capB / 60;

            return scoreA - scoreB;
        });

        const _isInvalidDay = (day) => {
            return !this.isCourseTypeAllowedOnDay(shift, day, course.type);
        };

        const _trySlot = (day, room, blockIndex) => {
            if (_isInvalidDay(day)) return null;

            const opts = blockIndex !== undefined ? { blockIndex } : {};
            const slot = this.getNextAvailableSlot(
                batch.id, day, durationMinutes, shift, currentSchedule,
                teacherId, room.id, opts
            );
            if (!slot) return null;

            if (!this.isSlotWithinBlock(slot, shift, day)) return null;

            const check = this.checkSlotConflict(slot, day, batch.id, teacherId, room.id, currentSchedule);
            if (check.conflict) return null;

            const entry = this._buildEntry(slot, day, task, room, shift, course);
            currentSchedule.push(entry);
            return entry;
        };

        // Pass 1: Block 0 only
        for (const day of dayOrder) {
            for (const room of roomsToTry) {
                const e = _trySlot(day, room, 0);
                if (e) return e;
            }
        }

        // Pass 2: Any block
        for (const day of dayOrder) {
            for (const room of roomsToTry) {
                const e = _trySlot(day, room, undefined);
                if (e) return e;
            }
        }

        return null;
    }

    scheduleTaskRelaxed(task, classrooms, currentSchedule) {
        return this.scheduleTask(task, classrooms, currentSchedule, { allowSameDay: true });
    }

    /**
     * Schedule all lab tasks for a batch.
     * Strategy: try to fit ALL labs on a single day first, then fallback.
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

        const validDays = this.getShiftWorkingDays(shift)
            .filter(d => this.isCourseTypeAllowedOnDay(shift, d, 'lab'));

        // ── Step 1: Try to fit ALL labs on one day ──────────────────────────
        for (const day of validDays) {
            if (remaining.length === 0) break;

            const blocks = this.getShiftBlocks(shift, day);
            if (blocks.length === 0) continue;

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

    _getDayClassCounts(batchId, schedule) {
        const counts = {};
        const batchIdStr = batchId?.toString();
        for (const entry of schedule) {
            if (entry.batchId?.toString() === batchIdStr) {
                for (const d of (entry.daysOfWeek || [])) {
                    counts[d] = (counts[d] || 0) + 1;
                }
            }
        }
        return counts;
    }

    _dayHasLabsForBatch(batchId, day, schedule) {
        const batchIdStr = batchId?.toString();
        return schedule.some(e =>
            e.batchId?.toString() === batchIdStr &&
            e.classType === 'Lab' &&
            e.daysOfWeek?.includes(day)
        );
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

    /**
     * Post-optimization: rebalance theory classes across days.
     * Moves lectures from heaviest-loaded day to lightest.
     */
    rebalanceSchedule(schedule, newScheduleStartIndex, batches, classrooms) {
        for (const batch of batches) {
            const batchId = batch.id.toString();
            const shift = this.getShiftForBatch(batch);
            const batchStudentCount = batch?.studentCount || 40;

            const validWorkingDays = this.getShiftWorkingDays(shift);

            const theoryRoomTypes = ROOM_TYPE_REQUIREMENTS.theory;
            let suitableRooms = classrooms.filter(r =>
                r.capacity >= batchStudentCount && theoryRoomTypes.includes(r.roomType)
            );
            if (suitableRooms.length === 0) {
                suitableRooms = classrooms.filter(r => r.capacity >= batchStudentCount);
            }
            suitableRooms.sort((a, b) => a.capacity - b.capacity);

            let improved = true;
            let iterations = 0;

            while (improved && iterations < 80) {
                improved = false;
                iterations++;

                const dayCount = {};
                for (const d of validWorkingDays) dayCount[d] = 0;
                for (const entry of schedule) {
                    if (entry.batchId?.toString() !== batchId) continue;
                    for (const d of (entry.daysOfWeek || [])) {
                        if (validWorkingDays.includes(d)) dayCount[d] = (dayCount[d] || 0) + 1;
                    }
                }

                const sortedDays = [...validWorkingDays].sort(
                    (a, b) => (dayCount[b] || 0) - (dayCount[a] || 0)
                );
                const maxDay = sortedDays[0];
                const maxCount = dayCount[maxDay] || 0;
                const minCount = dayCount[sortedDays[sortedDays.length - 1]] || 0;

                if (maxCount - minCount <= 1) break;

                const targetDays = [...validWorkingDays]
                    .filter(d => d !== maxDay && (dayCount[d] || 0) < maxCount - 1)
                    .sort((a, b) => (dayCount[a] || 0) - (dayCount[b] || 0));

                if (targetDays.length === 0) break;

                const moveCandidates = [];
                for (let i = newScheduleStartIndex; i < schedule.length; i++) {
                    const entry = schedule[i];
                    if (
                        entry.batchId?.toString() === batchId &&
                        entry.classType === 'Lecture' &&
                        entry.daysOfWeek?.includes(maxDay)
                    ) {
                        moveCandidates.push(entry);
                    }
                }
                moveCandidates.sort((a, b) =>
                    timeToMinutes(b.endTime) - timeToMinutes(a.endTime)
                );

                if (moveCandidates.length === 0) break;

                const orderRooms = (originalRoomId) => {
                    const origId = originalRoomId?.toString();
                    return [
                        ...suitableRooms.filter(r => r.id?.toString() === origId),
                        ...suitableRooms.filter(r => r.id?.toString() !== origId)
                    ];
                };

                let moved = false;
                for (const entry of moveCandidates) {
                    const saved = {
                        days: entry.daysOfWeek,
                        start: entry.startTime,
                        end: entry.endTime,
                        roomId: entry.classroomId,
                        roomNum: entry.roomNumber,
                        building: entry.building
                    };
                    entry.daysOfWeek = [];

                    const duration = timeToMinutes(saved.end) - timeToMinutes(saved.start);
                    const roomsToTry = orderRooms(saved.roomId);

                    for (const targetDay of targetDays) {
                        const courseOnTarget = schedule.some(e =>
                            e !== entry &&
                            e.batchId?.toString() === batchId &&
                            e.sessionCourseId?.toString() === entry.sessionCourseId?.toString() &&
                            e.daysOfWeek?.includes(targetDay)
                        );
                        if (courseOnTarget) continue;

                        for (const room of roomsToTry) {
                            const slot = this.getNextAvailableSlot(
                                batch.id, targetDay, duration, shift, schedule,
                                entry.teacherId, room.id
                            );
                            if (!slot) continue;
                            if (!this.isSlotWithinBlock(slot, shift, targetDay)) continue;

                            const check = this.checkSlotConflict(
                                slot, targetDay, batch.id, entry.teacherId,
                                room.id, schedule
                            );
                            if (check.conflict) continue;

                            entry.daysOfWeek = [targetDay];
                            entry.startTime = slot.start;
                            entry.endTime = slot.end;
                            entry.classroomId = room.id;
                            entry.roomNumber = room.roomNumber;
                            entry.building = room.building;
                            improved = true;
                            moved = true;
                            break;
                        }
                        if (moved) break;
                    }

                    if (!moved) {
                        entry.daysOfWeek = saved.days;
                        entry.startTime = saved.start;
                        entry.endTime = saved.end;
                        entry.classroomId = saved.roomId;
                        entry.roomNumber = saved.roomNum;
                        entry.building = saved.building;
                    } else {
                        break;
                    }
                }

                if (!moved) break;
            }
        }
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
