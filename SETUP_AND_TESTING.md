# Student Portal - Enrollment Service Setup & Testing Guide

This guide will help you set up and test the complete enrollment system including data seeding and E2E testing.

## Prerequisites

- Node.js 18+ and npm
- MongoDB 7.0+ (or Docker to run MongoDB)
- Git

## Quick Start (Local Setup)

### 1. Install Dependencies

```bash
# Install dependencies for enrollment service
cd enrollment
npm install

# Install dependencies for academic service
cd ../academic
npm install

# Install dependencies for user service  
cd ../user
npm install
```

### 2. Start MongoDB

**Option A: Using Docker**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:7.0
```

**Option B: Using Docker Compose** (Recommended)
```bash
# From the root directory
docker-compose up -d mongodb
```

**Option C: Local MongoDB Installation**
```bash
# If you have MongoDB installed locally
sudo systemctl start mongod
```

### 3. Configure Environment Variables

Create `.env` files for each service:

**academic/.env**
```env
PORT=8001
MONGO_URI=mongodb://localhost:27017/academic_db
NODE_ENV=development
```

**user/.env**
```env
PORT=8007
MONGO_URI=mongodb://localhost:27017/user_db
NODE_ENV=development
ACADEMIC_SERVICE_URL=http://localhost:8001
```

**enrollment/.env**
```env
PORT=3003
MONGO_URI=mongodb://localhost:27017/enrollment_db
NODE_ENV=development
ACADEMIC_SERVICE_URL=http://localhost:8001
USER_SERVICE_URL=http://localhost:8007
ENROLLMENT_SERVICE_URL=http://localhost:3003
```

You can copy from the example files:
```bash
cp enrollment/.env.example enrollment/.env
# Edit enrollment/.env with appropriate values
```

### 4. Start Services

Open **three separate terminals**:

**Terminal 1 - Academic Service:**
```bash
cd academic
npm start
# Should see: "Server started on port http://localhost:8001"
```

**Terminal 2 - User Service:**
```bash
cd user
npm start
# Should see: "Server started on port http://localhost:8007"
```

**Terminal 3 - Enrollment Service:**
```bash
cd enrollment
npm start
# Should see: "Enrollment Service started on port http://localhost:3003"
```

### 5. Verify Services Are Running

```bash
# Check academic service
curl http://localhost:8001/health

# Check user service
curl http://localhost:8007/health

# Check enrollment service
curl http://localhost:3003/health
```

All should return a successful response.

### 6. Create CSE Department (Required First Step)

Before seeding, you need to create the CSE department and a faculty:

```bash
# First, create a Faculty
curl -X POST http://localhost:8001/faculties \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Faculty of Engineering",
    "email": "engineering@university.edu",
    "phone": "+1234567890"
  }'

# Note the faculty ID from the response, then create CSE Department
curl -X POST http://localhost:8001/departments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Computer Science and Engineering",
    "shortName": "CSE",
    "email": "cse@university.edu",
    "phone": "+1234567891",
    "facultyId": "YOUR_FACULTY_ID_HERE"
  }'
```

### 7. Run Data Seeding

```bash
cd enrollment
npm run seed
```

This will:
- ✅ Verify CSE department exists
- ✅ Create/find academic session (2025-2026)
- ✅ Create 48 courses across 8 semesters:
  - Semester 1: 6 courses (Structured Programming, Discrete Math, Physics, etc.)
  - Semester 2: 6 courses (OOP, Data Structures, Digital Logic, etc.)
  - Semester 3: 6 courses (Algorithms, DBMS, Computer Architecture, etc.)
  - Semester 4: 6 courses (OS, Software Engineering, Networks, etc.)
  - Semester 5: 6 courses (AI, Compiler Design, Web Technologies, etc.)
  - Semester 6: 6 courses (ML, Mobile Dev, Cyber Security, Cloud, etc.)
  - Semester 7: 4 courses (Distributed Systems, Blockchain, IoT, Project I)
  - Semester 8: 2 courses (Project II, Industrial Training)
- ✅ Create session courses for all courses
- ✅ Create BSc in CSE program
- ✅ Create Batch-2025
- ✅ Create 5 teachers
- ✅ Create 8 students
- ✅ Auto-enroll all 8 students in 6 semester-1 courses (48 enrollments total)

### 8. Run E2E Tests

```bash
cd enrollment
npm run test:e2e
```

This runs **25 comprehensive tests**:

**Basic Operations (Tests 1-6)**
1. ✓ Health check endpoint
2. ✓ GET all enrollments with pagination
3. ✓ GET all enrollments without pagination
4. ✓ GET enrollments with filters
5. ✓ GET enrollments by student
6. ✓ GET enrollments by department and semester

**Create Operations (Tests 7-9)**
7. ✓ POST create single enrollment
8. ✓ POST duplicate enrollment (error case)
9. ✓ GET single enrollment by ID

**Read Error Cases (Test 10)**
10. ✓ GET non-existent enrollment (error case)

**Update Operations (Tests 11-13)**
11. ✓ PATCH update enrollment
12. ✓ PATCH update with grade
13. ✓ PATCH non-existent enrollment (error case)

**Bulk Operations (Tests 14-16)**
14. ✓ POST bulk create enrollments
15. ✓ POST bulk with empty array (error case)
16. ✓ POST bulk with invalid data (error case)

**Delete/Restore Operations (Tests 17-20)**
17. ✓ DELETE enrollment (soft delete)
18. ✓ GET deleted enrollment (should fail)
19. ✓ POST restore enrollment
20. ✓ GET restored enrollment

**Additional Error Cases (Tests 21-24)**
21. ✓ DELETE non-existent enrollment (error case)
22. ✓ POST with missing fields (error case)
23. ✓ PATCH with invalid grade (error case)
24. ✓ GET with search query

**Cleanup (Test 25)**
25. ✓ DELETE test enrollment (cleanup)

### 9. Verify Results

After successful seeding and testing, you can query the data:

```bash
# Get all enrollments
curl http://localhost:3003/enrollments?page=1&limit=10

# Get enrollments for a specific student
curl http://localhost:3003/enrollments/student/STUDENT_ID

# Get all semester 1 enrollments
curl http://localhost:3003/enrollments?semester=1

# Get enrollments by department and semester
curl http://localhost:3003/enrollments/department/DEPT_ID/semester/1
```

## Using the Test Runner Script

For convenience, use the interactive test runner:

```bash
cd enrollment/scripts
./runTests.sh
```

This will:
1. Check if all services are running
2. Prompt you to run seeding
3. Prompt you to run E2E tests
4. Display comprehensive results

## Docker Compose Setup (Alternative)

Instead of running services individually, you can use Docker Compose:

```bash
# From the root directory
docker-compose up -d

# Wait for services to start (30-60 seconds)
docker-compose logs -f

# When all services are ready, run seeding
docker-compose exec enrollment-service npm run seed

# Run tests
docker-compose exec enrollment-service npm run test:e2e

# Stop services
docker-compose down
```

## Troubleshooting

### Services Won't Start

**Issue**: MongoDB connection error
- **Solution**: Ensure MongoDB is running on port 27017
- Check: `docker ps` or `systemctl status mongod`

**Issue**: Port already in use
- **Solution**: Check if another service is using the port
- `lsof -i :8001` (for academic)
- `lsof -i :8007` (for user)
- `lsof -i :3003` (for enrollment)

### Seeding Fails

**Issue**: "CSE Department not found"
- **Solution**: Create the CSE department first (see step 6)

**Issue**: Connection refused to other services
- **Solution**: Ensure all three services are running before seeding

### Tests Fail

**Issue**: 404 errors during tests
- **Solution**: Run seeding first to populate data
- Ensure all services are healthy

**Issue**: Duplicate key errors
- **Solution**: Data already exists. This is expected if you run seeding multiple times.

## API Documentation

See `enrollment/README.md` for complete API documentation including:
- All endpoints
- Request/response formats
- Error codes
- Example usage

## Data Model

### Enrollment Schema
```javascript
{
  id: String (UUID),
  studentId: String (ref: Student),
  sessionCourseId: String (ref: SessionCourse),
  sessionId: String (ref: Session),
  courseId: String (ref: Course),
  semester: Number (1-8),
  departmentId: String (ref: Department),
  enrollmentStatus: String (enrolled|completed|dropped|failed|in_progress),
  grade: String (A+|A|A-|B+|B|B-|C+|C|C-|D+|D|F),
  gradePoint: Number (0-4),
  obtainedMarks: Number,
  totalMarks: Number,
  enrolledAt: Date,
  completedAt: Date
}
```

## Next Steps

1. ✅ Explore the enrollment API endpoints
2. ✅ Test updating grades for students
3. ✅ Try bulk enrollment operations
4. ✅ Implement your own features on top of this foundation

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review service logs in the terminal
3. Check MongoDB for data consistency
4. Verify all environment variables are set correctly

## Summary

This setup provides:
- ✅ Complete enrollment microservice
- ✅ 48 CSE courses across 8 semesters
- ✅ Automated student enrollment system
- ✅ 25 comprehensive E2E tests
- ✅ Full CRUD operations with error handling
- ✅ Soft delete and restore capabilities
- ✅ Bulk operations support
- ✅ Complete API documentation

All enrollment routes have been thoroughly tested including create, read, update, delete, restore, and error cases!
