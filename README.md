<p align="center">
  <img src="https://img.shields.io/badge/Angular-22-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular">
  <img src="https://img.shields.io/badge/ASP.NET_Core-10-512BD4?style=for-the-badge&logo=dotnet&logoColor=white" alt="ASP.NET Core">
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

<h1 align="center">🏆 TournamentMaster</h1>
<p align="center"><em>Full-stack application for creating and managing sports tournaments — from multi-sport leagues to knockout brackets.</em></p>

---

## 🚀 Key Highlights

- **Multi-Sport Ready** — Football, Basketball, Tennis, Volleyball with sport-specific statistics
- **Three Tournament Formats** — League (round-robin), Knockout (brackets), Groups + Playoffs
- **Automatic Fixture Generation** — Round-robin scheduling at the click of a button
- **JWT Authentication** — Secure admin panel with role-based access control
- **Full-Stack Architecture** — Angular 22 frontend + ASP.NET Core 10 REST API + PostgreSQL

---

## 🔍 Overview

The system manages the complete lifecycle of sports tournaments through two integrated applications:

| Layer | Technology | Responsibility |
|---|---|---|
| **Frontend** | Angular 22 + TypeScript 6 + Tailwind CSS v4 | User interface, navigation, forms, standings, brackets |
| **Backend** | ASP.NET Core 10 + EF Core + Npgsql | REST API, business logic, fixture generation, JWT auth |
| **Database** | PostgreSQL | Persistence for sports, tournaments, teams, players, matches |

### 🧠 Core Workflow

1. **Admin** logs in → creates sports and configures tournaments with format, prestige, and rules
2. **Teams** register or request enrollment (admin approval required)
3. **Players** are assigned to teams with jersey numbers and positions
4. **Matches** are auto-generated via the fixture engine based on tournament format
5. **Standings & Brackets** update dynamically as match results are recorded

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Angular 22 Frontend                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │Tabs/Nav  │ │Tournament│ │ Teams &  │ │  Admin    │  │
│  │          │ │ Views    │ │ Players  │ │  Panels   │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│                     │ HTTP (JWT)                         │
├─────────────────────┼───────────────────────────────────┤
│           ASP.NET Core 10 REST API                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐     │
│  │Controllers│ │ Services │ │  Fixture Generators  │     │
│  │ (CRUD)   │ │ (Biz)   │ │  League│Knockout│Groups│    │
│  └──────────┘ └──────────┘ └──────────────────────┘     │
│                     │ EF Core                            │
├─────────────────────┼───────────────────────────────────┤
│                   PostgreSQL                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌────┐  │
│  │Sports│ │Tourns│ │Teams │ │Players│ │Matches│ │... │  │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └────┘  │
└─────────────────────────────────────────────────────────┘
```

## 🖥️ Entity Model

| Entity | Description | Key Fields |
|---|---|---|
| **Sport** | Supported disciplines | id, name, colorHex, imageUrl |
| **Tournament** | Competition instance | name, format, prestige, status, sportId |
| **Team** | Participating group | name, captain, logo, prestige, sportId |
| **Player** | Team member | firstName, lastName, jerseyNumber, matchesPlayed, teamId |
| **Stadium** | Match venue | name, city, capacity, length, width, sportId |
| **Match** | Scheduled fixture | date, homeScore, awayScore, stage, tournamentId |
| **EnrollmentRequest** | Team join request | teamId, tournamentId, status, requesterEmail |

---

## ⚡ Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) (LTS)
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [PostgreSQL](https://www.postgresql.org) 16+

### Installation

```bash
# Clone
git clone https://github.com/marcovegabcb/tournament-master.git
cd tournament-master

# Configure database
cp Torneos.API/appsettings.Example.json Torneos.API/appsettings.json
# Edit appsettings.json with your PostgreSQL credentials and JWT secret

# Install frontend dependencies
cd TorneosWeb
npm install
cd ..

# Run database migrations
dotnet ef database update --project Torneos.API
```

### Run

```bash
# Start both servers simultaneously
chmod +x start.sh
./start.sh
```

The API runs on **http://localhost:5185** and the frontend on **http://localhost:4200**.

Swagger documentation available at `http://localhost:5185/swagger`.

---

## 📖 Usage Walkthrough

### 1. Admin Login
Navigate to `http://localhost:4200` and click the **Login** button. Use the admin credentials configured in `appsettings.json`.

### 2. Create a Sport
Go to the **Home** tab → select a sport from the carousel (Football, Basketball, Tennis, Volleyball). Each sport has its own statistics tracking.

### 3. Set Up a Tournament
Go to **Tournaments** → **Create Tournament** → choose a format:

| Format | Description |
|---|---|
| **League** | Round-robin — every team plays every other team |
| **Knockout** | Single-elimination bracket |
| **Groups + Playoffs** | Group stage followed by knockout rounds |

Configure venue type (Home/Away, Neutral, Single Venue) and set prestige requirements.

### 4. Register Teams
**Teams** tab → **Create Team** → assign a captain, logo, and prestige points. Teams can also request enrollment into existing tournaments.

### 5. Manage Players
**Players** tab → assign players to teams with jersey numbers and positions. Each sport tracks relevant statistics (goals, points, assists, etc.).

### 6. Generate Fixtures
As admin, go to **Matches** → select a tournament → click **Generate Fixtures**. The system automatically creates the match schedule based on the tournament format.

### 7. View Standings & Brackets
- **League format**: Standings table with points, wins, draws, losses
- **Knockout format**: Interactive bracket visualization
- **Groups format**: Group standings + playoff bracket

---

## ✨ Features

| Feature | Description |
|---|---|
| **Multi-Sport** | Football, Basketball, Tennis, Volleyball with sport-specific stats |
| **Tournament Formats** | League, Knockout, Groups + Playoffs |
| **Auto Fixtures** | One-click round-robin schedule generation |
| **Standings & Brackets** | Live tables and interactive knockout trees |
| **Team & Player Management** | Rosters, captains, jersey numbers, stats |
| **Stadium Management** | Venues with capacity, dimensions, sport mapping |
| **Enrollment Requests** | Teams request to join; admin approves/rejects |
| **JWT Authentication** | Secure admin panel with role-based access |
| **Swagger Docs** | Auto-generated OpenAPI documentation |

---

## 🧰 Tech Stack

| Component | Technology |
|---|---|
| **Frontend Framework** | [Angular 22](https://angular.dev) — Standalone components |
| **Language** | [TypeScript 6](https://www.typescriptlang.org) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) |
| **Backend Framework** | [ASP.NET Core 10](https://dotnet.microsoft.com) |
| **ORM** | [Entity Framework Core 10](https://learn.microsoft.com/ef) |
| **Database** | [PostgreSQL](https://www.postgresql.org) (via Npgsql) |
| **Authentication** | JWT Bearer tokens |
| **Frontend Tests** | [Vitest](https://vitest.dev) |
| **Backend Tests** | [xUnit](https://xunit.net) |

---

## 📁 Project Structure

```
tournament-master/
├── Torneos.API/                 # ASP.NET Core backend
│   ├── Controllers/             # REST API controllers
│   ├── DTOs/                    # Data transfer objects
│   ├── Entities/                # EF Core entity models
│   ├── Migrations/              # Database migrations
│   ├── Models/                  # Domain models
│   ├── Services/                # Business logic
│   │   └── FixtureGenerators/   # League / Knockout / Groups generators
│   ├── Stats/                   # Sport-specific statistics
│   ├── Program.cs               # Application entry point
│   └── appsettings.json         # Configuration (see Example template)
├── Torneos.Tests/               # xUnit test project
├── TorneosWeb/                  # Angular frontend
│   ├── src/app/
│   │   ├── components/          # Feature components (bracket, login, players, etc.)
│   │   ├── models/              # TypeScript interfaces
│   │   └── services/            # HTTP service layer
│   ├── public/                  # Static assets
│   └── angular.json             # Angular CLI config
├── GestorTorneos.slnx           # .NET solution file
├── start.sh                     # Launcher for both servers
└── .gitignore
```

---

## 🧪 Testing

```bash
# Frontend (Vitest)
cd TorneosWeb && ng test

# Backend (xUnit)
dotnet test Torneos.Tests
```

---

## 🚀 Roadmap

- [ ] Dark mode toggle
- [ ] Live match score updates via SignalR
- [ ] Player transfer market
- [ ] Multi-language support (i18n)
- [ ] PDF/CSV export for standings and schedules
- [ ] Docker Compose setup for one-command deployment

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
