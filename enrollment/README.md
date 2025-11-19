# Enrollment Service

This microservice handles student course enrollments in the student portal system.

## Features

- **Full CRUD Operations**: Create, Read, Update, Delete enrollments
- **Bulk Enrollment**: Enroll multiple students in multiple courses at once
- **Soft Delete**: Enrollments are soft-deleted and can be restored
- **Query Operations**: 
  - Get all enrollments with pagination and filters
  - Get enrollments by student
  - Get enrollments by department and semester
- **Grade Management**: Track enrollment status, grades, and marks

## API Endpoints

### Core CRUD

- `GET /enrollments` - Get all enrollments (supports pagination and filters)
  - Query params: `page`, `limit`, `search`, `semester`, `sessionId`, `studentId`, `enrollmentStatus`
- `GET /enrollments/:id` - Get a specific enrollment
- `POST /enrollments` - Create a single enrollment
- `POST /enrollments/bulk` - Create multiple enrollments at once
- `PATCH /enrollments/:id` - Update an enrollment
- `DELETE /enrollments/:id` - Soft delete an enrollment
- `POST /enrollments/:id/restore` - Restore a soft-deleted enrollment

### Query Operations

- `GET /enrollments/student/:studentId` - Get all enrollments for a student
  - Query params: `semester`, `sessionId`
- `GET /enrollments/department/:departmentId/semester/:semester` - Get all enrollments for a department and semester
  - Query params: `sessionId`

## Enrollment Model

```javascript
{
  id: String,                    // UUID
  studentId: String,             // Reference to Student
  sessionCourseId: String,       // Reference to SessionCourse
  sessionId: String,             // Reference to Session
  courseId: String,              // Reference to Course
  semester: Number,              // Semester number (1-8)
  departmentId: String,          // Reference to Department
  enrollmentStatus: String,      // 'enrolled', 'completed', 'dropped', 'failed', 'in_progress'
  grade: String,                 // 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'
  gradePoint: Number,            // 0-4
  obtainedMarks: Number,
  totalMarks: Number,
  enrolledAt: Date,
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with:
```
PORT=3003
MONGO_URI=your_mongodb_connection_string
NODE_ENV=development
```

3. Start the service:
```bash
npm start
# or for development with auto-reload
npm run dev
```

## Seeding Data

To seed test data (CSE department courses, students, and enrollments):

```bash
npm run seed
```

This will:
1. Find/verify CSE department exists
2. Create/find a session for the current year
3. Create 48 courses across 8 semesters
4. Create session courses for all semesters
5. Create 5 test teachers
6. Create 8 test students
7. Auto-enroll all students in semester 1 courses

## Testing

Run comprehensive E2E tests:

```bash
npm run test:e2e
```

This runs 25 test cases covering:
- Health checks
- GET operations (list, single, filtered)
- POST operations (create, bulk create)
- PATCH operations (update status, grades)
- DELETE operations (soft delete, restore)
- Error handling (duplicates, not found, invalid data)

## Example Usage

### Create a Single Enrollment

```javascript
POST /enrollments
Content-Type: application/json

{
  "studentId": "student-uuid",
  "sessionCourseId": "session-course-uuid",
  "sessionId": "session-uuid",
  "courseId": "course-uuid",
  "semester": 1,
  "departmentId": "department-uuid",
  "enrollmentStatus": "enrolled"
}
```

### Bulk Enroll Students

```javascript
POST /enrollments/bulk
Content-Type: application/json

{
  "enrollments": [
    {
      "studentId": "student-1-uuid",
      "sessionCourseId": "session-course-1-uuid",
      "sessionId": "session-uuid",
      "courseId": "course-1-uuid",
      "semester": 1,
      "departmentId": "department-uuid",
      "enrollmentStatus": "enrolled"
    },
    {
      "studentId": "student-1-uuid",
      "sessionCourseId": "session-course-2-uuid",
      "sessionId": "session-uuid",
      "courseId": "course-2-uuid",
      "semester": 1,
      "departmentId": "department-uuid",
      "enrollmentStatus": "enrolled"
    }
  ]
}
```

### Update Enrollment with Grade

```javascript
PATCH /enrollments/:id
Content-Type: application/json

{
  "enrollmentStatus": "completed",
  "grade": "A",
  "gradePoint": 4.0,
  "obtainedMarks": 95,
  "totalMarks": 100,
  "completedAt": "2024-12-15T00:00:00.000Z"
}
```

### Get Student Enrollments

```javascript
GET /enrollments/student/:studentId?semester=1&sessionId=session-uuid
```

## Error Handling

The service returns consistent error responses:

```javascript
{
  "success": false,
  "message": "Error message",
  "statusCode": 400,
  "errors": []  // Optional array of detailed errors
}
```

Common status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `409` - Conflict (duplicate enrollment)
- `500` - Internal Server Error

## Dependencies

- Express 5.1.0
- Mongoose 8.19.3
- UUID 13.0.0
- Axios 1.13.2 (for seeding/testing)
- Dotenv 17.2.3
- Other standard utilities

## Notes

- All dates are stored in UTC
- Soft delete is implemented - deleted records have `deletedAt` timestamp
- Duplicate enrollments (same student + session course) are prevented
- Core enrollment fields (studentId, sessionCourseId, etc.) cannot be updated after creation
