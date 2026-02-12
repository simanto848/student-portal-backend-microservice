import { timeToMinutes, minutesToTime, formatTime } from '../utils/timeUtils.js';

// Default class duration (1 hour 15 minutes)
const DEFAULT_CLASS_DURATION_MINUTES = 75;

// Default time configuration for shifts
const DEFAULT_SHIFT_CONFIG = {
    day: {
        startHour: 8, startMinute: 0,
        endHour: 15, endMinute: 0,
        breakStart: "12:00", breakEnd: "13:00"
    },
    evening: {
        startHour: 15, startMinute: 30,
        endHour: 21, endMinute: 0,
        breakStart: null, breakEnd: null
    }
};

const ALL_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DEFAULT_WORKING_DAYS = ['Saturday', 'Sunday', 'Wednesday', 'Thursday'];

const DEFAULT_CLASS_DURATIONS_MINUTES = {
    theory: 75,
    lab: 100,
    project: 150
};

// Course type to room type mapping
const ROOM_TYPE_REQUIREMENTS = {
    theory: ['Lecture Hall', 'Seminar Room', 'Conference Room'],
    lab: ['Laboratory', 'Computer Lab'],
    project: ['Laboratory', 'Computer Lab', 'Seminar Room']
};

class TimeSlotEngine {
    constructor() {
        this.classDurationMinutes = DEFAULT_CLASS_DURATION_MINUTES;
        this.classDurations = { ...DEFAULT_CLASS_DURATIONS_MINUTES };
        this.workingDays = [...DEFAULT_WORKING_DAYS];
        this.shiftConfig = { ...DEFAULT_SHIFT_CONFIG };
        this.conflicts = [];
        this.warnings = [];
    }

    // Configure the engine for a scheduling run
    configure(options = {}) {
        const {
            classDurationMinutes = DEFAULT_CLASS_DURATION_MINUTES,
            classDurations = null,
            workingDays = null,
            offDays = null,
            customTimeSlots = null
        } = options;

        this.classDurationMinutes = classDurationMinutes;
        this.classDurations = classDurations
            ? {
                theory: classDurations.theory || classDurationMinutes,
                lab: classDurations.lab || classDurationMinutes * 2,
                project: classDurations.project || classDurationMinutes * 2
            }
            : {
                theory: classDurationMinutes,
                lab: classDurationMinutes * 2,
                project: classDurationMinutes * 2
            };

        if (workingDays && workingDays.length > 0) {
            this.workingDays = workingDays;
        } else if (offDays && offDays.length > 0) {
            this.workingDays = ALL_DAYS.filter(d => !offDays.includes(d));
        } else {
            this.workingDays = [...DEFAULT_WORKING_DAYS];
        }

        if (customTimeSlots) {
            this.shiftConfig = {
                day: customTimeSlots.day ? this.parseTimeConfig(customTimeSlots.day) : DEFAULT_SHIFT_CONFIG.day,
                evening: customTimeSlots.evening ? this.parseTimeConfig(customTimeSlots.evening) : DEFAULT_SHIFT_CONFIG.evening
            };
        } else {
            this.shiftConfig = { ...DEFAULT_SHIFT_CONFIG };
        }

        this.conflicts = [];
        this.warnings = [];
    }

    // Parse user-provided time configuration into internal format
    parseTimeConfig(config) {
        const parseTime = (timeStr) => {
            if (!timeStr) return null;
            const [hours, minutes] = timeStr.split(':').map(Number);
            return { hours, minutes };
        };
        const start = parseTime(config.startTime) || { hours: 8, minutes: 0 };
        const end = parseTime(config.endTime) || { hours: 15, minutes: 0 };
        return {
            startHour: start.hours, startMinute: start.minutes,
            endHour: end.hours, endMinute: end.minutes,
            breakStart: config.breakStart || null,
            breakEnd: config.breakEnd || null
        };
    }

    // Generate sequential time slots for a shift with given class duration.
    generateTimeSlots(shift, durationMinutes) {
        const config = this.shiftConfig[shift] || this.shiftConfig.day || DEFAULT_SHIFT_CONFIG.day;
        const slots = [];
        let currentHour = config.startHour;
        let currentMinute = config.startMinute;
        const endTimeMinutes = config.endHour * 60 + config.endMinute;

        const hasBreak = !!(config.breakStart && config.breakEnd);
        const breakStartMinutes = hasBreak ? timeToMinutes(config.breakStart) : null;
        const breakEndMinutes = hasBreak ? timeToMinutes(config.breakEnd) : null;

        while (true) {
            const startTimeMinutes = currentHour * 60 + currentMinute;
            const endSlotMinutes = startTimeMinutes + durationMinutes;
            if (endSlotMinutes > endTimeMinutes) break;

            const startTime = formatTime(currentHour, currentMinute);
            const endHour = Math.floor(endSlotMinutes / 60);
            const endMinute = endSlotMinutes % 60;
            const endTime = formatTime(endHour, endMinute);

            if (hasBreak) {
                if (startTimeMinutes < breakEndMinutes && endSlotMinutes > breakStartMinutes) {
                    currentHour = Math.floor(breakEndMinutes / 60);
                    currentMinute = breakEndMinutes % 60;
                    continue;
                }
            }

            slots.push({ start: startTime, end: endTime });
            currentHour = endHour;
            currentMinute = endMinute;
        }
        return slots;
    }

    getTimeSlotsForShift(shift, durationMinutes = null) {
        return this.generateTimeSlots(shift, durationMinutes || this.classDurationMinutes);
    }

    getExtendedSlots(shift, durationMinutes) {
        return this.generateTimeSlots(shift, durationMinutes);
    }

    // Get dynamic time slots ensuring sequential scheduling without gaps
    getDynamicTimeSlots(shiftName, batchId, day, durationMinutes, currentSchedule) {
        const config = this.shiftConfig[shiftName] || this.shiftConfig.day;
        const shiftStart = config.startHour * 60 + config.startMinute;
        const shiftEnd = config.endHour * 60 + config.endMinute;
        const breakStart = config.breakStart ? timeToMinutes(config.breakStart) : null;
        const breakEnd = config.breakEnd ? timeToMinutes(config.breakEnd) : null;

        const batchIdStr = batchId.toString();
        const existingIntervals = currentSchedule
            .filter(s => s.batchId.toString() === batchIdStr && s.daysOfWeek.includes(day))
            .map(s => ({ start: timeToMinutes(s.startTime), end: timeToMinutes(s.endTime) }))
            .sort((a, b) => a.start - b.start);

        const possibleSlots = [];
        let candidates = [shiftStart, ...existingIntervals.map(i => i.end)];
        if (breakEnd) candidates.push(breakEnd);
        candidates = [...new Set(candidates)].sort((a, b) => a - b);

        for (const start of candidates) {
            let actualStart = start;
            if (breakStart && breakEnd && actualStart >= breakStart && actualStart < breakEnd) {
                actualStart = breakEnd;
            }

            const end = actualStart + durationMinutes;
            if (end > shiftEnd) continue;

            const overlaps = existingIntervals.some(i => !(end <= i.start || actualStart >= i.end));
            if (overlaps) continue;

            if (breakStart && breakEnd && actualStart < breakEnd && breakStart < end) continue;

            possibleSlots.push({ start: minutesToTime(actualStart), end: minutesToTime(end) });
        }
        return possibleSlots;
    }

    // Check if a room is suitable for a course
    isRoomSuitable(room, course, batch) {
        if (room.capacity < batch.studentCount) return false;
        const requiredTypes = ROOM_TYPE_REQUIREMENTS[course.type] || ROOM_TYPE_REQUIREMENTS.theory;
        return requiredTypes.includes(room.roomType);
    }

    // Check if a time slot is available (no conflicts with existing schedule)
    isSlotAvailable(slot, day, batchId, teacherId, classroomId, schedule) {
        const batchIdStr = batchId?.toString();
        const teacherIdStr = teacherId?.toString();
        const classroomIdStr = classroomId?.toString();

        for (const entry of schedule) {
            if (!entry.daysOfWeek.includes(day)) continue;

            const entryStart = timeToMinutes(entry.startTime);
            const entryEnd = timeToMinutes(entry.endTime);
            const slotStart = timeToMinutes(slot.start);
            const slotEnd = timeToMinutes(slot.end);
            const overlaps = !(slotEnd <= entryStart || slotStart >= entryEnd);
            if (!overlaps) continue;

            if (entry.batchId?.toString() === batchIdStr) {
                return { available: false, reason: 'batch_conflict', conflictWith: entry };
            }
            if (entry.teacherId?.toString() === teacherIdStr) {
                return { available: false, reason: 'teacher_conflict', conflictWith: entry };
            }
            if (entry.classroomId?.toString() === classroomIdStr) {
                return { available: false, reason: 'room_conflict', conflictWith: entry };
            }
        }
        return { available: true };
    }

    // Calculate sessions per week based on course type
    getSessionsPerWeek(credits, courseType) {
        return (courseType === 'lab' || courseType === 'project') ? 1 : 2;
    }

    // Get days already used by a batch in the current schedule
    getBatchUsedDays(batchId, schedule) {
        const days = new Set();
        const batchIdStr = batchId?.toString();
        for (const entry of schedule) {
            if (entry.batchId?.toString() === batchIdStr) {
                entry.daysOfWeek.forEach(d => days.add(d));
            }
        }
        return [...days];
    }

    // Get days where a specific course is already scheduled for a batch
    getCourseScheduledDays(batchId, courseId, schedule) {
        const days = new Set();
        const batchIdStr = batchId?.toString();
        const courseIdStr = courseId?.toString();
        for (const entry of schedule) {
            if (entry.batchId?.toString() === batchIdStr && entry.sessionCourseId?.toString() === courseIdStr) {
                entry.daysOfWeek.forEach(d => days.add(d));
            }
        }
        return [...days];
    }

    // Check for conflicts in a schedule using proper interval overlap detection
    detectConflicts(schedules) {
        const conflicts = [];
        const byDay = new Map();

        for (const s of schedules) {
            const sStart = timeToMinutes(s.startTime);
            const sEnd = timeToMinutes(s.endTime);
            for (const day of s.daysOfWeek) {
                if (!byDay.has(day)) byDay.set(day, []);
                byDay.get(day).push({ ...s, _startMin: sStart, _endMin: sEnd });
            }
        }

        for (const [day, daySchedules] of byDay) {
            daySchedules.sort((a, b) => a._startMin - b._startMin);
            const len = daySchedules.length;
            for (let i = 0; i < len; i++) {
                for (let j = i + 1; j < len; j++) {
                    const s1 = daySchedules[i];
                    const s2 = daySchedules[j];
                    if (s2._startMin >= s1._endMin) break;

                    if (s1.teacherId && s2.teacherId &&
                        s1.teacherId.toString() === s2.teacherId.toString()) {
                        conflicts.push({ type: 'TEACHER_CONFLICT', day, schedule1: s1, schedule2: s2 });
                    }
                    if (s1.classroomId && s2.classroomId &&
                        s1.classroomId.toString() === s2.classroomId.toString()) {
                        conflicts.push({ type: 'ROOM_CONFLICT', day, schedule1: s1, schedule2: s2 });
                    }
                }
            }
        }
        return conflicts;
    }

    // Unified scheduling method with configurable constraints
    _scheduleTaskUnified(task, classrooms, currentSchedule, options = {}) {
        const { relaxRoomType = false, allowSameDay = false, useAlternateShift = false, spreadDays = true } = options;
        const { batch, course, teacherId, teacherName, durationMinutes } = task;

        const shift = useAlternateShift ? (batch.shift === 'day' ? 'evening' : 'day') : batch.shift;

        const suitableRooms = relaxRoomType
            ? classrooms.filter(r => r.capacity >= batch.studentCount)
            : classrooms.filter(r => this.isRoomSuitable(r, course, batch));

        if (suitableRooms.length === 0) {
            if (!relaxRoomType) {
                this.warnings.push(`No suitable room for ${course.code} (needs ${course.type} room with capacity >= ${batch.studentCount})`);
            }
            return null;
        }

        if (!relaxRoomType) {
            suitableRooms.sort((a, b) => {
                if (task.preferredRoomId) {
                    if (a.id.toString() === task.preferredRoomId) return -1;
                    if (b.id.toString() === task.preferredRoomId) return 1;
                }
                return (a.capacity - batch.studentCount) - (b.capacity - batch.studentCount);
            });
        }

        const courseScheduledDays = allowSameDay ? [] : this.getCourseScheduledDays(batch.id, course.id, currentSchedule);
        const availableDays = allowSameDay
            ? [...this.workingDays]
            : this.workingDays.filter(d => !courseScheduledDays.includes(d));

        if (availableDays.length === 0) {
            if (!relaxRoomType) {
                this.warnings.push(`No available days for ${course.code} in batch ${batch.name} - already scheduled on all working days`);
            }
            return null;
        }

        let dayOrder;
        if (spreadDays && !allowSameDay) {
            const batchUsedDays = this.getBatchUsedDays(batch.id, currentSchedule);
            const preferredDays = availableDays.filter(d => !batchUsedDays.includes(d));
            const otherDays = availableDays.filter(d => batchUsedDays.includes(d));
            dayOrder = [...preferredDays, ...otherDays];
        } else {
            dayOrder = availableDays;
        }

        for (const day of dayOrder) {
            const timeSlots = this.getDynamicTimeSlots(shift, batch.id, day, durationMinutes, currentSchedule);
            for (const slot of timeSlots) {
                for (const room of suitableRooms) {
                    const availability = this.isSlotAvailable(
                        slot, day, batch.id, teacherId, room.id, currentSchedule
                    );
                    if (availability.available) {
                        return {
                            sessionCourseId: course.id,
                            batchId: batch.id,
                            classroomId: room.id,
                            teacherId,
                            daysOfWeek: [day],
                            startTime: slot.start,
                            endTime: slot.end,
                            classType: course.type === 'lab' ? 'Lab' : 'Lecture',
                            batchName: batch.name,
                            batchShift: useAlternateShift ? shift : batch.shift,
                            courseName: course.name,
                            courseCode: course.code,
                            teacherName,
                            roomNumber: room.roomNumber,
                            building: room.building
                        };
                    }
                }
            }
        }
        return null;
    }

    scheduleTask(task, classrooms, currentSchedule) {
        return this._scheduleTaskUnified(task, classrooms, currentSchedule, {
            relaxRoomType: false, allowSameDay: false, useAlternateShift: false, spreadDays: true
        });
    }

    scheduleTaskRelaxed(task, classrooms, currentSchedule) {
        const result = this._scheduleTaskUnified(task, classrooms, currentSchedule, {
            relaxRoomType: true, allowSameDay: false, useAlternateShift: false, spreadDays: false
        });
        if (result) {
            this.warnings.push(`${task.course.code} scheduled in relaxed room type instead of preferred room type`);
        }
        return result;
    }

    scheduleTaskSameDay(task, classrooms, currentSchedule) {
        return this._scheduleTaskUnified(task, classrooms, currentSchedule, {
            relaxRoomType: true, allowSameDay: true, useAlternateShift: false, spreadDays: false
        });
    }

    scheduleTaskAlternateShift(task, classrooms, currentSchedule) {
        return this._scheduleTaskUnified(task, classrooms, currentSchedule, {
            relaxRoomType: true, allowSameDay: true, useAlternateShift: true, spreadDays: false
        });
    }
}

export default new TimeSlotEngine();
