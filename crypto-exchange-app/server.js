const nodemailer = require('nodemailer');

async function sendEmail() {
  // Create a transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: 'smtp.example.com', // Replace with your SMTP host
    port: 587, // Replace with your SMTP port
    secure: false, // upgrade later with STARTTLS
    auth: {
      user: 'your_username', // Replace with your SMTP username
      pass: 'your_password' // Replace with your SMTP password
    }
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: 'noreply@elonm.live', // Using domain-verified sender email
    to: 'recipient@example.com', // Replace with the recipient email
    subject: 'Hello from SendGrid!', // Replace with your subject
    text: 'This is a test email sent from SendGrid using Nodemailer.', // Replace with your email body
    html: '<b>This is a test email sent from SendGrid using Nodemailer.</b>' // Replace with your html body
  });

  console.log('Message sent: %s', info.messageId);
}

sendEmail().catch(console.error);