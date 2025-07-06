
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Email configuration
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your.email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Alternative: SendGrid configuration
// const transporter = nodemailer.createTransporter({
//   service: 'SendGrid',
//   auth: {
//     user: 'apikey',
//     pass: process.env.SENDGRID_API_KEY
//   }
// });

// Send email endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { from, fromName, to, subject, text, html } = req.body;

    // Validate required fields
    if (!from || !to || !subject || !text) {
      return res.status(400).json({ 
        error: 'Missing required fields: from, to, subject, and text are required' 
      });
    }

    // Email options
    const mailOptions = {
      from: fromName ? `"${fromName}" <${from}>` : from,
      to: to,
      subject: subject,
      text: text,
      html: html || text.replace(/\n/g, '<br>')
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully:', info.messageId);
    
    res.json({
      success: true,
      messageId: info.messageId,
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    
    res.status(500).json({
      error: 'Failed to send email',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Email Pro Server',
    timestamp: new Date().toISOString()
  });
});

// Test email configuration endpoint
app.get('/api/test-config', async (req, res) => {
  try {
    await transporter.verify();
    res.json({ 
      status: 'Email configuration is valid',
      service: transporter.options.service || 'Custom SMTP'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Email configuration is invalid',
      details: error.message 
    });
  }
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Email Pro Server running on port ${PORT}`);
  console.log(`🌐 Server bound to 0.0.0.0:${PORT}`);
  console.log(`📧 Email service ready`);
  
  // Test email configuration on startup
  transporter.verify((error, success) => {
    if (error) {
      console.log('⚠️ Email service connection failed:', error.message);
      console.log('💡 To enable emails: Set EMAIL_USER and EMAIL_PASS environment variables');
    } else {
      console.log('✅ Email service ready for sending emails');
    }
  });
});
