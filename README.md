# 🧠 GradiorAI — Backend

**Backend API for the Interview Preparation Platform** — a full-featured service that powers the [GradiorAI](https://gradiorai.ru/) application.  
It provides AI-driven interview simulations, dynamic testing, user achievements, and a real-time chat system via **Server-Sent Events (SSE)**.

---

## 🚀 Tech Stack

- **NestJS** — scalable backend framework  
- **Prisma ORM** — database modeling and migrations  
- **MySQL** — main relational database  
- **Redis** — caching, session storage, and task optimization  
- **OpenAI API** — used for AI-driven test generation and chat simulations  
- **Passport + JWT + Google OAuth** — authentication system  
- **Winston** — structured logging  
- **CI/CD via GitLab** — automated build and deploy pipelines  
- **Prettier + ESLint** — enforced code style and static analysis

---

## 🌍 Live Environments

| Environment | URL |
|--------------|-----|
| **Production** | [https://gradiorai.ru](https://gradiorai.ru) |
| **Test** | [https://interviewready.ru](https://interviewready.ru) |

Both environments are fully automated through **GitLab CI/CD** pipelines.

---

## ⚙️ Features

### 🧩 Core Functionality
- AI-powered **test generation** based on user-selected skills and difficulty  
- **Real-time interviews** simulated via OpenAI using **SSE** (Server-Sent Events)  
- **Resume analyzer and generator** powered by AI suggestions  
- Dynamic **user rating** and **achievement system**  
- Full **admin dashboard** with:
  - Logs viewing and filtering  
  - User and session management  
  - Backup creation and download  
  - System file upload/removal  
  - Localization editor (multi-language support with instant text editing)

### 🔒 Authentication
- **Google OAuth** login  
- JWT-based session management  
- Role-based access control:
  - Public routes (for guests)
  - User routes (for logged-in users)
  - Admin routes (for admins only)

### ⚡ Performance and Scalability
- Caching with **Redis**  
- Efficient data layer via **Prisma**  
- Asynchronous operations using **RxJS**  
- SSE for streaming long AI responses

### 🌐 Localization System
- Two languages supported (EN / RU)  
- Admin can switch and edit text in real-time  
- Text changes are instantly reflected via hot reload

---

## 🧑‍💻 Getting Started (Local Setup)

### 1. Clone the repository

git clone https://github.com/Lugzan151892/gradiorai-backend.git
cd gradiorai-backend

### 2. Install dependencies

npm install

### 3. Set up environment variables

copy and fill keys from .env.example

### 4. Run database migrations

npx prisma migrate dev --name init

### 5. Start the server

npm run start:dev

## 🔄 CI/CD

- This project uses GitLab CI/CD pipelines for:
- Automated testing (Jest)
- Lint checks (ESLint & Prettier)
- Building and deploying to test & production environments
- Database migrations and backups

## 🧩 Additional Notes

- SSE (Server-Sent Events) enables real-time streaming of AI interview answers.
- Redis improves response times and handles temporary data caching.
- Prisma provides clear type-safe database interaction.
- The backend is designed to be modular and scalable, supporting microservice-style separation if needed in the future.

## 🧑‍💻 Author
Denis (Lugzan151892)
Full-stack developer ((Nest.js + Next.js) | React | Vue + TypeScript)
📫 Telegram: @denis1518

🔗 GitHub: https://github.com/Lugzan151892
