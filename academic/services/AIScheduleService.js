import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import Classroom from "../models/Classroom.js";
import SessionCourse from "../models/SessionCourse.js";
import Session from "../models/Session.js";
// import Course from "../models/Course.js";
import Batch from "../models/Batch.js";
// import Teacher from "../models/Teacher.js";
import Department from "../models/Department.js";
import ScheduleProposal from "../models/ScheduleProposal.js";
import CourseSchedule from "../models/CourseSchedule.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API });

const scheduleItemSchema = z.object({
    sessionCourseId: z.string().describe("ID of the session course"),
    batchId: z.string().describe("ID of the batch"),
    classroomId: z.string().describe("ID of the classroom"),
    daysOfWeek: z.array(z.string()).describe("Days of the week e.g. ['Monday']"),
    startTime: z.string().describe("Start time in HH:MM format"),
    endTime: z.string().describe("End time in HH:MM format")
});

const scheduleSchema = z.array(scheduleItemSchema).describe("A list of class schedules");

class AIScheduleService {
    async gatherSystemData(sessionId, departmentId = null) {
        const departments = await Department.find({ status: true }).select('name shortName');
        const deptMap = departments.reduce((acc, d) => ({ ...acc, [d._id.toString()]: d.shortName }), {});
        let classroomQuery = { isActive: true };
        if (departmentId) {
            // Optional: if your classrooms have department assignment, enable this:
            // classroomQuery = { ...classroomQuery, $or: [{ departmentId: departmentId }, { departmentId: null }] };
        }
        const classrooms = await Classroom.find(classroomQuery).select('roomNumber capacity roomType facilities isUnderMaintenance buildingName floor departmentId');

        let batchQuery = { status: true };
        if (departmentId) batchQuery.departmentId = departmentId;

        const batches = await Batch.find(batchQuery).select('name currentSemester departmentId currentStudents type');

        const targetSemesters = [...new Set(batches.map(b => b.currentSemester))];
        let courseQuery = { sessionId };
        if (departmentId) courseQuery.departmentId = departmentId;
        if (targetSemesters.length > 0) {
            courseQuery.semester = { $in: targetSemesters };
        }

        const sessionCourses = await SessionCourse.find(courseQuery)
            .populate({ path: 'courseId', select: 'code name credits type' })
            .populate({ path: 'departmentId', select: 'shortName' })
            .lean();

        const systemData = {
            classrooms: classrooms.map(c => ({
                id: c._id,
                name: c.roomNumber,
                capacity: c.capacity,
                type: c.roomType,
                building: c.buildingName,
                department: c.departmentId && deptMap[c.departmentId] ? deptMap[c.departmentId] : "Shared"
            })),
            courses: sessionCourses.map(sc => ({
                id: sc._id,
                code: sc.courseId.code,
                name: sc.courseId.name,
                credits: sc.courseId.credits,
                type: sc.courseId.courseType,
                batchSemester: sc.semester,
                gradeLevel: Math.ceil(sc.semester / 2),
                department: sc.departmentId ? sc.departmentId.shortName : "Unknown"
            })),
            batches: batches.map(b => ({
                id: b._id,
                name: b.name,
                semester: b.currentSemester,
                studentCount: b.currentStudents || 40,
                department: b.departmentId && deptMap[b.departmentId] ? deptMap[b.departmentId] : "Unknown"
            }))
        };

        if (systemData.batches.length === 0) {
            throw new Error("No batches found for this session (that match active batch semesters.");
        }

        return systemData;
    }

    async generateSchedule(sessionId, generatedBy, departmentId = null) {
        try {
            const data = await this.gatherSystemData(sessionId, departmentId);

            if (!data.courses.length) throw new Error("No courses found for this session (that match active batch semesters).");
            if (!data.classrooms.length) throw new Error("No classrooms available.");

            const model = "gemini-flash-latest";

            const prompt = `
            You are an expert academic scheduler. Create an optimized weekly class schedule for a university session.
            
            **Constraints:**
            1. **No Overlaps**: A classroom cannot handle two classes at the same time. A batch cannot attend two classes at the same time.
            2. **Capacity**: Assigned classroom capacity must be >= batch student count.
            3. **Time Slots**: Classes are 1 hour (Theory) or 2 hours (Lab/Workshop). Use 09:00-17:00 window.
            4. **Object Structure**:
            {
                "sessionCourseId": "ID from provided courses",
                "batchId": "ID from provided batches",
                "classroomId": "ID of assigned classroom",
                "daysOfWeek": ["Monday"],
                "startTime": "09:00",
                "endTime": "10:00"
            }
            
            **Input Data:**
            ${JSON.stringify(data)}

            **Task**: 
            Assign all provided 'courses' to slots. 
            Map courses to batches based on 'batchSemester' matching 'semester' and 'department' matching 'department'.
            Do NOT assign teachers.
            `;

            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseJsonSchema: zodToJsonSchema(scheduleSchema),
                },
            });

            const scheduleData = scheduleSchema.parse(JSON.parse(response.text));

            const proposal = await ScheduleProposal.create({
                sessionId,
                generatedBy,
                status: 'pending',
                scheduleData,
                metadata: {
                    generatedAt: new Date(),
                    itemCount: scheduleData.length
                }
            });

            return proposal;

        } catch (error) {
            console.error("AI Schedule Generation Error:", error);
            throw error;
        }
    }

    async getProposals(sessionId) {
        return await ScheduleProposal.find({ sessionId }).sort({ createdAt: -1 });
    }

    async getProposalById(id) {
        console.log(`AIScheduleService: getProposalById called with id=${id}`);
        const proposal = await ScheduleProposal.findById(id).lean();
        if (!proposal) {
            console.log("AIScheduleService: Proposal not found in DB");
            return null;
        }

        try {
            const uniqueBatchIds = [...new Set(proposal.scheduleData.map(i => i.batchId))];
            const uniqueCourseIds = [...new Set(proposal.scheduleData.map(i => i.sessionCourseId))];
            const uniqueRoomIds = [...new Set(proposal.scheduleData.map(i => i.classroomId))];

            const batches = await Batch.find({ _id: { $in: uniqueBatchIds } }).select('name');
            const sessionCourses = await SessionCourse.find({ _id: { $in: uniqueCourseIds } })
                .populate('courseId', 'name code')
                .select('courseId');
            const classrooms = await Classroom.find({ _id: { $in: uniqueRoomIds } }).select('roomNumber buildingName');

            const batchMap = batches.reduce((acc, b) => ({ ...acc, [b._id.toString()]: b.name }), {});
            const courseMap = sessionCourses.reduce((acc, sc) => ({
                ...acc,
                [sc._id.toString()]: sc.courseId ? `${sc.courseId.code}: ${sc.courseId.name}` : 'Unknown Course'
            }), {});
            const roomMap = classrooms.reduce((acc, c) => ({
                ...acc,
                [c._id.toString()]: `${c.roomNumber} (${c.buildingName})`
            }), {});

            proposal.scheduleData = proposal.scheduleData.map(item => ({
                ...item,
                batchName: batchMap[item.batchId] || item.batchId,
                courseName: courseMap[item.sessionCourseId] || item.sessionCourseId,
                roomName: roomMap[item.classroomId] || item.classroomId
            }));

            return proposal;
        } catch (error) {
            return proposal;
        }
    }

    async applyProposal(proposalId) {
        const proposal = await ScheduleProposal.findById(proposalId);
        if (!proposal) throw new Error("Proposal not found");
        if (proposal.status === 'approved') throw new Error("Already approved");

        const session = await Session.findById(proposal.sessionId);

        const schedules = proposal.scheduleData.map(item => ({
            batchId: item.batchId,
            sessionCourseId: item.sessionCourseId,
            classroomId: item.classroomId,
            daysOfWeek: item.daysOfWeek,
            startTime: item.startTime,
            endTime: item.endTime,
            startDate: session.startDate,
            endDate: session.endDate,
            isActive: true
        }));

        await CourseSchedule.insertMany(schedules);

        proposal.status = 'approved';
        await proposal.save();

        return schedules;
    }
}

export default new AIScheduleService();
