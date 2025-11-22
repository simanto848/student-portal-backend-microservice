import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Department from '../models/Department.js';
import Program from '../models/Program.js';
import Course from '../models/Course.js';
import Session from '../models/Session.js';
import SessionCourse from '../models/SessionCourse.js';
import Faculty from '../models/Faculty.js'; // Needed if we create department

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const coursesData = [
    // 1st Semester (18 credits)
    { code: '0613-101', name: 'Structured Programming Languages', credit: 3.0, courseType: 'theory', semester: 1 },
    { code: '0613-102', name: 'Structured Programming Languages Lab', credit: 1.0, courseType: 'lab', semester: 1 },
    { code: '0533-101', name: 'Physics', credit: 3.0, courseType: 'theory', semester: 1 },
    { code: '0533-102', name: 'Physics Lab', credit: 1.0, courseType: 'lab', semester: 1 },
    { code: '0311-101', name: 'Engineering Economics', credit: 3.0, courseType: 'theory', semester: 1 },
    { code: '0231-101', name: 'Communicative English', credit: 3.0, courseType: 'theory', semester: 1 },
    { code: '0211-102', name: 'Engineering Drawing Lab', credit: 1.0, courseType: 'lab', semester: 1 },
    { code: '0541-101', name: 'Linear Algebra and Coordinate Geometry', credit: 3.0, courseType: 'theory', semester: 1 },
    
    // 2nd Semester (19 credits)
    { code: '0613-103', name: 'Data Structures', credit: 3.0, courseType: 'theory', semester: 2 },
    { code: '0613-104', name: 'Data Structures Lab', credit: 1.0, courseType: 'lab', semester: 2 },
    { code: '0613-105', name: 'Discrete Mathematics', credit: 3.0, courseType: 'theory', semester: 2 },
    { code: '0713-101', name: 'Electrical Circuits', credit: 3.0, courseType: 'theory', semester: 2 },
    { code: '0222-101', name: 'Bangladesh Studies', credit: 3.0, courseType: 'theory', semester: 2 },
    { code: '0413-102', name: 'Financial and Managerial Accounting', credit: 3.0, courseType: 'theory', semester: 2 },
    { code: '0541-102', name: 'Differential and Integral Calculus', credit: 3.0, courseType: 'theory', semester: 2 },
    
    // 3rd Semester (20 credits)
    { code: '0613-201', name: 'Object-Oriented Programming Languages', credit: 3.0, courseType: 'theory', semester: 3 },
    { code: '0613-202', name: 'Object-Oriented Programming Languages Lab', credit: 1.0, courseType: 'lab', semester: 3 },
    { code: '0613-203', name: 'Computer Architecture', credit: 3.0, courseType: 'theory', semester: 3 },
    { code: '0713-201', name: 'Electronic Devices and Circuit', credit: 3.0, courseType: 'theory', semester: 3 },
    { code: '0713-202', name: 'Electronic Devices and Circuit Lab', credit: 1.0, courseType: 'lab', semester: 3 },
    { code: '0531-201', name: 'Chemistry', credit: 3.0, courseType: 'theory', semester: 3 },
    { code: '0223-201', name: 'Professional Ethics and Environmental Protection', credit: 3.0, courseType: 'theory', semester: 3 },
    { code: '0541-201', name: 'Differential Equations and Vector Analysis', credit: 3.0, courseType: 'theory', semester: 3 },
    
    // 4th Semester (19.5 credits)
    { code: '0613-205', name: 'Algorithms', credit: 3.0, courseType: 'theory', semester: 4 },
    { code: '0613-206', name: 'Algorithms Lab', credit: 1.0, courseType: 'lab', semester: 4 },
    { code: '0613-207', name: 'Microprocessor and Assembly Language', credit: 3.0, courseType: 'theory', semester: 4 },
    { code: '0613-208', name: 'Microprocessor and Assembly Language Lab', credit: 1.0, courseType: 'lab', semester: 4 },
    { code: '0613-209', name: 'Compiler Design', credit: 3.0, courseType: 'theory', semester: 4 },
    { code: '0713-203', name: 'Digital Logic Design', credit: 3.0, courseType: 'theory', semester: 4 },
    { code: '0713-204', name: 'Digital Logic Design Lab', credit: 1.0, courseType: 'lab', semester: 4 },
    { code: '0413-202', name: 'Business Strategy Management', credit: 1.5, courseType: 'theory', semester: 4 },
    { code: '0542-202', name: 'Statistical Methods and Probability', credit: 3.0, courseType: 'theory', semester: 4 },
    
    // 5th Semester (17 credits)
    { code: '0613-301', name: 'Operating System', credit: 3.0, courseType: 'theory', semester: 5 },
    { code: '0613-302', name: 'Operating System Lab', credit: 1.0, courseType: 'lab', semester: 5 },
    { code: '0612-302', name: 'Data Communication', credit: 3.0, courseType: 'theory', semester: 5 },
    { code: '0613-303', name: 'Software Engineering', credit: 1.5, courseType: 'theory', semester: 5 },
    { code: '0612-303', name: 'Database Management System', credit: 3.0, courseType: 'theory', semester: 5 },
    { code: '0612-304', name: 'Database Management Systems Lab', credit: 1.0, courseType: 'lab', semester: 5 },
    { code: '0612-301', name: 'Information System Management', credit: 1.5, courseType: 'theory', semester: 5 },
    { code: '0541-301', name: 'Complex Variables and Transforms', credit: 3.0, courseType: 'theory', semester: 5 },
    
    // 6th Semester (16.5 credits)
    { code: '0612-305', name: 'Computer Networking', credit: 3.0, courseType: 'theory', semester: 6 },
    { code: '0612-306', name: 'Computer Networking Lab', credit: 1.0, courseType: 'lab', semester: 6 },
    { code: '0613-305', name: 'Markup and Scripting Languages', credit: 3.0, courseType: 'theory', semester: 6 },
    { code: '0613-306', name: 'Markup and Scripting Languages Lab', credit: 1.0, courseType: 'lab', semester: 6 },
    { code: '0613-307', name: 'Software Development Management', credit: 1.5, courseType: 'theory', semester: 6 },
    { code: '0613-308', name: 'Software Development Management Lab', credit: 0.5, courseType: 'lab', semester: 6 },
    { code: '0613-309', name: 'Computer and Cyber security', credit: 3.0, courseType: 'theory', semester: 6 },
    { code: '0613-310', name: 'System Configuration and Performance Evaluation Lab', credit: 1.0, courseType: 'lab', semester: 6 },
    { code: '0232-302', name: 'Technical Writing and Presentation', credit: 1.0, courseType: 'theory', semester: 6 },
    { code: '0541-302', name: 'Numerical Analysis', credit: 1.5, courseType: 'theory', semester: 6 },
    
    // 7th Semester (20 credits)
    { code: '0613-401', name: 'Artificial Intelligence', credit: 3.0, courseType: 'theory', semester: 7 },
    { code: '0613-402', name: 'Artificial Intelligence Lab', credit: 1.0, courseType: 'lab', semester: 7 },
    { code: '0613-403', name: 'Computer Graphics and Multimedia', credit: 3.0, courseType: 'theory', semester: 7 },
    { code: '0613-404', name: 'Computer Graphics and Multimedia Lab', credit: 1.0, courseType: 'lab', semester: 7 },
    { code: '0613-405', name: 'Software Testing and Quality Assurance', credit: 1.5, courseType: 'theory', semester: 7 },
    { code: '0613-406', name: 'Software Testing and Quality Assurance Lab', credit: 0.5, courseType: 'lab', semester: 7 },
    { code: '0613-409', name: 'Mobile Application and Development', credit: 3.0, courseType: 'theory', semester: 7 },
    { code: '0613-410', name: 'Mobile Application and Development Lab', credit: 1.0, courseType: 'lab', semester: 7 },
    { code: '0613-412', name: 'Software Integration and Maintenance', credit: 3.0, courseType: 'theory', semester: 7 },
    { code: '0688-400', name: 'Capstone Project Design', credit: 3.0, courseType: 'project', semester: 7 },
    
    // 8th Semester (18 credits)
    { code: '0541-401', name: 'Elective Course 1', credit: 3.0, courseType: 'theory', semester: 8, isElective: true },
    { code: '0541-402', name: 'Elective Course 2', credit: 3.0, courseType: 'theory', semester: 8, isElective: true },
    { code: '0541-403', name: 'Elective Course 3', credit: 3.0, courseType: 'theory', semester: 8, isElective: true },
    { code: '0413-403', name: 'Elective Course 4', credit: 3.0, courseType: 'theory', semester: 8, isElective: true },
    { code: '0413-401', name: 'Entrepreneurship: Innovation and Commercialization', credit: 3.0, courseType: 'theory', semester: 8 },
    { code: '0688-401', name: 'Capstone Project Implementation', credit: 3.0, courseType: 'project', semester: 8 },
];

const seedCSE = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // 1. Find or Create Faculty (Engineering)
        let faculty = await Faculty.findOne({ name: 'Faculty of Science and Engineering' });
        if (!faculty) {
            faculty = await Faculty.create({
                name: 'Faculty of Science and Engineering',
                shortName: 'FSE',
                email: 'fse@university.edu',
                phone: '1234567890'
            });
            console.log('Faculty created:', faculty.name);
        }

        // 2. Find or Create Department (CSE)
        let department = await Department.findOne({ shortName: 'CSE' });
        if (!department) {
            department = await Department.create({
                name: 'Computer Science and Engineering',
                shortName: 'CSE',
                email: 'cse@university.edu',
                phone: '0987654321',
                facultyId: faculty._id
            });
            console.log('Department created:', department.name);
        } else {
            console.log('Department found:', department.name);
        }

        // 3. Find or Create Program (B.Sc. in CSE)
        let program = await Program.findOne({ shortName: 'B.Sc. in CSE' });
        if (!program) {
            program = await Program.create({
                departmentId: department._id,
                name: 'Bachelor of Science in Computer Science and Engineering',
                shortName: 'B.Sc. in CSE',
                duration: 4,
                totalCredits: 160
            });
            console.log('Program created:', program.name);
        }

        // 4. Create Courses
        const createdCourses = [];
        for (const courseData of coursesData) {
            let course = await Course.findOne({ code: courseData.code });
            if (!course) {
                course = await Course.create({
                    ...courseData,
                    departmentId: department._id,
                    description: `${courseData.name} course for CSE`
                });
                console.log(`Course created: ${course.code} - ${course.name}`);
            } else {
                console.log(`Course exists: ${course.code}`);
            }
            createdCourses.push({ ...course.toObject(), semester: courseData.semester });
        }

        // 5. Find or Create Session
        const sessionName = 'Spring 2024';
        let session = await Session.findOne({ name: sessionName });
        if (!session) {
            session = await Session.create({
                name: sessionName,
                year: 2024,
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-06-30')
            });
            console.log('Session created:', session.name);
        }

        // 6. Create Session Courses
        for (const course of createdCourses) {
            const exists = await SessionCourse.findOne({
                sessionId: session._id,
                courseId: course._id,
                departmentId: department._id
            });

            if (!exists) {
                await SessionCourse.create({
                    sessionId: session._id,
                    courseId: course._id,
                    semester: course.semester,
                    departmentId: department._id
                });
                console.log(`Session Course created: ${course.code} for Semester ${course.semester}`);
            } else {
                console.log(`Session Course exists: ${course.code}`);
            }
        }

        console.log('Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedCSE();
