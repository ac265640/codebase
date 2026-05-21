import nodemailer from 'nodemailer';

// Singleton transporter — created once, reused
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD; // Gmail App Password, NOT account password

  if (!user || !pass) {
    throw new Error('SMTP_USER and SMTP_APP_PASSWORD must be set in environment');
  }

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for 587 (automatically upgrades to STARTTLS)
    auth: { user, pass },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  return transporter;
}

export async function sendOtpEmail(toEmail: string, otp: string): Promise<void> {
  const transport = getTransporter();

  await transport.sendMail({
    from: `"CodeBase" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Your CodeBase verification code',
    text: `Your verification code is: ${otp}\n\nThis code expires in 15 minutes.\n\nIf you did not request this, ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
        <h2 style="color: #1e1e2e;">Verify your email</h2>
        <p>Enter this code in CodeBase to verify your email address:</p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e1e2e;">${otp}</span>
        </div>
        <p style="color: #666; font-size: 14px;">This code expires in <strong>15 minutes</strong>.</p>
        <p style="color: #666; font-size: 14px;">If you didn't create a CodeBase account, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(toEmail: string, resetUrl: string): Promise<void> {
  const transport = getTransporter();

  await transport.sendMail({
    from: `"CodeBase" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Reset your CodeBase password',
    text: `Click this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you did not request a password reset, ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
        <h2 style="color: #1e1e2e;">Reset your password</h2>
        <p>Click the button below to reset your CodeBase password:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}"
             style="background: #6366f1; color: white; padding: 12px 32px; border-radius: 8px;
                    text-decoration: none; font-weight: bold; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">This link expires in <strong>1 hour</strong>.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request a password reset, ignore this email.</p>
        <p style="color: #666; font-size: 12px; word-break: break-all;">
          Or copy this link: ${resetUrl}
        </p>
      </div>
    `,
  });
}
