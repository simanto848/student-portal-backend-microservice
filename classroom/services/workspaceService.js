import Workspace from '../models/Workspace.js';
import { config } from 'shared';
import { fetchWithFallback, extractApiArray } from '../utils/httpClient.js';
import { verifyStudentBatchAccess, verifyTeacherAssignment, getStudentBatchId } from '../utils/accessControl.js';
import { fetchCourse, fetchBatch, fetchCoursesMap, fetchBatchesMap } from '../utils/academicFetcher.js';

const getWorkspace = async (courseId, batchId, userId, role, token) => {
  if (role === 'teacher') {
    const isAssigned = await verifyTeacherAssignment(userId, courseId, batchId, token);
    if (!isAssigned) throw new Error('You are not assigned to this course batch.');
  } else if (role === 'student') {
    const hasAccess = await verifyStudentBatchAccess(userId, batchId, token);
    if (!hasAccess) throw new Error('You do not belong to this batch.');
  }

  let workspace = await Workspace.findOne({ courseId, batchId });
  if (workspace) return workspace;

  const allowedRoles = ['teacher', 'super_admin', 'admin', 'program_controller'];
  if (!allowedRoles.includes(role)) throw new Error('Workspace not found.');

  const [course, batch] = await Promise.all([
    fetchCourse(courseId, token),
    fetchBatch(batchId, token)
  ]);

  if (!course || !batch) throw new Error('Invalid Course or Batch ID.');

  workspace = new Workspace({
    courseId,
    batchId,
    departmentId: typeof course.departmentId === 'object'
      ? course.departmentId.id || course.departmentId._id
      : course.departmentId,
    title: `${course.code} - ${batch.name}`,
    teacherIds: [userId],
    settings: {
      allowLateSubmission: true,
      lateGraceMinutes: 0,
      maxAttachmentSizeMB: 15,
    },
  });

  await workspace.save();
  return workspace;
};

const getWorkspaceById = async (workspaceId, userId, role, token) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) throw new Error('Workspace not found');

  await getWorkspace(workspace.courseId, workspace.batchId, userId, role, token);

  const enrichedWorkspaces = await enrichWorkspaces([workspace], token);
  return enrichedWorkspaces[0] || workspace;
};

const listWorkspaces = async (userId, role, token) => {
  if (role === 'teacher') {
    let assignments = [];
    try {
      const enrollBase = config.services.enrollment.replace(/\/$/, '');
      const url = `${enrollBase}/batch-course-instructors/instructor/${userId}/courses`;
      const res = await fetchWithFallback(url, { headers: { Authorization: token } }, 'enrollment');
      if (res.ok) {
        const data = await res.json();
        assignments = extractApiArray(data);
      }
    } catch (e) {
      throw e;
    }

    const pairs = assignments.map((a) => ({ courseId: a.courseId, batchId: a.batchId }));
    if (pairs.length === 0) return [];

    const workspaces = await Workspace.find({
      $or: pairs,
      status: { $ne: 'archived' },
      deletedAt: null,
    }).sort({ createdAt: -1 });

    return await enrichWorkspaces(workspaces, token);
  } else if (role === 'student') {
    const studentBatchId = await getStudentBatchId(userId, token);
    if (!studentBatchId) return [];

    const workspaces = await Workspace.find({
      batchId: studentBatchId,
      deletedAt: null,
    }).sort({ createdAt: -1 });

    return await enrichWorkspaces(workspaces, token);
  }
  return [];
};

// Enriches workspaces with course/batch/teacher/student-count details
const enrichWorkspaces = async (workspaces, token) => {
  if (workspaces.length === 0) return [];

  // Collect all unique IDs
  const courseIds = [...new Set(workspaces.map(ws => ws.courseId).filter(Boolean))];
  const batchIds = [...new Set(workspaces.map(ws => ws.batchId).filter(Boolean))];
  const teacherIds = [...new Set(workspaces.flatMap(ws => ws.teacherIds || []).filter(Boolean))];

  const [courseMap, batchMap, teacherMap] = await Promise.all([
    fetchCoursesMap(courseIds, token),
    fetchBatchesMap(batchIds, token),
    fetchTeachersMap(teacherIds, token)
  ]);

  // Fetch student counts per batch in parallel
  const studentCountMap = await fetchStudentCounts(batchIds, token);

  return workspaces.map((ws) => {
    const workspaceObj = ws.toObject ? ws.toObject() : { ...ws };
    const course = courseMap.get(String(ws.courseId));
    const batch = batchMap.get(String(ws.batchId));

    if (course) {
      workspaceObj.courseName = course.name;
      workspaceObj.courseCode = course.code;
      workspaceObj.semester = course.semester || null;
    }

    if (batch) {
      workspaceObj.batchName = batch.name;
      workspaceObj.programId = batch.programId;
    }

    workspaceObj.totalBatchStudents = studentCountMap.get(String(ws.batchId)) || 0;

    workspaceObj.teachers = (ws.teacherIds || []).map(tid => {
      const teacher = teacherMap.get(String(tid));
      return teacher || { id: tid, fullName: 'Unknown Teacher' };
    });

    workspaceObj.studentCount = ws.studentIds ? ws.studentIds.length : 0;
    workspaceObj.id = ws._id;

    return workspaceObj;
  });
};

// Batch-fetch teacher details
const fetchTeachersMap = async (teacherIds, token) => {
  const map = new Map();
  if (teacherIds.length === 0) return map;

  const userBase = config.services.user.replace(/\/$/, '');
  await Promise.all(teacherIds.map(async (tid) => {
    try {
      const res = await fetchWithFallback(
        `${userBase}/teachers/${tid}`,
        { headers: { Authorization: token } },
        'user'
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          map.set(String(tid), {
            id: tid,
            fullName: data.data.fullName || data.data.name || 'Unknown Teacher',
            email: data.data.email || '',
            registrationNumber: data.data.registrationNumber || '',
          });
        }
      }
    } catch (e) { /* skip */ }
  }));
  return map;
};

// Batch-fetch student counts per batch
const fetchStudentCounts = async (batchIds, token) => {
  const map = new Map();
  if (batchIds.length === 0) return map;

  const userBase = config.services.user.replace(/\/$/, '');
  await Promise.all(batchIds.map(async (bid) => {
    try {
      const res = await fetchWithFallback(
        `${userBase}/students?batchId=${bid}&limit=1`,
        { headers: { Authorization: token } },
        'user'
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.pagination) {
          map.set(String(bid), data.data.pagination.total);
        } else if (data.data?.total) {
          map.set(String(bid), data.data.total);
        }
      }
    } catch (e) { /* skip */ }
  }));
  return map;
};

const listPendingWorkspaces = async (userId, role, token) => {
  if (role !== 'teacher') return [];

  let assignments = [];
  try {
    const enrollBase = config.services.enrollment.replace(/\/$/, '');
    const url = `${enrollBase}/batch-course-instructors/instructor/${userId}/courses`;
    const res = await fetchWithFallback(url, { headers: { Authorization: token } }, 'enrollment');
    if (!res.ok) throw new Error(`Enrollment Service returned ${res.status}`);
    const rawData = await res.json();
    assignments = extractApiArray(rawData);
  } catch (e) {
    return [];
  }

  if (assignments.length === 0) return [];

  const pairs = assignments.map((a) => ({ courseId: a.courseId, batchId: a.batchId }));
  const existingWorkspaces = await Workspace.find({ $or: pairs });
  const activeOrArchived = existingWorkspaces.filter((w) => !w.deletedAt);

  const pendingAssignments = assignments.filter(
    (a) => !activeOrArchived.some(
      (w) => w.courseId === a.courseId && w.batchId === a.batchId
    )
  );

  if (pendingAssignments.length === 0) return [];

  // Batch-fetch courses and batches for all pending assignments
  const courseIds = pendingAssignments.map(a => a.courseId);
  const batchIds = pendingAssignments.map(a => a.batchId);
  const [courseMap, batchMap] = await Promise.all([
    fetchCoursesMap(courseIds, token),
    fetchBatchesMap(batchIds, token)
  ]);

  return pendingAssignments
    .map((a) => {
      const course = courseMap.get(String(a.courseId));
      const batch = batchMap.get(String(a.batchId));
      if (!course || !batch) return null;
      return {
        courseId: a.courseId,
        batchId: a.batchId,
        courseName: course.name,
        courseCode: course.code,
        batchName: batch.name,
        programId: batch.programId,
        semester: a.semester,
      };
    })
    .filter(Boolean);
};

const deleteWorkspace = async (workspaceId, userId, role, token) => {
  const workspace = await getWorkspaceById(workspaceId, userId, role, token);
  workspace.deletedAt = new Date();
  await workspace.save();
  return true;
};

const archiveWorkspace = async (workspaceId, userId, role, token) => {
  const workspace = await getWorkspaceById(workspaceId, userId, role, token);
  if (role === 'teacher' && !workspace.teacherIds.includes(userId)) {
    throw new Error('Unauthorized to archive this workspace');
  }
  workspace.status = 'archived';
  await workspace.save();
  return workspace;
};

export default {
  getWorkspace,
  getWorkspaceById,
  listWorkspaces,
  deleteWorkspace,
  listPendingWorkspaces,
  archiveWorkspace,
};
