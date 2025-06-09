const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// SendGrid configuration (optional - for production use)
const transporter = nodemailer.createTransport({
  service: 'SendGrid',
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY || 'dummy-key'
  }
});

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Email validation function
const isValidEmail = (email) => {
  // More comprehensive email regex that handles various valid email formats
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
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
    if (!isValidEmail(trimmedEmail)) {
      console.log('Email validation failed for:', trimmedEmail);
      return res.status(400).json({ 
        error: 'Please enter a valid email address' 
      });
    }

    if (!resetToken) {
      console.log('Reset token is missing');
      return res.status(400).json({ 
        error: 'Reset token is required' 
      });
    }

    // Create reset link
    const resetLink = `${req.get('origin') || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // For development, just log the reset info and return success
    console.log('Password reset requested for:', trimmedEmail);
    console.log('Reset link:', resetLink);

    // Simulate successful email send
    res.json({ 
      success: true, 
      message: 'Password reset email sent successfully' 
    });

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
          <p>Please click the following verification link to change your Eloncrypto account password:</p>

          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Your Password</a>
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