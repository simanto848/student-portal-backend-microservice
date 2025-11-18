# Enrollment Service Setup Guide

This guide will help you set up and run the Enrollment Service for the Student Portal Backend.

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- Running instances of:
  - User Service (default: http://localhost:8007)
  - Academic Service (default: http://localhost:8001)

## Quick Start

### 1. Install Dependencies

```bash
cd enrollment
npm install
```

### 2. Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=3003
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/student_portal_enrollment
JWT_SECRET=your-secret-key-here
USER_SERVICE_URL=http://localhost:8007
ACADEMIC_SERVICE_URL=http://localhost:8001
```

### 3. Start MongoDB

Ensure MongoDB is running:

```bash
# Using systemd
sudo systemctl start mongodb

# Or using mongod directly
mongod --dbpath /path/to/data
```

### 4. Start the Service

```bash
npm start
```

The service should start on http://localhost:3003

### 5. Verify Service is Running

```bash
curl http://localhost:3003/health
```

Expected response:
```json
{
  "message": "Welcome to Enrollment Service",
  "status": true,
  "statusCode": 200
}
```

## Integration with Gateway

The enrollment service is automatically integrated with the API Gateway at `/api/enrollment`.

Access the service through the gateway:
```
http://localhost:8000/api/enrollment/*
```

## Initial Setup Workflow

Once the service is running, follow this workflow to set up the system:

### Step 1: Create Assessment Types (Admin)

```bash
POST http://localhost:3003/assessments/types
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Quiz",
  "description": "Short quizzes",
  "defaultWeightage": 10
}
```

Create common assessment types:
- Quiz (10%)
- Assignment (20%)
- Midterm (30%)
- Final Exam (40%)

### Step 2: Assign Teachers to Courses (Admin)

For each course in a batch, assign a teacher:

```bash
POST http://localhost:3003/batch-course-instructors
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "batchId": "batch-uuid",
  "courseId": "course-uuid",
  "sessionId": "session-uuid",
  "semester": 1,
  "instructorId": "teacher-uuid"
}
```

### Step 3: Enroll Students in Batch (Admin)

Bulk enroll all students in a batch for their semester courses:

```bash
POST http://localhost:3003/enrollments/bulk
Authorization: Bearer <admin-token>
Content-Type: application/json

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

### Step 4: Teachers Can Now Manage Their Courses

Teachers can now:
- Mark attendance
- Create assessments
- Grade submissions
- Calculate grades

## Testing the Service

### 1. Test Teacher Assignment

```bash
# Get instructor's courses
GET http://localhost:3003/batch-course-instructors/instructor/{instructor-id}/courses
Authorization: Bearer <token>
```

### 2. Test Attendance Marking

```bash
# Mark attendance for a single student
POST http://localhost:3003/attendance
Authorization: Bearer <teacher-token>
Content-Type: application/json

{
  "enrollmentId": "enrollment-uuid",
  "date": "2024-01-15",
  "status": "present"
}
```

### 3. Test Assessment Creation

```bash
# Create assessment
POST http://localhost:3003/assessments
Authorization: Bearer <teacher-token>
Content-Type: application/json

{
  "title": "Quiz 1",
  "courseId": "course-uuid",
  "batchId": "batch-uuid",
  "semester": 1,
  "assessmentTypeId": "quiz-type-uuid",
  "totalMarks": 20,
  "weightage": 10,
  "dueDate": "2024-01-20T23:59:59Z"
}

# Publish assessment
POST http://localhost:3003/assessments/{assessment-id}/publish
Authorization: Bearer <teacher-token>
```

### 4. Test Student Submission

```bash
# Submit assessment
POST http://localhost:3003/assessments/submissions
Authorization: Bearer <student-token>
Content-Type: application/json

{
  "assessmentId": "assessment-uuid",
  "enrollmentId": "enrollment-uuid",
  "content": "My answer to the quiz...",
  "attachments": []
}
```

### 5. Test Grading

```bash
# Grade submission
POST http://localhost:3003/assessments/submissions/{submission-id}/grade
Authorization: Bearer <teacher-token>
Content-Type: application/json

{
  "marksObtained": 18,
  "feedback": "Good work!"
}

# Auto-calculate final grade
POST http://localhost:3003/grades/auto-calculate/{enrollment-id}
Authorization: Bearer <teacher-token>
```

## Common Issues and Solutions

### Issue: Service won't start

**Solution**: Check that:
1. MongoDB is running
2. No other service is using port 3003
3. Environment variables are correctly set
4. Dependencies are installed

### Issue: Cannot mark attendance

**Solution**: Verify that:
1. Teacher is assigned to the course (check BatchCourseInstructor)
2. Date is not in the future
3. Using correct authentication token
4. Enrollment exists for the student

### Issue: Student cannot see grades

**Solution**: Check that:
1. Grade is published (`isPublished: true`)
2. Student is logged in with their own account
3. Grade belongs to the requesting student

### Issue: Service URLs not working

**Solution**: Ensure:
1. User Service is running on configured port
2. Academic Service is running on configured port
3. Services can communicate (no firewall blocking)

## Database Management

### View Collections

```bash
mongosh student_portal_enrollment

# View collections
show collections

# Query examples
db.courseenrollments.find().pretty()
db.attendances.find().pretty()
db.assessments.find().pretty()
```

### Reset Database (Development Only)

```bash
mongosh student_portal_enrollment

# Drop all collections
db.dropDatabase()
```

## Monitoring and Logs

The service uses Morgan for HTTP logging. Logs are output to console in dev mode.

Watch logs in real-time:
```bash
npm start | tail -f
```

## Production Considerations

### Security
1. Change JWT_SECRET to a strong random value
2. Use environment-specific MongoDB credentials
3. Enable HTTPS on the gateway
4. Implement rate limiting
5. Add request logging to external service

### Database
1. Set up MongoDB replica set for high availability
2. Configure regular backups
3. Add database indexes for performance
4. Monitor database size and performance

### Service Configuration
1. Set NODE_ENV=production
2. Use process manager (PM2) for auto-restart
3. Configure proper logging (Winston, etc.)
4. Set up health check monitoring
5. Configure service discovery if using orchestration

### Scaling
1. Run multiple instances behind load balancer
2. Use Redis for session management if needed
3. Implement caching for frequently accessed data
4. Consider database read replicas for reporting

## Development Tips

### Adding New Features

1. Create model in `models/`
2. Create service in `services/`
3. Create validation schema in `validations/`
4. Create controller in `controllers/`
5. Add routes in `routes/`
6. Update README with new endpoints

### Code Style

- Use ES6 modules
- Follow existing error handling patterns
- Use async/await for asynchronous operations
- Return standardized API responses
- Add comments for complex business logic

### Testing Locally

Use tools like:
- Postman or Insomnia for API testing
- MongoDB Compass for database inspection
- VS Code REST Client extension

## Support

For issues or questions:
1. Check existing documentation
2. Review error messages carefully
3. Check service logs
4. Verify all prerequisites are met
5. Contact the development team

## Next Steps

After setup:
1. Review the [README.md](../README.md) for detailed API documentation
2. Set up assessment types for your institution
3. Assign teachers to courses
4. Enroll students
5. Begin using the system for daily operations

## Maintenance

### Regular Tasks
- Monitor database size
- Review and archive old semester data
- Update dependencies regularly
- Review and optimize slow queries
- Check for security updates

### Backup Strategy
1. Daily automated database backups
2. Store backups in secure location
3. Test backup restoration quarterly
4. Document backup/restore procedures

## Changelog

Track changes to the service:
- v1.0.0 - Initial release with full closed credit system support
