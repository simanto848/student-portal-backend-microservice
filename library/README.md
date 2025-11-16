# Library Management Service

Complete library management system for the Student Portal Backend with automated notifications, fine tracking, and book borrowing workflows.

## Features

### Core Functionality
- ✅ **Library Management** - Create and manage multiple libraries
- ✅ **Book Catalog** - Comprehensive book information management
- ✅ **Book Copy Tracking** - Track individual book copies and their status
- ✅ **Borrowing System** - Complete workflow for borrowing and returning books
- ✅ **Fine Calculation** - Automatic fine calculation for overdue books
- ✅ **Email Notifications** - Automated reminders before due dates
- ✅ **Public API** - View available books without authentication

### Authorization
- **Library Management**: Only `super_admin`, `admin`, and `library` roles
- **Borrowing Operations**: All authenticated users
- **View Available Books**: Public access (no authentication required)
- **View History**: Users can only see their own borrowing history

### Automated Notifications
The system automatically sends email reminders:
- **7 Days Before Due Date**: First reminder
- **2 Days Before Due Date**: Urgent reminder
- **Overdue Notices**: Weekly notices for overdue books

Scheduled to run daily at 9:00 AM.

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (running locally or remote)
- Email service credentials (Gmail recommended)

### Installation

1. Install dependencies:
```bash
cd library
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
```env
PORT=8008
MONGO_URI=mongodb://localhost:27017/student_portal_library
JWT_SECRET=mysupersecrectkey
USER_SERVICE_URL=http://localhost:8007
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
```

4. Start the service:
```bash
npm start
# or for development
npm run dev
```

## API Endpoints

### Libraries (Admin Only)

#### List All Libraries
```http
GET /api/library/libraries
Authorization: Bearer <token>
```

#### Create Library
```http
POST /api/library/libraries
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Central Library",
  "code": "CL001",
  "description": "Main campus library",
  "address": "123 Campus Road",
  "phone": "01712345678",
  "email": "library@university.edu",
  "maxBorrowLimit": 3,
  "borrowDuration": 120,
  "finePerDay": 50,
  "status": "active"
}
```

#### Get Library Details
```http
GET /api/library/libraries/:id
Authorization: Bearer <token>
```

#### Update Library
```http
PATCH /api/library/libraries/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Library Name",
  "finePerDay": 75
}
```

#### Delete Library
```http
DELETE /api/library/libraries/:id
Authorization: Bearer <token>
```

#### Restore Library
```http
POST /api/library/libraries/:id/restore
Authorization: Bearer <token>
```

### Books

#### View Available Books (Public)
```http
GET /api/library/books/available?page=1&limit=10&search=programming
```

Response includes:
- Book details
- Available copies count
- Library information

#### List All Books (Admin)
```http
GET /api/library/books
Authorization: Bearer <token>
```

#### Create Book (Admin)
```http
POST /api/library/books
Authorization: Bearer <token>
Content-Type: application/json

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

#### Get Book Details (Admin)
```http
GET /api/library/books/:id
Authorization: Bearer <token>
```

#### Update Book (Admin)
```http
PATCH /api/library/books/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "price": 5500,
  "status": "active"
}
```

### Book Copies

#### View Available Copies (Public)
```http
GET /api/library/copies/book/:bookId/available
```

#### List All Copies (Admin)
```http
GET /api/library/copies
Authorization: Bearer <token>
```

#### Create Copy (Admin)
```http
POST /api/library/copies
Authorization: Bearer <token>
Content-Type: application/json

{
  "copyNumber": "CL001-001",
  "bookId": "book-uuid",
  "libraryId": "library-uuid",
  "acquisitionDate": "2024-01-15",
  "condition": "excellent",
  "location": "Shelf A-12",
  "status": "available"
}
```

#### Update Copy (Admin)
```http
PATCH /api/library/copies/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "condition": "good",
  "location": "Shelf B-05"
}
```

### Borrowing

#### Borrow a Book
```http
POST /api/library/borrowings/borrow
Authorization: Bearer <token>
Content-Type: application/json

{
  "copyId": "copy-uuid",
  "notes": "Optional notes"
}
```

The system automatically:
- Checks borrow limit (default: 3 books)
- Validates no unpaid fines
- Calculates due date based on library settings
- Updates copy status to 'borrowed'

#### Return a Book
```http
POST /api/library/borrowings/:borrowingId/return
Authorization: Bearer <token>
Content-Type: application/json

{
  "notes": "Book returned in good condition"
}
```

The system automatically:
- Calculates fines if overdue
- Updates copy status to 'available'
- Records return date

#### View My Borrowed Books
```http
GET /api/library/borrowings/my-borrowed?page=1&limit=10
Authorization: Bearer <token>
```

Response includes:
- Book and copy details
- Due date
- Days until due
- Potential fine if overdue

#### View My Overdue Books
```http
GET /api/library/borrowings/my-overdue
Authorization: Bearer <token>
```

Response includes:
- Overdue books
- Days overdue
- Current fine amount

#### View My Borrowing History
```http
GET /api/library/borrowings/my-history?page=1&limit=10
Authorization: Bearer <token>
```

Shows complete borrowing history including returned books.

#### View All Borrowings (Admin)
```http
GET /api/library/borrowings/all?page=1&limit=10&status=borrowed
Authorization: Bearer <token>
```

#### Update Borrowing Status (Admin)
```http
PATCH /api/library/borrowings/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "returned",
  "fineAmount": 150,
  "finePaid": true
}
```

#### Check and Update Overdue Books (Admin)
```http
POST /api/library/borrowings/check-overdue
Authorization: Bearer <token>
```

Manually triggers overdue status update for all borrowed books past due date.

## Database Models

### Library
- Basic information (name, code, description, address, contact)
- Borrowing rules (maxBorrowLimit, borrowDuration, finePerDay)
- Operating hours
- Status (active/inactive/maintenance)

### Book
- Book information (title, author, ISBN, publisher, etc.)
- Category and subject
- Language and pages
- Price
- Status (active/inactive/archived)
- Reference to library

### BookCopy
- Copy number (unique per library)
- Physical condition
- Location in library
- Status (available/borrowed/reserved/maintenance/lost)
- Acquisition date

### BookTakenHistory
- Borrower information
- Borrow and due dates
- Return date
- Status (borrowed/returned/overdue/lost)
- Fine amount and payment status
- Notes

## Fine Calculation

Fines are calculated automatically when a book is returned after the due date:

```
Fine = Days Overdue × Fine Per Day (from library settings)
```

Default fine per day: ৳50

Example:
- Due date: Jan 15, 2024
- Return date: Jan 20, 2024
- Days overdue: 5
- Fine per day: ৳50
- Total fine: ৳250

## Email Notifications

### Reminder Email (7 Days Before)
Sent when a book is due in 7 days. Includes:
- Book title and author
- Due date
- Fine per day information

### Urgent Reminder (2 Days Before)
Sent when a book is due in 2 days. Includes:
- Urgent notification styling
- Book details
- Warning about impending fines

### Overdue Notice
Sent weekly for overdue books. Includes:
- Days overdue
- Current fine amount
- Instructions to return

## Scheduled Jobs

The notification service runs daily at 9:00 AM:
1. Checks all borrowed books
2. Sends 7-day reminders
3. Sends 2-day reminders
4. Sends overdue notices
5. Updates overdue status

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error message",
  "statusCode": 400,
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

Common status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Server Error

## Testing

### Health Check
```bash
curl http://localhost:8008/health
```

### Test Borrowing Workflow

1. Create a library (as admin):
```bash
curl -X POST http://localhost:8000/api/library/libraries \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Library",
    "code": "TEST01",
    "maxBorrowLimit": 3,
    "borrowDuration": 14,
    "finePerDay": 50
  }'
```

2. Add a book:
```bash
curl -X POST http://localhost:8000/api/library/books \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Book",
    "author": "Test Author",
    "category": "Test",
    "libraryId": "<library-id>"
  }'
```

3. Add a copy:
```bash
curl -X POST http://localhost:8000/api/library/copies \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "copyNumber": "TEST-001",
    "bookId": "<book-id>",
    "libraryId": "<library-id>"
  }'
```

4. Borrow the book (as student):
```bash
curl -X POST http://localhost:8000/api/library/borrowings/borrow \
  -H "Authorization: Bearer <student-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "copyId": "<copy-id>"
  }'
```

5. View borrowed books:
```bash
curl http://localhost:8000/api/library/borrowings/my-borrowed \
  -H "Authorization: Bearer <student-token>"
```

## Integration with User Service

The library service integrates with the user service for:
- JWT token verification
- User information retrieval for emails
- Authorization based on user roles

Make sure the user service is running and accessible at the configured URL.

## Cascade Delete Behavior

When entities are soft-deleted, related entities are automatically soft-deleted:

- **Library deleted** → All books, copies, and borrowing records
- **Book deleted** → All copies and borrowing records
- **Copy deleted** → All borrowing records

This ensures data integrity while maintaining soft delete functionality.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | 8008 |
| `MONGO_URI` | MongoDB connection string | mongodb://localhost:27017/student_portal_library |
| `JWT_SECRET` | JWT secret for token verification | - |
| `USER_SERVICE_URL` | User service URL | http://localhost:8007 |
| `MAIL_HOST` | SMTP host | smtp.gmail.com |
| `MAIL_PORT` | SMTP port | 587 |
| `MAIL_USER` | Email username | - |
| `MAIL_PASS` | Email password | - |
| `MAIL_FROM` | Email sender name | EDUCATION HUB |
| `FRONTEND_URL` | Frontend login URL | http://localhost:3000/login |

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production mode
npm start
```

## Contributing

When adding new features:
1. Follow the existing code structure
2. Add appropriate validations using Zod
3. Implement proper error handling
4. Update this README
5. Test all endpoints

## License

ISC
