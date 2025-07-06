
# Email Pro - Complete Email Management System

A modern, professional email application with real sending and receiving capabilities, featuring beautiful styling inspired by contemporary crypto trading platforms.

## Features

### ✍️ Email Composition
- **Professional Interface**: Modern, intuitive email composition
- **Real Email Sending**: Send actual emails using SMTP/SendGrid
- **Rich Text Support**: HTML email formatting
- **Validation**: Email address and content validation

### 📧 Email Management
- **Inbox Simulation**: View received emails
- **Sent Messages**: Track sent email history
- **Email Storage**: Local storage for email history
- **Status Tracking**: Real-time sending status

### ⚡ Email Generator
- **Professional Formats**: Generate emails in various formats
- **Custom Domains**: Support for custom company domains
- **Auto-Fill**: Generated emails auto-fill compose form
- **Copy to Clipboard**: Easy copying functionality

### 🎨 Modern UI
- **Animated Background**: Beautiful gradient animations
- **Tab Navigation**: Organized interface with multiple tabs
- **Responsive Design**: Works on all devices
- **Real-time Status**: Live feedback for all actions

## Setup Instructions

### 1. Install Dependencies

```bash
npm install express nodemailer cors
```

### 2. Configure Email Service

#### Option A: Gmail (Recommended for testing)
1. Create a Gmail account or use existing
2. Enable 2-factor authentication
3. Generate an App Password:
   - Google Account → Security → 2-Step Verification → App passwords
4. Set environment variables:

```bash
export EMAIL_USER="your.email@gmail.com"
export EMAIL_PASS="your-app-password"
```

#### Option B: SendGrid (Recommended for production)
1. Sign up for SendGrid account
2. Get your API key
3. Set environment variable:

```bash
export SENDGRID_API_KEY="your-sendgrid-api-key"
```

### 3. Start the Server

```bash
cd email-composer
node server.js
```

Or use the workflow: "Email Composer Server"

## Usage

### Composing Emails
1. Go to **Compose** tab
2. Fill in sender details (From email and name)
3. Enter recipient email
4. Add subject and message
5. Click **Send Email**

### Email Generator
1. Go to **Generator** tab
2. Enter first name and last name
3. Select domain or enter custom domain
4. Click **Generate Email**
5. Generated email auto-fills the compose form

### Viewing Emails
- **Inbox**: View received emails (simulated)
- **Sent**: View your sent email history

## File Structure

```
email-composer/
├── index.html      # Main HTML application
├── styles.css      # Complete CSS styling
├── script.js       # Frontend JavaScript
├── server.js       # Node.js email server
└── README.md       # Documentation
```

## API Endpoints

- `POST /api/send-email` - Send email
- `GET /api/health` - Health check
- `GET /api/test-config` - Test email configuration

## Email Formats Supported

- `firstname.lastname@domain.com`
- `firstnamelastname@domain.com`
- `firstname.l@domain.com`
- `f.lastname@domain.com`

## Security Features

- Input validation and sanitization
- CORS protection
- Environment variable protection
- Error handling and logging

## Browser Support

- Modern browsers with ES6+ support
- JavaScript required for functionality
- HTTPS recommended for production

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EMAIL_USER` | SMTP username (Gmail) | For Gmail |
| `EMAIL_PASS` | SMTP password/app password | For Gmail |
| `SENDGRID_API_KEY` | SendGrid API key | For SendGrid |

## Production Deployment

1. Set up proper email service credentials
2. Use HTTPS for security
3. Configure environment variables
4. Monitor email delivery rates
5. Implement rate limiting for production use

## Troubleshooting

### Email not sending?
1. Check environment variables
2. Verify email service credentials
3. Check `/api/test-config` endpoint
4. Review server logs

### UI not loading?
1. Ensure server is running on port 5000
2. Check for JavaScript errors in browser console
3. Verify all files are present

## Features in Development

- Email templates
- Attachment support
- Email scheduling
- Contact management
- Email analytics
