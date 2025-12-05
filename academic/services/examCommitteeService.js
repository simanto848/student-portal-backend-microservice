import ExamCommittee from '../models/ExamCommittee.js';


class ExamCommitteeService {
    async addMember(departmentId, teacherId, batchId = null) {
        const existing = await ExamCommittee.findOne({ departmentId, teacherId, batchId });
        if (existing) {
            if (existing.status === 'INACTIVE') {
                existing.status = 'ACTIVE';
                return existing.save();
            }
            throw new Error('Teacher is already a member of this committee');
        }

        return ExamCommittee.create({
            departmentId,
            teacherId,
            batchId
        });
    }

    async removeMember(id) {
        const member = await ExamCommittee.findById(id);
        if (!member) throw new Error('Member not found');
        member.deletedAt = new Date();
        return member.save();
    }

    async listMembers(departmentId, batchId = null) {
        const query = { departmentId, status: 'ACTIVE' };
        if (batchId) query.batchId = batchId;
        return ExamCommittee.find(query);
    }
}

export default new ExamCommitteeService();
