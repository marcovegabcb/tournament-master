# TournamentMaster 🏆

> Full-stack sports tournament management application.

A complete platform for creating and managing sports tournaments. Built with an **ASP.NET Core 10** REST API backend, **Angular 22** frontend, and **PostgreSQL** database.

---

## 📦 Project Structure

```
GestorTorneos/
├── Torneos.API/          # ASP.NET Core Web API (C#)
├── Torneos.Tests/        # xUnit unit tests
├── TorneosWeb/           # Angular 22 frontend (TypeScript)
├── GestorTorneos.slnx    # .NET solution file
└── start.sh              # Launch both servers
```

---

## ✨ Features

- **Multi-sport** — Football, Basketball, Tennis, Volleyball
- **Tournament formats** — League, Knockout, Groups + Playoffs
- **Team & player management** — Rosters, captains, stats
- **Stadium management** — Venues with capacity and dimensions
- **Auto fixture generation** — Round-robin scheduling
- **Live standings & brackets** — Real-time tournament progress
- **Enrollment requests** — Team registration with admin approval workflow
- **JWT authentication** — Secure admin panel with role-based access
- **RESTful API** — Full CRUD for all entities

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Angular 22, TypeScript 6, Tailwind CSS v4 |
| **Backend** | ASP.NET Core 10, C# |
| **Database** | PostgreSQL (via Entity Framework Core 10) |
| **Auth** | JWT Bearer tokens |
| **Testing** | Vitest (frontend), xUnit (backend) |
| **API docs** | Swagger / OpenAPI |

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [PostgreSQL](https://www.postgresql.org/)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/marcovegabcb/tournament-master.git
cd tournament-master

# 2. Configure the database connection
cp Torneos.API/appsettings.Example.json Torneos.API/appsettings.json
# Edit appsettings.json with your PostgreSQL credentials and JWT secret

# 3. Install frontend dependencies
cd TorneosWeb
npm install
cd ..

# 4. Run database migrations
dotnet ef database update --project Torneos.API

# 5. Start the application
chmod +x start.sh
./start.sh
```

The API runs on `http://localhost:5185` and the frontend on `http://localhost:4200`.

### One-click start

```bash
./start.sh
```

This launches both the backend and frontend simultaneously.

---

## 📖 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| **Sports** | `/api/Sports` | CRUD operations |
| **Tournaments** | `/api/Tournaments` | Tournament lifecycle |
| **Teams** | `/api/Teams` | Team CRUD |
| **Players** | `/api/Players` | Player management |
| **Stadiums** | `/api/Stadiums` | Venue management |
| **Matches** | `/api/Matches` | Fixtures & standings |
| **Auth** | `/api/auth/login` | JWT login |

Full Swagger documentation at `http://localhost:5185/swagger`.

---

## 🧪 Tests

```bash
# Frontend (Vitest)
cd TorneosWeb && ng test

# Backend (xUnit)
dotnet test Torneos.Tests
```

---

## 📄 License

[MIT](LICENSE)
