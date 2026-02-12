import userServiceClient from '../clients/userServiceClient.js';

class RecipientResolverService {
  async resolve(notification) {
    const allUsers = [];
    await this.streamRecipients(notification, 1000, async (batch) => {
      allUsers.push(...batch);
    });
    return allUsers;
  }

  // Stream recipients in batches using pagination from User Service
  async streamRecipients(notification, batchSize = 100, onBatch) {
    const type = notification.targetType;
    let batchIndex = 0;

    const processPagedFetcher = async (fetcherFn, ...args) => {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        // Fetch a page of users
        const result = await fetcherFn(...args, { page, limit: batchSize });
        const users = result.users || [];

        if (users.length > 0) {
          batchIndex++;
          await onBatch(users, batchIndex);
        }

        const pagination = result.pagination || {};
        hasMore = pagination.hasMore && (pagination.page < pagination.pages);
        page++;
      }
    };

    switch (type) {
      case 'all':
        await processPagedFetcher(userServiceClient.getAllStudents.bind(userServiceClient));
        await processPagedFetcher(userServiceClient.getAllTeachers.bind(userServiceClient));
        await processPagedFetcher(userServiceClient.getAllStaff.bind(userServiceClient));
        break;

      case 'students':
        await processPagedFetcher(userServiceClient.getAllStudents.bind(userServiceClient));
        break;

      case 'teachers':
        await processPagedFetcher(userServiceClient.getAllTeachers.bind(userServiceClient));
        break;

      case 'staff':
        await processPagedFetcher(userServiceClient.getAllStaff.bind(userServiceClient));
        break;

      case 'department':
      case 'department_students':
      case 'department_teachers':
      case 'department_staff':
        const deptIds = notification.targetDepartmentIds || [];
        for (const deptId of deptIds) {
          if (type.includes('students') || type === 'department')
            await processPagedFetcher(userServiceClient.getStudentsByDepartment.bind(userServiceClient), deptId);
          if (type.includes('teachers') || type === 'department')
            await processPagedFetcher(userServiceClient.getTeachersByDepartment.bind(userServiceClient), deptId);
          if (type.includes('staff') || type === 'department')
            await processPagedFetcher(userServiceClient.getStaffByDepartment.bind(userServiceClient), deptId);
        }
        break;

      case 'batch':
      case 'batch_students':
        const batchIds = notification.targetBatchIds || [];
        for (const batchId of batchIds) {
          await processPagedFetcher(userServiceClient.getStudentsByBatch.bind(userServiceClient), batchId);
        }
        break;

      case 'faculty':
      case 'faculty_students':
      case 'faculty_teachers':
      case 'faculty_staff':
        const facultyIds = notification.targetFacultyIds || [];
        for (const facultyId of facultyIds) {
          if (type.includes('students') || type === 'faculty')
            await processPagedFetcher(userServiceClient.getStudentsByFaculty.bind(userServiceClient), facultyId);
          if (type.includes('teachers') || type === 'faculty')
            await processPagedFetcher(userServiceClient.getTeachersByFaculty.bind(userServiceClient), facultyId);
          if (type.includes('staff') || type === 'faculty')
            await processPagedFetcher(userServiceClient.getStaffByFaculty.bind(userServiceClient), facultyId);
        }
        break;

      case 'custom':
        const userIds = notification.targetUserIds || [];
        if (userIds.length > 0) {
          for (let i = 0; i < userIds.length; i += batchSize) {
            const chunk = userIds.slice(i, i + batchSize);
            const users = await Promise.all(chunk.map(id => userServiceClient.getUserById(id)));
            const validUsers = users.filter(u => u !== null);
            if (validUsers.length > 0) {
              batchIndex++;
              await onBatch(validUsers, batchIndex);
            }
          }
        }
        break;
    }
  }
}

export default new RecipientResolverService();
