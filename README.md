[简体中文](./README.zh-CN.md) | English

# White Album

**White Album** is a full-stack web application designed as a private, secure family photo album and notice center. It provides a dedicated space for family members to share memories and stay updated on family events, specifically optimized for tablet (e.g., iPad) and mobile viewing.

## Architecture

The repository contains two independent npm projects:

- **Frontend** (`/`): A modern UI built with React 19, Vite 8, and TypeScript. Styled with Tailwind CSS v4 and `shadcn/ui`.
- **Backend** (`/backend`): A robust REST API powered by Fastify 5 and TypeScript. It uses Drizzle ORM and `better-sqlite3` for efficient, serverless data persistence, handling both application data and uploaded image files.

## Features

- **Role-Based Access & Invite System**: The first registered user automatically becomes the admin, who can generate single-use invite codes for other family members to join.
- **Photo Management**: Admins can upload photos, add captions, and organize the display order, while members can securely view the shared family carousel.
- **Notice Board & Messages**: Allows admins to pin important family announcements and provides a message board for members to leave comments and interact.
- **Admin Dashboard**: A comprehensive management interface for administrators to seamlessly control photos, notices, and user invitations.

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation

1. Install frontend dependencies:
   ```bash
   npm install
   ```
2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

### Running Locally

You can run both frontend and backend dev servers concurrently using the provided scripts from the repository root:

- **Windows (PowerShell)**: `./dev.ps1`
- **Mac/Linux (bash)**: `./dev.sh`

Alternatively, you can run them separately:
- **Frontend**: `npm run dev` (runs on port 5173)
- **Backend**: `cd backend && npm run dev` (runs on port 3000)

### Production Build

- **Frontend**: `npm run build`
- **Backend**: `cd backend && npm run build`, then `npm start` to run the production server.

*Note: Database migrations are automatically applied when the backend server boots.*
