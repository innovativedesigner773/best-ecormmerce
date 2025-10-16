# Best Brightness E-Commerce - Setup Guide

## Prerequisites

Before you start, make sure you have the following installed:
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download](https://git-scm.com/)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Best-Brightness
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React & React Router
- Supabase (backend/database)
- Radix UI components
- D3.js for data visualization
- Tailwind CSS for styling
- And many more...

### 3. Environment Setup

Create a `.env` file in the root directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking
- `npm run setup` - Run setup script
- `npm run offline-setup` - Setup offline data
- `npm run quick-start` - Quick start with fixes

## Common Issues & Solutions

### Missing Dependencies

If you encounter import errors like "Failed to resolve import", make sure you've run:

```bash
npm install
```

All dependencies are properly configured in `package.json` and should install automatically.

### TypeScript Errors

Run type checking to see detailed errors:

```bash
npm run type-check
```

### Build Errors

If you encounter build errors, try:

1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. Clear cache: `npm cache clean --force`

## Key Dependencies

- **d3** (^7.9.0) - Data visualization library
- **@types/d3** (^7.4.3) - TypeScript types for D3
- **react** (^18.3.1) - UI framework
- **@supabase/supabase-js** (^2.39.0) - Backend integration
- **tailwindcss** (^3.4.0) - CSS framework
- **vite** (^5.4.19) - Build tool

## Project Structure

```
Best-Brightness/
├── src/
│   ├── components/      # React components
│   │   ├── admin/       # Admin dashboard components
│   │   ├── auth/        # Authentication components
│   │   ├── cashier/     # Cashier/POS components
│   │   ├── common/      # Shared components
│   │   ├── customer/    # Customer-facing components
│   │   └── ui/          # UI primitives (shadcn/ui)
│   ├── contexts/        # React context providers
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── utils/           # Utility functions
│   └── main.tsx         # Application entry point
├── public/              # Static assets
└── package.json         # Dependencies and scripts
```

## Database Setup

Refer to the following files for database setup:
- `DATABASE_SETUP.md` - Complete database setup guide
- `SUPABASE_SETUP_COMPLETE.md` - Supabase configuration
- SQL files in `src/` - Database schema and migrations

## Support & Documentation

- `PROJECT_DOCUMENTATION.txt` - Project overview
- `IMPLEMENTATION_LOG.md` - Development history
- `TROUBLESHOOTING.md` - Common issues and solutions
- `README.md` - Project README

## Notes

- All import statements use standard package names (not versioned)
- All dependencies are locked in `package-lock.json` for consistency
- The project uses ES modules (`"type": "module"` in package.json)
- TypeScript is configured for strict type checking

---

**Last Updated:** September 2025
