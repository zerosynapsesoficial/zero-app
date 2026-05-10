document.addEventListener('DOMContentLoaded', () => {
    // --- Router ---
    const routes = {
        '#splash': () => showScreen('splash'),
        '#onboarding': () => showScreen('onboarding'),
        '#login': () => showScreen('login'),
        '#register': () => showScreen('register'),
        '#user-type-selection': () => showScreen('user-type-selection'),
        '#register-client': () => showScreen('register-client'),
        '#register-professional': () => showScreen('register-professional'),
        '#home': () => showSubScreen('home'),
        '#busca': () => showSubScreen('busca'),
        '#chat': () => showSubScreen('chat'),
        '#perfil': () => showSubScreen('perfil'),
        '#profissional': () => showOverlay('professional-detail'),
        '#agendamento': () => showOverlay('agendamento'),
        '#chat-msg': () => showOverlay('chat-detail'),
        '#configuracoes': () => showOverlay('configuracoes'),
        '#admin': () => showOverlay('admin'),
    };

    function handleRoute() {
        const hash = window.location.hash || '#splash';
        
        // Special case for dynamic IDs in hash
        if (hash.startsWith('#profissional/')) {
            const id = hash.split('/')[1];
            renderProfessionalDetail(id);
            showOverlay('professional-detail');
            return;
        }

        if (hash.startsWith('#chat-msg/')) {
            const id = hash.split('/')[1];
            renderChatDetail(id);
            showOverlay('chat-detail');
            return;
        }

        const route = routes[hash];
        if (route) route();
    }

    window.addEventListener('hashchange', handleRoute);

    // --- Screen Logic ---
    function showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    function showSubScreen(id) {
        showScreen('main-content');
        document.querySelectorAll('.sub-screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        
        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.screen === id);
        });
    }

    function showOverlay(id) {
        const overlay = document.getElementById(id);
        overlay.classList.add('active');
    }

    // --- Initial Flow ---
    setTimeout(() => {
        if (!window.location.hash || window.location.hash === '#splash') {
            window.location.hash = '#login';
        } else {
            handleRoute();
        }
    }, 2000);

    // --- Render Functions ---
    function init() {
        renderCategories();
        renderFeatured();
        renderSearchResults();
        renderChatList();
        renderAdminStats();
        
        // Form handling
        document.getElementById('login-form').onsubmit = (e) => {
            e.preventDefault();
            window.location.hash = '#user-type-selection';
        };

        document.getElementById('register-form').onsubmit = (e) => {
            e.preventDefault();
            alert('Conta criada com sucesso!');
            window.location.hash = '#user-type-selection';
        };

        // Form Client handling
        const formClient = document.getElementById('form-client');
        if (formClient) {
            formClient.onsubmit = (e) => {
                e.preventDefault();
                alert('Cadastro de Cliente concluído!');
                window.location.hash = '#home';
            };
        }

        // Form Professional handling
        const formProf = document.getElementById('form-professional');
        if (formProf) {
            formProf.onsubmit = (e) => {
                e.preventDefault();
                alert('Seu perfil profissional foi criado com sucesso!');
                window.location.hash = '#home';
            };
        }

        // Image Previews
        setupImagePreview('client-photo-input', 'client-photo-preview');
        setupImagePreview('prof-photo-input', 'prof-photo-preview');
        setupImagePreview('prof-logo-input', 'prof-logo-preview');

        // Google Login is handled by the official Google Identity Services library in HTML
        // No manual onclick logic required here for the official button.

        document.getElementById('btn-agendar').onclick = () => {
            window.location.hash = '#agendamento';
        };

        renderTimeSlots();
    }

    function renderTimeSlots() {
        const container = document.getElementById('slots-container');
        if (!container) return;
        container.innerHTML = DATA.timeSlots.map(slot => `
            <button class="btn btn-outline" style="padding: 8px; font-size: 0.9rem;" onclick="this.style.background='var(--primary)'; this.style.color='white'">${slot}</button>
        `).join('');
    }

    function renderCategories() {
        const container = document.getElementById('home-categories');
        if (!container) return;
        container.innerHTML = DATA.categories.map(cat => `
            <div class="category-item" onclick="location.hash='#busca'">
                <div class="category-icon">${cat.icon}</div>
                <span>${cat.name}</span>
            </div>
        `).join('');
    }

    function renderFeatured() {
        const container = document.getElementById('featured-professionals');
        if (!container) return;
        const featured = DATA.professionals.filter(p => p.featured);
        container.innerHTML = featured.map(p => `
            <div class="prof-card" onclick="location.hash='#profissional/${p.id}'">
                <div class="avatar-circle" style="background: ${p.avatarColor}">${p.avatar}</div>
                <h4>${p.name}</h4>
                <p>${p.specialty}</p>
                <div class="rating-badge">★ ${p.rating}</div>
            </div>
        `).join('');
    }

    function renderSearchResults(query = '') {
        const container = document.getElementById('search-results');
        if (!container) return;
        const filtered = DATA.professionals.filter(p => 
            p.name.toLowerCase().includes(query.toLowerCase()) || 
            p.category.toLowerCase().includes(query.toLowerCase()) ||
            p.specialty.toLowerCase().includes(query.toLowerCase())
        );

        container.innerHTML = filtered.map(p => `
            <div class="prof-card" style="min-width: 100%; margin-bottom: 1rem;" onclick="location.hash='#profissional/${p.id}'">
                <div style="display: flex; gap: 1rem;">
                    <div class="avatar-circle" style="background: ${p.avatarColor}; margin-bottom: 0;">${p.avatar}</div>
                    <div>
                        <h4>${p.name}</h4>
                        <p>${p.specialty} • ${p.distance}</p>
                        <div class="rating-badge">★ ${p.rating} (${p.reviews})</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function renderProfessionalDetail(id) {
        const prof = DATA.professionals.find(p => p.id == id);
        const container = document.getElementById('prof-detail-content');
        if (!prof || !container) return;

        container.innerHTML = `
            <div style="text-align: center; margin-bottom: 2rem;">
                <div class="avatar-circle" style="width: 80px; height: 80px; font-size: 2rem; margin: 0 auto 1rem; background: ${prof.avatarColor}">${prof.avatar}</div>
                <h2>${prof.name}</h2>
                <p style="color: var(--text-muted)">${prof.specialty}</p>
                <div class="rating-badge" style="font-size: 1rem; padding: 4px 12px; margin-top: 1rem;">★ ${prof.rating}</div>
            </div>
            
            <div class="section" style="margin-bottom: 2rem;">
                <h4 style="margin-bottom: 0.5rem;">Sobre</h4>
                <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.5;">${prof.bio}</p>
            </div>

            <div class="section" style="margin-bottom: 2rem;">
                <h4 style="margin-bottom: 1rem;">Serviços</h4>
                ${prof.services.map(s => `
                    <div style="padding: 1rem; border: 1px solid var(--border); border-radius: 12px; margin-bottom: 0.75rem;">
                        <div style="display: flex; justify-content: space-between; font-weight: 600;">
                            <span>${s.name}</span>
                            <span>R$ ${s.price}</span>
                        </div>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">${s.description}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderChatList() {
        const container = document.getElementById('chat-list');
        if (!container) return;
        container.innerHTML = DATA.conversations.map(chat => `
            <div class="chat-list-item" onclick="location.hash='#chat-msg/${chat.id}'">
                <div class="avatar-circle" style="background: ${chat.avatarColor}; margin-bottom: 0;">${chat.professionalAvatar}</div>
                <div class="chat-info">
                    <div class="chat-name-time">
                        <h4>${chat.professionalName}</h4>
                        <span>${chat.time}</span>
                    </div>
                    <div class="last-msg">${chat.lastMessage}</div>
                </div>
            </div>
        `).join('');
    }

    function renderChatDetail(id) {
        const chat = DATA.conversations.find(c => c.id == id);
        const container = document.getElementById('chat-messages-container');
        const nameEl = document.getElementById('chat-name');
        const avatarEl = document.getElementById('chat-avatar');
        
        if (!chat || !container) return;

        nameEl.innerText = chat.professionalName;
        avatarEl.style.background = chat.avatarColor;
        avatarEl.innerText = chat.professionalAvatar;

        container.innerHTML = chat.messages.map(m => `
            <div class="message ${m.sender}" style="margin-bottom: 1rem; display: flex; flex-direction: column; align-items: ${m.sender === 'user' ? 'flex-end' : 'flex-start'}">
                <div style="background: ${m.sender === 'user' ? 'var(--primary)' : 'var(--bg-alt)'}; color: ${m.sender === 'user' ? 'white' : 'var(--text)'}; padding: 10px 14px; border-radius: 16px; max-width: 80%; font-size: 0.9rem;">
                    ${m.text}
                </div>
                <span style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">${m.time}</span>
            </div>
        `).join('');
        
        container.scrollTop = container.scrollHeight;
    }

    function renderAdminStats() {
        const container = document.getElementById('admin-stats');
        if (!container) return;
        const stats = DATA.adminStats;
        container.innerHTML = `
            <div style="background: var(--bg-alt); padding: 1rem; border-radius: 12px; text-align: center;">
                <div style="font-size: 0.8rem; color: var(--text-muted);">Usuários</div>
                <div style="font-size: 1.25rem; font-weight: 700;">${stats.totalUsers}</div>
            </div>
            <div style="background: var(--bg-alt); padding: 1rem; border-radius: 12px; text-align: center;">
                <div style="font-size: 0.8rem; color: var(--text-muted);">Profissionais</div>
                <div style="font-size: 1.25rem; font-weight: 700;">${stats.totalProfessionals}</div>
            </div>
        `;

        const pendingList = document.getElementById('pending-list');
        pendingList.innerHTML = DATA.pendingApprovals.map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; border-bottom: 1px solid var(--border);">
                <div>
                    <div style="font-weight: 600;">${p.name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${p.category} • ${p.time}</div>
                </div>
                <button class="btn btn-primary" style="width: auto; padding: 4px 12px; font-size: 0.8rem;">Aprovar</button>
            </div>
        `).join('');
    }

    // Search input listener
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderSearchResults(e.target.value);
        });
    }

    init();
    handleRoute();
});

// Official Google Authentication Callback
function handleCredentialResponse(response) {
    try {
        // Decode the JWT ID Token to get user information
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        console.log("Real Google User:", payload);

        const name = payload.name;
        const email = payload.email;
        const picture = payload.picture;

        // Update App UI with real data
        const nameDisplay = document.getElementById('user-name-display');
        const emailDisplay = document.getElementById('user-email-display');
        const avatarLarge = document.getElementById('user-avatar-large');
        const greeting = document.querySelector('.greeting');

        if (nameDisplay) nameDisplay.innerText = name;
        if (emailDisplay) emailDisplay.innerText = email;
        if (avatarLarge) {
            if (picture) {
                avatarLarge.innerHTML = `<img src="${picture}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                avatarLarge.innerText = name.charAt(0);
                avatarLarge.style.background = 'var(--primary)';
                avatarLarge.innerHTML = ''; 
            }
        }
        if (greeting) greeting.innerText = `Olá, ${payload.given_name || name.split(' ')[0]}`;

        // Redirect to selection screen
        window.location.hash = '#user-type-selection';
    } catch (e) {
        console.error("Error processing Google login", e);
        alert("Erro ao processar login real do Gmail.");
    }
}

function setupImagePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                preview.innerHTML = `<img src="${event.target.result}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            };
            reader.readAsDataURL(file);
        }
    };
}
