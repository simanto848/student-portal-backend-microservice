# Student Profile Module

## Overview
The Student Profile module provides comprehensive profile management for students, including personal information, family details, education background, and more.

## Features

### StudentProfile Model
A comprehensive schema that includes:
- **General Information**: shift, group, admission details, season
- **Personal Information**: blood group, personal email, mobile, religion, gender, DOB, birth place, nationality, NID/Passport, marital status, addresses
- **Family Information**: father, mother, guardian details with contact and occupation
- **Emergency Contact**: name, cell, relation, occupation
- **Education Records**: Array of academic qualifications (SSC, HSC, etc.) with grades and institutions
- **Referee Information**: referral details

### API Endpoints
All endpoints are mounted at `/api/user/profiles` and require authentication.

#### Profile CRUD
- `GET /profiles/:studentId` - Get student profile (accessible by student, teacher, staff, admin)
- `POST /profiles/:studentId` - Create new profile (admin, staff only)
- `PUT /profiles/:studentId` - Create or update profile - upsert (student can edit own, staff/admin full access)
- `PATCH /profiles/:studentId` - Partial update (student can edit own, staff/admin full access)
- `DELETE /profiles/:studentId` - Soft delete (admin, staff only)
- `POST /profiles/:studentId/restore` - Restore deleted profile (admin, staff only)

#### Education Records Management
- `POST /profiles/:studentId/education` - Add education record
- `PATCH /profiles/:studentId/education/:index` - Update education record by index
- `DELETE /profiles/:studentId/education/:index` - Remove education record by index

### Authorization Matrix
| Endpoint | Student (own) | Teacher | Staff | Admin |
|----------|---------------|---------|-------|-------|
| GET | ✅ | ✅ | ✅ | ✅ |
| POST (create) | ❌ | ❌ | ✅ | ✅ |
| PUT (upsert) | ✅ | ❌ | ✅ | ✅ |
| PATCH (update) | ✅ | ❌ | ✅ | ✅ |
| DELETE | ❌ | ❌ | ✅ | ✅ |
| Restore | ❌ | ❌ | ✅ | ✅ |
| Education CRUD | ✅ | ❌ | ✅ | ✅ |

## Data Model

### Enumerations
- **Shift**: Morning, Day, Evening, Night
- **Admission Season**: Spring, Summer, Fall, Winter
- **Blood Group**: A+, A-, B+, B-, AB+, AB-, O+, O-
- **Religion**: Islam, Hinduism, Christianity, Buddhism, Other
- **Gender**: Male, Female, Other
- **Marital Status**: Single, Married, Divorced, Widowed

### Nested Structures
- **Address**: street, city, state, zipCode, country
- **Father/Mother Info**: name, cell, occupation, NID
- **Guardian Info**: name, cell, occupation
- **Emergency Contact**: name, cell, relation, occupation
- **Education Record**: examName, group, roll, passingYear, cgpa/gradeOrMarks, boardOrUniversity

## Validation
All endpoints use Zod validation with:
- Date preprocessing to handle ISO strings and Date objects
- Email validation for personalEmail field
- Nested object validation for complex structures
- Array validation for education records

## Usage Examples

### Create a Profile
```javascript
POST /api/user/profiles/:studentId
Authorization: Bearer <token>

{
  "shift": "Morning",
  "group": "Science",
  "bloodGroup": "O+",
  "personalEmail": "student@example.com",
  "studentMobile": "+8801712345678",
  "religion": "Islam",
  "gender": "Male",
  "dateOfBirth": "2000-01-01",
  "permanentAddress": {
    "street": "123 Main St",
    "city": "Dhaka",
    "zipCode": "1000",
    "country": "Bangladesh"
  },
  "father": {
    "name": "Father Name",
    "cell": "+8801712345678",
    "occupation": "Business"
  }
}
```

### Add Education Record
```javascript
POST /api/user/profiles/:studentId/education
Authorization: Bearer <token>

{
  "examName": "SSC",
  "group": "Science",
  "roll": "123456",
  "passingYear": 2018,
  "cgpa": 5.0,
  "boardOrUniversity": "Dhaka Board"
}
```

## Implementation Details

### Files Created
- `models/StudentProfile.js` - Mongoose schema with soft delete
- `services/studentProfileService.js` - Business logic layer
- `controllers/studentProfileController.js` - Request handlers
- `routes/studentProfileRoutes.js` - Route definitions with auth
- `validations/studentProfileValidation.js` - Zod validation schemas

### Integration
- Routes mounted in `routes/index.js` at `/profiles`
- Uses existing auth middleware (`authenticate`, `authorize`)
- Uses existing validation middleware (`validate`)
- Follows existing API response patterns (`ApiResponse`)

## Notes
1. All date fields accept ISO 8601 date strings
2. Empty strings are allowed for enum fields to support optional selections
3. Education records are zero-indexed when using the index parameter
4. Soft deletes preserve data integrity - use restore endpoint to recover
5. The studentId in URLs refers to the Student model's _id field
