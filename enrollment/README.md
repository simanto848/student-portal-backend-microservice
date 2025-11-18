# Enrollment Service

A comprehensive microservice for managing student enrollments, attendance, assessments, and grades in a **closed credit system** where all students in a batch progress together.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Key Concepts](#key-concepts)
- [Usage Examples](#usage-examples)
- [Permission Model](#permission-model)

## Features

### Closed Credit System Support
- ✅ Batch-based enrollment - all students progress together
- ✅ Automatic semester progression for entire batch
- ✅ Teacher assignment to batch courses
- ✅ No individual student drop/fail tracking

### Core Functionality
- **Teacher Assignment**: Assign instructors to batch courses before semester starts
- **Enrollment Management**: Bulk enroll students in semester courses
- **Attendance Tracking**: Mark and track student attendance with date validation
- **Assessment Management**: Create, publish, and manage course assessments
- **Submission Handling**: Student submissions with late detection and grading
- **Grade Calculation**: Manual and auto-calculated grades with GPA tracking

### Security & Permissions
- ✅ Only assigned teachers can manage their course activities
- ✅ Students can only view their own data
- ✅ Attendance cannot be marked for future dates
- ✅ Role-based access control on all endpoints
- ✅ JWT authentication with cookie/header support

## Architecture

### Models
1. **BatchCourseInstructor** - Links teachers to batch courses
2. **CourseEnrollment** - Student course enrollments
3. **Attendance** - Attendance records with date validation
4. **AssessmentType** - Categories of assessments (quiz, exam, project, etc.)
5. **Assessment** - Course assessments with weightage
6. **AssessmentSubmission** - Student submissions with grading
7. **CourseGrade** - Final course grades with GPA calculation

### Service Integration
- **User Service**: Verify students and teachers
- **Academic Service**: Verify batches, courses, and sessions

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the service:**
   ```bash
   npm start
   ```

## Configuration

Create a `.env` file based on `.env.example`:

```env
# Server Configuration
PORT=3003
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/student_portal_enrollment

# JWT
JWT_SECRET=your-secret-key-change-this-in-production

# Service URLs
USER_SERVICE_URL=http://localhost:8007
ACADEMIC_SERVICE_URL=http://localhost:8001
```

## API Endpoints

### Teacher Assignment (7 endpoints)
```
POST   /batch-course-instructors              - Assign instructor to course
GET    /batch-course-instructors              - List assignments
GET    /batch-course-instructors/:id          - Get assignment details
PUT    /batch-course-instructors/:id          - Update assignment
DELETE /batch-course-instructors/:id          - Delete assignment
GET    /batch-course-instructors/instructor/:id/courses - Get instructor courses
GET    /batch-course-instructors/course/instructors     - Get course instructors
```

### Enrollment (8 endpoints)
```
POST   /enrollments                           - Enroll single student
POST   /enrollments/bulk                      - Bulk enroll batch
GET    /enrollments                           - List enrollments
GET    /enrollments/:id                       - Get enrollment details
PUT    /enrollments/:id                       - Update enrollment
DELETE /enrollments/:id                       - Delete enrollment
GET    /enrollments/student/:id/semester/:num - Get student semester enrollments
POST   /enrollments/complete-semester         - Complete batch semester
```

### Attendance (8 endpoints)
```
POST   /attendance                            - Mark attendance
POST   /attendance/bulk                       - Bulk mark attendance
GET    /attendance                            - List attendance
GET    /attendance/:id                        - Get attendance details
PUT    /attendance/:id                        - Update attendance
DELETE /attendance/:id                        - Delete attendance
GET    /attendance/student/:sid/course/:cid/stats - Get attendance statistics
GET    /attendance/course/:cid/batch/:bid/report  - Get course attendance report
```

### Assessments (24 endpoints)
```
# Assessment Types
POST   /assessments/types                     - Create assessment type
GET    /assessments/types                     - List assessment types
GET    /assessments/types/:id                 - Get assessment type
PUT    /assessments/types/:id                 - Update assessment type
DELETE /assessments/types/:id                 - Delete assessment type

# Assessments
POST   /assessments                           - Create assessment
GET    /assessments                           - List assessments
GET    /assessments/:id                       - Get assessment details
PUT    /assessments/:id                       - Update assessment
DELETE /assessments/:id                       - Delete assessment
POST   /assessments/:id/publish               - Publish assessment
POST   /assessments/:id/close                 - Close assessment
POST   /assessments/:id/mark-graded           - Mark as graded
GET    /assessments/student/:sid/course/:cid  - Get student assessments

# Submissions
POST   /assessments/submissions               - Submit assessment
GET    /assessments/submissions               - List submissions
GET    /assessments/submissions/:id           - Get submission details
PUT    /assessments/submissions/:id           - Update submission
DELETE /assessments/submissions/:id           - Delete submission
POST   /assessments/submissions/:id/grade     - Grade submission
GET    /assessments/submissions/student/:sid/assessment/:aid - Get student submission
GET    /assessments/:id/submissions           - Get all submissions (teacher)
GET    /assessments/:id/submissions/stats     - Get submission statistics
```

### Grades (9 endpoints)
```
POST   /grades                                - Calculate grade
POST   /grades/auto-calculate/:enrollmentId   - Auto-calculate from assessments
GET    /grades                                - List grades
GET    /grades/:id                            - Get grade details
PUT    /grades/:id                            - Update grade
DELETE /grades/:id                            - Delete grade
POST   /grades/:id/publish                    - Publish grade
POST   /grades/:id/unpublish                  - Unpublish grade
GET    /grades/student/:sid/semester/:num     - Get student semester grades
GET    /grades/student/:sid/semester/:num/gpa - Calculate semester GPA
GET    /grades/stats/course                   - Get course grade statistics
```

## Key Concepts

### Closed Credit System
In this system:
- **All students in a batch progress together** to the next semester
- Students cannot individually drop courses or repeat semesters
- The batch structure is predetermined at session creation
- Grades are recorded but don't block progression

### Teacher Assignment Workflow
1. Admin assigns teacher to batch-course for a semester
2. Only assigned teacher can:
   - Mark attendance for that course
   - Create and grade assessments
   - Calculate and publish grades
3. Assignment verified on every operation

### Attendance Rules
- ✅ Can mark present/past dates only
- ❌ Cannot mark future dates (validated at model and service level)
- ✅ Only assigned teacher can mark/update/delete
- ✅ Students can only view their own attendance

### Assessment Workflow
```
Draft → Published → Closed → Graded
```
- **Draft**: Created but not visible to students
- **Published**: Students can view and submit
- **Closed**: No more submissions accepted
- **Graded**: All submissions graded

### Grade Calculation
Two methods:
1. **Manual**: Teacher enters total marks directly
2. **Auto-calculate**: Calculates from weighted assessment submissions
   ```
   Final Grade = Σ (Assessment Percentage × Weightage)
   ```

## Usage Examples

### 1. Assign Teacher to Course
```bash
POST /api/enrollment/batch-course-instructors
Authorization: Bearer <token>

{
  "batchId": "batch-uuid",
  "courseId": "course-uuid",
  "sessionId": "session-uuid",
  "semester": 1,
  "instructorId": "teacher-uuid"
}
```

### 2. Bulk Enroll Batch
```bash
POST /api/enrollment/enrollments/bulk
Authorization: Bearer <token>

{
  "batchId": "batch-uuid",
  "semester": 1,
  "courses": [
    {
      "courseId": "course1-uuid",
      "instructorId": "teacher1-uuid"
    },
    {
      "courseId": "course2-uuid",
      "instructorId": "teacher2-uuid"
    }
  ]
}
```

### 3. Bulk Mark Attendance
```bash
POST /api/enrollment/attendance/bulk
Authorization: Bearer <teacher-token>

{
  "courseId": "course-uuid",
  "batchId": "batch-uuid",
  "date": "2024-01-15",
  "attendances": [
    {
      "studentId": "student1-uuid",
      "status": "present"
    },
    {
      "studentId": "student2-uuid",
      "status": "absent",
      "remarks": "Sick leave"
    }
  ]
}
```

### 4. Create and Publish Assessment
```bash
# Create
POST /api/enrollment/assessments
Authorization: Bearer <teacher-token>

{
  "title": "Midterm Exam",
  "courseId": "course-uuid",
  "batchId": "batch-uuid",
  "semester": 1,
  "assessmentTypeId": "exam-type-uuid",
  "totalMarks": 100,
  "weightage": 30,
  "dueDate": "2024-02-15T23:59:59Z"
}

# Publish
POST /api/enrollment/assessments/{assessment-id}/publish
Authorization: Bearer <teacher-token>
```

### 5. Auto-Calculate Grade
```bash
POST /api/enrollment/grades/auto-calculate/{enrollment-id}
Authorization: Bearer <teacher-token>

# Calculates grade based on all graded assessment submissions
# with their weightages
```

## Permission Model

### Admin/Super Admin
- ✅ Assign teachers to courses
- ✅ Manage enrollments
- ✅ View all data

### Teacher
- ✅ Mark attendance (only for assigned courses)
- ✅ Create/manage assessments (only for assigned courses)
- ✅ Grade submissions (only for assigned courses)
- ✅ Calculate/publish grades (only for assigned courses)
- ❌ Cannot operate on courses they're not assigned to

### Student
- ✅ View own enrollments
- ✅ View own attendance
- ✅ View published assessments
- ✅ Submit assessments
- ✅ View own submissions and grades (when published)
- ❌ Cannot view other students' data
- ❌ Cannot view draft assessments
- ❌ Cannot view unpublished grades

## Database Schema

All models use:
- UUID primary keys
- Soft delete (deletedAt field)
- Timestamps (createdAt, updatedAt)
- Indexes for efficient queries

## Error Handling

The service uses standardized API responses:
- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors, business logic errors)
- **401**: Unauthorized (authentication required)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **409**: Conflict (duplicate entries)
- **422**: Validation Error
- **500**: Internal Server Error

## Health Check

```bash
GET /health
```

Returns service status:
```json
{
  "message": "Welcome to Enrollment Service",
  "status": true,
  "statusCode": 200
}
```

## Contributing

When modifying the service:
1. Follow existing patterns for models, services, controllers
2. Add validation schemas for new endpoints
3. Ensure proper authorization checks
4. Update this README with new features
5. Test all permission scenarios

## License

ISC
