import AssessmentSubmission from '../../models/AssessmentSubmission.js';
import Assessment from '../../models/Assessment.js';
import CourseEnrollment from '../../models/CourseEnrollment.js';
import { ApiError } from '../../utils/ApiResponser.js';

class AssessmentSubmissionService {
    // Submit assessment
    async submitAssessment(data, studentId) {
        try {
            // Get assessment
            const assessment = await Assessment.findById(data.assessmentId);
            if (!assessment) {
                throw new ApiError(404, 'Assessment not found');
            }

            // Check if assessment is published
            if (assessment.status !== 'published') {
                throw new ApiError(400, 'This assessment is not available for submission');
            }

            // Verify enrollment
            const enrollment = await CourseEnrollment.findById(data.enrollmentId);
            if (!enrollment) {
                throw new ApiError(404, 'Enrollment not found');
            }

            // Verify student is enrolled in the course
            if (enrollment.studentId !== studentId) {
                throw new ApiError(403, 'You are not enrolled in this course');
            }

            if (enrollment.courseId !== assessment.courseId) {
                throw new ApiError(400, 'Enrollment and assessment course mismatch');
            }

            // Check if already submitted
            const existingSubmission = await AssessmentSubmission.findOne({
                assessmentId: data.assessmentId,
                studentId,
                deletedAt: null,
            });

            if (existingSubmission) {
                throw new ApiError(409, 'You have already submitted this assessment');
            }

            // Determine if submission is late
            let status = 'submitted';
            if (assessment.dueDate && new Date() > new Date(assessment.dueDate)) {
                status = 'late';
            }

            const submission = await AssessmentSubmission.create({
                assessmentId: data.assessmentId,
                studentId,
                enrollmentId: data.enrollmentId,
                content: data.content,
                attachments: data.attachments,
                status,
            });

            return submission;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, error.message || 'Failed to submit assessment');
        }
    }

    // Get submission by ID
    async getSubmissionById(id) {
        const submission = await AssessmentSubmission.findById(id)
            .populate('assessmentId');
        if (!submission) {
            throw new ApiError(404, 'Submission not found');
        }
        return submission;
    }

    // List submissions with filters
    async listSubmissions(filters = {}) {
        const query = {};
        
        if (filters.assessmentId) query.assessmentId = filters.assessmentId;
        if (filters.studentId) query.studentId = filters.studentId;
        if (filters.status) query.status = filters.status;

        const submissions = await AssessmentSubmission.find(query)
            .populate('assessmentId')
            .sort({ submissionDate: -1 });
        
        return submissions;
    }

    // Update submission (before grading)
    async updateSubmission(id, data, studentId) {
        const submission = await this.getSubmissionById(id);

        // Verify student owns this submission
        if (submission.studentId !== studentId) {
            throw new ApiError(403, 'You do not have permission to update this submission');
        }

        // Check if already graded
        if (submission.status === 'graded') {
            throw new ApiError(400, 'Cannot update a graded submission');
        }

        // Get assessment to check if still accepting submissions
        const assessment = await Assessment.findById(submission.assessmentId);
        if (assessment.status !== 'published') {
            throw new ApiError(400, 'Assessment is no longer accepting submissions');
        }

        Object.assign(submission, data);
        await submission.save();
        return submission;
    }

    // Grade submission (instructor only)
    async gradeSubmission(id, data, instructorId) {
        const submission = await this.getSubmissionById(id);

        // Get assessment to verify instructor
        const assessment = await Assessment.findById(submission.assessmentId);
        if (assessment.instructorId !== instructorId) {
            throw new ApiError(403, 'You are not authorized to grade this submission');
        }

        // Validate marks
        if (data.marksObtained > assessment.totalMarks) {
            throw new ApiError(400, 'Marks obtained cannot exceed total marks');
        }

        submission.marksObtained = data.marksObtained;
        submission.feedback = data.feedback;
        submission.gradedBy = instructorId;
        submission.gradedAt = new Date();
        submission.status = 'graded';

        await submission.save();
        return submission;
    }

    // Delete submission (soft delete)
    async deleteSubmission(id, studentId) {
        const submission = await this.getSubmissionById(id);

        // Verify student owns this submission
        if (submission.studentId !== studentId) {
            throw new ApiError(403, 'You do not have permission to delete this submission');
        }

        // Check if already graded
        if (submission.status === 'graded') {
            throw new ApiError(400, 'Cannot delete a graded submission');
        }

        await submission.softDelete();
        return submission;
    }

    // Get student's submission for an assessment
    async getStudentSubmission(studentId, assessmentId) {
        const submission = await AssessmentSubmission.findOne({
            studentId,
            assessmentId,
        }).populate('assessmentId');

        return submission;
    }

    // Get all submissions for an assessment (instructor)
    async getAssessmentSubmissions(assessmentId, instructorId) {
        // Verify instructor owns this assessment
        const assessment = await Assessment.findById(assessmentId);
        if (!assessment) {
            throw new ApiError(404, 'Assessment not found');
        }

        if (assessment.instructorId !== instructorId) {
            throw new ApiError(403, 'You are not authorized to view these submissions');
        }

        const submissions = await AssessmentSubmission.find({ assessmentId })
            .sort({ submissionDate: -1 });

        return submissions;
    }

    // Get submission statistics for an assessment
    async getAssessmentSubmissionStats(assessmentId, instructorId) {
        // Verify instructor
        const assessment = await Assessment.findById(assessmentId);
        if (!assessment) {
            throw new ApiError(404, 'Assessment not found');
        }

        if (assessment.instructorId !== instructorId) {
            throw new ApiError(403, 'You are not authorized to view these statistics');
        }

        const submissions = await AssessmentSubmission.find({ assessmentId });

        const stats = {
            total: submissions.length,
            submitted: submissions.filter(s => s.status === 'submitted').length,
            graded: submissions.filter(s => s.status === 'graded').length,
            pending: submissions.filter(s => s.status === 'pending').length,
            late: submissions.filter(s => s.status === 'late').length,
        };

        if (stats.graded > 0) {
            const gradedSubmissions = submissions.filter(s => s.status === 'graded' && s.marksObtained != null);
            const totalMarks = gradedSubmissions.reduce((sum, s) => sum + s.marksObtained, 0);
            stats.averageMarks = (totalMarks / gradedSubmissions.length).toFixed(2);
            stats.highestMarks = Math.max(...gradedSubmissions.map(s => s.marksObtained));
            stats.lowestMarks = Math.min(...gradedSubmissions.map(s => s.marksObtained));
        }

        return stats;
    }
}

export default new AssessmentSubmissionService();
