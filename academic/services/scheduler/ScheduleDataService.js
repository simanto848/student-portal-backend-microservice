import Classroom from "../../models/Classroom.js";
import SessionCourse from "../../models/SessionCourse.js";
import Batch from "../../models/Batch.js";
import Department from "../../models/Department.js";
import Teacher from "../../models/Teacher.js";

import enrollmentServiceClient from "../../client/enrollmentServiceClient.js";
import userServiceClient from "../../client/userServiceClient.js";

const ROOM_TYPE_REQUIREMENTS = {
    theory: ['Lecture Hall', 'Seminar Room', 'Conference Room'],
    lab: ['Laboratory', 'Computer Lab'],
    project: ['Laboratory', 'Computer Lab', 'Seminar Room']
};

class ScheduleDataService {
    async validatePrerequisites(sessionId, batchIds, departmentId = null) {
        const errors = [];
        const warnings = [];

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

        // Fetch all batch assignments in parallel
        const batchAssignmentResults = await Promise.all(
            batches.map(batch =>
                enrollmentServiceClient.getBatchAssignments(
                    batch._id.toString(), batch.currentSemester
                ).then(assignments => ({ batch, assignments }))
            )
        );

        const unassignedCourses = [];
        for (const { batch, assignments: batchAssignments } of batchAssignmentResults) {
            const batchDeptId = batch.departmentId?.toString();
            const assignedCourseIds = new Set(batchAssignments.map(a => a.courseId?.toString()));
            const batchCourses = sessionCourses.filter(s => {
                const scDeptId = (s.departmentId?._id || s.departmentId)?.toString();
                return scDeptId === batchDeptId && s.semester === batch.currentSemester;
            });

            for (const sc of batchCourses) {
                const courseId = (sc.courseId?._id || sc.courseId)?.toString();
                if (!assignedCourseIds.has(courseId)) {
                    unassignedCourses.push({
                        batchId: batch._id, batchName: batch.name,
                        courseId, courseCode: sc.courseId?.code || 'Unknown',
                        courseName: sc.courseId?.name || 'Unknown',
                        semester: batch.currentSemester
                    });
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

        const classrooms = await Classroom.find({ isActive: true, isUnderMaintenance: false }).lean();
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

        return { valid: errors.length === 0, errors, warnings, data: { batches, sessionCourses, classrooms } };
    }

    // Fetch teacher details
    async fetchTeacherMap(teacherIds) {
        const teacherMap = new Map();
        if (teacherIds.size === 0) return teacherMap;

        const localTeachers = await Teacher.find({ _id: { $in: [...teacherIds] } }).lean();
        for (const t of localTeachers) {
            teacherMap.set(t._id.toString(), t.fullName || 'Unknown Teacher');
        }

        const missingIds = [...teacherIds].filter(id => !teacherMap.has(id));
        if (missingIds.length > 0) {
            const userTeachers = await userServiceClient.getTeachersByIds(missingIds);
            for (const t of userTeachers) {
                if (t && (t.id || t._id)) {
                    teacherMap.set((t.id || t._id).toString(), t.fullName || t.name || 'Unknown Teacher');
                }
            }
        }
        return teacherMap;
    }

    // Gather all data needed for scheduling
    async gatherSchedulingData(sessionId, engine, batchIds = null, departmentId = null) {
        // Build batch query
        let batchQuery = { status: true };
        if (batchIds && batchIds.length > 0) {
            batchQuery._id = { $in: batchIds };
        } else if (departmentId) {
            batchQuery.departmentId = departmentId;
        }

        const batches = await Batch.find(batchQuery).populate('departmentId').populate('programId').lean();
        const departments = await Department.find({ status: true }).lean();
        const deptMap = departments.reduce((acc, d) => ({ ...acc, [d._id.toString()]: d }), {});

        const semesters = [...new Set(batches.map(b => b.currentSemester))];
        const batchDeptIds = [...new Set(batches.map(b => b.departmentId?._id || b.departmentId))];

        let courseQuery = { sessionId };
        if (departmentId) {
            courseQuery.departmentId = departmentId;
        } else if (batchDeptIds.length > 0) {
            courseQuery.departmentId = { $in: batchDeptIds };
        }
        if (semesters.length > 0) {
            courseQuery.semester = { $in: semesters };
        }

        const sessionCourses = await SessionCourse.find(courseQuery).populate('courseId').populate('departmentId').lean();
        const classrooms = await Classroom.find({ isActive: true, isUnderMaintenance: false }).lean();
        const allTeacherIds = new Set();
        const batchAssignmentsCache = new Map();

        const batchAssignmentResults = await Promise.all(
            batches.map(batch =>
                enrollmentServiceClient.getBatchAssignments(
                    batch._id.toString(), batch.currentSemester
                ).then(assignments => ({ batchId: batch._id.toString(), assignments }))
            )
        );

        for (const { batchId, assignments } of batchAssignmentResults) {
            batchAssignmentsCache.set(batchId, assignments);
            for (const assignment of assignments) {
                if (assignment.instructorId) allTeacherIds.add(assignment.instructorId.toString());
            }
        }

        const teacherMap = await this.fetchTeacherMap(allTeacherIds);

        // Build assignment map
        const assignmentMap = new Map();
        for (const batch of batches) {
            const batchDeptId = (batch.departmentId?._id || batch.departmentId)?.toString();
            const batchAssignments = batchAssignmentsCache.get(batch._id.toString()) || [];

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
                        assignmentMap.set(`${batch._id}_${sc._id}`, {
                            teacherId: assignment.instructorId, teacherName
                        });
                    }
                }
            }
        }

        return {
            batches: batches.map(b => ({
                id: b._id, name: b.name, shift: b.shift,
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
                durationMinutes: engine.classDurations[sc.courseId?.courseType || 'theory'] || engine.classDurationMinutes
            })),
            classrooms: classrooms.map(c => ({
                id: c._id, roomNumber: c.roomNumber,
                building: c.buildingName, floor: c.floor,
                capacity: c.capacity, roomType: c.roomType,
                facilities: c.facilities || [],
                departmentId: c.departmentId
            })),
            assignmentMap,
            deptMap
        };
    }
}

export default new ScheduleDataService();
