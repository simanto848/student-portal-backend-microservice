import Classroom from "../models/Classroom.js";
import SessionCourse from "../models/SessionCourse.js";
import Session from "../models/Session.js";
import Batch from "../models/Batch.js";
import Department from "../models/Department.js";
import ScheduleProposal from "../models/ScheduleProposal.js";
import CourseSchedule from "../models/CourseSchedule.js";
import Teacher from "../models/Teacher.js";

// Import service clients for cross-service communication
import enrollmentServiceClient from "../client/enrollmentServiceClient.js";
import userServiceClient from "../client/userServiceClient.js";

// Default class duration (1 hour 15 minutes)
const DEFAULT_CLASS_DURATION_MINUTES = 75;

// Default time configuration for shifts
const DEFAULT_SHIFT_CONFIG = {
    day: {
        startHour: 8,       // 08:00
        startMinute: 0,
        endHour: 15,        // 15:00
        endMinute: 0,
        breakStart: "12:00",  // Optional break time
        breakEnd: "13:00"
    },
    evening: {
        startHour: 15,      // 15:30
        startMinute: 30,
        endHour: 21,        // 21:00
        endMinute: 0,
        breakStart: null,
        breakEnd: null
    }
};

// All possible days
const ALL_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Default working days (excluding Friday which is typically off)
const DEFAULT_WORKING_DAYS = ['Saturday', 'Sunday', 'Wednesday', 'Thursday'];

// Default off days
const DEFAULT_OFF_DAYS = ['Monday', 'Tuesday'];

const DEFAULT_CLASS_DURATIONS_MINUTES = {
    theory: 75,   // 1 hour 15 minutes
    lab: 100,     // 1 hour 40 minutes (2 theory slots)
    project: 150  // 2 hours 30 minutes
};

// Course type to room type mapping
const ROOM_TYPE_REQUIREMENTS = {
    theory: ['Lecture Hall', 'Seminar Room', 'Conference Room'],
    lab: ['Laboratory', 'Computer Lab'],
    project: ['Laboratory', 'Computer Lab', 'Seminar Room']
};

class AutoSchedulerService {
    constructor() {
        this.conflicts = [];
        this.warnings = [];
        this.classDurationMinutes = DEFAULT_CLASS_DURATION_MINUTES;
        this.classDurations = { ...DEFAULT_CLASS_DURATIONS_MINUTES };
        this.workingDays = [...DEFAULT_WORKING_DAYS];
        this.shiftConfig = { ...DEFAULT_SHIFT_CONFIG };
    }

    generateTimeSlots(shift, durationMinutes) {
        const config = this.shiftConfig[shift] || this.shiftConfig.day || DEFAULT_SHIFT_CONFIG.day;
        const slots = [];

        let currentHour = config.startHour;
        let currentMinute = config.startMinute;

        const endTimeMinutes = config.endHour * 60 + config.endMinute;

        while (true) {
            const startTimeMinutes = currentHour * 60 + currentMinute;
            const endSlotMinutes = startTimeMinutes + durationMinutes;
            // Check if slot would exceed shift end time
            if (endSlotMinutes > endTimeMinutes) {
                break;
            }

            const startTime = this.formatTime(currentHour, currentMinute);
            const endHour = Math.floor(endSlotMinutes / 60);
            const endMinute = endSlotMinutes % 60;
            const endTime = this.formatTime(endHour, endMinute);

            // Skip if overlaps with break time
            if (config.breakStart && config.breakEnd) {
                const breakStartMinutes = this.timeToMinutes(config.breakStart);
                const breakEndMinutes = this.timeToMinutes(config.breakEnd);
                // If slot overlaps with break, skip to after break
                if (startTimeMinutes < breakEndMinutes && endSlotMinutes > breakStartMinutes) {
                    currentHour = Math.floor(breakEndMinutes / 60);
                    currentMinute = breakEndMinutes % 60;
                    continue;
                }
            }

            slots.push({ start: startTime, end: endTime });
            // Move to next slot (no gap between classes)
            currentHour = endHour;
            currentMinute = endMinute;
        }

        return slots;
    }

    /**
     * Format time as HH:MM string
     */
    formatTime(hours, minutes) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    /**
     * Convert total minutes to HH:MM string
     */
    minutesToTime(totalMinutes) {
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return this.formatTime(h, m);
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
            startHour: start.hours,
            startMinute: start.minutes,
            endHour: end.hours,
            endMinute: end.minutes,
            breakStart: config.breakStart || null,
            breakEnd: config.breakEnd || null
        };
    }

    async validatePrerequisites(sessionId, batchIds, departmentId = null) {
        const errors = [];
        const warnings = [];
        // Get batches
        let batchQuery = { status: true };
        if (batchIds && batchIds.length > 0) {
            batchQuery._id = { $in: batchIds };
        } else if (departmentId) {
            batchQuery.departmentId = departmentId;
        }

        const batches = await Batch.find(batchQuery).lean();
        if (batches.length === 0) {
            errors.push("No active batches found for the selected criteria");
            return { valid: false, errors, warnings };
        }

        // Get session courses for the batches' semesters
        const semesters = [...new Set(batches.map(b => b.currentSemester))];
        const departmentIds = [...new Set(batches.map(b => b.departmentId?.toString()))];

        let courseQuery = { sessionId };
        if (departmentId) {
            courseQuery.departmentId = departmentId;
        } else if (departmentIds.length > 0) {
            courseQuery.departmentId = { $in: departmentIds };
        }
        courseQuery.semester = { $in: semesters };

        const sessionCourses = await SessionCourse.find(courseQuery).populate('courseId').lean();
        if (sessionCourses.length === 0) {
            errors.push("No session courses found for the selected batches' semesters");
            return { valid: false, errors, warnings };
        }

        const unassignedCourses = [];
        for (const batch of batches) {
            const batchDeptId = batch.departmentId?.toString();
            const batchAssignments = await enrollmentServiceClient.getBatchAssignments(
                batch._id.toString(),
                batch.currentSemester
            );
            // Create a set of assigned course IDs for quick lookup
            const assignedCourseIds = new Set(
                batchAssignments.map(a => a.courseId?.toString())
            );
            // Filter session courses for this batch's department and semester
            const batchCourses = sessionCourses.filter(s => {
                const scDeptId = (s.departmentId?._id || s.departmentId)?.toString();
                return scDeptId === batchDeptId && s.semester === batch.currentSemester;
            });

            for (const sc of batchCourses) {
                // Get the actual Course ID (not SessionCourse ID)
                const courseId = (sc.courseId?._id || sc.courseId)?.toString();
                // Check if this course has an assignment
                if (!assignedCourseIds.has(courseId)) {
                    unassignedCourses.push({
                        batchId: batch._id,
                        batchName: batch.name,
                        courseId: courseId,
                        courseCode: sc.courseId?.code || 'Unknown',
                        courseName: sc.courseId?.name || 'Unknown',
                        semester: batch.currentSemester
                    });
                } else {
                    //
                }
            }
        }

        if (unassignedCourses.length > 0) {
            errors.push({
                message: "Some courses don't have teachers assigned. Please assign teachers before generating schedule.",
                unassignedCourses
            });
            return { valid: false, errors, warnings, unassignedCourses };
        }

        const classrooms = await Classroom.find({
            isActive: true,
            isUnderMaintenance: false
        }).lean();
        if (classrooms.length === 0) {
            errors.push("No available classrooms found");
            return { valid: false, errors, warnings };
        }

        // Validate room types for course types
        const courseTypes = [...new Set(sessionCourses.map(sc => sc.courseId?.courseType || 'theory'))];
        for (const type of courseTypes) {
            const requiredRoomTypes = ROOM_TYPE_REQUIREMENTS[type] || ROOM_TYPE_REQUIREMENTS.theory;
            const hasRoom = classrooms.some(c => requiredRoomTypes.includes(c.roomType));
            if (!hasRoom) {
                warnings.push(`No suitable rooms found for ${type} courses (requires: ${requiredRoomTypes.join(' or ')})`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            data: {
                batches,
                sessionCourses,
                classrooms
            }
        };
    }

    // Gather all data needed for scheduling
    async gatherSchedulingData(sessionId, batchIds = null, departmentId = null) {
        // Build batch query
        let batchQuery = { status: true };
        if (batchIds && batchIds.length > 0) {
            batchQuery._id = { $in: batchIds };
        } else if (departmentId) {
            batchQuery.departmentId = departmentId;
        }

        const batches = await Batch.find(batchQuery)
            .populate('departmentId')
            .populate('programId')
            .lean();

        const departments = await Department.find({ status: true }).lean();
        const deptMap = departments.reduce((acc, d) => ({ ...acc, [d._id.toString()]: d }), {});

        // Get semesters and departments from batches
        const semesters = [...new Set(batches.map(b => b.currentSemester))];
        const batchDeptIds = [...new Set(batches.map(b => b.departmentId?._id || b.departmentId))];
        // Get session courses
        let courseQuery = { sessionId };
        if (departmentId) {
            courseQuery.departmentId = departmentId;
        } else if (batchDeptIds.length > 0) {
            courseQuery.departmentId = { $in: batchDeptIds };
        }

        if (semesters.length > 0) {
            courseQuery.semester = { $in: semesters };
        }

        const sessionCourses = await SessionCourse.find(courseQuery)
            .populate('courseId')
            .populate('departmentId')
            .lean();

        // Get classrooms
        const classrooms = await Classroom.find({
            isActive: true,
            isUnderMaintenance: false
        }).lean();

        // Get teacher assignments from enrollment service
        const assignmentMap = new Map();
        // Collect all teacher IDs first for batch lookup
        const allTeacherIds = new Set();
        const batchAssignmentsCache = new Map();
        for (const batch of batches) {
            // Get all assignments for this batch from enrollment service
            const batchAssignments = await enrollmentServiceClient.getBatchAssignments(
                batch._id.toString(),
                batch.currentSemester
            );
            batchAssignmentsCache.set(batch._id.toString(), batchAssignments);
            // Collect teacher IDs
            for (const assignment of batchAssignments) {
                if (assignment.instructorId) {
                    allTeacherIds.add(assignment.instructorId.toString());
                }
            }
        }

        // Fetch all teacher details at once
        const teacherMap = new Map();
        if (allTeacherIds.size > 0) {
            // Try to get from local Teacher model first
            const localTeachers = await Teacher.find({
                _id: { $in: [...allTeacherIds] }
            }).lean();
            for (const t of localTeachers) {
                teacherMap.set(t._id.toString(), t.fullName || 'Unknown Teacher');
            }

            // For any missing, fetch from user service
            const missingIds = [...allTeacherIds].filter(id => !teacherMap.has(id));
            if (missingIds.length > 0) {
                const userTeachers = await userServiceClient.getTeachersByIds(missingIds);
                for (const t of userTeachers) {
                    if (t && (t.id || t._id)) {
                        const tid = (t.id || t._id).toString();
                        teacherMap.set(tid, t.fullName || t.name || 'Unknown Teacher');
                    }
                }
            }
        }

        // Now build assignment map using cached data
        for (const batch of batches) {
            const batchDeptId = (batch.departmentId?._id || batch.departmentId)?.toString();
            const batchAssignments = batchAssignmentsCache.get(batch._id.toString()) || [];

            // Create a map of courseId -> assignment for this batch
            const courseAssignmentMap = new Map();
            for (const assignment of batchAssignments) {
                courseAssignmentMap.set(assignment.courseId?.toString(), assignment);
            }

            for (const sc of sessionCourses) {
                const scDeptId = (sc.departmentId?._id || sc.departmentId)?.toString();
                const courseId = (sc.courseId?._id || sc.courseId)?.toString();
                if (scDeptId === batchDeptId && sc.semester === batch.currentSemester) {
                    const assignment = courseAssignmentMap.get(courseId);
                    if (assignment) {
                        const teacherId = assignment.instructorId?.toString();
                        const teacherName = teacherMap.get(teacherId) || assignment.instructorName || 'Unknown Teacher';

                        const key = `${batch._id}_${sc._id}`;
                        assignmentMap.set(key, {
                            teacherId: assignment.instructorId,
                            teacherName: teacherName
                        });
                    }
                }
            }
        }

        return {
            batches: batches.map(b => ({
                id: b._id,
                name: b.name,
                shift: b.shift,
                semester: b.currentSemester,
                studentCount: b.currentStudents || b.maxStudents || 40,
                departmentId: b.departmentId?._id || b.departmentId,
                departmentName: deptMap[b.departmentId?._id || b.departmentId]?.shortName || 'Unknown'
            })),
            courses: sessionCourses.map(sc => ({
                id: sc._id,
                courseId: sc.courseId?._id || sc.courseId,
                code: sc.courseId?.code || 'Unknown',
                name: sc.courseId?.name || 'Unknown',
                credits: sc.courseId?.credit || 3,
                type: sc.courseId?.courseType || 'theory',
                semester: sc.semester,
                departmentId: sc.departmentId?._id || sc.departmentId,
                departmentName: sc.departmentId?.shortName || 'Unknown',
                durationMinutes: this.classDurations[sc.courseId?.courseType || 'theory'] || this.classDurationMinutes
            })),
            classrooms: classrooms.map(c => ({
                id: c._id,
                roomNumber: c.roomNumber,
                building: c.buildingName,
                floor: c.floor,
                capacity: c.capacity,
                roomType: c.roomType,
                facilities: c.facilities || [],
                departmentId: c.departmentId
            })),
            assignmentMap,
            deptMap
        };
    }

    // Get time slots for a batch based on its shift and class duration
    getTimeSlotsForShift(shift, durationMinutes = null) {
        const duration = durationMinutes || this.classDurationMinutes;
        return this.generateTimeSlots(shift, duration);
    }

    // Get consecutive/extended slots for longer classes (labs)
    getExtendedSlots(shift, durationMinutes) {
        // Generate slots that can accommodate the full duration
        return this.generateTimeSlots(shift, durationMinutes);
    }

    /**
     * Get dynamic time slots ensuring sequential scheduling without gaps.
     * Calculates valid slots based on existing classes for the batch on the specific day.
     */
    getDynamicTimeSlots(shiftName, batchId, day, durationMinutes, currentSchedule) {
        const config = this.shiftConfig[shiftName] || this.shiftConfig.day;
        const shiftStart = config.startHour * 60 + config.startMinute;
        const shiftEnd = config.endHour * 60 + config.endMinute;
        const breakStart = config.breakStart ? this.timeToMinutes(config.breakStart) : null;
        const breakEnd = config.breakEnd ? this.timeToMinutes(config.breakEnd) : null;

        // Get existing intervals for this batch on this day
        const batchIdStr = batchId.toString();
        const existingIntervals = currentSchedule
            .filter(s => s.batchId.toString() === batchIdStr && s.daysOfWeek.includes(day))
            .map(s => ({ start: this.timeToMinutes(s.startTime), end: this.timeToMinutes(s.endTime) }))
            .sort((a, b) => a.start - b.start);

        const possibleSlots = [];

        // Candidates: Shift start, and end of each existing interval (to create back-to-back sequence)
        let candidates = [shiftStart, ...existingIntervals.map(i => i.end)];

        // Also consider break end as a candidate start (if shift allows)
        if (breakEnd) candidates.push(breakEnd);

        // Remove duplicates and sort
        candidates = [...new Set(candidates)].sort((a, b) => a - b);

        for (const start of candidates) {
            let actualStart = start;

            // Adjust for break logic: If start falls inside break, move to break end
            if (breakStart && breakEnd) {
                if (actualStart >= breakStart && actualStart < breakEnd) {
                    actualStart = breakEnd;
                }
            }

            const end = actualStart + durationMinutes;

            // Check shift bounds
            if (end > shiftEnd) continue;

            // Check overlap with existing batch classes
            const overlaps = existingIntervals.some(i =>
                !(end <= i.start || actualStart >= i.end)
            );

            if (overlaps) continue;

            // Check break overlap (strict: cannot overlap break period at all)
            if (breakStart && breakEnd) {
                // strict check: if the class interval overlaps with the break interval
                if (actualStart < breakEnd && breakStart < end) {
                    continue;
                }
            }

            possibleSlots.push({
                start: this.minutesToTime(actualStart),
                end: this.minutesToTime(end)
            });
        }

        return possibleSlots;
    }

    // Check if a room is suitable for a course
    isRoomSuitable(room, course, batch) {
        // Check capacity
        if (room.capacity < batch.studentCount) {
            return false;
        }

        // Check room type
        const requiredTypes = ROOM_TYPE_REQUIREMENTS[course.type] || ROOM_TYPE_REQUIREMENTS.theory;
        if (!requiredTypes.includes(room.roomType)) {
            return false;
        }

        return true;
    }

    // Check if a time slot is available (no conflicts)
    isSlotAvailable(slot, day, batchId, teacherId, classroomId, schedule) {
        const batchIdStr = batchId?.toString();
        const teacherIdStr = teacherId?.toString();
        const classroomIdStr = classroomId?.toString();

        for (const entry of schedule) {
            if (!entry.daysOfWeek.includes(day)) continue;

            // Check time overlap
            const entryStart = this.timeToMinutes(entry.startTime);
            const entryEnd = this.timeToMinutes(entry.endTime);
            const slotStart = this.timeToMinutes(slot.start);
            const slotEnd = this.timeToMinutes(slot.end);

            const overlaps = !(slotEnd <= entryStart || slotStart >= entryEnd);
            if (!overlaps) continue;

            // Check conflicts
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

    // Convert time string to minutes for comparison
    timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    // Calculate sessions per week based on credits
    getSessionsPerWeek(credits, courseType) {
        // Theory: 2 sessions per week (User Requirement)
        // Lab/Project: 1 session per week (User Requirement)
        if (courseType === 'lab' || courseType === 'project') {
            return 1;
        }
        return 2;
    }

    // Main scheduling algorithm using constraint satisfaction with backtracking
    async generateSchedule(sessionId, generatedBy, options = {}) {
        const {
            batchIds,
            departmentId,
            selectionMode = 'all',
            classDurationMinutes = DEFAULT_CLASS_DURATION_MINUTES,
            classDurations = null,
            workingDays = null,
            offDays = null,
            customTimeSlots = null,
            preferredRooms = null
        } = options;

        // Set class durations for this generation
        this.classDurationMinutes = classDurationMinutes;
        if (classDurations) {
            this.classDurations = {
                theory: classDurations.theory || classDurationMinutes,
                lab: classDurations.lab || classDurationMinutes * 2,
                project: classDurations.project || classDurationMinutes * 2
            };
        } else {
            this.classDurations = {
                theory: classDurationMinutes,
                lab: classDurationMinutes * 2,
                project: classDurationMinutes * 2
            };
        }

        // Set working days - either from user input or calculate from off days
        if (workingDays && workingDays.length > 0) {
            this.workingDays = workingDays;
        } else if (offDays && offDays.length > 0) {
            this.workingDays = ALL_DAYS.filter(d => !offDays.includes(d));
        } else {
            this.workingDays = [...DEFAULT_WORKING_DAYS];
        }

        // Set custom time slots if provided
        if (customTimeSlots) {
            this.shiftConfig = {
                day: customTimeSlots.day ? this.parseTimeConfig(customTimeSlots.day) : DEFAULT_SHIFT_CONFIG.day,
                evening: customTimeSlots.evening ? this.parseTimeConfig(customTimeSlots.evening) : DEFAULT_SHIFT_CONFIG.evening
            };
        } else {
            this.shiftConfig = { ...DEFAULT_SHIFT_CONFIG };
        }

        // Reset state
        this.conflicts = [];
        this.warnings = [];

        // Validate prerequisites
        const validation = await this.validatePrerequisites(sessionId, batchIds, departmentId);
        if (!validation.valid) {
            throw {
                type: 'VALIDATION_ERROR',
                message: 'Prerequisites not met for schedule generation',
                errors: validation.errors,
                unassignedCourses: validation.unassignedCourses
            };
        }

        // Gather data
        const data = await this.gatherSchedulingData(sessionId, batchIds, departmentId);

        if (data.batches.length === 0) {
            throw new Error("No batches found for scheduling");
        }
        if (data.courses.length === 0) {
            throw new Error("No courses found for scheduling");
        }
        if (data.classrooms.length === 0) {
            throw new Error("No classrooms available");
        }

        const schedulingBatchIds = data.batches.map(b => b.id.toString());
        const existingActiveSchedules = await CourseSchedule.getActiveSchedules(schedulingBatchIds);
        const existingScheduleEntries = existingActiveSchedules.map(s => ({
            batchId: s.batchId,
            teacherId: s.teacherId,
            classroomId: s.classroomId,
            daysOfWeek: s.daysOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            sessionCourseId: s.sessionCourseId
        }));

        const tasks = [];
        for (const batch of data.batches) {
            const batchCourses = data.courses.filter(c =>
                c.departmentId?.toString() === batch.departmentId?.toString() &&
                c.semester === batch.semester
            );

            for (const course of batchCourses) {
                const assignmentKey = `${batch.id}_${course.id}`;
                const assignment = data.assignmentMap.get(assignmentKey);

                if (!assignment) {
                    this.warnings.push(`No teacher assigned for ${course.code} in batch ${batch.name}`);
                    continue;
                }

                const sessionsPerWeek = this.getSessionsPerWeek(course.credits, course.type);

                for (let session = 0; session < sessionsPerWeek; session++) {
                    tasks.push({
                        batch,
                        course,
                        teacherId: assignment.teacherId,
                        teacherName: assignment.teacherName,
                        sessionNumber: session + 1,
                        durationMinutes: course.durationMinutes,
                        preferredRoomId: preferredRooms ? (preferredRooms[course.type] || (course.type === 'project' ? preferredRooms.lab : null)) : null
                    });
                }
            }
        }

        if (tasks.length === 0) {
            throw new Error("No scheduling tasks generated. Ensure courses have teachers assigned.");
        }

        tasks.sort((a, b) => {
            if (a.course.type !== b.course.type) {
                if (a.course.type === 'lab') return -1;
                if (b.course.type === 'lab') return 1;
            }
            // Larger batches first
            return b.batch.studentCount - a.batch.studentCount;
        });

        // Schedule generation using greedy algorithm with conflict avoidance. Start with existing schedules from other batches to avoid conflicts
        const schedule = [...existingScheduleEntries];
        const newScheduleStartIndex = schedule.length;
        const unscheduled = [];

        for (const task of tasks) {
            const scheduled = this.scheduleTask(task, data.classrooms, schedule);

            if (scheduled) {
                schedule.push(scheduled);
            } else {
                unscheduled.push(task);
                this.conflicts.push({
                    type: 'UNSCHEDULED',
                    task,
                    reason: 'Could not find available slot'
                });
            }
        }

        // Try to reschedule failed tasks with more relaxed constraints
        const retryUnscheduled = [...unscheduled];
        unscheduled.length = 0;

        for (const task of retryUnscheduled) {
            const scheduled = this.scheduleTaskRelaxed(task, data.classrooms, schedule);
            if (scheduled) {
                schedule.push(scheduled);
            } else {
                unscheduled.push(task);
            }
        }

        // Third level: try same-day scheduling as last resort
        const finalRetry = [...unscheduled];
        unscheduled.length = 0;

        for (const task of finalRetry) {
            const scheduled = this.scheduleTaskSameDay(task, data.classrooms, schedule);
            if (scheduled) {
                schedule.push(scheduled);
                this.warnings.push(`${task.course.code} has multiple sessions on the same day due to limited slots`);
            } else {
                unscheduled.push(task);
            }
        }

        // Fourth level: try alternate shift (day -> evening or evening -> day)
        const alternateShiftRetry = [...unscheduled];
        unscheduled.length = 0;

        for (const task of alternateShiftRetry) {
            const scheduled = this.scheduleTaskAlternateShift(task, data.classrooms, schedule);
            if (scheduled) {
                schedule.push(scheduled);
                this.warnings.push(`${task.course.code} scheduled in alternate shift due to limited slots in primary shift`);
            } else {
                unscheduled.push(task);
                this.conflicts.push({
                    type: 'UNSCHEDULED_FINAL',
                    courseCode: task.course.code,
                    courseName: task.course.name,
                    batchName: task.batch.name,
                    teacherName: task.teacherName,
                    reason: 'No available time slot found after trying all scheduling strategies'
                });
            }
        }

        // Get session dates
        const session = await Session.findById(sessionId).lean();
        // Only include NEW schedules in the proposal (exclude existing ones used for conflict checking)
        const newSchedules = schedule.slice(newScheduleStartIndex);
        // Create proposal data - each entry is a recurring weekly schedule
        const scheduleData = newSchedules.map(s => ({
            sessionId: sessionId,
            sessionCourseId: s.sessionCourseId,
            batchId: s.batchId,
            classroomId: s.classroomId,
            teacherId: s.teacherId,
            daysOfWeek: s.daysOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            classType: s.classType,
            batchName: s.batchName,
            batchShift: s.batchShift,
            courseName: s.courseName,
            courseCode: s.courseCode,
            teacherName: s.teacherName,
            roomName: `${s.roomNumber} (${s.building})`,
            isRecurring: true,
            status: 'active'
        }));

        const proposal = await ScheduleProposal.create({
            sessionId,
            generatedBy,
            status: 'pending',
            scheduleData,
            metadata: {
                generatedAt: new Date(),
                itemCount: scheduleData.length,
                totalTasks: tasks.length,
                unscheduledCount: unscheduled.length,
                conflictsCount: this.conflicts.length,
                warningsCount: this.warnings.length,
                selectionMode,
                batchIds: batchIds || [],
                departmentId: departmentId || null,
                algorithm: 'constraint_satisfaction_greedy',
                classDurationMinutes: this.classDurationMinutes,
                classDurations: this.classDurations,
                workingDays: this.workingDays,
                shiftConfig: this.shiftConfig,
                conflicts: this.conflicts.slice(0, 10), // Store first 10 conflicts
                warnings: this.warnings.slice(0, 10),
                existingSchedulesConsidered: existingScheduleEntries.length
            }
        });

        return {
            proposal,
            stats: {
                scheduled: newSchedules.length, // Only count new schedules, not existing ones
                unscheduled: unscheduled.length,
                conflicts: this.conflicts,
                warnings: this.warnings,
                existingSchedulesConsidered: existingScheduleEntries.length
            }
        };
    }

    // Schedule a single task
    scheduleTask(task, classrooms, currentSchedule) {
        const { batch, course, teacherId, teacherName, durationMinutes } = task;
        // Get suitable classrooms
        const suitableRooms = classrooms.filter(r => this.isRoomSuitable(r, course, batch));
        if (suitableRooms.length === 0) {
            this.warnings.push(`No suitable room for ${course.code} (needs ${course.type} room with capacity >= ${batch.studentCount})`);
            return null;
        }

        // Sort rooms by preference
        suitableRooms.sort((a, b) => {
            // First priority: Preferred Room
            if (task.preferredRoomId) {
                if (a.id.toString() === task.preferredRoomId) return -1;
                if (b.id.toString() === task.preferredRoomId) return 1;
            }

            // Second priority: Capacity (closest fit)
            const aDiff = a.capacity - batch.studentCount;
            const bDiff = b.capacity - batch.studentCount;
            return aDiff - bDiff;
        });

        // Time slots are now calculated dynamically inside the loop per day
        // Get days where this specific course is already scheduled for this batch, NOT schedule the same course on the same day twice
        const courseScheduledDays = this.getCourseScheduledDays(batch.id, course.id, currentSchedule);
        // Get days already used by the batch (for spreading classes)
        const batchUsedDays = this.getBatchUsedDays(batch.id, currentSchedule);
        // Filter working days: exclude off days and days where this course is already scheduled
        const availableDays = this.workingDays.filter(d => !courseScheduledDays.includes(d));
        if (availableDays.length === 0) {
            this.warnings.push(`No available days for ${course.code} in batch ${batch.name} - already scheduled on all working days`);
            return null;
        }

        // Prefer days not yet used by the batch, then use already used days
        const preferredDays = availableDays.filter(d => !batchUsedDays.includes(d));
        const otherAvailableDays = availableDays.filter(d => batchUsedDays.includes(d));
        const dayOrder = [...preferredDays, ...otherAvailableDays];

        for (const day of dayOrder) {
            // Get dynamic slots for this specific day to ensure sequential scheduling
            const timeSlots = this.getDynamicTimeSlots(batch.shift, batch.id, day, durationMinutes, currentSchedule);

            for (const slot of timeSlots) {
                for (const room of suitableRooms) {
                    const availability = this.isSlotAvailable(
                        slot,
                        day,
                        batch.id,
                        teacherId,
                        room.id,
                        currentSchedule
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
                            // Enriched data
                            batchName: batch.name,
                            batchShift: batch.shift,
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

    // Schedule task with relaxed constraints (last resort)
    scheduleTaskRelaxed(task, classrooms, currentSchedule) {
        const { batch, course, teacherId, teacherName, durationMinutes } = task;
        // Try any room that fits
        const anyRooms = classrooms.filter(r => r.capacity >= batch.studentCount);
        if (anyRooms.length === 0) return null;

        // Time slots calculated dynamically per day
        // Get days where this specific course is already scheduled
        const courseScheduledDays = this.getCourseScheduledDays(batch.id, course.id, currentSchedule);
        // Filter working days: exclude days where this course is already scheduled
        const availableDays = this.workingDays.filter(d => !courseScheduledDays.includes(d));
        if (availableDays.length === 0) {
            return null; // No working days available for this course
        }

        // Try all combinations on available days only
        for (const day of availableDays) {
            const timeSlots = this.getDynamicTimeSlots(batch.shift, batch.id, day, durationMinutes, currentSchedule);
            for (const slot of timeSlots) {
                for (const room of anyRooms) {
                    const availability = this.isSlotAvailable(
                        slot, day, batch.id, teacherId, room.id, currentSchedule
                    );

                    if (availability.available) {
                        this.warnings.push(
                            `${course.code} scheduled in ${room.roomType} instead of preferred room type`
                        );
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
                            batchShift: batch.shift,
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

    /**
     * Last resort: Schedule task allowing same course on same day (different time slot)
     * This is used when all working days are exhausted for a course
     */
    scheduleTaskSameDay(task, classrooms, currentSchedule) {
        const { batch, course, teacherId, teacherName, durationMinutes } = task;
        // Try any room that fits
        const anyRooms = classrooms.filter(r => r.capacity >= batch.studentCount);
        if (anyRooms.length === 0) return null;

        // Time slots calculated dynamically per day
        // Try all working days (including days where this course is already scheduled)
        for (const day of this.workingDays) {
            const timeSlots = this.getDynamicTimeSlots(batch.shift, batch.id, day, durationMinutes, currentSchedule);
            for (const slot of timeSlots) {
                for (const room of anyRooms) {
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
                            batchShift: batch.shift,
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

    /**
     * Ultimate fallback: Try the alternate shift (day -> evening or evening -> day)
     * This is used when the primary shift is completely full
     */
    scheduleTaskAlternateShift(task, classrooms, currentSchedule) {
        const { batch, course, teacherId, teacherName, durationMinutes } = task;
        // Determine alternate shift
        const alternateShift = batch.shift === 'day' ? 'evening' : 'day';
        // Try any room that fits
        const anyRooms = classrooms.filter(r => r.capacity >= batch.studentCount);
        if (anyRooms.length === 0) return null;

        // Time slots calculated dynamically per day
        // Try all working days
        for (const day of this.workingDays) {
            const timeSlots = this.getDynamicTimeSlots(alternateShift, batch.id, day, durationMinutes, currentSchedule);
            for (const slot of timeSlots) {
                for (const room of anyRooms) {
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
                            batchShift: alternateShift, // Mark as alternate shift
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

    // Get days already used by a batch
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

    /**
     * Get days where a specific course is already scheduled for a batch
     * This prevents the same course from being scheduled twice on the same day
     */
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

    // Get all proposals for a session (or all proposals if no sessionId)
    async getProposals(sessionId) {
        const query = sessionId ? { sessionId } : {};
        const proposals = await ScheduleProposal.find(query).sort({ createdAt: -1 });
        return proposals;
    }

    // Get proposal by ID with enriched data
    async getProposalById(id) {
        const proposal = await ScheduleProposal.findById(id).lean();
        if (!proposal) return null;

        try {
            // Get unique IDs
            const uniqueBatchIds = [...new Set(proposal.scheduleData.map(i => i.batchId))];
            const uniqueCourseIds = [...new Set(proposal.scheduleData.map(i => i.sessionCourseId))];
            const uniqueRoomIds = [...new Set(proposal.scheduleData.map(i => i.classroomId))];
            const uniqueTeacherIds = [...new Set(proposal.scheduleData.map(i => i.teacherId).filter(Boolean))];

            // Fetch data
            const [batches, sessionCourses, classrooms] = await Promise.all([
                Batch.find({ _id: { $in: uniqueBatchIds } }).lean(),
                SessionCourse.find({ _id: { $in: uniqueCourseIds } }).populate('courseId').lean(),
                Classroom.find({ _id: { $in: uniqueRoomIds } }).lean()
            ]);

            // Get teachers from enrollment DB
            const Teacher = mongoose.connection.collection('teachers');
            const teachers = await Teacher.find({ _id: { $in: uniqueTeacherIds } }).toArray();

            // Create maps
            const batchMap = batches.reduce((acc, b) => ({
                ...acc,
                [b._id]: { name: b.name, shift: b.shift }
            }), {});

            const courseMap = sessionCourses.reduce((acc, sc) => ({
                ...acc,
                [sc._id]: {
                    name: sc.courseId?.name || 'Unknown',
                    code: sc.courseId?.code || 'Unknown'
                }
            }), {});

            const roomMap = classrooms.reduce((acc, c) => ({
                ...acc,
                [c._id]: `${c.roomNumber} (${c.buildingName})`
            }), {});

            const teacherMap = teachers.reduce((acc, t) => ({
                ...acc,
                [t._id]: t.fullName || 'Unknown'
            }), {});

            proposal.scheduleData = proposal.scheduleData.map(item => ({
                ...item,
                batchName: item.batchName || batchMap[item.batchId]?.name || item.batchId,
                batchShift: item.batchShift || batchMap[item.batchId]?.shift || 'day',
                courseName: item.courseName ||
                    `${courseMap[item.sessionCourseId]?.code}: ${courseMap[item.sessionCourseId]?.name}` ||
                    item.sessionCourseId,
                courseCode: item.courseCode || courseMap[item.sessionCourseId]?.code || '',
                roomName: item.roomName || roomMap[item.classroomId] || item.classroomId,
                teacherName: item.teacherName || teacherMap[item.teacherId] || 'Not Assigned'
            }));

            proposal.id = proposal._id;
            delete proposal._id;
            delete proposal.__v;

            return proposal;
        } catch (error) {
            proposal.id = proposal._id;
            delete proposal._id;
            delete proposal.__v;
            return proposal;
        }
    }

    // Apply a proposal to create actual schedules
    async applyProposal(proposalId) {
        const proposal = await ScheduleProposal.findById(proposalId);
        if (!proposal) throw new Error("Proposal not found");
        if (proposal.status === 'approved') throw new Error("Proposal already applied");

        const session = await Session.findById(proposal.sessionId);
        if (!session) throw new Error("Session not found");

        // Get affected batch IDs
        const batchIds = [...new Set(proposal.scheduleData.map(s => s.batchId))];

        // CLOSE (not delete) existing active schedules for the affected batches
        // This preserves history and prevents conflicts with new schedules
        await CourseSchedule.closeBatchSchedules(batchIds);

        // Create new recurring weekly schedules
        // Each schedule entry represents a weekly recurring class that repeats every week
        const schedules = proposal.scheduleData.map(item => ({
            sessionId: proposal.sessionId, // Link to session
            batchId: item.batchId,
            sessionCourseId: item.sessionCourseId,
            teacherId: item.teacherId,
            classroomId: item.classroomId,
            daysOfWeek: item.daysOfWeek,
            startTime: item.startTime,
            endTime: item.endTime,
            classType: item.classType || 'Lecture',
            startDate: session.startDate,
            endDate: session.endDate,
            isActive: true,
            isRecurring: true, // This is a recurring weekly schedule
            status: 'active' // Active status means it will be considered for conflict checking
        }));

        const createdSchedules = await CourseSchedule.insertMany(schedules);

        proposal.status = 'approved';
        proposal.metadata = {
            ...proposal.metadata,
            appliedAt: new Date(),
            schedulesCreated: createdSchedules.length,
            previousSchedulesClosed: batchIds.length
        };
        await proposal.save();

        return {
            success: true,
            schedulesCreated: createdSchedules.length,
            message: `Successfully created ${createdSchedules.length} class schedules`
        };
    }

    // Delete a proposal
    async deleteProposal(proposalId) {
        const proposal = await ScheduleProposal.findById(proposalId);
        if (!proposal) throw new Error("Proposal not found");
        if (proposal.status === 'approved') {
            throw new Error("Cannot delete an applied proposal");
        }

        await ScheduleProposal.findByIdAndDelete(proposalId);
        return { success: true, message: "Proposal deleted successfully" };
    }

    // Check for conflicts in existing schedules
    async checkExistingConflicts(batchIds, sessionId) {
        const schedules = await CourseSchedule.find({
            batchId: { $in: batchIds },
            isActive: true,
            status: 'active' // Only check active schedules
        }).lean();

        const conflicts = [];

        // Check for teacher conflicts
        const teacherSchedules = new Map();
        for (const s of schedules) {
            if (!s.teacherId) continue;

            for (const day of s.daysOfWeek) {
                const key = `${s.teacherId}_${day}_${s.startTime}`;
                if (teacherSchedules.has(key)) {
                    conflicts.push({
                        type: 'TEACHER_CONFLICT',
                        schedule1: teacherSchedules.get(key),
                        schedule2: s
                    });
                } else {
                    teacherSchedules.set(key, s);
                }
            }
        }

        // Check for room conflicts
        const roomSchedules = new Map();
        for (const s of schedules) {
            if (!s.classroomId) continue;

            for (const day of s.daysOfWeek) {
                const key = `${s.classroomId}_${day}_${s.startTime}`;
                if (roomSchedules.has(key)) {
                    conflicts.push({
                        type: 'ROOM_CONFLICT',
                        schedule1: roomSchedules.get(key),
                        schedule2: s
                    });
                } else {
                    roomSchedules.set(key, s);
                }
            }
        }

        return conflicts;
    }

    /**
     * Close schedules for specific batches
     * Closed schedules are no longer considered for conflict checking
     * @param {string[]} batchIds - Array of batch IDs
     * @returns {Object} Result with count of closed schedules
     */
    async closeSchedulesForBatches(batchIds) {
        const result = await CourseSchedule.closeBatchSchedules(batchIds);
        return {
            success: true,
            message: `Closed ${result.modifiedCount} schedules for ${batchIds.length} batches`,
            closedCount: result.modifiedCount
        };
    }

    /**
     * Close all schedules for a session
     * @param {string} sessionId - Session ID
     * @returns {Object} Result with count of closed schedules
     */
    async closeSchedulesForSession(sessionId) {
        const result = await CourseSchedule.closeSessionSchedules(sessionId);
        return {
            success: true,
            message: `Closed ${result.modifiedCount} schedules for session`,
            closedCount: result.modifiedCount
        };
    }

    /**
     * Reopen schedules for specific batches
     * @param {string[]} batchIds - Array of batch IDs
     * @returns {Object} Result with count of reopened schedules
     */
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

    /**
     * Get schedule status summary for batches
     * @param {string[]} batchIds - Array of batch IDs (optional)
     * @returns {Object} Summary of schedule counts by status
     */
    async getScheduleStatusSummary(batchIds = null) {
        const matchQuery = { isActive: true, deletedAt: null };
        if (batchIds && batchIds.length > 0) {
            matchQuery.batchId = { $in: batchIds };
        }

        const summary = await CourseSchedule.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        return summary.reduce((acc, item) => ({
            ...acc,
            [item._id]: item.count
        }), { active: 0, closed: 0, archived: 0 });
    }

    /**
     * Get all active schedules for display (weekly recurring view)
     * @param {string[]} batchIds - Array of batch IDs (optional)
     * @returns {Array} Active schedules
     */
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
