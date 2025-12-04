import Workspace from '../models/Workspace.js';
import { BatchCourseInstructor, CourseEnrollment } from '../models/external/Enrollment.js';
import { Course, Batch } from '../models/external/Academic.js';

const getWorkspace = async (courseId, batchId, userId, role, token) => {
    let workspace = await Workspace.findOne({ courseId, batchId });
    if (workspace) {
        if (role === 'teacher') {
            const isAssigned = await BatchCourseInstructor.findOne({
                batchId,
                courseId,
                instructorId: userId,
                status: 'active',
                deletedAt: null
            });
            if (!isAssigned) {
                throw new Error('You are not assigned to this course batch.');
            }
        } else if (role === 'student') {
            const isEnrolled = await CourseEnrollment.findOne({
                batchId,
                courseId,
                studentId: userId,
                status: 'active',
                deletedAt: null
            });
            if (!isEnrolled) {
                throw new Error('You are not enrolled in this course batch.');
            }
        }
        return workspace;
    }

    const allowedRoles = ['teacher', 'super_admin', 'admin', 'program_controller'];
    if (!allowedRoles.includes(role)) {
        throw new Error('Workspace not found.');
    }

    if (role === 'teacher') {
        const isAssigned = await BatchCourseInstructor.findOne({
            batchId,
            courseId,
            instructorId: userId,
            status: 'active',
            deletedAt: null
        });
        if (!isAssigned) {
            throw new Error('You are not assigned to this course batch.');
        }
    }

    let course = await Course.findById(courseId);
    let batch = await Batch.findById(batchId);

    // Fallback to API if not found in local DB (assuming separate DBs)
    if (!course) {
        try {
            const res = await fetch(`http://localhost:8001/courses/${courseId}`, {
                headers: { 'Authorization': token }
            });
            const data = await res.json();
            if (data.success && data.data) {
                course = data.data;
            }
        } catch (e) {
            console.error(`Failed to fetch course ${courseId} from Academic Service`, e.message);
        }
    }

    if (!batch) {
        try {
            const res = await fetch(`http://localhost:8001/batches/${batchId}`, {
                headers: { 'Authorization': token }
            });
            const data = await res.json();
            if (data.success && data.data) {
                batch = data.data;
            }
        } catch (e) {
            console.error(`Failed to fetch batch ${batchId} from Academic Service`, e.message);
        }
    }

    if (!course || !batch) {
        throw new Error('Invalid Course or Batch ID.');
    }

    workspace = new Workspace({
        courseId,
        batchId,
        departmentId: typeof course.departmentId === 'object' ? (course.departmentId.id || course.departmentId._id) : course.departmentId,
        title: `${course.code} - ${batch.name}`,
        teacherIds: [userId],
        settings: {
            allowLateSubmission: true,
            lateGraceMinutes: 0,
            maxAttachmentSizeMB: 15
        }
    });

    await workspace.save();
    return workspace;
};

const getWorkspaceById = async (workspaceId, userId, role) => {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    await getWorkspace(workspace.courseId, workspace.batchId, userId, role);
    return workspace;
};

const listWorkspaces = async (userId, role) => {
    if (['super_admin', 'admin', 'program_controller'].includes(role)) {
        return Workspace.find({ deletedAt: null }).sort({ createdAt: -1 });
    }

    if (role === 'teacher') {
        const assignments = await BatchCourseInstructor.find({
            instructorId: userId,
            status: 'active',
            deletedAt: null
        });

        // For each assignment, ensure workspace exists (or just find existing ones)
        // If we want to show all POTENTIAL workspaces, we might return assignments.
        // But let's return actual workspaces.
        const pairs = assignments.map(a => ({ courseId: a.courseId, batchId: a.batchId }));
        if (pairs.length === 0) return [];

        return Workspace.find({
            $or: pairs,
            deletedAt: null
        }).sort({ createdAt: -1 });
    } else if (role === 'student') {
        const enrollments = await CourseEnrollment.find({
            studentId: userId,
            status: 'active',
            deletedAt: null
        });

        const pairs = enrollments.map(e => ({ courseId: e.courseId, batchId: e.batchId }));
        if (pairs.length === 0) return [];

        return Workspace.find({
            $or: pairs,
            deletedAt: null
        }).sort({ createdAt: -1 });
    }
    return [];
};

const updateWorkspace = async (workspaceId, updates, userId, role) => {
    const workspace = await getWorkspaceById(workspaceId, userId, role);
    Object.assign(workspace, updates);
    await workspace.save();
    return workspace;
};

const deleteWorkspace = async (workspaceId, userId, role) => {
    const workspace = await getWorkspaceById(workspaceId, userId, role);
    workspace.deletedAt = new Date();
    await workspace.save();
    return true;
};

export default {
    getWorkspace,
    getWorkspaceById,
    listWorkspaces,
    updateWorkspace,
    deleteWorkspace
};
