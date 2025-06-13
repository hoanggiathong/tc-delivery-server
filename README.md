# TC Delivery Server

Express TypeScript API server with JWT authentication, built with modern development practices including Zod validation, Swagger documentation, and clean architecture patterns.

## 🏗️ Project Structure

```
tc-delivery-server/
├── src/
│   ├── config/
│   │   └── swagger.ts          # Swagger configuration
│   ├── controllers/
│   │   └── auth.controller.ts  # Authentication controller
│   ├── middlewares/
│   │   ├── auth.middleware.ts  # JWT authentication middleware
│   │   └── validation.middleware.ts # Zod validation middleware
│   ├── routes/
│   │   ├── auth.routes.ts      # Authentication routes
│   │   └── index.ts            # Main routes
│   ├── schemas/
│   │   └── auth.schema.ts      # Zod validation schemas
│   ├── services/
│   │   └── auth.service.ts     # Authentication business logic
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   ├── app.ts                  # Express app configuration
│   └── index.ts                # Server entry point
├── dist/                       # Compiled JavaScript files
├── .env                        # Environment variables
├── .env.example               # Environment variables template
├── .eslintrc.json             # ESLint configuration
├── .gitignore                 # Git ignore rules
├── package.json               # Project dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── README.md                  # Project documentation
```

## 🚀 Features

- **TypeScript** - Full TypeScript support for type safety
- **JWT Authentication** - Secure token-based authentication
- **Zod Validation** - Runtime schema validation for API requests
- **Swagger Documentation** - Interactive API documentation
- **Clean Architecture** - Controller-Service pattern for maintainable code
- **Security** - Helmet.js and CORS protection
- **Modern Express** - Latest Express.js with modern middleware
- **Path Mapping** - Clean imports with TypeScript path mapping
- **Environment Configuration** - Dotenv for environment management

## 📚 API Documentation

Once the server is running, you can access the interactive Swagger documentation at:

**🌐 [http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

## 🛠️ Installation & Setup

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn

### 1. Clone the repository

```bash
git clone <repository-url>
cd tc-delivery-server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment setup

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

### 4. Start the development server

```bash
npm run dev
```

The server will start at `http://localhost:3000`

## 📝 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build the project for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint to check code quality |
| `npm run lint:fix` | Fix ESLint issues automatically |
| `npm test` | Run tests (Jest) |

## 🔗 API Endpoints

### Authentication

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| `POST` | `/api/auth/register` | Register a new user | None |
| `POST` | `/api/auth/login` | Login user | None |
| `GET` | `/api/auth/profile` | Get user profile | Bearer Token |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server health status |

## 🧪 Testing the API

### Register a new user

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPass123"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password"
  }'
```

### Get user profile

```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔒 Authentication

This API uses JWT (JSON Web Tokens) for authentication. After successful login, include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 🏭 Production Deployment

### Build the project

```bash
npm run build
```

### Start production server

```bash
npm start
```

### Environment Variables for Production

Make sure to set secure values for production:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-very-secure-secret-key-here
JWT_EXPIRES_IN=7d
```

## 🧩 Project Architecture

The project follows a clean architecture pattern:

- **Controllers** - Handle HTTP requests and responses
- **Services** - Business logic layer
- **Middlewares** - Request/response processing (auth, validation)
- **Schemas** - Zod validation schemas
- **Types** - TypeScript type definitions
- **Routes** - API route definitions

## 🔧 Configuration

### TypeScript Configuration

The project uses TypeScript with strict mode enabled and path mapping for clean imports:

```typescript
// Instead of: import { AuthService } from '../../../services/auth.service'
// Use: import { AuthService } from '@/services/auth.service'
```

### Validation

Request validation is handled by Zod schemas with middleware:

```typescript
// Username validation
username: z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must not exceed 50 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores')
```