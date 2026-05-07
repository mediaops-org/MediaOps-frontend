# MediaOps — AI-Powered Reel Creation

A high-performance cinematic reel creation platform built with React 19, TanStack Start, and Tailwind CSS 4.0.

## 🚀 Teck Stack

- **Framework:** [React 19](https://react.dev/)
- **Meta-framework:** [TanStack Start](https://tanstack.com/router/v1/docs/guide/start/overview)
- **Routing:** [TanStack Router](https://tanstack.com/router/v1) (Type-safe, file-based routing)
- **Styling:** [Tailwind CSS 4.0](https://tailwindcss.com/)
- **UI Components:** [Shadcn UI](https://ui.shadcn.com/) (Customized with Dark Glassmorphism)
- **Forms:** React Hook Form + Zod
- **Runtime:** [Bun](https://bun.sh/)

## ✨ Key Features

- **Authentication System:** Complete frontend auth flow with session management, Protected Routes, and Auth Guards.
- **Plans & Upgrades:** Multi-tier subscription system (Free/Pro) with Stripe checkout integration.
- **AI Autopilot:** Scheduled reel generation (Pro feature) with soft-gate protection for free users.
- **Cinematic UI:** Dark-themed glassmorphism aesthetic with high-performance animations.
- **Unified Sidebar:** Responsive navigation with user profiles, plan badges, and contextual CTAs.

## 📁 Project Structure

```text
src/
├── components/       # Reusable UI & Layout components
│   ├── ui/           # Shadcn UI primitives
│   └── ...           # Feature-specific views (Autopilot, Create, etc.)
├── hooks/            # Custom React hooks
├── lib/              # Core logic, types, and context (Auth, etc.)
├── routes/           # TanStack Router file-based pages
└── styles.css        # Tailwind 4.0 configuration & globals
```

## 🛠️ Getting Started

### Prerequisites

Ensure you have [Bun](https://bun.sh/) installed on your machine.

### Installation

```bash
# Clone the repository
git clone https://github.com/Khemiri-sahar/MediaOps-frontend
cd MediaOps-frontend

# Install dependencies
bun install
```

### Development

```bash
# Start the development server
bun dev
```

The app will be available at `http://localhost:3000`.

## 🔒 Authentication & API

The frontend assumes a backend API is available at `/api`. Key endpoints used:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me` (handles session and plan state)
- `POST /api/billing/create-checkout-session`

## 📜 License

Private project. All rights reserved.
