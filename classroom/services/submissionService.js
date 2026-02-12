import Submission from '../models/Submission.js';
import Assignment from '../models/Assignment.js';
import Feedback from '../models/Feedback.js';
import StreamItem from '../models/StreamItem.js';
import WorkspaceService from './workspaceService.js';
import Workspace from '../models/Workspace.js';
import { emitWorkspace, emitUser } from '../utils/events.js';
import {
  mapFilesToAttachments,
  addDownloadUrls,
  deleteAttachmentFiles,
  resolveStoredPath
} from '../utils/attachmentHelper.js';
import { fetchWithFallback } from '../utils/httpClient.js';
import { config } from 'shared';

// ── Core submission logic ──

const _submitCore = async (assignmentId, files, textAnswer, userId, token) => {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new Error('Assignment not found');
  if (assignment.status !== 'published') throw new Error('Assignment is not accepting submissions');

  await WorkspaceService.getWorkspaceById(assignment.workspaceId, userId, 'student', token);

  const now = new Date();
  if (assignment.dueAt && now > assignment.dueAt && !assignment.allowLate) {
    throw new Error('Late submissions are not allowed');
  }

  let submission = await Submission.findOne({ assignmentId, studentId: userId });

  if (!submission) {
    submission = await Submission.create({
      assignmentId,
      workspaceId: assignment.workspaceId,
      studentId: userId,
      files,
      textAnswer,
      status: 'submitted',
      submittedAt: now,
      late: assignment.dueAt && now > assignment.dueAt,
    });

    await StreamItem.create({
      workspaceId: assignment.workspaceId,
      type: 'grade_event',
      refId: submission.id,
      actorId: userId,
    });
  } else {
    if (submission.status === 'graded') throw new Error('Cannot modify graded submission');

    // Delete old files if replacing
    if (files.length > 0) {
      await deleteAttachmentFiles(submission.files);
    }

    submission.files = files.length > 0 ? files : submission.files;
    submission.textAnswer = textAnswer;
    submission.status = submission.status === 'submitted' ? 'resubmitted' : 'submitted';
    submission.submittedAt = now;
    submission.late = assignment.dueAt && now > assignment.dueAt;
    await submission.save();
  }

  emitWorkspace(assignment.workspaceId, 'submission.updated', submission);
  return submission;
};

const submitAssignment = async (assignmentId, data, userId, token) => {
  return _submitCore(assignmentId, data.files || [], data.textAnswer, userId, token);
};

const submitAssignmentWithFiles = async (assignmentId, data, userId, token) => {
  const mappedFiles = mapFilesToAttachments(data?.files, 'submissions');
  const submission = await _submitCore(assignmentId, mappedFiles, data.textAnswer, userId, token);

  // Add download URLs
  submission.files = addDownloadUrls(submission.files, `/submissions/item/${submission.id}/files`);
  await submission.save();

  return submission;
};

// ── List / Read operations ──

const listSubmissions = async (assignmentId, userId, role, token) => {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new Error('Assignment not found');

  await WorkspaceService.getWorkspaceById(assignment.workspaceId, userId, 'teacher', token);

  const workspace = await Workspace.findById(assignment.workspaceId);
  const submissions = await Submission.find({ assignmentId }).lean();
  const submissionMap = new Map(submissions.map((s) => {
    s.id = s._id.toString();
    return [s.studentId, s];
  }));

  let allStudentIds = [...(workspace?.studentIds || [])];
  const studentDetailsMap = new Map();

  // Batch-fetch all students in one call if workspace list is empty
  if (allStudentIds.length === 0 && workspace.batchId && config.services.user) {
    try {
      const userBase = config.services.user.replace(/\/$/, '');
      const res = await fetchWithFallback(
        `${userBase}/students?batchId=${workspace.batchId}&limit=1000`,
        { headers: { Authorization: token } },
        'user'
      );
      if (res.ok) {
        const data = await res.json();
        const students = data?.data?.students || (Array.isArray(data?.data) ? data.data : []);
        if (Array.isArray(students)) {
          students.forEach((s) => {
            const sId = s.id || s._id;
            allStudentIds.push(sId);
            studentDetailsMap.set(sId, s);
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch batch students', e.message);
    }
  }

  allStudentIds = [...new Set([...allStudentIds, ...submissionMap.keys()])];

  // Batch-fetch student details for any not already fetched
  const missingStudentIds = allStudentIds.filter(id => !studentDetailsMap.has(id));
  if (missingStudentIds.length > 0 && config.services.user) {
    const userBase = config.services.user.replace(/\/$/, '');
    await Promise.all(missingStudentIds.map(async (sid) => {
      try {
        const res = await fetchWithFallback(
          `${userBase}/students/${sid}`,
          { headers: { Authorization: token } },
          'user'
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) studentDetailsMap.set(sid, data.data);
        }
      } catch (e) { /* skip */ }
    }));
  }

  const populatedSubmissions = allStudentIds.map((studentId) => {
    let submission = submissionMap.get(studentId);

    if (!submission) {
      submission = {
        _id: `missing:${assignmentId}:${studentId}`,
        id: `missing:${assignmentId}:${studentId}`,
        assignmentId,
        studentId,
        status: 'missing',
        files: [],
        submittedAt: null,
        grade: null,
        late: false,
      };
    }

    submission.files = addDownloadUrls(submission.files, `/submissions/item/${submission.id}/files`);

    if (studentDetailsMap.has(studentId)) {
      submission.studentId = studentDetailsMap.get(studentId);
    }

    return submission;
  });

  return populatedSubmissions.sort((a, b) => {
    if (a.status === 'missing' && b.status !== 'missing') return 1;
    if (a.status !== 'missing' && b.status === 'missing') return -1;
    if (a.submittedAt && b.submittedAt) return new Date(b.submittedAt) - new Date(a.submittedAt);
    return 0;
  });
};

const getSubmission = async (submissionId, userId, role, token) => {
  const submission = await Submission.findById(submissionId);
  if (!submission) throw new Error('Submission not found');

  const assignment = await Assignment.findById(submission.assignmentId);
  if (role === 'student' && submission.studentId !== userId) throw new Error('Not your submission');

  await WorkspaceService.getWorkspaceById(assignment.workspaceId, userId, role, token);

  submission.files = addDownloadUrls(submission.files, `/submissions/item/${submission.id}/files`);
  return submission;
};

const getMySubmission = async (assignmentId, userId, token) => {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new Error('Assignment not found');

  await WorkspaceService.getWorkspaceById(assignment.workspaceId, userId, 'student', token);

  const submission = await Submission.findOne({ assignmentId, studentId: userId });
  if (!submission) return null;

  submission.files = addDownloadUrls(submission.files, `/submissions/item/${submission.id}/files`);
  return submission;
};

const getSubmissionFileForDownload = async (submissionId, fileId, userId, role, token) => {
  const submission = await Submission.findById(submissionId);
  if (!submission) throw new Error('Submission not found');

  const assignment = await Assignment.findById(submission.assignmentId);
  if (!assignment) throw new Error('Assignment not found');
  if (role === 'student' && submission.studentId !== userId) throw new Error('Not your submission');

  await WorkspaceService.getWorkspaceById(assignment.workspaceId, userId, role, token);

  const files = Array.isArray(submission.files) ? submission.files : [];
  const file = files.find((f) => f && f.id === fileId);
  if (!file) throw new Error('File not found');
  if (!file.path) throw new Error('File has no path');

  return {
    absolutePath: resolveStoredPath(file.path),
    downloadName: file.name || 'download',
  };
};

// ── Grading & Feedback ──

const gradeSubmission = async (submissionId, data, userId, token) => {
  let submission;

  if (submissionId.startsWith('missing:')) {
    const parts = submissionId.split(':');
    if (parts.length !== 3) throw new Error('Invalid missing submission ID');

    const [, assignmentId, studentId] = parts;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw new Error('Assignment not found');

    submission = await Submission.create({
      assignmentId,
      workspaceId: assignment.workspaceId,
      studentId,
      status: 'graded',
      grade: data.grade,
      rubricScores: data.rubricScores || [],
      gradedAt: new Date(),
      gradedById: userId,
      files: [],
      textAnswer: '',
    });

    await StreamItem.create({
      workspaceId: assignment.workspaceId,
      type: 'grade_event',
      refId: submission.id,
      actorId: userId,
    });

    emitWorkspace(assignment.workspaceId, 'submission.graded', submission);
    emitUser(submission.studentId, 'submission.graded', submission);
    return submission;
  }

  submission = await Submission.findById(submissionId);
  if (!submission) throw new Error('Submission not found');

  const assignment = await Assignment.findById(submission.assignmentId);
  await WorkspaceService.getWorkspaceById(assignment.workspaceId, userId, 'teacher', token);

  if (data.grade > assignment.maxScore) throw new Error('Grade exceeds maxScore');

  submission.grade = data.grade;
  submission.rubricScores = data.rubricScores || [];
  submission.status = 'graded';
  submission.gradedAt = new Date();
  submission.gradedById = userId;
  await submission.save();

  await StreamItem.create({
    workspaceId: assignment.workspaceId,
    type: 'grade_event',
    refId: submission.id,
    actorId: userId,
  });

  emitWorkspace(assignment.workspaceId, 'submission.graded', submission);
  emitUser(submission.studentId, 'submission.graded', submission);
  return submission;
};

const addFeedback = async (submissionId, data, userId, role, token) => {
  const submission = await Submission.findById(submissionId);
  if (!submission) throw new Error('Submission not found');

  const assignment = await Assignment.findById(submission.assignmentId);
  if (role === 'student' && submission.studentId !== userId) throw new Error('Not your submission');

  await WorkspaceService.getWorkspaceById(assignment.workspaceId, userId, role, token);

  const feedback = await Feedback.create({
    submissionId,
    authorId: userId,
    message: data.message,
    type: data.type || 'comment',
  });

  submission.feedbackCount += 1;
  await submission.save();

  await StreamItem.create({
    workspaceId: assignment.workspaceId,
    type: 'feedback',
    refId: feedback.id,
    actorId: userId,
  });

  emitWorkspace(assignment.workspaceId, 'submission.feedback', feedback);
  emitUser(submission.studentId, 'submission.feedback', feedback);
  return feedback;
};

const removeFileFromSubmission = async (submissionId, fileId, userId, role, token) => {
  const submission = await Submission.findById(submissionId);
  if (!submission) throw new Error('Submission not found');

  const assignment = await Assignment.findById(submission.assignmentId);
  if (!assignment) throw new Error('Assignment not found');
  if (role === 'student' && submission.studentId !== userId) throw new Error('Not your submission');

  await WorkspaceService.getWorkspaceById(assignment.workspaceId, userId, role, token);

  if (submission.status === 'graded') throw new Error('Cannot modify graded submission');

  const fileIndex = submission.files.findIndex((f) => f.id === fileId);
  if (fileIndex === -1) throw new Error('File not found in submission');

  const file = submission.files[fileIndex];
  await deleteAttachmentFiles([file]);

  submission.files.splice(fileIndex, 1);
  submission.updatedAt = new Date();
  await submission.save();

  submission.files = addDownloadUrls(submission.files, `/submissions/item/${submission.id}/files`);
  return submission;
};

export default {
  submitAssignment,
  submitAssignmentWithFiles,
  listSubmissions,
  getSubmission,
  getMySubmission,
  getSubmissionFileForDownload,
  gradeSubmission,
  addFeedback,
  removeFileFromSubmission,
};
