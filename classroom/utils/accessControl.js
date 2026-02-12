import { CourseEnrollment } from '../models/external/Enrollment.js';
import { config } from 'shared';
import { fetchWithFallback } from './httpClient.js';
import { extractApiArray } from './httpClient.js';

// Verify a student belongs to a given batch
export const verifyStudentBatchAccess = async (userId, batchId, token) => {
    // Attempt 1: User service
    try {
        const userBase = config.services.user.replace(/\/$/, '');
        const res = await fetchWithFallback(
            `${userBase}/students/${userId}`,
            { headers: { Authorization: token } },
            'user'
        );
        if (res.ok) {
            const data = await res.json();
            const student = data.data || data;
            if (student.batchId === batchId) return true;
        }
    } catch (e) {
        // Fall through to enrollment service
    }

    // Attempt 2: Enrollment service
    try {
        const enrollBase = config.services.enrollment.replace(/\/$/, '');
        const res = await fetchWithFallback(
            `${enrollBase}/enrollments`,
            { headers: { Authorization: token } },
            'enrollment'
        );
        if (res.ok) {
            const data = await res.json();
            const enrollments = extractApiArray(data);
            if (enrollments.some(e => e.batchId === batchId)) return true;
        }
    } catch (e) {
        // Fall through to local DB
    }

    // Attempt 3: Local DB
    const localEnrollment = await CourseEnrollment.findOne({
        batchId,
        studentId: userId,
        status: 'active',
        deletedAt: null,
    });
    return !!localEnrollment;
};

// Verify a teacher is assigned to a specific course/batch
export const verifyTeacherAssignment = async (userId, courseId, batchId, token) => {
    try {
        const enrollBase = config.services.enrollment.replace(/\/$/, '');
        const url = `${enrollBase}/batch-course-instructors?instructorId=${userId}&courseId=${courseId}&batchId=${batchId}&status=active`;
        const res = await fetchWithFallback(
            url,
            { headers: { Authorization: token } },
            'enrollment'
        );
        if (!res.ok) return false;
        const data = await res.json();
        return extractApiArray(data).length > 0;
    } catch (e) {
        return false;
    }
};

// Get the student's batch ID. Returns null if not found
export const getStudentBatchId = async (userId, token) => {
    // Attempt 1: User service
    try {
        const userBase = config.services.user.replace(/\/$/, '');
        const res = await fetchWithFallback(
            `${userBase}/students/${userId}`,
            { headers: { Authorization: token } },
            'user'
        );
        if (res.ok) {
            const data = await res.json();
            const student = data.data || data;
            if (student.batchId) return student.batchId;
        }
    } catch (e) {
        // Fall through
    }

    // Attempt 2: Enrollment service
    try {
        const enrollBase = config.services.enrollment.replace(/\/$/, '');
        const res = await fetchWithFallback(
            `${enrollBase}/enrollments`,
            { headers: { Authorization: token } },
            'enrollment'
        );
        if (res.ok) {
            const data = await res.json();
            const enrollments = extractApiArray(data);
            if (enrollments.length > 0) return enrollments[0].batchId;
        }
    } catch (e) {
        // Fall through
    }

    // Attempt 3: Local DB
    const localEnrollment = await CourseEnrollment.findOne({
        studentId: userId,
        status: 'active',
        deletedAt: null,
    });
    return localEnrollment?.batchId || null;
};
