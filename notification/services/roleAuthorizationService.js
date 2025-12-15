import academicServiceClient from '../clients/academicServiceClient.js';
import enrollmentServiceClient from '../clients/enrollmentServiceClient.js';

class RoleAuthorizationService {
    /**
     * Get all special roles and scopes for a teacher
     * Returns the teacher's administrative roles and what they can target
     */
    async getUserRoles(userId) {
        const roles = {
            isAdmin: false,
            isDean: false,
            isDepartmentHead: false,
            isBatchCounselor: false,
            isCourseInstructor: false,
            faculties: [],        // Faculties where user is dean
            departments: [],      // Departments where user is head
            counselorBatches: [], // Batches where user is counselor
            instructorBatches: [] // Batches where user is course instructor
        };

        try {
            // Check if dean of any faculty
            const deanFaculties = await academicServiceClient.getFacultyByDean(userId);
            if (deanFaculties.length > 0) {
                roles.isDean = true;
                roles.faculties = deanFaculties.map(f => ({
                    id: String(f.id || f._id),
                    name: f.name
                }));
            }

            // Check if department head
            const headDepartments = await academicServiceClient.getDepartmentByHead(userId);
            if (headDepartments.length > 0) {
                roles.isDepartmentHead = true;
                roles.departments = headDepartments.map(d => ({
                    id: String(d.id || d._id),
                    name: d.name,
                    facultyId: d.facultyId
                }));
            }

            // Check if batch counselor
            const counselorBatches = await academicServiceClient.getBatchesByCounselor(userId);
            if (counselorBatches.length > 0) {
                roles.isBatchCounselor = true;
                roles.counselorBatches = counselorBatches.map(b => ({
                    id: String(b.id || b._id),
                    name: b.name,
                    code: b.code,
                    departmentId: b.departmentId
                }));
            }

            // Check if course instructor
            const instructorBatchIds = await enrollmentServiceClient.getInstructorBatches(userId);
            console.log('Instructor batch IDs from enrollment service:', { userId, instructorBatchIds });

            if (instructorBatchIds.length > 0) {
                roles.isCourseInstructor = true;
                // Fetch batch details
                for (const batchId of instructorBatchIds) {
                    const batch = await academicServiceClient.getBatchById(batchId);
                    console.log('Fetched batch details:', { batchId, batch: batch ? { id: batch.id, _id: batch._id, name: batch.name } : null });
                    if (batch) {
                        roles.instructorBatches.push({
                            id: String(batch.id || batch._id),
                            name: batch.name,
                            code: batch.code,
                            departmentId: batch.departmentId
                        });
                    }
                }
            }

            console.log('User roles computed:', {
                userId,
                isCourseInstructor: roles.isCourseInstructor,
                instructorBatches: roles.instructorBatches.map(b => ({ id: b.id, code: b.code }))
            });
        } catch (err) {
            console.error('Error fetching user roles:', err.message);
        }

        return roles;
    }

    /**
     * Check if user can send notification to specific targets
     */
    async canSendTo(user, targetType, targetIds = []) {
        const roles = await this.getUserRoles(user.id || user.sub);

        // Admins can send to anyone
        if (user.role === 'admin' || user.role === 'super_admin') {
            return { allowed: true, senderRole: 'admin' };
        }

        switch (targetType) {
            case 'all':
            case 'students':
            case 'teachers':
            case 'staff':
                // Only admins can send to all
                return { allowed: false, reason: 'Only admins can send to all users' };

            case 'faculty':
            case 'faculty_students':
            case 'faculty_teachers':
            case 'faculty_staff':
                // Only deans of those faculties
                if (!roles.isDean) {
                    return { allowed: false, reason: 'You are not a dean of any faculty' };
                }
                const allowedFacultyIds = roles.faculties.map(f => f.id);
                const unauthorizedFaculties = targetIds.filter(id => !allowedFacultyIds.includes(id));
                if (unauthorizedFaculties.length > 0) {
                    return { allowed: false, reason: 'You can only send to faculties where you are dean' };
                }
                return { allowed: true, senderRole: 'dean' };

            case 'department':
            case 'department_students':
            case 'department_teachers':
            case 'department_staff':
                // Department heads can send to their departments
                // Deans can send to departments in their faculty
                if (roles.isDepartmentHead) {
                    const allowedDeptIds = roles.departments.map(d => d.id);
                    const unauthorized = targetIds.filter(id => !allowedDeptIds.includes(id));
                    if (unauthorized.length === 0) {
                        return { allowed: true, senderRole: 'department_head' };
                    }
                }
                if (roles.isDean) {
                    // Get all departments in dean's faculties
                    const deanDeptIds = [];
                    for (const faculty of roles.faculties) {
                        const depts = await academicServiceClient.getDepartmentsByFaculty(faculty.id);
                        deanDeptIds.push(...depts.map(d => d.id || d._id));
                    }
                    const unauthorized = targetIds.filter(id => !deanDeptIds.includes(id));
                    if (unauthorized.length === 0) {
                        return { allowed: true, senderRole: 'dean' };
                    }
                }
                return { allowed: false, reason: 'You can only send to departments where you are head or dean' };

            case 'batch':
            case 'batch_students':
                // Counselors can send to their batches
                // Course instructors can send to batches they teach
                // Department heads can send to batches in their department
                const allAllowedBatchIds = [];
                let senderRole = null;

                if (roles.isBatchCounselor) {
                    allAllowedBatchIds.push(...roles.counselorBatches.map(b => String(b.id)));
                    senderRole = 'batch_counselor';
                }
                if (roles.isCourseInstructor) {
                    allAllowedBatchIds.push(...roles.instructorBatches.map(b => String(b.id)));
                    senderRole = senderRole || 'course_instructor';
                }
                if (roles.isDepartmentHead) {
                    senderRole = senderRole || 'department_head';
                }

                // Convert target IDs to strings for comparison
                const targetBatchStrIds = targetIds.map(id => String(id));
                const uniqueBatchIds = [...new Set(allAllowedBatchIds)];

                console.log('Batch authorization check:', {
                    userId: user.id || user.sub,
                    targetIds: targetBatchStrIds,
                    allowedBatchIds: uniqueBatchIds,
                    isCounselor: roles.isBatchCounselor,
                    isInstructor: roles.isCourseInstructor,
                    counselorBatches: roles.counselorBatches,
                    instructorBatches: roles.instructorBatches
                });

                const unauthorizedBatches = targetBatchStrIds.filter(id => !uniqueBatchIds.includes(id));
                if (unauthorizedBatches.length > 0) {
                    return { allowed: false, reason: 'You can only send to batches where you are counselor or instructor' };
                }
                if (!senderRole) {
                    return { allowed: false, reason: 'You do not have permission to send to batches' };
                }
                return { allowed: true, senderRole };

            case 'custom':
                // Custom targeting - check if user has any role
                if (roles.isDean || roles.isDepartmentHead || roles.isBatchCounselor || roles.isCourseInstructor) {
                    return { allowed: true, senderRole: 'custom' };
                }
                return { allowed: false, reason: 'You do not have permission to send notifications' };

            default:
                return { allowed: false, reason: 'Unknown target type' };
        }
    }

    /**
     * Get available targeting options for a user
     */
    async getAvailableTargets(user) {
        const roles = await this.getUserRoles(user.id || user.sub);
        const targets = {
            canSend: false,
            roles: [],
            options: []
        };

        // Admins get all options
        if (user.role === 'admin' || user.role === 'super_admin') {
            targets.canSend = true;
            targets.roles.push('admin');
            targets.options.push(
                { type: 'all', label: 'All Users' },
                { type: 'students', label: 'All Students' },
                { type: 'teachers', label: 'All Teachers' },
                { type: 'staff', label: 'All Staff' }
            );
            return targets;
        }

        // Dean options
        if (roles.isDean) {
            targets.canSend = true;
            targets.roles.push('dean');
            for (const faculty of roles.faculties) {
                targets.options.push(
                    { type: 'faculty', id: faculty.id, label: `Faculty: ${faculty.name}` },
                    { type: 'faculty_students', id: faculty.id, label: `${faculty.name} - Students` },
                    { type: 'faculty_teachers', id: faculty.id, label: `${faculty.name} - Teachers` }
                );
                // Get departments in faculty
                const depts = await academicServiceClient.getDepartmentsByFaculty(faculty.id);
                for (const dept of depts) {
                    targets.options.push(
                        { type: 'department', id: dept.id || dept._id, label: `Dept: ${dept.name}` }
                    );
                }
            }
        }

        // Department head options
        if (roles.isDepartmentHead) {
            targets.canSend = true;
            targets.roles.push('department_head');
            for (const dept of roles.departments) {
                targets.options.push(
                    { type: 'department', id: dept.id, label: `Department: ${dept.name}` },
                    { type: 'department_students', id: dept.id, label: `${dept.name} - Students` },
                    { type: 'department_teachers', id: dept.id, label: `${dept.name} - Teachers` },
                    { type: 'department_staff', id: dept.id, label: `${dept.name} - Staff` }
                );
            }
        }

        // Batch counselor options
        if (roles.isBatchCounselor) {
            targets.canSend = true;
            targets.roles.push('batch_counselor');
            for (const batch of roles.counselorBatches) {
                targets.options.push(
                    { type: 'batch', id: batch.id, label: `Batch: ${batch.code || batch.name}` }
                );
            }
        }

        // Course instructor options
        if (roles.isCourseInstructor) {
            targets.canSend = true;
            targets.roles.push('course_instructor');
            for (const batch of roles.instructorBatches) {
                // Avoid duplicates if also counselor
                const exists = targets.options.find(o => o.type === 'batch' && o.id === batch.id);
                if (!exists) {
                    targets.options.push(
                        { type: 'batch', id: batch.id, label: `Batch: ${batch.code || batch.name} (Instructor)` }
                    );
                }
            }
        }

        return targets;
    }
}

export default new RoleAuthorizationService();
