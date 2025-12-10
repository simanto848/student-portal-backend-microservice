import Workspace from "../models/Workspace.js";
import {
  BatchCourseInstructor,
  CourseEnrollment,
} from "../models/external/Enrollment.js";
import { Course, Batch } from "../models/external/Academic.js";

const getWorkspace = async (courseId, batchId, userId, role, token) => {
  const checkTeacherAssignment = async () => {
    try {
      const enrollmentServiceUrl =
        process.env.ENROLLMENT_SERVICE_URL || "http://localhost:8003";
      const base = enrollmentServiceUrl.replace(/\/$/, "");
      // const url = `${base}/batch-course-instructors?instructorId=${userId}&courseId=${courseId}&batchId=${batchId}&status=active`;
      const url = `${base}/batch-course-instructors?instructorId=${userId}&courseId=${courseId}&batchId=${batchId}&status=active`;

      const res = await fetchWithFallback(
        url,
        { headers: { Authorization: token } },
        "enrollment",
        "enrollment"
      );
      if (!res.ok) {
        console.error(
          `[Classroom] checkTeacherAssignment failed: ${res.status}`
        );
        return false;
      }

      const data = await res.json();
      console.log(
        `[Classroom] checkTeacherAssignment response:`,
        JSON.stringify(data)
      );

      // Handle different response formats (wrapped data or direct array)
      let items = [];
      if (data.success && Array.isArray(data.data)) {
        items = data.data;
      } else if (Array.isArray(data)) {
        // response is the array
        items = data;
      } else if (data.data && Array.isArray(data.data)) {
        // potential double struct
        items = data.data;
      }

      if (items.length > 0) return true;
      return false;
    } catch (e) {
      console.error(
        "[Classroom] Failed to check teacher assignment via API",
        e.message
      );
      return false;
    }
  };

  // 1. Authorization Check (Common for Access and Creation)
  if (role === "teacher") {
    const isAssigned = await checkTeacherAssignment();
    if (!isAssigned) {
      // Fallback to local DB check
      const localAssigned = await BatchCourseInstructor.findOne({
        batchId,
        courseId,
        instructorId: userId,
        status: "active",
        deletedAt: null,
      });
      if (!localAssigned)
        throw new Error("You are not assigned to this course batch.");
    }
  } else if (role === "student") {
    // TODO: Implement API check for students
    const isEnrolled = await CourseEnrollment.findOne({
      batchId,
      courseId,
      studentId: userId,
      status: "active",
      deletedAt: null,
    });
    if (!isEnrolled)
      throw new Error("You are not enrolled in this course batch.");
  }

  let workspace = await Workspace.findOne({ courseId, batchId });
  if (workspace) return workspace;

  // 3. New Workspace Creation Logic
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
  return workspace;
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
        if (data.success && Array.isArray(data.data)) {
          assignments = data.data;
        }
      }
    } catch (e) {
      console.error(
        "[Classroom] Failed to fetch assignments for listWorkspaces",
        e.message
      );
    }

    if (assignments.length === 0) {
      // Optional: Try local DB as backup?
      assignments = await BatchCourseInstructor.find({
        instructorId: userId,
        status: "active",
        deletedAt: null,
      });
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
    const enrollments = await CourseEnrollment.find({
      studentId: userId,
      status: "active",
      deletedAt: null,
    });

    const pairs = enrollments.map((e) => ({
      courseId: e.courseId,
      batchId: e.batchId,
    }));
    if (pairs.length === 0) return [];

    const workspaces = await Workspace.find({
      $or: pairs,
      deletedAt: null,
    }).sort({ createdAt: -1 });

    return await enrichWorkspaces(workspaces, token);
  }
  return [];
};

// Helper function to enrich workspaces with Course and Batch details
const enrichWorkspaces = async (workspaces, token) => {
  const academicUrl =
    process.env.ACADEMIC_SERVICE_URL || "http://localhost:8001";
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

      // Fetch Total Batch Students from User Service (with fallback host)
      try {
        console.log(
          `[Classroom] USER_SERVICE_URL env is: '${process.env.USER_SERVICE_URL}'`
        );
        const userServiceUrl =
          process.env.USER_SERVICE_URL || "http://localhost:8007";
        const baseUser = userServiceUrl.replace(/\/$/, "");
        const defaultUserBase = "http://user:8007";
        // Use simple query param because user service does not parse nested filters[]
        const userUrl = `${baseUser}/students?batchId=${ws.batchId}&limit=1`;

        let res = await fetchWithFallback(
          userUrl,
          { headers: { Authorization: token } },
          "user",
          "user"
        );

        // If the configured host is wrong (e.g., points to classroom), retry once with the known user service default
        if (!res.ok && baseUser !== defaultUserBase) {
          const fallbackUrl = `${defaultUserBase}/students?batchId=${ws.batchId}&limit=1`;
          console.warn(
            `[Classroom] Retrying total students fetch via default user service host: ${fallbackUrl}`
          );
          res = await fetchWithFallback(
            fallbackUrl,
            { headers: { Authorization: token } },
            "user",
            "user"
          );
        }

        if (res.ok) {
          const data = await res.json();
          // Check structure based on StudentController/Service
          if (data.success && data.data && data.data.pagination) {
            workspaceObj.totalBatchStudents = data.data.pagination.total;
          } else if (data.data && data.data.total) {
            // Fallback if structure differs
            workspaceObj.totalBatchStudents = data.data.total;
          } else {
            workspaceObj.totalBatchStudents = 0;
          }
        }
      } catch (e) {
        console.error(
          `[Classroom] Failed to fetch total students for batch ${ws.batchId}`,
          e.message
        );
        workspaceObj.totalBatchStudents = 0; // Default or null
      }

      // Student count (enrolled in workspace)
      workspaceObj.studentCount = ws.studentIds ? ws.studentIds.length : 0;
      workspaceObj.id = ws._id; // Ensure ID is present

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
      console.warn(
        `[Classroom] Failed to fetch from localhost. Retrying with ${fallbackHost}...`
      );
      const newUrl = url.replace("localhost", fallbackHost);
      try {
        const resRelay = await fetch(newUrl, options);
        return resRelay;
      } catch (e2) {
        throw e; // Throw original error or new one? Throw original is better usually, or e2.
      }
    }
    throw e;
  }
};

const listPendingWorkspaces = async (userId, role, token) => {
  if (role !== "teacher") return [];

  console.log(`[Classroom] listPendingWorkspaces called for user: ${userId}`);

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

    console.log(`[Classroom] Assignments API Status: ${res.status}`);

    if (!res.ok) {
      const text = await res.text();
      console.error(`[Classroom] Assignments API Error Body: ${text}`);
      throw new Error(`Enrollment Service returned ${res.status}`);
    }

    const rawData = await res.json();
    // console.log(`[Classroom] Assignments API Data: ${JSON.stringify(rawData).substring(0, 200)}...`);

    if (rawData.success && Array.isArray(rawData.data)) {
      assignments = rawData.data;
    } else if (Array.isArray(rawData)) {
      assignments = rawData;
    } else if (rawData.data && Array.isArray(rawData.data)) {
      // Handle double nesting if any
      assignments = rawData.data;
    }

    console.log(`[Classroom] Parsed ${assignments.length} assignments`);
  } catch (e) {
    console.error("[Classroom] Failed to fetch assignments via API", e.message);
    return [];
  }

  if (assignments.length === 0) {
    console.log("[Classroom] No assignments found via API. Returning empty.");
    return [];
  }

  const pairs = assignments.map((a) => ({
    courseId: a.courseId,
    batchId: a.batchId,
  }));
  const existingWorkspaces = await Workspace.find({
    $or: pairs,
  });
  console.log(
    `[Classroom] Found ${existingWorkspaces.length} existing workspaces (active + archived + deleted)`
  );

  // Filter out only ACTIVE or ARCHIVED workspaces (ignore deleted? No, logic says "Create Classroom" if NOT exists)
  // If a workspace exists (active/archived), we shouldn't show it in "Pending".
  // Check Workspace schema: `deletedAt` means soft deleted.
  // If soft deleted, can we recreate? Probably yes.
  // So we should filter out workspaces that are NOT deleted.

  const activeOrArchivedWorkspaces = existingWorkspaces.filter(
    (w) => !w.deletedAt
  );
  const pendingAssignments = assignments.filter(
    (a) =>
      !activeOrArchivedWorkspaces.some(
        (w) => w.courseId === a.courseId && w.batchId === a.batchId
      )
  );

  console.log(
    `[Classroom] ${pendingAssignments.length} assignments are truly pending`
  );

  const enriched = await Promise.all(
    pendingAssignments.map(async (a) => {
      let course = await Course.findById(a.courseId);
      let batch = await Batch.findById(a.batchId);

      const academicUrl =
        process.env.ACADEMIC_SERVICE_URL || "http://localhost:8001";
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
        console.error(
          `[Classroom] Missing course/batch for ${a.courseId}/${a.batchId}`
        );
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
