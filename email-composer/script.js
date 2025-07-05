
// Domain selection handler
document.getElementById('domain').addEventListener('change', function() {
    const customDomainSection = document.getElementById('customDomainSection');
    if (this.value === 'custom') {
        customDomainSection.style.display = 'block';
    } else {
        customDomainSection.style.display = 'none';
    }
});

// Generate email function
function generateEmail() {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const domain = document.getElementById('domain').value;
    const customDomain = document.getElementById('customDomain').value.trim();
    const format = document.querySelector('input[name="format"]:checked').value;

    // Validation
    if (!firstName || !lastName) {
        alert('Please enter both first name and last name');
        return;
    }

    if (domain === 'custom' && !customDomain) {
        alert('Please enter a custom domain');
        return;
    }

    // Clean inputs
    const cleanFirstName = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanLastName = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const selectedDomain = domain === 'custom' ? customDomain : domain;

    // Generate primary email
    let emailAddress = '';
    switch (format) {
        case 'firstname.lastname':
            emailAddress = `${cleanFirstName}.${cleanLastName}@${selectedDomain}`;
            break;
        case 'firstnamelastname':
            emailAddress = `${cleanFirstName}${cleanLastName}@${selectedDomain}`;
            break;
        case 'first.initial':
            emailAddress = `${cleanFirstName}.${cleanLastName.charAt(0)}@${selectedDomain}`;
            break;
        case 'initial.lastname':
            emailAddress = `${cleanFirstName.charAt(0)}.${cleanLastName}@${selectedDomain}`;
            break;
    }

    // Display result
    document.getElementById('generatedEmail').value = emailAddress;
    document.getElementById('resultsSection').style.display = 'block';

    // Generate alternatives
    generateAlternatives(cleanFirstName, cleanLastName, selectedDomain);

    // Scroll to results
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

// Generate alternative email suggestions
function generateAlternatives(firstName, lastName, domain) {
    const alternatives = [
        `${firstName}_${lastName}@${domain}`,
        `${firstName}${lastName}123@${domain}`,
        `${firstName}.${lastName}2024@${domain}`,
        `${firstName}${lastName.charAt(0)}@${domain}`,
        `${firstName.charAt(0)}${lastName}@${domain}`,
        `${firstName}-${lastName}@${domain}`,
        `${firstName}${lastName}01@${domain}`,
        `${firstName}.${lastName}.pro@${domain}`
    ];

    const suggestionsList = document.getElementById('suggestionsList');
    suggestionsList.innerHTML = '';

    alternatives.forEach(email => {
        const suggestionDiv = document.createElement('div');
        suggestionDiv.className = 'suggestion-item';
        suggestionDiv.textContent = email;
        suggestionDiv.onclick = () => {
            document.getElementById('generatedEmail').value = email;
            copyEmail();
        };
        suggestionsList.appendChild(suggestionDiv);
    });
}

// Copy email to clipboard
function copyEmail() {
    const emailInput = document.getElementById('generatedEmail');
    emailInput.select();
    emailInput.setSelectionRange(0, 99999); // For mobile devices

    try {
        navigator.clipboard.writeText(emailInput.value).then(() => {
            showCopyFeedback();
        }).catch(() => {
            // Fallback for older browsers
            document.execCommand('copy');
            showCopyFeedback();
        });
    } catch (err) {
        console.error('Copy failed:', err);
    }
}

// Show copy feedback
function showCopyFeedback() {
    const copyBtn = document.querySelector('.copy-btn');
    const originalText = copyBtn.innerHTML;
    
    copyBtn.innerHTML = '<span class="copy-icon">✅</span>Copied!';
    copyBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    
    setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    }, 2000);
}

// Enter key support
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement.id === 'firstName' || activeElement.id === 'lastName' || activeElement.id === 'customDomain') {
            generateEmail();
        }
    }
});

// Auto-focus first input
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('firstName').focus();
});
