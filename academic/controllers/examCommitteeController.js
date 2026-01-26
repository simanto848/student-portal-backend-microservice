import examCommitteeService from "../services/examCommitteeService.js";
import { ApiResponse } from "shared";

class ExamCommitteeController {
  async addMember(req, res, next) {
    try {
      const { departmentId, teacherId, shift, batchId } = req.body;
      const member = await examCommitteeService.addMember(
        departmentId,
        teacherId,
        shift,
        batchId
      );
      return ApiResponse.created(res, member, "Committee member added");
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req, res, next) {
    try {
      const { id } = req.params;
      await examCommitteeService.removeMember(id);
      return ApiResponse.success(res, null, "Committee member removed");
    } catch (error) {
      next(error);
    }
  }

  async updateMember(req, res, next) {
    try {
      const { id } = req.params;
      const member = await examCommitteeService.updateMember(id, req.body);
      return ApiResponse.success(res, member, "Committee member updated");
    } catch (error) {
      next(error);
    }
  }

  async listMembers(req, res, next) {
    try {
      const { departmentId, batchId, shift, teacherId, status } = req.query;
      const members = await examCommitteeService.listMembers(
        departmentId,
        batchId,
        shift,
        teacherId,
        status
      );
      return ApiResponse.success(res, members);
    } catch (error) {
      next(error);
    }
  }

  async listDeletedMembers(req, res, next) {
    try {
      const { departmentId } = req.query;
      const members = await examCommitteeService.listDeletedMembers(departmentId);
      return ApiResponse.success(res, members);
    } catch (error) {
      next(error);
    }
  }

  async restoreMember(req, res, next) {
    try {
      const { id } = req.params;
      const member = await examCommitteeService.restoreMember(id);
      return ApiResponse.success(res, member, "Member restored successfully");
    } catch (error) {
      next(error);
    }
  }
}

export default new ExamCommitteeController();
