
// Email storage
let sentEmails = [];
let receivedEmails = [];

// Tab management
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Add active to clicked button
    event.target.closest('.tab-btn').classList.add('active');
}

// Email sending functionality
async function sendEmail() {
    const fromEmail = document.getElementById('fromEmail').value.trim();
    const fromName = document.getElementById('fromName').value.trim();
    const toEmail = document.getElementById('toEmail').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const message = document.getElementById('message').value.trim();

    // Validation
    if (!fromEmail || !toEmail || !subject || !message) {
        showStatus('Please fill in all required fields', 'error');
        return;
    }

    if (!isValidEmail(fromEmail) || !isValidEmail(toEmail)) {
        showStatus('Please enter valid email addresses', 'error');
        return;
    }

    // Show sending status
    showStatus('Sending email...', 'info');
    
    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: fromEmail,
                fromName: fromName,
                to: toEmail,
                subject: subject,
                text: message,
                html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</div>`
            }),
        });

        const result = await response.json();

        if (response.ok) {
            // Store sent email
            const sentEmail = {
                id: Date.now(),
                from: fromEmail,
                fromName: fromName,
                to: toEmail,
                subject: subject,
                message: message,
                timestamp: new Date().toISOString(),
                status: 'sent'
            };
            
            sentEmails.unshift(sentEmail);
            localStorage.setItem('sentEmails', JSON.stringify(sentEmails));
            
            showStatus('Email sent successfully! ✅', 'success');
            clearComposeForm();
            refreshSent();
        } else {
            showStatus(`Failed to send email: ${result.error}`, 'error');
        }
    } catch (error) {
        showStatus('Network error. Please check your connection.', 'error');
        console.error('Send error:', error);
    }
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Clear compose form
function clearComposeForm() {
    document.getElementById('fromEmail').value = '';
    document.getElementById('fromName').value = '';
    document.getElementById('toEmail').value = '';
    document.getElementById('subject').value = '';
    document.getElementById('message').value = '';
}

// Status message display
function showStatus(message, type) {
    const statusDiv = document.getElementById('status-message');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

// Refresh inbox
function refreshInbox() {
    const inboxList = document.getElementById('inbox-list');
    
    if (receivedEmails.length === 0) {
        inboxList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <h3>No emails yet</h3>
                <p>Your received emails will appear here</p>
            </div>
        `;
    } else {
        inboxList.innerHTML = receivedEmails.map(email => `
            <div class="email-item">
                <div class="email-header">
                    <div class="email-from">${email.fromName || email.from}</div>
                    <div class="email-date">${formatDate(email.timestamp)}</div>
                </div>
                <div class="email-subject">${email.subject}</div>
                <div class="email-preview">${email.message.substring(0, 100)}...</div>
            </div>
        `).join('');
    }
}

// Refresh sent emails
function refreshSent() {
    const sentList = document.getElementById('sent-list');
    
    if (sentEmails.length === 0) {
        sentList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📤</div>
                <h3>No sent emails</h3>
                <p>Your sent emails will appear here</p>
            </div>
        `;
    } else {
        sentList.innerHTML = sentEmails.map(email => `
            <div class="email-item">
                <div class="email-header">
                    <div class="email-to">To: ${email.to}</div>
                    <div class="email-date">${formatDate(email.timestamp)}</div>
                </div>
                <div class="email-subject">${email.subject}</div>
                <div class="email-preview">${email.message.substring(0, 100)}...</div>
                <div class="email-status">✅ Sent</div>
            </div>
        `).join('');
    }
}

// Format date
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Email address generator
function generateEmailAddress() {
    const firstName = document.getElementById('genFirstName').value.trim();
    const lastName = document.getElementById('genLastName').value.trim();
    const domain = document.getElementById('genDomain').value;
    const customDomain = document.getElementById('genCustomDomain').value.trim();

    if (!firstName || !lastName) {
        showStatus('Please enter both first name and last name', 'error');
        return;
    }

    if (domain === 'custom' && !customDomain) {
        showStatus('Please enter a custom domain', 'error');
        return;
    }

    const cleanFirstName = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanLastName = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const selectedDomain = domain === 'custom' ? customDomain : domain;

    const emailAddress = `${cleanFirstName}.${cleanLastName}@${selectedDomain}`;
    
    document.getElementById('generatedEmailAddress').value = emailAddress;
    document.getElementById('genResultsSection').style.display = 'block';
    
    // Auto-fill compose form
    document.getElementById('fromEmail').value = emailAddress;
    document.getElementById('fromName').value = `${firstName} ${lastName}`;
}

// Copy generated email
function copyGeneratedEmail() {
    const emailInput = document.getElementById('generatedEmailAddress');
    emailInput.select();
    emailInput.setSelectionRange(0, 99999);

    try {
        navigator.clipboard.writeText(emailInput.value).then(() => {
            showStatus('Email address copied to clipboard! 📋', 'success');
        });
    } catch (error) {
        document.execCommand('copy');
        showStatus('Email address copied to clipboard! 📋', 'success');
    }
}

// Domain selection handler for generator
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('genDomain').addEventListener('change', function() {
        const customDomainSection = document.getElementById('genCustomDomainSection');
        if (this.value === 'custom') {
            customDomainSection.style.display = 'block';
        } else {
            customDomainSection.style.display = 'none';
        }
    });

    // Load stored emails
    const storedSent = localStorage.getItem('sentEmails');
    if (storedSent) {
        sentEmails = JSON.parse(storedSent);
    }

    const storedReceived = localStorage.getItem('receivedEmails');
    if (storedReceived) {
        receivedEmails = JSON.parse(storedReceived);
    }

    // Initial refresh
    refreshInbox();
    refreshSent();

    // Auto-focus first input in compose
    document.getElementById('fromEmail').focus();
});

// Enter key support
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.ctrlKey) {
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'compose-tab') {
            sendEmail();
        }
    }
});
