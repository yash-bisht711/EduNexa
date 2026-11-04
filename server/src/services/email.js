import nodemailer from 'nodemailer';

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    return transporter;
  }

  // Fallback: Test account for development
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('[EmailService] Created temporary test email inbox:', testAccount.user);
  } catch (err) {
    console.warn('[EmailService] Ethereal fallback unavailable, using mock transport:', err.message);
    transporter = {
      sendMail: async (opts) => {
        console.log(`[Email Mock] Email to ${opts.to} | Subject: ${opts.subject}`);
        return { messageId: `mock-${Date.now()}` };
      },
    };
  }

  return transporter;
}

export async function sendPasswordResetEmail({ to, name, otp, resetToken, clientUrl, role = 'user' }) {
  const mailer = await getTransporter();
  const baseUrl = clientUrl || process.env.CLIENT_URL || 'http://localhost:5173';
  const isAdmin = role === 'admin';
  const resetLink = isAdmin
    ? `${baseUrl}/admin-portal-login?mode=reset&email=${encodeURIComponent(to)}&token=${encodeURIComponent(resetToken)}`
    : `${baseUrl}/login?mode=reset&email=${encodeURIComponent(to)}&token=${encodeURIComponent(resetToken)}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 28px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1px; }
        .content { padding: 32px 28px; }
        .otp-box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
        .otp-code { font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #4338ca; }
        .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 10px; margin-top: 10px; }
        .footer { padding: 20px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="badge">${isAdmin ? 'Superadmin Security Alert' : 'EduNexa Account Security'}</div>
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${name || 'User'}</strong>,</p>
          <p>We received a request to reset your password for your EduNexa ${isAdmin ? 'admin' : ''} account (<strong>${to}</strong>).</p>
          <p>Use the following 6-digit verification code to complete your password reset:</p>
          
          <div class="otp-box">
            <div style="font-size: 12px; color: #64748b; margin-bottom: 6px; font-weight: 600;">YOUR VERIFICATION CODE</div>
            <div class="otp-code">${otp}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Valid for 15 minutes</div>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetLink}" class="btn">Reset Password Directly &rarr;</a>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
            If you did not request this password reset, please disregard this email or contact support if you suspect unauthorized activity.
          </p>
        </div>
        <div class="footer">
          &copy; 2026 EduNexa LMS &bull; Secure Learning Infrastructure
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await mailer.sendMail({
      from: process.env.EMAIL_FROM || '"EduNexa Security" <security@edunexa.dev>',
      to,
      subject: isAdmin ? '🔒 [EduNexa Admin] Password Reset Verification Code' : '🔐 EduNexa Password Reset Verification Code',
      text: `Hello ${name || 'User'}, your EduNexa password reset verification code is: ${otp}. Direct link: ${resetLink} (Valid for 15 minutes).`,
      html,
    });

    let previewUrl = null;
    if (typeof nodemailer.getTestMessageUrl === 'function') {
      previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[Email Preview URL]: ${previewUrl}`);
      }
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (err) {
    console.error('[EmailService] Failed to send email:', err.message);
    // In dev, still return success with error message so user workflow doesn't completely block
    return { success: false, error: err.message };
  }
}
