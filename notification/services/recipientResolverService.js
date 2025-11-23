import userServiceClient from '../clients/userServiceClient.js';

class RecipientResolverService {
  async resolve(notification) {
    const type = notification.targetType;
    switch (type) {
      case 'all':
        return await this.getAllUsers();
      case 'students':
        return await this.getAllStudents();
      case 'teachers':
        return await this.getAllTeachers();
      case 'department':
        return await this.getDepartmentsUsers(notification.targetDepartmentIds);
      case 'batch':
        return await this.getBatchUsers(notification.targetBatchIds);
      case 'custom':
        return notification.targetUserIds.map(id => ({ id, role: 'student' }));
      default:
        return [];
    }
  }

  async getAllUsers() {
    const [students, teachers] = await Promise.all([this.getAllStudents(), this.getAllTeachers()]);
    return [...students, ...teachers];
  }

  async getAllStudents() {
    return await userServiceClient.getAllStudents();
  }

  async getAllTeachers() {
    return await userServiceClient.getAllTeachers();
  }

  async getDepartmentsUsers(departmentIds = []) {
    const results = await Promise.all(departmentIds.map(id => userServiceClient.getStudentsByDepartment(id)));
    return results.flat();
  }

  async getBatchUsers(batchIds = []) {
    const results = await Promise.all(batchIds.map(id => userServiceClient.getStudentsByBatch(id)));
    return results.flat();
  }
}

export default new RecipientResolverService();
