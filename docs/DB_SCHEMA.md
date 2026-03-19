# EnvMate Database Schema

> Database documentation for the EnvMate platform

## Overview

EnvMate uses PostgreSQL as its primary database. The schema is designed to support:
- User authentication and management
- Team-based collaboration
- Project organization
- Encrypted environment variable storage
- Team invitations

## Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│   users     │       │  team_members    │       │    teams    │
├─────────────┤       ├──────────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ user_id (FK)     │       │ id (PK)     │
│ email       │       │ team_id (FK)     │──────►│ name        │
│ password    │       │ role             │       │ description │
│ name        │       │ joined_at        │       │ owner_id(FK)│──┐
│ ...         │       └──────────────────┘       │ ...         │  │
└─────────────┘                                  └─────────────┘  │
      ▲                                                │          │
      │                                                │          │
      └────────────────────────────────────────────────┴──────────┘
      │
      │        ┌─────────────┐       ┌─────────────┐       ┌──────────────┐
      │        │  projects   │       │  env_files  │       │env_variables │
      │        ├─────────────┤       ├─────────────┤       ├──────────────┤
      └────────│ created_by  │       │ project_id  │──────►│ env_file_id  │
               │ team_id(FK) │◄──────│ id (PK)     │       │ id (PK)      │
               │ id (PK)     │       │ name        │       │ key          │
               │ name        │       │ environment │       │ enc_value    │
               │ ...         │       │ ...         │       │ iv, auth_tag │
               └─────────────┘       └─────────────┘       └──────────────┘

┌──────────────┐
│ invitations  │
├──────────────┤
│ id (PK)      │
│ team_id (FK) │
│ email        │
│ role         │
│ token_hash   │
│ invited_by   │
│ status       │
│ expires_at   │
└──────────────┘
```

## Tables

### users

Stores user account information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| email | VARCHAR(255) | NOT NULL, UNIQUE | User email address |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hashed password |
| name | VARCHAR(100) | NOT NULL | Display name |
| email_verified | BOOLEAN | NOT NULL, DEFAULT false | Email verification status |
| email_verification_token | VARCHAR(255) | NULL | Token for email verification |
| email_verification_expires | TIMESTAMP | NULL | Token expiration time |
| password_reset_token | VARCHAR(255) | NULL | Token for password reset |
| password_reset_expires | TIMESTAMP | NULL | Token expiration time |
| failed_login_attempts | INTEGER | NOT NULL, DEFAULT 0 | Failed login counter |
| locked_until | TIMESTAMP | NULL | Account lockout time |
| last_login_at | TIMESTAMP | NULL | Last successful login |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |
| deleted_at | TIMESTAMP | NULL | Soft delete timestamp |

**Indexes:**
- UNIQUE on `email` WHERE `deleted_at IS NULL`
- INDEX on `email_verification_token`
- INDEX on `password_reset_token`

---

### teams

Stores team information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(100) | NOT NULL | Team name |
| description | TEXT | NULL | Team description |
| owner_id | UUID | FK → users.id, NOT NULL | Team owner |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |
| deleted_at | TIMESTAMP | NULL | Soft delete timestamp |

**Indexes:**
- INDEX on `owner_id`
- INDEX on `name`

---

### team_members

Junction table for team membership with roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| team_id | UUID | FK → teams.id, NOT NULL | Team reference |
| user_id | UUID | FK → users.id, NOT NULL | User reference |
| role | ENUM | NOT NULL, DEFAULT 'viewer' | Member role |
| joined_at | TIMESTAMP | NOT NULL | Join timestamp |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

**Role Enum Values:**
- `admin` - Full access, can manage team
- `editor` - Can edit projects and env variables
- `viewer` - Read-only access

**Indexes:**
- UNIQUE on `(team_id, user_id)`
- INDEX on `team_id`
- INDEX on `user_id`
- INDEX on `role`

---

### projects

Stores project information within teams.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| team_id | UUID | FK → teams.id, NOT NULL | Parent team |
| name | VARCHAR(100) | NOT NULL | Project name |
| description | TEXT | NULL | Project description |
| created_by | UUID | FK → users.id, NOT NULL | Creator |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |
| deleted_at | TIMESTAMP | NULL | Soft delete timestamp |

**Indexes:**
- UNIQUE on `(team_id, name)` WHERE `deleted_at IS NULL`
- INDEX on `team_id`
- INDEX on `created_by`
- INDEX on `name`

---

### env_files

Stores .env file metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| project_id | UUID | FK → projects.id, NOT NULL | Parent project |
| name | VARCHAR(100) | NOT NULL | File name (e.g., ".env.local") |
| environment | ENUM | NOT NULL, DEFAULT 'development' | Environment type |
| description | TEXT | NULL | File description |
| created_by | UUID | FK → users.id, NOT NULL | Creator |
| last_modified_by | UUID | FK → users.id, NOT NULL | Last modifier |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |
| deleted_at | TIMESTAMP | NULL | Soft delete timestamp |

**Environment Enum Values:**
- `development`
- `staging`
- `production`
- `test`
- `custom`

**Indexes:**
- UNIQUE on `(project_id, name)` WHERE `deleted_at IS NULL`
- INDEX on `project_id`
- INDEX on `environment`

---

### env_variables

Stores encrypted environment variables.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| env_file_id | UUID | FK → env_files.id, NOT NULL, CASCADE | Parent env file |
| key | VARCHAR(255) | NOT NULL | Variable name |
| encrypted_value | TEXT | NOT NULL | AES-256-GCM encrypted value |
| iv | VARCHAR(32) | NOT NULL | Initialization vector (hex) |
| auth_tag | VARCHAR(32) | NOT NULL | GCM auth tag (hex) |
| description | TEXT | NULL | Variable description |
| is_secret | BOOLEAN | NOT NULL, DEFAULT true | Mask in UI |
| created_by | UUID | FK → users.id, NOT NULL | Creator |
| last_modified_by | UUID | FK → users.id, NOT NULL | Last modifier |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

**Key Validation:**
- Must match pattern: `^[A-Za-z_][A-Za-z0-9_]*$`

**Indexes:**
- UNIQUE on `(env_file_id, key)`
- INDEX on `env_file_id`
- INDEX on `key`

---

### invitations

Stores team invitation records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| team_id | UUID | FK → teams.id, NOT NULL | Target team |
| email | VARCHAR(255) | NOT NULL | Invitee email |
| role | ENUM | NOT NULL, DEFAULT 'viewer' | Role to assign |
| token_hash | VARCHAR(255) | NOT NULL | Hashed invitation token |
| invited_by | UUID | FK → users.id, NOT NULL | Inviter |
| status | ENUM | NOT NULL, DEFAULT 'pending' | Invitation status |
| expires_at | TIMESTAMP | NOT NULL | Expiration time |
| accepted_at | TIMESTAMP | NULL | Acceptance time |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

**Status Enum Values:**
- `pending` - Awaiting response
- `accepted` - User accepted
- `rejected` - User rejected
- `expired` - Invitation expired
- `revoked` - Admin revoked

**Indexes:**
- INDEX on `team_id`
- INDEX on `email`
- INDEX on `token_hash`
- INDEX on `status`
- INDEX on `expires_at`

---

## Migration Commands

```bash
# Run all pending migrations
npm run db:migrate

# Undo last migration
npm run db:migrate:undo

# Undo all migrations
npm run db:migrate:undo:all

# Run seeders
npm run db:seed

# Undo seeders
npm run db:seed:undo

# Reset database (undo all, migrate, seed)
npm run db:reset
```

## Security Considerations

1. **Password Storage**: Passwords are hashed using bcrypt with cost factor 12
2. **Encryption**: Environment variable values are encrypted using AES-256-GCM
3. **Soft Deletes**: Users, teams, projects, and env_files use soft deletes
4. **Token Hashing**: Invitation tokens are hashed before storage
5. **Parameterized Queries**: Sequelize uses parameterized queries by default

---

*Last updated: 2026-03-18*
