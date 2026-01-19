import userServiceClient from '../clients/userServiceClient.js';

class RecipientResolverService {
  async resolve(notification) {
    const type = notification.targetType;
    switch (type) {
      case 'all':
      case 'all':
        const allUsers = await this.getAllUsers();
        return allUsers;
      case 'students':
        return await this.getAllStudents();
      case 'teachers':
        return await this.getAllTeachers();
      case 'staff':
        return await this.getAllStaff();
      case 'department':
      case 'department':
        const deptUsers = await this.getDepartmentsUsers(notification.targetDepartmentIds);
        return deptUsers;
      case 'department_students':
        return await this.getDepartmentStudents(notification.targetDepartmentIds);
      case 'department_teachers':
        return await this.getDepartmentTeachers(notification.targetDepartmentIds);
      case 'department_staff':
        return await this.getDepartmentStaff(notification.targetDepartmentIds);
      case 'batch':
      case 'batch_students':
      case 'batch':
      case 'batch_students':
        const batchUsers = await this.getBatchUsers(notification.targetBatchIds);
        return batchUsers;
      case 'faculty':
        return await this.getFacultyUsers(notification.targetFacultyIds);
      case 'faculty_students':
        return await this.getFacultyStudents(notification.targetFacultyIds);
      case 'faculty_teachers':
        return await this.getFacultyTeachers(notification.targetFacultyIds);
      case 'faculty_staff':
        return await this.getFacultyStaff(notification.targetFacultyIds);
      case 'custom':
        // Resolve roles for each user ID
        const resolvedUsers = await Promise.all(notification.targetUserIds.map(async (id) => {
          try {
            const user = await userServiceClient.getUserById(id);
            return user ? (user.data || user) : null;
          } catch (err) {
            console.error(`Error resolving user ${id} for notification:`, err.message);
            return null;
          }
        }));
        return resolvedUsers.filter(u => u !== null).map(u => ({ id: u.id || u._id, role: u.role }));
      default:
        return [];
    }
  }

  async getAllUsers() {
    const [students, teachers, staff] = await Promise.all([
      this.getAllStudents(),
      this.getAllTeachers(),
      this.getAllStaff()
    ]);
    return [...students, ...teachers, ...staff];
  }

  async getAllStudents() {
    return await userServiceClient.getAllStudents();
  }

  async getAllTeachers() {
    return await userServiceClient.getAllTeachers();
  }

  async getAllStaff() {
    return await userServiceClient.getAllStaff();
  }

  // Department-level resolvers
  async getDepartmentsUsers(departmentIds = []) {
    const [students, teachers, staff] = await Promise.all([
      this.getDepartmentStudents(departmentIds),
      this.getDepartmentTeachers(departmentIds),
      this.getDepartmentStaff(departmentIds)
    ]);
    return [...students, ...teachers, ...staff];
  }

  async getDepartmentStudents(departmentIds = []) {
    const results = await Promise.all(departmentIds.map(id => userServiceClient.getStudentsByDepartment(id)));
    return this._uniqueUsers(results.flat());
  }

  async getDepartmentTeachers(departmentIds = []) {
    const results = await Promise.all(departmentIds.map(id => userServiceClient.getTeachersByDepartment(id)));
    return this._uniqueUsers(results.flat());
  }

  async getDepartmentStaff(departmentIds = []) {
    const results = await Promise.all(departmentIds.map(id => userServiceClient.getStaffByDepartment(id)));
    return this._uniqueUsers(results.flat());
  }

  // Batch-level resolvers
  async getBatchUsers(batchIds = []) {
    const results = await Promise.all(batchIds.map(id => userServiceClient.getStudentsByBatch(id)));
    return this._uniqueUsers(results.flat());
  }

  // Faculty-level resolvers
  async getFacultyUsers(facultyIds = []) {
    const [students, teachers, staff] = await Promise.all([
      this.getFacultyStudents(facultyIds),
      this.getFacultyTeachers(facultyIds),
      this.getFacultyStaff(facultyIds)
    ]);
    return [...students, ...teachers, ...staff];
  }

  async getFacultyStudents(facultyIds = []) {
    const results = await Promise.all(facultyIds.map(id => userServiceClient.getStudentsByFaculty(id)));
    return this._uniqueUsers(results.flat());
  }

  async getFacultyTeachers(facultyIds = []) {
    const results = await Promise.all(facultyIds.map(id => userServiceClient.getTeachersByFaculty(id)));
    return this._uniqueUsers(results.flat());
  }

  async getFacultyStaff(facultyIds = []) {
    const results = await Promise.all(facultyIds.map(id => userServiceClient.getStaffByFaculty(id)));
    return this._uniqueUsers(results.flat());
  }

  // Helper to remove duplicate users
  _uniqueUsers(users) {
    const seen = new Set();
    return users.filter(u => {
      const id = u.id || u._id;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  async streamRecipients(notification, pageSize = 500, onBatch) {
    const all = await this.resolve(notification);
    for (let i = 0; i < all.length; i += pageSize) {
      const slice = all.slice(i, i + pageSize);
      await onBatch(slice, i / pageSize + 1);
    }
  }
}

export default new RecipientResolverService();

