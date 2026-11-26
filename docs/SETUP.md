# Velora Real Estate System – Setup Guide

## 1. Prerequisites
Before running the project, make sure you have installed:
- Node.js
- pnpm
- MySQL
- XAMPP or another MySQL server environment

## 2. Clone the Repository
```bash
git clone https://github.com/Celestee14/Velora-Real-Estate-System.git
cd Velora-Real-Estate-System
```

## 3. Install Dependencies
```bash
pnpm install
```

## 4. Create the Database
Create a MySQL database named `velora_db`.

Make sure the database contains the tables required by the backend.

## 5. Configure Environment Variables
1. Open the `server` folder.
2. Copy `.env.example` and rename the copy to `.env`.
3. Enter your local database credentials and required email settings.
4. Set a secure JWT secret.

Do not upload your actual `.env` file to GitHub.

## 6. Start the Backend
```bash
node server/server.mjs
```

Backend URL: `http://localhost:3001`

## 7. Start the Frontend
Open another terminal in the project folder and run:

```bash
pnpm dev
```

Open the local URL displayed by Vite.

## 8. Build the Project
```bash
pnpm build
```

## 9. Security Reminder
Never upload database passwords, email app passwords, JWT secrets, or private user information to GitHub.