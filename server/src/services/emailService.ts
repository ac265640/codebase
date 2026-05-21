import nodemailer from 'nodemailer';
import https from 'https';

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

/**
 * Sends an email via Resend's secure HTTPS API.
 * This bypasses outbound SMTP port blocking on environments like Render.
 */
async function sendViaResend(toEmail: string, subject: string, text: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const formattedFrom = fromEmail.includes('<') ? fromEmail : `"CodeBase" <${fromEmail}>`;

  console.log(`[EmailService] Attempting to send email via Resend HTTPS API to ${toEmail}`);

  const postData = JSON.stringify({
    from: formattedFrom,
    to: [toEmail],
    subject: subject,
    text: text,
    html: html,
  });

  return new Promise<boolean>((resolve, reject) => {
    const req = https.request({
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 10000, // 10 seconds
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(body);
            console.log(`[EmailService] Email successfully sent via Resend API. ID: ${data.id}`);
            resolve(true);
          } catch {
            console.log(`[EmailService] Email successfully sent via Resend API (parsed raw response).`);
            resolve(true);
          }
        } else {
          console.error(`[EmailService] Resend API error: Status ${res.statusCode} - ${body}`);
          reject(new Error(`Resend API failed with status ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (e) => {
      console.error(`[EmailService] Resend HTTPS request failed:`, e);
      reject(e);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Resend HTTPS request timed out'));
    });

    req.write(postData);
    req.end();
  });
}

export async function sendOtpEmail(toEmail: string, otp: string): Promise<void> {
  const subject = 'Your CodeBase verification code';
  const text = `Your verification code is: ${otp}\n\nThis code expires in 15 minutes.\n\nIf you did not request this, ignore this email.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
      <h2 style="color: #1e1e2e;">Verify your email</h2>
      <p>Enter this code in CodeBase to verify your email address:</p>
      <div style="background: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e1e2e;">${otp}</span>
      </div>
      <p style="color: #666; font-size: 14px;">This code expires in <strong>15 minutes</strong>.</p>
      <p style="color: #666; font-size: 14px;">If you didn't create a CodeBase account, you can safely ignore this email.</p>
    </div>
  `;

  if (process.env.RESEND_API_KEY) {
    try {
      const sent = await sendViaResend(toEmail, subject, text, html);
      if (sent) return;
    } catch (e) {
      console.error('[EmailService] Resend delivery failed, falling back to SMTP...', e);
    }
  }

  // Fallback to SMTP
  const transport = getTransporter();
  await transport.sendMail({
    from: `"CodeBase" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject,
    text,
    html,
  });
}

export async function sendPasswordResetEmail(toEmail: string, resetUrl: string): Promise<void> {
  const subject = 'Reset your CodeBase password';
  const text = `Click this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you did not request a password reset, ignore this email.`;
  const html = `
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
  `;

  if (process.env.RESEND_API_KEY) {
    try {
      const sent = await sendViaResend(toEmail, subject, text, html);
      if (sent) return;
    } catch (e) {
      console.error('[EmailService] Resend delivery failed, falling back to SMTP...', e);
    }
  }

  // Fallback to SMTP
  const transport = getTransporter();
  await transport.sendMail({
    from: `"CodeBase" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject,
    text,
    html,
  });
}

