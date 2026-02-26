# Secure Passkey Authentication Demo

This repository demonstrates a full, end-to-end modern WebAuthn Passkey implementation utilizing **React (Next.js)** on the frontend and **Node.js (Express)** on the backend, with a PostgreSQL database managed by **Prisma**.

It supports the latest **Discoverable Credentials (Resident Keys)**, allowing users to register Passkeys (via hardware like FaceID, TouchID, YubiKey, or Windows Hello) and log in seamlessly _without typing a username or password_.

## 🏗 System Architecture

1. **Frontend (`/frontend`)**: Next.js App Router providing a modern, sleek interface built with Tailwind CSS and Framer/Sonner for notifications. It securely asks the browser to generate local biometric challenges using `@simplewebauthn/browser`.
2. **Backend (`/backend`)**: Express API utilizing `@simplewebauthn/server` to strictly verify biometric challenge signatures against the ones initially registered.
3. **Database**: Managed by Prisma connected to a PostgreSQL database (Supabase), safely storing credentials, counters (to prevent replay attacks), and user details (Name, Occupation).

## 🚀 Quick Start Guide

You will need to run both the frontend and the backend simultaneously in two separate terminal windows.

### 1. Start the Backend API

Open a new terminal and navigate to the `backend` folder:

```bash
cd backend

# Install dependencies
npm install

# Setup Environment Variables
# Copy the example file and replace the DATABASE_URL with your own Postgres connection
cp .env.example .env

# Run database migrations and generate the prisma client
npx prisma migrate dev

# Start the ts-node development server
npm run dev
```

> The backend will start on **http://localhost:4000**.

### 2. Start the Frontend UI

Open a second terminal and navigate to the `frontend` folder:

```bash
cd frontend

# Install dependencies
npm install

# Start the Next.js development server
npm run dev
```

> The frontend will start on **http://localhost:3000**.

## 🧪 How to Test

1. Navigate to **http://localhost:3000** in your browser.
2. Under "Register", enter your full name, occupation, and email.
3. Click **Register Passkey**. Your OS will prompt you to create a local biometric passkey (via FaceID/TouchID/etc).
4. Once completed, do NOT type your email in the box. Leave it empty.
5. Simply click **Login with Passkey**. Your browser will natively recognize your registered credential securely, log you in, and redirect you to the protected Dashboard displaying your saved user profile metrics.

## 🔐 Security Notes

- Passkeys inherently require a **Secure Context**. They will only work on `https://` environments, or `localhost` specifically for development.
- Environment variables (`.env`) for both the frontend and backend are securely `.gitignore`d to prevent pushing database credentials to GitHub.
