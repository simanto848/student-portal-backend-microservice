import axios from "axios";
import fs from "fs";

class UserServiceClient {
  constructor() {
    const isDocker = fs.existsSync("/.dockerenv");
    const defaultUrl = isDocker ? "http://user:8007" : "http://localhost:8007";

    this.baseURL = process.env.USER_SERVICE_URL || defaultUrl;

    console.log(
      `UserServiceClient: Initialized. Docker=${isDocker}, BaseURL=${this.baseURL}`
    );

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });
  }

  async getTeacherDetails(teacherId, accessToken) {
    try {
      const response = await this.client.get(`/teachers/${teacherId}`, {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      });
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error("Error fetching teacher details:", error.message);
      return null;
    }
  }

  async getStudentDetails(studentId, accessToken) {
    try {
      const response = await this.client.get(`/students/${studentId}`, {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      });
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error("Error fetching student details:", error.message);
      return null;
    }
  }
}

export default new UserServiceClient();
