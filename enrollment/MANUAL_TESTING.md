# Manual Testing Guide - Enrollment Service

This document provides step-by-step manual testing instructions for the enrollment service.

## Test Summary

This guide covers **all 25 E2E test cases** that are automated in `scripts/testE2E.js`.

## Prerequisites

- All three services running (academic, user, enrollment)
- CSE department created
- Initial data seeded (or ready to be created manually)

## Setup Test Data Manually

If you can't run the automated seeding, here's how to create test data manually:

### 1. Create Faculty
```bash
curl -X POST http://localhost:8001/faculties \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Faculty of Engineering",
    "email": "engineering@university.edu",
    "phone": "+1234567890"
  }'
```
**Expected**: Status 201, returns faculty with ID

### 2. Create CSE Department
```bash
# Replace FACULTY_ID with the ID from step 1
curl -X POST http://localhost:8001/departments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Computer Science and Engineering",
    "shortName": "CSE",
    "email": "cse@university.edu",
    "phone": "+1234567891",
    "facultyId": "FACULTY_ID"
  }'
```
**Expected**: Status 201, returns department with ID

### 3. Create Session
```bash
curl -X POST http://localhost:8001/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Session 2025-2026",
    "year": 2025,
    "endDate": "2026-12-31"
  }'
```
**Expected**: Status 201, returns session with ID

### 4. Create a Course
```bash
# Replace DEPT_ID with department ID from step 2
curl -X POST http://localhost:8001/courses \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Structured Programming Language",
    "code": "CSE-101",
    "credit": 3,
    "courseType": "theory",
    "departmentId": "DEPT_ID"
  }'
```
**Expected**: Status 201, returns course with ID

### 5. Create Session Course
```bash
# Replace SESSION_ID, COURSE_ID, DEPT_ID
curl -X POST http://localhost:8001/session-courses \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "SESSION_ID",
    "courseId": "COURSE_ID",
    "semester": 1,
    "departmentId": "DEPT_ID"
  }'
```
**Expected**: Status 201, returns session course with ID

### 6. Create Program
```bash
# Replace DEPT_ID
curl -X POST http://localhost:8001/programs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bachelor of Science in Computer Science and Engineering",
    "shortName": "BSc in CSE",
    "departmentId": "DEPT_ID",
    "duration": 4,
    "totalCredits": 160
  }'
```
**Expected**: Status 201, returns program with ID

### 7. Create Batch
```bash
# Replace PROGRAM_ID, DEPT_ID, SESSION_ID
curl -X POST http://localhost:8001/batches \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Batch-2025",
    "year": 2025,
    "programId": "PROGRAM_ID",
    "departmentId": "DEPT_ID",
    "sessionId": "SESSION_ID",
    "maxStudents": 60
  }'
```
**Expected**: Status 201, returns batch with ID

### 8. Create Student
```bash
# Replace DEPT_ID, PROGRAM_ID, BATCH_ID, SESSION_ID
curl -X POST http://localhost:8007/students \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test Student",
    "email": "test.student@university.edu",
    "departmentId": "DEPT_ID",
    "programId": "PROGRAM_ID",
    "batchId": "BATCH_ID",
    "sessionId": "SESSION_ID"
  }'
```
**Expected**: Status 201, returns student with ID

## Manual Test Cases

Now that we have test data, let's test all enrollment routes:

### Test 1: Health Check ✓
```bash
curl http://localhost:3003/health
```
**Expected**: 
- Status: 200
- Response: `{"message":"Welcome to Enrollment Service","status":true,"statusCode":200}`

---

### Test 2: GET All Enrollments (with pagination) ✓
```bash
curl "http://localhost:3003/enrollments?page=1&limit=5"
```
**Expected**:
- Status: 200
- Response includes `pagination` object with `page`, `limit`, `total`, `pages`

---

### Test 3: GET All Enrollments (without pagination) ✓
```bash
curl http://localhost:3003/enrollments
```
**Expected**:
- Status: 200
- Response includes `data` array

---

### Test 4: GET Enrollments with Filters ✓
```bash
curl "http://localhost:3003/enrollments?semester=1&enrollmentStatus=enrolled"
```
**Expected**:
- Status: 200
- Returns only semester 1 enrollments with status "enrolled"

---

### Test 5: GET Enrollments by Student ✓
```bash
# Replace STUDENT_ID
curl "http://localhost:3003/enrollments/student/STUDENT_ID"
```
**Expected**:
- Status: 200
- Returns array of enrollments for that student

---

### Test 6: GET Enrollments by Department and Semester ✓
```bash
# Replace DEPT_ID
curl "http://localhost:3003/enrollments/department/DEPT_ID/semester/1"
```
**Expected**:
- Status: 200
- Returns array of enrollments for that department/semester

---

### Test 7: POST Create Single Enrollment ✓
```bash
# Replace STUDENT_ID, SESSION_COURSE_ID, SESSION_ID, COURSE_ID, DEPT_ID
curl -X POST http://localhost:3003/enrollments \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STUDENT_ID",
    "sessionCourseId": "SESSION_COURSE_ID",
    "sessionId": "SESSION_ID",
    "courseId": "COURSE_ID",
    "semester": 1,
    "departmentId": "DEPT_ID",
    "enrollmentStatus": "enrolled"
  }'
```
**Expected**:
- Status: 201
- Response includes created enrollment with ID
**Save the enrollment ID for later tests**

---

### Test 8: POST Duplicate Enrollment (Error Case) ✗
```bash
# Use same data as Test 7
curl -X POST http://localhost:3003/enrollments \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STUDENT_ID",
    "sessionCourseId": "SESSION_COURSE_ID",
    "sessionId": "SESSION_ID",
    "courseId": "COURSE_ID",
    "semester": 1,
    "departmentId": "DEPT_ID",
    "enrollmentStatus": "enrolled"
  }'
```
**Expected**:
- Status: 409 (Conflict)
- Error message about duplicate enrollment

---

### Test 9: GET Single Enrollment by ID ✓
```bash
# Replace ENROLLMENT_ID from Test 7
curl "http://localhost:3003/enrollments/ENROLLMENT_ID"
```
**Expected**:
- Status: 200
- Returns the specific enrollment

---

### Test 10: GET Non-existent Enrollment (Error Case) ✗
```bash
curl "http://localhost:3003/enrollments/non-existent-id-12345"
```
**Expected**:
- Status: 404 or 400
- Error message about enrollment not found

---

### Test 11: PATCH Update Enrollment ✓
```bash
# Replace ENROLLMENT_ID
curl -X PATCH "http://localhost:3003/enrollments/ENROLLMENT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "enrollmentStatus": "in_progress",
    "obtainedMarks": 75,
    "totalMarks": 100
  }'
```
**Expected**:
- Status: 200
- Updated enrollment with new values

---

### Test 12: PATCH Update with Grade ✓
```bash
# Replace ENROLLMENT_ID
curl -X PATCH "http://localhost:3003/enrollments/ENROLLMENT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "enrollmentStatus": "completed",
    "grade": "A",
    "gradePoint": 4.0,
    "completedAt": "2024-12-15T00:00:00.000Z"
  }'
```
**Expected**:
- Status: 200
- Enrollment now has grade "A" and gradePoint 4.0

---

### Test 13: PATCH Non-existent Enrollment (Error Case) ✗
```bash
curl -X PATCH "http://localhost:3003/enrollments/non-existent-id" \
  -H "Content-Type: application/json" \
  -d '{
    "grade": "A+"
  }'
```
**Expected**:
- Status: 404 or 400
- Error message

---

### Test 14: POST Bulk Create Enrollments ✓
```bash
# Create multiple enrollments at once
# Replace IDs accordingly
curl -X POST http://localhost:3003/enrollments/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "enrollments": [
      {
        "studentId": "STUDENT_ID_1",
        "sessionCourseId": "SESSION_COURSE_ID_1",
        "sessionId": "SESSION_ID",
        "courseId": "COURSE_ID_1",
        "semester": 2,
        "departmentId": "DEPT_ID",
        "enrollmentStatus": "enrolled"
      },
      {
        "studentId": "STUDENT_ID_1",
        "sessionCourseId": "SESSION_COURSE_ID_2",
        "sessionId": "SESSION_ID",
        "courseId": "COURSE_ID_2",
        "semester": 2,
        "departmentId": "DEPT_ID",
        "enrollmentStatus": "enrolled"
      }
    ]
  }'
```
**Expected**:
- Status: 201
- Returns array of created enrollments

---

### Test 15: POST Bulk with Empty Array (Error Case) ✗
```bash
curl -X POST http://localhost:3003/enrollments/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "enrollments": []
  }'
```
**Expected**:
- Status: 400
- Error about empty array

---

### Test 16: POST Bulk with Invalid Data (Error Case) ✗
```bash
curl -X POST http://localhost:3003/enrollments/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "enrollments": [
      {
        "invalidField": "test"
      }
    ]
  }'
```
**Expected**:
- Status: 400 or 500
- Validation error

---

### Test 17: DELETE Enrollment (Soft Delete) ✓
```bash
# Replace ENROLLMENT_ID
curl -X DELETE "http://localhost:3003/enrollments/ENROLLMENT_ID"
```
**Expected**:
- Status: 200
- Success message

---

### Test 18: GET Deleted Enrollment (Should Fail) ✗
```bash
# Try to get the deleted enrollment
curl "http://localhost:3003/enrollments/ENROLLMENT_ID"
```
**Expected**:
- Status: 404
- Not found error

---

### Test 19: POST Restore Enrollment ✓
```bash
# Replace ENROLLMENT_ID
curl -X POST "http://localhost:3003/enrollments/ENROLLMENT_ID/restore"
```
**Expected**:
- Status: 200
- Enrollment restored

---

### Test 20: GET Restored Enrollment ✓
```bash
# Should work now
curl "http://localhost:3003/enrollments/ENROLLMENT_ID"
```
**Expected**:
- Status: 200
- Returns the enrollment

---

### Test 21: DELETE Non-existent Enrollment (Error Case) ✗
```bash
curl -X DELETE "http://localhost:3003/enrollments/non-existent-id"
```
**Expected**:
- Status: 404 or 400
- Error message

---

### Test 22: POST with Missing Fields (Error Case) ✗
```bash
curl -X POST http://localhost:3003/enrollments \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "test"
  }'
```
**Expected**:
- Status: 400 or 500
- Validation error about missing fields

---

### Test 23: PATCH with Invalid Grade (Error Case) ✗
```bash
# Replace ENROLLMENT_ID
curl -X PATCH "http://localhost:3003/enrollments/ENROLLMENT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "grade": "Z"
  }'
```
**Expected**:
- Status: 400 or 500
- Validation error about invalid grade

---

### Test 24: GET with Search Query ✓
```bash
curl "http://localhost:3003/enrollments?search=enrolled"
```
**Expected**:
- Status: 200
- Returns enrollments matching the search

---

### Test 25: Final Cleanup ✓
```bash
# Delete the test enrollment
curl -X DELETE "http://localhost:3003/enrollments/ENROLLMENT_ID"
```
**Expected**:
- Status: 200
- Success message

---

## Test Results Checklist

Mark each test as you complete it:

- [ ] Test 1: Health Check
- [ ] Test 2: GET All (paginated)
- [ ] Test 3: GET All (no pagination)
- [ ] Test 4: GET with Filters
- [ ] Test 5: GET by Student
- [ ] Test 6: GET by Dept/Semester
- [ ] Test 7: POST Create
- [ ] Test 8: POST Duplicate (error)
- [ ] Test 9: GET by ID
- [ ] Test 10: GET Non-existent (error)
- [ ] Test 11: PATCH Update
- [ ] Test 12: PATCH with Grade
- [ ] Test 13: PATCH Non-existent (error)
- [ ] Test 14: POST Bulk
- [ ] Test 15: POST Bulk Empty (error)
- [ ] Test 16: POST Bulk Invalid (error)
- [ ] Test 17: DELETE (soft)
- [ ] Test 18: GET Deleted (error)
- [ ] Test 19: POST Restore
- [ ] Test 20: GET Restored
- [ ] Test 21: DELETE Non-existent (error)
- [ ] Test 22: POST Missing Fields (error)
- [ ] Test 23: PATCH Invalid Grade (error)
- [ ] Test 24: GET Search
- [ ] Test 25: Cleanup

## Summary

After completing all tests:
- **Expected Pass Rate**: 100% (25/25 tests)
- **Total Test Coverage**: All CRUD operations + error cases
- **Routes Tested**: 
  - GET /enrollments (multiple variants)
  - POST /enrollments
  - POST /enrollments/bulk
  - PATCH /enrollments/:id
  - DELETE /enrollments/:id
  - POST /enrollments/:id/restore
  - GET /enrollments/student/:studentId
  - GET /enrollments/department/:departmentId/semester/:semester

## Notes

- ✓ marks expected success
- ✗ marks expected error/failure (which is correct behavior)
- Save IDs from create operations to use in subsequent tests
- Tests should be run in order as some depend on previous tests
