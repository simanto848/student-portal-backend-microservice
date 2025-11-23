import Submission from '../models/Submission.js';
import Assignment from '../models/Assignment.js';
import Feedback from '../models/Feedback.js';
import StreamItem from '../models/StreamItem.js';
import WorkspaceService from './workspaceService.js';
import { emitWorkspace, emitUser } from '../utils/events.js';

const submitAssignment = async (assignmentId, data, userId) => {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw new Error('Assignment not found');

    if (assignment.status !== 'published') {
        throw new Error('Assignment is not accepting submissions');
    }

    await WorkspaceService.getWorkspaceById(assignment.workspaceId, userId, 'student');

    let submission = await Submission.findOne({ assignmentId, studentId: userId });
    const now = new Date();
    const late = assignment.dueAt && now > assignment.dueAt && !assignment.allowLate;

    if (late && !assignment.allowLate) {
        throw new Error('Late submissions are not allowed');
    }

    if (!submission) {
        submission = await Submission.create({
            assignmentId,
            workspaceId: assignment.workspaceId,
            studentId: userId,
            files: data.files,
            textAnswer: data.textAnswer,
            status: 'submitted',
            submittedAt: now,
            late: assignment.dueAt && now > assignment.dueAt
        });

        await StreamItem.create({
            workspaceId: assignment.workspaceId,
            type: 'grade_event',
            refId: submission.id,
            actorId: userId
        });
    } else {
        if (submission.status === 'graded') {
            throw new Error('Cannot modify graded submission');
        }
        submission.files = data.files;
        submission.textAnswer = data.textAnswer;
        submission.status = submission.status === 'submitted' ? 'resubmitted' : 'submitted';
        submission.submittedAt = now;
        submission.late = assignment.dueAt && now > assignment.dueAt;
        await submission.save();
    }

    emitWorkspace(assignment.workspaceId, 'submission.updated', submission);
    return submission;
};

const listSubmissions = async (assignmentId, userId, role) => {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw new Error('Assignment not found');

    await WorkspaceService.getWorkspaceById(assignment.workspaceId, userId, 'teacher');

    return Submission.find({ assignmentId }).sort({ submittedAt: -1 });
};

const getSubmission = async (submissionId, userId, role) => {
    const submission = await Submission.findById(submissionId);
    if (!submission) throw new Error('Submission not found');

    const assignment = await Assignment.findById(submission.assignmentId);
    if (role === 'student' && submission.studentId !== userId) {
        throw new Error('Not your submission');
    }
    
    await WorkspaceService.getWorkspaceById(assignment.workspaceId, userId, role);
    return submission;
};

const gradeSubmission = async (submissionId, data, userId) => {
    const submission = await Submission.findById(submissionId);
    if (!submission) throw new Error('Submission not found');

    const assignment = await Assignment.findById(submission.assignmentId);
    await WorkspaceService.getWorkspaceById(assignment.workspaceId, userId, 'teacher');

    if (data.grade > assignment.maxScore) {
        throw new Error('Grade exceeds maxScore');
    }

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
        actorId: userId
    });

    emitWorkspace(assignment.workspaceId, 'submission.graded', submission);
    emitUser(submission.studentId, 'submission.graded', submission);

    return submission;
};

const addFeedback = async (submissionId, data, userId, role) => {
    const submission = await Submission.findById(submissionId);
    if (!submission) throw new Error('Submission not found');

    const assignment = await Assignment.findById(submission.assignmentId);
    if (role === 'student' && submission.studentId !== userId) {
        throw new Error('Not your submission');
    }
    await WorkspaceService.getWorkspaceById(assignment.workspaceId, userId, role);

    const feedback = await Feedback.create({
        submissionId,
        authorId: userId,
        message: data.message,
        type: data.type || 'comment'
    });

    submission.feedbackCount += 1;
    await submission.save();

    await StreamItem.create({
        workspaceId: assignment.workspaceId,
        type: 'feedback',
        refId: feedback.id,
        actorId: userId
    });

    emitWorkspace(assignment.workspaceId, 'submission.feedback', feedback);
    emitUser(submission.studentId, 'submission.feedback', feedback);

    return feedback;
};

export default {
    submitAssignment,
    listSubmissions,
    getSubmission,
    gradeSubmission,
    addFeedback
};
