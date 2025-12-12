import axios from "axios";

class EnrollmentServiceClient {
  constructor() {
    this.baseURL =
      process.env.ENROLLMENT_SERVICE_URL || "http://localhost:8003";
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });
  }

  async isStudentEnrolled(studentId, batchId, courseId, accessToken) {
    try {
      const response = await this.client.get(`/enrollments`, {
        params: { studentId, batchId, courseId, status: "active" },
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      });
      return response.data && response.data.length > 0;
    } catch (error) {
      console.error("Error checking student enrollment:", error.message);
      return false;
    }
  }

  async listEnrollmentsForStudent(studentId, params = {}, accessToken) {
    try {
      const response = await this.client.get(`/enrollments`, {
        params: { studentId, ...params },
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      });

      // Enrollment service returns ApiResponse: { success, data: <result> }
      // List can be either array or { enrollments: [] }
      const data = response.data?.data ?? response.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.enrollments)) return data.enrollments;
      if (data && Array.isArray(data.data)) return data.data;
      return [];
    } catch (error) {
      console.error("Error listing student enrollments:", error.message);
      return [];
    }
  }

  async isInstructorAssigned(instructorId, batchId, courseId, accessToken) {
    try {
      const response = await this.client.get(`/batch-course-instructors`, {
        params: { instructorId, batchId, courseId, status: "active" },
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      });
      return response.data && response.data.length > 0;
    } catch (error) {
      console.error("Error checking instructor assignment:", error.message);
      return false;
    }
  }
}

export default new EnrollmentServiceClient();
