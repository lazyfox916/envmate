# EnvMate Permission Matrix

> This document defines the Role-Based Access Control (RBAC) system for EnvMate.

## Roles

EnvMate uses three predefined roles with hierarchical permissions:

| Role | Level | Description |
|------|-------|-------------|
| **Admin** | 3 (Highest) | Full access: manage team settings, members, and all projects |
| **Editor** | 2 | Can create and edit projects and environment variables |
| **Viewer** | 1 | Read-only access to projects and environment variables |

### Role Hierarchy

- Higher roles inherit all permissions from lower roles
- Admin can do everything Editor and Viewer can do
- Editor can do everything Viewer can do

---

## Permission Matrix

### Team Permissions

| Action | Admin | Editor | Viewer |
|--------|:-----:|:------:|:------:|
| View team details | ✅ | ✅ | ✅ |
| Update team settings | ✅ | ❌ | ❌ |
| Delete team | ✅* | ❌ | ❌ |
| Manage team settings | ✅ | ❌ | ❌ |

*\* Team deletion requires owner status, not just admin role.*

### Member Permissions

| Action | Admin | Editor | Viewer |
|--------|:-----:|:------:|:------:|
| List team members | ✅ | ✅ | ✅ |
| Invite new members | ✅ | ❌ | ❌ |
| Remove members | ✅ | ❌ | ❌ |
| Change member roles | ✅ | ❌ | ❌ |

### Project Permissions

| Action | Admin | Editor | Viewer |
|--------|:-----:|:------:|:------:|
| View projects | ✅ | ✅ | ✅ |
| Create projects | ✅ | ✅ | ❌ |
| Update projects | ✅ | ✅ | ❌ |
| Delete projects | ✅ | ❌ | ❌ |

### Environment Variable Permissions

| Action | Admin | Editor | Viewer |
|--------|:-----:|:------:|:------:|
| View env files | ✅ | ✅ | ✅ |
| View env values | ✅ | ✅ | ✅ |
| Create env variables | ✅ | ✅ | ❌ |
| Update env variables | ✅ | ✅ | ❌ |
| Delete env variables | ✅ | ✅ | ❌ |
| Export env files | ✅ | ✅ | ✅ |
| Upload env files | ✅ | ✅ | ❌ |

### Invitation Permissions

| Action | Admin | Editor | Viewer |
|--------|:-----:|:------:|:------:|
| Send invitations | ✅ | ❌ | ❌ |
| Revoke invitations | ✅ | ❌ | ❌ |
| List invitations | ✅ | ❌ | ❌ |

### Audit Permissions

| Action | Admin | Editor | Viewer |
|--------|:-----:|:------:|:------:|
| View audit logs | ✅ | ❌ | ❌ |
| Export audit logs | ✅ | ❌ | ❌ |

---

## Special Rules

### Team Owner

The team owner (creator) has additional privileges beyond the Admin role:

- **Cannot be removed** from the team
- **Cannot have their role changed**
- **Sole authority** to delete the team
- **Can transfer ownership** to another admin (future feature)

### Last Admin Protection

To ensure team management continuity:

- The **last admin cannot be demoted** to a lower role
- The **last admin cannot leave** the team
- The **last admin cannot be removed** by any action
- Before any of these actions, another member must be promoted to Admin

### Privilege Escalation Prevention

- Users **cannot assign roles higher** than their own
- Only Admins can change member roles
- Role changes require explicit admin action

### Default Roles

- **New team members** default to the **Viewer** role
- **Team creators** are automatically assigned the **Admin** role
- Invitation emails can specify a default role (Admin must confirm)

---

## API Endpoint Mappings

### Team Routes (`/api/v1/teams`)

| Endpoint | Method | Required Role |
|----------|--------|---------------|
| `/teams` | POST | Any authenticated user |
| `/teams` | GET | Any authenticated user |
| `/teams/:teamId` | GET | Team Member (any role) |
| `/teams/:teamId` | PATCH | Admin |
| `/teams/:teamId` | DELETE | Owner |
| `/teams/:teamId/members` | GET | Team Member (any role) |
| `/teams/:teamId/members/:userId` | DELETE | Admin |
| `/teams/:teamId/members/:userId/role` | PATCH | Admin |
| `/teams/:teamId/leave` | POST | Team Member (with restrictions) |

### Project Routes (`/api/v1`)

| Endpoint | Method | Required Role |
|----------|--------|---------------|
| `/teams/:teamId/projects` | POST | Editor or Admin |
| `/teams/:teamId/projects` | GET | Team Member (any role) |
| `/projects/:projectId` | GET | Team Member (any role) |
| `/projects/:projectId` | PATCH | Editor or Admin |
| `/projects/:projectId` | DELETE | Admin |

### Environment Variable Routes (`/api/v1/projects`)

| Endpoint | Method | Required Role |
|----------|--------|---------------|
| `/projects/:projectId/env` | POST | Editor or Admin |
| `/projects/:projectId/env` | GET | Team Member (any role) |
| `/projects/:projectId/env` | PATCH | Editor or Admin |
| `/projects/:projectId/env/export` | GET | Team Member (any role) |
| `/projects/:projectId/env/:key` | PATCH | Editor or Admin |
| `/projects/:projectId/env/:key` | DELETE | Editor or Admin |

---

## Audit Logging

All permission-denied events are automatically logged to the audit trail:

- **Action**: `permission_denied` or `unauthorized_access`
- **Captured Data**:
  - User ID and role
  - Requested resource and action
  - Request path and method
  - IP address and user agent
  - Timestamp

Use audit logs to:
- Monitor for suspicious access patterns
- Investigate security incidents
- Compliance reporting
- Access reviews

---

## Future Enhancements

Planned improvements to the permission system:

1. **Project-level role overrides**: Allow different roles per project within a team
2. **Custom roles**: Define custom roles with specific permission sets
3. **Temporary elevated access**: Time-limited role upgrades
4. **Permission groups**: Group permissions for easier management
5. **API key permissions**: Scoped permissions for programmatic access

---

*Last updated: 2026-03-18*
