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

        // Reset UI
        hideError();
        resultContainer.classList.remove('show');
        loader.style.display = 'flex';
        checkBtn.disabled = true;

        try {
            const response = await fetch(`/bancheck?uid=${uid}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch data');
            }

            updateUI(data);
        } catch (error) {
            showError(error.message);
        } finally {
            loader.style.display = 'none';
            checkBtn.disabled = false;
        }
    }

    function updateUI(data) {
        // Update fields
        document.getElementById('nickname').textContent = data.nickname || 'N/A';
        document.getElementById('region').textContent = data.region || 'N/A';
        document.getElementById('level').textContent = data.AccountLevel || 'N/A';
        document.getElementById('lastLogin').textContent = data.Last_Login || 'N/A';

        // Status Badge
        const statusBadge = document.getElementById('statusBadge');
        const isBanned = data.is_banned;

        if (isBanned) {
            statusBadge.textContent = 'BANNED';
            statusBadge.className = 'value status-badge status-banned';
        } else {
            statusBadge.textContent = 'SAFE';
            statusBadge.className = 'value status-badge status-safe';
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
