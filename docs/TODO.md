# EnvMate - Development TODO

> **Project:** EnvMate - Secure Environment Variable Management Platform  
> **Summary:** A platform for developers and teams to securely store, share, and manage `.env` files with encryption, access control, and team collaboration.

---

## Status Legend

| Symbol | Status |
|--------|--------|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Done |

---

## Phase 1: Project Setup

**Objective:** Initialize the monorepo structure, install core dependencies, and establish the foundational project configuration.

### Tasks

- [x] Create root project folder structure (`/client`, `/server`, `/docs`, `/scripts`)
- [x] Initialize Git repository and create `.gitignore`
- [x] Initialize `package.json` for the server (Node.js/Express)
- [x] Initialize Next.js project in `/client`
- [x] Set up TypeScript for both client and server
- [x] Configure ESLint and Prettier for code consistency
- [x] Create base environment variable files (`.env.example` for both client and server)
- [x] Set up `nodemon` or `ts-node-dev` for server hot-reloading
- [x] Create initial `README.md` with project overview
- [x] Define folder structure conventions (`/controllers`, `/routes`, `/services`, `/models`, `/middlewares`, `/utils`)
- [x] Set up path aliases for cleaner imports

### Security Tasks (Phase 1)

- [x] Add `.env` to `.gitignore` immediately
- [x] Document required environment variables in `.env.example`
- [ ] Plan encryption key storage strategy (env-based vs vault)
- [ ] Document secret management approach in comments

### Notes

- Keep `.env.example` updated as new variables are added.
- Decide on monorepo tooling (npm workspaces, Turborepo, or separate repos).
- Establish naming conventions early (camelCase, PascalCase, etc.).

---

## Phase 2: Basic Client/Server Communication

**Objective:** Establish a working Express.js server and a Next.js frontend that can communicate via REST API.

### Tasks

- [x] Create Express.js server entry point (`server/src/index.ts`)
- [x] Set up basic Express middleware (JSON parsing, URL encoding)
- [x] Create health check endpoint (`GET /api/health`)
- [x] Configure CORS for local development
- [x] Set up Next.js API proxy or direct API calls to backend
- [x] Create a test page in Next.js that calls the health endpoint
- [x] Verify client-server communication works
- [x] Set up error handling middleware (catch-all error handler)
- [x] Create consistent API response format (`{ success, data, error }`)
- [x] Set up request logging middleware (morgan or custom)

### Security Tasks (Phase 2)

- [x] Configure CORS with specific allowed origins (not `*`)
- [x] Set up Helmet.js for secure HTTP headers
- [x] Implement basic rate limiting middleware (express-rate-limit)
- [x] Add request body size limits
- [ ] Plan HTTPS setup for production

### Architecture Tasks

- [x] Define API versioning strategy (`/api/v1/...`)
- [x] Document API response structure
- [x] Plan middleware execution order
- [x] Create reusable response helper functions

### Notes

- Test CORS configuration with actual frontend requests.
- Document all middleware in order of execution.
- Keep rate limits reasonable for development, stricter for production.

---

## Phase 3: Database & Models

**Objective:** Set up PostgreSQL database connection, define schemas, and create data models.

### Tasks

- [x] Install PostgreSQL locally or set up Docker container
- [x] Choose ORM/query builder (Sequelize,  pg)
- [x] Configure database connection with connection pooling
- [x] Create database connection utility with error handling
- [x] Design and create `users` table schema
- [x] Design and create `teams` table schema
- [x] Design and create `team_members` table schema (junction table)
- [x] Design and create `projects` table schema
- [x] Design and create `env_files` table schema
- [x] Design and create `env_variables` table schema (encrypted key-value pairs)
- [x] Design and create `invitations` table schema
- [x] Set up database migrations system
- [x] Create initial migration files
- [ ] Run migrations and verify schema
- [x] Create seed scripts for development data
- [x] Document all table relationships (ERD)

### Security Tasks (Phase 3)

- [x] Use parameterized queries to prevent SQL injection
- [x] Store database credentials securely (environment variables)
- [x] Plan column-level encryption for sensitive data
- [x] Set appropriate column constraints (NOT NULL, UNIQUE, etc.)
- [x] Design soft delete vs hard delete strategy
- [ ] Plan database backup strategy
- [x] Consider database connection encryption (SSL/TLS)

### Architecture Tasks

- [x] Define model layer structure
- [x] Create base model/repository pattern if needed
- [x] Plan data validation at model layer
- [x] Document foreign key relationships
- [x] Plan indexes for query optimization

### Notes

- Keep migration files immutable once deployed.
- Use UUIDs for primary keys (better for distributed systems).
- Document all enum types and their values.

---

## Phase 4: Authentication

**Objective:** Implement secure user registration, login, and session management using JWT.

### Tasks

- [ ] Create `POST /api/v1/auth/register` endpoint
- [ ] Create `POST /api/v1/auth/login` endpoint
- [ ] Create `POST /api/v1/auth/logout` endpoint
- [ ] Create `GET /api/v1/auth/me` endpoint (get current user)
- [ ] Create `POST /api/v1/auth/refresh-token` endpoint
- [ ] Implement user registration service
- [ ] Implement user login service
- [ ] Generate and sign JWT access tokens
- [ ] Generate refresh tokens with longer expiry
- [ ] Store refresh tokens securely (database or Redis)
- [ ] Create authentication middleware to protect routes
- [ ] Implement email verification flow
- [ ] Create `POST /api/v1/auth/verify-email` endpoint
- [ ] Create `POST /api/v1/auth/resend-verification` endpoint
- [ ] Create `POST /api/v1/auth/forgot-password` endpoint
- [ ] Create `POST /api/v1/auth/reset-password` endpoint
- [ ] Build login page in Next.js
- [ ] Build registration page in Next.js
- [ ] Build forgot password page in Next.js
- [ ] Implement client-side token storage (httpOnly cookies preferred)
- [ ] Implement automatic token refresh on client
- [ ] Handle authentication errors gracefully on frontend

### Security Tasks (Phase 4)

- [ ] Hash passwords with bcrypt (cost factor 12+)
- [ ] Validate password strength (min length, complexity)
- [ ] Implement account lockout after failed attempts
- [ ] Use secure, httpOnly, sameSite cookies for tokens
- [ ] Set appropriate JWT expiry (short for access, longer for refresh)
- [ ] Validate JWT signature and expiry on every protected request
- [ ] Implement CSRF protection for cookie-based auth
- [ ] Sanitize and validate all input fields
- [ ] Rate limit authentication endpoints specifically
- [ ] Log authentication attempts (success and failure)
- [ ] Generate cryptographically secure tokens for email verification
- [ ] Set expiry on verification and reset tokens
- [ ] Invalidate old tokens when new ones are generated
- [ ] Never expose password hashes in API responses

### Architecture Tasks

- [ ] Create AuthService for business logic
- [ ] Create AuthController for request handling
- [ ] Create auth middleware for route protection
- [ ] Plan token refresh strategy (silent refresh vs explicit)
- [ ] Define user session data structure

### Notes

- Never log passwords, tokens, or sensitive data.
- Consider adding OAuth providers in the future (Google, GitHub).
- Test token expiry and refresh flow thoroughly.

---

## Phase 5: Team Management

**Objective:** Allow users to create teams, manage team settings, and handle team membership basics.

### Tasks

- [ ] Create `POST /api/v1/teams` endpoint (create team)
- [ ] Create `GET /api/v1/teams` endpoint (list user's teams)
- [ ] Create `GET /api/v1/teams/:teamId` endpoint (get team details)
- [ ] Create `PATCH /api/v1/teams/:teamId` endpoint (update team)
- [ ] Create `DELETE /api/v1/teams/:teamId` endpoint (delete team)
- [ ] Create `GET /api/v1/teams/:teamId/members` endpoint (list members)
- [ ] Create `DELETE /api/v1/teams/:teamId/members/:userId` endpoint (remove member)
- [ ] Create `PATCH /api/v1/teams/:teamId/members/:userId/role` endpoint (change role)
- [ ] Implement TeamService with business logic
- [ ] Implement TeamController for request handling
- [ ] Build teams list page in Next.js
- [ ] Build team creation form/modal
- [ ] Build team settings page
- [ ] Build team members list component
- [ ] Implement team switching in UI
- [ ] Store current team context in frontend state

### Security Tasks (Phase 5)

- [ ] Verify user owns/belongs to team before any operation
- [ ] Only allow team admins to delete team
- [ ] Only allow admins to remove members
- [ ] Prevent last admin from leaving/being removed
- [ ] Validate team name and settings input
- [ ] Log team management actions for audit

### Architecture Tasks

- [ ] Create TeamService
- [ ] Create TeamController
- [ ] Create team authorization middleware
- [ ] Plan team context passing in requests

### Notes

- Creator of team automatically becomes admin.
- Decide on team deletion behavior (soft delete, cascade, archive).
- Consider team-level settings and preferences.

---

## Phase 6: Project & `.env` Management

**Objective:** Implement project creation within teams and secure `.env` file upload, storage, and retrieval.

### Tasks

- [ ] Create `POST /api/v1/teams/:teamId/projects` endpoint (create project)
- [ ] Create `GET /api/v1/teams/:teamId/projects` endpoint (list projects)
- [ ] Create `GET /api/v1/projects/:projectId` endpoint (get project)
- [ ] Create `PATCH /api/v1/projects/:projectId` endpoint (update project)
- [ ] Create `DELETE /api/v1/projects/:projectId` endpoint (delete project)
- [ ] Create `POST /api/v1/projects/:projectId/env` endpoint (upload .env)
- [ ] Create `GET /api/v1/projects/:projectId/env` endpoint (get .env variables)
- [ ] Create `PATCH /api/v1/projects/:projectId/env` endpoint (update variables)
- [ ] Create `DELETE /api/v1/projects/:projectId/env/:key` endpoint (delete variable)
- [ ] Implement `.env` file parser (handle multiline, special chars, comments)
- [ ] Implement variable encryption before storage
- [ ] Implement variable decryption on retrieval
- [ ] Build projects list page in Next.js
- [ ] Build project creation form
- [ ] Build project details / settings page
- [ ] Build `.env` file upload component
- [ ] Build `.env` variables editor (key-value UI)
- [ ] Build `.env` export/download functionality
- [ ] Implement copy individual variable to clipboard

### Security Tasks (Phase 6)

- [ ] Encrypt each variable value with AES-256-GCM
- [ ] Use unique IV for each encryption operation
- [ ] Store encryption keys securely (not in database)
- [ ] Validate file type and size before processing
- [ ] Sanitize variable keys (alphanumeric and underscore only)
- [ ] Prevent XSS in variable values when displaying
- [ ] Check team membership before project access
- [ ] Log all `.env` access for audit trail
- [ ] Mask variable values by default in UI

### Architecture Tasks

- [ ] Create ProjectService
- [ ] Create ProjectController
- [ ] Create EnvService for `.env` operations
- [ ] Create EncryptionService (encapsulate crypto logic)
- [ ] Design encryption flow diagram
- [ ] Plan variable update strategy (merge vs replace)

### Notes

- Decide whether to encrypt keys as well as values.
- Handle `.env` format edge cases (quotes, multiline, etc.).
- Consider adding environment types (dev, staging, prod).

---

## Phase 7: Encryption & Security Hardening

**Objective:** Ensure all sensitive data is properly encrypted and implement comprehensive security measures.

### Tasks

- [ ] Implement AES-256-GCM encryption utility
- [ ] Implement secure key derivation (PBKDF2 or Argon2)
- [ ] Create encryption key rotation strategy
- [ ] Implement master key management approach
- [ ] Add encryption to all stored `.env` values
- [ ] Verify encryption is working (test decrypt flow)
- [ ] Audit all sensitive data storage
- [ ] Implement secure random token generation utility
- [ ] Review and harden all API endpoints
- [ ] Implement request input validation (Joi, Zod, or class-validator)
- [ ] Add output sanitization for API responses
- [ ] Implement comprehensive error handling (no stack traces in prod)
- [ ] Set up CSP headers
- [ ] Configure cookie security attributes
- [ ] Review CORS settings for production
- [ ] Implement request ID tracking for debugging

### Security Tasks (Phase 7)

- [ ] Document encryption algorithm and key management
- [ ] Test encryption with various data types
- [ ] Verify no sensitive data in logs
- [ ] Audit all database queries for injection risks
- [ ] Review all file parsing for vulnerabilities
- [ ] Implement brute force protection
- [ ] Add IP-based rate limiting
- [ ] Plan secret rotation procedure
- [ ] Document security incident response plan
- [ ] Test for common vulnerabilities (OWASP Top 10)

### Architecture Tasks

- [ ] Create centralized encryption service
- [ ] Document key hierarchy
- [ ] Plan key backup and recovery
- [ ] Design audit logging schema

### Notes

- Never store encryption keys in the same database as encrypted data.
- Consider using a hardware security module (HSM) for production.
- Document emergency key rotation procedure.

---

## Phase 8: RBAC & Access Control

**Objective:** Implement granular role-based access control for team resources.

### Tasks

- [ ] Define roles: Admin, Editor, Viewer
- [ ] Create role constants/enums
- [ ] Implement role checking middleware
- [ ] Apply role checks to all team endpoints
- [ ] Apply role checks to all project endpoints
- [ ] Apply role checks to all `.env` endpoints
- [ ] Implement permission helper functions
- [ ] Add role display in team members UI
- [ ] Build role assignment UI for admins
- [ ] Add permission-based UI element visibility
- [ ] Disable edit buttons for viewers
- [ ] Show appropriate error messages for unauthorized actions
- [ ] Test all role combinations and permissions

### Security Tasks (Phase 8)

- [ ] Verify role checks cannot be bypassed
- [ ] Check role on every protected operation
- [ ] Prevent privilege escalation
- [ ] Log all permission denied events
- [ ] Audit existing endpoints for missing auth checks
- [ ] Test role changes take effect immediately

### Architecture Tasks

- [ ] Create RBAC middleware
- [ ] Create permission constants file
- [ ] Document permission matrix (role vs action)
- [ ] Plan extensible permission system for future

### Notes

- Default new members to Viewer role.
- Admin should be able to change any member's role except last admin.
- Consider project-level role overrides in future.

---

## Phase 9: Invitations & Email Flow

**Objective:** Implement team invitation system with email notifications and secure token handling.

### Tasks

- [ ] Choose email provider (SendGrid, AWS SES, Nodemailer, Resend)
- [ ] Set up email service configuration
- [ ] Create email template system (HTML templates)
- [ ] Create `POST /api/v1/teams/:teamId/invitations` endpoint (send invite)
- [ ] Create `GET /api/v1/invitations` endpoint (list pending invitations for user)
- [ ] Create `POST /api/v1/invitations/:token/accept` endpoint
- [ ] Create `POST /api/v1/invitations/:token/reject` endpoint
- [ ] Create `DELETE /api/v1/teams/:teamId/invitations/:inviteId` endpoint (revoke)
- [ ] Implement invitation token generation
- [ ] Implement invitation email sending
- [ ] Build invitation email template
- [ ] Build pending invitations page in frontend
- [ ] Build accept/reject invitation UI
- [ ] Build team invitation management for admins
- [ ] Implement invitation expiry handling
- [ ] Add email notification for invitation acceptance
- [ ] Add email notification for role changes (optional)
- [ ] Create email verification reminder job (optional)

### Security Tasks (Phase 9)

- [ ] Generate cryptographically secure invitation tokens
- [ ] Set invitation expiry (7 days recommended)
- [ ] Hash invitation tokens before storing
- [ ] Invalidate token after use (accept/reject)
- [ ] Limit number of pending invitations per team
- [ ] Rate limit invitation sending
- [ ] Verify inviter has permission to invite
- [ ] Validate email format before sending
- [ ] Use email allowlist/blocklist if needed
- [ ] Log all invitation events

### Architecture Tasks

- [ ] Create InvitationService
- [ ] Create EmailService (abstraction layer)
- [ ] Design invitation flow diagram
- [ ] Plan email queue for reliability (optional)

### Notes

- Handle case where invitee doesn't have an account yet.
- Consider magic link login for new users from invitation.
- Build email templates that work across email clients.

---

## Phase 10: Testing

**Objective:** Implement comprehensive testing to ensure reliability and security.

### Tasks

- [x] Set up Jest for backend testing
- [ ] Set up React Testing Library for frontend
- [x] Configure test database for integration tests
- [x] Write unit tests for encryption utilities
- [x] Write unit tests for authentication service
- [x] Write unit tests for `.env` parser
- [x] Write integration tests for auth endpoints
- [x] Write integration tests for team endpoints
- [ ] Write integration tests for project endpoints
- [ ] Write integration tests for `.env` endpoints
- [ ] Write integration tests for invitation flow
- [x] Write RBAC permission tests (all role combinations)
- [ ] Write frontend component tests
- [ ] Write E2E tests for critical flows (Playwright or Cypress)
- [x] Set up test coverage reporting
- [ ] Achieve minimum 70% code coverage
- [ ] Set up CI pipeline to run tests

### Security Tasks (Phase 10)

- [ ] Write tests for authentication edge cases
- [ ] Test invalid token handling
- [ ] Test rate limiting behavior
- [ ] Test input validation rejections
- [ ] Test authorization bypasses (negative tests)
- [ ] Test SQL injection attempts
- [ ] Test XSS prevention
- [ ] Test CSRF protection
- [ ] Perform basic security audit

### Notes

- Run tests in isolated environment with dedicated test database.
- Mock external services (email) in unit tests.
- Include both positive and negative test cases.

---

## Phase 11: Deployment & Production Readiness

**Objective:** Prepare the application for production deployment with proper configuration and monitoring.

### Tasks

- [ ] Choose hosting platform (Vercel, Railway, AWS, DigitalOcean, etc.)
- [ ] Set up production database (managed PostgreSQL)
- [ ] Configure production environment variables
- [ ] Set up domain and SSL certificates
- [ ] Configure HTTPS redirect
- [ ] Set up reverse proxy (if needed)
- [ ] Configure production CORS settings
- [ ] Set up production logging (structured JSON logs)
- [ ] Configure log aggregation service
- [ ] Set up error tracking (Sentry or similar)
- [ ] Set up uptime monitoring
- [ ] Configure health check endpoints for load balancer
- [ ] Set up database backups (automated)
- [ ] Configure database connection pooling for production
- [ ] Set up CI/CD pipeline
- [ ] Create deployment scripts
- [ ] Document rollback procedure
- [ ] Test deployment in staging environment
- [ ] Create production launch checklist
- [ ] Deploy to production

### Security Tasks (Phase 11)

- [ ] Verify all secrets are in environment variables (not code)
- [ ] Set production rate limits (stricter than dev)
- [ ] Enable all security headers in production
- [ ] Verify HTTPS is enforced
- [ ] Set secure cookie flags in production
- [ ] Disable debug modes and stack traces
- [ ] Set up WAF if available
- [ ] Configure DDoS protection
- [ ] Plan and document incident response
- [ ] Set up security alerting

### Architecture Tasks

- [ ] Document deployment architecture
- [ ] Plan horizontal scaling strategy
- [ ] Document environment-specific configurations
- [ ] Create infrastructure diagram

### Notes

- Test production configuration in staging first.
- Have rollback plan ready before deployment.
- Monitor closely after initial deployment.

---

## Phase 12: Documentation

**Objective:** Create comprehensive documentation for developers, users, and maintainers.

### Tasks

- [ ] Write complete `README.md` with setup instructions
- [ ] Create `Architecture.md` documenting system design
- [ ] Create `Security.md` documenting security measures
- [ ] Create `API.md` with all endpoint documentation
- [ ] Create `DB_SCHEMA.md` with database documentation
- [ ] Document all environment variables needed
- [ ] Create developer onboarding guide
- [ ] Document local development setup
- [ ] Document deployment process
- [ ] Create troubleshooting guide
- [ ] Document backup and recovery procedures
- [ ] Add code comments for complex logic
- [ ] Create API changelog template
- [ ] Document encryption and key management
- [ ] Create security incident response documentation

### Documentation Content Details

#### README.md
- [ ] Project overview
- [ ] Features list
- [ ] Tech stack
- [ ] Prerequisites
- [ ] Installation steps
- [ ] Running locally
- [ ] Running tests
- [ ] Deployment guide
- [ ] Contributing guidelines

#### Architecture.md
- [ ] System overview diagram
- [ ] Component descriptions
- [ ] Data flow diagrams
- [ ] Folder structure explanation
- [ ] API design principles
- [ ] Database design
- [ ] Encryption architecture
- [ ] Authentication flow

#### Security.md
- [ ] Security architecture overview
- [ ] Encryption implementation details
- [ ] Authentication mechanism
- [ ] Authorization model (RBAC)
- [ ] Input validation approach
- [ ] Rate limiting configuration
- [ ] Secure headers configuration
- [ ] Key management procedures
- [ ] Secret rotation procedures
- [ ] Incident response plan
- [ ] Security audit schedule
- [ ] Vulnerability disclosure policy

#### API.md
- [ ] API versioning strategy
- [ ] Authentication requirements
- [ ] Request/response formats
- [ ] All endpoint documentation
- [ ] Error codes and meanings
- [ ] Rate limit information
- [ ] Example requests and responses

#### DB_SCHEMA.md
- [ ] Entity relationship diagram
- [ ] Table definitions
- [ ] Column descriptions
- [ ] Indexes documentation
- [ ] Migration procedures

### Notes

- Keep documentation up to date as code changes.
- Use diagrams where possible for clarity.
- Include examples for all API endpoints.

---

## Post-MVP / Future Enhancements

**Objective:** Track potential features and improvements for future releases.

### Features

- [ ] `.env` version history and rollback
- [ ] CLI tool for syncing `.env` locally
- [ ] GitHub integration (sync secrets with repos)
- [ ] CI/CD integration (inject secrets into pipelines)
- [ ] Audit logs UI (who accessed/edited what)
- [ ] Secret rotation automation
- [ ] API key access for programmatic use
- [ ] OAuth providers (Google, GitHub login)
- [ ] Two-factor authentication (2FA)
- [ ] Team activity feed
- [ ] Variable comments/descriptions
- [ ] Environment types (dev, staging, prod) with inheritance
- [ ] Variable templates
- [ ] Bulk import/export
- [ ] Slack/Discord notifications
- [ ] Variable search and filtering
- [ ] Dark mode UI
- [ ] Mobile responsive design improvements
- [ ] Organization level (multiple teams)

### Technical Improvements

- [ ] Implement Redis for session/caching
- [ ] Add GraphQL API option
- [ ] Implement WebSocket for real-time updates
- [ ] Add Kubernetes deployment configs
- [ ] Set up feature flags system
- [ ] Implement database read replicas
- [ ] Add performance monitoring (APM)
- [ ] Implement request queuing for heavy operations

---

## Change Log / Progress Log

Use this section to track significant progress and decisions.

| Date | Phase | Description | Status |
|------|-------|-------------|--------|
| 2026-03-18 | Phase 1 | Project setup complete - folder structure, Git, TypeScript, ESLint, Prettier, Next.js client, Express server | Done |
| 2026-03-18 | Phase 2 | Client/Server communication - Helmet, rate limiting, morgan logging, CORS config, API versioning (/api/v1), response helpers, Next.js API client, health test page | Done |
| 2026-03-18 | Phase 3 | Database & Models - Docker PostgreSQL, Sequelize ORM, 7 migrations (users, teams, team_members, projects, env_files, env_variables, invitations), seed scripts, DB_SCHEMA.md | Done |

---

## Blocked / Pending Decisions

Track decisions that need to be made and blockers.

| Item | Description | Status | Resolution |
|------|-------------|--------|------------|
| ORM Choice | Sequelize vs Prisma vs TypeORM | Resolved | Sequelize |
| | | | |

### Pending Decisions

- [x] Choose between Prisma vs TypeORM vs raw SQL → **Sequelize**
- [ ] Decide on monorepo tooling
- [ ] Choose email provider
- [ ] Choose hosting platform
- [ ] Decide on master key management (env var vs vault)
- [ ] Decide on team deletion behavior
- [ ] Choose between session-based vs pure JWT auth

---

## Suggested File Docs

Checklist for project documentation files to create:

- [x] `README.md` - Project overview and setup instructions
- [x] `TODO.md` - This file (development task tracking)
- [ ] `Architecture.md` - System design documentation
- [ ] `Security.md` - Security implementation documentation
- [ ] `API.md` - API endpoint documentation
- [x] `DB_SCHEMA.md` - Database schema documentation
- [ ] `CONTRIBUTING.md` - Contribution guidelines
- [ ] `CHANGELOG.md` - Release changelog
- [x] `.env.example` - Environment variable template (server)
- [x] `.env.example` - Environment variable template (client)
- [x] `docker-compose.yml` - Local development Docker setup
- [ ] `Dockerfile` - Production container configuration

---

*Last updated: 2026-03-18*
