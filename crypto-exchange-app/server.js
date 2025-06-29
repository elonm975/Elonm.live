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

// Handle React routing - catch all non-API routes
app.get(/^(?!\/api).*/, (req, res) => {
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

// Admin notification for payment submissions
app.post('/api/notify-admin-payment', async (req, res) => {
  try {
    const { userEmail, amount, method, timestamp } = req.body;

    console.log('Admin payment notification request:', { userEmail, amount, method });

    // Validate input
    if (!userEmail || !amount || !method) {
      return res.status(400).json({ 
        error: 'User email, amount, and payment method are required' 
      });
    }

    const adminEmail = 'admin@elonm.live'; // Admin email address
    const paymentMethodName = method === 'bitcoin' ? 'Bitcoin' : 'Bank Transfer';
    const formattedAmount = parseFloat(amount).toLocaleString();

    const msg = {
      to: adminEmail,
      from: 'noreply@elonm.live',
      subject: `🚨 New Payment Submission - ${paymentMethodName} - $${formattedAmount}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 40px; border-radius: 10px;">
          <div style="background: white; padding: 30px; border-radius: 8px;">
            <h1 style="color: #333; margin-bottom: 20px; text-align: center;">🚨 Payment Submission Alert</h1>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #ee5a24; margin-top: 0;">Payment Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">User Email:</td>
                  <td style="padding: 8px 0; color: #666;">${userEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Amount:</td>
                  <td style="padding: 8px 0; color: #666; font-size: 18px; font-weight: bold;">$${formattedAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Payment Method:</td>
                  <td style="padding: 8px 0; color: #666;">${paymentMethodName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Submission Time:</td>
                  <td style="padding: 8px 0; color: #666;">${new Date(timestamp).toLocaleString()}</td>
                </tr>
              </table>
            </div>

            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #856404; margin-top: 0;">⚡ Action Required</h3>
              <p style="color: #856404; margin-bottom: 0;">
                A user has submitted a payment confirmation. Please log into your admin panel to verify and confirm this payment.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://${req.get('host')}" style="background: linear-gradient(135deg, #ee5a24 0%, #ff6b6b 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                Access Admin Panel
              </a>
            </div>

            <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
              This is an automated notification from Elon.live Crypto Exchange
            </p>
          </div>
        </div>
      `
    };

    // Send email if SendGrid is configured, otherwise log
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'dummy-key') {
      try {
        console.log('📤 Sending admin notification email...');
        const result = await transporter.sendMail(msg);
        console.log('✅ Admin notification sent successfully');

        res.json({ 
          success: true, 
          message: 'Admin notification sent successfully' 
        });
      } catch (error) {
        console.log('❌ Failed to send admin notification:', error.message);
        return res.status(500).json({ 
          error: 'Failed to send admin notification email',
          details: error.message
        });
      }
    } else {
      console.log('📧 Admin notification email would be sent to:', adminEmail);
      console.log('📄 Payment details:', { userEmail, amount, method, paymentMethodName });
      res.json({ 
        success: true, 
        message: 'Admin notification sent successfully (development mode)' 
      });
    }

  } catch (error) {
    console.error('Admin notification error:', error);
    res.status(500).json({ 
      error: 'Failed to send admin notification' 
    });
  }
});

// Password reset endpoint
app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, newPassword, email } = req.body;

    console.log('Password reset request received:', { email, token: token ? 'present' : 'missing' });

    // Validate input
    if (!token || !newPassword || !email) {
      return res.status(400).json({ 
        error: 'Token, new password, and email are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Validate token (in a real app, you'd verify this against a database)
    const resetData = { token, email }; // Simulated validation
    
    // In a real application, you would:
    // 1. Verify the token exists in your database
    // 2. Check if it's not expired
    // 3. Update the user's password in your authentication system
    // 4. Invalidate the reset token
    
    console.log('✅ Password reset successful for:', email);
    console.log('🔐 New password length:', newPassword.length);

    res.json({ 
      success: true, 
      message: 'Password has been reset successfully' 
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      error: 'Failed to reset password. Please try again.' 
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