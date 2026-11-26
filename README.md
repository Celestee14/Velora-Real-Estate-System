# Velora Real Estate System

## Project Description

Velora is a web-based real estate management system designed to help clients, agents, and administrators manage property listings, appointments, and other real estate transactions through one platform.

## Technologies Used

**Frontend**
- React
- TypeScript
- Vite
- Tailwind CSS

**Backend**
- Node.js
- Express.js
- MySQL
- JWT Authentication

## Main Features

- User registration and login
- Role-based access for Admin, Agent, and Client
- Property listing and management
- Property image uploads
- Appointment scheduling and management
- Appointment status notifications
- Property ratings and written reviews
- Admin dashboard and reports
- Export appointment records to PDF and CSV

## Requirements

Before running the project, install:

- Node.js
- pnpm
- MySQL
- XAMPP (if using its MySQL service)

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Celestee14/Velora-Real-Estate-System.git
cd Velora-Real-Estate-System
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure the Database

Create a MySQL database named:

```sql
CREATE DATABASE velora_db;
```

Configure the backend environment variables in the appropriate `.env` file. Do not upload real credentials or passwords to GitHub.

### 4. Start the Backend

```bash
node server/server.mjs
```

The backend API runs at:

`http://localhost:3001`

### 5. Start the Frontend

Open another terminal and run:

```bash
pnpm dev
```

Open the local URL displayed by Vite in your browser.

### 6. Build the Project

To create a production build, run:

```bash
pnpm build
```

## Security Notice

Do not upload `.env` files, database passwords, private credentials, or personal user information to the repository.