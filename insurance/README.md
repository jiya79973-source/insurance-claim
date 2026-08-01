# Insurance Management Platform

A full-stack web application for managing insurance operations — customers, policies, claims, premium payments, documents, and business reports.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, Tailwind CSS, Chart.js |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT + bcrypt |
| File Upload | Multer |
| Validation | Zod |
| PDF Reports | PDFKit |

## Project Structure

```
insurance/
├── backend/          # Express API server
│   ├── prisma/       # Database schema & seed
│   └── src/          # Routes, middleware, lib
├── insurance/        # React frontend (CRA)
└── docker-compose.yml
```

## Prerequisites

- Node.js 18+
- Docker Desktop (for PostgreSQL) OR a local PostgreSQL instance

## Quick Start

### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Setup Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Backend runs at **http://localhost:5000**

### 3. Setup Frontend

```bash
cd insurance
npm install
npm start
```

Frontend runs at **http://localhost:3000**

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@insurance.com | admin123 |
| Agent | agent@insurance.com | agent123 |
| Customer | customer@example.com | customer123 |

## Features

### Customer Management
- Register, view, edit, and search customers
- Customer history with policies and documents

### Policy Management
- Create insurance policies (Health, Auto, Life, Home, Travel)
- View active/expired policies, renew and cancel
- Policy expiry notifications

### Claim Management
- Submit claims with supporting details
- Agent review workflow (approve/reject)
- Claim status tracking

### Premium Tracking
- Record and track premium payments
- Due date tracking and overdue alerts
- Customer self-service payment

### Document Management
- Upload identity, policy, and claim documents
- Download uploaded files (PDF, JPG, PNG, DOC)

### Reports Dashboard
- Active/expired policies, claim statistics
- Premium collection charts
- Customer growth analytics
- PDF report export

### Role-Based Access
- **Admin**: Full access + employee management + reports
- **Agent**: Customer, policy, claim, payment management
- **Customer**: View policies, pay premiums, submit claims, upload documents

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user |
| GET/POST | /api/customers | List/create customers |
| GET/POST | /api/policies | List/create policies |
| PATCH | /api/policies/:id/renew | Renew policy |
| PATCH | /api/policies/:id/cancel | Cancel policy |
| GET/POST | /api/claims | List/submit claims |
| PATCH | /api/claims/:id/review | Review claim |
| GET/POST | /api/payments | List/create payments |
| PATCH | /api/payments/:id/pay | Record payment |
| POST | /api/documents/upload | Upload document |
| GET | /api/documents/:id/download | Download document |
| GET | /api/reports/dashboard | Dashboard analytics |
| GET | /api/reports/pdf | Export PDF report |
| GET/POST | /api/users | Manage employees (Admin) |

## Deployment

### Backend (Render / Railway)
1. Set environment variables from `backend/.env.example`
2. Run `npx prisma db push && npm run db:seed`
3. Start with `npm start`

### Frontend (Vercel)
1. Set `REACT_APP_API_URL` to your backend URL
2. Deploy with `npm run build`

## License

MIT — Internship/educational project.
