# Student Portal Backend Microservices

This repository contains the backend microservices for the Student Portal application. It is built using **Node.js**, **Express**, and **Docker**.

## 🏗️ Architecture

The backend follows a microservice architecture with the following services:

| Service | Port | Description |
| :--- | :--- | :--- |
| **Gateway** | `8000` | API Gateway handling requests and routing to other services. |
| **User** | `8001` | Manages user profiles (Students, Teachers, Admin). |
| **Academic** | `8002` | Manages courses, schedules, and departments. |
| **Classroom** | `8003` | Manages physical classrooms and resources. |
| **Communication**| `8004` | Handles messages and announcements. |
| **Enrollment** | `8005` | Handles student enrollment and course registration. |
| **Library** | `8006` | Manages library books and lending. |
| **Notification** | `8007` | Sends push notifications and emails. |
| **Shared** | - | Shared utilities and middleware library. |

**Infrastructure Services:**
- **MongoDB**: `27017` (Database)
- **RabbitMQ**: `5672` (Message Broker)
- **Redis**: `6379` (Caching/Queues)

## 🚀 Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js](https://nodejs.org/) (v18+)

### 3. Installation

1.  **Clone the repository** (if not already done).
2.  **Install Dependencies**:
    ```bash
    npm install
    # or
    npm run install:all
    ```

### 3. Environment Setup

**Security Note:** This project uses environment variables for sensitive configuration. 
**Do NOT commit `.env` files.**

1.  **Create `.env` files**:
    We have provided `.env.example` files for each service. You need to create a `.env` file in each service directory.

    **Quick Setup (Copy Examples):**
    ```bash
    # Root
    cp .env.example .env

    # Services
    cp academic/.env.example academic/.env
    cp classroom/.env.example classroom/.env
    cp communication/.env.example communication/.env
    cp enrollment/.env.example enrollment/.env
    cp gateway/.env.example gateway/.env
    cp library/.env.example library/.env
    cp notification/.env.example notification/.env
    cp shared/.env.example shared/.env
    cp user/.env.example user/.env
    ```

2.  **Configure Secrets**:
    Open the root `.env` file and set your secrets:
    ```env
    JWT_SECRET=your_secure_random_string
    GEMINI_API=your_google_gemini_api_key
    ```
    *Note: The `docker-compose.yml` is configured to read `JWT_SECRET` and `GEMINI_API` from the root `.env` file and pass them to containers.*

## 🏃‍♂️ Running the Application

### Using Docker Compose (Recommended)

To start the entire system:

```bash
docker-compose up -d
```

- **Gateway** will be available at `http://localhost:8000`.
- **RabbitMQ Management UI**: `http://localhost:15672`.

To stop the services:
```bash
docker-compose down
```

### Running Locally (Dev Mode)

You can run individual services locally for development:

```bash
npm run start:user
npm run start:academic
# ... see package.json for all scripts
```

## 🛠️ Development

- **Workspaces**: This project uses npm workspaces.
- **Shared Code**: Common code is located in the `shared` directory.

## 📝 API Documentation

API endpoints are exposed via the **Gateway** at port `8000`.
Refer to individual service routes for specific endpoints.
