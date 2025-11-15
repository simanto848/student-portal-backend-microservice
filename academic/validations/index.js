// Validation middleware
export { validate, validatePartial } from './validate.js';

// Session validations
export {
    createSessionSchema,
    updateSessionSchema,
    getSessionByIdSchema,
    deleteSessionSchema,
    getSessionsSchema,
} from './sessionValidation.js';

// Batch validations
export {
    createBatchSchema,
    updateBatchSchema,
    getBatchByIdSchema,
    deleteBatchSchema,
    getBatchesSchema,
    assignCounselorSchema,
    updateSemesterSchema,
} from './batchValidation.js';

// Course validations
export {
    createCourseSchema,
    updateCourseSchema,
    getCourseByIdSchema,
    deleteCourseSchema,
    getCoursesSchema,
} from './courseValidation.js';

// SessionCourse validations
export {
    createSessionCourseSchema,
    updateSessionCourseSchema,
    getSessionCourseByIdSchema,
    deleteSessionCourseSchema,
    getSessionCoursesSchema,
    getBatchSessionCoursesSchema,
} from './sessionCourseValidation.js';

// CourseSchedule validations
export {
    createCourseScheduleSchema,
    updateCourseScheduleSchema,
    getCourseScheduleByIdSchema,
    deleteCourseScheduleSchema,
    getCourseSchedulesSchema,
    getBatchScheduleSchema,
    getTeacherScheduleSchema,
} from './courseScheduleValidation.js';

// CoursePrerequisite validations
export {
    createCoursePrerequisiteSchema,
    updateCoursePrerequisiteSchema,
    getCoursePrerequisiteByIdSchema,
    deleteCoursePrerequisiteSchema,
    getCoursePrerequisitesSchema,
} from './coursePrerequisiteValidation.js';

// Faculty validations
export {
    createFacultySchema,
    updateFacultySchema,
    getFacultyByIdSchema,
    deleteFacultySchema,
    getFacultiesSchema,
    assignDeanSchema,
    removeDeanSchema,
} from './facultyValidation.js';

// Department validations
export {
    createDepartmentSchema,
    updateDepartmentSchema,
    getDepartmentByIdSchema,
    deleteDepartmentSchema,
    getDepartmentsSchema,
    assignDepartmentHeadSchema,
    removeDepartmentHeadSchema,
} from './departmentValidation.js';

// Program validations
export {
    createProgramSchema,
    updateProgramSchema,
    getProgramByIdSchema,
    deleteProgramSchema,
    getProgramsSchema,
} from './programValidation.js';

// Classroom validations
export {
    createClassroomSchema,
    updateClassroomSchema,
    getClassroomByIdSchema,
    deleteClassroomSchema,
    getClassroomsSchema,
} from './classroomValidation.js';

// CourseSyllabus validations
export {
    createCourseSyllabusSchema,
    updateCourseSyllabusSchema,
    getCourseSyllabusByIdSchema,
    deleteCourseSyllabusSchema,
    getCourseSyllabusesSchema,
    approveSyllabusSchema,
    publishSyllabusSchema,
} from './courseSyllabusValidation.js';
