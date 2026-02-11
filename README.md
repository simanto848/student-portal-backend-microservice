# Student Portal Backend - Microservices Architecture

A resilient, scalable microservices backend for an Educational Institution Portal. This system manages everything from user authentication and academic planning to real-time communication and AI-powered scheduling.

## 🏗️ System Architecture

The project follows a **Microservices Architecture** with a centralized **API Gateway** managing traffic, security, and service health.

### 🧩 Core Services

| Service | Port | Primary Responsibilities |
| :--- | :--- | :--- |
| **[Gateway](gateway)** | `8000` | Traffic routing, Health monitoring, Circuit breaking, Rate limiting |
| **[User](user)** | `8001` | Authentication (JWT/OTP), RBAC, Profiles (Student, Teacher, Admin) |
| **[Academic](academic)** | `8002` | Courses, Syllabus, Faculty management, **AI Scheduling** |
| **[Classroom](classroom)** | `8003` | Virtual classrooms, Assignments, Quizzes, AI Question Generation |
| **[Communication](communication)**| `8004` | Real-time chat (Batch & Course groups), Message persistence |
| **[Enrollment](enrollment)** | `8005` | Course registration, Attendance, Result workflows, Grading |
| **[Library](library)** | `8006` | Book catalog, Reservations, Borrowing lifecycle management |
| **[Notification](notification)** | `8007` | Omnichannel alerts (Email, Socket.io), Recurring reminders |
| **[Shared](shared)** | - | Common Middleware, Logger, Event Bus, Domain Utilities |

### 🛠️ Technology Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Messaging**: RabbitMQ (Event-driven communication)
- **Caching**: Redis (Event Bus & Rate Limiting)
- **AI Integration**: Google Gemini API (for scheduling & content generation)
- **Real-time**: Socket.io (Communication & Notifications)

## 🚀 Key Features

### 🛡️ Smart Gateway
- **Service Registry**: Automatically tracks available microservices.
- **Circuit Breaker**: Prevents cascading failures by monitoring service error rates.
- **Health Dashboard**: Exposes `/api/system-health` for real-time monitoring.
- **Request Transformation**: Standardizes headers and injects tracing metadata.

### 🎓 Academic & Enrollment
- **Auto Schedule Planner**: Generates optimized class schedules using Greedy algorithms.
- **Result Workflow**: Multi-stage approval process for academic results.
- **Attendance**: Detailed student attendance stats and reporting.

### 💬 Engagement & Collaboration
- **Interactive Quizzes**: Support for various question types with AI-assisted generation.
- **Resource Hub**: Centralized material sharing for classrooms.
- **Real-time Chat**: Group communications for entire batches or specific courses.

## 🏁 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **NPM** (configured for Workspaces)
- **MongoDB** instance
- **RabbitMQ** & **Redis** servers

### Installation

1. **Clone & Install Dependencies**:
   ```bash
   npm install
   ```
   *This root-level command installs dependencies for all microservices using npm workspaces.*

2. **Environment Configuration**:
   Each service requires its own `.env` file. We provide a quick setup script:
   ```bash
   # Copy base example to root
   cp .env.example .env

   # Copy examples to all services
   for dir in user academic gateway library notification enrollment communication classroom shared; do
     cp $dir/.env.example $dir/.env
   done
   ```

3. **Required Secrets**:
   Ensure the following variables are set in your root `.env`:
   - `JWT_SECRET`: Random string for token signing.
   - `GEMINI_API`: Google AI API key for scheduling features.
   - `USER_MONGO_URI`: Primary database connection string.

### Running Locally

You can launch services individually using NPM workspace scripts:

```bash
# Start all core services in separate terminals or background
npm run start:gateway
npm run start:user
npm run start:academic
npm run start:classroom
npm run start:enrollment
npm run start:communication
npm run start:library
npm run start:notification
```

## 📊 Monitoring & Logs

The system features a centralized logging architecture:
- **Shared Logger**: Winston-based logger with a custom MongoDB transport.
- **System Metrics**: Each service tracks request counts, errors, and latency.

---

© 2026 Dhaka International University. Built with resilience and scalability in mind.
