# FocusMate - Requirements

This document lists all necessary packages and system requirements to run the FocusMate application.

## System Requirements

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher (or yarn/pnpm)
- **Database**: PostgreSQL 14+ (or use Docker)

## Quick Installation

To install all necessary packages, run:

```bash
npm run install:requirements
```

Or directly with npm:

```bash
npm install
```

Or if using yarn:

```bash
yarn install
```

## Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | 14.0.4 | Next.js framework |
| react | ^18.2.0 | React library |
| react-dom | ^18.2.0 | React DOM |
| next-auth | ^4.24.5 | Authentication |
| @auth/prisma-adapter | ^1.0.0 | Prisma adapter for NextAuth |
| @prisma/client | ^5.6.0 | Prisma ORM client |
| bcryptjs | ^2.4.3 | Password hashing |
| zod | ^3.22.4 | Schema validation |
| react-hook-form | ^7.48.2 | Form handling |
| next-intl | ^3.3.2 | Internationalization |
| next-themes | ^0.2.1 | Theme management |
| date-fns | ^2.30.0 | Date formatting |
| uuid | ^9.0.1 | UUID generation |
| lucide-react | ^0.294.0 | Icons |
| recharts | ^2.10.3 | Charts |

### UI Components (Radix UI)

| Package | Version | Purpose |
|---------|---------|---------|
| @radix-ui/react-avatar | ^1.0.4 | Avatar component |
| @radix-ui/react-dialog | ^1.0.5 | Dialog component |
| @radix-ui/react-dropdown-menu | ^2.0.6 | Dropdown menu |
| @radix-ui/react-label | ^2.0.2 | Label component |
| @radix-ui/react-progress | ^1.0.3 | Progress bar |
| @radix-ui/react-select | ^2.0.0 | Select component |
| @radix-ui/react-slot | ^1.0.2 | Slot component |
| @radix-ui/react-switch | ^1.0.3 | Switch component |
| @radix-ui/react-tabs | ^1.0.4 | Tabs component |
| @radix-ui/react-toast | ^1.1.5 | Toast notifications |
| @radix-ui/react-tooltip | ^1.0.7 | Tooltip component |

### Styling

| Package | Version | Purpose |
|---------|---------|---------|
| tailwindcss | ^3.3.6 | CSS framework |
| tailwind-merge | ^2.2.0 | Tailwind class merging |
| tailwindcss-animate | ^1.0.7 | Tailwind animations |
| class-variance-authority | ^0.7.0 | Component variants |
| clsx | ^2.0.0 | Class name utilities |
| autoprefixer | ^10.4.16 | CSS autoprefixer |
| postcss | ^8.4.32 | CSS post-processing |

### MediaPipe (Face Detection)

| Package | Version | Purpose |
|---------|---------|---------|
| @mediapipe/camera_utils | ^0.3.1675466862 | Camera utilities |
| @mediapipe/control_utils | ^0.6.1675466023 | Control utilities |
| @mediapipe/drawing_utils | ^0.3.1675466124 | Drawing utilities |
| @mediapipe/face_mesh | ^0.4.1633559619 | Face mesh detection |

## Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ^5.3.3 | TypeScript |
| @types/node | ^20.10.4 | Node.js types |
| @types/react | ^18.2.43 | React types |
| @types/react-dom | ^18.2.17 | React DOM types |
| @types/bcryptjs | ^2.4.6 | bcryptjs types |
| @types/uuid | ^9.0.7 | UUID types |
| @types/jest | ^29.5.11 | Jest types |
| prisma | ^5.6.0 | Prisma CLI |
| tsx | ^4.7.0 | TypeScript executor |
| jest | ^29.7.0 | Testing framework |
| jest-environment-jsdom | ^29.7.0 | Jest DOM environment |
| eslint | ^8.55.0 | Linter |
| eslint-config-next | 14.0.4 | Next.js ESLint config |

## Database Setup

### Option 1: Using Docker (Recommended - Easiest)

1. **Install Docker Desktop**:
   - Download from https://www.docker.com/products/docker-desktop
   - Run the installer and follow the prompts
   - Restart your computer if required

2. **Start the database**:
   ```bash
   docker compose up -d db
   ```

3. **Set up environment variables** (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

4. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```

5. **(Optional) Seed the database with sample data**:
   ```bash
   npm run db:seed
   ```

6. **Start the development server**:
   ```bash
   npm run dev
   ```

The website will be available at http://localhost:3000

### Option 2: Install PostgreSQL Directly (For Windows Home/Older Versions)

If Docker doesn't work on your Windows version:

1. **Download PostgreSQL** from https://www.postgresql.org/download/windows/
   - **Choose version 15 or 16** (latest stable versions)
   - Download the installer for your Windows version (64-bit)

2. **Install** with these settings:
   - Keep default port: `5432`
   - Remember the password you set for `postgres` user
   - Keep default locale settings

3. **Open pgAdmin** (comes with PostgreSQL) or use command line
4. **Create a database** called "focusmate"
5. **Update your `.env` file**:
   ```
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/focusmate?schema=public"
   ```
6. **Run migrations**: `npm run db:migrate`
7. **Start the server**: `npm run dev`

### Option 3: Use a Free Cloud Database (No Installation Required)

**Neon PostgreSQL (Recommended)**:
1. Go to https://neon.tech and sign up for free
2. Create a new project
3. Get your connection string from the dashboard
4. Update your `.env` file:
   ```
   DATABASE_URL="postgresql://username:password@host.neon.tech/focusmate?sslmode=require"
   ```
5. Run migrations: `npm run db:migrate`
6. Start the server: `npm run dev`

**Supabase (Alternative)**:
1. Go to https://supabase.com and sign up for free
2. Create a new project
3. Go to Settings > Database > Connection String
4. Copy the URI and update your `.env` file
5. Run migrations: `npm run db:migrate`
6. Start the server: `npm run dev`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run install:requirements` | Install all required packages |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

## Environment Variables

Required environment variables (see `.env.example`):

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth secret key
- `NEXTAUTH_URL` - Application URL
- `OPENAI_API_KEY` - OpenAI API key (for chat feature)
