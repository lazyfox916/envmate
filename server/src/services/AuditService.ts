import { Request } from 'express';
import { Op } from 'sequelize';
import AuditLog, {
  AuditAction,
  AuditEntityType,
  AuditStatus,
  AuditLogCreationAttributes,
} from '../models/AuditLog';

/**
 * Audit Logging Service
 * Provides centralized audit trail for security and compliance
 */

export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AuditEntry {
  action: AuditAction | string;
  entityType: AuditEntityType | string;
  entityId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  status?: AuditStatus;
  errorMessage?: string;
}

/**
 * Extract audit context from Express request
 */
export const extractAuditContext = (req: Request): AuditContext => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ipAddress = forwardedFor
    ? (forwardedFor as string).split(',')[0].trim()
    : req.ip || req.socket.remoteAddress || undefined;

  return {
    userId: req.userId,
    ipAddress,
    userAgent: req.headers['user-agent']?.substring(0, 500),
    requestId: req.requestId,
  };
};

/**
 * Sanitize metadata to remove sensitive information
 */
const sanitizeMetadata = (metadata: Record<string, unknown>): Record<string, unknown> => {
  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'apiKey', 'api_key',
    'authorization', 'auth', 'credential', 'private', 'accessToken',
    'refreshToken', 'access_token', 'refresh_token',
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    
    // Check if key contains sensitive words
    if (sensitiveKeys.some(s => lowerKey.includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

export class AuditService {
  /**
   * Create an audit log entry
   */
  static async log(
    entry: AuditEntry,
    context: AuditContext = {}
  ): Promise<AuditLog | null> {
    try {
      const sanitizedMetadata = entry.metadata
        ? sanitizeMetadata(entry.metadata)
        : {};

      const auditData: AuditLogCreationAttributes = {
        user_id: context.userId || null,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId || null,
        description: entry.description || null,
        metadata: sanitizedMetadata,
        ip_address: context.ipAddress || null,
        user_agent: context.userAgent || null,
        request_id: context.requestId || null,
        status: entry.status || AuditStatus.SUCCESS,
        error_message: entry.errorMessage || null,
      };

      return await AuditLog.create(auditData);
    } catch (error) {
      // Don't let audit logging failures affect the main operation
      console.error('Audit logging failed:', error);
      return null;
    }
  }

  /**
   * Log from an Express request
   */
  static async logFromRequest(
    req: Request,
    entry: AuditEntry
  ): Promise<AuditLog | null> {
    const context = extractAuditContext(req);
    return this.log(entry, context);
  }

  // ===========================================
  // Authentication Audit Helpers
  // ===========================================

  static async logLogin(req: Request, userId: string, success: boolean, details?: Record<string, unknown>): Promise<void> {
    await this.logFromRequest(req, {
      action: success ? AuditAction.LOGIN : AuditAction.LOGIN_FAILED,
      entityType: AuditEntityType.SESSION,
      entityId: userId,
      description: success ? 'User logged in successfully' : 'Login attempt failed',
      metadata: details,
      status: success ? AuditStatus.SUCCESS : AuditStatus.FAILURE,
    });
  }

  static async logLogout(req: Request, userId: string): Promise<void> {
    await this.logFromRequest(req, {
      action: AuditAction.LOGOUT,
      entityType: AuditEntityType.SESSION,
      entityId: userId,
      description: 'User logged out',
    });
  }

  static async logPasswordReset(req: Request, userId: string, success: boolean): Promise<void> {
    await this.logFromRequest(req, {
      action: AuditAction.PASSWORD_RESET,
      entityType: AuditEntityType.USER,
      entityId: userId,
      description: success ? 'Password reset successful' : 'Password reset failed',
      status: success ? AuditStatus.SUCCESS : AuditStatus.FAILURE,
    });
  }

  // ===========================================
  // Team Audit Helpers
  // ===========================================

  static async logTeamAction(
    req: Request,
    action: AuditAction,
    teamId: string,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logFromRequest(req, {
      action,
      entityType: AuditEntityType.TEAM,
      entityId: teamId,
      description,
      metadata,
    });
  }

  // ===========================================
  // Project Audit Helpers
  // ===========================================

  static async logProjectAction(
    req: Request,
    action: AuditAction,
    projectId: string,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logFromRequest(req, {
      action,
      entityType: AuditEntityType.PROJECT,
      entityId: projectId,
      description,
      metadata,
    });
  }

  // ===========================================
  // Environment Variable Audit Helpers
  // ===========================================

  static async logEnvAccess(
    req: Request,
    projectId: string,
    variableCount: number
  ): Promise<void> {
    await this.logFromRequest(req, {
      action: AuditAction.ENV_ACCESSED,
      entityType: AuditEntityType.ENV_FILE,
      entityId: projectId,
      description: `Accessed ${variableCount} environment variables`,
      metadata: { variableCount },
    });
  }

  static async logEnvExport(req: Request, projectId: string): Promise<void> {
    await this.logFromRequest(req, {
      action: AuditAction.ENV_EXPORTED,
      entityType: AuditEntityType.ENV_FILE,
      entityId: projectId,
      description: 'Environment file exported',
    });
  }

  static async logEnvUpload(
    req: Request,
    projectId: string,
    variableCount: number
  ): Promise<void> {
    await this.logFromRequest(req, {
      action: AuditAction.ENV_UPLOADED,
      entityType: AuditEntityType.ENV_FILE,
      entityId: projectId,
      description: `Uploaded ${variableCount} environment variables`,
      metadata: { variableCount },
    });
  }

  // ===========================================
  // Security Event Helpers
  // ===========================================

  static async logSecurityEvent(
    req: Request,
    action: AuditAction,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logFromRequest(req, {
      action,
      entityType: AuditEntityType.SYSTEM,
      description,
      metadata,
      status: AuditStatus.FAILURE,
    });
  }

  static async logBruteForce(req: Request, email?: string): Promise<void> {
    await this.logSecurityEvent(req, AuditAction.BRUTE_FORCE_DETECTED, 
      'Brute force attempt detected', { email });
  }

  static async logRateLimited(req: Request): Promise<void> {
    await this.logSecurityEvent(req, AuditAction.RATE_LIMITED,
      'Request rate limited', { path: req.path });
  }

  static async logUnauthorizedAccess(req: Request, resource: string): Promise<void> {
    await this.logSecurityEvent(req, AuditAction.UNAUTHORIZED_ACCESS,
      `Unauthorized access attempt to ${resource}`, { resource, path: req.path });
  }

  // ===========================================
  // Query Methods
  // ===========================================

  /**
   * Get audit logs with filtering
   */
  static async getAuditLogs(options: {
    userId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    status?: AuditStatus;
    startDate?: Date;
    endDate?: Date;
    ipAddress?: string;
    page?: number;
    limit?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const {
      userId,
      action,
      entityType,
      entityId,
      status,
      startDate,
      endDate,
      ipAddress,
      page = 1,
      limit = 50,
    } = options;

    const whereClause: Record<string, unknown> = {};

    if (userId) whereClause.user_id = userId;
    if (action) whereClause.action = action;
    if (entityType) whereClause.entity_type = entityType;
    if (entityId) whereClause.entity_id = entityId;
    if (status) whereClause.status = status;
    if (ipAddress) whereClause.ip_address = ipAddress;

    if (startDate || endDate) {
      whereClause.created_at = {};
      if (startDate) (whereClause.created_at as any)[Op.gte] = startDate;
      if (endDate) (whereClause.created_at as any)[Op.lte] = endDate;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await AuditLog.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return { logs: rows, total: count };
  }

  /**
   * Get recent activity for a user
   */
  static async getUserActivity(
    userId: string,
    limit: number = 20
  ): Promise<AuditLog[]> {
    return AuditLog.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit,
    });
  }

  /**
   * Get activity for an entity
   */
  static async getEntityActivity(
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    return AuditLog.findAll({
      where: { entity_type: entityType, entity_id: entityId },
      order: [['created_at', 'DESC']],
      limit,
    });
  }

  /**
   * Get security events
   */
  static async getSecurityEvents(
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<AuditLog[]> {
    const securityActions = [
      AuditAction.LOGIN_FAILED,
      AuditAction.BRUTE_FORCE_DETECTED,
      AuditAction.RATE_LIMITED,
      AuditAction.INVALID_TOKEN,
      AuditAction.UNAUTHORIZED_ACCESS,
      AuditAction.ACCOUNT_LOCKED,
    ];

    return AuditLog.findAll({
      where: {
        action: { [Op.in]: securityActions },
        created_at: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Cleanup old audit logs (retention policy)
   */
  static async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deleted = await AuditLog.destroy({
      where: {
        created_at: { [Op.lt]: cutoffDate },
      },
    });

    return deleted;
  }
}

export default AuditService;
