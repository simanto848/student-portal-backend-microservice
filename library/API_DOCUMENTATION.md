# Library Management API Documentation

## Base URL
```
http://localhost:8000/api/library
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Role-Based Access

### Roles
- `super_admin` - Full access to all endpoints
- `admin` - Full access to all endpoints
- `library` - Full access to library management
- `student` - Can borrow/return books and view their history
- `teacher` - Can borrow/return books and view their history
- `staff` - Can borrow/return books and view their history

## API Endpoints

### 1. Libraries

#### 1.1 List All Libraries
**Endpoint:** `GET /libraries`  
**Auth:** Required (admin/library only)  
**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by name, code, or email
- `status` (optional): Filter by status (active/inactive/maintenance)

**Response:**
```json
{
  "success": true,
  "message": "Libraries retrieved successfully",
  "data": {
    "libraries": [
      {
        "id": "library-uuid",
        "name": "Central Library",
        "code": "CL001",
        "address": "123 Campus Road",
        "phone": "01712345678",
        "email": "library@university.edu",
        "maxBorrowLimit": 3,
        "borrowDuration": 120,
        "finePerDay": 50,
        "status": "active",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

#### 1.2 Create Library
**Endpoint:** `POST /libraries`  
**Auth:** Required (admin/library only)  
**Request Body:**
```json
{
  "name": "Central Library",
  "code": "CL001",
  "description": "Main campus library",
  "address": "123 Campus Road",
  "phone": "01712345678",
  "email": "library@university.edu",
  "operatingHours": {
    "monday": "9:00 AM - 5:00 PM",
    "tuesday": "9:00 AM - 5:00 PM"
  },
  "maxBorrowLimit": 3,
  "borrowDuration": 120,
  "finePerDay": 50,
  "facultyId": "faculty-uuid",
  "status": "active"
}
```

**Validation Rules:**
- `name`: Required, max 100 characters
- `code`: Required, unique, max 50 characters, uppercase
- `maxBorrowLimit`: Min 1, default 3
- `borrowDuration`: Min 1 day, default 120
- `finePerDay`: Min 0, default 50

---

### 2. Books

#### 2.1 View Available Books (Public)
**Endpoint:** `GET /books/available`  
**Auth:** Not required  
**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by title, author, category, subject
- `category` (optional): Filter by category
- `libraryId` (optional): Filter by library

**Response:**
```json
{
  "success": true,
  "message": "Available books retrieved successfully",
  "data": {
    "books": [
      {
        "id": "book-uuid",
        "title": "Introduction to Algorithms",
        "author": "Thomas H. Cormen",
        "isbn": "9780262033848",
        "category": "Computer Science",
        "subject": "Algorithms",
        "language": "English",
        "availableCopies": 5,
        "libraryId": {
          "id": "library-uuid",
          "name": "Central Library",
          "code": "CL001"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

#### 2.2 Create Book
**Endpoint:** `POST /books`  
**Auth:** Required (admin/library only)  
**Request Body:**
```json
{
  "title": "Introduction to Algorithms",
  "author": "Thomas H. Cormen",
  "isbn": "9780262033848",
  "publisher": "MIT Press",
  "publicationYear": 2009,
  "edition": "3rd",
  "category": "Computer Science",
  "subject": "Algorithms",
  "description": "Comprehensive algorithms textbook",
  "language": "English",
  "pages": 1312,
  "price": 5000,
  "libraryId": "library-uuid",
  "status": "active"
}
```

**Validation Rules:**
- `title`: Required, max 100 characters
- `author`: Required, max 100 characters
- `isbn`: Optional, unique, max 20 characters
- `category`: Required, max 50 characters
- `publicationYear`: Min 1000, max current year + 1
- `libraryId`: Required, must exist

---

### 3. Book Copies

#### 3.1 View Available Copies (Public)
**Endpoint:** `GET /copies/book/:bookId/available`  
**Auth:** Not required  

**Response:**
```json
{
  "success": true,
  "message": "Available copies retrieved successfully",
  "data": {
    "copies": [
      {
        "id": "copy-uuid",
        "copyNumber": "CL001-001",
        "condition": "excellent",
        "location": "Shelf A-12",
        "status": "available",
        "libraryId": {
          "id": "library-uuid",
          "name": "Central Library",
          "code": "CL001"
        }
      }
    ],
    "count": 1
  }
}
```

#### 3.2 Create Book Copy
**Endpoint:** `POST /copies`  
**Auth:** Required (admin/library only)  
**Request Body:**
```json
{
  "copyNumber": "CL001-001",
  "bookId": "book-uuid",
  "libraryId": "library-uuid",
  "acquisitionDate": "2024-01-15",
  "condition": "excellent",
  "location": "Shelf A-12",
  "status": "available",
  "notes": "New acquisition"
}
```

**Validation Rules:**
- `copyNumber`: Required, unique per library, max 50 characters
- `bookId`: Required, must exist
- `libraryId`: Required, must exist
- `condition`: excellent/good/fair/poor/damaged (default: good)
- `status`: available/borrowed/reserved/maintenance/lost (default: available)

---

### 4. Borrowing

#### 4.1 Borrow a Book
**Endpoint:** `POST /borrowings/borrow`  
**Auth:** Required (any authenticated user)  
**Request Body:**
```json
{
  "copyId": "copy-uuid",
  "notes": "Optional notes"
}
```

**Validation:**
- User must not exceed borrow limit (default: 3 books)
- User must not have unpaid fines
- Copy must be available

**Response:**
```json
{
  "success": true,
  "message": "Book borrowed successfully",
  "data": {
    "id": "borrowing-uuid",
    "borrowerId": "user-uuid",
    "bookId": "book-uuid",
    "copyId": "copy-uuid",
    "libraryId": "library-uuid",
    "borrowDate": "2024-01-15T10:00:00.000Z",
    "dueDate": "2024-05-14T10:00:00.000Z",
    "status": "borrowed",
    "fineAmount": 0,
    "finePaid": false
  }
}
```

#### 4.2 Return a Book
**Endpoint:** `POST /borrowings/:id/return`  
**Auth:** Required (any authenticated user)  
**Request Body:**
```json
{
  "notes": "Book returned in good condition"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Book returned successfully",
  "data": {
    "id": "borrowing-uuid",
    "borrowerId": "user-uuid",
    "returnDate": "2024-05-10T10:00:00.000Z",
    "status": "returned",
    "fineAmount": 0,
    "finePaid": false
  }
}
```

**Fine Calculation:**
- If returned after due date: `(Days Overdue) × (Fine Per Day)`
- Fine is automatically calculated and stored

#### 4.3 View My Borrowed Books
**Endpoint:** `GET /borrowings/my-borrowed`  
**Auth:** Required (any authenticated user)  
**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "message": "Borrowed books retrieved successfully",
  "data": {
    "borrowings": [
      {
        "id": "borrowing-uuid",
        "borrowDate": "2024-01-15T10:00:00.000Z",
        "dueDate": "2024-05-14T10:00:00.000Z",
        "status": "borrowed",
        "daysUntilDue": 45,
        "isOverdue": false,
        "potentialFine": 0,
        "bookId": {
          "id": "book-uuid",
          "title": "Introduction to Algorithms",
          "author": "Thomas H. Cormen"
        },
        "copyId": {
          "id": "copy-uuid",
          "copyNumber": "CL001-001",
          "location": "Shelf A-12"
        },
        "libraryId": {
          "id": "library-uuid",
          "name": "Central Library",
          "finePerDay": 50
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

#### 4.4 View My Overdue Books
**Endpoint:** `GET /borrowings/my-overdue`  
**Auth:** Required (any authenticated user)  

**Response:**
```json
{
  "success": true,
  "message": "Overdue books retrieved successfully",
  "data": {
    "borrowings": [
      {
        "id": "borrowing-uuid",
        "dueDate": "2024-01-10T10:00:00.000Z",
        "status": "overdue",
        "daysOverdue": 5,
        "currentFine": 250,
        "finePaid": false,
        "bookId": {
          "title": "Introduction to Algorithms",
          "author": "Thomas H. Cormen"
        }
      }
    ]
  }
}
```

#### 4.5 View My Borrowing History
**Endpoint:** `GET /borrowings/my-history`  
**Auth:** Required (any authenticated user)  
**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by status

**Response:** Similar to borrowed books, includes all statuses

#### 4.6 View All Borrowings (Admin)
**Endpoint:** `GET /borrowings/all`  
**Auth:** Required (admin/library only)  
**Query Parameters:**
- `page`, `limit`, `status`, `borrowerId`, `libraryId`

**Response:** Paginated list of all borrowing records

#### 4.7 Update Borrowing Status (Admin)
**Endpoint:** `PATCH /borrowings/:id`  
**Auth:** Required (admin/library only)  
**Request Body:**
```json
{
  "status": "returned",
  "fineAmount": 150,
  "finePaid": true,
  "returnDate": "2024-01-20T10:00:00.000Z",
  "notes": "Fine paid in cash"
}
```

---

## Email Notifications

### Reminder Email (7 Days Before Due)
Automatically sent 7 days before the due date.

**Content:**
- Book title and author
- Due date
- Fine per day information
- Link to view borrowed books

### Urgent Reminder (2 Days Before Due)
Automatically sent 2 days before the due date.

**Content:**
- Urgent warning
- Book details
- Immediate action required
- Fine information

### Overdue Notice
Sent weekly for books that are overdue.

**Content:**
- Days overdue
- Current fine amount
- Book details
- Instructions to return immediately

---

## Error Codes

| Code | Description | Example |
|------|-------------|---------|
| 200 | Success | Operation completed successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data or business logic violation |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | User doesn't have permission for this action |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists (duplicate) |
| 422 | Validation Error | Request data validation failed |
| 500 | Server Error | Internal server error |

---

## Error Response Format

```json
{
  "success": false,
  "message": "Error message",
  "statusCode": 400,
  "errors": [
    {
      "field": "fieldName",
      "message": "Specific error message"
    }
  ]
}
```

---

## Common Use Cases

### Use Case 1: Student Borrows a Book
1. Student views available books: `GET /books/available`
2. Student checks available copies: `GET /copies/book/:bookId/available`
3. Student borrows a copy: `POST /borrowings/borrow`
4. System sends confirmation (future feature)

### Use Case 2: Student Returns a Book
1. Student views borrowed books: `GET /borrowings/my-borrowed`
2. Student returns a book: `POST /borrowings/:id/return`
3. System calculates fine (if overdue)
4. Copy becomes available again

### Use Case 3: Library Staff Adds New Book
1. Staff creates book: `POST /books`
2. Staff adds copies: `POST /copies` (multiple times)
3. Books become available for borrowing

### Use Case 4: Admin Checks Overdue Books
1. Admin views all borrowings: `GET /borrowings/all?status=overdue`
2. Admin updates fine status: `PATCH /borrowings/:id`
3. System sends overdue notices automatically

---

## Testing with cURL

### Get Available Books (No Auth)
```bash
curl -X GET "http://localhost:8000/api/library/books/available?page=1&limit=10"
```

### Create Library (Admin)
```bash
curl -X POST http://localhost:8000/api/library/libraries \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Central Library",
    "code": "CL001",
    "maxBorrowLimit": 3,
    "borrowDuration": 120,
    "finePerDay": 50
  }'
```

### Borrow Book (Student)
```bash
curl -X POST http://localhost:8000/api/library/borrowings/borrow \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "copyId": "copy-uuid-here"
  }'
```

### View My Borrowed Books
```bash
curl -X GET http://localhost:8000/api/library/borrowings/my-borrowed \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Rate Limiting

Currently not implemented. Consider adding rate limiting in production.

## Webhooks

Currently not implemented. Future feature for real-time notifications.

## Changelog

### Version 1.0.0 (Current)
- Initial release
- Complete CRUD for libraries, books, and copies
- Book borrowing and returning
- Automated email notifications
- Fine calculation
- Public API for available books
