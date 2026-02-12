import academicServiceClient from '../clients/academicServiceClient.js';
import enrollmentServiceClient from '../clients/enrollmentServiceClient.js';

class RoleAuthorizationService {
    async getUserRoles(userId) {
        const roles = {
            isAdmin: false,
            isDean: false,
            isDepartmentHead: false,
            isBatchCounselor: false,
            isCourseInstructor: false,
            faculties: [],
            departments: [],
            counselorBatches: [],
            instructorBatches: []
        };

        try {
            const deanFaculties = await academicServiceClient.getFacultyByDean(userId);
            if (deanFaculties.length > 0) {
                roles.isDean = true;
                roles.faculties = deanFaculties.map(f => ({
                    id: String(f.id || f._id),
                    name: f.name
                }));
            }

            const headDepartments = await academicServiceClient.getDepartmentByHead(userId);
            if (headDepartments.length > 0) {
                roles.isDepartmentHead = true;
                roles.departments = headDepartments.map(d => ({
                    id: String(d.id || d._id),
                    name: d.name,
                    facultyId: d.facultyId
                }));
            }

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

            const instructorBatchIds = await enrollmentServiceClient.getInstructorBatches(userId);
            if (instructorBatchIds.length > 0) {
                roles.isCourseInstructor = true;

                const batchPromises = instructorBatchIds.map(id => academicServiceClient.getBatchById(id));
                const batches = await Promise.all(batchPromises);

                for (const batch of batches) {
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
        } catch (err) {
            return err;
        }

        return roles;
    }

    async canSendTo(user, targetType, targetIds = []) {
        if (user.role === 'admin' || user.role === 'super_admin') {
            return { allowed: true, senderRole: 'admin' };
        }

        const isDepartmentHead = user.isDepartmentHead || user.role === 'department_head';
        let roles = null;

        if (!isDepartmentHead) {
            roles = await this.getUserRoles(user.id || user.sub);
        }

        switch (targetType) {
            case 'all':
            case 'students':
            case 'teachers':
            case 'staff':
                return { allowed: false, reason: 'Only admins can send to all users' };

            case 'department':
            case 'department_students':
            case 'department_teachers':
            case 'department_staff':
                if (isDepartmentHead) {
                    const userDepartmentId = user.departmentId;
                    if (userDepartmentId) {
                        const unauthorized = targetIds.filter(id => id !== userDepartmentId);
                        if (unauthorized.length > 0) {
                            return { allowed: false, reason: 'You can only send to your department' };
                        }
                        return { allowed: true, senderRole: 'department_head' };
                    }
                    return { allowed: false, reason: 'Department ID not found in your profile' };
                }
                if (roles && roles.isDean) {
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

            case 'faculty':
            case 'faculty_students':
            case 'faculty_teachers':
            case 'faculty_staff':
                if (!roles || !roles.isDean) {
                    return { allowed: false, reason: 'You are not a dean of any faculty' };
                }
                const allowedFacultyIds = roles.faculties.map(f => f.id);
                const unauthorizedFaculties = targetIds.filter(id => !allowedFacultyIds.includes(id));
                if (unauthorizedFaculties.length > 0) {
                    return { allowed: false, reason: 'You can only send to faculties where you are dean' };
                }
                return { allowed: true, senderRole: 'dean' };

            case 'batch':
            case 'batch_students':
                const allowedBatchIds = [];
                let senderRole = null;

                if (isDepartmentHead) {
                    senderRole = 'department_head';
                } else if (roles) {
                    if (roles.isBatchCounselor) {
                        allowedBatchIds.push(...roles.counselorBatches.map(b => b.id));
                        senderRole = 'batch_counselor';
                    }
                    if (roles.isCourseInstructor) {
                        allowedBatchIds.push(...roles.instructorBatches.map(b => b.id));
                        senderRole = senderRole || 'course_instructor';
                    }
                }

                if (allowedBatchIds.length === 0 && !senderRole) {
                    return { allowed: false, reason: 'You do not have permission to send to batches' };
                }

                const targetBatchStrIds = targetIds.map(id => String(id));
                const uniqueBatchIds = [...new Set(allowedBatchIds)];

                const unauthorizedBatches = targetBatchStrIds.filter(id => !uniqueBatchIds.includes(id));
                if (unauthorizedBatches.length > 0) {
                    return { allowed: false, reason: 'You can only send to batches where you are counselor, instructor, or department head' };
                }
                return { allowed: true, senderRole };

            case 'custom':
                if (isDepartmentHead) {
                    return { allowed: true, senderRole: 'custom' };
                }
                if (roles && (roles.isDean || roles.isBatchCounselor || roles.isCourseInstructor)) {
                    return { allowed: true, senderRole: 'custom' };
                }
                return { allowed: false, reason: 'You do not have permission to send notifications' };

            default:
                return { allowed: false, reason: 'Unknown target type' };
        }
    }

    async getAvailableTargets(user) {
        const targets = {
            canSend: false,
            roles: [],
            options: []
        };

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

        const isDeptHead = user.isDepartmentHead === true || user.role === 'department_head';
        if (isDeptHead) {
            targets.canSend = true;
            targets.roles.push('department_head');

            const userDepartmentId = user.departmentId || user.sub;
            if (userDepartmentId) {
                targets.options.push(
                    { type: 'department', id: userDepartmentId, label: 'My Department' },
                    { type: 'department_students', id: userDepartmentId, label: 'My Department - Students' },
                    { type: 'department_teachers', id: userDepartmentId, label: 'My Department - Teachers' },
                    { type: 'department_staff', id: userDepartmentId, label: 'My Department - Staff' },
                    { type: 'custom', label: 'Specific Users' }
                );
            }
        }

        if (!user.isDepartmentHead && user.role !== 'department_head') {
            const roles = await this.getUserRoles(user.id || user.sub);
            if (roles.isDean) {
                targets.canSend = true;
                targets.roles.push('dean');
                for (const faculty of roles.faculties) {
                    targets.options.push(
                        { type: 'faculty', id: faculty.id, label: `Faculty: ${faculty.name}` },
                        { type: 'faculty_students', id: faculty.id, label: `${faculty.name} - Students` },
                        { type: 'faculty_teachers', id: faculty.id, label: `${faculty.name} - Teachers` }
                    );

                    const depts = await academicServiceClient.getDepartmentsByFaculty(faculty.id);
                    for (const dept of depts) {
                        targets.options.push(
                            { type: 'department', id: dept.id || dept._id, label: `Dept: ${dept.name}` }
                        );
                    }
                }
            }

            if (roles.isBatchCounselor) {
                targets.canSend = true;
                targets.roles.push('batch_counselor');
                for (const batch of roles.counselorBatches) {
                    targets.options.push(
                        { type: 'batch', id: batch.id, label: `Batch: ${batch.code || batch.name}` }
                    );
                }
            }

            if (roles.isCourseInstructor) {
                targets.canSend = true;
                targets.roles.push('course_instructor');
                for (const batch of roles.instructorBatches) {
                    const exists = targets.options.find(o => o.type === 'batch' && o.id === batch.id);
                    if (!exists) {
                        targets.options.push(
                            { type: 'batch', id: batch.id, label: `Batch: ${batch.code || batch.name} (Instructor)` }
                        );
                    }
                }
            }
        }

        return targets;
    }
}

export default new RoleAuthorizationService();
