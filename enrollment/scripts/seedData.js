import { config } from "dotenv";
import axios from "axios";

// Load environment variables
config();

// Service URLs
const ACADEMIC_SERVICE = process.env.ACADEMIC_SERVICE_URL || 'http://localhost:8001';
const USER_SERVICE = process.env.USER_SERVICE_URL || 'http://localhost:8007';
const ENROLLMENT_SERVICE = process.env.ENROLLMENT_SERVICE_URL || 'http://localhost:3003';

// CSE Courses for all 8 semesters
const CSE_COURSES = {
    semester1: [
        { name: 'Structured Programming Language', code: 'CSE-101', credit: 3, courseType: 'theory' },
        { name: 'Structured Programming Language Lab', code: 'CSE-102', credit: 1.5, courseType: 'lab' },
        { name: 'Discrete Mathematics', code: 'CSE-103', credit: 3, courseType: 'theory' },
        { name: 'Engineering Drawing and CAD', code: 'ME-101', credit: 1.5, courseType: 'lab' },
        { name: 'Physics I', code: 'PHY-101', credit: 3, courseType: 'theory' },
        { name: 'Physics I Lab', code: 'PHY-102', credit: 1.5, courseType: 'lab' },
    ],
    semester2: [
        { name: 'Object Oriented Programming', code: 'CSE-201', credit: 3, courseType: 'theory' },
        { name: 'Object Oriented Programming Lab', code: 'CSE-202', credit: 1.5, courseType: 'lab' },
        { name: 'Data Structures', code: 'CSE-203', credit: 3, courseType: 'theory' },
        { name: 'Data Structures Lab', code: 'CSE-204', credit: 1.5, courseType: 'lab' },
        { name: 'Digital Logic Design', code: 'CSE-205', credit: 3, courseType: 'theory' },
        { name: 'Digital Logic Design Lab', code: 'CSE-206', credit: 1.5, courseType: 'lab' },
    ],
    semester3: [
        { name: 'Algorithms', code: 'CSE-301', credit: 3, courseType: 'theory' },
        { name: 'Algorithms Lab', code: 'CSE-302', credit: 1.5, courseType: 'lab' },
        { name: 'Database Management Systems', code: 'CSE-303', credit: 3, courseType: 'theory' },
        { name: 'Database Management Systems Lab', code: 'CSE-304', credit: 1.5, courseType: 'lab' },
        { name: 'Computer Architecture', code: 'CSE-305', credit: 3, courseType: 'theory' },
        { name: 'Mathematics III', code: 'MATH-301', credit: 3, courseType: 'theory' },
    ],
    semester4: [
        { name: 'Operating Systems', code: 'CSE-401', credit: 3, courseType: 'theory' },
        { name: 'Operating Systems Lab', code: 'CSE-402', credit: 1.5, courseType: 'lab' },
        { name: 'Software Engineering', code: 'CSE-403', credit: 3, courseType: 'theory' },
        { name: 'Software Engineering Lab', code: 'CSE-404', credit: 1.5, courseType: 'lab' },
        { name: 'Computer Networks', code: 'CSE-405', credit: 3, courseType: 'theory' },
        { name: 'Computer Networks Lab', code: 'CSE-406', credit: 1.5, courseType: 'lab' },
    ],
    semester5: [
        { name: 'Artificial Intelligence', code: 'CSE-501', credit: 3, courseType: 'theory' },
        { name: 'Artificial Intelligence Lab', code: 'CSE-502', credit: 1.5, courseType: 'lab' },
        { name: 'Compiler Design', code: 'CSE-503', credit: 3, courseType: 'theory' },
        { name: 'Compiler Design Lab', code: 'CSE-504', credit: 1.5, courseType: 'lab' },
        { name: 'Web Technologies', code: 'CSE-505', credit: 3, courseType: 'theory' },
        { name: 'Web Technologies Lab', code: 'CSE-506', credit: 1.5, courseType: 'lab' },
    ],
    semester6: [
        { name: 'Machine Learning', code: 'CSE-601', credit: 3, courseType: 'theory' },
        { name: 'Machine Learning Lab', code: 'CSE-602', credit: 1.5, courseType: 'lab' },
        { name: 'Mobile Application Development', code: 'CSE-603', credit: 3, courseType: 'theory' },
        { name: 'Mobile Application Development Lab', code: 'CSE-604', credit: 1.5, courseType: 'lab' },
        { name: 'Cyber Security', code: 'CSE-605', credit: 3, courseType: 'theory', isElective: true },
        { name: 'Cloud Computing', code: 'CSE-607', credit: 3, courseType: 'theory', isElective: true },
    ],
    semester7: [
        { name: 'Distributed Systems', code: 'CSE-701', credit: 3, courseType: 'theory' },
        { name: 'Blockchain Technology', code: 'CSE-703', credit: 3, courseType: 'theory', isElective: true },
        { name: 'Internet of Things', code: 'CSE-705', credit: 3, courseType: 'theory', isElective: true },
        { name: 'Project Work I', code: 'CSE-707', credit: 2, courseType: 'project' },
    ],
    semester8: [
        { name: 'Project Work II', code: 'CSE-801', credit: 4, courseType: 'project' },
        { name: 'Industrial Training', code: 'CSE-803', credit: 2, courseType: 'project' },
    ],
};

async function seedData() {
    console.log('🌱 Starting data seeding process...\n');

    try {
        // Step 1: Get or Create CSE Department
        console.log('📚 Step 1: Finding CSE Department...');
        const deptResponse = await axios.get(`${ACADEMIC_SERVICE}/departments?shortName=CSE`);
        let cseDepartment;
        
        if (deptResponse.data.data.data && deptResponse.data.data.data.length > 0) {
            cseDepartment = deptResponse.data.data.data[0];
            console.log(`✅ CSE Department found: ${cseDepartment.name} (ID: ${cseDepartment.id})`);
        } else {
            console.log('❌ CSE Department not found. Please create it first.');
            process.exit(1);
        }

        // Step 2: Get or Create Session
        console.log('\n📅 Step 2: Finding or creating Session...');
        const currentYear = new Date().getFullYear();
        const sessionsResponse = await axios.get(`${ACADEMIC_SERVICE}/sessions?year=${currentYear}`);
        let session;

        if (sessionsResponse.data.data.data && sessionsResponse.data.data.data.length > 0) {
            session = sessionsResponse.data.data.data[0];
            console.log(`✅ Session found: ${session.name} (ID: ${session.id})`);
        } else {
            console.log('Creating new session...');
            const sessionData = {
                name: `Session ${currentYear}-${currentYear + 1}`,
                year: currentYear,
                startDate: new Date(),
                endDate: new Date(currentYear + 1, 11, 31)
            };
            const sessionCreateResponse = await axios.post(`${ACADEMIC_SERVICE}/sessions`, sessionData);
            session = sessionCreateResponse.data.data;
            console.log(`✅ Session created: ${session.name} (ID: ${session.id})`);
        }

        // Step 3: Create Courses
        console.log('\n📖 Step 3: Creating CSE Courses...');
        const createdCourses = [];

        for (const [semesterKey, courses] of Object.entries(CSE_COURSES)) {
            console.log(`  Creating ${semesterKey} courses...`);
            for (const course of courses) {
                try {
                    const courseData = {
                        ...course,
                        departmentId: cseDepartment.id,
                        isElective: course.isElective || false
                    };
                    const response = await axios.post(`${ACADEMIC_SERVICE}/courses`, courseData);
                    createdCourses.push({ ...response.data.data, semesterNum: parseInt(semesterKey.replace('semester', '')) });
                    console.log(`    ✓ ${course.name} (${course.code})`);
                } catch (error) {
                    if (error.response?.status === 409) {
                        console.log(`    ⚠ ${course.name} already exists, fetching...`);
                        const existingResponse = await axios.get(`${ACADEMIC_SERVICE}/courses?code=${course.code}`);
                        if (existingResponse.data.data.data && existingResponse.data.data.data.length > 0) {
                            createdCourses.push({ ...existingResponse.data.data.data[0], semesterNum: parseInt(semesterKey.replace('semester', '')) });
                        }
                    } else {
                        console.error(`    ✗ Error creating ${course.name}:`, error.response?.data?.message || error.message);
                    }
                }
            }
        }

        console.log(`✅ Total courses created/found: ${createdCourses.length}`);

        // Step 4: Create Session Courses
        console.log('\n🔗 Step 4: Creating Session Courses...');
        const createdSessionCourses = [];

        for (const course of createdCourses) {
            try {
                const sessionCourseData = {
                    sessionId: session.id,
                    courseId: course.id,
                    semester: course.semesterNum,
                    departmentId: cseDepartment.id
                };
                const response = await axios.post(`${ACADEMIC_SERVICE}/session-courses`, sessionCourseData);
                createdSessionCourses.push(response.data.data);
                console.log(`  ✓ ${course.name} - Semester ${course.semesterNum}`);
            } catch (error) {
                if (error.response?.status === 409 || error.response?.data?.message?.includes('already exists')) {
                    console.log(`  ⚠ Session course already exists for ${course.name}`);
                    // Try to fetch existing
                    try {
                        const existingResponse = await axios.get(
                            `${ACADEMIC_SERVICE}/session-courses?sessionId=${session.id}&courseId=${course.id}`
                        );
                        if (existingResponse.data.data.data && existingResponse.data.data.data.length > 0) {
                            createdSessionCourses.push(existingResponse.data.data.data[0]);
                        }
                    } catch (fetchError) {
                        console.error(`  ✗ Error fetching existing session course:`, fetchError.message);
                    }
                } else {
                    console.error(`  ✗ Error creating session course for ${course.name}:`, error.response?.data?.message || error.message);
                }
            }
        }

        console.log(`✅ Total session courses created/found: ${createdSessionCourses.length}`);

        // Step 5: Get Program and Batch
        console.log('\n🎓 Step 5: Finding Program and Batch...');
        const programsResponse = await axios.get(`${ACADEMIC_SERVICE}/programs?departmentId=${cseDepartment.id}`);
        let program;

        if (programsResponse.data.data.data && programsResponse.data.data.data.length > 0) {
            program = programsResponse.data.data.data[0];
            console.log(`✅ Program found: ${program.name} (ID: ${program.id})`);
        } else {
            console.log('Creating program...');
            const programData = {
                name: 'Bachelor of Science in Computer Science and Engineering',
                shortName: 'BSc in CSE',
                departmentId: cseDepartment.id,
                duration: 4,
                totalCredits: 160
            };
            const programCreateResponse = await axios.post(`${ACADEMIC_SERVICE}/programs`, programData);
            program = programCreateResponse.data.data;
            console.log(`✅ Program created: ${program.name}`);
        }

        // Get or create batch
        const batchesResponse = await axios.get(`${ACADEMIC_SERVICE}/batches?departmentId=${cseDepartment.id}&sessionId=${session.id}`);
        let batch;

        if (batchesResponse.data.data.data && batchesResponse.data.data.data.length > 0) {
            batch = batchesResponse.data.data.data[0];
            console.log(`✅ Batch found: ${batch.name} (ID: ${batch.id})`);
        } else {
            console.log('Creating batch...');
            const batchData = {
                name: `Batch-${currentYear}`,
                year: currentYear,
                programId: program.id,
                departmentId: cseDepartment.id,
                sessionId: session.id,
                maxStudents: 60,
                currentStudents: 0
            };
            const batchCreateResponse = await axios.post(`${ACADEMIC_SERVICE}/batches`, batchData);
            batch = batchCreateResponse.data.data;
            console.log(`✅ Batch created: ${batch.name}`);
        }

        // Step 6: Create Teachers
        console.log('\n👨‍🏫 Step 6: Creating Teachers...');
        const teachers = [
            { fullName: 'Dr. Mohammad Rahman', email: 'dr.rahman@university.edu', designation: 'professor' },
            { fullName: 'Dr. Fatima Ahmed', email: 'dr.ahmed@university.edu', designation: 'associate_professor' },
            { fullName: 'Mr. Abdul Karim', email: 'abdul.karim@university.edu', designation: 'assistant_professor' },
            { fullName: 'Ms. Nafisa Islam', email: 'nafisa.islam@university.edu', designation: 'lecturer' },
            { fullName: 'Mr. Tanvir Hossain', email: 'tanvir.hossain@university.edu', designation: 'lecturer' },
        ];

        const createdTeachers = [];
        for (const teacher of teachers) {
            try {
                const teacherData = {
                    ...teacher,
                    password: 'Teacher@123',
                    registrationNumber: `T-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    departmentId: cseDepartment.id,
                    joiningDate: new Date()
                };
                const response = await axios.post(`${USER_SERVICE}/teachers`, teacherData);
                createdTeachers.push(response.data.data);
                console.log(`  ✓ ${teacher.fullName} (${teacher.designation})`);
            } catch (error) {
                if (error.response?.status === 409) {
                    console.log(`  ⚠ ${teacher.fullName} already exists`);
                } else {
                    console.error(`  ✗ Error creating ${teacher.fullName}:`, error.response?.data?.message || error.message);
                }
            }
        }

        console.log(`✅ Total teachers created: ${createdTeachers.length}`);

        // Step 7: Create Students with Auto-enrollment
        console.log('\n👨‍🎓 Step 7: Creating Students...');
        const students = [
            { fullName: 'Ahmed Hassan', email: 'ahmed.hassan@student.edu' },
            { fullName: 'Tasnim Akter', email: 'tasnim.akter@student.edu' },
            { fullName: 'Rafiq Islam', email: 'rafiq.islam@student.edu' },
            { fullName: 'Sabrina Khan', email: 'sabrina.khan@student.edu' },
            { fullName: 'Kamal Uddin', email: 'kamal.uddin@student.edu' },
            { fullName: 'Nusrat Jahan', email: 'nusrat.jahan@student.edu' },
            { fullName: 'Imran Ali', email: 'imran.ali@student.edu' },
            { fullName: 'Farida Begum', email: 'farida.begum@student.edu' },
        ];

        const createdStudents = [];
        for (const student of students) {
            try {
                const studentData = {
                    ...student,
                    departmentId: cseDepartment.id,
                    programId: program.id,
                    batchId: batch.id,
                    sessionId: session.id
                };
                const response = await axios.post(`${USER_SERVICE}/students`, studentData);
                createdStudents.push(response.data.data);
                console.log(`  ✓ ${student.fullName}`);
            } catch (error) {
                if (error.response?.status === 409) {
                    console.log(`  ⚠ ${student.fullName} already exists`);
                    // Try to fetch existing student
                    try {
                        const existingResponse = await axios.get(`${USER_SERVICE}/students?email=${student.email}`);
                        if (existingResponse.data.data.students && existingResponse.data.data.students.length > 0) {
                            createdStudents.push(existingResponse.data.data.students[0]);
                        }
                    } catch (fetchError) {
                        console.error(`  ✗ Error fetching existing student:`, fetchError.message);
                    }
                } else {
                    console.error(`  ✗ Error creating ${student.fullName}:`, error.response?.data?.message || error.message);
                }
            }
        }

        console.log(`✅ Total students created/found: ${createdStudents.length}`);

        // Step 8: Auto-enroll students in first semester courses
        console.log('\n📝 Step 8: Auto-enrolling students in Semester 1 courses...');
        const semester1SessionCourses = createdSessionCourses.filter(sc => sc.semester === 1);
        
        console.log(`Found ${semester1SessionCourses.length} session courses for Semester 1`);
        
        const enrollments = [];
        for (const student of createdStudents) {
            for (const sessionCourse of semester1SessionCourses) {
                enrollments.push({
                    studentId: student.id,
                    sessionCourseId: sessionCourse.id,
                    sessionId: session.id,
                    courseId: sessionCourse.courseId,
                    semester: 1,
                    departmentId: cseDepartment.id,
                    enrollmentStatus: 'enrolled'
                });
            }
        }

        console.log(`Creating ${enrollments.length} enrollments (${createdStudents.length} students × ${semester1SessionCourses.length} courses)...`);

        try {
            const enrollResponse = await axios.post(`${ENROLLMENT_SERVICE}/enrollments/bulk`, { enrollments });
            console.log(`✅ Successfully created ${enrollResponse.data.data.length} enrollments`);
        } catch (error) {
            if (error.response?.status === 409) {
                console.log('⚠ Some enrollments already exist, creating individually...');
                let successCount = 0;
                for (const enrollment of enrollments) {
                    try {
                        await axios.post(`${ENROLLMENT_SERVICE}/enrollments`, enrollment);
                        successCount++;
                    } catch (err) {
                        if (err.response?.status !== 409) {
                            console.error(`  ✗ Error creating enrollment:`, err.response?.data?.message || err.message);
                        }
                    }
                }
                console.log(`✅ Created ${successCount} new enrollments`);
            } else {
                console.error('✗ Error creating bulk enrollments:', error.response?.data?.message || error.message);
            }
        }

        console.log('\n🎉 Data seeding completed successfully!\n');
        console.log('Summary:');
        console.log(`  - Department: ${cseDepartment.name}`);
        console.log(`  - Session: ${session.name}`);
        console.log(`  - Program: ${program.name}`);
        console.log(`  - Batch: ${batch.name}`);
        console.log(`  - Courses: ${createdCourses.length}`);
        console.log(`  - Session Courses: ${createdSessionCourses.length}`);
        console.log(`  - Teachers: ${createdTeachers.length}`);
        console.log(`  - Students: ${createdStudents.length}`);
        console.log(`  - Enrollments: ${createdStudents.length * semester1SessionCourses.length}`);

        return {
            department: cseDepartment,
            session,
            program,
            batch,
            courses: createdCourses,
            sessionCourses: createdSessionCourses,
            teachers: createdTeachers,
            students: createdStudents
        };

    } catch (error) {
        console.error('\n❌ Error during seeding:', error.response?.data || error.message);
        throw error;
    }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedData()
        .then(() => {
            console.log('Seeding completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Seeding failed:', error);
            process.exit(1);
        });
}

export default seedData;
