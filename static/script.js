document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const themeToggleLabel = document.querySelector('.theme-toggle-label');
    const checkBtn = document.getElementById('checkBtn');
    const uidInput = document.getElementById('uidInput');
    const resultContainer = document.getElementById('resultContainer');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('errorMessage');
    const tryUidInput = document.getElementById('tryUid');
    const tryBtn = document.getElementById('tryBtn');
    const tryResult = document.getElementById('tryResult');
    const themeStorageKey = 'tsun-theme';

    function applyTheme(themeName) {
        const normalizedTheme = themeName === 'cocoa-night' ? 'cocoa-night' : 'sunlit';

        if (normalizedTheme === 'cocoa-night') {
            document.body.setAttribute('data-theme', normalizedTheme);
        } else {
            document.body.removeAttribute('data-theme');
        }

        if (themeToggle) {
            themeToggle.setAttribute('aria-pressed', String(normalizedTheme === 'cocoa-night'));
        }

        if (themeToggleLabel) {
            themeToggleLabel.textContent = normalizedTheme === 'cocoa-night' ? 'Warm Canvas' : 'Cocoa Night';
        }

        try {
            localStorage.setItem(themeStorageKey, normalizedTheme);
        } catch (error) {
            console.warn('Theme preference could not be saved:', error);
        }
    }

    let savedTheme = 'sunlit';
    try {
        savedTheme = localStorage.getItem(themeStorageKey) || 'sunlit';
    } catch (error) {
        console.warn('Theme preference could not be read:', error);
    }

    applyTheme(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const nextTheme = document.body.getAttribute('data-theme') === 'cocoa-night' ? 'sunlit' : 'cocoa-night';
            applyTheme(nextTheme);
        });
    }

    const sectionIds = ['top', 'check', 'docs', 'examples'];
    const sections = sectionIds
        .map((sectionId) => document.getElementById(sectionId))
        .filter(Boolean);
    const navLinks = Array.from(document.querySelectorAll('.nav-link[href^="#"], .side-link[href^="#"]'));

    if (window.gsap) {
        if (window.ScrollTrigger) {
            window.gsap.registerPlugin(window.ScrollTrigger);
        }

        const intro = window.gsap.timeline({ defaults: { ease: 'power3.out' } });

        intro
            .from('.window-bar', { y: -20, opacity: 0, duration: 0.55 })
            .from('.toolbar', { y: -18, opacity: 0, duration: 0.55 }, '-=0.25')
            .from('.sidebar > *', { x: -20, opacity: 0, stagger: 0.08, duration: 0.5 }, '-=0.3')
            .from('.hero-copy > *', { y: 22, opacity: 0, stagger: 0.08, duration: 0.5 }, '-=0.2')
            .from('.hero-preview', { x: 22, opacity: 0, duration: 0.55 }, '<')
            .from('.check-panel', { y: 24, opacity: 0, duration: 0.6 }, '-=0.2')
            .from('.metric-card', { y: 18, opacity: 0, stagger: 0.08, duration: 0.45 }, '-=0.2');

        if (window.ScrollTrigger) {
            window.gsap.utils.toArray('.panel, .doc-card, .metric-card').forEach((element) => {
                window.gsap.fromTo(
                    element,
                    { y: 22, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.7,
                        ease: 'power2.out',
                        scrollTrigger: {
                            trigger: element,
                            start: 'top 85%'
                        }
                    }
                );
            });
        }

        window.gsap.to('.page-backdrop-one', {
            x: 26,
            y: -14,
            duration: 8,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
        });

        window.gsap.to('.page-backdrop-two', {
            x: -18,
            y: 18,
            duration: 10,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
        });
    }

    if (location.pathname === '/docs') {
        const docsSection = document.getElementById('docs');
        if (docsSection) {
            requestAnimationFrame(() => {
                docsSection.scrollIntoView({ behavior: 'auto', block: 'start' });
            });
        }
    }

    navLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            const targetId = link.getAttribute('href');
            if (!targetId || !targetId.startsWith('#')) {
                return;
            }

            const targetElement = document.querySelector(targetId);
            if (!targetElement) {
                return;
            }

            event.preventDefault();
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    const setActiveLink = (sectionId) => {
        navLinks.forEach((link) => {
            const matches = link.getAttribute('href') === `#${sectionId}`;
            link.classList.toggle('active', matches);
            link.classList.toggle('is-active', matches);
        });
    };

    if (sections.length > 0) {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveLink(entry.target.id);
                    }
                });
            }, {
                threshold: 0.38,
                rootMargin: '-15% 0px -55% 0px'
            });

            sections.forEach((section) => observer.observe(section));
        } else {
            const updateActiveSection = () => {
                let activeSection = 'top';

                sections.forEach((section) => {
                    const bounds = section.getBoundingClientRect();
                    if (bounds.top <= 180) {
                        activeSection = section.id;
                    }
                });

                setActiveLink(activeSection);
            };

            window.addEventListener('scroll', updateActiveSection, { passive: true });
            updateActiveSection();
        }
    }

    if (checkBtn && uidInput) {
        checkBtn.addEventListener('click', performCheck);
        uidInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
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

        if (!/^\d+$/.test(uid)) {
            showError('Invalid UID format. Please enter numbers only.');
            return;
        }

        hideError();
        resultContainer.classList.remove('show');
        loader.style.display = 'flex';
        checkBtn.disabled = true;

        try {
            const response = await fetch(`/bancheck?uid=${encodeURIComponent(uid)}`);

            if (!response) {
                throw new Error('Network error: Unable to reach the server');
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (!response.ok) {
                if (response.status === 503) {
                    throw new Error(data.error || 'API services are currently unavailable. Please try again later.');
                }

                if (response.status === 500) {
                    throw new Error(data.error || 'Internal server error occurred');
                }

                if (response.status === 400) {
                    throw new Error(data.error || 'Invalid request');
                }

                throw new Error(data.error || `Server error: ${response.status}`);
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
        document.getElementById('nickname').textContent = data.nickname || 'N/A';
        document.getElementById('region').textContent = data.region || 'N/A';
        document.getElementById('level').textContent = data.AccountLevel || 'N/A';

        const lastLoginElem = document.getElementById('lastLogin');
        if (data.Last_Login) {
            lastLoginElem.textContent = data.Last_Login;
        } else if (data.AccountLastLogin) {
            lastLoginElem.textContent = data.AccountLastLogin;
        } else {
            lastLoginElem.textContent = 'N/A';
        }

        const statusBadge = document.getElementById('statusBadge');
        statusBadge.className = 'value status-badge';

        if (data.is_banned === true) {
            statusBadge.textContent = 'BANNED';
            statusBadge.classList.add('status-banned');
        } else if (data.is_banned === false) {
            statusBadge.textContent = 'SAFE';
            statusBadge.classList.add('status-safe');
        } else {
            statusBadge.textContent = 'UNKNOWN';
        }

        resultContainer.style.display = 'block';

        if (window.gsap) {
            window.gsap.fromTo(
                resultContainer,
                { y: 16, opacity: 0.45, scale: 0.985 },
                { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'power2.out' }
            );
        }

        setTimeout(() => {
            resultContainer.classList.add('show');
        }, 10);
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';

        if (window.gsap) {
            window.gsap.fromTo(errorMessage, { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: 'power2.out' });
            window.gsap.fromTo(uidInput, { x: -6 }, { x: 6, duration: 0.06, repeat: 5, yoyo: true, clearProps: 'x' });
        }
    }

    function hideError() {
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
    }

    if (tryUidInput && tryBtn && tryResult) {
        tryUidInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                tryAPI();
            }
        });
    }
});

function copyCode(button) {
    const codeBlock = button.closest('.code-block');
    const code = codeBlock ? codeBlock.querySelector('code').textContent : '';

    navigator.clipboard.writeText(code).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.style.background = '#dfe9c8';

        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 1800);
    }).catch((error) => {
        console.error('Failed to copy:', error);
        button.textContent = 'Failed';

        setTimeout(() => {
            button.textContent = 'Copy';
        }, 1800);
    });
}

async function tryAPI() {
    const uidField = document.getElementById('tryUid');
    const resultDiv = document.getElementById('tryResult');
    const tryBtn = document.getElementById('tryBtn');

    if (!uidField || !resultDiv || !tryBtn) {
        return;
    }

    const uid = uidField.value.trim();

    if (!uid) {
        resultDiv.textContent = 'Please enter a UID';
        resultDiv.style.color = '#a6473e';
        return;
    }

    tryBtn.disabled = true;
    tryBtn.textContent = 'Loading...';
    resultDiv.textContent = 'Fetching data...';
    resultDiv.style.color = '#6c6558';

    try {
        const response = await fetch(`/bancheck?uid=${encodeURIComponent(uid)}`);
        const data = await response.json();

        resultDiv.textContent = JSON.stringify(data, null, 2);
        resultDiv.style.color = response.ok ? '#2a2620' : '#a6473e';
    } catch (error) {
        resultDiv.textContent = `Error: ${error.message}`;
        resultDiv.style.color = '#a6473e';
    } finally {
        tryBtn.disabled = false;
        tryBtn.textContent = 'Try API';
    }
}