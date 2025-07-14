# TC Delivery Server

Express TypeScript API server with JWT authentication, built with modern development practices including Zod validation, Swagger documentation, and clean architecture patterns.

## 🏗️ Project Structure

```
tc-delivery-server/
├── docs/                       # Project documentation
│   ├── DATABASE_SCHEMA.md      # Database schema documentation
│   ├── ERD_DIAGRAM.md          # Entity Relationship Diagram
│   └── LOGGING.md              # Logging system guide
├── src/
│   ├── config/
│   │   ├── database.ts         # MongoDB connection configuration
│   │   └── swagger.ts          # Swagger documentation setup
│   ├── controllers/
│   │   ├── auth.controller.ts  # Authentication controller
│   │   ├── customer.controller.ts # Customer management
│   │   └── delivery.controller.ts # Delivery management
│   ├── middlewares/
│   │   ├── auth.middleware.ts  # JWT authentication middleware
│   │   ├── role.middleware.ts  # Role-based access control
│   │   └── validation.middleware.ts # Zod validation middleware
│   ├── models/
│   │   ├── user.model.ts       # User MongoDB schema
│   │   ├── customer.model.ts   # Customer MongoDB schema
│   │   └── delivery.model.ts   # Delivery MongoDB schema
│   ├── routes/
│   │   ├── auth.routes.ts      # Authentication routes
│   │   ├── customer.routes.ts  # Customer routes
│   │   ├── delivery.routes.ts  # Delivery routes
│   │   └── index.ts            # Main routes
│   ├── schemas/
│   │   ├── auth.schema.ts      # Authentication validation schemas
│   │   ├── customer.schema.ts  # Customer validation schemas
│   │   └── delivery.schema.ts  # Delivery validation schemas
│   ├── services/
│   │   ├── auth.service.ts     # Authentication business logic
│   │   ├── customer.service.ts # Customer business logic
│   │   └── delivery.service.ts # Delivery business logic
│   ├── types/
│   │   ├── user.type.ts        # User type definitions
│   │   ├── customer.type.ts    # Customer type definitions
│   │   ├── delivery.type.ts    # Delivery type definitions
│   │   └── index.ts            # Common type definitions
│   ├── utils/
│   │   └── logger.ts           # Winston logging configuration
│   ├── app.ts                  # Express app configuration
│   └── index.ts                # Server entry point
├── tests/                      # Test files
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   ├── mocks/                  # Mock services
│   └── helpers/                # Test utilities
├── logs/                       # Log files (auto-generated)
│   └── YYYY/MM/                # Organized by year/month
├── .env                        # Environment variables
├── .env.example               # Environment variables template
├── .eslintrc.json             # ESLint configuration
├── .gitignore                 # Git ignore rules
├── package.json               # Project dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── README.md                  # Project documentation
```

## 🚀 Features

### Core Features

- **TypeScript** - Full TypeScript support for type safety
- **MongoDB & Mongoose** - NoSQL database with ODM for data modeling
- **JWT Authentication** - Secure token-based authentication with role-based access control
- **Zod Validation** - Runtime schema validation for API requests
- **Swagger Documentation** - Interactive API documentation
- **Clean Architecture** - Controller-Service pattern for maintainable code
- **Security** - Helmet.js and CORS protection
- **Modern Express** - Latest Express.js with modern middleware
- **Path Mapping** - Clean imports with TypeScript path mapping
- **Environment Configuration** - Dotenv for environment management

### Business Features

- **User Management** - Multi-role user system (superadmin, admin, manager, user)
- **Customer Management** - Customer information with validation
- **Delivery System** - Complete delivery management with cost breakdown
- **Audit Trail** - Track who created what and when

### Developer Experience

- **Advanced Logging** - Winston with daily rotation and organized file structure
- **Comprehensive Testing** - Jest with unit and integration tests
- **Database Documentation** - Complete schema documentation with ERD diagrams
- **Type Safety** - Full TypeScript coverage with strict mode

## 📚 Documentation

### API Documentation

Once the server is running, you can access the interactive Swagger documentation at:

**🌐 [http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

### Project Documentation

| Document                                          | Description                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| 📊 **[Database Schema](docs/DATABASE_SCHEMA.md)** | Complete database schema with relationships and field descriptions |
| 🔗 **[ERD Diagram](docs/ERD_DIAGRAM.md)**         | Entity Relationship Diagram for quick reference                    |
| 📝 **[Logging System](docs/LOGGING.md)**          | Logging configuration, usage examples, and debugging guide         |

### Quick Links

- **[Database Overview](docs/DATABASE_SCHEMA.md#overview)** - Collections and relationships
- **[ERD Visualization](docs/ERD_DIAGRAM.md)** - Visual database structure
- **[Logging Usage](docs/LOGGING.md#usage-examples)** - How to use the logging system

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

| Script             | Description                              |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Start development server with hot reload |
| `npm run build`    | Build the project for production         |
| `npm start`        | Start production server                  |
| `npm run lint`     | Run ESLint to check code quality         |
| `npm run lint:fix` | Fix ESLint issues automatically          |
| `npm test`         | Run tests (Jest)                         |

## 🔗 API Endpoints

### Authentication

| Method | Endpoint                   | Description         | Authentication | Roles  |
| ------ | -------------------------- | ------------------- | -------------- | ------ |
| `POST` | `/api/auth/register`       | Register a new user | None           | -      |
| `POST` | `/api/auth/login`          | Login user          | None           | -      |
| `GET`  | `/api/auth/profile`        | Get user profile    | Bearer Token   | All    |
| `GET`  | `/api/auth/users`          | Get all users       | Bearer Token   | Admin+ |
| `GET`  | `/api/auth/users/by-roles` | Get users by roles  | Bearer Token   | Admin+ |

### Customer Management

| Method   | Endpoint             | Description         | Authentication | Roles    |
| -------- | -------------------- | ------------------- | -------------- | -------- |
| `POST`   | `/api/customers`     | Create new customer | Bearer Token   | User+    |
| `GET`    | `/api/customers`     | Get all customers   | Bearer Token   | User+    |
| `GET`    | `/api/customers/:id` | Get customer by ID  | Bearer Token   | User+    |
| `PUT`    | `/api/customers/:id` | Update customer     | Bearer Token   | User+    |
| `DELETE` | `/api/customers/:id` | Delete customer     | Bearer Token   | Manager+ |

### Delivery Management

| Method   | Endpoint              | Description         | Authentication | Roles    |
| -------- | --------------------- | ------------------- | -------------- | -------- |
| `POST`   | `/api/deliveries`     | Create new delivery | Bearer Token   | User+    |
| `GET`    | `/api/deliveries`     | Get all deliveries  | Bearer Token   | User+    |
| `GET`    | `/api/deliveries/:id` | Get delivery by ID  | Bearer Token   | User+    |
| `PUT`    | `/api/deliveries/:id` | Update delivery     | Bearer Token   | User+    |
| `DELETE` | `/api/deliveries/:id` | Delete delivery     | Bearer Token   | Manager+ |

### Health Check

| Method | Endpoint  | Description          | Authentication |
| ------ | --------- | -------------------- | -------------- |
| `GET`  | `/health` | Server health status | None           |

### Role Hierarchy

- **User** (Level 1): Basic CRUD operations
- **Manager** (Level 2): Can delete records + User permissions
- **Admin** (Level 3): User management + Manager permissions
- **Superadmin** (Level 4): Full system access

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
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores');
```
