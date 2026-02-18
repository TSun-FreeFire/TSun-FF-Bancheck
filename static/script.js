document.addEventListener('DOMContentLoaded', () => {
    const checkBtn = document.getElementById('checkBtn');
    const uidInput = document.getElementById('uidInput');
    const resultContainer = document.getElementById('resultContainer');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('errorMessage');

    if (checkBtn) {
        checkBtn.addEventListener('click', performCheck);
        uidInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performCheck();
            }
        });
    }

    async function performCheck() {
        const uid = uidInput.value.trim();

        if (!uid) {
            showError('Please enter a valid UID');
            return;
        }

        // Validate UID format (numeric only)
        if (!/^\d+$/.test(uid)) {
            showError('Invalid UID format. Please enter numbers only.');
            return;
        }

        // Reset UI
        hideError();
        resultContainer.classList.remove('show');
        loader.style.display = 'flex';
        checkBtn.disabled = true;

        try {
            const response = await fetch(`/bancheck?uid=${uid}`);
            
            // Handle network errors
            if (!response) {
                throw new Error('Network error: Unable to reach the server');
            }

            const data = await response.json();

            // Check if API returned an error
            if (data.error) {
                throw new Error(data.error);
            }

            // Check HTTP status
            if (!response.ok) {
                if (response.status === 503) {
                    throw new Error(data.error || 'API services are currently unavailable. Please try again later.');
                } else if (response.status === 500) {
                    throw new Error(data.error || 'Internal server error occurred');
                } else if (response.status === 400) {
                    throw new Error(data.error || 'Invalid request');
                } else {
                    throw new Error(data.error || `Server error: ${response.status}`);
                }
            }

            updateUI(data);
        } catch (error) {
            console.error('Error checking UID:', error);
            showError(error.message || 'An unexpected error occurred. Please try again.');
        } finally {
            loader.style.display = 'none';
            checkBtn.disabled = false;
        }
    }

    function updateUI(data) {
        // Update fields with fallback values
        document.getElementById('nickname').textContent = data.nickname || 'N/A';
        document.getElementById('region').textContent = data.region || 'N/A';
        document.getElementById('level').textContent = data.AccountLevel || 'N/A';
        
        // Format last login display
        const lastLoginElem = document.getElementById('lastLogin');
        if (data.Last_Login) {
            lastLoginElem.textContent = data.Last_Login;
        } else if (data.AccountLastLogin) {
            lastLoginElem.textContent = data.AccountLastLogin;
        } else {
            lastLoginElem.textContent = 'N/A';
        }

        // Status Badge
        const statusBadge = document.getElementById('statusBadge');
        const isBanned = data.is_banned;

        if (isBanned === true) {
            statusBadge.textContent = 'BANNED';
            statusBadge.className = 'value status-badge status-banned';
        } else if (isBanned === false) {
            statusBadge.textContent = 'SAFE';
            statusBadge.className = 'value status-badge status-safe';
        } else {
            // Unknown status
            statusBadge.textContent = 'UNKNOWN';
            statusBadge.className = 'value status-badge';
            statusBadge.style.background = 'rgba(245, 158, 11, 0.2)';
            statusBadge.style.color = 'var(--warning)';
            statusBadge.style.border = '1px solid rgba(245, 158, 11, 0.3)';
        }

        // Show results
        resultContainer.style.display = 'block';
        // Small delay to allow display:block to apply before adding class for transition
        setTimeout(() => {
            resultContainer.classList.add('show');
        }, 10);
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.style.display = 'block';

        // Shake animation for input
        uidInput.style.animation = 'shake 0.5s';
        setTimeout(() => {
            uidInput.style.animation = 'none';
        }, 500);
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }
});

// Add shake animation keyframes dynamically
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes shake {
    0% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    50% { transform: translateX(10px); }
    75% { transform: translateX(-10px); }
    100% { transform: translateX(0); }
}
`;
document.head.appendChild(styleSheet);
