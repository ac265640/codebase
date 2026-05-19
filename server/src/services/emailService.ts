import nodemailer from 'nodemailer';

// Create a transporter. Using ethereal email for testing if no real creds provided.
// In production, use SendGrid, Mailgun, or AWS SES credentials.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string) {
  const mailOptions = {
    from: '"CodexAI Security" <security@codexai.com>',
    to,
    subject: 'Your CodexAI Verification Code',
    text: `Your verification code is: ${otp}. It will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-w-md mx-auto; p-6 text-center">
        <h2>CodexAI Verification</h2>
        <p>Use the following code to verify your email address:</p>
        <h1 style="background: #f4f4f5; padding: 12px; border-radius: 8px; letter-spacing: 4px;">${otp}</h1>
        <p style="color: #71717a; font-size: 12px;">This code will expire in 10 minutes.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    
    if (process.env.SMTP_HOST === 'smtp.ethereal.email' || !process.env.SMTP_HOST) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
  } catch (err) {
    console.error('Error sending email:', err);
  }
}
