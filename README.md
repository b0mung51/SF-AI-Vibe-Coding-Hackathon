# Cal Connect - Calendar Connection App

A calendar connection platform that enables two users to connect their calendars and automatically find optimal meeting times based on their mutual availability. Built for the SF AI Vibe Coding Hackathon.

## Features

- **User Authentication**: Firebase-based authentication system
- **User Connections**: Search and connect with other users
- **Calendar Integration**: Connect with Cal.com for calendar access
- **Meeting Suggestions**: AI-powered time slot recommendations
- **Meeting Scheduling**: Create and manage meetings
- **Profile Management**: User settings and preferences

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Calendar Integration**: Cal.com API
- **Caching**: Redis (planned)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project
- Cal.com account (for calendar integration)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/b0mung51/SF-AI-Vibe-Coding-Hackathon.git
cd SF-AI-Vibe-Coding-Hackathon
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Configure your environment variables in `.env.local`:
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Cal.com API Configuration
CALCOM_API_URL=https://api.cal.com/v1
CALCOM_API_KEY=your_calcom_api_key
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
app/
├── api/                    # API routes
│   ├── auth/              # Authentication endpoints
│   ├── connections/       # User connection management
│   ├── calendar/          # Calendar integration
│   └── meetings/          # Meeting management
├── components/            # Reusable UI components
├── lib/                   # Utility libraries
├── types/                 # TypeScript type definitions
├── connect/               # Connect page
├── calendar/              # Calendar page
├── meetings/              # Meetings page
├── profile/               # Profile page
└── page.tsx              # Home page
```

## API Endpoints

### Authentication
- `POST /api/auth/verify-token` - Verify Firebase ID token

### Connections
- `POST /api/connections/request` - Send connection request

### Calendar
- `POST /api/calendar/connect-calcom` - Connect Cal.com account

### Meetings
- `GET /api/meetings/suggestions/[connectionId]` - Get meeting suggestions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Hackathon Information

This project was built for the SF AI Vibe Coding Hackathon. The app demonstrates modern web development practices with Next.js, Firebase, and calendar integration capabilities.
