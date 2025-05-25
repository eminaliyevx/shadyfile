# ShadyFile 🔒

A modern, secure file sharing platform with end-to-end encryption and peer-to-peer capabilities. Built with React, TypeScript, and cutting-edge web technologies.

## ✨ Features

### 🔐 Security First

- **End-to-End Encryption**: Files are encrypted before leaving your device using AES-GCM encryption
- **Peer-to-Peer Transfer**: Direct file sharing between users without server storage
- **Secure Authentication**: Multi-factor authentication with Better Auth
- **Session Management**: Secure session handling with Redis

### 🚀 Modern Architecture

- **Real-time Communication**: WebSocket-based real-time messaging and signaling
- **WebRTC Integration**: Direct peer-to-peer data channels for file transfer
- **Chunked File Transfer**: Efficient handling of large files with progress tracking
- **Responsive Design**: Modern UI with Tailwind CSS and Radix UI components

### 🛠️ Developer Experience

- **TypeScript**: Full type safety across the entire application
- **Modern React**: Hooks, Context API, and functional components
- **TanStack Router**: Type-safe routing with React Router
- **TanStack Query**: Powerful data fetching and caching
- **Drizzle ORM**: Type-safe database operations

## 🏗️ Tech Stack

### Frontend

- **React 19** - Modern React with concurrent features
- **TypeScript** - Full type safety
- **TanStack Router** - Type-safe routing
- **TanStack Query** - Data fetching and state management
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icons

### Backend

- **TanStack Start** - Full-stack React framework
- **WebSocket** - Real-time communication
- **WebRTC** - Peer-to-peer data transfer
- **Better Auth** - Authentication and authorization
- **Drizzle ORM** - Database operations

### Database & Storage

- **PostgreSQL** - Primary database
- **Redis** - Session storage and caching
- **File System** - Temporary file chunk storage

### DevOps & Tooling

- **Docker** - Containerization
- **Vinxi** - Build tool and development server
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **pnpm** - Package management

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- Docker and Docker Compose (for production)

### Development Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd shadyfile
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.development
   ```

   Configure the following variables in `.env.development`:

   ```env
   # App Configuration
   VITE_APP_TITLE="ShadyFile"
   VITE_APP_DOMAIN="localhost:3000"
   APP_TITLE="ShadyFile"
   APP_PORT=3000
   NODE_ENV=development

   # Database
   POSTGRES_USER=shadyfile
   POSTGRES_PASSWORD=your_password
   POSTGRES_DB=shadyfile
   POSTGRES_PORT=5432
   DATABASE_URL=postgresql://shadyfile:your_password@localhost:5432/shadyfile

   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=your_redis_password

   # Authentication
   BETTER_AUTH_SECRET=your_secret_key_here

   # Twilio (for SMS verification)
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   ```

4. **Start development services**

   ```bash
   # Start PostgreSQL and Redis
   docker-compose -f docker-compose.dev.yml up -d

   # Run database migrations
   pnpm db:migrate:dev

   # Start development server
   pnpm dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🐳 Production Deployment

### Using Docker Compose

1. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Configure production values in .env
   ```

2. **Deploy with Docker Compose**
   ```bash
   docker-compose up -d
   ```

The application will be available at the configured `APP_PORT`.

### Manual Deployment

1. **Build the application**

   ```bash
   pnpm build
   ```

2. **Start the production server**
   ```bash
   pnpm start
   ```

## 📁 Project Structure

```
shadyfile/
├── app/                          # Main application code
│   ├── components/               # Reusable UI components
│   │   ├── ui/                  # Base UI components (shadcn/ui)
│   │   ├── layout/              # Layout components
│   │   └── ...
│   ├── features/                # Feature-based modules
│   │   ├── auth/                # Authentication features
│   │   ├── room/                # Room management
│   │   └── settings/            # User settings
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utility libraries
│   │   ├── server/              # Server-side utilities
│   │   │   ├── auth/            # Authentication logic
│   │   │   ├── db/              # Database schema and operations
│   │   │   ├── redis/           # Redis configuration
│   │   │   └── middleware/      # Server middleware
│   │   ├── schemas/             # Zod validation schemas
│   │   ├── types/               # TypeScript type definitions
│   │   ├── utils/               # Utility functions
│   │   └── env/                 # Environment configuration
│   ├── routes/                  # Application routes
│   │   ├── api/                 # API routes
│   │   ├── _authed/             # Protected routes
│   │   └── ...
│   ├── styles/                  # Global styles
│   └── context/                 # React context providers
├── drizzle/                     # Database migrations
├── public/                      # Static assets
├── uploads/                     # Temporary file storage
├── docker-compose.yml           # Production Docker setup
├── docker-compose.dev.yml       # Development Docker setup
├── Dockerfile                   # Application container
├── Dockerfile.migrate           # Migration container
└── ...
```

## 🔧 Available Scripts

```bash
# Development
pnpm dev                    # Start development server
pnpm build                  # Build for production
pnpm start                  # Start production server

# Database
pnpm db:generate           # Generate database migrations
pnpm db:migrate:dev        # Run migrations (development)
pnpm db:migrate            # Run migrations (production)
pnpm db:push               # Push schema changes

# Code Quality
pnpm lint                  # Run ESLint
pnpm format                # Format code with Prettier
```

## 🏛️ Architecture Overview

### Authentication Flow

1. User registration/login via Better Auth
2. Session management with Redis
3. JWT tokens for API authentication
4. Optional 2FA with TOTP

### File Sharing Flow

1. **Room Creation**: Host creates a secure room
2. **Peer Connection**: Guest joins room via WebSocket
3. **WebRTC Handshake**: Direct peer-to-peer connection established
4. **Key Exchange**: Diffie-Hellman key exchange for encryption
5. **File Transfer**: Encrypted chunks sent directly between peers

### Security Model

- **Client-side Encryption**: Files encrypted before transmission
- **Zero-knowledge**: Server never sees unencrypted file content
- **Ephemeral Storage**: Temporary chunks deleted after transfer
- **Secure Channels**: All communication over HTTPS/WSS

## 🔐 Security Features

### Encryption

- **AES-GCM 256-bit** encryption for file content
- **Diffie-Hellman** key exchange between peers
- **Random IV** generation for each encryption operation
- **HMAC** for data integrity verification

### Authentication

- **Multi-factor Authentication** support
- **Session-based** authentication with Redis
- **CSRF Protection** built-in
- **Rate limiting** on sensitive endpoints

### Privacy

- **No server-side file storage** for peer-to-peer transfers
- **Automatic cleanup** of temporary data
- **Minimal logging** of sensitive operations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use conventional commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all linting passes

## 📝 Environment Variables

### Required Variables

| Variable             | Description                  | Example                                    |
| -------------------- | ---------------------------- | ------------------------------------------ |
| `VITE_APP_TITLE`     | Application title            | `"ShadyFile"`                              |
| `VITE_APP_DOMAIN`    | Application domain           | `"localhost:3000"`                         |
| `DATABASE_URL`       | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `REDIS_HOST`         | Redis host                   | `localhost`                                |
| `REDIS_PORT`         | Redis port                   | `6379`                                     |
| `BETTER_AUTH_SECRET` | Authentication secret        | `your-secret-key`                          |
| `TWILIO_ACCOUNT_SID` | Twilio account SID           | `ACxxxxx`                                  |
| `TWILIO_AUTH_TOKEN`  | Twilio auth token            | `your-token`                               |

### Optional Variables

| Variable         | Description      | Default       |
| ---------------- | ---------------- | ------------- |
| `NODE_ENV`       | Environment      | `development` |
| `APP_PORT`       | Application port | `3000`        |
| `REDIS_PASSWORD` | Redis password   | `""`          |

## 🐛 Troubleshooting

### Common Issues

**WebRTC Connection Failed**

- Check firewall settings
- Ensure HTTPS in production
- Verify STUN/TURN server configuration

**Database Connection Error**

- Verify PostgreSQL is running
- Check connection string format
- Ensure database exists

**Redis Connection Error**

- Verify Redis is running
- Check Redis configuration
- Ensure correct host/port

**File Upload Issues**

- Check disk space
- Verify upload directory permissions
- Check file size limits

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TanStack](https://tanstack.com/) for excellent React libraries
- [Radix UI](https://www.radix-ui.com/) for accessible components
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Better Auth](https://www.better-auth.com/) for authentication
- [Drizzle ORM](https://orm.drizzle.team/) for type-safe database operations

---

Built with ❤️ using modern web technologies
