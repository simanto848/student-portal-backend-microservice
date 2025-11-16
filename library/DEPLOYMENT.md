# Library Service Deployment Guide

## Overview
This guide covers deployment of the Library Management Service in different environments.

## Prerequisites

### System Requirements
- Node.js 16+ 
- MongoDB 5.0+
- Email service (Gmail/SMTP)
- Minimum 512MB RAM
- Recommended 1GB RAM for production

### Required Services
- User Service (running at configured URL)
- MongoDB instance (local or cloud)
- SMTP server for emails

## Environment Setup

### 1. Development Environment

```bash
# Clone repository (if not already done)
git clone https://github.com/simanto848/student-portal-backend-microservice.git
cd student-portal-backend-microservice/library

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your settings
nano .env

# Start in development mode
npm run dev
```

### 2. Production Environment

```bash
# Set NODE_ENV
export NODE_ENV=production

# Install only production dependencies
npm install --production

# Start service
npm start
```

## Configuration

### Environment Variables

#### Required Variables
```env
# Service Configuration
PORT=8008
NODE_ENV=production

# Database
MONGO_URI=mongodb://localhost:27017/student_portal_library

# Authentication
JWT_SECRET=your-secure-secret-key-here-minimum-32-chars

# User Service
USER_SERVICE_URL=http://localhost:8007

# Email Service
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-specific-password
```

#### Optional Variables
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_FROM=EDUCATION HUB
FRONTEND_URL=http://localhost:3000/login
HELP_CENTER_URL=http://localhost:3000/help
COMPANY_LOGO_URL=https://yoursite.com/logo.png
```

### Gmail Setup for Emails

1. Enable 2-Factor Authentication on your Google account
2. Generate App Password:
   - Go to Google Account → Security
   - App passwords → Mail → Generate
3. Use generated password in `MAIL_PASS`

### MongoDB Configuration

#### Local MongoDB
```bash
# Install MongoDB
sudo apt-get install mongodb

# Start MongoDB
sudo systemctl start mongodb

# Verify it's running
sudo systemctl status mongodb
```

#### MongoDB Atlas (Cloud)
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create cluster
3. Get connection string
4. Add to `MONGO_URI` in .env

## Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 8008

CMD ["npm", "start"]
```

### Build and Run
```bash
# Build image
docker build -t library-service .

# Run container
docker run -d \
  --name library-service \
  -p 8008:8008 \
  --env-file .env \
  library-service
```

### Docker Compose

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:5.0
    container_name: library-mongo
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongo-data:/data/db

  library-service:
    build: .
    container_name: library-service
    ports:
      - "8008:8008"
    environment:
      - PORT=8008
      - MONGO_URI=mongodb://admin:password@mongodb:27017/student_portal_library?authSource=admin
      - JWT_SECRET=${JWT_SECRET}
      - USER_SERVICE_URL=${USER_SERVICE_URL}
      - MAIL_USER=${MAIL_USER}
      - MAIL_PASS=${MAIL_PASS}
    depends_on:
      - mongodb

volumes:
  mongo-data:
```

Run with:
```bash
docker-compose up -d
```

## PM2 Deployment (Production)

### Install PM2
```bash
npm install -g pm2
```

### Create ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'library-service',
    script: 'server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8008
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

### Start with PM2
```bash
# Start service
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup

# Monitor
pm2 monit

# View logs
pm2 logs library-service
```

## Nginx Configuration

### Setup Nginx as Reverse Proxy
```nginx
server {
    listen 80;
    server_name library.yoursite.com;

    location /api/library {
        proxy_pass http://localhost:8008;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Enable SSL with Certbot
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d library.yoursite.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Cloud Deployment

### AWS EC2

1. **Launch EC2 Instance**
   - Choose Ubuntu 22.04 LTS
   - t2.micro for testing, t2.small+ for production
   - Configure security group (port 8008, 22, 80, 443)

2. **Setup Environment**
```bash
# Connect to instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Update system
sudo apt-get update
sudo apt-get upgrade

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB (or use Atlas)
# See MongoDB configuration above

# Clone and setup service
git clone <your-repo>
cd library
npm install
cp .env.example .env
nano .env  # Configure

# Install PM2 and start
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Heroku

1. **Create heroku.yml**
```yaml
build:
  docker:
    web: Dockerfile
run:
  web: npm start
```

2. **Deploy**
```bash
# Login to Heroku
heroku login

# Create app
heroku create library-service-app

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set JWT_SECRET=your-secret
heroku config:set USER_SERVICE_URL=https://user-service-url
heroku config:set MAIL_USER=your-email
heroku config:set MAIL_PASS=your-password

# Deploy
git push heroku main
```

### DigitalOcean App Platform

1. **Create App**
   - Connect GitHub repository
   - Select Node.js environment
   - Set environment variables
   - Choose region

2. **Configure**
```yaml
name: library-service
services:
- name: web
  github:
    repo: your-username/your-repo
    branch: main
    deploy_on_push: true
  source_dir: /library
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: PORT
    value: "8008"
  - key: MONGO_URI
    value: ${mongodb.DATABASE_URL}
  - key: JWT_SECRET
    value: ${JWT_SECRET}
```

## Database Migration

### Initial Setup
```javascript
// Run this script once to setup indexes
const mongoose = require('mongoose');
require('./models/Library');
require('./models/Book');
require('./models/BookCopy');
require('./models/BookTakenHistory');

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Creating indexes...');
    return Promise.all([
      mongoose.model('Library').createIndexes(),
      mongoose.model('Book').createIndexes(),
      mongoose.model('BookCopy').createIndexes(),
      mongoose.model('BookTakenHistory').createIndexes(),
    ]);
  })
  .then(() => {
    console.log('Indexes created successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
```

## Monitoring & Logging

### Setup Logging
```bash
# Create logs directory
mkdir -p logs

# PM2 logs
pm2 logs --lines 100

# Export logs
pm2 logs --json > logs/pm2-logs.json
```

### Health Checks
```bash
# Basic health check
curl http://localhost:8008/health

# Setup monitoring (example with UptimeRobot)
# Add health check URL: https://your-domain.com/health
```

### Performance Monitoring
Consider adding:
- New Relic
- Datadog
- AWS CloudWatch
- Prometheus + Grafana

## Backup Strategy

### Database Backups
```bash
# Backup MongoDB
mongodump --uri="mongodb://localhost:27017/student_portal_library" --out=/backup/$(date +%Y%m%d)

# Restore MongoDB
mongorestore --uri="mongodb://localhost:27017/student_portal_library" /backup/20240101

# Automated daily backups with cron
0 2 * * * /usr/bin/mongodump --uri="mongodb://localhost:27017/student_portal_library" --out=/backup/$(date +\%Y\%m\%d)
```

## Scaling

### Horizontal Scaling
1. Use PM2 cluster mode
2. Load balancer (Nginx, HAProxy)
3. Multiple instances
4. Shared MongoDB instance

### Vertical Scaling
1. Increase instance resources
2. Optimize database queries
3. Add Redis for caching
4. Optimize indexes

## Troubleshooting

### Service Won't Start
```bash
# Check logs
pm2 logs library-service

# Check port availability
netstat -tuln | grep 8008

# Check MongoDB connection
mongosh --eval "db.runCommand({ping: 1})"
```

### Email Not Sending
```bash
# Test SMTP connection
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: { user: 'your-email', pass: 'your-pass' }
});
transporter.verify((err) => console.log(err || 'Ready'));
"
```

### High Memory Usage
```bash
# Check process memory
pm2 describe library-service

# Restart if needed
pm2 restart library-service

# Set memory limit
pm2 start ecosystem.config.js --max-memory-restart 1G
```

## Security Checklist

Before going live:
- [ ] Change default JWT_SECRET
- [ ] Use strong database password
- [ ] Enable HTTPS
- [ ] Configure CORS
- [ ] Add rate limiting
- [ ] Set up firewall rules
- [ ] Enable MongoDB authentication
- [ ] Review all environment variables
- [ ] Setup logging and monitoring
- [ ] Configure automated backups
- [ ] Test disaster recovery

## Rollback Procedure

If deployment fails:
```bash
# PM2 rollback
pm2 delete library-service
git checkout previous-version
npm install
pm2 start ecosystem.config.js

# Docker rollback
docker stop library-service
docker run previous-image

# Database rollback
mongorestore --uri="mongodb://localhost:27017/student_portal_library" /backup/last-good-backup
```

## Support

For issues:
1. Check logs: `pm2 logs library-service`
2. Review error messages
3. Check database connectivity
4. Verify environment variables
5. Consult documentation

---

**Remember:** Always test in staging before production deployment!
