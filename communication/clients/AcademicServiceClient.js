import axios from "axios";
import fs from "fs";

class AcademicServiceClient {
  constructor() {
    const isDocker = fs.existsSync("/.dockerenv");
    const defaultUrl = isDocker
      ? "http://academic:8001"
      : "http://localhost:8001";

    this.baseURL = process.env.ACADEMIC_SERVICE_URL || defaultUrl;

    console.log(
      `AcademicServiceClient: Initialized. Docker=${isDocker}, BaseURL=${this.baseURL}`
    );

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });
  }

  async getBatchDetails(batchId, accessToken) {
    try {
      const response = await this.client.get(`/batches/${batchId}`, {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      });
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error("Error fetching batch details:", error.message);
      return null;
    }
  }

  async getCourseDetails(courseId, accessToken) {
    try {
      const response = await this.client.get(`/courses/${courseId}`, {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      });
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error("Error fetching course details:", error.message);
      return null;
    }
  }
}

export default new AcademicServiceClient();
