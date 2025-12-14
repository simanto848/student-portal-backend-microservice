import Workspace from "../models/Workspace.js";
import {
  CourseEnrollment,
} from "../models/external/Enrollment.js";
import { Course, Batch } from "../models/external/Academic.js";

const extractApiArray = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  if (payload.success && Array.isArray(payload.data)) return payload.data;

  if (
    payload.success &&
    payload.data &&
    typeof payload.data === "object" &&
    Array.isArray(payload.data.data)
  ) {
    return payload.data.data;
  }

  if (
    payload.success &&
    payload.data &&
    typeof payload.data === "object" &&
    Array.isArray(payload.data.enrollments)
  ) {
    return payload.data.enrollments;
  }

  if (Array.isArray(payload.data)) return payload.data;
  if (
    payload.data &&
    typeof payload.data === "object" &&
    Array.isArray(payload.data.data)
  ) {
    return payload.data.data;
  }

  return [];
};

const getWorkspace = async (courseId, batchId, userId, role, token) => {
  const checkTeacherAssignment = async () => {
    try {
      const enrollmentServiceUrl =
        process.env.ENROLLMENT_SERVICE_URL || "http://localhost:8003";
      const base = enrollmentServiceUrl.replace(/\/$/, "");
      const url = `${base}/batch-course-instructors?instructorId=${userId}&courseId=${courseId}&batchId=${batchId}&status=active`;

      const res = await fetchWithFallback(
        url,
        { headers: { Authorization: token } },
        "enrollment",
        "enrollment"
      );
      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      const items = extractApiArray(data);

      if (items.length > 0) return true;
      return false;
    } catch (e) {
      return false;
    }
  };

  if (role === "teacher") {
    const isAssigned = await checkTeacherAssignment();
    if (!isAssigned) {
      throw new Error("You are not assigned to this course batch.");
    }
  } else if (role === "student") {
    let hasAccess = false;
    try {
      const enrollmentServiceUrl = process.env.ENROLLMENT_SERVICE_URL || "http://localhost:8003";
      const base = enrollmentServiceUrl.replace(/\/$/, "");
      const url = `${base}/enrollments`;

      const res = await fetchWithFallback(
        url,
        { headers: { Authorization: token } },
        "enrollment",
        "enrollment"
      );
      if (res.ok) {
        const data = await res.json();
        const enrollments = extractApiArray(data);
        hasAccess = enrollments.some(e => e.batchId === batchId);
      }
    } catch (e) {
      console.error("[Classroom] Failed to check student enrollment via API", e.message);
      const localEnrollment = await CourseEnrollment.findOne({
        batchId,
        studentId: userId,
        status: "active",
        deletedAt: null,
      });
      hasAccess = !!localEnrollment;
    }

    if (!hasAccess) {
      throw new Error("You are not enrolled in this batch.");
    }
  }

  let workspace = await Workspace.findOne({ courseId, batchId });
  if (workspace) return workspace;

  const allowedRoles = [
    "teacher",
    "super_admin",
    "admin",
    "program_controller",
  ];
  if (!allowedRoles.includes(role)) {
    throw new Error("Workspace not found.");
  }

  let course = await Course.findById(courseId);
  let batch = await Batch.findById(batchId);

  const academicUrl =
    process.env.ACADEMIC_SERVICE_URL || "http://localhost:8001";
  const base = academicUrl.replace(/\/$/, "");

  if (!course) {
    try {
      const res = await fetchWithFallback(
        `${base}/courses/${courseId}`,
        { headers: { Authorization: token } },
        "academic",
        "academic"
      );
      const data = await res.json();
      if (data.success && data.data) {
        course = data.data;
      }
    } catch (e) {
      console.error(
        `Failed to fetch course ${courseId} from Academic Service`,
        e.message
      );
    }
  }

  if (!batch) {
    try {
      const res = await fetchWithFallback(
        `${base}/batches/${batchId}`,
        { headers: { Authorization: token } },
        "academic",
        "academic"
      );
      const data = await res.json();
      if (data.success && data.data) {
        batch = data.data;
      }
    } catch (e) {
      console.error(
        `Failed to fetch batch ${batchId} from Academic Service`,
        e.message
      );
    }
  }

  if (!course || !batch) {
    throw new Error("Invalid Course or Batch ID.");
  }

  workspace = new Workspace({
    courseId,
    batchId,
    departmentId:
      typeof course.departmentId === "object"
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
  if (!workspace) throw new Error("Workspace not found");

  await getWorkspace(
    workspace.courseId,
    workspace.batchId,
    userId,
    role,
    token
  );

  const enrichedWorkspaces = await enrichWorkspaces([workspace], token);
  return enrichedWorkspaces[0] || workspace;
};

const listWorkspaces = async (userId, role, token) => {
  if (["super_admin", "admin", "program_controller"].includes(role)) {
    return Workspace.find({ deletedAt: null }).sort({ createdAt: -1 });
  }

  if (role === "teacher") {
    let assignments = [];
    try {
      const enrollmentServiceUrl =
        process.env.ENROLLMENT_SERVICE_URL || "http://localhost:8003";
      const base = enrollmentServiceUrl.replace(/\/$/, "");
      const url = `${base}/batch-course-instructors/instructor/${userId}/courses`;

      const res = await fetchWithFallback(
        url,
        { headers: { Authorization: token } },
        "enrollment",
        "enrollment"
      );
      if (res.ok) {
        const data = await res.json();
        assignments = extractApiArray(data);
      }
    } catch (e) {
      throw e;
    }

    if (assignments.length === 0) {
      console.log("[Classroom] No assignments found for teacher via API.");
    }

    const pairs = assignments.map((a) => ({
      courseId: a.courseId,
      batchId: a.batchId,
    }));
    if (pairs.length === 0) return [];

    const workspaces = await Workspace.find({
      $or: pairs,
      status: { $ne: "archived" },
      deletedAt: null,
    }).sort({ createdAt: -1 });

    return await enrichWorkspaces(workspaces, token);
  } else if (role === "student") {
    let enrollments = [];
    try {
      const enrollmentServiceUrl = process.env.ENROLLMENT_SERVICE_URL || "http://localhost:8003";
      const base = enrollmentServiceUrl.replace(/\/$/, "");
      const url = `${base}/enrollments`;

      const res = await fetchWithFallback(
        url,
        { headers: { Authorization: token } },
        "enrollment",
        "enrollment"
      );
      if (res.ok) {
        const data = await res.json();
        enrollments = extractApiArray(data);
      }
    } catch (e) {
      const localEnrollments = await CourseEnrollment.find({
        studentId: userId,
        status: "active",
        deletedAt: null,
      });
      enrollments = localEnrollments.map(e => ({
        courseId: e.courseId,
        batchId: e.batchId,
      }));
    }

    const batchIds = [...new Set(enrollments.map(e => e.batchId).filter(Boolean))];

    if (batchIds.length === 0) return [];

    const workspaces = await Workspace.find({
      batchId: { $in: batchIds },
      deletedAt: null,
    }).sort({ createdAt: -1 });

    return await enrichWorkspaces(workspaces, token);
  }
  return [];
};

const enrichWorkspaces = async (workspaces, token) => {
  const academicUrl = process.env.ACADEMIC_SERVICE_URL || "http://localhost:8001";
  const base = academicUrl.replace(/\/$/, "");

  const enriched = await Promise.all(
    workspaces.map(async (ws) => {
      const workspaceObj = ws.toObject();
      let course = null;
      let batch = null;

      try {
        const res = await fetchWithFallback(
          `${base}/courses/${ws.courseId}`,
          { headers: { Authorization: token } },
          "academic",
          "academic"
        );
        const data = await res.json();
        if (data.success) course = data.data;
      } catch (e) {
        console.error(
          `[Classroom] Failed to fetch course ${ws.courseId}`,
          e.message
        );
      }

      try {
        const res = await fetchWithFallback(
          `${base}/batches/${ws.batchId}`,
          { headers: { Authorization: token } },
          "academic",
          "academic"
        );
        const data = await res.json();
        if (data.success) batch = data.data;
      } catch (e) {
        console.error(
          `[Classroom] Failed to fetch batch ${ws.batchId}`,
          e.message
        );
      }

      if (course) {
        workspaceObj.courseName = course.name;
        workspaceObj.courseCode = course.code;
        workspaceObj.semester = course.semester || null;
      }

      if (batch) {
        workspaceObj.batchName = batch.name;
        workspaceObj.programId = batch.programId;
      }

      try {
        const userServiceUrl = process.env.USER_SERVICE_URL || "http://localhost:8007";
        const baseUser = userServiceUrl.replace(/\/$/, "");
        const defaultUserBase = "http://user:8007";
        const userUrl = `${baseUser}/students?batchId=${ws.batchId}&limit=1`;

        let res = await fetchWithFallback(
          userUrl,
          { headers: { Authorization: token } },
          "user",
          "user"
        );

        if (!res.ok && baseUser !== defaultUserBase) {
          const fallbackUrl = `${defaultUserBase}/students?batchId=${ws.batchId}&limit=1`;
          res = await fetchWithFallback(
            fallbackUrl,
            { headers: { Authorization: token } },
            "user",
            "user"
          );
        }

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data && data.data.pagination) {
            workspaceObj.totalBatchStudents = data.data.pagination.total;
          } else if (data.data && data.data.total) {
            workspaceObj.totalBatchStudents = data.data.total;
          } else {
            workspaceObj.totalBatchStudents = 0;
          }
        }
      } catch (e) {
        workspaceObj.totalBatchStudents = 0;
      }

      if (ws.teacherIds && ws.teacherIds.length > 0) {
        const userServiceUrl = process.env.USER_SERVICE_URL || "http://localhost:8007";
        const baseUser = userServiceUrl.replace(/\/$/, "");

        workspaceObj.teachers = await Promise.all(
          ws.teacherIds.map(async (teacherId) => {
            try {
              const teacherUrl = `${baseUser}/teachers/${teacherId}`;
              const res = await fetchWithFallback(
                teacherUrl,
                { headers: { Authorization: token } },
                "user",
                "user"
              );
              if (res.ok) {
                const data = await res.json();
                if (data.success && data.data) {
                  return {
                    id: teacherId,
                    fullName: data.data.fullName || data.data.name || "Unknown Teacher",
                    email: data.data.email || "",
                    registrationNumber: data.data.registrationNumber || "",
                  };
                }
              }
            } catch (e) {
              console.error(`[Classroom] Failed to fetch teacher ${teacherId}`, e.message);
            }
            return { id: teacherId, fullName: "Unknown Teacher" };
          })
        );
      } else {
        workspaceObj.teachers = [];
      }

      workspaceObj.studentCount = ws.studentIds ? ws.studentIds.length : 0;
      workspaceObj.id = ws._id;

      return workspaceObj;
    })
  );

  return enriched;
};

const fetchWithFallback = async (url, options, serviceName, fallbackHost) => {
  try {
    console.log(`[Classroom] Fetching from: ${url}`);
    const res = await fetch(url, options);
    return res;
  } catch (e) {
    if (url.includes("localhost") && fallbackHost) {
      const newUrl = url.replace("localhost", fallbackHost);
      try {
        const resRelay = await fetch(newUrl, options);
        return resRelay;
      } catch (e2) {
        throw e;
      }
    }
    throw e;
  }
};

const listPendingWorkspaces = async (userId, role, token) => {
  if (role !== "teacher") return [];

  let assignments = [];
  try {
    const enrollmentServiceUrl =
      process.env.ENROLLMENT_SERVICE_URL || "http://localhost:8003";
    const base = enrollmentServiceUrl.replace(/\/$/, "");
    const url = `${base}/batch-course-instructors/instructor/${userId}/courses`;

    const res = await fetchWithFallback(
      url,
      { headers: { Authorization: token } },
      "enrollment",
      "enrollment"
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Enrollment Service returned ${res.status}`);
    }

    const rawData = await res.json();
    assignments = extractApiArray(rawData);
  } catch (e) {
    return [];
  }

  if (assignments.length === 0) {
    return [];
  }

  const pairs = assignments.map((a) => ({
    courseId: a.courseId,
    batchId: a.batchId,
  }));
  const existingWorkspaces = await Workspace.find({
    $or: pairs,
  });

  const activeOrArchivedWorkspaces = existingWorkspaces.filter(
    (w) => !w.deletedAt
  );
  const pendingAssignments = assignments.filter(
    (a) =>
      !activeOrArchivedWorkspaces.some(
        (w) => w.courseId === a.courseId && w.batchId === a.batchId
      )
  );

  const enriched = await Promise.all(
    pendingAssignments.map(async (a) => {
      let course = await Course.findById(a.courseId);
      let batch = await Batch.findById(a.batchId);

      const academicUrl = process.env.ACADEMIC_SERVICE_URL || "http://localhost:8001";
      const base = academicUrl.replace(/\/$/, "");

      if (!course) {
        try {
          const res = await fetchWithFallback(
            `${base}/courses/${a.courseId}`,
            { headers: { Authorization: token } },
            "academic",
            "academic"
          );
          const data = await res.json();
          if (data.success) course = data.data;
        } catch (e) {
          console.error(
            `[Classroom] Failed to fetch course ${a.courseId}`,
            e.message
          );
        }
      }

      if (!batch) {
        try {
          const res = await fetchWithFallback(
            `${base}/batches/${a.batchId}`,
            { headers: { Authorization: token } },
            "academic",
            "academic"
          );
          const data = await res.json();
          if (data.success) batch = data.data;
        } catch (e) {
          console.error(
            `[Classroom] Failed to fetch batch ${a.batchId}`,
            e.message
          );
        }
      }

      if (!course || !batch) {
        return null;
      }

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
  );

  return enriched.filter((e) => e !== null);
};

const updateWorkspace = async (workspaceId, updates, userId, role, token) => {
  const workspace = await getWorkspaceById(workspaceId, userId, role, token);
  Object.assign(workspace, updates);
  await workspace.save();
  return workspace;
};

const deleteWorkspace = async (workspaceId, userId, role, token) => {
  const workspace = await getWorkspaceById(workspaceId, userId, role, token);
  workspace.deletedAt = new Date();
  await workspace.save();
  return true;
};

const archiveWorkspace = async (workspaceId, userId, role, token) => {
  const workspace = await getWorkspaceById(workspaceId, userId, role, token);
  if (role === "teacher" && !workspace.teacherIds.includes(userId)) {
    throw new Error("Unauthorized to archive this workspace");
  }

  workspace.status = "archived";
  await workspace.save();
  return workspace;
};

export default {
  getWorkspace,
  getWorkspaceById,
  listWorkspaces,
  updateWorkspace,
  deleteWorkspace,
  listPendingWorkspaces,
  archiveWorkspace,
};
