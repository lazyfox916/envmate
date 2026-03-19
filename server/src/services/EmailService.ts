/**
 * Email Service
 * Handles sending emails via nodemailer with support for multiple providers
 */

import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import {
  teamInvitationTemplate,
  teamInvitationPlainText,
  invitationAcceptedTemplate,
  welcomeToTeamTemplate,
  emailVerificationTemplate,
  emailVerificationPlainText,
  passwordResetTemplate,
  passwordResetPlainText,
  roleChangedTemplate,
  InvitationTemplateData,
  InvitationAcceptedTemplateData,
  WelcomeToTeamTemplateData,
  EmailVerificationTemplateData,
  PasswordResetTemplateData,
  RoleChangedTemplateData,
} from '../templates/email';

// ===========================================
// Configuration
// ===========================================

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

const getEmailConfig = (): EmailConfig | null => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || 'EnvMate <noreply@envmate.com>';

  if (!host || !user || !pass) {
    return null;
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    from,
  };
};

// ===========================================
// Email Service Class
// ===========================================

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the email transporter
   */
  private initialize(): void {
    this.config = getEmailConfig();

    if (this.config) {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 10, // 10 messages per second max
      });

      this.isConfigured = true;
      console.log('📧 Email service configured successfully');
    } else {
      console.warn('⚠️  Email service not configured. Set SMTP_* environment variables.');
      this.isConfigured = false;
    }
  }

  /**
   * Check if email service is configured
   */
  isReady(): boolean {
    return this.isConfigured && this.transporter !== null;
  }

  /**
   * Verify SMTP connection
   */
  async verify(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email verification failed:', error);
      return false;
    }
  }

  /**
   * Send an email
   */
  async send(options: SendEmailOptions): Promise<EmailResult> {
    if (!this.transporter || !this.config) {
      // In development, log the email instead of failing
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 [DEV] Email would be sent:');
        console.log(`   To: ${options.to}`);
        console.log(`   Subject: ${options.subject}`);
        console.log(`   Body length: ${options.html.length} chars`);
        return { success: true, messageId: 'dev-' + Date.now() };
      }
      
      return { 
        success: false, 
        error: 'Email service not configured' 
      };
    }

    const mailOptions: SendMailOptions = {
      from: this.config.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`📧 Email sent successfully: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ===========================================
  // Template-Based Email Methods
  // ===========================================

  /**
   * Send team invitation email
   */
  async sendTeamInvitation(
    to: string,
    data: InvitationTemplateData
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: `You're invited to join ${data.teamName} on EnvMate`,
      html: teamInvitationTemplate(data),
      text: teamInvitationPlainText(data),
    });
  }

  /**
   * Send notification that invitation was accepted (to inviter)
   */
  async sendInvitationAccepted(
    to: string,
    data: InvitationAcceptedTemplateData
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: `${data.newMemberName} joined ${data.teamName}`,
      html: invitationAcceptedTemplate(data),
    });
  }

  /**
   * Send welcome email to new team member
   */
  async sendWelcomeToTeam(
    to: string,
    data: WelcomeToTeamTemplateData
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: `Welcome to ${data.teamName}!`,
      html: welcomeToTeamTemplate(data),
    });
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(
    to: string,
    data: EmailVerificationTemplateData
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: 'Verify your email address - EnvMate',
      html: emailVerificationTemplate(data),
      text: emailVerificationPlainText(data),
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(
    to: string,
    data: PasswordResetTemplateData
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: 'Reset your password - EnvMate',
      html: passwordResetTemplate(data),
      text: passwordResetPlainText(data),
    });
  }

  /**
   * Send role changed notification
   */
  async sendRoleChanged(
    to: string,
    data: RoleChangedTemplateData
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: `Your role in ${data.teamName} has been updated`,
      html: roleChangedTemplate(data),
    });
  }
}

// ===========================================
// Singleton Instance
// ===========================================

export const emailService = new EmailService();

// ===========================================
// Helper Functions
// ===========================================

/**
 * Generate frontend URLs for emails
 */
export const generateEmailUrls = {
  /**
   * Generate invitation accept URL
   */
  invitationAccept: (token: string): string => {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/invitations/accept?token=${token}`;
  },

  /**
   * Generate invitation reject URL
   */
  invitationReject: (token: string): string => {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/invitations/reject?token=${token}`;
  },

  /**
   * Generate team URL
   */
  team: (teamId: string): string => {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/teams/${teamId}`;
  },

  /**
   * Generate email verification URL
   */
  emailVerification: (token: string): string => {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/auth/verify-email?token=${token}`;
  },

  /**
   * Generate password reset URL
   */
  passwordReset: (token: string): string => {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/auth/reset-password?token=${token}`;
  },
};

/**
 * Format expiry time for display
 */
export const formatExpiryTime = (expiresAt: Date): string => {
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  }
};

export default emailService;
