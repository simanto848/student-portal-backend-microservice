# 🎓 Student Portal Backend - Library Management Service

## Executive Summary

The Library Management Service is a complete, production-ready microservice that provides comprehensive library operations for the Student Portal Backend system. Built with Node.js, Express, and MongoDB, it features automated notifications, fine calculation, and role-based access control.

## 📖 Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Architecture](#architecture)
- [API Overview](#api-overview)
- [Documentation](#documentation)
- [Deployment](#deployment)
- [Security](#security)
- [Support](#support)

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- MongoDB 5.0+
- Email service (Gmail/SMTP)

### Installation
```bash
cd library
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

### Verify Installation
```bash
curl http://localhost:8008/health
```

Expected response:
```json
{
  "success": true,
  "message": "Library service is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## ✨ Features

### Core Functionality
- **Library Management** - Create and manage multiple libraries with custom settings
- **Book Catalog** - Comprehensive book information and categorization
- **Copy Tracking** - Track individual book copies with status and condition
- **Borrowing System** - Complete workflow for borrowing and returning books
- **Fine Management** - Automatic calculation and tracking of overdue fines
- **Public API** - View available books without authentication

### Automated Operations
- **Email Notifications** - Automatic reminders 7 days and 2 days before due date
- **Overdue Detection** - Daily status updates for overdue books
- **Fine Calculation** - Automatic calculation on book returns
- **Availability Updates** - Real-time tracking of available copies

### Access Control
- **Admin Operations** - Library management restricted to super_admin, admin, library roles
- **User Operations** - All authenticated users can borrow and return books
- **Public Access** - Anyone can view available books
- **Privacy** - Users can only view their own borrowing history

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express 5
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Zod schemas
- **Authentication**: JWT (from User Service)
- **Email**: Nodemailer with EJS templates
- **Scheduling**: node-cron

### Service Structure
```
library/
├── config/           # Database configuration
├── controllers/      # Request handlers
├── services/         # Business logic
├── models/          # MongoDB schemas
├── routes/          # API endpoints
├── middlewares/     # Auth, validation, error handling
├── validations/     # Zod schemas
├── utils/           # Helpers and utilities
├── clients/         # Inter-service communication
└── views/           # Email templates
```

### Data Models
1. **Library** - Library information and settings
2. **Book** - Book catalog entries
3. **BookCopy** - Individual physical copies
4. **BookTakenHistory** - Borrowing records

## 🔌 API Overview

### Base URL
```
http://localhost:8000/api/library
```

### Authentication
Most endpoints require JWT authentication:
```
Authorization: Bearer <your-jwt-token>
```

### Key Endpoints

#### Public Endpoints (No Auth Required)
```http
GET /books/available              # View available books
GET /copies/book/:bookId/available # View available copies
```

#### User Endpoints (Auth Required)
```http
POST /borrowings/borrow           # Borrow a book
POST /borrowings/:id/return       # Return a book
GET /borrowings/my-borrowed       # View borrowed books
GET /borrowings/my-overdue        # View overdue books
GET /borrowings/my-history        # View borrowing history
```

#### Admin Endpoints (Admin/Library Only)
```http
# Libraries
GET /libraries                    # List all libraries
POST /libraries                   # Create library
PATCH /libraries/:id              # Update library
DELETE /libraries/:id             # Delete library

# Books
GET /books                        # List all books
POST /books                       # Create book
PATCH /books/:id                  # Update book
DELETE /books/:id                 # Delete book

# Copies
GET /copies                       # List all copies
POST /copies                      # Create copy
PATCH /copies/:id                 # Update copy
DELETE /copies/:id                # Delete copy

# Borrowing Management
GET /borrowings/all               # View all borrowings
PATCH /borrowings/:id             # Update borrowing
POST /borrowings/check-overdue    # Run overdue check
```

### Example Requests

#### Borrow a Book
```bash
curl -X POST http://localhost:8000/api/library/borrowings/borrow \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"copyId": "copy-uuid"}'
```

#### View My Borrowed Books
```bash
curl http://localhost:8000/api/library/borrowings/my-borrowed \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### View Available Books (Public)
```bash
curl http://localhost:8000/api/library/books/available?page=1&limit=10
```

## 📚 Documentation

### Available Documents

| Document | Description | Size |
|----------|-------------|------|
| **README.md** | Service overview and getting started guide | 11.7 KB |
| **API_DOCUMENTATION.md** | Complete API reference with examples | 13.0 KB |
| **SECURITY.md** | Security considerations and best practices | 7.4 KB |
| **DEPLOYMENT.md** | Deployment guide for various platforms | 10.7 KB |

### Quick Links
- [Full API Documentation](./API_DOCUMENTATION.md)
- [Security Guidelines](./SECURITY.md)
- [Deployment Guide](./DEPLOYMENT.md)

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
```

### Docker
```bash
docker build -t library-service .
docker run -d -p 8008:8008 --env-file .env library-service
```

### Cloud Platforms
- AWS EC2
- Heroku
- DigitalOcean App Platform
- Google Cloud Platform

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## 🔒 Security

### Implemented Security Measures
✅ JWT-based authentication  
✅ Role-based authorization  
✅ Input validation with Zod  
✅ SQL/NoSQL injection prevention  
✅ Secure password handling  
✅ Error message sanitization  
✅ Security headers (Helmet.js)  

### CodeQL Analysis
- No critical vulnerabilities found
- Rate limiting recommended for production
- CSRF not required for JWT-based API

### Production Recommendations
1. Add rate limiting
2. Configure CORS
3. Enable HTTPS
4. Use strong JWT secrets
5. Setup monitoring and logging

See [SECURITY.md](./SECURITY.md) for complete security guidelines.

## 🔄 Automated Processes

### Daily Scheduled Tasks (9:00 AM)
1. **Check Due Dates** - Scan all borrowed books
2. **Send 7-Day Reminders** - Books due in 7 days
3. **Send 2-Day Reminders** - Books due in 2 days
4. **Send Overdue Notices** - Weekly for overdue books
5. **Update Overdue Status** - Mark books as overdue

### On-Demand Operations
- **Check Overdue** - Manually trigger via API
- **Calculate Fines** - Automatic on book return
- **Update Availability** - Real-time on borrow/return

## 📊 Business Rules

### Borrowing Limits
- Default: 3 books per user
- Configurable per library
- Blocked if limit reached

### Fine Calculation
```
Fine = Days Overdue × Fine Per Day
```
- Default: ৳50 per day
- Configurable per library
- Calculated on return

### Due Date Calculation
```
Due Date = Borrow Date + Borrow Duration
```
- Default: 120 days
- Configurable per library

### Borrowing Restrictions
❌ Cannot borrow if:
- Borrow limit reached
- Has unpaid fines
- Copy not available

## 🧪 Testing

### Health Check
```bash
curl http://localhost:8008/health
```

### Test Workflow
1. Create library (admin)
2. Add book (admin)
3. Add copy (admin)
4. Borrow book (user)
5. View borrowed books (user)
6. Return book (user)
7. Check fine calculation

### Manual Testing Checklist
- [ ] Create library
- [ ] Add book with multiple copies
- [ ] Borrow book
- [ ] View borrowed books
- [ ] Test borrow limit
- [ ] Return book before due date (no fine)
- [ ] Return book after due date (with fine)
- [ ] View borrowing history
- [ ] Check email notifications
- [ ] Test public API (no auth)

## 🐛 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check if port is in use
netstat -tuln | grep 8008

# Check MongoDB connection
mongosh --eval "db.runCommand({ping: 1})"

# Check logs
pm2 logs library-service
```

#### Emails Not Sending
- Verify SMTP credentials
- Check firewall/security settings
- Test with direct nodemailer script
- Verify Gmail app password (if using Gmail)

#### Database Connection Failed
- Check MongoDB is running
- Verify connection string
- Check network connectivity
- Verify authentication credentials

## 🤝 Integration

### With User Service
The library service integrates with the user service for:
- JWT token verification
- User information retrieval
- Role-based authorization

Configuration:
```env
USER_SERVICE_URL=http://localhost:8007
JWT_SECRET=same-secret-as-user-service
```

### With Gateway
The API gateway proxies requests to the library service:
```javascript
app.use('/api/library', expressProxy('http://localhost:8008'));
```

## 📈 Monitoring

### Key Metrics to Monitor
- Request response times
- Error rates
- Database query performance
- Email delivery success rate
- Active borrowings
- Overdue books count
- Fine collection

### Recommended Tools
- PM2 for process monitoring
- New Relic / Datadog for APM
- MongoDB Atlas for database metrics
- UptimeRobot for uptime monitoring

## 🔄 Maintenance

### Regular Tasks
- **Daily**: Check scheduled jobs ran successfully
- **Weekly**: Review error logs
- **Monthly**: Database backup verification
- **Quarterly**: Security audit
- **Annually**: Dependency updates

### Backup Strategy
- Daily automated MongoDB backups
- 30-day retention period
- Test restore procedures regularly

## 📞 Support

### Getting Help
1. Check documentation in `/library` folder
2. Review error logs
3. Consult troubleshooting section
4. Check GitHub issues

### Reporting Issues
When reporting issues, include:
- Error messages and stack traces
- Request/response examples
- Environment details
- Steps to reproduce

## 📝 Changelog

### Version 1.0.0 (Current)
**Initial Release**
- Complete library management system
- Book borrowing and returning
- Automated email notifications
- Fine calculation and tracking
- Role-based access control
- Public API for available books
- Comprehensive documentation

## 🎯 Future Enhancements

### Planned Features
- Book request/reservation system
- Mobile app support
- QR code scanning
- Advanced reporting
- Analytics dashboard
- Webhook support
- Multi-language support

### Performance Optimizations
- Redis caching
- Database query optimization
- CDN for static assets
- Load balancing

## 📄 License

ISC

## 👥 Credits

Developed as part of the Student Portal Backend Microservice project.

---

## Quick Reference Card

### Service Information
- **Port**: 8008 (default)
- **Protocol**: HTTP/HTTPS
- **Base Path**: `/api/library`
- **Database**: MongoDB
- **Authentication**: JWT Bearer Token

### Environment Variables
```env
PORT=8008
MONGO_URI=mongodb://localhost:27017/student_portal_library
JWT_SECRET=your-secret-key
USER_SERVICE_URL=http://localhost:8007
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
```

### Useful Commands
```bash
# Start service
npm start

# Development mode
npm run dev

# Health check
curl http://localhost:8008/health

# View logs (PM2)
pm2 logs library-service

# Restart service (PM2)
pm2 restart library-service
```

### Support Resources
- 📖 [API Documentation](./API_DOCUMENTATION.md)
- 🔒 [Security Guide](./SECURITY.md)
- 🚀 [Deployment Guide](./DEPLOYMENT.md)
- 📚 [README](./README.md)

---

**Last Updated**: November 2024  
**Version**: 1.0.0  
**Status**: Production Ready ✅
