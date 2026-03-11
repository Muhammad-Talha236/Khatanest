// utils/emailService.js — Universal email service (works with any SMTP)
const nodemailer = require('nodemailer');

// ─── Create transporter ───────────────────────────────────────────
const createTransporter = () => {
  // Auto-detect common email providers
  const user = process.env.EMAIL_USER || '';
  const host = process.env.EMAIL_HOST;

  // If host is explicitly set, use it
  if (host) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: parseInt(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
    });
  }

  // Auto-detect based on email domain
  const domain = user.split('@')[1]?.toLowerCase();

  const providerMap = {
    'gmail.com'      : { service: 'gmail' },
    'yahoo.com'      : { service: 'yahoo' },
    'outlook.com'    : { service: 'outlook365' },
    'hotmail.com'    : { service: 'hotmail' },
    'live.com'       : { service: 'hotmail' },
  };

  const provider = providerMap[domain];

  if (provider) {
    return nodemailer.createTransport({
      service: provider.service,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // University or custom domain — use generic SMTP
  return nodemailer.createTransport({
    host: `mail.${domain}`,
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
};

// ─── Send password reset email ────────────────────────────────────
const sendPasswordResetEmail = async ({ toEmail, toName, resetUrl }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || `KhataNest <${process.env.EMAIL_USER}>`,
    to  : toEmail,
    subject: '🔐 Reset Your KhataNest Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="margin:0;padding:0;background:#0A0C10;font-family:'Segoe UI',Arial,sans-serif;">
        <div style="max-width:520px;margin:40px auto;padding:20px;">

          <!-- Header -->
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;background:linear-gradient(135deg,#2ECC9A,#1A7A5C);border-radius:16px;font-size:28px;font-weight:900;color:#000;">K</div>
            <h1 style="color:#fff;font-size:24px;font-weight:800;margin:12px 0 4px;">KhataNest</h1>
            <p style="color:#6B7280;font-size:13px;margin:0;">Hostel Expense Management</p>
          </div>

          <!-- Card -->
          <div style="background:#141720;border:1px solid #1E2433;border-radius:20px;padding:36px;margin-bottom:20px;">
            <h2 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 8px;">Password Reset Request</h2>
            <p style="color:#9CA3AF;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Hi <strong style="color:#fff;">${toName}</strong>, we received a request to reset your KhataNest password. Click the button below to set a new password.
            </p>

            <!-- Button -->
            <div style="text-align:center;margin:28px 0;">
              <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#2ECC9A,#1A7A5C);color:#000;font-weight:800;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;box-shadow:0 4px 20px rgba(46,204,154,0.35);">
                🔐 Reset My Password
              </a>
            </div>

            <!-- Expiry notice -->
            <div style="background:#1E2433;border:1px solid #2ECC9A33;border-radius:10px;padding:14px 18px;margin:24px 0 0;">
              <p style="color:#9CA3AF;font-size:12px;margin:0;line-height:1.6;">
                ⏰ <strong style="color:#2ECC9A;">This link expires in 15 minutes.</strong><br>
                If you did not request a password reset, you can safely ignore this email.
              </p>
            </div>
          </div>

          <!-- Link fallback -->
          <div style="background:#141720;border:1px solid #1E2433;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <p style="color:#6B7280;font-size:11px;margin:0 0 6px;">If the button doesn't work, copy this link:</p>
            <p style="color:#2ECC9A;font-size:11px;word-break:break-all;margin:0;">${resetUrl}</p>
          </div>

          <!-- Footer -->
          <p style="color:#374151;font-size:11px;text-align:center;margin:0;">
            © ${new Date().getFullYear()} KhataNest · This is an automated email, please do not reply.
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
      KhataNest — Password Reset

      Hi ${toName},

      Reset your password using this link (valid for 15 minutes):
      ${resetUrl}

      If you did not request this, ignore this email.
    `,
  };

  await transporter.sendMail(mailOptions);
};

// ─── Verify connection ────────────────────────────────────────────
const verifyEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email service connected successfully');
    return true;
  } catch (err) {
    console.warn('⚠️  Email service not configured:', err.message);
    return false;
  }
};

module.exports = { sendPasswordResetEmail, verifyEmailConnection };