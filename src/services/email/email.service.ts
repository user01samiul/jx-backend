import nodemailer from 'nodemailer';
import { Config } from '../../configs/config';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Initialize email transporter
    // Using environment variables for configuration
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };

    this.transporter = nodemailer.createTransport(emailConfig);

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('[EMAIL] SMTP connection error:', error);
      } else {
        console.log('[EMAIL] SMTP server is ready to send emails');
      }
    });
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || `"JackpotX" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('[EMAIL] Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('[EMAIL] Error sending email:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string, username: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'https://jackpotx.net'}/reset-password?token=${resetToken}`;

    const html = this.getPasswordResetEmailTemplate(username, resetUrl);

    return await this.sendEmail({
      to: email,
      subject: 'Reset Your Password - JackpotX',
      html,
    });
  }

  /**
   * Send password changed confirmation email
   */
  async sendPasswordChangedEmail(email: string, username: string): Promise<boolean> {
    const html = this.getPasswordChangedEmailTemplate(username);

    return await this.sendEmail({
      to: email,
      subject: 'Your Password Has Been Changed - JackpotX',
      html,
    });
  }

  /**
   * Strip HTML tags from text (simple implementation)
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
  }

  /**
   * Password reset email template
   */
  private getPasswordResetEmailTemplate(username: string, resetUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f4f4f4;
            border-radius: 10px;
            padding: 30px;
        }
        .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background-color: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #45a049;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 12px;
            color: #777;
        }
        .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 10px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>JackpotX</h1>
        </div>
        <div class="content">
            <h2>Reset Your Password</h2>
            <p>Hello ${username},</p>
            <p>We received a request to reset your password for your JackpotX account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f4f4f4; padding: 10px; border-radius: 5px;">
                ${resetUrl}
            </p>
            <div class="warning">
                <strong>Important:</strong>
                <ul>
                    <li>This link will expire in 1 hour</li>
                    <li>If you didn't request this password reset, please ignore this email</li>
                    <li>Your password will not be changed unless you click the link above and create a new password</li>
                </ul>
            </div>
            <p>For security reasons, we recommend:</p>
            <ul>
                <li>Using a strong, unique password</li>
                <li>Not sharing your password with anyone</li>
                <li>Enabling two-factor authentication (2FA)</li>
            </ul>
        </div>
        <div class="footer">
            <p>If you have any questions or concerns, please contact our support team.</p>
            <p>&copy; ${new Date().getFullYear()} JackpotX. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Password changed confirmation email template
   */
  private getPasswordChangedEmailTemplate(username: string): string {
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'long',
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f4f4f4;
            border-radius: 10px;
            padding: 30px;
        }
        .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background-color: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 12px;
            color: #777;
        }
        .alert {
            background-color: #f8d7da;
            border-left: 4px solid #f44336;
            padding: 10px;
            margin: 20px 0;
        }
        .success {
            background-color: #d4edda;
            border-left: 4px solid #4CAF50;
            padding: 10px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>JackpotX</h1>
        </div>
        <div class="content">
            <h2>Your Password Has Been Changed</h2>
            <p>Hello ${username},</p>
            <div class="success">
                <p><strong>Success!</strong> Your password was successfully changed.</p>
            </div>
            <p><strong>Changed at:</strong> ${timestamp}</p>
            <p>If you made this change, no further action is required.</p>
            <div class="alert">
                <p><strong>Security Alert:</strong></p>
                <p>If you did NOT make this change, your account may have been compromised. Please:</p>
                <ul>
                    <li>Contact our support team immediately</li>
                    <li>Review your account activity</li>
                    <li>Enable two-factor authentication (2FA) if not already enabled</li>
                </ul>
            </div>
            <p>For your security:</p>
            <ul>
                <li>Never share your password with anyone</li>
                <li>Use a unique password for your JackpotX account</li>
                <li>Enable two-factor authentication for added security</li>
                <li>Be cautious of phishing emails asking for your password</li>
            </ul>
        </div>
        <div class="footer">
            <p>If you have any questions or concerns, please contact our support team.</p>
            <p>&copy; ${new Date().getFullYear()} JackpotX. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
  }
}

// Export singleton instance
export const emailService = new EmailService();
