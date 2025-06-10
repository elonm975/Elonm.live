const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'build')));

// SendGrid configuration
const transporter = nodemailer.createTransport({
  service: 'SendGrid',
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY || 'dummy-key'
  }
});

// Verify transporter configuration
const verifyEmailService = async () => {
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'dummy-key') {
    try {
      await transporter.verify();
      console.log('✅ Email service connected successfully');
      console.log('📧 Emails will be sent from: noreply@elonm.live');
      return true;
    } catch (error) {
      console.log('❌ Email service connection failed:', error.message);
      return false;
    }
  } else {
    console.log('⚠️ No SendGrid API key found - running in development mode');
    return false;
  }
};

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Catch-all handler: send back React's index.html file
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'build', 'index.html');
  try {
    if (require('fs').existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.log('❌ Build files not found at:', indexPath);
      res.status(404).send('Build files not found. Please ensure npm run build was executed successfully.');
    }
  } catch (error) {
    console.error('Error serving static files:', error);
    res.status(500).send('Internal server error');
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Server bound to 0.0.0.0:${PORT}`);
  await verifyEmailService(); // Verify email service on startup
});

// Email validation function
const isValidEmail = (email) => {
  // More flexible email regex that accepts numbers and characters
  // Allows 1-1000 characters before @, numbers and letters, then @ then domain with dot
  const emailRegex = /^[a-zA-Z0-9._-]{1,1000}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return typeof email === 'string' && email.length > 0 && emailRegex.test(email.trim());
};

// Password reset email route
app.post('/api/send-reset-email', async (req, res) => {
  try {
    const { email, resetToken } = req.body;

    console.log('Reset email request received:', { email, resetToken: resetToken ? 'present' : 'missing' });

    // Check if email is provided
    if (!email) {
      console.log('Email is missing from request');
      return res.status(400).json({ 
        error: 'Email address is required' 
      });
    }

    // Trim email and validate format
    const trimmedEmail = email.trim();
    console.log('Validating email:', trimmedEmail);

    if (!isValidEmail(trimmedEmail)) {
      console.log('Email validation failed for:', trimmedEmail);
      console.log('Email format check result:', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail));
      return res.status(400).json({ 
        error: 'Please enter a valid email address' 
      });
    }

    console.log('Email validation passed for:', trimmedEmail);

    if (!resetToken) {
      console.log('Reset token is missing');
      return res.status(400).json({ 
        error: 'Reset token is required' 
      });
    }

    // Get the host from the request, but make sure it's the correct format for Replit
    const host = req.get('host');
    const resetUrl = `https://${host}/reset-password?token=${resetToken}`;

    const msg = {
      to: email,
      from: 'noreply@elonm.live',
      subject: 'Reset Your Password - Eloncrypto Exchange',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 10px;">
          <div style="background: white; padding: 30px; border-radius: 8px; text-align: center;">
            <h1 style="color: #333; margin-bottom: 20px;">🔐 Password Reset Request</h1>
            <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              We received a request to reset your password for your Eloncrypto Exchange account.
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Please click the link below to reset your password:
            </p>
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; margin: 20px 0;">
              Reset Your Password
            </a>
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              This link will expire in 1 hour for security reasons.
            </p>
            <p style="color: #999; font-size: 14px;">
              If you didn't request this reset, please ignore this email.
            </p>
          </div>
        </div>
      `
    };

    // Send email if SendGrid is configured, otherwise log
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'dummy-key') {
      try {
        console.log('📤 Attempting to send email with SendGrid...');
        console.log('📧 Email details:', {
          to: email,
          from: 'noreply@elonm.live',
          subject: msg.subject
        });

        const result = await transporter.sendMail(msg);
        console.log('✅ Password reset email sent successfully to:', email);
        console.log('📬 SendGrid response:', result.messageId || 'Email queued');

        res.json({ 
          success: true, 
          message: 'Password reset email sent successfully' 
        });
      } catch (error) {
        console.log('❌ Failed to send email:', error.message);
        console.log('🔍 Full error details:', JSON.stringify(error, null, 2));

        // Check for specific SendGrid errors
        if (error.message.includes('string did not match the expected pattern')) {
          console.log('⚠️ Pattern validation error - this is likely a SendGrid domain/email verification issue');
          console.log('💡 Make sure your domain "elonm.live" is verified in SendGrid');
        }

        return res.status(500).json({ 
          error: 'Failed to send password reset email. Please try again.',
          details: error.message
        });
      }
    } else {
      console.log('📧 Email would be sent to:', email);
      console.log('📄 Email content preview:', msg.subject);
      res.json({ 
        success: true, 
        message: 'Password reset email sent successfully (development mode)' 
      });
    }

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      error: 'Failed to process password reset request' 
    });
  }
});

// Password reset email template
const createResetEmailHTML = (username, resetLink) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Eloncrypto Password</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #4CAF50, #2196F3); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .button { display: inline-block; background: linear-gradient(135deg, #4CAF50, #2196F3); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚀 Eloncrypto</h1>
          <p>Password Reset Request</p>
        </div>
        <div class="content">
          <h2>Hi ${username},</h2>
          <p>Please click the link below to reset your password:</p>

          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset your password</a>
          </div>

          <p>This link will expire in 1 hour for security purposes.</p>

          <div class="warning">
            <strong>In case you were not trying to access your Eloncrypto account & are seeing this email, please follow the instructions below:</strong>
            <ul>
              <li>Reset your Eloncrypto account immediately</li>
              <li>Check if any changes were made to your account & user settings. If yes, revert them immediately</li>
              <li>If you are unable to access your Eloncrypto account, then contact Eloncrypto Support</li>
            </ul>
          </div>
        </div>
        <div class="footer">
          <p>© 2024 Eloncrypto. All rights reserved.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};