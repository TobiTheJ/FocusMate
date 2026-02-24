# FocusMate - AI-Powered Focus Tracking Application

A comprehensive web application that helps users track and improve their focus during study and work sessions using AI-powered face detection.

## Features

### Core Features
- **Real-time Focus Detection**: Uses MediaPipe Face Mesh to detect:
  - Blink count and rate
  - Yawn detection
  - Gaze direction tracking
  - Head pose estimation
- **Focus Scoring Algorithm**: Calculates a 0-100 focus score based on multiple metrics
- **Session Management**: Start, pause, resume, and end focus sessions
- **Real-time Feedback**: Gentle notifications when focus is lost
- **Session Analytics**: Detailed reports with charts and recommendations

### Additional Features
- **AI Chatbot**: Integrated with Google Gemini API for study tips and focus advice
- **Bilingual Support**: Vietnamese and English (i18n ready)
- **Dark/Light Mode**: Full theme support with system preference detection
- **Admin Dashboard**: User management and system logs
- **Responsive Design**: Works on desktop, tablet, and mobile

### Authentication & Security
- Email/password authentication with NextAuth.js
- Google OAuth integration
- Password reset via email (mock)
- Profile management
- Role-based access control (User/Admin)

## Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui components |
| **Backend** | Next.js API Routes, tRPC-ready structure |
| **Database** | PostgreSQL with Prisma ORM |
| **Auth** | NextAuth.js v4 with JWT strategy |
| **AI/ML** | MediaPipe Face Mesh (client-side), Google Gemini API |
| **Testing** | Vitest, React Testing Library |
| **Deployment** | Vercel (recommended), Docker support |

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+ (or use Docker)
- Google Gemini API key (optional, has mock fallback)

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd focusmate

# Install dependencies
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your values
# Required:
# - DATABASE_URL (PostgreSQL connection string)
# - NEXTAUTH_SECRET (random string for JWT signing)
# - NEXTAUTH_URL (your app URL, e.g., http://localhost:3000)

# Optional:
# - GEMINI_API_KEY (for AI chatbot, mock responses if not provided)
# - GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET (for Google OAuth)
```

### 3. Database Setup

```bash
# Run database migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed database with demo data
npx prisma db seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Accounts

After seeding, you can login with:
- **Admin**: admin@focusmate.com / admin123
- **User**: user@example.com / user123

## Project Structure

```
focusmate/
├── app/                    # Next.js 14 App Router
│   ├── (auth)/            # Auth group (login, register)
│   ├── (main)/            # Main app group (dashboard, focus, etc.)
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── focus/            # Focus-related components
│   ├── providers/        # Context providers
│   └── chat/             # Chat widget
├── lib/                   # Utility functions
│   ├── auth.ts           # NextAuth config
│   ├── prisma.ts         # Prisma client
│   └── utils.ts          # Helper functions
├── prisma/               # Database schema
│   ├── schema.prisma     # Prisma schema
│   └── seed.ts           # Seed data
├── types/                # TypeScript types
├── __tests__/            # Test files
├── public/               # Static assets
└── docs/                 # Documentation
```

## API Documentation

### Authentication

#### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### POST /api/auth/[...nextauth]
NextAuth.js endpoints for login, logout, session management.

### Focus Sessions

#### POST /api/focus/start
Start a new focus session.

**Request:**
```json
{
  "plannedDuration": 1800
}
```

**Response:**
```json
{
  "sessionId": "...",
  "startedAt": "2024-01-15T10:00:00Z"
}
```

#### POST /api/focus/update
Update session metrics (called every 500ms from client).

**Request:**
```json
{
  "sessionId": "...",
  "metrics": {
    "blinkCount": 5,
    "yawnCount": 0,
    "lookAwayCount": 2,
    "distractionTime": 3000,
    "focusScore": 85
  }
}
```

#### POST /api/focus/end
End a focus session and get final results.

**Request:**
```json
{
  "sessionId": "..."
}
```

**Response:**
```json
{
  "session": {
    "id": "...",
    "focusScore": 78,
    "blinkCount": 45,
    "yawnCount": 2,
    "lookAwayCount": 8,
    "recommendations": [...]
  }
}
```

#### GET /api/focus/history
Get user's session history.

**Response:**
```json
{
  "sessions": [...],
  "stats": {
    "totalSessions": 10,
    "avgScore": 75.5,
    "totalDuration": 36000
  }
}
```

### Chat

#### POST /api/chat
Send message to AI assistant.

**Request:**
```json
{
  "message": "How can I improve my focus?"
}
```

**Response:**
```json
{
  "response": "Here are some tips to improve your focus..."
}
```

## Focus Detection Algorithm

The application uses MediaPipe Face Mesh (468 facial landmarks) to detect focus-related behaviors:

### Eye Aspect Ratio (EAR) for Blink Detection
```
EAR = (|P2-P6| + |P3-P5|) / (2 * |P1-P4|)
```
- Threshold: 0.2
- Blink detected when EAR < threshold for 3+ frames

### Mouth Aspect Ratio (MAR) for Yawn Detection
```
MAR = (|P51-P59| + |P53-P57|) / (2 * |P49-P55|)
```
- Threshold: 0.6
- Yawn detected when MAR > threshold for 2+ seconds

### Gaze Detection
- Tracks nose position relative to face center
- Threshold: 0.08 normalized units
- Look-away detected when gaze offset exceeds threshold

### Focus Score Calculation
```
Score = 100
  - min(blinkRate * 2, 20)           // Penalty for excessive blinking
  - min(yawnCount * 5, 15)             // Penalty for yawning
  - min(lookAwayCount * 3, 15)        // Penalty for looking away
  - min(distractionRatio * 50, 40)    // Penalty for distraction time
```

## Deployment

### Option 1: Vercel (Recommended - Simplest)

1. Push code to GitHub
2. Connect repository to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Random string (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Your Vercel deployment URL

### Option 2: Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Seed database
docker-compose exec app npx prisma db seed
```

### Option 3: VPS/Server

```bash
# Build application
npm run build

# Start production server
npm start

# Or use PM2 for process management
pm2 start npm --name "focusmate" -- start
```

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests (if configured)
npm run test:e2e
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Secret for JWT signing |
| `NEXTAUTH_URL` | Yes | App base URL |
| `GEMINI_API_KEY` | No | Google Gemini API key (mock if not provided) |
| `GOOGLE_CLIENT_ID` | No | For Google OAuth |
| `GOOGLE_CLIENT_SECRET` | No | For Google OAuth |

## Troubleshooting

### Common Issues

**1. Database connection errors**
- Check DATABASE_URL format: `postgresql://user:password@host:port/database`
- Ensure PostgreSQL is running
- Verify network access (especially in Docker)

**2. MediaPipe not loading**
- Check browser console for CORS errors
- Ensure camera permissions are granted
- Try refreshing the page

**3. Build errors**
- Delete `.next` folder and rebuild
- Run `npm install` again
- Check Node.js version (18+ required)

**4. Prisma errors**
- Run `npx prisma generate` after schema changes
- Run `npx prisma migrate dev` for new migrations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub
- Contact: support@focusmate.app

---

Built with ❤️ for better focus and productivity.
