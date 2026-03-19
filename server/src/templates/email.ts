/**
 * Email Templates
 * HTML email templates for various notifications
 */

export interface EmailTemplateData {
  [key: string]: string | number | boolean | undefined;
}

// ===========================================
// Base Template Wrapper
// ===========================================

const baseTemplate = (content: string, previewText: string = ''): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>EnvMate</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
    }
    
    /* Main styles */
    .email-container {
      max-width: 600px;
      margin: 0 auto;
    }
    .email-body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #333333;
    }
    .email-header {
      background-color: #4F46E5;
      padding: 24px;
      text-align: center;
    }
    .email-header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .email-content {
      background-color: #ffffff;
      padding: 32px 24px;
    }
    .email-footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 14px;
      color: #64748b;
    }
    .btn {
      display: inline-block;
      padding: 14px 28px;
      background-color: #4F46E5;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 16px 0;
    }
    .btn:hover {
      background-color: #4338CA;
    }
    .btn-secondary {
      background-color: #64748b;
    }
    .btn-danger {
      background-color: #DC2626;
    }
    .highlight-box {
      background-color: #f1f5f9;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      border-left: 4px solid #4F46E5;
    }
    .code {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      background-color: #f1f5f9;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 14px;
    }
    .text-muted {
      color: #64748b;
      font-size: 14px;
    }
    .text-center {
      text-align: center;
    }
    .mt-4 { margin-top: 16px; }
    .mb-4 { margin-bottom: 16px; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9;">
  <!-- Preview text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${previewText}
  </div>
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td style="padding: 20px 0;">
        <div class="email-container">
          ${content}
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ===========================================
// Team Invitation Template
// ===========================================

export interface InvitationTemplateData {
  inviteeName?: string;
  inviterName: string;
  inviterEmail: string;
  teamName: string;
  role: string;
  acceptUrl: string;
  rejectUrl: string;
  expiresIn: string;
}

export const teamInvitationTemplate = (data: InvitationTemplateData): string => {
  const greeting = data.inviteeName ? `Hi ${data.inviteeName},` : 'Hello,';
  
  const content = `
    <div class="email-header">
      <h1>🔐 EnvMate</h1>
    </div>
    <div class="email-content email-body">
      <h2 style="margin-top: 0;">You're Invited!</h2>
      <p>${greeting}</p>
      <p>
        <strong>${data.inviterName}</strong> (${data.inviterEmail}) has invited you to join 
        the team <strong>"${data.teamName}"</strong> on EnvMate.
      </p>
      
      <div class="highlight-box">
        <p style="margin: 0;"><strong>Your Role:</strong> ${data.role}</p>
        <p style="margin: 8px 0 0 0;" class="text-muted">
          ${getRoleDescription(data.role)}
        </p>
      </div>
      
      <div class="text-center">
        <a href="${data.acceptUrl}" class="btn">Accept Invitation</a>
      </div>
      
      <p class="text-muted text-center">
        Or copy and paste this link into your browser:<br>
        <span class="code">${data.acceptUrl}</span>
      </p>
      
      <p class="text-muted">
        Don't want to join? You can <a href="${data.rejectUrl}">decline this invitation</a>.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      
      <p class="text-muted" style="margin-bottom: 0;">
        ⏰ This invitation will expire in <strong>${data.expiresIn}</strong>.
      </p>
    </div>
    <div class="email-footer">
      <p style="margin: 0;">EnvMate - Secure Environment Variable Management</p>
      <p style="margin: 8px 0 0 0;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `;
  
  return baseTemplate(content, `${data.inviterName} invited you to join ${data.teamName} on EnvMate`);
};

// ===========================================
// Invitation Accepted Template
// ===========================================

export interface InvitationAcceptedTemplateData {
  inviterName: string;
  newMemberName: string;
  newMemberEmail: string;
  teamName: string;
  role: string;
  teamUrl: string;
}

export const invitationAcceptedTemplate = (data: InvitationAcceptedTemplateData): string => {
  const content = `
    <div class="email-header">
      <h1>🔐 EnvMate</h1>
    </div>
    <div class="email-content email-body">
      <h2 style="margin-top: 0;">Invitation Accepted! 🎉</h2>
      <p>Hi ${data.inviterName},</p>
      <p>
        Great news! <strong>${data.newMemberName}</strong> (${data.newMemberEmail}) 
        has accepted your invitation to join <strong>"${data.teamName}"</strong>.
      </p>
      
      <div class="highlight-box">
        <p style="margin: 0;"><strong>Member:</strong> ${data.newMemberName}</p>
        <p style="margin: 8px 0 0 0;"><strong>Role:</strong> ${data.role}</p>
      </div>
      
      <div class="text-center">
        <a href="${data.teamUrl}" class="btn">View Team</a>
      </div>
    </div>
    <div class="email-footer">
      <p style="margin: 0;">EnvMate - Secure Environment Variable Management</p>
    </div>
  `;
  
  return baseTemplate(content, `${data.newMemberName} joined ${data.teamName}`);
};

// ===========================================
// Welcome to Team Template
// ===========================================

export interface WelcomeToTeamTemplateData {
  memberName: string;
  teamName: string;
  role: string;
  teamUrl: string;
}

export const welcomeToTeamTemplate = (data: WelcomeToTeamTemplateData): string => {
  const content = `
    <div class="email-header">
      <h1>🔐 EnvMate</h1>
    </div>
    <div class="email-content email-body">
      <h2 style="margin-top: 0;">Welcome to ${data.teamName}! 🎉</h2>
      <p>Hi ${data.memberName},</p>
      <p>
        You've successfully joined the team <strong>"${data.teamName}"</strong> on EnvMate.
      </p>
      
      <div class="highlight-box">
        <p style="margin: 0;"><strong>Your Role:</strong> ${data.role}</p>
        <p style="margin: 8px 0 0 0;" class="text-muted">
          ${getRoleDescription(data.role)}
        </p>
      </div>
      
      <h3>What's Next?</h3>
      <ul>
        <li>View your team's projects and environment variables</li>
        <li>Collaborate with team members securely</li>
        <li>Access encrypted secrets across all your projects</li>
      </ul>
      
      <div class="text-center">
        <a href="${data.teamUrl}" class="btn">Go to Team</a>
      </div>
    </div>
    <div class="email-footer">
      <p style="margin: 0;">EnvMate - Secure Environment Variable Management</p>
    </div>
  `;
  
  return baseTemplate(content, `Welcome to ${data.teamName} on EnvMate`);
};

// ===========================================
// Email Verification Template
// ===========================================

export interface EmailVerificationTemplateData {
  userName: string;
  verificationUrl: string;
  expiresIn: string;
}

export const emailVerificationTemplate = (data: EmailVerificationTemplateData): string => {
  const content = `
    <div class="email-header">
      <h1>🔐 EnvMate</h1>
    </div>
    <div class="email-content email-body">
      <h2 style="margin-top: 0;">Verify Your Email Address</h2>
      <p>Hi ${data.userName},</p>
      <p>
        Thanks for signing up for EnvMate! Please verify your email address 
        to complete your registration.
      </p>
      
      <div class="text-center">
        <a href="${data.verificationUrl}" class="btn">Verify Email Address</a>
      </div>
      
      <p class="text-muted text-center">
        Or copy and paste this link into your browser:<br>
        <span class="code">${data.verificationUrl}</span>
      </p>
      
      <p class="text-muted">
        ⏰ This link will expire in <strong>${data.expiresIn}</strong>.
      </p>
    </div>
    <div class="email-footer">
      <p style="margin: 0;">EnvMate - Secure Environment Variable Management</p>
      <p style="margin: 8px 0 0 0;">
        If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
  `;
  
  return baseTemplate(content, 'Verify your email address for EnvMate');
};

// ===========================================
// Password Reset Template
// ===========================================

export interface PasswordResetTemplateData {
  userName: string;
  resetUrl: string;
  expiresIn: string;
  ipAddress?: string;
}

export const passwordResetTemplate = (data: PasswordResetTemplateData): string => {
  const content = `
    <div class="email-header">
      <h1>🔐 EnvMate</h1>
    </div>
    <div class="email-content email-body">
      <h2 style="margin-top: 0;">Reset Your Password</h2>
      <p>Hi ${data.userName},</p>
      <p>
        We received a request to reset your password. Click the button below 
        to choose a new password.
      </p>
      
      <div class="text-center">
        <a href="${data.resetUrl}" class="btn">Reset Password</a>
      </div>
      
      <p class="text-muted text-center">
        Or copy and paste this link into your browser:<br>
        <span class="code">${data.resetUrl}</span>
      </p>
      
      <p class="text-muted">
        ⏰ This link will expire in <strong>${data.expiresIn}</strong>.
      </p>
      
      ${data.ipAddress ? `
        <div class="highlight-box">
          <p style="margin: 0;" class="text-muted">
            <strong>Security Info:</strong> This request was made from IP address ${data.ipAddress}.
          </p>
        </div>
      ` : ''}
      
      <p class="text-muted">
        If you didn't request a password reset, please ignore this email 
        or contact support if you have concerns.
      </p>
    </div>
    <div class="email-footer">
      <p style="margin: 0;">EnvMate - Secure Environment Variable Management</p>
    </div>
  `;
  
  return baseTemplate(content, 'Reset your EnvMate password');
};

// ===========================================
// Role Changed Template
// ===========================================

export interface RoleChangedTemplateData {
  memberName: string;
  teamName: string;
  oldRole: string;
  newRole: string;
  changedByName: string;
  teamUrl: string;
}

export const roleChangedTemplate = (data: RoleChangedTemplateData): string => {
  const content = `
    <div class="email-header">
      <h1>🔐 EnvMate</h1>
    </div>
    <div class="email-content email-body">
      <h2 style="margin-top: 0;">Your Role Has Been Updated</h2>
      <p>Hi ${data.memberName},</p>
      <p>
        Your role in the team <strong>"${data.teamName}"</strong> has been updated 
        by ${data.changedByName}.
      </p>
      
      <div class="highlight-box">
        <p style="margin: 0;"><strong>Previous Role:</strong> ${data.oldRole}</p>
        <p style="margin: 8px 0;"><strong>New Role:</strong> ${data.newRole}</p>
        <p style="margin: 0;" class="text-muted">
          ${getRoleDescription(data.newRole)}
        </p>
      </div>
      
      <div class="text-center">
        <a href="${data.teamUrl}" class="btn">View Team</a>
      </div>
    </div>
    <div class="email-footer">
      <p style="margin: 0;">EnvMate - Secure Environment Variable Management</p>
    </div>
  `;
  
  return baseTemplate(content, `Your role in ${data.teamName} has been updated`);
};

// ===========================================
// Helper Functions
// ===========================================

function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    admin: 'Full access: manage team settings, members, and all projects',
    Admin: 'Full access: manage team settings, members, and all projects',
    Administrator: 'Full access: manage team settings, members, and all projects',
    editor: 'Can create and edit projects and environment variables',
    Editor: 'Can create and edit projects and environment variables',
    viewer: 'Read-only access to projects and environment variables',
    Viewer: 'Read-only access to projects and environment variables',
  };
  return descriptions[role] || 'Team member';
}

// ===========================================
// Plain Text Versions
// ===========================================

export const teamInvitationPlainText = (data: InvitationTemplateData): string => `
You're Invited to ${data.teamName}!

${data.inviterName} (${data.inviterEmail}) has invited you to join the team "${data.teamName}" on EnvMate.

Your Role: ${data.role}
${getRoleDescription(data.role)}

Accept the invitation: ${data.acceptUrl}

Decline the invitation: ${data.rejectUrl}

This invitation will expire in ${data.expiresIn}.

--
EnvMate - Secure Environment Variable Management
If you didn't expect this invitation, you can safely ignore this email.
`.trim();

export const emailVerificationPlainText = (data: EmailVerificationTemplateData): string => `
Verify Your Email Address

Hi ${data.userName},

Thanks for signing up for EnvMate! Please verify your email address by visiting:

${data.verificationUrl}

This link will expire in ${data.expiresIn}.

--
EnvMate - Secure Environment Variable Management
If you didn't create an account, you can safely ignore this email.
`.trim();

export const passwordResetPlainText = (data: PasswordResetTemplateData): string => `
Reset Your Password

Hi ${data.userName},

We received a request to reset your password. Visit this link to choose a new password:

${data.resetUrl}

This link will expire in ${data.expiresIn}.

If you didn't request a password reset, please ignore this email.

--
EnvMate - Secure Environment Variable Management
`.trim();

export default {
  teamInvitationTemplate,
  teamInvitationPlainText,
  invitationAcceptedTemplate,
  welcomeToTeamTemplate,
  emailVerificationTemplate,
  emailVerificationPlainText,
  passwordResetTemplate,
  passwordResetPlainText,
  roleChangedTemplate,
};
