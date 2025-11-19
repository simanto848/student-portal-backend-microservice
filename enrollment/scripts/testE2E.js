import { config } from "dotenv";
import axios from "axios";
import seedData from "./seedData.js";

// Load environment variables
config();

// Service URLs
const ENROLLMENT_SERVICE = process.env.ENROLLMENT_SERVICE_URL || 'http://localhost:3003';

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

let testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function recordTest(name, passed, message = '') {
    testResults.tests.push({ name, passed, message });
    if (passed) {
        testResults.passed++;
        log('green', `✓ ${name}`);
    } else {
        testResults.failed++;
        log('red', `✗ ${name}: ${message}`);
    }
}

async function testEnrollmentRoutes(seededData) {
    console.log('\n' + '='.repeat(80));
    log('cyan', '🧪 COMPREHENSIVE ENROLLMENT E2E TESTING');
    console.log('='.repeat(80) + '\n');

    const { students, sessionCourses } = seededData;
    let createdEnrollmentId = null;
    let testEnrollment = null;

    try {
        // Test 1: Health Check
        log('blue', '\n📋 Test 1: Health Check');
        try {
            const response = await axios.get(`${ENROLLMENT_SERVICE}/health`);
            recordTest('Health check endpoint', response.status === 200 && response.data.status === true);
        } catch (error) {
            recordTest('Health check endpoint', false, error.message);
        }

        // Test 2: GET all enrollments (with pagination)
        log('blue', '\n📋 Test 2: GET All Enrollments (with pagination)');
        try {
            const response = await axios.get(`${ENROLLMENT_SERVICE}/enrollments?page=1&limit=5`);
            recordTest('GET /enrollments with pagination', 
                response.status === 200 && 
                response.data.success === true &&
                response.data.data.pagination !== undefined
            );
            log('yellow', `  Found ${response.data.data.pagination.total} total enrollments`);
        } catch (error) {
            recordTest('GET /enrollments with pagination', false, error.message);
        }

        // Test 3: GET all enrollments (without pagination)
        log('blue', '\n📋 Test 3: GET All Enrollments (without pagination)');
        try {
            const response = await axios.get(`${ENROLLMENT_SERVICE}/enrollments`);
            recordTest('GET /enrollments without pagination', 
                response.status === 200 && 
                response.data.success === true
            );
        } catch (error) {
            recordTest('GET /enrollments without pagination', false, error.message);
        }

        // Test 4: GET enrollments with filters
        log('blue', '\n📋 Test 4: GET Enrollments with filters');
        try {
            const response = await axios.get(`${ENROLLMENT_SERVICE}/enrollments?semester=1&enrollmentStatus=enrolled`);
            recordTest('GET /enrollments with filters', 
                response.status === 200 && 
                response.data.success === true
            );
            log('yellow', `  Found ${response.data.data.pagination?.total || response.data.data.data?.length || 0} enrollments for semester 1`);
        } catch (error) {
            recordTest('GET /enrollments with filters', false, error.message);
        }

        // Test 5: GET enrollments by student
        log('blue', '\n📋 Test 5: GET Enrollments by Student');
        if (students && students.length > 0) {
            try {
                const studentId = students[0].id;
                const response = await axios.get(`${ENROLLMENT_SERVICE}/enrollments/student/${studentId}`);
                recordTest('GET /enrollments/student/:studentId', 
                    response.status === 200 && 
                    response.data.success === true &&
                    Array.isArray(response.data.data)
                );
                log('yellow', `  Student has ${response.data.data.length} enrollments`);
            } catch (error) {
                recordTest('GET /enrollments/student/:studentId', false, error.message);
            }
        } else {
            recordTest('GET /enrollments/student/:studentId', false, 'No students available for testing');
        }

        // Test 6: GET enrollments by semester
        log('blue', '\n📋 Test 6: GET Enrollments by Department and Semester');
        if (seededData.department) {
            try {
                const response = await axios.get(
                    `${ENROLLMENT_SERVICE}/enrollments/department/${seededData.department.id}/semester/1`
                );
                recordTest('GET /enrollments/department/:departmentId/semester/:semester', 
                    response.status === 200 && 
                    response.data.success === true &&
                    Array.isArray(response.data.data)
                );
                log('yellow', `  Found ${response.data.data.length} enrollments for semester 1`);
            } catch (error) {
                recordTest('GET /enrollments/department/:departmentId/semester/:semester', false, error.message);
            }
        } else {
            recordTest('GET /enrollments/department/:departmentId/semester/:semester', false, 'No department available');
        }

        // Test 7: POST Create Single Enrollment
        log('blue', '\n📋 Test 7: POST Create Single Enrollment');
        if (students && students.length > 1 && sessionCourses && sessionCourses.length > 0) {
            try {
                const semester2Course = sessionCourses.find(sc => sc.semester === 2);
                if (semester2Course) {
                    testEnrollment = {
                        studentId: students[1].id,
                        sessionCourseId: semester2Course.id,
                        sessionId: semester2Course.sessionId,
                        courseId: semester2Course.courseId,
                        semester: 2,
                        departmentId: seededData.department.id,
                        enrollmentStatus: 'enrolled'
                    };
                    const response = await axios.post(`${ENROLLMENT_SERVICE}/enrollments`, testEnrollment);
                    createdEnrollmentId = response.data.data.id;
                    recordTest('POST /enrollments (create single)', 
                        response.status === 201 && 
                        response.data.success === true &&
                        response.data.data.id !== undefined
                    );
                    log('yellow', `  Created enrollment with ID: ${createdEnrollmentId}`);
                } else {
                    recordTest('POST /enrollments (create single)', false, 'No semester 2 course found');
                }
            } catch (error) {
                recordTest('POST /enrollments (create single)', false, error.response?.data?.message || error.message);
            }
        } else {
            recordTest('POST /enrollments (create single)', false, 'Insufficient test data');
        }

        // Test 8: POST Create Duplicate Enrollment (Should Fail)
        log('blue', '\n📋 Test 8: POST Create Duplicate Enrollment (Error Case)');
        if (testEnrollment) {
            try {
                await axios.post(`${ENROLLMENT_SERVICE}/enrollments`, testEnrollment);
                recordTest('POST /enrollments (duplicate check)', false, 'Should have thrown conflict error');
            } catch (error) {
                recordTest('POST /enrollments (duplicate check)', 
                    error.response?.status === 409,
                    error.response?.status !== 409 ? `Expected 409, got ${error.response?.status}` : ''
                );
            }
        } else {
            recordTest('POST /enrollments (duplicate check)', false, 'No test enrollment created');
        }

        // Test 9: GET Single Enrollment by ID
        log('blue', '\n📋 Test 9: GET Single Enrollment by ID');
        if (createdEnrollmentId) {
            try {
                const response = await axios.get(`${ENROLLMENT_SERVICE}/enrollments/${createdEnrollmentId}`);
                recordTest('GET /enrollments/:id', 
                    response.status === 200 && 
                    response.data.success === true &&
                    response.data.data.id === createdEnrollmentId
                );
            } catch (error) {
                recordTest('GET /enrollments/:id', false, error.response?.data?.message || error.message);
            }
        } else {
            recordTest('GET /enrollments/:id', false, 'No enrollment ID available');
        }

        // Test 10: GET Non-existent Enrollment (Should Fail)
        log('blue', '\n📋 Test 10: GET Non-existent Enrollment (Error Case)');
        try {
            await axios.get(`${ENROLLMENT_SERVICE}/enrollments/non-existent-id-12345`);
            recordTest('GET /enrollments/:id (non-existent)', false, 'Should have thrown not found error');
        } catch (error) {
            recordTest('GET /enrollments/:id (non-existent)', 
                error.response?.status === 404 || error.response?.status === 400,
                error.response?.status !== 404 && error.response?.status !== 400 ? `Expected 404 or 400, got ${error.response?.status}` : ''
            );
        }

        // Test 11: PATCH Update Enrollment
        log('blue', '\n📋 Test 11: PATCH Update Enrollment');
        if (createdEnrollmentId) {
            try {
                const updateData = {
                    enrollmentStatus: 'in_progress',
                    obtainedMarks: 75,
                    totalMarks: 100
                };
                const response = await axios.patch(`${ENROLLMENT_SERVICE}/enrollments/${createdEnrollmentId}`, updateData);
                recordTest('PATCH /enrollments/:id', 
                    response.status === 200 && 
                    response.data.success === true &&
                    response.data.data.enrollmentStatus === 'in_progress'
                );
                log('yellow', `  Updated enrollment status to: ${response.data.data.enrollmentStatus}`);
            } catch (error) {
                recordTest('PATCH /enrollments/:id', false, error.response?.data?.message || error.message);
            }
        } else {
            recordTest('PATCH /enrollments/:id', false, 'No enrollment ID available');
        }

        // Test 12: PATCH Update with Grade
        log('blue', '\n📋 Test 12: PATCH Update Enrollment with Grade');
        if (createdEnrollmentId) {
            try {
                const updateData = {
                    enrollmentStatus: 'completed',
                    grade: 'A',
                    gradePoint: 4.0,
                    completedAt: new Date()
                };
                const response = await axios.patch(`${ENROLLMENT_SERVICE}/enrollments/${createdEnrollmentId}`, updateData);
                recordTest('PATCH /enrollments/:id (with grade)', 
                    response.status === 200 && 
                    response.data.success === true &&
                    response.data.data.grade === 'A'
                );
                log('yellow', `  Updated grade to: ${response.data.data.grade} (${response.data.data.gradePoint})`);
            } catch (error) {
                recordTest('PATCH /enrollments/:id (with grade)', false, error.response?.data?.message || error.message);
            }
        } else {
            recordTest('PATCH /enrollments/:id (with grade)', false, 'No enrollment ID available');
        }

        // Test 13: PATCH Update Non-existent Enrollment (Should Fail)
        log('blue', '\n📋 Test 13: PATCH Update Non-existent Enrollment (Error Case)');
        try {
            await axios.patch(`${ENROLLMENT_SERVICE}/enrollments/non-existent-id-12345`, { grade: 'A+' });
            recordTest('PATCH /enrollments/:id (non-existent)', false, 'Should have thrown not found error');
        } catch (error) {
            recordTest('PATCH /enrollments/:id (non-existent)', 
                error.response?.status === 404 || error.response?.status === 400,
                error.response?.status !== 404 && error.response?.status !== 400 ? `Expected 404 or 400, got ${error.response?.status}` : ''
            );
        }

        // Test 14: POST Bulk Create Enrollments
        log('blue', '\n📋 Test 14: POST Bulk Create Enrollments');
        if (students && students.length > 2 && sessionCourses && sessionCourses.length > 0) {
            try {
                const semester3Courses = sessionCourses.filter(sc => sc.semester === 3);
                if (semester3Courses.length > 0) {
                    const bulkEnrollments = [];
                    for (let i = 0; i < Math.min(2, students.length); i++) {
                        for (let j = 0; j < Math.min(3, semester3Courses.length); j++) {
                            bulkEnrollments.push({
                                studentId: students[i].id,
                                sessionCourseId: semester3Courses[j].id,
                                sessionId: semester3Courses[j].sessionId,
                                courseId: semester3Courses[j].courseId,
                                semester: 3,
                                departmentId: seededData.department.id,
                                enrollmentStatus: 'enrolled'
                            });
                        }
                    }
                    const response = await axios.post(`${ENROLLMENT_SERVICE}/enrollments/bulk`, { enrollments: bulkEnrollments });
                    recordTest('POST /enrollments/bulk', 
                        response.status === 201 && 
                        response.data.success === true &&
                        Array.isArray(response.data.data) &&
                        response.data.data.length === bulkEnrollments.length
                    );
                    log('yellow', `  Created ${response.data.data.length} bulk enrollments`);
                } else {
                    recordTest('POST /enrollments/bulk', false, 'No semester 3 courses found');
                }
            } catch (error) {
                recordTest('POST /enrollments/bulk', false, error.response?.data?.message || error.message);
            }
        } else {
            recordTest('POST /enrollments/bulk', false, 'Insufficient test data');
        }

        // Test 15: POST Bulk Create with Empty Array (Should Fail)
        log('blue', '\n📋 Test 15: POST Bulk Create with Empty Array (Error Case)');
        try {
            await axios.post(`${ENROLLMENT_SERVICE}/enrollments/bulk`, { enrollments: [] });
            recordTest('POST /enrollments/bulk (empty array)', false, 'Should have thrown validation error');
        } catch (error) {
            recordTest('POST /enrollments/bulk (empty array)', 
                error.response?.status === 400,
                error.response?.status !== 400 ? `Expected 400, got ${error.response?.status}` : ''
            );
        }

        // Test 16: POST Bulk Create with Invalid Data (Should Fail)
        log('blue', '\n📋 Test 16: POST Bulk Create with Invalid Data (Error Case)');
        try {
            await axios.post(`${ENROLLMENT_SERVICE}/enrollments/bulk`, { enrollments: [{ invalidField: 'test' }] });
            recordTest('POST /enrollments/bulk (invalid data)', false, 'Should have thrown validation error');
        } catch (error) {
            recordTest('POST /enrollments/bulk (invalid data)', 
                error.response?.status === 400 || error.response?.status === 500,
                error.response?.status !== 400 && error.response?.status !== 500 ? `Expected 400 or 500, got ${error.response?.status}` : ''
            );
        }

        // Test 17: DELETE Enrollment (Soft Delete)
        log('blue', '\n📋 Test 17: DELETE Enrollment (Soft Delete)');
        if (createdEnrollmentId) {
            try {
                const response = await axios.delete(`${ENROLLMENT_SERVICE}/enrollments/${createdEnrollmentId}`);
                recordTest('DELETE /enrollments/:id', 
                    response.status === 200 && 
                    response.data.success === true
                );
                log('yellow', `  Soft deleted enrollment: ${createdEnrollmentId}`);
            } catch (error) {
                recordTest('DELETE /enrollments/:id', false, error.response?.data?.message || error.message);
            }
        } else {
            recordTest('DELETE /enrollments/:id', false, 'No enrollment ID available');
        }

        // Test 18: GET Deleted Enrollment (Should Not Be Found)
        log('blue', '\n📋 Test 18: GET Deleted Enrollment (Should Not Be Found)');
        if (createdEnrollmentId) {
            try {
                await axios.get(`${ENROLLMENT_SERVICE}/enrollments/${createdEnrollmentId}`);
                recordTest('GET /enrollments/:id (deleted)', false, 'Should have thrown not found error');
            } catch (error) {
                recordTest('GET /enrollments/:id (deleted)', 
                    error.response?.status === 404,
                    error.response?.status !== 404 ? `Expected 404, got ${error.response?.status}` : ''
                );
            }
        } else {
            recordTest('GET /enrollments/:id (deleted)', false, 'No enrollment ID available');
        }

        // Test 19: POST Restore Enrollment
        log('blue', '\n📋 Test 19: POST Restore Enrollment');
        if (createdEnrollmentId) {
            try {
                const response = await axios.post(`${ENROLLMENT_SERVICE}/enrollments/${createdEnrollmentId}/restore`);
                recordTest('POST /enrollments/:id/restore', 
                    response.status === 200 && 
                    response.data.success === true
                );
                log('yellow', `  Restored enrollment: ${createdEnrollmentId}`);
            } catch (error) {
                recordTest('POST /enrollments/:id/restore', false, error.response?.data?.message || error.message);
            }
        } else {
            recordTest('POST /enrollments/:id/restore', false, 'No enrollment ID available');
        }

        // Test 20: GET Restored Enrollment
        log('blue', '\n📋 Test 20: GET Restored Enrollment');
        if (createdEnrollmentId) {
            try {
                const response = await axios.get(`${ENROLLMENT_SERVICE}/enrollments/${createdEnrollmentId}`);
                recordTest('GET /enrollments/:id (restored)', 
                    response.status === 200 && 
                    response.data.success === true &&
                    response.data.data.id === createdEnrollmentId
                );
            } catch (error) {
                recordTest('GET /enrollments/:id (restored)', false, error.response?.data?.message || error.message);
            }
        } else {
            recordTest('GET /enrollments/:id (restored)', false, 'No enrollment ID available');
        }

        // Test 21: DELETE Non-existent Enrollment (Should Fail)
        log('blue', '\n📋 Test 21: DELETE Non-existent Enrollment (Error Case)');
        try {
            await axios.delete(`${ENROLLMENT_SERVICE}/enrollments/non-existent-id-12345`);
            recordTest('DELETE /enrollments/:id (non-existent)', false, 'Should have thrown not found error');
        } catch (error) {
            recordTest('DELETE /enrollments/:id (non-existent)', 
                error.response?.status === 404 || error.response?.status === 400,
                error.response?.status !== 404 && error.response?.status !== 400 ? `Expected 404 or 400, got ${error.response?.status}` : ''
            );
        }

        // Test 22: POST Create Enrollment with Missing Required Fields (Should Fail)
        log('blue', '\n📋 Test 22: POST Create with Missing Required Fields (Error Case)');
        try {
            await axios.post(`${ENROLLMENT_SERVICE}/enrollments`, { studentId: 'test' });
            recordTest('POST /enrollments (missing fields)', false, 'Should have thrown validation error');
        } catch (error) {
            recordTest('POST /enrollments (missing fields)', 
                error.response?.status === 400 || error.response?.status === 500,
                error.response?.status !== 400 && error.response?.status !== 500 ? `Expected 400 or 500, got ${error.response?.status}` : ''
            );
        }

        // Test 23: PATCH with Invalid Grade Value (Should Fail)
        log('blue', '\n📋 Test 23: PATCH with Invalid Grade Value (Error Case)');
        if (createdEnrollmentId) {
            try {
                await axios.patch(`${ENROLLMENT_SERVICE}/enrollments/${createdEnrollmentId}`, { grade: 'Z' });
                recordTest('PATCH /enrollments/:id (invalid grade)', false, 'Should have thrown validation error');
            } catch (error) {
                recordTest('PATCH /enrollments/:id (invalid grade)', 
                    error.response?.status === 400 || error.response?.status === 500,
                    error.response?.status !== 400 && error.response?.status !== 500 ? `Expected 400 or 500, got ${error.response?.status}` : ''
                );
            }
        } else {
            recordTest('PATCH /enrollments/:id (invalid grade)', false, 'No enrollment ID available');
        }

        // Test 24: Search with Query Parameters
        log('blue', '\n📋 Test 24: GET Enrollments with Search');
        try {
            const response = await axios.get(`${ENROLLMENT_SERVICE}/enrollments?search=enrolled`);
            recordTest('GET /enrollments with search', 
                response.status === 200 && 
                response.data.success === true
            );
        } catch (error) {
            recordTest('GET /enrollments with search', false, error.response?.data?.message || error.message);
        }

        // Test 25: Final Cleanup - Delete Test Enrollment
        log('blue', '\n📋 Test 25: Final Cleanup - Delete Test Enrollment');
        if (createdEnrollmentId) {
            try {
                const response = await axios.delete(`${ENROLLMENT_SERVICE}/enrollments/${createdEnrollmentId}`);
                recordTest('DELETE /enrollments/:id (cleanup)', 
                    response.status === 200 && 
                    response.data.success === true
                );
            } catch (error) {
                recordTest('DELETE /enrollments/:id (cleanup)', false, error.response?.data?.message || error.message);
            }
        }

    } catch (error) {
        console.error('\n❌ Unexpected error during testing:', error);
    }

    // Print test summary
    console.log('\n' + '='.repeat(80));
    log('cyan', '📊 TEST SUMMARY');
    console.log('='.repeat(80));
    log('green', `✓ Passed: ${testResults.passed}`);
    log('red', `✗ Failed: ${testResults.failed}`);
    log('blue', `Total Tests: ${testResults.tests.length}`);
    
    const passRate = ((testResults.passed / testResults.tests.length) * 100).toFixed(2);
    log(passRate >= 90 ? 'green' : passRate >= 70 ? 'yellow' : 'red', `Pass Rate: ${passRate}%`);
    
    if (testResults.failed > 0) {
        console.log('\n' + '='.repeat(80));
        log('red', '❌ FAILED TESTS:');
        console.log('='.repeat(80));
        testResults.tests.filter(t => !t.passed).forEach(t => {
            log('red', `  ✗ ${t.name}`);
            if (t.message) {
                log('yellow', `    → ${t.message}`);
            }
        });
    }

    console.log('\n' + '='.repeat(80));
    
    return testResults;
}

async function main() {
    try {
        console.log('Starting comprehensive E2E testing...\n');
        
        // First, seed the data
        log('cyan', '🌱 Step 1: Seeding data...');
        const seededData = await seedData();
        
        // Wait a bit for data to settle
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Then run the tests
        log('cyan', '\n🧪 Step 2: Running E2E tests...');
        const results = await testEnrollmentRoutes(seededData);
        
        // Exit with appropriate code
        process.exit(results.failed > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('\n❌ Main process error:', error);
        process.exit(1);
    }
}

// Run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { testEnrollmentRoutes };
