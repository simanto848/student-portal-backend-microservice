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
 *   Block 2: 14:00 – 21:40  (Labs/Projects ONLY)
 *
 * Evening Shift – Tuesday:
 *   Block 1: 18:00 – 21:40  (Theory ONLY)
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
            ],
            labOnly: true
        },
        Tuesday: {
            blocks: [{ start: '18:00', end: '21:40' }],
            theoryOnly: true
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
        if (day === 'Friday' && this.shiftConfig.evening.Friday?.labOnly === true) return true;
        return false;
    }

    isTheoryOnlySlot(shift, day) {
        if (shift !== 'evening') return false;
        if (day === 'Tuesday' && this.shiftConfig.evening.Tuesday?.theoryOnly === true) return true;
        return false;
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

    getSessionsPerWeek(credits, courseType, shift = 'day') {
        if (courseType === 'lab' || courseType === 'project') return 1;
        // Evening theory: 1 session/week (100 min) to complete credits
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
        const primaryRoom = this.getRoomForBatch(batch.id, classrooms, course.type, batchStudentCount);

        if (!primaryRoom) {
            this.warnings.push(`No room for ${course.code} in batch ${batch.name}`);
            return null;
        }

        // Build room list: primary room first, then all other suitable rooms
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

        const courseDays = allowSameDay
            ? []
            : this.getCourseScheduledDays(batch.id, course.id, currentSchedule);

        const availableDays = this.workingDays.filter(d => !courseDays.includes(d));

        // Load-balanced: prefer days with fewest classes (spread evenly)
        // For theory classes, heavily penalize days that already have labs
        // so theory doesn't get pushed to Block 2 (afternoon) on lab days.
        const dayClassCount = this._getDayClassCounts(batch.id, currentSchedule);
        const dayOrder = [...availableDays].sort((a, b) => {
            let countA = dayClassCount[a] || 0;
            let countB = dayClassCount[b] || 0;
            if (course.type === 'theory') {
                if (this._dayHasLabsForBatch(batch.id, a, currentSchedule)) countA += 100;
                if (this._dayHasLabsForBatch(batch.id, b, currentSchedule)) countB += 100;
            }
            return countA - countB;
        });

        const blocks = this.getShiftBlocks(shift);
        const block1End = blocks.length > 0 ? timeToMinutes(blocks[0].end) : Infinity;

        // Pass 1: Try Block 1 (morning) only — across ALL days and rooms.
        // This ensures every morning slot is used before any afternoon slot.
        for (const day of dayOrder) {
            if (this.isLabOnlySlot(shift, day) && course.type === 'theory') continue;
            if (this.isTheoryOnlySlot(shift, day) && (course.type === 'lab' || course.type === 'project')) continue;

            for (const room of roomsToTry) {
                const slot = this.getNextAvailableSlot(
                    batch.id, day, durationMinutes, shift, currentSchedule,
                    teacherId, room.id
                );
                if (!slot) continue;

                // Only accept if the slot fits in Block 1
                if (timeToMinutes(slot.end) > block1End) continue;

                const check = this.checkSlotConflict(slot, day, batch.id, teacherId, room.id, currentSchedule);
                if (check.conflict) continue;

                const entry = this._buildEntry(slot, day, task, room, shift, course);
                currentSchedule.push(entry);
                return entry;
            }
        }

        // Pass 2: Allow Block 2 (afternoon) — fallback when all morning slots are exhausted.
        for (const day of dayOrder) {
            if (this.isLabOnlySlot(shift, day) && course.type === 'theory') continue;
            if (this.isTheoryOnlySlot(shift, day) && (course.type === 'lab' || course.type === 'project')) continue;

            for (const room of roomsToTry) {
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
            // Skip theory-only days for labs
            if (this.isTheoryOnlySlot(shift, day)) continue;

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
     *
     * After greedy scheduling some days may be overloaded while others
     * are underloaded.  This pass iteratively moves THEORY (Lecture)
     * classes from the most-loaded day to ANY less-loaded day.
     *
     * Key behaviours:
     *   - Tries ALL suitable classrooms (not just the originally assigned
     *     one) so a room-busy constraint on one room doesn't block the move.
     *   - Candidates are sorted by end time desc — the class keeping
     *     students latest is moved first.
     *   - Target days are tried least-loaded first.
     *   - Hard constraints respected: same course on different days,
     *     teacher availability, room availability, lab-only days.
     *
     * Stops when max-min ≤ 1 or after 50 iterations.
     */
    rebalanceSchedule(schedule, newScheduleStartIndex, batches, classrooms) {
        for (const batch of batches) {
            const batchId = batch.id.toString();
            const shift = this.getShiftForBatch(batch);
            const batchStudentCount = batch?.studentCount || 40;

            // Pre-compute suitable theory rooms for this batch (sorted: smallest adequate first)
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

            while (improved && iterations < 50) {
                improved = false;
                iterations++;

                // Count classes per working day for this batch
                const dayCount = {};
                for (const d of this.workingDays) dayCount[d] = 0;
                for (const entry of schedule) {
                    if (entry.batchId?.toString() !== batchId) continue;
                    for (const d of (entry.daysOfWeek || [])) {
                        dayCount[d] = (dayCount[d] || 0) + 1;
                    }
                }

                // Sort days descending by load
                const sortedDays = [...this.workingDays].sort(
                    (a, b) => (dayCount[b] || 0) - (dayCount[a] || 0)
                );
                const maxDay = sortedDays[0];
                const maxCount = dayCount[maxDay] || 0;
                const minCount = dayCount[sortedDays[sortedDays.length - 1]] || 0;

                if (maxCount - minCount <= 1) break;

                // Target days lighter than maxDay by ≥ 2, least-loaded first
                const targetDays = [...this.workingDays]
                    .filter(d => d !== maxDay && (dayCount[d] || 0) < maxCount - 1)
                    .sort((a, b) => (dayCount[a] || 0) - (dayCount[b] || 0));

                if (targetDays.length === 0) break;

                // Movable theory entries on heaviest day, latest-ending first
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

                // Put original room first so we prefer keeping the same room
                const orderRooms = (originalRoomId) => {
                    const origId = originalRoomId?.toString();
                    return [
                        ...suitableRooms.filter(r => r.id?.toString() === origId),
                        ...suitableRooms.filter(r => r.id?.toString() !== origId)
                    ];
                };

                let moved = false;
                for (const entry of moveCandidates) {
                    // Save originals
                    const saved = {
                        days: entry.daysOfWeek,
                        start: entry.startTime,
                        end: entry.endTime,
                        roomId: entry.classroomId,
                        roomNum: entry.roomNumber,
                        building: entry.building
                    };
                    entry.daysOfWeek = []; // hide from conflict checks

                    const duration = timeToMinutes(saved.end) - timeToMinutes(saved.start);
                    const roomsToTry = orderRooms(saved.roomId);

                    for (const targetDay of targetDays) {
                        // Same course must not already be on targetDay
                        const courseOnTarget = schedule.some(e =>
                            e !== entry &&
                            e.batchId?.toString() === batchId &&
                            e.sessionCourseId?.toString() === entry.sessionCourseId?.toString() &&
                            e.daysOfWeek?.includes(targetDay)
                        );
                        if (courseOnTarget) continue;
                        if (this.isLabOnlySlot(shift, targetDay)) continue;

                        // Try every suitable room on this target day
                        for (const room of roomsToTry) {
                            const slot = this.getNextAvailableSlot(
                                batch.id, targetDay, duration, shift, schedule,
                                entry.teacherId, room.id
                            );
                            if (!slot) continue;

                            const check = this.checkSlotConflict(
                                slot, targetDay, batch.id, entry.teacherId,
                                room.id, schedule
                            );
                            if (check.conflict) continue;

                            // Commit the move
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
                        // Restore originals
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

export default TimeSlotEngine;
