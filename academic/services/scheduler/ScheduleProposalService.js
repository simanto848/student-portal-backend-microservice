import ScheduleProposal from "../../models/ScheduleProposal.js";
import CourseSchedule from "../../models/CourseSchedule.js";
import Session from "../../models/Session.js";
import Batch from "../../models/Batch.js";
import SessionCourse from "../../models/SessionCourse.js";
import Classroom from "../../models/Classroom.js";
import Teacher from "../../models/Teacher.js";

class ScheduleProposalService {
    async getProposals(sessionId) {
        const query = sessionId ? { sessionId } : {};
        return ScheduleProposal.find(query).sort({ createdAt: -1 });
    }

    // Get proposal
    async getProposalById(id) {
        const proposal = await ScheduleProposal.findById(id).lean();
        if (!proposal) return null;

        try {
            const uniqueBatchIds = [...new Set(proposal.scheduleData.map(i => i.batchId))];
            const uniqueCourseIds = [...new Set(proposal.scheduleData.map(i => i.sessionCourseId))];
            const uniqueRoomIds = [...new Set(proposal.scheduleData.map(i => i.classroomId))];
            const uniqueTeacherIds = [...new Set(proposal.scheduleData.map(i => i.teacherId).filter(Boolean))];

            const [batches, sessionCourses, classrooms, teachers] = await Promise.all([
                Batch.find({ _id: { $in: uniqueBatchIds } }).lean(),
                SessionCourse.find({ _id: { $in: uniqueCourseIds } }).populate('courseId').lean(),
                Classroom.find({ _id: { $in: uniqueRoomIds } }).lean(),
                Teacher.find({ _id: { $in: uniqueTeacherIds } }).lean()
            ]);

            const batchMap = batches.reduce((acc, b) => ({
                ...acc, [b._id]: { name: b.name, shift: b.shift }
            }), {});

            const courseMap = sessionCourses.reduce((acc, sc) => ({
                ...acc, [sc._id]: { name: sc.courseId?.name || 'Unknown', code: sc.courseId?.code || 'Unknown' }
            }), {});

            const roomMap = classrooms.reduce((acc, c) => ({
                ...acc, [c._id]: `${c.roomNumber} (${c.buildingName})`
            }), {});

            const teacherMap = teachers.reduce((acc, t) => ({
                ...acc, [t._id]: t.fullName || 'Unknown'
            }), {});

            proposal.scheduleData = proposal.scheduleData.map(item => ({
                ...item,
                batchName: item.batchName || batchMap[item.batchId]?.name || item.batchId,
                batchShift: item.batchShift || batchMap[item.batchId]?.shift || 'day',
                courseName: item.courseName ||
                    `${courseMap[item.sessionCourseId]?.code}: ${courseMap[item.sessionCourseId]?.name}` ||
                    item.sessionCourseId,
                courseCode: item.courseCode || courseMap[item.sessionCourseId]?.code || '',
                roomName: item.roomName || roomMap[item.classroomId] || item.classroomId,
                teacherName: item.teacherName || teacherMap[item.teacherId] || 'Not Assigned'
            }));

            proposal.id = proposal._id;
            delete proposal._id;
            delete proposal.__v;
            return proposal;
        } catch (error) {
            proposal.id = proposal._id;
            delete proposal._id;
            delete proposal.__v;
            return proposal;
        }
    }

    // Apply a proposal
    async applyProposal(proposalId) {
        const proposal = await ScheduleProposal.findById(proposalId);
        if (!proposal) throw new Error("Proposal not found");
        if (proposal.status === 'approved') throw new Error("Proposal already applied");

        const session = await Session.findById(proposal.sessionId);
        if (!session) throw new Error("Session not found");

        const batchIds = [...new Set(proposal.scheduleData.map(s => s.batchId))];
        await CourseSchedule.closeBatchSchedules(batchIds);

        const schedules = proposal.scheduleData.map(item => ({
            sessionId: proposal.sessionId,
            batchId: item.batchId,
            sessionCourseId: item.sessionCourseId,
            teacherId: item.teacherId,
            classroomId: item.classroomId,
            daysOfWeek: item.daysOfWeek,
            startTime: item.startTime,
            endTime: item.endTime,
            classType: item.classType || 'Lecture',
            startDate: session.startDate,
            endDate: session.endDate,
            isActive: true,
            isRecurring: true,
            status: 'active'
        }));

        const createdSchedules = await CourseSchedule.insertMany(schedules);

        proposal.status = 'approved';
        proposal.metadata = {
            ...proposal.metadata,
            appliedAt: new Date(),
            schedulesCreated: createdSchedules.length,
            previousSchedulesClosed: batchIds.length
        };
        await proposal.save();

        return {
            success: true,
            schedulesCreated: createdSchedules.length,
            message: `Successfully created ${createdSchedules.length} class schedules`
        };
    }

    // Delete a proposal
    async deleteProposal(proposalId) {
        const proposal = await ScheduleProposal.findById(proposalId);
        if (!proposal) throw new Error("Proposal not found");
        if (proposal.status === 'approved') throw new Error("Cannot delete an applied proposal");

        await ScheduleProposal.findByIdAndDelete(proposalId);
        return { success: true, message: "Proposal deleted successfully" };
    }

    // Create a new schedule proposal from generated schedule data
    async createProposal(sessionId, generatedBy, scheduleData, metadata) {
        return ScheduleProposal.create({
            sessionId,
            generatedBy,
            status: 'pending',
            scheduleData,
            metadata
        });
    }
}

export default new ScheduleProposalService();
