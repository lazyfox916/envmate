# EnvMate

> Secure Environment Variable Management Platform

EnvMate is a platform for developers and teams to securely store, share, and manage `.env` files with encryption, access control, and team collaboration.

## Features

- 🔐 **Secure Storage** - AES-256-GCM encryption for all environment variables
- 👥 **Team Collaboration** - Invite team members and manage access
- 🔑 **Role-Based Access** - Admin, Editor, and Viewer roles
- 📁 **Project Organization** - Group variables by project and environment
- 📝 **Audit Logging** - Track who accessed or modified variables
- 🔄 **Version History** - (Coming soon) Track changes over time

## Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL
- **Authentication:** JWT

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS

## Project Structure

```
EnvMate/
├── client/          # Next.js frontend application
├── server/          # Express.js backend API
│   └── src/
│       ├── controllers/   # Request handlers
│       ├── routes/        # API route definitions
│       ├── services/      # Business logic
│       ├── models/        # Database models
│       ├── middlewares/   # Express middlewares
│       └── utils/         # Utility functions
├── docs/            # Documentation
└── scripts/         # Build and utility scripts
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/envmate.git
   cd envmate
   ```

2. **Set up the server**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env with your configuration
   npm install
   ```

3. **Set up the client**
   ```bash
   cd client
   cp .env.example .env.local
   # Edit .env.local with your configuration
   npm install
   ```

4. **Start development servers**

   In the server directory:
   ```bash
   npm run dev
   ```

   In the client directory:
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:5000

## Environment Variables

See `.env.example` files in both `client/` and `server/` directories for required environment variables.

## Development

### Server Commands

```bash
npm run dev      # Start development server with hot-reload
npm run build    # Build for production
npm start        # Start production server
npm test         # Run tests
```

### Client Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## Security

- All environment variable values are encrypted using AES-256-GCM
- Passwords are hashed using bcrypt with a cost factor of 12
- JWTs are used for authentication with short expiry times
- HTTPS is enforced in production
- Rate limiting is applied to prevent abuse

See [docs/Security.md](docs/Security.md) for detailed security documentation.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a pull request.

## License

ISC License

---

*Built with ❤️ for developers who care about security*
