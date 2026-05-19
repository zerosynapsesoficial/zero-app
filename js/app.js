console.log("🚀 Zero App JS Starting...");
import { DATA } from './data.js';

// --- Supabase Configuration ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
let supabaseClient;

document.addEventListener('DOMContentLoaded', () => {
    // --- Initialize Supabase ---
    // Hardcoding keys temporarily to fix the "Invalid API key" issue
    const url = "https://oryguljbqcphbtiapvwk.supabase.co";
    const key = "sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5";

    if (window.supabase) {
        try {
            supabaseClient = window.supabase.createClient(url, key, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    storage: window.localStorage
                }
            });
            console.log("Supabase Client created with persistence.");
            
            // Test connection
            supabaseClient.from('profiles').select('count', { count: 'exact', head: true })
                .then(({ error }) => {
                    if (error) {
                        console.error("Supabase Connection Test Failed:", error.message);
                        if (error.message.includes("API key")) {
                            alert("ERRO CRÍTICO: A chave do Supabase no código é inválida para o projeto " + url);
                        }
                    } else {
                        console.log("Supabase Connection Test Successful.");
                    }
                });
        } catch (e) {
            console.error("Error creating Supabase client:", e);
        }
    } else {
        console.error("Supabase SDK not loaded.");
    }

    // --- Mobile Custom Pull-To-Refresh Helper ---
    initMobilePullToRefresh();

    // --- Mouse Interactive Effect (Flashlight) ---
    const appContainer = document.getElementById('app');
    if (appContainer) {
        appContainer.addEventListener('mousemove', (e) => {
            const rect = appContainer.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            appContainer.style.setProperty('--mouse-x', `${x}%`);
            appContainer.style.setProperty('--mouse-y', `${y}%`);
        });
    }

    // --- Auth State Listener (Auto-login on confirm) ---
    if (supabaseClient) {
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth Event:", event);
            
            if (session && session.user) {
                const user = session.user;
                localStorage.setItem('user_email', user.email);
                
                setupNotificationsSubscription();
                updateNotificationBadges();

                // 1. Redirecionamento Imediato (Se estiver no login/splash)
                if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && 
                    (window.location.hash === '#login' || window.location.hash === '' || window.location.hash === '#splash')) {
                    console.log("Redirecting to home...");
                    
                    // Inicializa temporariamente com metadata se disponível
                    if (!localStorage.getItem('user_type')) {
                        localStorage.setItem('user_type', user.user_metadata?.user_type || 'client');
                        localStorage.setItem('user_name', user.user_metadata?.full_name || user.email);
                    }
                    
                    window.location.hash = '#home';
                }

                // 2. Busca de Perfil Completo (Sempre tenta atualizar)
                await fetchProfileInBackground(user);
                
                // Sync all cards & set up live listener
                syncDatabaseProfiles();
                setupProfilesRealtimeSubscription();
                setupGlobalChatUpdates();

                // 3. Pré-aquece o cache do admin para que a primeira mensagem de suporte
                //    seja enviada instantaneamente (executa em background, não bloqueia)
                const myType = localStorage.getItem('user_type') || '';
                if (myType !== 'admin' && !localStorage.getItem('zero_support_admin_id')) {
                    setTimeout(() => resolveTargetId('support'), 2000);
                }
                
            } else if (event === 'SIGNED_OUT') {
                console.warn("Session Signed Out. Clearing only auth data.");
                // Limpa cache do admin ao deslogar
                localStorage.removeItem('zero_support_admin_id');
                // Only clear if we are sure we want to logout
                if (window.location.hash !== '#login') {
                    localStorage.removeItem('user_email');
                    localStorage.removeItem('user_type');
                    window.location.hash = '#login';
                }
            }
        });
    }

    // --- Centralized User Detection ---
    async function getCurrentUser() {
        if (!supabaseClient) return null;
        try {
            // 1. Instant Guest Check: If no token or email exists, we are definitely unauthenticated.
            // Avoid calling slow Supabase async methods that can hang/timeout.
            const urlObj = new URL(supabaseClient.supabaseUrl);
            const projectID = urlObj.hostname.split('.')[0];
            const storageKey = `sb-${projectID}-auth-token`;
            
            const hasToken = localStorage.getItem(storageKey);
            const hasEmail = localStorage.getItem('user_email');

            if (!hasToken && !hasEmail) {
                return null;
            }

            // 2. Try localStorage first (Instant, offline-friendly, no network hang)
            let user = null;
            if (hasToken) {
                try {
                    const savedData = JSON.parse(hasToken || 'null');
                    if (savedData && savedData.user) {
                        user = savedData.user;
                    }
                } catch (e) {
                    console.warn("Error parsing auth token from localStorage:", e);
                }
            }

            // 3. Mock User & Admin Recovery (If session is lost but mock data exists)
            if (!user && hasEmail) {
                console.log("Recovering mock session for:", hasEmail);
                const userType = localStorage.getItem('user_type') || 'client';
                const userName = localStorage.getItem('user_name') || 'Usuário';
                return {
                    id: localStorage.getItem('user_id') || '00000000-0000-0000-0000-000000000000',
                    email: hasEmail === 'ZeroZynapses' ? 'lara.cabeleireira@teste.com' : hasEmail,
                    user_metadata: {
                        full_name: userName,
                        user_type: userType
                    }
                };
            }

            // 4. Fallback: Query Supabase active session only if local user was not found
            if (!user) {
                try {
                    const sessionData = await withTimeout(
                        supabaseClient.auth.getSession(),
                        1500,
                        "session_timeout"
                    );
                    user = sessionData?.data?.session?.user;
                } catch (e) {
                    console.warn("Fast getSession fallback timed out or failed:", e);
                }
            }

            // 5. Fallback: Query fresh user fetch from Supabase
            if (!user) {
                try {
                    const authData = await withTimeout(
                        supabaseClient.auth.getUser(),
                        1500,
                        "user_timeout"
                    );
                    user = authData?.data?.user;
                } catch (e) {
                    console.warn("Fast getUser fallback timed out or failed:", e);
                }
            }
            
            return user;
        } catch (e) {
            console.error("Error in getCurrentUser:", e);
            return null;
        }
    }

    // Helper: Fast check for active Supabase session (instant startup check)
    async function hasActiveSession() {
        if (!supabaseClient) return false;
        try {
            const urlObj = new URL(supabaseClient.supabaseUrl);
            const projectID = urlObj.hostname.split('.')[0];
            const storageKey = `sb-${projectID}-auth-token`;
            const token = localStorage.getItem(storageKey);
            const email = localStorage.getItem('user_email');
            
            // If they have a local token or stored email, consider them actively logged in for instant UI rendering.
            return !!(token || email);
        } catch (e) {
            return false;
        }
    }

    // Helper: Local chat history persistence per email account
    function getLocalChatHistory(userEmail) {
        const emailKey = userEmail ? userEmail.trim().toLowerCase() : 'guest';
        const key = `local_chat_history_${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Error parsing stored chat history:", e);
            }
        }
        
        // If it's Felipe, initialize with default Felipe preset
        if (emailKey.includes('felipe')) {
            const initial = JSON.parse(JSON.stringify(DATA.conversations || []));
            localStorage.setItem(key, JSON.stringify(initial));
            return initial;
        }
        
        // For other accounts, start clean with a welcome message from Support Zero
        const initial = [
            {
                id: 'support',
                professionalName: 'Suporte',
                professionalAvatar: '💎',
                avatarColor: 'linear-gradient(135deg, #a855f7, #6b21a8)',
                lastMessage: 'Bem-vindo ao Zero! Como podemos te ajudar hoje?',
                time: 'Agora',
                messages: [
                    { sender: 'other', text: 'Bem-vindo ao Zero! Como podemos te ajudar hoje?', time: 'Agora' }
                ]
            }
        ];
        localStorage.setItem(key, JSON.stringify(initial));
        return initial;
    }

    function saveLocalChatHistory(userEmail, history) {
        const emailKey = userEmail ? userEmail.trim().toLowerCase() : 'guest';
        const key = `local_chat_history_${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
        localStorage.setItem(key, JSON.stringify(history));
    }

    // --- Profiles Syncing Engine (Real-Time Database -> UI Local State) ---
    async function syncDatabaseProfiles() {
        if (!supabaseClient) return;
        try {
            console.log("🔄 Starting database profile sync...");
            const { data: dbProfiles, error } = await supabaseClient
                .from('profiles')
                .select('id, full_name, user_type, avatar_url, city, address, points');

            if (error) {
                console.error("Error fetching profiles for sync:", error);
                return;
            }

            if (!dbProfiles) return;

            // Map static IDs to synced UUIDs to maintain complete PWA routing compatibility
            const staticToUuid = {
                'prof-101': 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
                'prof-102': 'c3d4e5f6-a7b8-4c7d-0e1f-2a3b4c5d6e7f',
                'prof-103': 'b2c3d4e5-f6a7-4b6c-9d8e-1f0a2b3c4d5e'
            };

            const uuidToStatic = Object.fromEntries(
                Object.entries(staticToUuid).map(([staticId, uuid]) => [uuid, staticId])
            );

            dbProfiles.forEach(dbProf => {
                // 1. Sync mock professionals using mapped static IDs
                const staticId = uuidToStatic[dbProf.id];
                if (staticId) {
                    const localProf = DATA.professionals.find(p => p.id === staticId);
                    if (localProf) {
                        if (dbProf.full_name) { localProf.full_name = dbProf.full_name; localProf.name = dbProf.full_name; }
                        if (dbProf.avatar_url) localProf.avatar_url = dbProf.avatar_url;
                        if (dbProf.city) localProf.city = dbProf.city;
                        if (dbProf.points !== null) localProf.points = dbProf.points;
                    }
                } else {
                    // Sync other professionals by name matching
                    const localProfByName = DATA.professionals.find(p => p.full_name === dbProf.full_name || p.name === dbProf.full_name);
                    if (localProfByName) {
                        if (dbProf.avatar_url) localProfByName.avatar_url = dbProf.avatar_url;
                        if (dbProf.points !== null) localProfByName.points = dbProf.points;
                    }
                }

                // 2. Sync client cards
                const localClient = DATA.clients.find(c => c.id === dbProf.id || c.full_name === dbProf.full_name);
                if (localClient) {
                    if (dbProf.avatar_url) localClient.avatar_url = dbProf.avatar_url;
                    if (dbProf.points !== null) localClient.points = dbProf.points;
                }
            });

            // 3. Re-render affected screens if active
            const currentHash = window.location.hash;
            if (currentHash === '#home') {
                renderFeatured();
                renderRanking();
            } else if (currentHash === '#busca') {
                if (typeof renderSearchProfessionals === 'function') renderSearchProfessionals();
                renderSearchResults(document.getElementById('search-input')?.value || '');
            } else if (currentHash.startsWith('#chat')) {
                renderChatList();
            }
            
            console.log("✅ All local cards synced with Supabase Profiles.");
        } catch (e) {
            console.error("Critical error in syncDatabaseProfiles:", e);
        }
    }

    function setupProfilesRealtimeSubscription() {
        if (!supabaseClient) return;
        
        console.log("📡 Subscribing to profiles realtime updates...");
        supabaseClient
            .channel('public-profiles-realtime-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, payload => {
                console.log("⚡ Realtime profile update received:", payload);
                syncDatabaseProfiles();
            })
            .subscribe();
    }

    async function fetchProfileInBackground(user) {
        try {
            const { data: profile, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile) {
                console.log("Profile fetched in background:", profile);
                // Self-healing: If name contains ZeroZynapse OR email is admin, ensure it's admin
                const isZero = (profile.full_name && profile.full_name.toLowerCase().includes('zerozynapse')) || 
                               (user.email && (user.email.toLowerCase().includes('admin@zerosynapses.com') || user.email.toLowerCase().includes('lara.cabeleireira@teste.com')));
                               
                if (isZero && profile.user_type !== 'admin') {
                    console.log("Promoting account to admin in Supabase...");
                    supabaseClient.from('profiles').update({ user_type: 'admin', full_name: 'ZeroZynapses' }).eq('id', user.id).then(() => {
                        localStorage.setItem('user_type', 'admin');
                        updateUserUI();
                    });
                }
                localStorage.setItem('user_type', profile.user_type || 'client');
                localStorage.setItem('user_name', profile.full_name || user.email);
                localStorage.setItem('user_photo', profile.avatar_url || '');
                localStorage.setItem('user_city', profile.city || 'São Paulo, SP');
                localStorage.setItem('user_address', profile.address || '');
                localStorage.setItem('user_points', profile.points !== null ? profile.points : 10);
                
                updateUserUI();
                
                // Keep local lists fully synchronized
                syncDatabaseProfiles();
                
                // If we are on chat page, re-render to reflect new role/data
                if (window.location.hash.startsWith('#chat')) {
                    renderChatList();
                }
            } else if (user) {
                console.log("Profile missing, creating for user:", user.id);
                const isZero = user.email.toLowerCase().includes('admin@zerosynapses.com') || user.email.toLowerCase().includes('lara.cabeleireira@teste.com') || 
                               (user.user_metadata.full_name && user.user_metadata.full_name.toLowerCase().includes('zerozynapse'));
                const newProfile = {
                    id: user.id,
                    full_name: isZero ? 'ZeroZynapses' : (user.user_metadata.full_name || user.email),
                    user_type: isZero ? 'admin' : (user.user_metadata.user_type || 'client'),
                    points: 10
                };
                supabaseClient.from('profiles').insert([newProfile]).then(() => {
                    localStorage.setItem('user_type', newProfile.user_type);
                    localStorage.setItem('user_name', newProfile.full_name);
                    updateUserUI();
                    syncDatabaseProfiles();
                });
            }
        } catch (err) {
            console.warn("Could not fetch profile in background:", err.message);
            // If it's a 406 (Not Acceptable), it usually means the column avatar_url is missing
            if (err.message && err.message.includes("406")) {
                console.log("Tip: Check if 'avatar_url' column exists in 'profiles' table.");
            }
        }
    }

    // --- Router ---
    const routes = {
        '#splash': () => showScreen('splash'),
        '#onboarding': () => showScreen('onboarding'),
        '#login': () => {
            // Removido auto-logout no hash #login para evitar deslogar no F5
            showScreen('login');
        },
        '#register': () => showScreen('register'),
        '#user-type-selection': () => showScreen('user-type-selection'),
        '#register-client': () => showScreen('register-client'),
        '#register-professional': () => showScreen('register-professional'),
        '#home': () => showSubScreen('home'),
        '#busca': () => {
            showSubScreen('busca');
            if (typeof renderSearchProfessionals === 'function') renderSearchProfessionals();
        },
        '#chat': () => {
            showSubScreen('chat');
            // Always reset search panel state when entering chat
            const searchResults = document.getElementById('chat-search-results');
            const convsList = document.getElementById('chat-conversations-list');
            const searchInput = document.getElementById('chat-search-input');
            if (searchResults) searchResults.style.display = 'none';
            if (convsList) convsList.style.display = 'block';
            if (searchInput) searchInput.value = '';
            renderChatList();
        },
        '#perfil': () => {
            showSubScreen('perfil');
            updateUserUI();
        },
        '#profissional': () => showOverlay('professional-detail'),
        '#agendamento': () => {
            showSubScreen('agendamento');
            if (typeof renderAgendamentoScreen === 'function') renderAgendamentoScreen();
        },
        '#chat-msg': () => showOverlay('chat-detail'),
        '#configuracoes': () => showOverlay('configuracoes'),
        '#admin': () => showOverlay('admin'),
        '#gastos': () => {
            showSubScreen('gastos');
            if (typeof renderGastosData === 'function') renderGastosData();
        },
        '#financeiro': () => {
            showOverlay('financeiro');
            renderFinanceList();
        },
        '#dashboard-profissional': () => {
            showOverlay('dashboard-profissional');
            renderDashboardProfissional();
        },
        '#dashboard-cliente': () => {
            showOverlay('dashboard-cliente');
            renderDashboardCliente();
        },
        '#catalogo': () => {
            showOverlay('catalogo');
            renderCatalogo();
        },
        '#mapa': () => {
            showOverlay('mapa');
            renderMapaRede();
        },
        '#editar-perfil': () => {
            showOverlay('editar-perfil');
            populateEditForm();
        },
        '#notificacoes': () => {
            showSubScreen('notificacoes');
            renderNotifications();
        }
    };

    function handleRoute() {
        const hash = window.location.hash || '#splash';
        
        if (hash.startsWith('#profissional/')) {
            const id = hash.split('/')[1];
            renderProfessionalDetail(id);
            showOverlay('professional-detail');
            return;
        }

        if (hash.startsWith('#profissional-home/')) {
            const id = hash.split('/')[1];
            renderProfessionalHome(id);
            showOverlay('professional-home');
            return;
        }

        if (hash.startsWith('#client-home/')) {
            const id = hash.split('/')[1];
            renderClientHome(id);
            showOverlay('client-home');
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
        const screen = document.getElementById(id);
        if (screen) screen.classList.add('active');

        if (id === 'login') {
            const savedEmail = localStorage.getItem('saved_login_email');
            const savedPass = localStorage.getItem('saved_login_password');
            if (savedEmail) {
                const emailEl = document.getElementById('login-email');
                if (emailEl) emailEl.value = savedEmail;
            }
            if (savedPass) {
                const passEl = document.getElementById('login-password');
                if (passEl) passEl.value = savedPass;
            }
        }
    }

    function showSubScreen(id) {
        showScreen('main-content');
        document.querySelectorAll('.sub-screen').forEach(s => s.classList.remove('active'));
        const sub = document.getElementById(id);
        if (sub) sub.classList.add('active');
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.screen === id);
        });

        const hash = window.location.hash;
        document.querySelectorAll('.top-tab').forEach(tab => {
            const href = tab.getAttribute('href');
            if (href === hash) tab.classList.add('active');
            else if (hash === '#home' && href === '#home') tab.classList.add('active');
            else if ((hash === '#chat' || hash.startsWith('#chat-msg') || hash === '#notificacoes') && href === '#perfil') tab.classList.add('active');
            else tab.classList.remove('active');
        });
    }

    window.showOverlay = function(id) {
        const overlay = document.getElementById(id);
        if (overlay) overlay.classList.add('active');
        if (id === 'plans-selection') renderPlans();
    };

    window.hideOverlay = function(id) {
        const overlay = document.getElementById(id);
        if (overlay) overlay.classList.remove('active');
    };

    window.copyCouponCode = function(code, btn) {
        navigator.clipboard.writeText(code).then(() => {
            const originalText = btn.innerText;
            const originalBg = btn.style.background;
            const originalColor = btn.style.color;
            
            btn.innerText = "Copiado!";
            btn.style.background = "#10B981";
            btn.style.color = "#fff";
            
            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.background = originalBg;
                btn.style.color = originalColor;
            }, 1500);
        }).catch(err => {
            console.error("Erro ao copiar: ", err);
        });
    };

    // --- Subscription Plans Logic ---
    window.selectedPlan = null;
    window.selectedPayment = null;

    window.renderPlans = function() {
        const type = localStorage.getItem('user_type') || 'client';
        const container = document.getElementById('plans-container');
        const titleEl = document.querySelector('#plans-selection h3');
        const msgEl = document.querySelector('#plans-selection .overlay-content p');
        const methodsSection = document.getElementById('payment-methods-section');
        
        if (!container) return;

        if (type === 'admin') {
            if (titleEl) titleEl.innerText = "Doar Pontos";
            if (msgEl) msgEl.innerText = "Selecione um usuário para adicionar pontos bônus à conta.";
            if (methodsSection) methodsSection.style.display = 'none';
            renderAdminGiftPoints();
            return;
        }

        // Reset for normal users
        if (titleEl) titleEl.innerText = "Upgrade de Conta";
        if (msgEl) msgEl.innerText = "Escolha o melhor plano para o seu perfil e aproveite recursos exclusivos.";

        const plans = type === 'professional' ? [
            { id: 'gratis_prof', name: 'Plano Grátis', price: 0, features: ['Visibilidade Básica', 'Agenda Digital', '1 Serviço no Catálogo'] },
            { id: 'comum_prof', name: 'Plano Essencial', price: 29.90, features: ['Visibilidade Básica', 'Agenda Digital', '3 Serviços no Catálogo'] },
            { id: 'plus_prof', name: 'Plano Plus', price: 59.90, features: ['Destaque na Busca', 'Até 5 Serviços no Catálogo', 'Relatórios Financeiros', 'Suporte Prioritário'] }
        ] : [
            { id: 'comum_client', name: 'Plano Comum', price: 0, features: ['Busca de Profissionais', 'Agendamento Online', 'Histórico'] },
            { id: 'plus_client', name: 'Plano Plus', price: 19.90, features: ['Cashback em Pontos', 'Descontos Exclusivos', 'Suporte VIP'] }
        ];

        let currentPlanName = localStorage.getItem('user_subscription_plan') || (type === 'professional' ? 'Plano Grátis' : 'Plano Comum');
        if (currentPlanName === 'Free' || currentPlanName === 'Plano Comum') {
            if (type === 'professional') {
                currentPlanName = 'Plano Grátis';
            } else {
                currentPlanName = 'Plano Comum';
            }
        }

        container.innerHTML = plans.map(p => {
            const isActive = p.name === currentPlanName;
            const priceStr = p.price === 0 ? 'Grátis' : 'R$ ' + p.price.toFixed(2).replace('.', ',') + '/mês';
            return `
                <div class="plan-card ${isActive ? 'active' : ''}" id="plan-${p.id}" onclick="${isActive ? '' : `selectPlan('${p.id}')`}" style="${isActive ? 'border: 2px solid #b085f5; background: rgba(176, 133, 245, 0.08); cursor: default; pointer-events: none;' : 'cursor: pointer;'}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <div style="font-weight: 800; font-size: 1.25rem; color: #fff;">${p.name}</div>
                        ${isActive ? '<span style="background: #b085f5; color: #111; font-size: 0.65rem; font-weight: 900; padding: 3px 8px; border-radius: 8px;">ATIVO</span>' : ''}
                    </div>
                    <div class="price">${priceStr}</div>
                    <ul style="list-style: none; padding: 0; color: #888; font-size: 0.9rem; margin-top: 10px;">
                        ${p.features.map(f => `<li style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                            <span style="color: var(--primary-accent); font-weight: 900;">✓</span> ${f}
                        </li>`).join('')}
                    </ul>
                </div>
            `;
        }).join('');
        
        // Reset state
        window.selectedPlan = null;
        window.selectedPayment = null;
        if (methodsSection) methodsSection.style.display = 'none';
        document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('selected'));
    };

    window.renderAdminGiftPoints = async function() {
        const container = document.getElementById('plans-container');
        container.innerHTML = '<div class="loader-mini" style="margin: 2rem auto;"></div>';

        try {
            const { data: profiles, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .order('full_name', { ascending: true })
                .limit(30);

            if (error) throw error;

            container.innerHTML = profiles.map(p => `
                <div class="plan-card" style="text-align: left; padding: 1.25rem; gap: 15px; cursor: default; border-color: rgba(255,255,255,0.05);">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 1rem;">
                        <div style="width: 45px; height: 45px; background: #222; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; overflow: hidden; border: 1px solid #333;">
                            ${p.avatar_url ? `<img src="${p.avatar_url}" style="width:100%; height:100%; object-fit:cover;">` : '👤'}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 800; color: #fff; font-size: 0.95rem;">${p.full_name || 'Usuário'}</div>
                            <div style="font-size: 0.7rem; color: #666; font-weight: 600; text-transform: uppercase;">
                                ${p.user_type === 'professional' ? '💼 Pro' : '👤 Cliente'} • <span style="color: var(--primary-accent);">${p.points || 0} pts</span>
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <input type="number" id="pts-input-${p.id}" placeholder="Quantidade" style="flex: 1; background: #000; border: 1px solid #333; color: #fff; padding: 10px; border-radius: 12px; font-weight: 800; font-size: 0.85rem;">
                        <button class="btn btn-sm" onclick="giftPoints('${p.id}', '${p.full_name || 'Usuário'}')" style="background: var(--primary-accent); padding: 0 15px; border-radius: 12px; font-weight: 900; font-size: 0.75rem;">DOAR</button>
                    </div>
                </div>
            `).join('');

        } catch (err) {
            console.error("Erro ao carregar usuários:", err);
            container.innerHTML = '<p style="color: #ff4444; text-align: center; padding: 2rem;">Erro ao carregar lista de usuários.</p>';
        }
    };

    window.giftPoints = async function(userId, name) {
        const input = document.getElementById(`pts-input-${userId}`);
        const amount = parseInt(input ? input.value : 0);

        if (!amount || amount <= 0) return alert("Informe uma quantidade válida de pontos.");

        try {
            // Get current points first
            const { data: profile } = await supabaseClient.from('profiles').select('points').eq('id', userId).single();
            const currentPoints = profile ? (profile.points || 0) : 0;

            const { error } = await supabaseClient
                .from('profiles')
                .update({ points: currentPoints + amount })
                .eq('id', userId);

            if (error) throw error;

            // Insere notificação para o destinatário dos pontos
            const adminUser = await getCurrentUser();
            const adminId = adminUser ? adminUser.id : null;

            await supabaseClient.from('notifications').insert([{
                user_id: userId,
                sender_id: adminId,
                type: 'points_gifted',
                title: 'Pontos Recebidos! 🎁',
                content: `Você recebeu ${amount} pontos bônus do administrador.`,
                link: '#perfil'
            }]);

            showSuccessModal('Doação Realizada!', `${amount} pontos foram creditados na conta de ${name}.`);
            renderAdminGiftPoints(); // Refresh list to show new points

        } catch (err) {
            console.error("Erro ao doar pontos:", err);
            alert("Não foi possível processar a doação no momento.");
        }
    };

    window.selectPlan = function(id) {
        window.selectedPlan = id;
        document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('active'));
        const el = document.getElementById(`plan-${id}`);
        if (el) el.classList.add('active');
        
        const methodsSection = document.getElementById('payment-methods-section');
        if (methodsSection) {
            methodsSection.style.display = 'block';
            methodsSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    window.selectPayment = function(method) {
        window.selectedPayment = method;
        document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('selected'));
        const el = document.getElementById(`method-${method}`);
        if (el) el.classList.add('selected');
    };

    window.confirmPlan = function() {
        if (!window.selectedPlan) return alert("Selecione um plano.");
        if (!window.selectedPayment) return alert("Selecione a forma de pagamento.");
        
        const type = localStorage.getItem('user_type') || 'client';
        const plans = type === 'professional' ? [
            { id: 'gratis_prof', name: 'Plano Grátis', price: 0 },
            { id: 'comum_prof', name: 'Plano Essencial', price: 29.90 },
            { id: 'plus_prof', name: 'Plano Plus', price: 59.90 }
        ] : [
            { id: 'comum_client', name: 'Plano Comum', price: 0 },
            { id: 'plus_client', name: 'Plano Plus', price: 19.90 }
        ];
        const planObj = plans.find(p => p.id === window.selectedPlan);

        // UI Elements
        const procOverlay = document.getElementById('payment-processing');
        const statusTitle = document.getElementById('payment-status-title');
        const statusMsg = document.getElementById('payment-status-msg');
        const statusIcon = document.getElementById('payment-status-icon');
        const qrContainer = document.getElementById('pix-qr-container');
        const pixValueLabel = document.getElementById('pix-value');

        if (!procOverlay || !statusTitle || !statusIcon) return;

        // Reset UI to processing state
        statusTitle.innerText = "Processando Pagamento";
        statusMsg.innerText = "Estamos validando sua transação com a instituição financeira. Não feche esta tela.";
        statusIcon.className = "loader-mini";
        statusIcon.innerHTML = "";
        qrContainer.style.display = "none";
        procOverlay.classList.add('active');

        if (window.selectedPayment === 'pix') {
            statusTitle.innerText = "PAGAMENTO PENDENTE";
            statusMsg.innerText = "Aguardando transferência bancária via PIX. Use o QR Code abaixo.";
            if (pixValueLabel) pixValueLabel.innerText = `R$ ${planObj.price.toFixed(2)}`;
            qrContainer.style.display = "block";
            
            // No automatic polling - "Travar" a tela conforme pedido
            if (window.activePaymentPolling) clearInterval(window.activePaymentPolling);
        } else {
            // Simulate direct confirmation for Debit (4 seconds delay)
            setTimeout(() => {
                window.finalizePaymentSuccess(planObj);
            }, 4000);
        }
    };

    window.startPaymentPolling = function(planObj) {
        const statusMsg = document.getElementById('payment-status-msg');
        let attempts = 0;
        const maxAttempts = 5; // Simulate that it takes some time to detect

        const pollInterval = setInterval(() => {
            attempts++;
            console.log(`[Payment Gateway] Checking status... Attempt ${attempts}`);
            
            if (statusMsg) {
                statusMsg.innerText = `Verificando confirmação bancária... (${attempts})`;
            }

            // In a real app, you would do: 
            // const { data } = await fetch('/api/check-payment?id=' + chargeId);
            // if (data.status === 'paid') { ... }

            if (attempts >= 4) { // Simulate receiving the Webhook/Confirmation after 12 seconds (3s * 4)
                clearInterval(pollInterval);
                window.finalizePaymentSuccess(planObj);
            }
        }, 3000);

        // Store interval ID in case user cancels or overlay is hidden
        window.activePaymentPolling = pollInterval;
    };

    window.finalizePaymentSuccess = function(planObj) {
        const procOverlay = document.getElementById('payment-processing');
        const statusTitle = document.getElementById('payment-status-title');
        const statusMsg = document.getElementById('payment-status-msg');
        const statusIcon = document.getElementById('payment-status-icon');
        const qrContainer = document.getElementById('pix-qr-container');

        if (!statusIcon || !statusTitle) return;

        // Visual Success Feedback (Gateway Confirmed)
        console.log("[Payment Gateway] Webhook Received: PAYMENT_CONFIRMED");
        
        statusIcon.className = "";
        statusIcon.innerHTML = `<div style="width: 80px; height: 80px; background: #10B981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #fff; margin-bottom: 2rem; animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);">✓</div>`;
        statusTitle.innerText = "Pagamento Confirmado!";
        statusMsg.innerText = "Recebemos a confirmação do seu banco. Sua assinatura foi ativada com sucesso!";
        qrContainer.style.display = "none";

        // Persistent update in database/storage
        if (planObj) {
            localStorage.setItem('user_subscription_plan', planObj.name);
            // In real app: await supabaseClient.from('profiles').update({ subscription_tier: planObj.id })...
        }

        setTimeout(() => {
            if (procOverlay) procOverlay.classList.remove('active');
            hideOverlay('plans-selection');
            updateUserUI();
            showSuccessModal('Upgrade Concluído!', `Obrigado! Você agora é ${planObj ? planObj.name : 'Premium'}!`);
            statusIcon.innerHTML = ""; 
        }, 3000);
    };

    // --- Initial Flow ---

    // Pequeno delay para permitir que o onAuthStateChange recupere a sessão
    // --- Initial Navigation & Session Check ---
    // --- Initial Navigation & Session Check ---
    (async () => {
        const currentHash = window.location.hash;
        const localUser = localStorage.getItem('user_email');
        const activeSession = await hasActiveSession();
        
        if (activeSession || localUser) {
            console.log("Session verified (Local or Supabase)");
            
            // Trigger database cards syncing on load
            syncDatabaseProfiles();
            setupProfilesRealtimeSubscription();
            
            // Se estiver em uma tela de auth, vai para home
            if (currentHash === '' || currentHash === '#splash' || currentHash === '#login' || currentHash === '#welcome') {
                window.location.hash = '#home';
            } else {
                // Se estiver em um overlay via Hash, garante que a tela de fundo seja a home
                const isOverlay = ['#catalogo','#financeiro','#mapa','#editar-perfil','#configuracoes','#chat','#chat-detail','#professional-home','#client-home'].some(h => currentHash.startsWith(h));
                if (isOverlay) {
                    showScreen('home'); // Define a base
                }
            }
            updateUserUI();
        } else {
            // Sem sessão: só permite login/register
            const authHashes = ['#login', '#register', '#register-prof', '#user-type-selection', '#splash', '#welcome'];
            const isAuthRoute = authHashes.some(h => currentHash.startsWith(h));
            
            if (!isAuthRoute) {
                window.location.hash = '#login';
            }
        }
        handleRoute(); // Executa a rota final
    })();

    // --- Render Functions ---
    function init() {
        console.log("🛠️ init() started...");
        renderCategories();
        renderFeatured();
        renderSearchProfessionals();
        renderChatList();
        setupChatSearch();
        setupChatInput();
        setupRealtimeMessages();
        renderAdminStats();
        updateUserUI();
        // setupLongPressLogout(); // Desabilitado para evitar deslogues acidentais ao segurar a tela
        setupAuthListeners();
        setupFormListeners();
        setupGoogleLogin();
        console.log("✅ base renders done.");

    }

    async function handleLoginSubmit() {
        console.log("🖱️ handleLoginSubmit triggered");
        const emailEl = document.getElementById('login-email');
        const passEl = document.getElementById('login-password');
        const errorEl = document.getElementById('login-error');
        const btnLogin = document.getElementById('btn-login-submit');
        
        const email = emailEl ? emailEl.value.trim() : '';
        const password = passEl ? passEl.value : '';
        const origText = btnLogin ? btnLogin.textContent : 'Entrar';

        if (email && password) {
            localStorage.setItem('saved_login_email', email);
            localStorage.setItem('saved_login_password', password);
        }

        if (!email || !password) {
            if (errorEl) {
                errorEl.textContent = '⚠️ Informe e-mail e senha.';
                errorEl.style.display = 'block';
            }
            return;
        }

        if (email === 'ZeroZynapses' && password === 'ZP@147896325@ZP') {
            if (btnLogin) { btnLogin.textContent = 'Entrando...'; btnLogin.disabled = true; }
            
            // Fixed admin ID that matches the profiles table entry for ZeroZynapses
            const ADMIN_ID = 'e33bdd17-f6bc-4c72-82cf-c3f76124aca0';
            const realAdminEmail = 'lara.cabeleireira@teste.com';

            // TIER 1: Try a real Supabase Auth session (ideal path)
            let realUserId = null;
            try {
                const { data: authData, error: authErr } = await supabaseClient.auth.signInWithPassword({
                    email: realAdminEmail, password: password
                });
                if (!authErr && authData?.user) {
                    realUserId = authData.user.id;
                    console.log("✅ Admin Logged in with real Supabase session:", realUserId);
                } else {
                    console.warn("⚠️ Supabase Auth failed for admin (will use offline session):", authErr?.message);
                }
            } catch (e) {
                console.warn("⚠️ Supabase Auth exception (will use offline session):", e.message);
            }

            // TIER 2: Whether auth succeeded or not, set up the full admin session in localStorage
            // This works with the existing getCurrentUser() mock-recovery system (lines ~143-156)
            const adminId = realUserId || ADMIN_ID;
            localStorage.setItem('user_type', 'admin');
            localStorage.setItem('user_name', 'ZeroZynapses');
            localStorage.setItem('user_email', realAdminEmail);
            localStorage.setItem('user_id', adminId);
            localStorage.setItem('user_subscription_plan', 'ADM');
            localStorage.setItem('user_points', '999999');
            localStorage.setItem('zero_support_admin_id', adminId);
            localStorage.setItem('_admin_bypass', 'true'); // Flag for mock session recovery

            // Ensure profile entry is correct in Supabase (fire-and-forget)
            supabaseClient.from('profiles').upsert({
                id: ADMIN_ID,
                full_name: 'ZeroZynapses',
                user_type: 'admin',
                points: 999999
            }).then(() => console.log("✅ Admin profile synced in DB"));

            console.log("✅ Admin session established (ID:", adminId, ")");
            if (errorEl) errorEl.style.display = 'none';
            updateUserUI();
            window.location.hash = '#home';
            return;
        }

        if (btnLogin) { btnLogin.textContent = 'Entrando...'; btnLogin.disabled = true; }
        if (errorEl) errorEl.style.display = 'none';

        try {
            console.log("Calling Supabase signIn...");
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            
            if (error) {
                console.error("Supabase Login Error:", error.message);
                if (errorEl) {
                    errorEl.textContent = '⚠️ ' + (error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
                    errorEl.style.display = 'block';
                }
                if (btnLogin) { btnLogin.textContent = origText; btnLogin.disabled = false; }
            } else {
                console.log("✅ Login manual bem sucedido.", data.user.email);
                const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', data.user.id).single();
                if (profile) {
                    localStorage.setItem('user_type', profile.user_type || 'client');
                    localStorage.setItem('user_name', profile.full_name || data.user.email);
                    localStorage.setItem('user_email', data.user.email);
                    localStorage.setItem('user_subscription_plan', profile.subscription_plan || 'Free');
                    localStorage.setItem('user_points', profile.points || 0);
                }
                updateUserUI();
                window.location.hash = '#home';
            }
        } catch (err) {
            console.error("🔥 Login crash:", err);
            if (btnLogin) { btnLogin.textContent = origText; btnLogin.disabled = false; }
        }
    }
    
    // --- Dynamic Resilient Google Login setup ---
    function setupGoogleLogin() {
        const container = document.getElementById('google-login-container');
        if (!container) return;

        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        if (isLocal) {
            console.log("ℹ️ Google Sign-In running in offline mock-friendly sandbox mode.");
            container.innerHTML = `
                <button id="btn-mock-google-login" style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    background: #fff;
                    color: #000;
                    border: 1px solid #ddd;
                    border-radius: 12px;
                    padding: 12px 24px;
                    font-size: 0.95rem;
                    font-weight: 600;
                    cursor: pointer;
                    width: 100%;
                    max-width: 240px;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                " onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='#fff'">
                    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    <span>Entrar com o Google</span>
                </button>
            `;

            const btn = document.getElementById('btn-mock-google-login');
            if (btn) {
                btn.onclick = (e) => {
                    e.preventDefault();
                    console.log("🔑 Google sign-in local mock redirect...");
                    localStorage.setItem('user_type', 'client');
                    localStorage.setItem('user_name', 'Anderson');
                    localStorage.setItem('user_email', 'anderson@gmail.com');
                    localStorage.setItem('user_photo', '');
                    updateUserUI();
                    window.location.hash = '#home';
                };
            }
        } else {
            // Render real Google OAuth button tags for production domain
            container.innerHTML = `
                <div id="g_id_onload"
                     data-client_id="348192418109-gbg9quomppt6upi5bplu7t7nohnah5ue.apps.googleusercontent.com"
                     data-context="signin"
                     data-ux_mode="popup"
                     data-callback="handleCredentialResponse"
                     data-auto_prompt="false">
                </div>
                <div class="g_id_signin"
                     data-type="standard"
                     data-shape="rectangular"
                     data-theme="filled_black"
                     data-text="signin_with"
                     data-size="large"
                     data-logo_alignment="left">
                </div>
            `;
        }
    }

    // --- Global Auth & Form Event Delegation ---
    function setupAuthListeners() {
        // Login Button
        document.addEventListener('click', async (e) => {
            const btn = e.target.closest('#btn-login-submit');
            if (btn) {
                e.preventDefault();
                await handleLoginSubmit();
            }
        });

        // Enter key on password
        document.addEventListener('keydown', async (e) => {
            if (e.target.id === 'login-password' && e.key === 'Enter') {
                e.preventDefault();
                await handleLoginSubmit();
            }
        });
    }

    function setupFormListeners() {
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.onsubmit = (e) => {
                e.preventDefault();
                showSuccessModal('Bem-vindo!', 'Escolha como deseja usar a plataforma.', () => {
                    window.location.hash = '#user-type-selection';
                });
            };
        }

        const formClient = document.getElementById('form-client');
        if (formClient) {
            formClient.onsubmit = async (e) => {
                e.preventDefault();
                await handleClientRegister(e);
            };
        }

        const formProf = document.getElementById('form-professional');
        if (formProf) {
            formProf.onsubmit = async (e) => {
                e.preventDefault();
                await handleProfessionalRegister(e);
            };
        }
    }

    async function handleClientRegister(e) {
        const btn = document.getElementById('btn-final-client');
        if (btn) {
            btn.innerText = "Criando conta...";
            btn.disabled = true;
        }

        const email = document.getElementById('client-email').value;
        const password = e.target.querySelector('input[type="password"]').value;
        const fullName = document.getElementById('client-name').value;
        const city = document.getElementById('client-city').value;
        const address = document.getElementById('client-address').value;
        
        // Formata o telefone/whatsapp
        const ddd = document.getElementById('client-ddd').value;
        const phoneNum = document.getElementById('client-phone').value;
        const formattedPhone = ddd && phoneNum ? `(${ddd}) ${phoneNum}` : '';

        // Validação obrigatória da foto de perfil
        const preview = document.getElementById('client-photo-preview');
        const hasPhoto = preview && preview.querySelector('img') !== null;
        if (!hasPhoto) {
            alert('⚠️ Por favor, selecione e envie sua foto de perfil antes de continuar.');
            if (btn) {
                btn.innerText = "Concluir Cadastro";
                btn.disabled = false;
            }
            return;
        }

        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName, user_type: 'client', city, address, phone: formattedPhone } }
            });

            if (error) {
                alert('Erro ao criar conta: ' + error.message);
            } else {
                let finalAvatarUrl = '';
                if (data.user) {
                    // Upload real-time do avatar para o Supabase
                    const fileInput = document.getElementById('client-photo-input');
                    if (fileInput && fileInput.files[0]) {
                        try {
                            finalAvatarUrl = await uploadFileToSupabase(fileInput.files[0], data.user.id, 'avatars');
                        } catch (uploadErr) {
                            console.warn("Storage upload failed, fallback to preview base64:", uploadErr);
                            const imgEl = preview.querySelector('img');
                            finalAvatarUrl = imgEl ? imgEl.src : '';
                        }
                    }

                    await supabaseClient.from('profiles').upsert({
                        id: data.user.id,
                        full_name: fullName,
                        user_type: 'client',
                        city,
                        address,
                        phone: formattedPhone,
                        avatar_url: finalAvatarUrl,
                        points: 10
                    });
                }
                
                // Estabelece a sessão mock local imediatamente para iniciar a aplicação direto
                localStorage.setItem('user_type', 'client');
                localStorage.setItem('user_name', fullName);
                localStorage.setItem('user_email', email);
                localStorage.setItem('user_phone', formattedPhone);
                localStorage.setItem('user_photo', finalAvatarUrl);
                localStorage.setItem('user_points', '10');
                if (data.user) {
                    localStorage.setItem('user_id', data.user.id);
                }
                
                showSuccessModal('Bem-vindo!', 'Conta criada com sucesso! Iniciando a aplicação...', () => {
                    window.location.hash = '#home';
                    updateUserUI();
                });
            }
        } catch (err) {
            console.error("Erro no signUp:", err);
        } finally {
            if (btn) {
                btn.innerText = "Concluir Cadastro";
                btn.disabled = false;
            }
        }
    }

    async function handleProfessionalRegister(e) {
        const btn = document.getElementById('btn-final-prof');
        if (btn) {
            btn.innerText = "Criando perfil...";
            btn.disabled = true;
        }

        const email = document.getElementById('prof-email').value;
        const password = e.target.querySelector('input[type="password"]').value;
        const fullName = document.getElementById('prof-name').value;
        const businessName = document.getElementById('prof-company-name').value;
        const category = document.getElementById('prof-category').value;
        const city = document.getElementById('prof-location').value;
        
        // Formata o telefone/whatsapp do profissional
        const ddd = document.getElementById('prof-ddd').value;
        const phoneNum = document.getElementById('prof-phone').value;
        const formattedPhone = ddd && phoneNum ? `(${ddd}) ${phoneNum}` : '';

        // Validação obrigatória da foto de perfil profissional
        const preview = document.getElementById('prof-photo-preview');
        const hasPhoto = preview && preview.querySelector('img') !== null;
        if (!hasPhoto) {
            alert('⚠️ Por favor, selecione e envie sua foto de perfil profissional antes de continuar.');
            if (btn) {
                btn.innerText = "Finalizar Cadastro";
                btn.disabled = false;
            }
            return;
        }

        const displayName = businessName || fullName;

        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: { 
                    data: { 
                        full_name: displayName, 
                        real_name: fullName,
                        user_type: 'professional', 
                        category, 
                        city, 
                        phone: formattedPhone 
                    } 
                }
            });

            if (error) {
                alert('Erro ao criar conta: ' + error.message);
            } else {
                let finalAvatarUrl = '';
                if (data.user) {
                    // Upload real-time do avatar para o Supabase
                    const fileInput = document.getElementById('prof-photo-input');
                    if (fileInput && fileInput.files[0]) {
                        try {
                            finalAvatarUrl = await uploadFileToSupabase(fileInput.files[0], data.user.id, 'avatars');
                        } catch (uploadErr) {
                            console.warn("Storage upload failed, fallback to preview base64:", uploadErr);
                            const imgEl = preview.querySelector('img');
                            finalAvatarUrl = imgEl ? imgEl.src : '';
                        }
                    }

                    await supabaseClient.from('profiles').upsert({
                        id: data.user.id,
                        full_name: displayName,
                        user_type: 'professional',
                        category,
                        city,
                        phone: formattedPhone,
                        avatar_url: finalAvatarUrl,
                        points: 0
                    });
                }

                // Estabelece a sessão mock local imediatamente para iniciar a aplicação direto
                localStorage.setItem('user_type', 'professional');
                localStorage.setItem('user_name', displayName);
                localStorage.setItem('user_email', email);
                localStorage.setItem('user_phone', formattedPhone);
                localStorage.setItem('user_photo', finalAvatarUrl);
                localStorage.setItem('user_points', '0');
                if (data.user) {
                    localStorage.setItem('user_id', data.user.id);
                }

                showSuccessModal('Bem-vindo!', 'Perfil profissional criado com sucesso! Iniciando a aplicação...', () => {
                    window.location.hash = '#home';
                    updateUserUI();
                });
            }
        } catch (err) {
            console.error("Erro no signUp prof:", err);
        } finally {
            if (btn) {
                btn.innerText = "Finalizar Cadastro";
                btn.disabled = false;
            }
        }
    }

    // --- Detail Renders ---



        // Client Photo Preview & Real-time Upload
        const clientPhotoInput = document.getElementById('client-photo-input');
        if (clientPhotoInput) {
            clientPhotoInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const preview = document.getElementById('client-photo-preview');
                    if (preview) preview.innerHTML = '<div class="loader-mini"></div>';
                    
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        if (preview) {
                            preview.innerHTML = `<img src="${event.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:35px;">`;
                            localStorage.setItem('user_photo', event.target.result);
                        }
                    };
                    reader.readAsDataURL(file);

                    const user = await getCurrentUser();
                    if (user) {
                        uploadFileToSupabase(file, user.id, 'avatars');
                    }
                }
            };
        }

        const profPhotoInput = document.getElementById('prof-photo-input');
        if (profPhotoInput) {
            profPhotoInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const preview = document.getElementById('prof-photo-preview');
                    if (preview) preview.innerHTML = '<div class="loader-mini"></div>';
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        if (preview) preview.innerHTML = `<img src="${ev.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:35px;">`;
                    };
                    reader.readAsDataURL(file);
                }
            };
        }

        const profilePhotoInput = document.getElementById('profile-photo-change-input');
        const savePhotoBtn = document.getElementById('btn-save-profile-photo');
        if (savePhotoBtn) savePhotoBtn.style.display = 'none'; // Não precisamos mais do botão manual

        // Profile Photo Click Trigger (on both wrapper and avatar)
        const profilePicTrigger = document.getElementById('profile-pic-trigger');
        const userAvatarLarge = document.getElementById('user-avatar-large');
        
        const triggerInput = () => {
            const input = document.getElementById('profile-photo-change-input');
            if (input) {
                console.log("Triggering file input click...");
                input.click();
            }
        };

        if (profilePicTrigger) profilePicTrigger.addEventListener('click', triggerInput);
        if (userAvatarLarge) userAvatarLarge.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerInput();
        });

        if (profilePhotoInput) {
            profilePhotoInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const avatarEl = document.getElementById('user-avatar-large');
                const originalContent = avatarEl ? avatarEl.innerHTML : '';
                
                // 1. Instant preview with loading state
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (avatarEl) {
                        avatarEl.innerHTML = `
                            <img src="${event.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:50%; opacity: 0.6;">
                            <div class="loader-mini" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); border-top-color: #fff; width: 30px; height: 30px; border-width: 3px;"></div>
                        `;
                        avatarEl.style.background = 'transparent';
                    }
                };
                reader.readAsDataURL(file);

                try {
                    const userType = localStorage.getItem('user_type');
                    let user = null;

                    if (userType === 'admin') {
                        user = { id: 'admin-zero' };
                    } else {
                        const { data } = await supabaseClient.auth.getUser();
                        user = data ? data.user : null;
                    }

                    if (!user) throw new Error("Usuário não autenticado.");

                    // Step 1: Compress image to 400px max width
                    const base64Image = await new Promise((resolve, reject) => {
                        const r = new FileReader();
                        r.onload = (ev) => {
                            const img = new Image();
                            img.onload = () => {
                                const canvas = document.createElement('canvas');
                                const MAX_WIDTH = 400; 
                                let width = img.width;
                                let height = img.height;
                                if (width > MAX_WIDTH) {
                                    height = Math.round((height * MAX_WIDTH) / width);
                                    width = MAX_WIDTH;
                                }
                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(img, 0, 0, width, height);
                                resolve(canvas.toDataURL('image/jpeg', 0.7));
                            };
                            img.onerror = reject;
                            img.src = ev.target.result;
                        };
                        r.onerror = reject;
                        r.readAsDataURL(file);
                    });

                    let finalUrl = base64Image;

                    if (userType !== 'admin') {
                        // Step 2: Try Supabase Storage upload
                        try {
                            const res = await fetch(base64Image);
                            const blob = await res.blob();
                            const fileName = `avatars/${user.id}_${Date.now()}.jpg`;
                            
                            const { error: uploadError } = await supabaseClient.storage
                                .from('avatars')
                                .upload(fileName, blob, { 
                                    contentType: 'image/jpeg',
                                    upsert: true 
                                });

                            if (!uploadError) {
                                const { data: { publicUrl } } = supabaseClient.storage
                                    .from('avatars')
                                    .getPublicUrl(fileName);
                                if (publicUrl) finalUrl = publicUrl;
                            } else {
                                console.warn("Storage upload falhou, salvando base64 no DB:", uploadError.message);
                            }
                        } catch (storageErr) {
                            console.warn("Storage indisponível, usando base64:", storageErr.message);
                        }

                        // Step 3: Always update the database profile
                        const { error: dbError } = await supabaseClient
                            .from('profiles')
                            .update({ avatar_url: finalUrl })
                            .eq('id', user.id);

                        if (dbError) {
                            console.error("Erro ao salvar avatar_url no banco:", dbError);
                            throw new Error("Não foi possível salvar a foto no perfil: " + dbError.message);
                        }
                    }

                    // Step 4: Update Local State and UI
                    localStorage.setItem('user_photo', finalUrl);
                    updateUserUI(); 
                    
                    showSuccessModal('Foto Atualizada!', 'Sua foto de perfil foi salva com sucesso.');

                } catch (err) {
                    console.error("Erro ao salvar foto:", err);
                    alert("Erro ao salvar a foto: " + err.message);
                    if (avatarEl) avatarEl.innerHTML = originalContent;
                }
            };
        }

        // --- Helper: Upload File to Supabase ---
        async function uploadFileToSupabase(file, userId, bucket) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}/${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabaseClient.storage
                .from(bucket)
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabaseClient.storage
                .from(bucket)
                .getPublicUrl(fileName);
                
            return publicUrl;
        }



        const btnAgendar = document.getElementById('btn-agendar');
        if (btnAgendar) btnAgendar.onclick = () => window.location.hash = '#agendamento';

        renderTimeSlots();
        setupFinanceListeners();
        
        async function populateEditForm() {
        const type = localStorage.getItem('user_type') || 'client';
        const name = localStorage.getItem('user_name') || '';
        const email = localStorage.getItem('user_email') || '';
        const photo = localStorage.getItem('user_photo') || '';
        const city = localStorage.getItem('user_city') || '';
        const address = localStorage.getItem('user_address') || '';
        const phone = localStorage.getItem('user_phone') || '';

        // Common Fields
        document.getElementById('edit-user-name').value = name;
        document.getElementById('edit-user-city').value = city;
        document.getElementById('edit-user-address').value = address;
        document.getElementById('edit-user-photo').value = photo;
        document.getElementById('edit-user-phone').value = phone;

        // Preview Image logic
        const preview = document.getElementById('edit-avatar-preview');
        if (photo) {
            preview.innerHTML = `<img src="${photo}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
            const initial = (name || 'U').charAt(0).toUpperCase();
            preview.innerHTML = `<span style="font-size: 2rem; font-weight: 800; color: #aaa;">${initial}</span>`;
        }

        // Live change listener for Photo URL input
        const photoInput = document.getElementById('edit-user-photo');
        photoInput.oninput = () => {
            const val = photoInput.value;
            if (val) {
                preview.innerHTML = `<img src="${val}" style="width: 100%; height: 100%; object-fit: cover;">`;
            } else {
                const initial = (document.getElementById('edit-user-name').value || 'U').charAt(0).toUpperCase();
                preview.innerHTML = `<span style="font-size: 2rem; font-weight: 800; color: #aaa;">${initial}</span>`;
            }
        };

        // File Uploader logic
        const fileInput = document.getElementById('edit-user-photo-file');
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const base64 = evt.target.result;
                    photoInput.value = base64;
                    preview.innerHTML = `<img src="${base64}" style="width: 100%; height: 100%; object-fit: cover;">`;
                };
                reader.readAsDataURL(file);
            }
        };

        // Conditional displays based on user_type
        const clientFields = document.getElementById('edit-client-fields');
        const profFields = document.getElementById('edit-professional-fields');

        if (type === 'professional') {
            if (clientFields) clientFields.style.display = 'none';
            if (profFields) profFields.style.display = 'flex';

            // Populate Professional fields from localStorage
            document.getElementById('edit-user-company').value = localStorage.getItem('user_company_name') || '';
            document.getElementById('edit-user-category').value = localStorage.getItem('user_category') || 'Beleza';
            document.getElementById('edit-user-specialties').value = localStorage.getItem('user_specialties') || '';
            document.getElementById('edit-prof-bio').value = localStorage.getItem('user_bio') || '';
            document.getElementById('edit-user-experience').value = localStorage.getItem('user_experience') || '';
            document.getElementById('edit-user-portfolio').value = localStorage.getItem('user_portfolio_url') || '';
            document.getElementById('edit-user-socials').value = localStorage.getItem('user_social_links') || '';
            document.getElementById('edit-user-working-start').value = localStorage.getItem('user_working_start') || '08:00';
            document.getElementById('edit-user-working-end').value = localStorage.getItem('user_working_end') || '18:00';
            document.getElementById('edit-user-price-range').value = localStorage.getItem('user_price_range') || '';
            document.getElementById('edit-user-pix').value = localStorage.getItem('user_pix_key') || '';
        } else {
            if (clientFields) clientFields.style.display = 'flex';
            if (profFields) profFields.style.display = 'none';

            // Populate Client fields from localStorage
            document.getElementById('edit-user-birth').value = localStorage.getItem('user_birth_date') || '';
            document.getElementById('edit-user-bio').value = localStorage.getItem('user_bio') || '';
            
            // Check Preferences checkboxes
            const savedPrefsStr = localStorage.getItem('user_preferences') || '';
            const savedPrefs = savedPrefsStr.split(',').map(s => s.trim().toLowerCase());
            const checkboxes = document.querySelectorAll('input[name="edit-pref"]');
            checkboxes.forEach(cb => {
                cb.checked = savedPrefs.includes(cb.value);
            });
        }

        // Tenta buscar as informações mais recentes do banco para manter o formulário atualizado
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                const { data: dbProfile } = await supabaseClient.from('profiles').select('*').eq('id', user.id).maybeSingle();
                if (dbProfile) {
                    console.log("Form values updated from database profile:", dbProfile);
                    // Update form values if they exist in DB
                    if (dbProfile.full_name) document.getElementById('edit-user-name').value = dbProfile.full_name;
                    if (dbProfile.avatar_url) {
                        document.getElementById('edit-user-photo').value = dbProfile.avatar_url;
                        preview.innerHTML = `<img src="${dbProfile.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;">`;
                    }
                    if (dbProfile.phone) document.getElementById('edit-user-phone').value = dbProfile.phone;
                    if (dbProfile.city) document.getElementById('edit-user-city').value = dbProfile.city;
                    if (dbProfile.address) document.getElementById('edit-user-address').value = dbProfile.address;

                    if (type === 'professional') {
                        document.getElementById('edit-user-company').value = dbProfile.company_name || '';
                        document.getElementById('edit-user-category').value = dbProfile.category || 'Beleza';
                        document.getElementById('edit-user-specialties').value = dbProfile.specialties || dbProfile.specialty || '';
                        document.getElementById('edit-prof-bio').value = dbProfile.bio || '';
                        document.getElementById('edit-user-experience').value = dbProfile.experience || '';
                        document.getElementById('edit-user-portfolio').value = dbProfile.portfolio_url || '';
                        document.getElementById('edit-user-socials').value = dbProfile.social_links || '';
                        
                        let start = '08:00', end = '18:00';
                        if (dbProfile.working_hours) {
                            const parts = dbProfile.working_hours.split('-');
                            if (parts.length === 2) {
                                start = parts[0].trim();
                                end = parts[1].trim();
                            }
                        }
                        document.getElementById('edit-user-working-start').value = start;
                        document.getElementById('edit-user-working-end').value = end;
                        document.getElementById('edit-user-price-range').value = dbProfile.price_range || '';
                        document.getElementById('edit-user-pix').value = dbProfile.pix_key || '';
                    } else {
                        document.getElementById('edit-user-birth').value = dbProfile.birth_date || '';
                        document.getElementById('edit-user-bio').value = dbProfile.bio || '';
                        
                        const savedPrefsStr = dbProfile.preferences || '';
                        const savedPrefs = savedPrefsStr.split(',').map(s => s.trim().toLowerCase());
                        const checkboxes = document.querySelectorAll('input[name="edit-pref"]');
                        checkboxes.forEach(cb => {
                            cb.checked = savedPrefs.includes(cb.value);
                        });
                    }
                }
            }
        } catch (err) {
            console.warn("Could not pre-populate edit form with fresh database fields:", err);
        }
    }

    function setupEditProfileListener() {
        const form = document.getElementById('edit-profile-form');
        if (!form) return;

        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            if (!btn || btn.disabled) return;

            const originalText = btn.innerText;
            btn.innerText = "Salvando...";
            btn.disabled = true;

            const type = localStorage.getItem('user_type') || 'client';
            const name = document.getElementById('edit-user-name').value;
            const photo = document.getElementById('edit-user-photo').value;
            const phone = document.getElementById('edit-user-phone').value;
            const city = document.getElementById('edit-user-city').value;
            const address = document.getElementById('edit-user-address').value;

            // Prepare payload
            const updatePayload = {
                full_name: name,
                avatar_url: photo,
                phone: phone,
                city: city,
                address: address
            };

            if (type === 'professional') {
                const company = document.getElementById('edit-user-company').value;
                const category = document.getElementById('edit-user-category').value;
                const specialties = document.getElementById('edit-user-specialties').value;
                const bio = document.getElementById('edit-prof-bio').value;
                const experience = document.getElementById('edit-user-experience').value;
                const portfolio = document.getElementById('edit-user-portfolio').value;
                const socials = document.getElementById('edit-user-socials').value;
                const workingStart = document.getElementById('edit-user-working-start').value;
                const workingEnd = document.getElementById('edit-user-working-end').value;
                const priceRange = document.getElementById('edit-user-price-range').value;
                const pix = document.getElementById('edit-user-pix').value;

                updatePayload.company_name = company;
                updatePayload.category = category;
                updatePayload.specialty = specialties.split(',')[0]?.trim() || specialties;
                updatePayload.specialties = specialties;
                updatePayload.bio = bio;
                updatePayload.experience = experience ? parseInt(experience) : null;
                updatePayload.portfolio_url = portfolio;
                updatePayload.social_links = socials;
                updatePayload.working_hours = `${workingStart} - ${workingEnd}`;
                updatePayload.price_range = priceRange ? parseFloat(priceRange) : null;
                updatePayload.pix_key = pix;
            } else {
                const birth = document.getElementById('edit-user-birth').value;
                const bio = document.getElementById('edit-user-bio').value;
                
                const checkboxes = document.querySelectorAll('input[name="edit-pref"]:checked');
                const prefs = Array.from(checkboxes).map(cb => cb.value).join(', ');

                updatePayload.birth_date = birth || null;
                updatePayload.bio = bio;
                updatePayload.preferences = prefs;
            }

            // Sync locally immediately
            const saveLocal = () => {
                localStorage.setItem('user_name', name);
                localStorage.setItem('user_photo', photo);
                localStorage.setItem('user_phone', phone);
                localStorage.setItem('user_city', city);
                localStorage.setItem('user_address', address);

                if (type === 'professional') {
                    localStorage.setItem('user_company_name', updatePayload.company_name || '');
                    localStorage.setItem('user_category', updatePayload.category || '');
                    localStorage.setItem('user_specialties', updatePayload.specialties || '');
                    localStorage.setItem('user_bio', updatePayload.bio || '');
                    localStorage.setItem('user_experience', updatePayload.experience || '');
                    localStorage.setItem('user_portfolio_url', updatePayload.portfolio_url || '');
                    localStorage.setItem('user_social_links', updatePayload.social_links || '');
                    localStorage.setItem('user_working_start', document.getElementById('edit-user-working-start').value || '');
                    localStorage.setItem('user_working_end', document.getElementById('edit-user-working-end').value || '');
                    localStorage.setItem('user_price_range', updatePayload.price_range || '');
                    localStorage.setItem('user_pix_key', updatePayload.pix_key || '');
                } else {
                    localStorage.setItem('user_birth_date', updatePayload.birth_date || '');
                    localStorage.setItem('user_bio', updatePayload.bio || '');
                    localStorage.setItem('user_preferences', updatePayload.preferences || '');
                }
                
                updateUserUI();
            };

            try {
                // Save remotely with timeout fallback
                const savePromise = (async () => {
                    const { data: { user } } = await supabaseClient.auth.getUser();
                    if (user) {
                        return await supabaseClient
                            .from('profiles')
                            .update(updatePayload)
                            .eq('id', user.id);
                    }
                    return { error: null };
                })();

                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("timeout")), 4000)
                );

                try {
                    const result = await Promise.race([savePromise, timeoutPromise]);
                    if (result && result.error) {
                        console.error("Database save error:", result.error);
                    }
                } catch (pErr) {
                    console.warn("Database save timed out, proceeding with local fallback.");
                }

                saveLocal();

                showSuccessModal('Sucesso!', 'Perfil atualizado com todas as informações salvas!', () => {
                    window.location.hash = '#perfil';
                });

            } catch (err) {
                console.error("Critical error saving profile form:", err);
                saveLocal();
                alert("Perfil atualizado localmente (Erro ao salvar na nuvem: " + err.message + ")");
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        };
    }
    setupEditProfileListener();

    // --- Core UI Update ---
    function updateUserUI() {
        let type = localStorage.getItem('user_type') || 'client';
        const name = localStorage.getItem('user_name') || 'Usuário';
        
        // Se a conta for do ZeroZynapses, força como admin para a UI
        if (name.toLowerCase().includes('zerozynapse') || name.toLowerCase().includes('admin')) {
            type = 'admin';
            localStorage.setItem('user_type', 'admin');
        }
        
        // Header
        const homeName = document.getElementById('home-user-name');
        if (homeName) homeName.innerText = name;
 
        const typeBadge = document.getElementById('user-type-badge');
        if (typeBadge) {
            if (type === 'admin') {
                typeBadge.innerText = 'Administrador (ADM)';
                typeBadge.style.background = '#b085f5';
                typeBadge.style.color = '#111';
            } else {
                typeBadge.innerText = type === 'professional' ? 'Profissional' : 'Cliente';
                typeBadge.style.background = type === 'professional' ? '#fff' : '#222';
                typeBadge.style.color = type === 'professional' ? '#000' : '#fff';
            }
        }
 
        // Screens visibility
        const clientDash = document.getElementById('client-dashboard');
        const profDash = document.getElementById('professional-dashboard');
        
        if (type === 'admin') {
            if (clientDash) clientDash.style.display = 'block';
            if (profDash) profDash.style.display = 'block';
        } else {
            if (clientDash) clientDash.style.display = type === 'client' ? 'block' : 'none';
            if (profDash) profDash.style.display = type === 'professional' ? 'block' : 'none';
        }
 
        // Profile Page
        const profileName = document.getElementById('user-name-display');
        const profileEmail = document.getElementById('user-email-display');
        const profileAvatar = document.getElementById('user-avatar-large');
        const navProfileIcon = document.getElementById('nav-profile-icon');
        const email = localStorage.getItem('user_email') || 'email@email.com';
        const photo = localStorage.getItem('user_photo');
 
        if (profileName) profileName.innerText = name;
        if (profileEmail) profileEmail.innerText = email;
 
        // Shared Logic for Avatar
        const updateAvatar = (el, size) => {
            if (!el) return;
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.overflow = 'hidden';
            el.style.borderRadius = '50%';
            
            if (photo && photo !== '') {
                el.innerHTML = `<img src="${photo}" style="width:100%; height:100%; object-fit:cover;">`;
                el.style.background = 'transparent';
                el.style.border = el.id === 'nav-profile-icon' ? 'none' : '3px solid var(--border)';
            } else {
                const initial = (name || 'U').charAt(0).toUpperCase();
                el.innerHTML = `<span style="font-size: ${size}; font-weight: 800; color: ${type === 'professional' || type === 'admin' ? '#fff' : '#000'}">${initial}</span>`;
                el.style.background = type === 'admin' ? 'linear-gradient(135deg, #a855f7, #6b21a8)' : (type === 'professional' ? 'linear-gradient(135deg, #333, #000)' : 'linear-gradient(135deg, #eee, #999)');
                el.style.border = el.id === 'nav-profile-icon' ? 'none' : '3px solid var(--border)';
            }
        };
 
        updateAvatar(profileAvatar, '3rem');
        
        if (navProfileIcon) {
            navProfileIcon.style.display = 'flex';
            updateAvatar(navProfileIcon, '1.2rem');
        }
 
        // Additional Info
        const locationEl = document.getElementById('user-location-display');
        const addressEl = document.getElementById('user-address-display');
        const userTypeDisplay = document.getElementById('user-type-display');
        
        if (locationEl) locationEl.innerText = localStorage.getItem('user_city') || 'Não informado';
        
        const addr = localStorage.getItem('user_address');
        const num = localStorage.getItem('user_number');
        if (addressEl) {
            addressEl.innerText = addr ? `${addr}${num ? ', ' + num : ''}` : 'Não informado';
        }
 
        if (userTypeDisplay) {
            if (type === 'admin') {
                userTypeDisplay.innerText = 'Administrador (ADM)';
                userTypeDisplay.style.color = '#b085f5';
                userTypeDisplay.style.fontWeight = '900';
            } else {
                userTypeDisplay.innerText = type === 'professional' ? 'Profissional' : 'Cliente';
                userTypeDisplay.style.color = '#fff';
            }
        }
        
        const pointsContainer = document.getElementById('points-info-container');
        const pointsInlineEl = document.getElementById('user-points-inline-display');
        if (pointsContainer && pointsInlineEl) {
            const points = localStorage.getItem('user_points') || '10';
            pointsInlineEl.innerText = type === 'admin' ? '♾️ Pontos' : `${points} Pontos`;
            pointsContainer.style.display = 'flex';
            
            // Set current plan text
            const planEl = document.getElementById('user-plan-display');
            if (planEl) {
                let defaultPlan = type === 'professional' ? 'Plano Grátis' : 'Plano Comum';
                let currentPlan = localStorage.getItem('user_subscription_plan');
                if (!currentPlan || currentPlan === 'Free' || currentPlan === 'Plano Comum') {
                    if (type === 'professional') {
                        currentPlan = 'Plano Grátis';
                    } else {
                        currentPlan = 'Plano Comum';
                    }
                }
                planEl.innerText = currentPlan;
            }
 
            // Change "Planos" button to "Pontos" for ADM
            const plansBtn = document.querySelector('button[onclick="showOverlay(\'plans-selection\')"]');
            if (plansBtn) {
                plansBtn.innerText = type === 'admin' ? 'Pontos' : 'Planos';
            }
        }
    }
 
    function renderDashboardCliente() {
        renderClientHomeAgenda();
        renderHomeSpending();
        renderHomeRanking();
        updateHomePoints();
        // Also call these if they still have relevant parts of the UI
        renderClientAgenda();
        renderSpendingChart();
        renderProLocationStats();
    }
 
    function renderClientHomeAgenda() {
        const container = document.getElementById('client-home-agenda');
        if (!container) return;
        const apps = JSON.parse(localStorage.getItem('user_appointments') || '[]');
        if (apps.length === 0) {
            container.innerHTML = '<p class="empty-state">Nenhum horário marcado.</p>';
            return;
        }
        container.innerHTML = apps.map(a => `
            <div style="background:#1a1a1a; padding:1rem; border-radius:12px; margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center; border:1px solid #333;">
                <div><div style="font-weight:700;">Agendamento</div><div style="font-size:0.7rem; color:#666;">${a.date}</div></div>
                <div style="font-weight:800; color:#fff;">${a.time}</div>
            </div>
        `).join('');
    }
 
    function renderHomeSpending() {
        const spendingVal = document.getElementById('home-client-spending');
        const progress = document.getElementById('home-spending-progress');
        if (!spendingVal || !progress) return;
        
        // Mock data for demo
        const total = 450.00;
        spendingVal.innerText = `R$ ${total.toFixed(2)}`;
        progress.style.width = '45%';
    }
 
    function renderHomeRanking() {
        // Chama o ranking real do banco de dados
        renderRanking();
    }
 
    function updateHomePoints() {
        const el = document.getElementById('home-client-points');
        if (!el) return;
        const type = localStorage.getItem('user_type') || 'client';
        const points = localStorage.getItem('user_points') || '10';
        el.innerText = type === 'admin' ? '♾️ Pontos' : `${points} Pontos`;
    }
 
    function updatePointsDisplay() {
        const type = localStorage.getItem('user_type');
        const points = localStorage.getItem(`user_points_${type}`) || 0;
        ['user-points-val', 'prof-points-display', 'client-points-display'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = type === 'admin' ? '♾️' : points;
        });
    }

    async function addPointsToUser(type, points) {
        const key = `user_points_${type}`;
        const current = parseInt(localStorage.getItem(key) || 0);
        localStorage.setItem(key, current + points);
        updatePointsDisplay();
    }

    // --- Dashboard Renders ---
    function renderDashboardProfissional() {
        renderProfAgenda();
        renderFinanceChart();
        renderRanking('professional');
        renderClientLocationStats();
    }


    function renderProfAgenda() {
        const container = document.getElementById('prof-agenda-list');
        if (!container) return;
        container.innerHTML = `
            <div style="background: #111; padding: 1rem; border-radius: 12px; border: 1px solid #222; display: flex; justify-content: space-between; align-items: center;">
                <div><div style="font-weight:700;">João Silva</div><div style="font-size:0.8rem; color:#888;">Corte Social</div></div>
                <div style="text-align:right;"><div style="font-weight:800;">14:30</div><div style="font-size:0.7rem; color:#666;">Hoje</div></div>
            </div>
            <div style="background: #111; padding: 1rem; border-radius: 12px; border: 1px solid #222; display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem;">
                <div><div style="font-weight:700;">Maria Santos</div><div style="font-size:0.8rem; color:#888;">Manicure</div></div>
                <div style="text-align:right;"><div style="font-weight:800;">16:00</div><div style="font-size:0.7rem; color:#666;">Amanhã</div></div>
            </div>
        `;
    }

    function renderClientAgenda() {
        const container = document.getElementById('client-agenda-list');
        if (!container) return;
        const apps = JSON.parse(localStorage.getItem('user_appointments') || '[]');
        if (apps.length === 0) {
            container.innerHTML = '<p style="color:#555; text-align:center; padding: 2rem;">Nenhum agendamento ativo.</p>';
            return;
        }
        container.innerHTML = apps.map(a => `
            <div style="background:#111; padding:1rem; border-radius:12px; border:1px solid #222; margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items: center;">
                <div><div style="font-weight:700;">${a.prof}</div><div style="font-size:0.8rem; color:#888;">Serviço Contratado</div></div>
                <div style="text-align:right;"><div style="font-weight:800; color:#fff;">${a.time}</div><div style="font-size:0.7rem; color:#444;">${a.date}</div></div>
            </div>
        `).join('');
    }

    async function renderFinanceChart() {
        try {
            const { data } = await supabaseClient.from('finance_records').select('revenue, cost');
            let rev = 0, cost = 0;
            if (data) data.forEach(d => { rev += (d.revenue || 0); cost += (d.cost || 0); });
            const max = Math.max(rev, cost, 100);
            const revBar = document.getElementById('chart-rev-bar');
            const costBar = document.getElementById('chart-cost-bar');
            if (revBar) revBar.style.width = `${(rev/max)*100}%`;
            if (costBar) costBar.style.width = `${(cost/max)*100}%`;
            const revVal = document.getElementById('chart-rev-val');
            const costVal = document.getElementById('chart-cost-val');
            if (revVal) revVal.innerText = `R$ ${rev.toFixed(2)}`;
            if (costVal) costVal.innerText = `R$ ${cost.toFixed(2)}`;
        } catch(e) {}
    }

    async function renderSpendingChart() {
        try {
            const { data } = await supabaseClient.from('finance_records').select('cost');
            let total = 0;
            if (data) data.forEach(d => total += (d.cost || 0));
            const spendingVal = document.getElementById('client-spending-val');
            const spendingBar = document.getElementById('client-spending-bar');
            if (spendingVal) spendingVal.innerText = `R$ ${total.toFixed(2)}`;
            if (spendingBar) spendingBar.style.width = `${Math.min((total/2000)*100, 100)}%`;
        } catch(e) {}
    }

    async function renderRanking() {
        const container = document.getElementById('home-client-ranking');
        if (!container) return;

        container.innerHTML = '<p style="color:#555; font-size:0.8rem; padding:0.5rem;">Carregando ranking...</p>';

        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('full_name, points, avatar_url')
                .order('points', { ascending: false })
                .limit(3);

            if (error) {
                if (error.message && error.message.includes('does not exist')) {
                    container.innerHTML = '<p style="color:#555; font-size:0.75rem; padding:0.5rem; text-align:center;">⚙️ Coluna <strong>points</strong> ainda não criada no banco.<br>Crie via Supabase Dashboard.</p>';
                } else {
                    container.innerHTML = '<p style="color:#555; font-size:0.8rem; padding:0.5rem;">Erro ao carregar ranking.</p>';
                }
                return;
            }

            if (!data || data.length === 0) {
                container.innerHTML = '<p style="color:#555; font-size:0.8rem; padding:0.5rem;">Nenhum usuário no ranking ainda.</p>';
                return;
            }

            const medals = ['\ud83e\udd47', '\ud83e\udd48', '\ud83e\udd49'];

            container.innerHTML = data.map((u, i) => {
                const avatarHtml = u.avatar_url
                    ? `<img src="${u.avatar_url}" style="width:44px; height:44px; object-fit:cover; border-radius:50%; border:1px solid #333;">`
                    : `<div style="width:44px; height:44px; background:#111; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.1rem; border:1px solid #222;">${(u.full_name || '?')[0].toUpperCase()}</div>`;
                return `
                <div style="display:flex; align-items:center; gap:1rem; padding:1rem; border-bottom:${i < data.length - 1 ? '1px solid #222' : 'none'};">
                    <div style="font-size:1.3rem; width:24px; text-align:center;">${medals[i] || (i+1)}</div>
                    ${avatarHtml}
                    <div style="flex:1;">
                        <div style="font-weight:700; font-size:0.95rem;">${u.full_name || 'Anônimo'}</div>
                        <div style="font-size:0.75rem; color:#666; font-weight:600;">${u.points ?? 10} Pontos</div>
                    </div>
                    ${i === 0 ? '<span style="font-size:1.2rem;">\ud83d\udc51</span>' : ''}
                </div>`;
            }).join('');

        } catch (err) {
            console.error('Erro ao buscar ranking:', err);
            container.innerHTML = '<p style="color:#555; font-size:0.8rem; padding:0.5rem;">Erro ao carregar ranking.</p>';
        }
    }

    function renderClientLocationStats() {
        const container = document.getElementById('client-location-stats');
        if (!container) return;
        const locations = [
            { city: 'São Paulo', count: 142 },
            { city: 'Santo André', count: 58 },
            { city: 'SBC', count: 45 }
        ];
        container.innerHTML = locations.map(loc => `
            <div style="background:#1a1a1a; padding:8px 14px; border-radius:10px; border:1px solid #333; font-size:0.75rem; font-weight: 600;">
                <span style="color:#fff;">${loc.city}:</span> <span style="color:#888;">${loc.count}</span>
            </div>
        `).join('');
    }

    function renderProLocationStats() {
        const container = document.getElementById('prof-location-stats');
        if (!container) return;
        const locations = [
            { cat: 'Beleza', count: 24 },
            { cat: 'Reformas', count: 18 },
            { cat: 'Saúde', count: 12 }
        ];
        container.innerHTML = locations.map(loc => `
            <div style="background:#1a1a1a; padding:8px 14px; border-radius:10px; border:1px solid #333; font-size:0.75rem; font-weight: 600;">
                <span style="color:#fff;">${loc.cat}:</span> <span style="color:#888;">${loc.count} pros</span>
            </div>
        `).join('');
    }

    function renderCatalogo() {
        const container = document.getElementById('catalogo-items');
        const planDisplay = document.getElementById('catalogo-current-plan');
        const addBtn = document.getElementById('btn-add-service');
        const limitMsg = document.getElementById('catalogo-limit-msg');
        
        if (!container) return;

        let plan = localStorage.getItem('user_subscription_plan') || 'Plano Grátis';
        if (plan === 'Free' || plan === 'Plano Comum') {
            plan = 'Plano Grátis';
        }
        if (planDisplay) planDisplay.innerText = plan;

        // Limite de 1 para Grátis, 3 para Essencial, 5 para Plus
        const limit = (plan === 'Plano Plus' || plan === 'ADM') ? 5 : (plan === 'Plano Essencial' ? 3 : 1);

        // Mock de serviços do usuário logado (normalmente viria do banco)
        const services = [
            { name: 'Corte Social', price: '45,00' },
            { name: 'Barba Completa', price: '30,00' },
            { name: 'Corte + Barba', price: '70,00' }
        ];

        container.innerHTML = services.map(s => `
            <div style="background:#111; padding:1.25rem; border-radius:16px; border:1px solid #222; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 700; color: #fff;">${s.name}</div>
                    <div style="font-size: 0.8rem; color: #4ade80; font-weight: 800; margin-top: 2px;">R$ ${s.price}</div>
                </div>
                <button style="background: none; border: none; color: #444; font-size: 1.1rem;">✏️</button>
            </div>
        `).join('');

        // Gerenciar Botão de Adicionar
        if (services.length >= limit) {
            if (addBtn) {
                addBtn.disabled = true;
                addBtn.style.opacity = '0.3';
                addBtn.style.filter = 'grayscale(1)';
            }
            if (limitMsg) limitMsg.style.display = 'block';
        } else {
            if (addBtn) {
                addBtn.disabled = false;
                addBtn.style.opacity = '1';
                addBtn.style.filter = 'none';
            }
            if (limitMsg) limitMsg.style.display = 'none';
        }
    }

    function renderMapaRede() {
        const addr = document.getElementById('map-address-val');
        if (addr) addr.innerText = localStorage.getItem('user_address') || 'Endereço não definido';
        
        const container = document.getElementById('map-markers-container');
        if (!container) {
            const mockContent = document.getElementById('map-mock');
            if (mockContent) {
                const markerList = document.createElement('div');
                markerList.id = 'map-markers-container';
                markerList.style.width = '100%';
                markerList.style.padding = '1.5rem';
                markerList.style.marginTop = 'auto';
                mockContent.appendChild(markerList);
            }
        }
        
        const markers = [
            { name: 'Sua Localização', loc: '0km (Referência)' },
            { name: 'Studio Zero', loc: '0.8km' },
            { name: 'Oficina Central', loc: '1.2km' }
        ];
        const target = document.getElementById('map-markers-container');
        if (target) {
            target.innerHTML = markers.map(m => `
                <div style="background: rgba(255,255,255,0.03); padding: 1.25rem; border-radius: 16px; margin-bottom: 0.75rem; display: flex; justify-content: space-between; border: 1px solid rgba(255,255,255,0.05);">
                    <span style="font-weight: 600;">📍 ${m.name}</span>
                    <span style="color: #666; font-size: 0.8rem;">${m.loc}</span>
                </div>
            `).join('');
        }
    }

    // --- Home Renders (Public Profiles) ---
    window.renderProfessionalHome = async function(id) {
        const container = document.getElementById('professional-home-content');
        if (!container) return;
        container.innerHTML = '<div class="loader-mini" style="margin: 50% auto;"></div>';

        try {
            let prof;
            if (id.startsWith('prof-')) {
                prof = DATA.professionals.find(p => p.id === id);
            } else {
                const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', id).single();
                if (error) throw error;
                prof = data;
            }

            if (!prof) throw new Error("Profissional não encontrado");

            const avatarHtml = prof.avatar_url 
                ? `<img src="${prof.avatar_url}" style="width:130px; height:130px; object-fit:cover; border-radius:35px; border: 4px solid var(--bg);">`
                : `<div style="width:130px; height:130px; background:linear-gradient(135deg, #a855f7, #6b21a8); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:3rem; border-radius:35px; border: 4px solid var(--bg);">${(prof.full_name || 'P')[0].toUpperCase()}</div>`;

            const servicesHtml = (prof.services || []).map(s => `
                <div style="background: #111; padding: 1.25rem; border-radius: 20px; border: 1px solid #222; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 800; color: #fff; font-size: 0.95rem;">${s.name}</div>
                        <div style="color: #666; font-size: 0.75rem; margin-top: 4px;">${s.description || ''}</div>
                        <div style="color: #555; font-size: 0.7rem; font-weight: 700; margin-top: 4px;">🕒 ${s.duration || 30} min</div>
                    </div>
                    <div style="color: #10B981; font-weight: 900; font-size: 1rem;">R$ ${s.price}</div>
                </div>
            `).join('');

            container.innerHTML = `
                <div class="prof-cover" style="height: 220px; background: #000; position: relative; overflow: hidden;">
                    <img src="${prof.cover_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800'}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.6;">
                    <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, transparent, #000);"></div>
                </div>
                <div style="padding: 0 1.5rem; margin-top: -65px; position: relative; text-align: center;">
                    <div style="display: inline-block; position: relative;">
                        ${avatarHtml}
                        <div style="position: absolute; bottom: 10px; right: 10px; background: #10B981; width: 25px; height: 25px; border-radius: 50%; border: 3px solid var(--bg);"></div>
                    </div>
                    <h2 style="margin-top: 1rem; font-size: 1.75rem; font-weight: 900; color: #fff;">${prof.full_name || 'Profissional'}</h2>
                    <p style="color: var(--primary-accent); font-weight: 800; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 1.5px; margin-top: 4px;">${prof.category || 'Especialista'}</p>
                    
                    <div style="display: flex; justify-content: center; gap: 1.5rem; margin-top: 2rem;">
                        <div style="text-align: center;">
                            <div style="font-size: 1.25rem; font-weight: 900; color: #fff;">★ ${prof.rating || '5.0'}</div>
                            <div style="font-size: 0.6rem; color: #555; font-weight: 800; text-transform: uppercase;">Rating</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.25rem; font-weight: 900; color: #fff;">${prof.reviews || 0}</div>
                            <div style="font-size: 0.6rem; color: #555; font-weight: 800; text-transform: uppercase;">Reviews</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.25rem; font-weight: 900; color: #fff;">${prof.points || 0}</div>
                            <div style="font-size: 0.6rem; color: #555; font-weight: 800; text-transform: uppercase;">Pontos</div>
                        </div>
                    </div>

                    <div style="margin-top: 2.5rem; text-align: left;">
                        <h4 style="color: #fff; font-size: 0.9rem; font-weight: 800; margin-bottom: 1rem; letter-spacing: 1px;">SOBRE</h4>
                        <p style="color: #888; font-size: 0.9rem; line-height: 1.6;">${prof.bio || 'Profissional qualificado da comunidade Zero, focado em entregar a melhor experiência.'}</p>
                    </div>

                    <div style="margin-top: 2.5rem; text-align: left;">
                        <h4 style="color: #fff; font-size: 0.9rem; font-weight: 800; margin-bottom: 1.25rem; letter-spacing: 1px;">CATÁLOGO DE SERVIÇOS</h4>
                        ${servicesHtml || '<p style="color:#444; font-size:0.8rem;">Nenhum serviço cadastrado.</p>'}
                    </div>

                    <div style="margin-top: 2rem; text-align: left; padding-bottom: 150px;">
                        <h4 style="color: #fff; font-size: 0.9rem; font-weight: 800; margin-bottom: 1rem; letter-spacing: 1px;">LOCALIZAÇÃO</h4>
                        <div style="background: #111; padding: 1.25rem; border-radius: 20px; border: 1px solid #222; display: flex; align-items: center; gap: 1rem;">
                            <div style="font-size: 1.5rem;">📍</div>
                            <div>
                                <div style="font-weight: 800; color: #fff; font-size: 0.9rem;">${prof.city || 'Cidade não informada'}</div>
                                <div style="color: #555; font-size: 0.75rem; font-weight: 600;">${prof.address || 'Endereço disponível após agendamento'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Action listeners
            const scheduleBtn = document.getElementById('btn-prof-home-schedule');
            if (scheduleBtn) {
                scheduleBtn.onclick = () => {
                    localStorage.setItem('selected_prof_id', prof.id);
                    localStorage.setItem('selected_prof_name', prof.full_name || 'Profissional');
                    hideOverlay('professional-home');
                    window.location.hash = '#agendamento';
                };
            }

            const chatBtn = document.getElementById('btn-prof-home-chat');
            if (chatBtn) {
                chatBtn.onclick = () => {
                    hideOverlay('professional-home');
                    window.location.hash = `#chat-msg/${prof.id}`;
                };
            }

        } catch (err) {
            console.error("Erro ao carregar home do profissional:", err);
            container.innerHTML = `<p style="color:#ff4d4d; text-align:center; padding:2rem;">Erro ao carregar perfil: ${err.message}</p>`;
        }
    };

    window.renderClientHome = async function(id) {
        const container = document.getElementById('client-home-content');
        if (!container) return;
        container.innerHTML = '<div class="loader-mini" style="margin: 50% auto;"></div>';

        try {
            let client;
            if (id.startsWith('client-')) {
                client = DATA.clients.find(c => c.id === id);
            } else {
                const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', id).single();
                if (error) throw error;
                client = data;
            }

            if (!client) throw new Error("Cliente não encontrado");

            const avatarHtml = client.avatar_url 
                ? `<img src="${client.avatar_url}" style="width:130px; height:130px; object-fit:cover; border-radius:50%; border: 4px solid var(--bg);">`
                : `<div style="width:130px; height:130px; background:linear-gradient(135deg, #444, #111); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:3rem; border-radius:50%; border: 4px solid var(--bg);">${(client.full_name || 'C')[0].toUpperCase()}</div>`;

            container.innerHTML = `
                <div class="client-cover" style="height: 180px; background: #000; position: relative; overflow: hidden;">
                    <img src="${client.cover_url || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800'}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.4;">
                    <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, transparent, #000);"></div>
                </div>
                <div style="padding: 0 1.5rem; margin-top: -65px; position: relative; text-align: center;">
                    ${avatarHtml}
                    <h2 style="margin-top: 1rem; font-size: 1.75rem; font-weight: 900; color: #fff;">${client.full_name || 'Cliente'}</h2>
                    <p style="color: #555; font-weight: 700; font-size: 0.85rem; margin-top: 4px;">Membro da Comunidade</p>
                    
                    <div style="display: flex; justify-content: center; gap: 2rem; margin-top: 2rem;">
                        <div style="text-align: center;">
                            <div style="font-size: 1.25rem; font-weight: 900; color: #fff;">${client.points || 0}</div>
                            <div style="font-size: 0.6rem; color: #555; font-weight: 800; text-transform: uppercase;">Pontos</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.25rem; font-weight: 900; color: #fff;">12</div>
                            <div style="font-size: 0.6rem; color: #555; font-weight: 800; text-transform: uppercase;">Conexões</div>
                        </div>
                    </div>

                    <div style="margin-top: 2.5rem; text-align: left;">
                        <h4 style="color: #fff; font-size: 0.9rem; font-weight: 800; margin-bottom: 1rem; letter-spacing: 1px;">BIO</h4>
                        <p style="color: #888; font-size: 0.9rem; line-height: 1.6;">${client.bio || 'Membro ativo da nossa comunidade regional.'}</p>
                    </div>

                    <div style="margin-top: 2.5rem; text-align: left;">
                        <h4 style="color: #fff; font-size: 0.9rem; font-weight: 800; margin-bottom: 1rem; letter-spacing: 1px;">LOCALIZAÇÃO</h4>
                        <div style="background: #111; padding: 1.25rem; border-radius: 20px; border: 1px solid #222; display: flex; align-items: center; gap: 1rem;">
                            <div style="font-size: 1.5rem;">📍</div>
                            <div>
                                <div style="font-weight: 800; color: #fff; font-size: 0.9rem;">${client.city || 'Cidade não informada'}</div>
                                <div style="color: #555; font-size: 0.75rem; font-weight: 600;">Residente local</div>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 2rem; text-align: left; padding-bottom: 150px;">
                        <h4 style="color: #fff; font-size: 0.9rem; font-weight: 800; margin-bottom: 1rem; letter-spacing: 1px;">INTERESSES</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                            <span style="background: #1a1a1a; padding: 6px 12px; border-radius: 10px; font-size: 0.8rem; color: #ccc; border: 1px solid #333;">Beleza</span>
                            <span style="background: #1a1a1a; padding: 6px 12px; border-radius: 10px; font-size: 0.8rem; color: #ccc; border: 1px solid #333;">Barbearia</span>
                            <span style="background: #1a1a1a; padding: 6px 12px; border-radius: 10px; font-size: 0.8rem; color: #ccc; border: 1px solid #333;">Comunidade</span>
                        </div>
                    </div>
                </div>
            `;

            const chatBtn = document.getElementById('btn-client-home-chat');
            if (chatBtn) {
                chatBtn.onclick = () => {
                    hideOverlay('client-home');
                    window.location.hash = `#chat-msg/${client.id}`;
                };
            }
        } catch (err) {
            console.error("Erro ao carregar home do cliente:", err);
            container.innerHTML = `<p style="color:#ff4d4d; text-align:center; padding:2rem;">Erro ao carregar perfil: ${err.message}</p>`;
        }
    };

    // --- Detail Renders ---
    function renderProfessionalDetail(id) {
        const prof = DATA.professionals.find(p => p.id == id);
        const container = document.getElementById('prof-detail-content');
        if (!prof || !container) return;

        const profReviews = DATA.reviews.filter(r => r.professionalId == id);

        container.innerHTML = `
            <div class="prof-detail-header" style="position: relative; margin: -1.5rem -1.5rem 2rem -1.5rem; overflow: hidden;">
                <div class="prof-cover" style="height: 220px; background: url('${prof.coverImage || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800'}');">
                    <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.9));"></div>
                </div>
                
                <div class="prof-profile-section" style="position: relative; margin-top: -80px; text-align: center; padding: 0 1.5rem;">
                    <div class="avatar-circle premium" style="width: 130px; height: 130px; font-size: 3.5rem; margin: 0 auto 1.25rem; background: ${prof.avatarColor}; position: relative; border-radius: 35px;">
                        ${prof.avatar}
                        <div style="position: absolute; bottom: 8px; right: 8px; background: #4ade80; width: 28px; height: 28px; border-radius: 50%; border: 4px solid var(--bg); display: ${prof.verified ? 'block' : 'none'};"></div>
                    </div>
                    <h2 style="font-size: 2.2rem; font-weight: 900; color: #fff; letter-spacing: -1px; line-height: 1;">${prof.name}</h2>
                    <p style="color: var(--primary-accent); font-weight: 800; font-size: 0.9rem; margin-top: 8px; text-transform: uppercase; letter-spacing: 2px;">${prof.specialty}</p>
                    
                    <div style="display: flex; justify-content: center; gap: 1rem; margin-top: 2rem; background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05);">
                        <div style="flex: 1; text-align: center;">
                            <div style="font-size: 1.25rem; font-weight: 900; color: #fff;">★ ${prof.rating}</div>
                            <div style="font-size: 0.65rem; color: #555; font-weight: 800; text-transform: uppercase; margin-top: 2px;">Rating</div>
                        </div>
                        <div style="width: 1px; background: #222;"></div>
                        <div style="flex: 1; text-align: center;">
                            <div style="font-size: 1.25rem; font-weight: 900; color: #fff;">${prof.reviews}</div>
                            <div style="font-size: 0.65rem; color: #555; font-weight: 800; text-transform: uppercase; margin-top: 2px;">Reviews</div>
                        </div>
                        <div style="width: 1px; background: #222;"></div>
                        <div style="flex: 1; text-align: center;">
                            <div style="font-size: 1.25rem; font-weight: 900; color: #fff;">${prof.distance}</div>
                            <div style="font-size: 0.65rem; color: #555; font-weight: 800; text-transform: uppercase; margin-top: 2px;">Distância</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="prof-detail-body" style="padding-bottom: 6rem;">
                <div class="section" style="margin-bottom: 3rem;">
                    <h4 style="margin-bottom: 1.25rem; font-size: 1.1rem; font-weight: 900; color: #fff; letter-spacing: -0.5px;">Sobre</h4>
                    <p style="color: #888; font-size: 1rem; line-height: 1.8; font-weight: 500;">${prof.bio}</p>
                </div>

                <div class="section" style="margin-bottom: 3rem;">
                    <h4 style="margin-bottom: 1.75rem; font-size: 1.1rem; font-weight: 900; color: #fff; letter-spacing: -0.5px;">Serviços em Destaque</h4>
                    ${prof.services.map(s => `
                        <div class="card" style="margin-bottom: 1.25rem; background: #111; border: 1px solid #222; padding: 1.5rem; border-radius: 24px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 800; color: #fff; font-size: 1.15rem; letter-spacing: -0.3px;">${s.name}</div>
                                    <div style="font-size: 0.85rem; color: #555; margin-top: 6px; line-height: 1.5; font-weight: 500;">${s.description}</div>
                                    <div style="display: flex; gap: 15px; margin-top: 12px;">
                                        <div style="font-size: 0.75rem; color: #444; font-weight: 800; background: #1a1a1a; padding: 4px 10px; border-radius: 8px;">🕒 ${s.duration} MIN</div>
                                        <div style="font-size: 0.75rem; color: #444; font-weight: 800; background: #1a1a1a; padding: 4px 10px; border-radius: 8px;">✨ PREMIUM</div>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="color: #fff; font-weight: 900; font-size: 1.2rem;">R$ ${s.price}</div>
                                    <button class="btn btn-sm" style="margin-top: 15px; background: var(--primary-accent); color: #fff; font-weight: 900; padding: 8px 16px; border-radius: 12px; font-size: 0.8rem; box-shadow: 0 5px 15px rgba(37, 99, 235, 0.2);" onclick="location.hash='#agendar/${prof.id}/${s.id}'">AGENDAR</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Gallery Section -->
                <div class="section" style="margin-bottom: 3rem;">
                    <h4 style="margin-bottom: 1.75rem; font-size: 1.1rem; font-weight: 900; color: #fff; letter-spacing: -0.5px;">Portfólio</h4>
                    <div class="gallery-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                        ${(prof.gallery || []).map(img => `
                            <div style="aspect-ratio: 1; border-radius: 20px; overflow: hidden; background: #111; border: 1px solid #222;">
                                <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Reviews Section -->
                <div class="section" style="margin-bottom: 3rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.75rem;">
                        <h4 style="font-size: 1.1rem; font-weight: 900; color: #fff; letter-spacing: -0.5px; margin: 0;">Avaliações</h4>
                        <span style="color: var(--primary-accent); font-size: 0.75rem; font-weight: 900; letter-spacing: 1px;">VER TODAS</span>
                    </div>
                    ${profReviews.length > 0 ? profReviews.map(r => `
                        <div class="review-card" style="background: #0a0a0a; padding: 1.5rem; border-radius: 24px; border: 1px solid #1a1a1a; margin-bottom: 1.25rem;">
                            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
                                <div style="width: 40px; height: 40px; background: #222; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: 900; color: #fff;">${r.authorAvatar}</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 800; color: #fff; font-size: 0.95rem;">${r.author}</div>
                                    <div style="color: #f59e0b; font-size: 0.7rem; letter-spacing: 2px;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
                                </div>
                                <span style="font-size: 0.75rem; color: #444; font-weight: 800; text-transform: uppercase;">${r.date}</span>
                            </div>
                            <p style="color: #777; font-size: 0.95rem; line-height: 1.6; font-weight: 500; margin: 0;">${r.comment}</p>
                        </div>
                    `).join('') : '<p style="color: #444; text-align: center; padding: 2rem; font-weight: 700;">Ainda não há avaliações.</p>'}
                </div>
            </div>
        `;

        const myType = localStorage.getItem('user_type');
            const canMessage = (myType === 'admin') || (myType === 'client' && prof.user_type === 'professional') || (myType === 'professional' && prof.user_type === 'client');
            const messageButton = canMessage ? `<button class="btn" style="flex: 1; background: #1a1a1a; color: #fff; border: 1px solid #333; font-weight: 900; height: 58px; border-radius: 20px; font-size: 0.9rem; letter-spacing: 1px;" onclick="location.hash='#chat-msg/${prof.id}'">MENSAGEM</button>` : '';

            detailOverlay.innerHTML += `
                <div class="floating-actions" style="position: fixed; bottom: 0; left: 0; width: 100%; display: flex; gap: 12px; z-index: 1000; box-shadow: 0 -10px 40px rgba(0,0,0,0.8);">
                    ${messageButton}
                    <button class="btn" style="flex: 2; background: #fff; color: #000; font-weight: 900; height: 58px; border-radius: 20px; font-size: 0.9rem; letter-spacing: 1px;" onclick="location.hash='#agendar/${prof.id}'">AGENDAR AGORA</button>
                </div>
            `;
        }

    function withTimeout(promise, ms, errorMessage = "A requisição excedeu o tempo limite") {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms))
        ]);
    }

    // Cache do UUID do admin para evitar queries repetidas
    let _cachedAdminId = localStorage.getItem('zero_support_admin_id') || null;

    async function resolveTargetId(id) {
        if (!id) return null;
        
        // SUPPORT ROUTING:
        if (id === 'support') {
            // Verificação imediata: sou o próprio admin?
            const me = await getCurrentUser();
            if (!me) return null;

            const userEmail = me.email ? me.email.toLowerCase() : '';
            const userMetaName = me.user_metadata?.full_name ? me.user_metadata.full_name.toLowerCase() : '';
            const storedType = localStorage.getItem('user_type') || '';
            const isZeroAdm = userEmail.includes('admin@zerosynapses.com') || userEmail.includes('lara.cabeleireira@teste.com') || 
                              userMetaName.includes('zerozynapse') ||
                              storedType === 'admin';

            if (isZeroAdm) {
                // Sou o admin, não posso falar com o próprio suporte
                return 'SELF_ADMIN';
            }

            // 1. Retorna do cache imediatamente se disponível
            if (_cachedAdminId) {
                console.log("✅ Admin ID resolvido via cache:", _cachedAdminId);
                return _cachedAdminId;
            }

            // 2. Busca única combinada: nome OU user_type admin (mais eficiente)
            try {
                const { data: adminProfiles, error } = await withTimeout(
                    supabaseClient
                        .from('profiles')
                        .select('id, full_name, user_type')
                        .or('full_name.ilike.%zerozynapse%,user_type.eq.admin')
                        .order('created_at', { ascending: true })
                        .limit(5),
                    6000,
                    "Timeout ao buscar conta de suporte"
                );

                if (!error && adminProfiles && adminProfiles.length > 0) {
                    // Prioriza conta com nome ZeroZynapses; senão usa qualquer admin
                    const namedAdmin = adminProfiles.find(p => 
                        p.full_name && p.full_name.toLowerCase().includes('zerozynapse')
                    );
                    const resolvedAdmin = namedAdmin || adminProfiles[0];
                    
                    if (resolvedAdmin) {
                        _cachedAdminId = resolvedAdmin.id;
                    }
                }
            } catch (err) {
                console.warn("⚠️ Não foi possível localizar a conta de suporte:", err.message || err);
            }

            // 3. Fallback Supremo: Forçar o ID do Admin diretamente
            if (!_cachedAdminId) {
                console.warn("Usando Fallback Hardcoded para a conta ZeroZynapses.");
                _cachedAdminId = 'e33bdd17-f6bc-4c72-82cf-c3f76124aca0';
            }

            // Salva no cache e retorna
            if (_cachedAdminId) {
                localStorage.setItem('zero_support_admin_id', _cachedAdminId);
                console.log("✅ Admin ID resolvido e cacheado:", _cachedAdminId);
                return _cachedAdminId;
            }

            return null;
        }
        
        // Match specific static IDs to their new UUIDs from the sync script
        const staticToUuid = {
            'prof-101': 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
            'prof-102': 'c3d4e5f6-a7b8-4c7d-0e1f-2a3b4c5d6e7f',
            'prof-103': 'b2c3d4e5-f6a7-4b6c-9d8e-1f0a2b3c4d5e'
        };
        if (staticToUuid[id]) return staticToUuid[id];

        // If it's already a UUID
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidPattern.test(id)) return id;

        // Fallback: look up by name in Supabase
        if (id.startsWith('prof-') || id.startsWith('cli-')) {
            const person = DATA.professionals.find(p => p.id === id) || DATA.clients.find(c => c.id === id);
            if (person) {
                try {
                    const { data: profile } = await withTimeout(
                        supabaseClient.from('profiles')
                            .select('id')
                            .eq('full_name', person.full_name || person.name)
                            .maybeSingle(),
                        4000
                    );
                    if (profile) return profile.id;
                } catch (err) {
                    console.warn("Timeout/error looking up person profile:", err.message || err);
                }
            }
        }
        return null;
    }

    // Limpa cache do admin quando ele faz login (garante UUID atualizado)
    function clearAdminCache() {
        _cachedAdminId = null;
        localStorage.removeItem('zero_support_admin_id');
    }

    async function renderChatDetail(id) {
        const container = document.getElementById('chat-messages-container');
        const nameEl = document.getElementById('chat-name');
        const avatarEl = document.getElementById('chat-avatar');
        
        if (!container || !nameEl || !avatarEl) return;

        // 1. Initial UI from static DATA (Instant feedback)
        let localProfile = null;
        if (id === 'support') {
            nameEl.innerText = "Suporte";
            avatarEl.innerHTML = `<img src="/assets/logo.png" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            avatarEl.style.background = 'transparent';
        } else {
            localProfile = DATA.professionals.find(p => p.id == id) || DATA.clients.find(p => p.id == id);
            if (localProfile) {
                nameEl.innerText = localProfile.full_name || localProfile.name || "Usuário";
                if (localProfile.avatar_url) {
                    avatarEl.innerHTML = `<img src="${localProfile.avatar_url}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                } else {
                    avatarEl.style.background = localProfile.avatarColor || '#333';
                    avatarEl.innerText = (localProfile.full_name || localProfile.name || 'U')[0].toUpperCase();
                }
            } else {
                nameEl.innerText = "Usuário";
                avatarEl.innerHTML = '';
            }
        }

        container.innerHTML = '<div class="loader-mini" style="margin: 2rem auto;"></div>';

        // 2. Resolve real Supabase ID
        const realId = await resolveTargetId(id);
        window.currentChatId = id;
        window.currentRealId = realId;

        if (!realId || realId === 'SELF_ADMIN') {
            if (realId === 'SELF_ADMIN') {
                 container.innerHTML = `
                    <div style="text-align:center; padding:2rem;">
                        <div style="font-size:2rem; margin-bottom:1rem;">🛡️</div>
                        <p style="color:#a855f7; font-size:0.9rem; font-weight:700;">Central de Administração</p>
                        <p style="color:#666; font-size:0.8rem; margin-top:0.5rem;">Você está logado na conta de suporte.<br>Volte para a lista de conversas para atender seus clientes.</p>
                    </div>
                `;
            } else if (id === 'support') {
                // Suporte não configurado no banco — avisa o usuário mas mantém o chat funcional no modo local
                container.innerHTML = `
                    <div style="text-align:center; padding:2rem;">
                        <div style="font-size:2rem; margin-bottom:1rem;">⚙️</div>
                        <p style="color:#f59e0b; font-size:0.9rem; font-weight:700;">Suporte temporariamente indisponível</p>
                        <p style="color:#666; font-size:0.8rem; margin-top:0.5rem;">A conta de suporte não foi encontrada no banco de dados.<br>Execute o script <strong>fix_messages_full.sql</strong> no Supabase para ativar.</p>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div style="text-align:center; padding:2rem; opacity:0.8;">
                        <p style="color:#888; font-size:0.9rem;">Este perfil de demonstração não está sincronizado com o banco de dados.</p>
                        <p style="color:#555; font-size:0.8rem; margin-top:0.5rem;">As mensagens enviadas aqui não serão salvas permanentemente.</p>
                    </div>
                `;
            }
            return;
        }

        // 3. Update Name/Avatar if we found a Supabase profile that differs
        if (realId && !localProfile && id !== 'support') {
            try {
                const { data: profile } = await withTimeout(
                    supabaseClient.from('profiles').select('*').eq('id', realId).maybeSingle(),
                    3000
                );
                if (profile) {
                    nameEl.innerText = profile.full_name || "Usuário";
                    if (profile.avatar_url) {
                        avatarEl.innerHTML = `<img src="${profile.avatar_url}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                    }
                }
            } catch (err) {
                console.warn("Soft profile detail fetch timeout/error:", err);
            }
        }

        fetchMessages(id);
        setupRealtimeMessages(id);
        renderQuickChatHistory(id);
        
        // Mark as read when entering chat
        if (realId) {
            markAsRead(realId);
        }
    }

    async function renderQuickChatHistory(activeChatId) {
        const container = document.getElementById('chat-quick-history');
        if (!container) return;

        const user = await getCurrentUser();
        const userEmail = user?.email || 'guest';
        const localConvs = getLocalChatHistory(userEmail);
        
        container.innerHTML = localConvs.map(conv => {
            const isSupport = conv.id === 'support';
            const prof = isSupport ? {
                id: 'support',
                full_name: 'Suporte',
                avatar_url: '/assets/logo.png',
                avatarColor: 'transparent'
            } : (DATA.professionals.find(p => p.id === conv.id) || 
                 DATA.clients.find(c => c.id === conv.id) || {
                     id: conv.id,
                     full_name: conv.professionalName || 'Contato',
                     avatar_url: ''
                 });
            
            const isCurrent = conv.id === activeChatId;
            const avatarHtml = prof.avatar_url 
                ? `<img src="${prof.avatar_url}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` 
                : `<span style="font-size: 0.8rem; font-weight:800; color:#fff;">${(prof.full_name || prof.name || 'P')[0].toUpperCase()}</span>`;
            
            const activeStyle = isCurrent 
                ? 'border: 2px solid #a855f7; box-shadow: 0 0 10px rgba(168, 85, 247, 0.5); transform: scale(1.1);' 
                : 'border: 1px solid #333; opacity: 0.7;';

            return `
                <div class="quick-chat-avatar" onclick="window.location.hash='#chat-msg/${conv.id}'" style="width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: ${prof.avatarColor || '#222'}; cursor: pointer; flex-shrink: 0; transition: all 0.2s; position: relative; ${activeStyle}">
                    ${avatarHtml}
                    <span style="position: absolute; bottom: -14px; font-size: 0.6rem; color: ${isCurrent ? '#a855f7' : '#999'}; font-weight: 800; max-width: 50px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; display: block; width: 100%;">${(prof.full_name || prof.name || 'Contato').split(' ')[0]}</span>
                </div>
            `;
        }).join('') + `
            <div style="width: 20px; flex-shrink: 0;"></div>
        `;
    }

    async function markAsRead(partnerId) {
        if (!supabaseClient) return;
        const user = await getCurrentUser();
        if (!user) return;

        try {
            await Promise.all([
                supabaseClient.from('messages')
                    .update({ is_read: true })
                    .eq('receiver_id', user.id)
                    .eq('sender_id', partnerId)
                    .eq('is_read', false),
                supabaseClient.from('notifications')
                    .update({ is_read: true })
                    .eq('user_id', user.id)
                    .eq('sender_id', partnerId)
                    .eq('type', 'message')
                    .eq('is_read', false)
            ]);
        } catch (err) {
            console.error("Error marking messages/notifications as read:", err);
        }
            
        updateNotificationBadges();
    }

    async function fetchMessages(chatId) {
        if (!supabaseClient) return;
        
        const container = document.getElementById('chat-messages-container');
        if (!container) return;

        const user = await getCurrentUser();
        if (!user) return;

        // Resolve if current user is ZeroZynapse ADM
        let isZeroAdm = false;
        const storedType = localStorage.getItem('user_type') || '';
        isZeroAdm = storedType === 'admin' ||
                    user.email?.toLowerCase().includes('admin@zerosynapses.com') || user.email?.toLowerCase().includes('lara.cabeleireira@teste.com') || 
                    user.user_metadata?.full_name?.toLowerCase().includes('zerozynapse');

        const targetId = await resolveTargetId(chatId);
        if (!targetId || targetId === 'SELF_ADMIN') {
            if (targetId === 'SELF_ADMIN') {
                 container.innerHTML = `
                    <div style="text-align:center; padding:2rem;">
                        <div style="font-size:2rem; margin-bottom:1rem;">🛡️</div>
                        <p style="color:#a855f7; font-size:0.9rem; font-weight:700;">Central de Administração</p>
                        <p style="color:#666; font-size:0.8rem; margin-top:0.5rem;">Você está logado na conta de suporte.<br>Volte para a lista de conversas para atender seus clientes.</p>
                    </div>
                `;
            } else if (chatId === 'support') {
                container.innerHTML = `
                    <div style="text-align:center; padding:2rem;">
                        <div style="font-size:2rem; margin-bottom:1rem;">⚙️</div>
                        <p style="color:#f59e0b; font-size:0.9rem; font-weight:700;">Suporte não configurado</p>
                        <p style="color:#666; font-size:0.8rem; margin-top:0.5rem;">Execute <strong>fix_chat_definitivo.sql</strong> no Supabase para ativar o sistema de suporte.</p>
                    </div>
                `;
            } else {
                container.innerHTML = '<p style="text-align:center; padding:2rem; color:#444;">Este perfil de teste não existe no banco de dados. Use a Busca para falar com profissionais reais.</p>';
            }
            return;
        }

        // Mostrar loading
        container.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; height:100%; opacity:0.4;">
                <div class="loader-mini"></div>
            </div>
        `;

        let messages = [];
        let dbError = null;

        try {
            const result = await supabaseClient
                    .from('messages')
                    .select('*')
                    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${user.id})`)
                    .order('created_at', { ascending: true });

            if (result.error) {
                dbError = result.error;
                throw result.error;
            }
            messages = result.data || [];
        } catch (err) {
            const isRLS = err.message?.includes('permission') || err.code === '42501' || err.code === 'PGRST301';
            
            console.warn("⚠️ Erro ao buscar mensagens do banco:", err.message || err);

            // Se for RLS bloqueando
            if (isRLS) {
                container.innerHTML = `
                    <div style="text-align:center; padding:3rem 2rem;">
                        <div style="font-size:2rem; margin-bottom:1rem;">🔒</div>
                        <p style="color:#f59e0b; font-size:0.9rem; font-weight:700; margin-bottom:0.5rem;">Banco de dados bloqueado (RLS)</p>
                        <p style="color:#666; font-size:0.8rem; line-height:1.5; margin-bottom:1.5rem;">
                            As políticas de segurança estão bloqueando o acesso.<br>
                            Execute o SQL abaixo no <strong>Supabase SQL Editor</strong>:
                        </p>
                        <div style="background:#0a0a0a; border:1px solid #333; border-radius:12px; padding:1rem; text-align:left; font-size:0.7rem; font-family:monospace; color:#4ade80; line-height:1.6; margin-bottom:1rem; max-height:180px; overflow-y:auto;">
DROP POLICY IF EXISTS "Users can see messages they sent or received" ON public.messages;<br>
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;<br>
DROP POLICY IF EXISTS "Permitir leitura livre de mensagens" ON public.messages;<br>
DROP POLICY IF EXISTS "Permitir insercao livre de mensagens" ON public.messages;<br>
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;<br>
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;<br>
CREATE POLICY "msg_sel" ON public.messages FOR SELECT USING (true);<br>
CREATE POLICY "msg_ins" ON public.messages FOR INSERT WITH CHECK (true);<br>
CREATE POLICY "msg_upd" ON public.messages FOR UPDATE USING (true);
                        </div>
                        <button onclick="fetchMessages('${chatId}')" style="background:#a855f7; color:#fff; border:none; padding:10px 24px; border-radius:12px; font-weight:800; cursor:pointer; font-size:0.85rem;">
                            🔄 Tentar Novamente
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div style="text-align:center; padding:4rem 1rem; opacity:0.4;">
                        <p style="font-size:0.9rem; font-weight:600;">Inicie uma conversa segura.</p>
                        <p style="font-size:0.8rem;">As mensagens são protegidas pela comunidade.</p>
                    </div>
                `;
            }
            return;
        }

        if (messages && messages.length > 0) {
            container.innerHTML = messages.map(m => {
                const isMine = m.sender_id === user.id;
                const timeStr = new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return `
                    <div class="message ${isMine ? 'me' : 'them'}">
                        <div class="message-content">${m.content}</div>
                        <span class="message-time">${timeStr}</span>
                    </div>
                `;
            }).join('');
            container.scrollTop = container.scrollHeight;
        } else {
             container.innerHTML = `
                <div style="text-align: center; padding: 4rem 1rem; opacity: 0.3;">
                    <p style="font-size: 0.9rem; font-weight: 600;">Inicie uma conversa segura.</p>
                    <p style="font-size: 0.8rem;">As mensagens são protegidas pela comunidade.</p>
                </div>
            `;
        }
    }


    // --- Realtime Subscription ---
    async function setupRealtimeMessages(chatId) {
        if (!supabaseClient) return;
        
        if (window.currentChatSubscription) {
            supabaseClient.removeChannel(window.currentChatSubscription);
        }

        const user = await getCurrentUser();
        if (!user) return;

        const targetId = await resolveTargetId(chatId);
        if (!targetId) return;

        window.currentChatSubscription = supabaseClient
            .channel(`chat-detail-${chatId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                const msg = payload.new;
                const isRelevant = (msg.sender_id === user.id && msg.receiver_id === targetId) || 
                                   (msg.sender_id === targetId && msg.receiver_id === user.id);
                
                if (isRelevant) {
                    // Skip if this message was already rendered by handleSendMessage
                    if (window._sentMessageIds && window._sentMessageIds.has(msg.id)) {
                        console.log("⏭️ Skipping duplicate realtime message (already rendered):", msg.id);
                        return;
                    }
                    renderSingleMessage(msg, user.id);
                }
            })
            .subscribe();
    }

    function renderSingleMessage(msg, myId) {
        const container = document.getElementById('chat-messages-container');
        if (!container) return;

        // Remove empty state placeholder if present
        const emptyState = container.querySelector('div[style*="opacity: 0.3"]');
        if (emptyState) emptyState.remove();
        const loaderState = container.querySelector('.loader-mini');
        if (loaderState) loaderState.parentElement?.remove();

        const isMine = msg.sender_id === myId;
        const timeStr = new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        const div = document.createElement('div');
        div.className = `message ${isMine ? 'me' : 'them'}`;
        div.dataset.msgId = msg.id || '';
        div.innerHTML = `
            <div class="message-content">${msg.content}</div>
            <span class="message-time">${timeStr}</span>
        `;
        
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }


    // --- Global Chat Send Function ---
    function setupChatInput() {
        // Use event delegation for the send button to be more robust
        document.addEventListener('click', async (e) => {
            const btn = e.target.closest('#btn-send-msg');
            if (btn) {
                e.preventDefault();
                await handleSendMessage();
            }
        });

        // Keydown listener for the input
        document.addEventListener('keydown', async (e) => {
            if (e.target.id === 'chat-input' && e.key === 'Enter') {
                e.preventDefault();
                await handleSendMessage();
            }
        });
    }

    async function handleSendMessage() {
        const input = document.getElementById('chat-input');
        if (!input) return;

        const text = input.value.trim();
        const chatId = window.currentChatId;
        console.log("📤 handleSendMessage:", { chatId, text });

        if (!text || !chatId) return;

        // Clear input immediately to give a lightning-fast, premium feel!
        input.value = '';

        const user = await getCurrentUser();
        const realUser = user;
        const realSenderId = user?.id;
        const hasRealSession = !!user && user.id !== '00000000-0000-0000-0000-000000000000';
        const isOfflineDemo = !supabaseClient || !user;

        // Resolve receiver Supabase ID
        let receiverId = null;
        if (!isOfflineDemo) {
            try {
                receiverId = await resolveTargetId(chatId);
            } catch (err) {
                console.warn("Error resolving receiver ID:", err);
            }
        }

        // 2. Offline / Demo Fallback Mode
        if (isOfflineDemo) {
            console.log("Saving message locally (Offline/Demo fallback)...");
            const userEmail = user?.email || 'guest';
            const localConvs = getLocalChatHistory(userEmail);
            
            let localConv = localConvs.find(c => c.id === chatId);
            if (!localConv) {
                const isSupport = chatId === 'support';
                const prof = isSupport ? {
                    id: 'support',
                    full_name: 'Suporte',
                    avatar_url: '/assets/logo.png',
                    avatarColor: '#a855f7'
                } : (DATA.professionals.find(p => p.id === chatId) || 
                     DATA.clients.find(c => c.id === chatId) || {
                         id: chatId,
                         full_name: 'Contato',
                         avatar_url: ''
                     });
                
                localConv = {
                    id: chatId,
                    professionalName: prof.full_name || 'Contato',
                    professionalAvatar: (prof.full_name || 'C')[0].toUpperCase(),
                    avatarColor: prof.avatarColor || '#3B82F6',
                    lastMessage: '',
                    time: 'Agora',
                    messages: []
                };
                localConvs.push(localConv);
            }

            // Push message to local array
            const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            localConv.messages.push({
                sender: 'user',
                text: text,
                time: nowTime
            });
            localConv.lastMessage = text;
            localConv.time = nowTime;

            saveLocalChatHistory(userEmail, localConvs);

            // Re-render chat view
            fetchMessages(chatId);
            renderChatList();
            return;
        }

        // Sem receiverId: conta de suporte não encontrada no banco
        if (!receiverId || receiverId === 'SELF_ADMIN') {
            if (receiverId === 'SELF_ADMIN') {
                // Admin falando com si mesmo — ignore silenciosamente
                return;
            }
            if (chatId === 'support') {
                const container = document.getElementById('chat-messages-container');
                if (container) {
                    container.innerHTML = `
                        <div style="text-align:center; padding:2rem;">
                            <div style="font-size:2rem; margin-bottom:1rem;">⚠️</div>
                            <p style="color:#f59e0b; font-size:0.9rem; font-weight:700;">Conta de suporte não encontrada</p>
                            <p style="color:#666; font-size:0.8rem; margin-top:0.5rem;">Execute o script <strong>fix_chat_definitivo.sql</strong> no Supabase.<br>Depois, faça logout e login novamente com a conta ZeroZynapses.</p>
                        </div>
                    `;
                }
            }
            return;
        }

        // 3. Online Mode (Supabase)
        // Use the REAL session user ID as sender_id so it matches auth.uid() in RLS
        const senderId = realSenderId;
        
        if (!senderId) {
            console.error("❌ Cannot determine real sender ID. Aborting DB send.");
            alert("Erro: Sessão expirada. Faça login novamente para enviar mensagens.");
            return;
        }

        try {
            console.log("📨 Sending to Supabase:", { sender: senderId, receiver: receiverId, content: text.substring(0, 50) + '...' });
            
            // Track this message to avoid duplicate rendering from realtime
            const msgTimestamp = Date.now();
            if (!window._sentMessageTimestamps) window._sentMessageTimestamps = new Set();
            window._sentMessageTimestamps.add(msgTimestamp);
            // Clean up old timestamps after 10 seconds
            setTimeout(() => window._sentMessageTimestamps.delete(msgTimestamp), 10000);
            
            const { data: insertedMsg, error } = await supabaseClient.from('messages').insert([{
                sender_id: senderId,
                receiver_id: receiverId,
                content: text
            }]).select().single();

            if (error) {
                if (error.code === 'PGRST116' || error.message.includes('schema cache')) {
                    throw new Error("A tabela de mensagens não existe no banco de dados. Execute 'fix_chat_definitivo.sql' no SQL Editor do Supabase.");
                }
                if (error.message.includes('row-level security') || error.code === '42501') {
                    throw new Error("Erro de permissão RLS. Execute o script 'fix_chat_definitivo.sql' no SQL Editor do Supabase para corrigir as políticas.");
                }
                throw error;
            }

            console.log("✅ Message sent and saved to database successfully!", insertedMsg?.id);
            
            // Track the inserted message ID to prevent duplicate rendering
            if (insertedMsg?.id) {
                if (!window._sentMessageIds) window._sentMessageIds = new Set();
                window._sentMessageIds.add(insertedMsg.id);
                setTimeout(() => window._sentMessageIds.delete(insertedMsg.id), 15000);
            }

            // Render the sent message immediately in the UI (don't wait for realtime)
            renderSingleMessage({
                id: insertedMsg?.id || crypto.randomUUID(),
                sender_id: senderId,
                receiver_id: receiverId,
                content: text,
                created_at: insertedMsg?.created_at || new Date().toISOString(),
                is_read: false
            }, senderId);

            // Update chat list in background
            renderChatList();
        } catch (err) {
            console.error("❌ Error sending message to database:", err);
            alert("Erro ao enviar mensagem:\n" + (err.message || err));
            
            // Put the text back in the input so user can retry
            input.value = text;
        }
    }

    // --- Helper Logic ---
    function renderTimeSlots(selectedDate) {
        const select = document.getElementById('agendamento-hora');
        if (!select) return;

        if (!selectedDate) {
            select.innerHTML = '<option value="">Selecione a data primeiro...</option>';
            return;
        }

        let options = '<option value="">Selecione um horário...</option>';
        DATA.timeSlots.forEach(slot => {
            const conflicted = isSlotConflicted(slot, selectedDate);
            if (!conflicted) {
                options += `<option value="${slot}">${slot}</option>`;
            } else {
                options += `<option value="${slot}" disabled>${slot} (Indisponível)</option>`;
            }
        });
        select.innerHTML = options;
    }

    const dateInput = document.getElementById('agendamento-data');
    if (dateInput) {
        // Define data mínima como hoje
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
        
        dateInput.onchange = (e) => {
            const val = e.target.value;
            if (val) {
                const [year, month, day] = val.split('-');
                renderTimeSlots(`${day}/${month}/${year}`);
            } else {
                renderTimeSlots('');
            }
        };
    }

    function isSlotConflicted(newSlot, newDate, profId) {
        if (!newDate) return false;
        const apps = JSON.parse(localStorage.getItem('user_appointments') || '[]');
        const [nH, nM] = newSlot.split(':').map(Number);
        const nT = nH * 60 + nM;
        return apps.some(a => {
            // Só conflita se for o mesmo profissional e o mesmo dia
            if (a.date !== newDate || a.profId !== profId) return false;
            const [h, m] = a.time.split(':').map(Number);
            const t = h * 60 + m;
            return Math.abs(nT - t) < 30;
        });
    }

    function setupFinanceListeners() {
        const costInput = document.getElementById('finance-cost');
        const revInput = document.getElementById('finance-revenue');
        const profitValue = document.getElementById('profit-value');
        const form = document.getElementById('finance-form');

        const update = () => {
            const p = (parseFloat(revInput.value)||0) - (parseFloat(costInput.value)||0);
            profitValue.innerText = `R$ ${p.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
            profitValue.style.color = p >= 0 ? '#4ade80' : '#f87171';
        };

        if (costInput) costInput.oninput = update;
        if (revInput) revInput.oninput = update;
        if (form) form.onsubmit = async (e) => {
            e.preventDefault();
            const record = { cost: parseFloat(costInput.value), revenue: parseFloat(revInput.value), profit: parseFloat(revInput.value) - parseFloat(costInput.value), description: document.getElementById('finance-desc').value, created_at: new Date().toISOString() };
            const { error } = await supabaseClient.from('finance_records').insert([record]);
            if (error) return alert("Erro ao salvar.");
            showSuccessModal('Salvo!', 'Registro financeiro armazenado.', () => { form.reset(); update(); renderFinanceList(); });
        };
    }

    async function renderFinanceList() {
        const container = document.getElementById('finance-list');
        if (!container) return;
        const { data } = await supabaseClient.from('finance_records').select('*').order('created_at', { ascending: false });
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="color:#555; text-align:center; padding: 2.5rem;">Nenhum registro financeiro.</p>';
            return;
        }
        container.innerHTML = data.map(d => `
            <div style="background:#111; padding:1.25rem; border-radius:16px; margin-bottom:1rem; border:1px solid #222; display:flex; justify-content:space-between; align-items: center;">
                <div>
                    <div style="font-weight:700; color: #fff;">${d.description}</div>
                    <div style="font-size: 0.7rem; color: #444; margin-top: 2px;">${new Date(d.created_at).toLocaleDateString('pt-BR')}</div>
                </div>
                <div style="font-weight:900; font-size: 1.1rem; color:${d.profit>=0?'#4ade80':'#f87171'}">
                    ${d.profit >= 0 ? '+' : ''} R$ ${d.profit.toLocaleString('pt-BR', {minimumFractionDigits:2})}
                </div>
            </div>
        `).join('');
    }

    function renderCategories() {
        const container = document.getElementById('home-categories');
        if (!container) return;
        container.innerHTML = (DATA.categories || []).map(cat => `
            <div class="category-item" onclick="location.hash='#busca'">
                <div class="category-icon" style="background: #111; border: 1px solid #222; border-radius: 16px; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 8px;">${cat.icon}</div>
                <span style="font-size: 0.75rem; font-weight: 700; color: #999;">${cat.name}</span>
            </div>
        `).join('');
    }

    function renderFeatured() {
        const container = document.getElementById('featured-professionals');
        if (!container) return;
        container.innerHTML = (DATA.professionals || []).filter(p => p.featured).map(p => {
            const avatarHtml = p.avatar_url 
                ? `<img src="${p.avatar_url}" style="width:100%; height:100%; object-fit:cover;">` 
                : `<span style="font-weight: 800;">${p.avatar || (p.full_name || p.name || 'P')[0].toUpperCase()}</span>`;
            
            return `
                <div class="prof-card" onclick="location.hash='#profissional/${p.id}'" style="min-width: 160px; background: #111; border: 1px solid #222; padding: 1.25rem; border-radius: 20px; text-align: center; cursor: pointer; transition: transform 0.2s;">
                    <div class="avatar-circle" style="background:${p.avatar_url ? 'transparent' : (p.avatarColor || 'linear-gradient(135deg,#333,#111)')}; margin: 0 auto 1rem; width: 50px; height: 50px; font-size: 1.25rem; border: 2px solid #222; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink:0;">
                        ${avatarHtml}
                    </div>
                    <h4 style="font-size: 0.95rem; font-weight: 800; color: #fff;">${p.full_name || p.name}</h4>
                    <p style="font-size: 0.75rem; color: #666; font-weight: 600; margin-top: 2px;">${p.specialty}</p>
                    <div style="margin-top: 12px; font-weight: 900; font-size: 0.8rem; color: #fff;">★ ${p.rating}</div>
                </div>
            `;
        }).join('');
    }

    function renderSearchResults(query = '') {
        const container = document.getElementById('search-results');
        if (!container) return;
        
        const filtered = DATA.professionals.filter(p => 
            (p.full_name || p.name || '').toLowerCase().includes(query.toLowerCase()) || 
            (p.specialty || '').toLowerCase().includes(query.toLowerCase())
        );

        container.innerHTML = filtered.map(p => {
            const avatarHtml = p.avatar_url 
                ? `<img src="${p.avatar_url}" style="width:100%; height:100%; object-fit:cover;">` 
                : `<span style="font-weight: 800;">${p.avatar || (p.full_name || p.name || 'P')[0].toUpperCase()}</span>`;

            return `
                <div class="prof-card" onclick="location.hash='#profissional/${p.id}'" style="display: flex; gap: 1.25rem; align-items: center; padding: 1.25rem; background: #111; border: 1px solid #222; border-radius: 20px; margin-bottom: 1rem; cursor: pointer; transition: transform 0.2s;">
                    <div class="avatar-circle" style="background:${p.avatar_url ? 'transparent' : (p.avatarColor || 'linear-gradient(135deg,#333,#111)')}; width: 60px; height: 60px; font-size: 1.5rem; border: 2px solid #222; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
                        ${avatarHtml}
                    </div>
                    <div>
                        <h4 style="font-size: 1.1rem; font-weight: 800; color: #fff;">${p.full_name || p.name}</h4>
                        <p style="font-size: 0.85rem; color: #666; font-weight: 600; margin-top: 2px;">${p.specialty} • ${p.distance || '0.8km'}</p>
                        <div style="margin-top: 8px; font-weight: 900; font-size: 0.85rem; color: #fff;">★ ${p.rating} (${p.reviews || 0})</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.chatFilter = 'all';
    window.setChatFilter = function(type) {
        window.chatFilter = type;
        document.querySelectorAll('#admin-chat-filters .filter-chip').forEach(c => {
            const isMatch = (type === 'all' && c.innerText === 'Todos') || 
                            (type === 'professional' && c.innerText.includes('Profissional')) ||
                            (type === 'client' && c.innerText.includes('Cliente'));
            c.classList.toggle('active', isMatch);
        });
        renderChatList();
    };

    async function renderChatList() {
        const chatList = document.getElementById('chat-list');
        if (!chatList || !supabaseClient) return;

        // Sempre garantir que a lista de conversas está visível e a busca está oculta
        const convsList = document.getElementById('chat-conversations-list');
        const searchResultsPanel = document.getElementById('chat-search-results');
        if (convsList) convsList.style.display = 'block';
        if (searchResultsPanel) searchResultsPanel.style.display = 'none';

        try {
            chatList.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 4rem 2rem;">
                    <div class="loader-mini" style="margin-bottom: 1rem;"></div>
                    <p style="color: #666; font-size: 0.85rem;">Sincronizando mensagens...</p>
                </div>
            `;

            // 1. Get user dynamically and fast
            const user = await getCurrentUser();

            if (!user) {
                chatList.innerHTML = `
                    <div style="text-align:center; padding:4rem 2rem;">
                        <div style="font-size: 3rem; margin-bottom: 1.5rem; opacity: 0.2;">🔐</div>
                        <h3 style="margin-bottom: 0.5rem; font-weight: 800;">Acesso Restrito</h3>
                        <p style="color:#666; font-size: 0.9rem; margin-bottom: 2rem;">Faça login para gerenciar suas mensagens com segurança.</p>
                        <button onclick="location.hash='#login'" class="btn btn-primary" style="max-width: 200px; margin: 0 auto;">Entrar Agora</button>
                    </div>
                `;
                return;
            }

            // Cache-First profile values (Instant, offline-friendly)
            const cachedUserType = localStorage.getItem('user_type') || 'client';
            const cachedUserName = localStorage.getItem('user_name') || '';
            let myProfile = { user_type: cachedUserType, full_name: cachedUserName };

            // Background update to keep local profile info updated without delaying chat list rendering!
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const isUserUuidValid = uuidPattern.test(user.id);
            const isMockUser = user.id === '00000000-0000-0000-0000-000000000000';

            if (isUserUuidValid && !isMockUser) {
                supabaseClient
                    .from('profiles')
                    .select('user_type, full_name')
                    .eq('id', user.id)
                    .maybeSingle()
                    .then(res => {
                        if (res && res.data) {
                            const freshRole = res.data.user_type;
                            const freshName = res.data.full_name;
                            if (freshRole !== cachedUserType || freshName !== cachedUserName) {
                                console.log("Profile updated in background, refreshing chat dashboard.");
                                if (freshRole) localStorage.setItem('user_type', freshRole);
                                if (freshName) localStorage.setItem('user_name', freshName);
                                renderChatList();
                            }
                        }
                    })
                    .catch(err => console.warn("Background chat profile refresh skipped:", err));
            }
            
            const myType = myProfile?.user_type || localStorage.getItem('user_type') || 'client';
            const userEmail = user.email ? user.email.toLowerCase() : '';
            const userMetaName = user.user_metadata?.full_name ? user.user_metadata.full_name.toLowerCase() : '';
            const myName = myProfile?.full_name || '';

            // Extreme Admin Detection
            const isZeroAdm = userEmail.includes('admin@zerosynapses.com') || userEmail.includes('lara.cabeleireira@teste.com') || 
                             userMetaName.includes('zero') || 
                             userMetaName.includes('zynapse') || 
                             myName.toLowerCase().includes('zero') ||
                             myName.toLowerCase().includes('zynapse') ||
                             myType === 'admin';

            const isAdminLevel = isZeroAdm;

            if (isZeroAdm) {
                localStorage.setItem('user_type', 'admin');
                renderAdminChatDashboard(user, myProfile);
                return;
            }

            // Show filters if admin
            const adminFilters = document.getElementById('admin-chat-filters');
            if (adminFilters) {
                adminFilters.style.display = isZeroAdm ? 'flex' : 'none';
            }

            // 3. Support Header / Admin Header
            let supportItemHtml = '';

            // 4. Fetch Messages directly from DB (no premature offline check)
            let messages = [];
            let isOfflineFallback = false;
            
            try {
                let query = supabaseClient.from('messages').select('*');
                // Se não for de nível admin, vê apenas as próprias mensagens. 
                if (!isAdminLevel && isUserUuidValid) {
                    query = query.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
                }
                
                const result = await Promise.race([
                    query.order('created_at', { ascending: false }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000))
                ]);
                
                if (result.error) throw result.error;
                messages = result.data || [];
            } catch (err) {
                console.warn("⚠️ Erro ao carregar mensagens:", err.message || err);
                const isRLS = err.message?.includes('permission') || err.code === '42501' || err.code === 'PGRST301';
                const isTimeout = err.message === 'TIMEOUT';
                
                if (isRLS) {
                     chatList.innerHTML = `
                        <div style="text-align:center; padding:3rem 1.5rem;">
                            <div style="font-size:2.5rem; margin-bottom:1rem;">🔒</div>
                            <p style="color:#f59e0b; font-weight:800; margin-bottom:0.5rem;">Permissão negada pelo banco de dados</p>
                            <p style="color:#666; font-size:0.85rem;">Execute o script <strong>EXECUTE_AGORA.sql</strong> no SQL Editor do Supabase para liberar o acesso.</p>
                            <button onclick="renderChatList()" class="btn btn-primary" style="margin-top: 1.5rem; padding: 10px 20px;">Tentar Novamente</button>
                        </div>
                    `;
                    return;
                }
                isOfflineFallback = true;
            }

            let filteredChats = [];

            if (isOfflineFallback) {
                // Get the accessed account's specific local history!
                const userEmail = user.email || 'guest';
                const localConvs = getLocalChatHistory(userEmail);
                
                // Define offline support header
                if (!isZeroAdm) {
                    supportItemHtml = `
                        <div class="chat-list-item premium-support-card" onclick="location.hash='#chat-msg/support'" style="display: flex; gap: 1rem; padding: 1.35rem; background: linear-gradient(135deg, rgba(20, 20, 25, 0.95), rgba(10, 10, 15, 0.98)); border: 1.5px solid rgba(168, 85, 247, 0.4); border-radius: 20px; margin-bottom: 1.25rem; align-items: center; cursor: pointer; position: relative; overflow: hidden; box-shadow: 0 8px 32px rgba(168, 85, 247, 0.15), inset 0 0 12px rgba(168, 85, 247, 0.05); transition: all 0.3s ease;">
                            <div style="position: absolute; top: 0; right: 0; background: linear-gradient(90deg, #a855f7, #ec4899); color: #fff; font-size: 0.6rem; font-weight: 900; padding: 4px 12px; border-bottom-left-radius: 12px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 2px 8px rgba(168, 85, 247, 0.4);">Oficial</div>
                            <div class="avatar-circle" style="background: rgba(255, 255, 255, 0.03); width: 50px; height: 50px; border: 2.5px solid rgba(168, 85, 247, 0.6); display: flex; align-items: center; justify-content: center; border-radius: 50%; box-shadow: 0 0 15px rgba(168, 85, 247, 0.3); overflow: hidden; flex-shrink: 0;">
                                <img src="/assets/logo.png" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=100';">
                            </div>
                            <div class="chat-info" style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <h4 style="font-weight: 900; font-size: 1.15rem; color: #fff; letter-spacing: 0.5px; margin: 0;">Suporte</h4>
                                    <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.65rem; color: #a855f7; font-weight: 900; letter-spacing: 0.5px;">
                                        <span class="pulsing-green-dot" style="width: 6px; height: 6px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; display: inline-block;"></span>
                                        ONLINE
                                    </span>
                                </div>
                                <div class="last-msg" style="font-size: 0.85rem; color: #bbb; margin-top: 4px; font-weight: 500; line-height: 1.3;">Como podemos ajudar você hoje?</div>
                            </div>
                        </div>
                    `;
                } else {
                    supportItemHtml = `
                        <div style="padding: 0.5rem 0 1.5rem 0; border-bottom: 1px solid #111; margin-bottom: 1.5rem;">
                            <div style="display: flex; align-items: center; gap: 10px; color: #a855f7; font-weight: 900; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 2px;">
                                <span style="width: 8px; height: 8px; background: #a855f7; border-radius: 50%; box-shadow: 0 0 10px #a855f7;"></span>
                                Central de Atendimento (ADM)
                            </div>
                        </div>
                    `;
                }

                filteredChats = localConvs.map(conv => {
                    const isSupport = conv.id === 'support';
                    const prof = isSupport ? {
                        id: 'support',
                        full_name: 'Suporte',
                        avatar_url: '/assets/logo.png'
                    } : (DATA.professionals.find(p => p.id === conv.id) || 
                         DATA.clients.find(c => c.id === conv.id) || {
                              id: conv.id,
                              full_name: conv.professionalName || 'Contato',
                              avatar_url: ''
                          });
                    
                    return {
                        id: conv.id,
                        full_name: prof.full_name || conv.professionalName || 'Contato',
                        avatar_url: prof.avatar_url || '',
                        user_type: prof.user_type || (isSupport ? 'admin' : 'professional'),
                        lastMessage: conv.lastMessage || 'Mensagem offline...',
                        time: conv.time || '12:00',
                        timestamp: Date.now() - 3600000,
                        unreadCount: 0
                    };
                });
            } else {
                const partnersMap = new Map();
                messages.forEach(m => {
                    const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
                    // Strict validation: make sure the partner ID is a valid non-null string and is a UUID
                    if (partnerId && partnerId !== 'null' && partnerId !== 'undefined' && uuidPattern.test(partnerId)) {
                        if (!partnersMap.has(partnerId)) {
                            partnersMap.set(partnerId, {
                                lastMessage: m.content,
                                time: new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                                timestamp: new Date(m.created_at).getTime(),
                                unreadCount: 0
                            });
                        }
                        
                        // Count unread messages received from this partner
                        if (m.receiver_id === user.id && m.is_read === false) {
                            partnersMap.get(partnerId).unreadCount++;
                        }
                    }
                });

                const partners = Array.from(partnersMap.keys());

                // Define online support header with dynamic unread badge and last message!
                if (!isZeroAdm) {
                    const adminId = _cachedAdminId || 'e33bdd17-f6bc-4c72-82cf-c3f76124aca0';
                    const supportUnread = partnersMap.has(adminId) ? (partnersMap.get(adminId).unreadCount || 0) : 0;
                    const supportBadge = supportUnread ? `
                        <div class="chat-unread-badge" style="
                            background: var(--primary-accent);
                            color: #ffffff;
                            font-size: 0.75rem;
                            font-weight: 900;
                            min-width: 22px;
                            height: 22px;
                            border-radius: 11px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            padding: 0 6px;
                            margin-left: auto;
                            margin-right: 0.5rem;
                            flex-shrink: 0;
                            box-shadow: 0 4px 10px rgba(168, 85, 247, 0.4);
                            animation: scaleIn 0.3s ease-out;
                        ">${supportUnread}</div>
                    ` : '';

                    supportItemHtml = `
                        <div class="chat-list-item premium-support-card" onclick="location.hash='#chat-msg/support'" style="display: flex; gap: 1rem; padding: 1.35rem; background: linear-gradient(135deg, rgba(20, 20, 25, 0.95), rgba(10, 10, 15, 0.98)); border: 1.5px solid rgba(168, 85, 247, 0.4); border-radius: 20px; margin-bottom: 1.25rem; align-items: center; cursor: pointer; position: relative; overflow: hidden; box-shadow: 0 8px 32px rgba(168, 85, 247, 0.15), inset 0 0 12px rgba(168, 85, 247, 0.05); transition: all 0.3s ease;">
                            <div style="position: absolute; top: 0; right: 0; background: linear-gradient(90deg, #a855f7, #ec4899); color: #fff; font-size: 0.6rem; font-weight: 900; padding: 4px 12px; border-bottom-left-radius: 12px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 2px 8px rgba(168, 85, 247, 0.4);">Oficial</div>
                            <div class="avatar-circle" style="background: rgba(255, 255, 255, 0.03); width: 50px; height: 50px; border: 2.5px solid rgba(168, 85, 247, 0.6); display: flex; align-items: center; justify-content: center; border-radius: 50%; box-shadow: 0 0 15px rgba(168, 85, 247, 0.3); overflow: hidden; flex-shrink: 0;">
                                <img src="/assets/logo.png" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=100';">
                            </div>
                            <div class="chat-info" style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <h4 style="font-weight: 900; font-size: 1.15rem; color: #fff; letter-spacing: 0.5px; margin: 0;">Suporte</h4>
                                    <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.65rem; color: #a855f7; font-weight: 900; letter-spacing: 0.5px;">
                                        <span class="pulsing-green-dot" style="width: 6px; height: 6px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; display: inline-block;"></span>
                                        ONLINE
                                    </span>
                                </div>
                                <div class="last-msg" style="font-size: 0.85rem; color: #bbb; margin-top: 4px; font-weight: 500; line-height: 1.3;">
                                    ${partnersMap.has(adminId) ? partnersMap.get(adminId).lastMessage : 'Como podemos ajudar você hoje?'}
                                </div>
                            </div>
                            ${supportBadge}
                        </div>
                    `;
                } else {
                    supportItemHtml = `
                        <div style="padding: 0.5rem 0 1.5rem 0; border-bottom: 1px solid #111; margin-bottom: 1.5rem;">
                            <div style="display: flex; align-items: center; gap: 10px; color: #a855f7; font-weight: 900; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 2px;">
                                <span style="width: 8px; height: 8px; background: #a855f7; border-radius: 50%; box-shadow: 0 0 10px #a855f7;"></span>
                                Central de Atendimento (ADM)
                            </div>
                        </div>
                    `;
                }

                if (partners.length === 0) {
                    chatList.innerHTML = supportItemHtml + `
                        <div style="text-align: center; padding: 4rem 1rem; opacity: 0.3;">
                            <div style="font-size: 2.5rem; margin-bottom: 1rem;">🗨️</div>
                            <p style="font-size: 0.95rem; font-weight: 600;">Nenhuma conversa encontrada.</p>
                            <p style="font-size: 0.8rem; margin-top: 0.5rem;">As mensagens aparecerão aqui assim que alguém entrar em contato.</p>
                        </div>
                    `;
                    return;
                }

                // 5. Fetch Profile Details for partners with timeout - NON-BLOCKING!
                let profiles = [];
                try {
                    const { data } = await withTimeout(
                         supabaseClient.from('profiles').select('*').in('id', partners),
                        4000,
                        "Erro ao buscar perfis dos contatos"
                    );
                    profiles = data || [];
                } catch (err) {
                    console.warn("Using placeholder profiles for partners due to profile fetch delay:", err);
                    profiles = partners.map(pid => ({
                        id: pid,
                        full_name: 'Usuário Zero',
                        user_type: 'client'
                    }));
                }
                
                // Map static/mock professionals' synced UUID back to their local names/avatars for premium rendering fallback
                const uuidToStatic = {
                    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d': 'prof-101',
                    'c3d4e5f6-a7b8-4c7d-0e1f-2a3b4c5d6e7f': 'prof-102',
                    'b2c3d4e5-f6a7-4b6c-9d8e-1f0a2b3c4d5e': 'prof-103'
                };

                const chatItems = partners.map(partnerId => {
                    const profile = (profiles || []).find(p => p.id === partnerId);
                    const staticId = uuidToStatic[partnerId];
                    const localProf = staticId ? DATA.professionals.find(p => p.id === staticId) : null;
                    
                    return {
                        id: partnerId,
                        full_name: profile?.full_name || localProf?.full_name || 'Usuário Zero',
                        avatar_url: profile?.avatar_url || localProf?.avatar_url || '',
                        user_type: profile?.user_type || localProf?.user_type || 'client',
                        ...partnersMap.get(partnerId)
                    };
                }).sort((a, b) => b.timestamp - a.timestamp);

                filteredChats = chatItems.filter(chat => {
                    // Non-admin users: exclude the Support Admin profile from the normal chat list below,
                    // since we already render it as a premium "Suporte" banner at the top of the screen!
                    if (!isZeroAdm && chat.user_type === 'admin') return false;

                    if (isZeroAdm) {
                        if (window.chatFilter === 'all') return true;
                        return chat.user_type === window.chatFilter;
                    } else if (myType === 'client') {
                        // Clientes: veem profissionais E admin (suporte)
                        return chat.user_type === 'professional' || chat.user_type === 'admin';
                    } else if (myType === 'professional') {
                        // Profissionais: veem clientes E admin (suporte)
                        return chat.user_type === 'client' || chat.user_type === 'admin';
                    }
                    return true;
                });
            }

            // 6. Render List
            chatList.innerHTML = supportItemHtml + filteredChats.map(chat => {
                const avatarHtml = chat.avatar_url 
                    ? `<img src="${chat.avatar_url}" style="width:100%; height:100%; object-fit:cover;">` 
                    : (chat.full_name || 'U')[0].toUpperCase();
                
                const badgeHtml = chat.unreadCount ? `
                    <div class="chat-unread-badge" style="
                        background: var(--primary-accent);
                        color: #ffffff;
                        font-size: 0.75rem;
                        font-weight: 900;
                        min-width: 22px;
                        height: 22px;
                        border-radius: 11px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 0 6px;
                        margin-left: auto;
                        flex-shrink: 0;
                        box-shadow: 0 4px 10px rgba(168, 85, 247, 0.4);
                        animation: scaleIn 0.3s ease-out;
                    ">${chat.unreadCount}</div>
                ` : '';

                return `
                    <div class="chat-list-item" onclick="location.hash='#chat-msg/${chat.id}'" style="display: flex; gap: 1rem; padding: 1.25rem; background: #111; border: 1px solid #222; border-radius: 20px; margin-bottom: 0.75rem; align-items: center; cursor: pointer; transition: transform 0.2s;">
                        <div class="avatar-circle" style="width: 50px; height: 50px; background: #333; font-size: 1.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
                            ${avatarHtml}
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <h4 style="margin: 0; font-size: 1rem; font-weight: 800; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${chat.full_name || 'Usuário'}</h4>
                                <span style="font-size: 0.7rem; color: #555; flex-shrink: 0;">${chat.time || ''}</span>
                            </div>
                            <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${chat.lastMessage || 'Mensagem'}</p>
                        </div>
                        ${badgeHtml}
                    </div>
                `;
            }).join('');

            updateNotificationBadges();
        } catch (error) {
            console.error("Critical Error in renderChatList:", error);
            chatList.innerHTML = `
                <div style="text-align: center; padding: 4rem 1rem; color: #f87171;">
                    <div style="font-size: 2.5rem; margin-bottom: 1rem;">⚠️</div>
                    <p style="font-size: 0.95rem; font-weight: 600;">Sincronização temporariamente indisponível.</p>
                    <p style="font-size: 0.8rem; margin-top: 0.5rem; color: #999;">${error.message || 'Verifique sua conexão com o banco de dados.'}</p>
                    <button onclick="renderChatList()" class="btn btn-primary" style="margin-top: 1.5rem; max-width: 200px; margin-left: auto; margin-right: auto; padding: 10px 20px;">Tentar Novamente</button>
                </div>
            `;
        }
    }

    async function renderAdminChatDashboard(user, profile) {
        const chatList = document.getElementById('chat-list');
        const adminFilters = document.getElementById('admin-chat-filters');
        
        if (adminFilters) adminFilters.style.display = 'flex';

        try {
            // 1. Busca TODAS as mensagens da plataforma (permitido pela nova RLS de admin)
            const result = await Promise.race([
                supabaseClient
                    .from('messages')
                    .select('*')
                    .order('created_at', { ascending: false }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000))
            ]);
            
            let msgError = result.error;
            let messages = result.data;

            if (msgError) {
                console.error("Admin Dashboard Error:", msgError);
                // Se der erro de permissão, mostra orientação sobre o SQL
                if (msgError.code === '42501' || msgError.message?.includes('permission')) {
                    chatList.innerHTML = `
                        <div style="text-align:center; padding:3rem 1.5rem;">
                            <div style="font-size:2.5rem; margin-bottom:1rem;">🔒</div>
                            <p style="color:#f59e0b; font-weight:800; margin-bottom:0.5rem;">Permissão negada pelo banco de dados</p>
                            <p style="color:#666; font-size:0.85rem;">Execute o script <strong>EXECUTE_AGORA.sql</strong> no SQL Editor do Supabase para liberar o acesso admin.</p>
                            <button onclick="renderChatList()" class="btn btn-primary" style="margin-top: 1.5rem; padding: 10px 20px;">Tentar Novamente</button>
                        </div>
                    `;
                    return;
                }
            }

            // 2. Agrupa por "Conversa" — todos os IDs únicos que interagiram na plataforma
            const partnersMap = new Map();
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            (messages || []).forEach(m => {
                // Identifica o usuário não-admin da conversa
                const isAdminSender = m.sender_id === user.id;
                const isAdminReceiver = m.receiver_id === user.id;
                const partnerId = isAdminSender ? m.receiver_id : m.sender_id;

                if (partnerId && partnerId !== 'null' && partnerId !== 'undefined' && uuidPattern.test(partnerId) && partnerId !== user.id) {
                    if (!partnersMap.has(partnerId)) {
                        partnersMap.set(partnerId, {
                            lastMessage: m.content,
                            time: new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                            timestamp: new Date(m.created_at).getTime(),
                            unread: !m.is_read && isAdminReceiver,
                            unreadCount: 0
                        });
                    }

                    if (m.receiver_id === user.id && m.is_read === false) {
                        partnersMap.get(partnerId).unreadCount++;
                    }
                }
            });

            const partners = Array.from(partnersMap.keys());
            
            // 3. Fetch Partner Profiles with timeout - NON-BLOCKING!
            let profiles = [];
            if (partners.length > 0) {
                try {
                    const { data } = await withTimeout(
                        supabaseClient.from('profiles').select('*').in('id', partners),
                        4000,
                        "Erro ao carregar contatos na Central ADM"
                    );
                    profiles = data || [];
                } catch (err) {
                    console.warn("Using placeholders in Admin Central due to delay:", err);
                    profiles = partners.map(pid => ({
                        id: pid,
                        full_name: 'Usuário Zero',
                        user_type: 'client'
                    }));
                }
            }

            // 4. Map and Filter
            const chatItems = profiles.map(p => ({
                ...p,
                ...partnersMap.get(p.id)
            })).sort((a, b) => b.timestamp - a.timestamp);

            const filteredChats = chatItems.filter(chat => {
                if (window.chatFilter === 'all') return true;
                return chat.user_type === window.chatFilter;
            });

            // 5. Build UI
            let html = `
                <div style="padding: 0 0 1.5rem 0; border-bottom: 1px solid #111; margin-bottom: 1.5rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 10px; color: #a855f7; font-weight: 900; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 2px;">
                            <span style="width: 8px; height: 8px; background: #a855f7; border-radius: 50%; box-shadow: 0 0 10px #a855f7;"></span>
                            Central ADM Zero
                        </div>
                        <span style="font-size: 0.65rem; color: #444; font-weight: 700;">${filteredChats.length} conversas</span>
                    </div>
                </div>
            `;

            if (filteredChats.length === 0) {
                html += `
                    <div style="text-align: center; padding: 4rem 1rem; opacity: 0.3;">
                        <div style="font-size: 2.5rem; margin-bottom: 1rem;">🔭</div>
                        <p style="font-size: 0.95rem; font-weight: 600;">Tudo calmo por aqui.</p>
                        <p style="font-size: 0.8rem; margin-top: 0.5rem;">As conversas da plataforma aparecerão aqui.</p>
                    </div>
                `;
            } else {
                html += filteredChats.map(chat => {
                    const avatarHtml = chat.avatar_url 
                        ? `<img src="${chat.avatar_url}" style="width:100%; height:100%; object-fit:cover;">` 
                        : (chat.full_name || 'U')[0].toUpperCase();
                    
                    const typeLabel = chat.user_type === 'professional' ? 'PROFISSIONAL' : 'CLIENTE';
                    const typeColor = chat.user_type === 'professional' ? '#a855f7' : '#22c55e';

                    return `
                        <div class="chat-list-item" onclick="location.hash='#chat-msg/${chat.id}'" style="display: flex; gap: 1rem; padding: 1.25rem; background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 20px; margin-bottom: 0.75rem; align-items: center; cursor: pointer; transition: all 0.2s;">
                            <div class="avatar-circle" style="width: 55px; height: 55px; background: #222; font-size: 1.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; border: 2px solid ${chat.unreadCount ? '#a855f7' : 'transparent'};">
                                ${avatarHtml}
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div style="display: flex; flex-direction: column;">
                                        <h4 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #fff;">${chat.full_name || 'Usuário'}</h4>
                                        <span style="font-size: 0.6rem; color: ${typeColor}; font-weight: 900; letter-spacing: 1px;">${typeLabel}</span>
                                    </div>
                                    <span style="font-size: 0.65rem; color: #444; flex-shrink: 0;">${chat.time}</span>
                                </div>
                                <p style="margin: 6px 0 0 0; font-size: 0.85rem; color: ${chat.unreadCount ? '#fff' : '#666'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: ${chat.unreadCount ? '700' : '400'};">${chat.lastMessage}</p>
                            </div>
                            ${chat.unreadCount ? `
                                <div class="chat-unread-badge" style="
                                    background: var(--primary-accent);
                                    color: #ffffff;
                                    font-size: 0.75rem;
                                    font-weight: 900;
                                    min-width: 22px;
                                    height: 22px;
                                    border-radius: 11px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    padding: 0 6px;
                                    flex-shrink: 0;
                                    box-shadow: 0 4px 10px rgba(168, 85, 247, 0.4);
                                    animation: scaleIn 0.3s ease-out;
                                ">${chat.unreadCount}</div>
                            ` : ''}
                        </div>
                    `;
                }).join('');
            }

            chatList.innerHTML = html;
            updateNotificationBadges();
        } catch (error) {
            console.error("Critical Error in renderAdminChatDashboard:", error);
            chatList.innerHTML = `
                <div style="text-align: center; padding: 4rem 1rem; color: #f87171;">
                    <div style="font-size: 2.5rem; margin-bottom: 1rem;">⚠️</div>
                    <p style="font-size: 0.95rem; font-weight: 600;">Sincronização temporariamente indisponível.</p>
                    <p style="font-size: 0.8rem; margin-top: 0.5rem; color: #999;">${error.message || 'Erro ao carregar Central ADM.'}</p>
                    <button onclick="renderChatList()" class="btn btn-primary" style="margin-top: 1.5rem; max-width: 200px; margin-left: auto; margin-right: auto; padding: 10px 20px;">Tentar Novamente</button>
                </div>
            `;
        }
    }

    // Global listener for new messages to update the chat list in real-time
    async function setupGlobalChatUpdates() {
        if (!supabaseClient) return;
        const user = await getCurrentUser();
        if (!user) return;

        if (window.globalChatUpdatesSubscription) {
            supabaseClient.removeChannel(window.globalChatUpdatesSubscription);
        }

        const myType = localStorage.getItem('user_type') || 'client';
        const isAdmin = myType === 'admin';

        window.globalChatUpdatesSubscription = supabaseClient
            .channel('global-chat-list-updates')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                const msg = payload.new;
                // Admin sees ALL messages; regular users see only their own
                const isRelevant = isAdmin || msg.receiver_id === user.id || msg.sender_id === user.id;
                
                if (isRelevant) {
                    console.log("⚡ Global chat update detected! Refreshing chat lists.");
                    const chatList = document.getElementById('chat-list');
                    if (chatList) renderChatList();
                    // Also update notification badges
                    updateNotificationBadges();
                }
            })
            .subscribe();
    }

    setupGlobalChatUpdates();

    // --- Chat Search Logic ---
    function setupChatSearch() {
        const input = document.getElementById('chat-search-input');
        const resultsContainer = document.getElementById('chat-search-results');
        const searchList = document.getElementById('chat-search-list');
        const convsList = document.getElementById('chat-conversations-list');

        if (!input) return;

        let searchTimeout;

        input.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim().toLowerCase();
            const type = localStorage.getItem('user_type') || 'client';

            if (query.length === 0) {
                resultsContainer.style.display = 'none';
                convsList.style.display = 'block';
                return;
            }

            resultsContainer.style.display = 'block';
            convsList.style.display = 'none';

            searchList.innerHTML = '<div style="text-align: center; padding: 1rem;"><div class="loader-mini" style="margin:0 auto;"></div></div>';

            searchTimeout = setTimeout(async () => {
                let dbResults = [];
                
                if (supabaseClient) {
                    try {
                        let dbQuery = supabaseClient.from('profiles').select('*');
                        
                        if (type === 'professional') {
                            dbQuery = dbQuery.eq('user_type', 'client');
                        } else if (type === 'client') {
                            dbQuery = dbQuery.or('user_type.eq.professional,user_type.eq.admin');
                        }
                        
                        const { data, error } = await dbQuery.ilike('full_name', `%${query}%`).limit(15);
                        if (!error && data) {
                            dbResults = data.map(p => ({
                                id: p.id,
                                name: p.full_name,
                                type: p.user_type,
                                avatar_url: p.avatar_url,
                                specialty: p.specialty || (p.user_type === 'professional' ? 'Profissional' : (p.user_type === 'admin' ? 'Suporte Oficial' : 'Cliente')),
                                isDb: true
                            }));
                        }
                    } catch (err) {
                        console.error("Error in DB search:", err);
                    }
                }

                let localResults = [];
                if (type === 'admin') {
                    localResults = [
                        ...DATA.professionals.map(p => ({ ...p, type: 'professional' })),
                        ...DATA.clients.map(c => ({ ...c, type: 'client' }))
                    ];
                } else if (type === 'professional') {
                    localResults = DATA.clients.map(c => ({ ...c, type: 'client' }));
                } else {
                    localResults = [
                        ...DATA.professionals.map(p => ({ ...p, type: 'professional' })),
                        {
                            id: 'support',
                            full_name: 'Suporte',
                            name: 'Suporte',
                            type: 'admin',
                            specialty: 'Suporte Oficial',
                            avatar_url: '/assets/logo.png'
                        }
                    ];
                }

                const localFiltered = localResults.filter(item => 
                    (item.full_name || item.name || '').toLowerCase().includes(query) ||
                    (item.specialty || '').toLowerCase().includes(query)
                ).map(item => ({
                    id: item.id,
                    name: item.full_name || item.name,
                    type: item.type,
                    avatar_url: item.avatar_url,
                    specialty: item.specialty || (item.type === 'professional' ? 'Profissional' : 'Cliente'),
                    isDb: false
                }));

                const merged = [...dbResults];
                localFiltered.forEach(localItem => {
                    const exists = merged.some(dbItem => 
                        dbItem.id === localItem.id || 
                        dbItem.name.toLowerCase() === localItem.name.toLowerCase()
                    );
                    if (!exists) {
                        merged.push(localItem);
                    }
                });

                if (merged.length === 0) {
                    searchList.innerHTML = '<p style="color: #444; font-size: 0.85rem; text-align: center; padding: 1rem;">Nenhum usuário encontrado.</p>';
                    return;
                }

                searchList.innerHTML = merged.map(item => {
                    const sub = item.type === 'professional' ? (item.specialty || 'Profissional') : 'Cliente';
                    const avatar = item.avatar_url 
                        ? `<img src="${item.avatar_url}" style="width:100%; height:100%; object-fit:cover;">` 
                        : `<span style="font-weight: 800;">${(item.name || 'U')[0].toUpperCase()}</span>`;
                    
                    const labelBadge = item.isDb 
                        ? '<span style="font-size: 0.55rem; background: rgba(168, 85, 247, 0.2); color: #a855f7; padding: 2px 6px; border-radius: 8px; font-weight: 800; letter-spacing: 0.5px;">REAL</span>'
                        : '<span style="font-size: 0.55rem; background: rgba(255,255,255,0.05); color: #666; padding: 2px 6px; border-radius: 8px; font-weight: 800;">MOCK</span>';
                    
                    return `
                        <div class="search-result-item" onclick="window.location.hash='#chat-msg/${item.id}'; document.getElementById('chat-search-input').value=''; document.getElementById('chat-search-results').style.display='none'; document.getElementById('chat-conversations-list').style.display='block';" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 0.5rem; cursor: pointer; transition: background 0.2s;">
                            <div style="width: 45px; height: 45px; background: #222; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid #333;">
                                ${avatar}
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-weight: 700; color: #fff; font-size: 0.95rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name}</span>
                                    ${labelBadge}
                                </div>
                                <div style="font-size: 0.75rem; color: #666; font-weight: 600;">${sub}</div>
                            </div>
                            <span style="font-size: 1.2rem; opacity: 0.3;">💬</span>
                        </div>
                    `;
                }).join('');
            }, 300);
        });
    }


    function renderAdminStats() {
        const container = document.getElementById('admin-stats');
        if (!container) return;
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div style="background:#111; border: 1px solid #222; padding:1.5rem; border-radius:20px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #555; font-weight: 800; text-transform: uppercase;">Usuários</div>
                    <div style="font-size: 1.75rem; font-weight: 900; color: #fff; margin-top: 4px;">250</div>
                </div>
                <div style="background:#111; border: 1px solid #222; padding:1.5rem; border-radius:20px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #555; font-weight: 800; text-transform: uppercase;">Ativos</div>
                    <div style="font-size: 1.75rem; font-weight: 900; color: #4ade80; margin-top: 4px;">182</div>
                </div>
            </div>
        `;
    }

    function showSuccessModal(title, message, callback) {
        const modal = document.getElementById('success-modal');
        const titleEl = document.getElementById('success-modal-title');
        const messageEl = document.getElementById('success-modal-message');
        const btn = document.getElementById('success-modal-btn');
        if (!modal) return;
        titleEl.innerText = title;
        messageEl.innerText = message;
        modal.classList.add('active');
        btn.onclick = () => {
            modal.classList.remove('active');
            if (callback) callback();
        };
    }



    // Global Password Toggle Logic
    const togglePasswordVisibility = (e) => {
        const toggleBtn = e.target.closest('.toggle-password');
        if (toggleBtn) {
            e.preventDefault();
            e.stopPropagation();
            const wrapper = toggleBtn.closest('.password-wrapper');
            if (!wrapper) return;
            const input = wrapper.querySelector('input');
            if (input) {
                if (input.type === 'password') {
                    input.type = 'text';
                    toggleBtn.textContent = '🔒';
                } else {
                    input.type = 'password';
                    toggleBtn.textContent = '👁️';
                }
            }
        }
    };

    document.addEventListener('click', togglePasswordVisibility);
    document.addEventListener('mousedown', togglePasswordVisibility);

    // --- Map Picker Logic ---
    let pickerMap;
    let targetAddressId, targetCityId;

    window.openMapPicker = (addressId, cityId) => {
        targetAddressId = addressId;
        targetCityId = cityId;
        showOverlay('map-picker');
        
        if (!pickerMap) {
            // Light theme tiles with nice look
            pickerMap = L.map('map-picker-container', { zoomControl: false }).setView([-23.5505, -46.6333], 15);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '©OpenStreetMap contributors'
            }).addTo(pickerMap);

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    pickerMap.setView([pos.coords.latitude, pos.coords.longitude], 17);
                });
            }
        } else {
            setTimeout(() => pickerMap.invalidateSize(), 300);
        }
    };

    const mapSearchInput = document.getElementById('map-search-input');
    const mapSearchBtn = document.getElementById('btn-map-search-go');

    if (mapSearchBtn && mapSearchInput) {
        const performMapSearch = async () => {
            let query = mapSearchInput.value.trim();
            if (!query) return;

            mapSearchBtn.innerText = "⏳";
            mapSearchBtn.disabled = true;

            try {
                // Se parecer um CEP brasileiro (8 dígitos, com ou sem traço)
                const cepRegex = /^\d{5}-?\d{3}$/;
                if (cepRegex.test(query)) {
                    const cleanCep = query.replace('-', '');
                    try {
                        const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                        const viaCepData = await viaCepRes.json();
                        if (!viaCepData.erro && viaCepData.logradouro) {
                            // Atualiza a query para buscar pela rua e cidade retornados do CEP
                            query = `${viaCepData.logradouro}, ${viaCepData.localidade}`;
                        }
                    } catch (e) {
                        console.warn("Falha ao consultar ViaCEP, tentando Nominatim direto.", e);
                    }
                }

                // Search for the address using Nominatim
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
                const results = await response.json();

                if (results.length > 0) {
                    const { lat, lon } = results[0];
                    if (pickerMap) {
                        pickerMap.setView([lat, lon], 17);
                    }
                } else {
                    alert("Local não encontrado. Tente digitar o nome da rua ou um CEP válido.");
                }
            } catch (err) {
                console.error("Erro na busca do mapa:", err);
                alert("Erro ao conectar com o serviço de busca.");
            } finally {
                mapSearchBtn.innerText = "🔍";
                mapSearchBtn.disabled = false;
            }
        };

        mapSearchBtn.onclick = performMapSearch;
        mapSearchInput.onkeypress = (e) => {
            if (e.key === 'Enter') performMapSearch();
        };
    }

    window.closeMapPicker = () => {
        document.getElementById('map-picker').classList.remove('active');
    };

    const confirmBtn = document.getElementById('confirm-map-location');
    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            const center = pickerMap.getCenter();
            confirmBtn.innerText = "...";
            confirmBtn.disabled = true;
            
            await fillAddressFromCoords(center.lat, center.lng, targetAddressId, targetCityId, confirmBtn, "Confirmar");
            closeMapPicker();
        };
    }

    // --- Geolocation Logic ---
    window.getCurrentLocation = (addressId, cityId) => {
        if (!navigator.geolocation) {
            return alert("Geolocalização não suportada pelo seu navegador.");
        }

        const btn = event.currentTarget;
        const originalIcon = btn.innerText;
        btn.innerText = "⏳";
        btn.disabled = true;

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            fillAddressFromCoords(latitude, longitude, addressId, cityId, btn, originalIcon);
        }, async (err) => {
            console.warn("Navegador falhou na localização, tentando IP-Based Fallback...", err);
            try {
                // Fallback using IP-API (Free for limited use)
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
                
                if (data.error) throw new Error(data.reason);

                const city = data.city || data.region || "Não identificado";
                const address = `${data.city}, ${data.region}, ${data.country_name} (Via IP)`;

                if (addressId) {
                    const el = document.getElementById(addressId);
                    if (el) { el.value = address; el.dispatchEvent(new Event('input')); }
                }
                if (cityId) {
                    const el = document.getElementById(cityId);
                    if (el) { el.value = city; el.dispatchEvent(new Event('input')); }
                }
                
                showSuccessModal('Localizado via Rede!', 'Usamos sua conexão de internet para estimar seu endereço.');
            } catch (fallbackErr) {
                let msg = "Erro ao obter localização.";
                switch(err.code) {
                    case 1: msg = "Permissão negada. Ative a localização no navegador."; break;
                    case 2: msg = "Localização indisponível no dispositivo."; break;
                    case 3: msg = "Tempo esgotado."; break;
                }
                alert(msg + " (Fallback de rede também falhou)");
            } finally {
                btn.innerText = originalIcon;
                btn.disabled = false;
            }
        }, {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 30000
        });
    };

    async function fillAddressFromCoords(lat, lon, addressId, cityId, btn, icon) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await response.json();
            
            const addrData = data.address;
            const street = addrData.road || addrData.pedestrian || addrData.suburb || "Rua não identificada";
            const number = addrData.house_number || "";
            const neighborhood = addrData.neighbourhood || addrData.suburb || "";
            
            const displayAddress = `${street}${neighborhood ? ' - ' + neighborhood : ''}`;
            const city = addrData.city || addrData.town || addrData.village || addrData.state || "Não identificado";

            if (addressId) {
                const el = document.getElementById(addressId);
                if (el) { el.value = displayAddress; el.dispatchEvent(new Event('input')); }
            }
            if (cityId) {
                const el = document.getElementById(cityId);
                if (el) { el.value = city; el.dispatchEvent(new Event('input')); }
            }
            
            // Auto-fill the number field if we find it
            const numEl = document.getElementById('edit-user-number');
            if (numEl && number) {
                numEl.value = number;
                numEl.dispatchEvent(new Event('input'));
            }

            showSuccessModal('Localizado!', 'Rua e bairro identificados com sucesso.');
        } catch (err) {
            alert("Localizado, mas houve erro ao obter os detalhes da rua.");
        } finally {
            btn.innerText = icon;
            btn.disabled = false;
        }
    }

    // --- Helper: Upload File to Supabase ---
    async function uploadFileToSupabase(file, userId, bucket) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabaseClient.storage
            .from(bucket)
            .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabaseClient.storage
            .from(bucket)
            .getPublicUrl(fileName);
            
        return publicUrl;
    }

    // --- Search Logic ---
    // Pré-carrega o cache com dados locais para garantir que o feed nunca fique vazio
    window.allProfessionalsCache = DATA.professionals || [];

    window.renderSearchProfessionals = async function() {
        // Garante que o fallback local já esteja no cache antes de qualquer await
        if (!window.allProfessionalsCache || window.allProfessionalsCache.length === 0) {
            window.allProfessionalsCache = DATA.professionals || [];
        }

        // Renderiza imediatamente com dados locais enquanto aguarda Supabase (sem travar a tela)
        renderRecentProfessionals();
        filterAndRenderSearch();

        try {
            if (!supabaseClient) throw new Error("Supabase não disponível");

            const container = document.getElementById('search-results');
            // Só mostra indicador de carregamento se a lista estiver completamente vazia
            if (container && (!window.allProfessionalsCache || window.allProfessionalsCache.length === 0)) {
                container.innerHTML = `
                    <div style="text-align:center; padding:3rem 1.5rem;">
                        <div class="loader-mini" style="margin: 0 auto 1rem;"></div>
                        <p style="color:#666; font-size:0.85rem;">Sincronizando profissionais...</p>
                    </div>
                `;
            }

            // Busca os perfis do banco de dados com limite de 4 segundos para evitar timeouts lentos
            const query = supabaseClient
                .from('profiles')
                .select('*')
                .in('user_type', ['professional', 'client'])
                .order('created_at', { ascending: false });

            const result = await Promise.race([
                query,
                new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 4000))
            ]);

            if (result.error) throw result.error;
            const users = result.data || [];

            // Merge com dados locais para demonstração/riqueza
            const mergedUsers = [...users];
            
            // Adiciona profissionais locais se não existirem no banco
            DATA.professionals.forEach(p => {
                if (!mergedUsers.find(u => u.id === p.id)) mergedUsers.push(p);
            });
            // Adiciona clientes locais se não existirem no banco
            DATA.clients.forEach(c => {
                if (!mergedUsers.find(u => u.id === c.id)) mergedUsers.push(c);
            });

            if (mergedUsers.length > 0) {
                window.allProfessionalsCache = mergedUsers;
            }
        } catch (err) {
            console.warn("Erro ao buscar no Supabase, mantendo dados locais:", err.message || err);
        } finally {
            // Renderiza novamente com os dados finais (Supabase ou fallback local)
            renderRecentProfessionals();
            filterAndRenderSearch();
        }
    };

    let servicesRotationInterval = null;

    function startDynamicServicesRotation(recents) {
        const valEl = document.getElementById('dynamic-service-value');
        const priceEl = document.getElementById('dynamic-service-price');
        const guideEl = document.getElementById('dynamic-services-guide');
        if (!valEl) return;

        // Build list of actual services from ALL professionals cached in the directory
        let services = [];
        if (window.allProfessionalsCache && window.allProfessionalsCache.length > 0) {
            services = window.allProfessionalsCache
                .filter(p => p.specialty && p.user_type === 'professional')
                .map(p => {
                    const priceVal = p.price_range || p.price || 45.0;
                    return {
                        name: p.specialty,
                        price: Number(priceVal).toFixed(2).replace('.', ','),
                        profId: p.id
                    };
                });
        }

        // Deduplicate services by name
        const seenNames = new Set();
        services = services.filter(s => {
            if (seenNames.has(s.name)) return false;
            seenNames.add(s.name);
            return true;
        });

        // Complete fallbacks if still empty
        if (services.length === 0) {
            services = [
                { name: "Corte de Cabelo", price: "45,00", profId: null },
                { name: "Barba Completa", price: "30,00", profId: null },
                { name: "Penteado Premium", price: "60,00", profId: null }
            ];
        }

        let currentIndex = 0;
        
        // Render first immediately
        valEl.innerText = services[currentIndex].name;
        if (priceEl) priceEl.innerText = `R$ ${services[currentIndex].price}`;

        // Set click behavior
        if (guideEl) {
            guideEl.onclick = () => {
                const currentService = services[currentIndex];
                if (currentService && currentService.profId) {
                    location.hash = `#profissional/${currentService.profId}`;
                }
            };
        }

        if (servicesRotationInterval) clearInterval(servicesRotationInterval);

        servicesRotationInterval = setInterval(() => {
            // Smooth fade out
            valEl.style.opacity = '0';
            valEl.style.transform = 'translateY(-3px)';
            if (priceEl) {
                priceEl.style.opacity = '0';
                priceEl.style.transform = 'translateY(-3px)';
            }
            
            setTimeout(() => {
                currentIndex = (currentIndex + 1) % services.length;
                valEl.innerText = services[currentIndex].name;
                if (priceEl) priceEl.innerText = `R$ ${services[currentIndex].price}`;
                
                // Smooth fade in
                valEl.style.opacity = '1';
                valEl.style.transform = 'translateY(0)';
                if (priceEl) {
                    priceEl.style.opacity = '1';
                    priceEl.style.transform = 'translateY(0)';
                }
            }, 500); // Wait for fade out animation
        }, 3000); // Rotate every 3 seconds
    }

    function renderRecentProfessionals() {
        const recentContainer = document.getElementById('recent-professionals-container');
        const recentList = document.getElementById('recent-professionals-list');
        if (!recentContainer || !recentList || !window.allProfessionalsCache) return;

        const recents = window.allProfessionalsCache.slice(0, 3);

        if (recents.length > 0) {
            recentContainer.style.display = 'block';
            recentList.innerHTML = recents.map(p => {
                const avatarHtml = p.avatar_url 
                    ? `<img src="${p.avatar_url}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
                    : `<div style="width:100%; height:100%; background:linear-gradient(135deg, #1a1a1a, #000); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:1.1rem; border-radius:50%; border: 1px solid #333;">${(p.full_name || p.name || 'P')[0].toUpperCase()}</div>`;
                
                return `
                <div class="prof-card" style="min-width: 96px; max-width: 96px; background: #111; border: 1px solid #222; padding: 0.45rem 0.4rem; border-radius: 12px; text-align: center; cursor: pointer; flex-shrink: 0; box-shadow: 0 4px 15px rgba(0,0,0,0.4);" onclick="location.hash='#profissional/${p.id}'">
                    <div style="width:34px; height:34px; margin: 0 auto 0.3rem;">
                        ${avatarHtml}
                    </div>
                    <div style="font-weight:800; font-size:0.75rem; color: #fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.full_name || p.name || 'Profissional'}</div>
                    <div style="font-size:0.65rem; color:#b085f5; font-weight: 700; margin-top: 2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.specialty || p.category || 'Serviços'}</div>
                    <div style="font-size:0.55rem; color:#888; font-weight: 500; margin-top: 2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.address || p.city || 'São Paulo'}</div>
                </div>`;
            }).join('');

            // Start the dynamic rotating services guide!
            startDynamicServicesRotation(recents);
        } else {
            recentContainer.style.display = 'none';
        }
    }

    window.searchSortMode = 'proximity';

    window.toggleSearchSortMode = function() {
        const iconEl = document.getElementById('search-sort-icon');
        if (window.searchSortMode === 'proximity') {
            window.searchSortMode = 'rating';
            if (iconEl) iconEl.innerText = '⭐';
        } else {
            window.searchSortMode = 'proximity';
            if (iconEl) iconEl.innerText = '📍';
        }
        if (typeof window.filterAndRenderSearch === 'function') {
            window.filterAndRenderSearch();
        } else {
            filterAndRenderSearch();
        }
    };

    function filterAndRenderSearch() {
        const container = document.getElementById('search-results');
        const searchInput = document.getElementById('search-input');
        const recentContainer = document.getElementById('recent-professionals-container');
        if (!container || !window.allProfessionalsCache) return;

        const query = (searchInput.value || '').toLowerCase().trim();
        const categoryFilter = document.getElementById('category-filter');
        const selectedCategory = categoryFilter ? categoryFilter.value : 'Todos';

        if (recentContainer) {
            recentContainer.style.display = window.allProfessionalsCache.length > 0 ? 'block' : 'none';
        }

        const currentUserType = localStorage.getItem('user_type') || '';
        const oppositeType = currentUserType === 'client' ? 'professional' 
                           : currentUserType === 'professional' ? 'client' 
                           : ''; 

        const filtered = window.allProfessionalsCache.filter(p => {
            if (oppositeType && p.user_type && p.user_type !== oppositeType) return false;

            const name = (p.full_name || p.name || '').toLowerCase();
            const city = (p.city || '').toLowerCase();
            const addr = (p.address || '').toLowerCase();
            const cat = (p.category || '').toLowerCase();
            
            const matchesQuery = name.includes(query) || city.includes(query) || addr.includes(query) || cat.includes(query);
            const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
            
            return matchesQuery && matchesCategory;
        });

        // Sort based on proximity vs. stars/rating
        if (window.searchSortMode === 'rating') {
            filtered.sort((a, b) => {
                const ratingA = parseFloat(a.rating) || 0;
                const ratingB = parseFloat(b.rating) || 0;
                if (ratingB !== ratingA) {
                    return ratingB - ratingA;
                }
                const nameA = (a.full_name || a.name || '').toLowerCase();
                const nameB = (b.full_name || b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
        } else {
            const userCity = (localStorage.getItem('user_city') || 'São Paulo').split(',')[0].trim().toLowerCase();
            filtered.sort((a, b) => {
                const cityA = (a.city || '').toLowerCase();
                const cityB = (b.city || '').toLowerCase();
                
                const matchesA = cityA.includes(userCity) || userCity.includes(cityA);
                const matchesB = cityB.includes(userCity) || userCity.includes(cityB);
                
                if (matchesA && !matchesB) return -1;
                if (!matchesA && matchesB) return 1;
                
                // Fallback de proximidade: Ordena alfabeticamente para diferenciar visualmente da ordenação por Estrelas
                const nameA = (a.full_name || a.name || '').toLowerCase();
                const nameB = (b.full_name || b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
        }

        if (filtered.length === 0) {
            const emptyLabel = oppositeType === 'professional' ? 'profissional' : oppositeType === 'client' ? 'cliente' : 'resultado';
            container.innerHTML = `<div style="text-align:center; padding:2rem; color:#888;">Nenhum ${emptyLabel} encontrado.</div>`;
            return;
        }

        container.innerHTML = filtered.map(p => {
            const isProf = p.user_type === 'professional';
            const targetHash = isProf ? `#profissional-home/${p.id}` : `#client-home/${p.id}`;
            const avatarHtml = p.avatar_url 
                ? `<img src="${p.avatar_url}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
                : `<div style="width:100%; height:100%; background:linear-gradient(135deg, ${isProf ? '#a855f7, #6b21a8' : '#444, #111'}); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:1.1rem; border-radius:50%; border: 1px solid #333;">${(p.full_name || 'U')[0].toUpperCase()}</div>`;
            
            const mainService = isProf && p.services && p.services.length > 0 ? p.services[0].name : (isProf ? p.specialty : '');
            const mainPrice = isProf && p.services && p.services.length > 0 ? `R$ ${p.services[0].price}` : '';
            
            return `
            <div class="card" style="display:flex; gap:0.8rem; align-items:center; cursor:pointer; background: #111; border: 1px solid #222; border-radius: 16px; padding: 1rem; margin-bottom: 0.8rem; position: relative;" onclick="location.hash='${targetHash}'">
                <div style="width:56px; height:56px; flex-shrink:0;">
                    ${avatarHtml}
                </div>
                <div style="flex:1; overflow:hidden;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="font-weight:800; font-size:0.95rem; color: #fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.full_name || 'Usuário'}</div>
                    </div>
                    <div style="font-size:0.7rem; color:#888; font-weight: 600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top: 2px;">
                        <span style="color: ${isProf ? 'var(--primary-accent)' : '#aaa'};">${isProf ? '💼 ' + (p.category || 'Profissional') : '👤 Cliente'}</span> ${isProf ? '• ★ ' + (p.rating || '5.0') : ''}
                    </div>
                    
                    ${mainService ? `
                        <div style="font-size:0.75rem; color:#fff; font-weight: 700; margin-top: 4px; display: flex; align-items: center; gap: 8px;">
                            <span>✨ ${mainService}</span>
                            ${mainPrice ? `<span style="color: #666; font-weight: 600; font-size: 0.7rem;">• ${mainPrice}</span>` : ''}
                        </div>
                    ` : ''}

                    <div style="font-size:0.65rem; color:#555; margin-top:4px; display: flex; align-items: center; gap: 4px;">
                        <span>📍</span> <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.address || p.city || 'Local não informado'}</span>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    window.filterAndRenderSearch = filterAndRenderSearch;

    const sortToggleBtn = document.getElementById('search-sort-toggle');
    if (sortToggleBtn) {
        // Remove inline click handler fallback if bound via JS
        sortToggleBtn.onclick = null;
        sortToggleBtn.addEventListener('click', window.toggleSearchSortMode);
    }

    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const searchTrigger = document.getElementById('btn-search-trigger');

    if (searchInput) {
        searchInput.addEventListener('input', filterAndRenderSearch);
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterAndRenderSearch);
    }
    if (searchTrigger) {
        searchTrigger.addEventListener('click', () => {
            // Executa a busca real no banco de dados quando clica no ícone
            if (typeof renderSearchProfessionals === 'function') {
                renderSearchProfessionals();
            }
        });
    }

    // --- Helper: Setup Image Preview for Registration ---
    function setupImagePreview(inputId, previewId) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        if (input && preview) {
            input.addEventListener('change', function() {
                const file = this.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        preview.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;" />`;
                    }
                    reader.readAsDataURL(file);
                }
            });
        }
    }
    
    setupImagePreview('prof-photo-input', 'prof-photo-preview');
    setupImagePreview('prof-logo-input', 'prof-logo-preview');

    // --- Logic for Multi-selection Specialties ---
    const specialtyInput = document.getElementById('specialties-input');
    const addSpecialtyBtn = document.getElementById('btn-add-specialty');
    const chipsContainer = document.getElementById('prof-specialties-chips');
    const selectedSpecialties = new Set();

    if (specialtyInput && addSpecialtyBtn && chipsContainer) {
        const addSpecialty = (value) => {
            const val = value || specialtyInput.value.trim();
            if (!val || selectedSpecialties.has(val)) {
                specialtyInput.value = '';
                return;
            }

            if (selectedSpecialties.size >= 5) {
                alert("Você pode escolher no máximo 5 especialidades.");
                specialtyInput.value = '';
                return;
            }

            // Remove placeholder if it's the first one
            if (selectedSpecialties.size === 0) {
                chipsContainer.innerHTML = '';
            }

            selectedSpecialties.add(val);
            
            const chip = document.createElement('div');
            chip.className = 'chip';
            chip.style.background = '#ffffff';
            chip.style.color = '#000000';
            chip.style.border = 'none';
            chip.style.padding = '5px 12px';
            chip.style.fontSize = '0.85rem';
            chip.innerHTML = `${val} <span style="margin-left:8px; cursor:pointer; font-weight:bold;">×</span>`;
            
            chip.querySelector('span').onclick = () => {
                selectedSpecialties.delete(val);
                chip.remove();
                if (selectedSpecialties.size === 0) {
                    chipsContainer.innerHTML = '<span style="color: #555; font-size: 0.8rem; padding: 5px;">Selecione abaixo...</span>';
                }
            };

            chipsContainer.appendChild(chip);
            specialtyInput.value = '';
        };

        addSpecialtyBtn.onclick = () => addSpecialty();
        
        specialtyInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addSpecialty();
            }
        };
    }

    window.doLogout = async () => {
        const btn = document.querySelector('.logout');
        if (btn) btn.innerHTML = '<span class="loader-mini"></span> Saindo...';

        try {
            if (supabaseClient) {
                await Promise.race([
                    supabaseClient.auth.signOut(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
                ]);
            }
        } catch (e) {
            console.warn("Supabase signOut timeout/error (ignoring):", e);
        } finally {
            localStorage.clear();
            console.log("Usuário deslogado manualmente.");
            window.location.hash = '#login';
            window.location.reload(); // Force full reload to clean all state
        }
    };

    let logoutTimer;
    function setupLongPressLogout() {
        const target = document.body;
        const LONG_PRESS_DURATION = 3000;

        const start = (e) => {
            // Apenas para mobile ou cliques longos
            logoutTimer = setTimeout(() => {
                const hasSession = !!localStorage.getItem('user_email');
                if (hasSession && confirm("Deseja sair da sua conta?")) {
                    window.doLogout();
                }
            }, LONG_PRESS_DURATION);
        };

        const cancel = () => {
            clearTimeout(logoutTimer);
        };

        // Mobile
        target.addEventListener('touchstart', start, { passive: true });
        target.addEventListener('touchend', cancel);
        target.addEventListener('touchmove', cancel);
        
        // Desktop
        target.addEventListener('mousedown', start);
        target.addEventListener('mouseup', cancel);
        target.addEventListener('mouseleave', cancel);
    }

    window.resetApp = function() {
        if (confirm("Isso irá limpar todos os seus dados locais e deslogar. Deseja continuar?")) {
            localStorage.clear();
            supabaseClient.auth.signOut();
            window.location.hash = '#splash';
            window.location.reload();
        }
    };

    window.fixAdminAccount = async function() {
        if (!supabaseClient) return;
        const user = await getCurrentUser();
        if (!user) return alert("Você precisa estar logado!");

        console.log("Forcing Admin Sync for:", user.email);
        const { error } = await supabaseClient.from('profiles')
            .update({ user_type: 'admin', full_name: 'ZeroZynapses' })
            .eq('id', user.id);

        if (error) {
            console.error("Error fixing admin account:", error);
            alert("Erro ao sincronizar: " + error.message);
        } else {
            localStorage.setItem('user_type', 'admin');
            alert("Conta sincronizada com sucesso! Reiniciando...");
            window.location.reload();
        }
    };

    // --- Notifications Logic ---
    let notificationSubscription = null;

    async function setupNotificationsSubscription() {
        if (!supabaseClient) return;
        
        const user = await getCurrentUser();
        if (!user) return;

        // Clean up old subscription if exists
        if (notificationSubscription) {
            console.log("Cleaning up old notification subscription...");
            try {
                supabaseClient.removeChannel(notificationSubscription);
            } catch (err) {
                console.warn("Error removing old notification channel:", err);
            }
            notificationSubscription = null;
        }

        // Request system notification permissions
        if (window.Notification && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        console.log("Subscribing to dedicated notifications for:", user.id);
        notificationSubscription = supabaseClient
            .channel('dedicated-notifications')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
            }, payload => {
                console.log("🔔 Dedicated notification update detected:", payload);
                updateNotificationBadges();
                
                // Show a toast or update UI if on the screen
                const notifScreen = document.getElementById('notificacoes');
                if (notifScreen && notifScreen.classList.contains('active')) {
                    renderNotifications();
                } else if (window.location.hash === '#notificacoes' || window.location.hash.includes('notificacoes')) {
                    renderNotifications();
                }
            })
            .subscribe();

        // Inicia a verificação periódica de lembretes em background
        startAppointmentRemindersPolling(user.id);
    }

    // --- Background Appointment Delay Notifications ---
    let remindersInterval = null;
    
    function startAppointmentRemindersPolling(userId) {
        if (remindersInterval) clearInterval(remindersInterval);
        
        // Verifica uma vez imediatamente
        checkAppointmentReminders(userId);
        
        // E depois repete a cada 60 segundos
        remindersInterval = setInterval(() => {
            checkAppointmentReminders(userId);
        }, 60000);
    }

    async function checkAppointmentReminders(userId) {
        if (!supabaseClient) return;
        
        try {
            const isProf = localStorage.getItem('user_type') === 'professional';
            
            // Busca os agendamentos confirmados associados a este usuário
            let query = supabaseClient.from('appointments').select('*, client:client_id(full_name), professional:professional_id(full_name)');
            if (isProf) {
                query = query.eq('professional_id', userId);
            } else {
                query = query.eq('client_id', userId);
            }
            
            const { data: apps, error } = await query.eq('status', 'confirmed');
                
            if (error || !apps || apps.length === 0) return;
            
            const now = new Date();
            const notifiedApps = JSON.parse(localStorage.getItem('notified_delay_apps') || '[]');
            let hasNewNotification = false;
            
            apps.forEach(a => {
                if (notifiedApps.includes(a.id)) return; // Já foi notificado
                
                // Monta a data/hora do agendamento (Ex: '2026-05-18T14:30')
                const appDateTime = new Date(`${a.date}T${a.time}`);
                if (isNaN(appDateTime.getTime())) return;
                
                const diffMs = now - appDateTime;
                const diffMins = Math.floor(diffMs / 1000 / 60);
                
                // Se passou exatamente 30 minutos ou mais (e menos de 120 minutos para evitar registros antigos)
                if (diffMins >= 30 && diffMins < 120) {
                    const otherName = isProf 
                        ? (a.client?.full_name || 'Cliente') 
                        : (a.professional?.full_name || 'Profissional');
                    
                    // 1. Toca som premium via síntese de áudio Web Audio API
                    playSynthNotificationSound();
                    
                    // 2. Dispara notificação de sistema (mesmo minimizado)
                    showSystemNotification(
                        "⏳ Agendamento Atrasado!",
                        `Passaram-se 30 minutos do horário marcado (${a.time}) para o seu compromisso com ${otherName}.`
                    );
                    
                    // 3. Mostra banner premium flutuante no app
                    showLuxuryNotificationToast(
                        "⏳ Agendamento Atrasado!",
                        `Já se passaram 30 minutos do horário marcado das ${a.time} com ${otherName}.`
                    );
                    
                    notifiedApps.push(a.id);
                    hasNewNotification = true;
                }
            });
            
            if (hasNewNotification) {
                localStorage.setItem('notified_delay_apps', JSON.stringify(notifiedApps));
            }
        } catch (err) {
            console.warn("Erro ao verificar lembretes de atraso de agendamento:", err);
        }
    }

    function playSynthNotificationSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            
            // Tom 1: Sino agudo
            const osc1 = audioCtx.createOscillator();
            const gain1 = audioCtx.createGain();
            osc1.connect(gain1);
            gain1.connect(audioCtx.destination);
            
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // nota Lá5
            osc1.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.15); // Mi6
            
            gain1.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
            
            osc1.start();
            osc1.stop(audioCtx.currentTime + 0.6);
            
            // Tom 2: Harmônico em contratempo
            setTimeout(() => {
                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);
                
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(1046.50, audioCtx.currentTime); // Dó6
                osc2.frequency.exponentialRampToValueAtTime(1567.98, audioCtx.currentTime + 0.15); // Sol6
                
                gain2.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
                
                osc2.start();
                osc2.stop(audioCtx.currentTime + 0.6);
            }, 100);
        } catch (e) {
            console.warn("Falha ao tocar som de notificação:", e);
        }
    }

    function showSystemNotification(title, body) {
        if (!window.Notification) return;
        
        if (Notification.permission === 'granted') {
            try {
                const notif = new Notification(title, {
                    body: body,
                    icon: 'https://cdn-icons-png.flaticon.com/512/3602/3602123.png',
                    silent: true
                });
                
                notif.onclick = () => {
                    window.focus();
                    window.location.hash = '#agendamento';
                };
            } catch (e) {
                console.error("Erro ao emitir notificação de sistema:", e);
            }
        }
    }

    function showLuxuryNotificationToast(title, message) {
        let toastContainer = document.getElementById('luxury-toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'luxury-toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                width: 90%;
                max-width: 400px;
                pointer-events: none;
            `;
            document.body.appendChild(toastContainer);
            
            // Injeta animações CSS sob demanda
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideDownIn {
                    from { transform: translateY(-20px) scale(0.95); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
                @keyframes fadeOut {
                    to { opacity: 0; transform: translateY(-10px) scale(0.95); }
                }
            `;
            document.head.appendChild(style);
        }
        
        const toast = document.createElement('div');
        toast.style.cssText = `
            background: rgba(18, 18, 18, 0.95);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(168, 85, 247, 0.4);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(168, 85, 247, 0.1);
            border-radius: 16px;
            padding: 1.25rem;
            display: flex;
            flex-direction: column;
            gap: 4px;
            animation: slideDownIn 0.4s cubic-bezier(0.16, 1, 0.3, 1), fadeOut 0.4s ease 7.6s forwards;
            pointer-events: auto;
            cursor: pointer;
        `;
        
        toast.innerHTML = `
            <div style="font-weight: 900; color: #fff; font-size: 1.05rem; display: flex; align-items: center; gap: 8px;">
                <span>🔔</span>
                <span>${title}</span>
            </div>
            <div style="font-size: 0.85rem; color: #ccc; font-weight: 600; line-height: 1.4; margin-top: 4px;">
                ${message}
            </div>
        `;
        
        toast.onclick = () => {
            window.location.hash = '#agendamento';
            toast.remove();
        };
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 8000);
    }

    async function updateNotificationBadges() {
        if (!supabaseClient) return;
        const user = await getCurrentUser();
        if (!user) return;

        // Fetch unread notifications count
        const { count: notifCount, error: notifError } = await supabaseClient
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        // Fetch unread messages count
        const { count: msgCount, error: msgError } = await supabaseClient
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', user.id)
            .eq('is_read', false);

        const profileBadge = document.getElementById('profile-notif-badge');
        const menuBadge = document.getElementById('menu-notif-badge');
        const menuChatBadge = document.getElementById('menu-chat-badge');

        const activeNotifs = notifCount || 0;
        const activeMessages = msgCount || 0;

        // Update dedicated notification badges
        if (activeNotifs > 0) {
            if (menuBadge) {
                menuBadge.style.display = 'block';
                menuBadge.innerText = activeNotifs > 9 ? '9+' : activeNotifs;
            }
        } else {
            if (menuBadge) menuBadge.style.display = 'none';
        }

        // Update menu chat badge (messages count)
        if (activeMessages > 0) {
            if (menuChatBadge) {
                menuChatBadge.style.display = 'block';
                menuChatBadge.innerText = activeMessages > 9 ? '9+' : activeMessages;
            }
        } else {
            if (menuChatBadge) menuChatBadge.style.display = 'none';
        }

        // Top tab profile badge lights up if EITHER unread notifications OR unread messages exist
        const totalAlerts = activeNotifs + activeMessages;
        if (totalAlerts > 0) {
            if (profileBadge) profileBadge.style.display = 'block';
        } else {
            if (profileBadge) profileBadge.style.display = 'none';
        }
    }

    async function renderNotifications() {
        const container = document.getElementById('notifications-container');
        if (!container) return;

        const user = await getCurrentUser();
        if (!user) return;

        container.innerHTML = '<div class="loader-mini" style="margin: 2rem auto;"></div>';

        // Fetch from the new notifications table (limit to 30)
        let { data: notifications, error } = await supabaseClient
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(30);

        if (error) {
            console.error("Error fetching dedicated notifications:", error);
            container.innerHTML = '<p style="text-align:center; color:#ff4d4d; padding:2rem;">Erro ao carregar notificações. Verifique se a tabela "notifications" existe no banco de dados.</p>';
            return;
        }

        if (!notifications || notifications.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 4rem 1rem; opacity: 0.3;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">🕭</div>
                    <p style="font-size: 0.9rem; font-weight: 600;">Sem notificações novas.</p>
                </div>
            `;
            return;
        }

        // Fetch senders manually to guarantee it works even without foreign keys
        const senderIds = [...new Set(notifications.filter(n => n.sender_id).map(n => n.sender_id))];
        let profilesMap = new Map();
        if (senderIds.length > 0) {
            try {
                const { data: profilesData } = await supabaseClient
                    .from('profiles')
                    .select('id, full_name, avatar_url, user_type')
                    .in('id', senderIds);
                
                if (profilesData) {
                    profilesData.forEach(p => profilesMap.set(p.id, p));
                }
            } catch (err) {
                console.warn("Could not fetch sender profiles:", err);
            }
        }

        const unreadCount = notifications.filter(n => !n.is_read).length;
        let headerHtml = '';
        if (unreadCount > 0) {
            headerHtml = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <span style="font-size: 0.8rem; color: #888; font-weight: 700;">${unreadCount} novas</span>
                    <button onclick="markAllNotificationsAsRead()" style="background: none; border: none; color: var(--primary-accent); font-size: 0.8rem; font-weight: 800; cursor: pointer;">Marcar todas como lidas</button>
                </div>
            `;
        }

        container.innerHTML = headerHtml + notifications.map(n => {
            const sender = profilesMap.get(n.sender_id) || { full_name: 'Sistema Zero', avatar_url: '', user_type: 'system' };
            const timeStr = new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = new Date(n.created_at).toLocaleDateString('pt-BR');
            const isToday = new Date(n.created_at).toDateString() === new Date().toDateString();
            
            // Icon mapping based on type
            const icons = {
                'message': '🗨️',
                'appointment': '📅',
                'system': '⚙️',
                'promotion': '🎁',
                'info': 'ℹ️'
            };
            const icon = icons[n.type] || '🕭';
            
            // Use avatar if it's a message, otherwise use icon
            const isMessage = n.type === 'message';
            const displayAvatar = (isMessage && sender.avatar_url) ? `<img src="${sender.avatar_url}" style="width:100%; height:100%; object-fit:cover;">` : (isMessage ? sender.full_name[0].toUpperCase() : icon);

            let roleLabel = '';
            let roleColor = '';
            
            if (isMessage) {
                if (sender.user_type === 'admin') { roleLabel = 'ADM'; roleColor = '#f59e0b'; }
                else if (sender.user_type === 'professional') { roleLabel = 'PROFISSIONAL'; roleColor = '#a855f7'; }
                else if (sender.user_type === 'client') { roleLabel = 'CLIENTE'; roleColor = '#22c55e'; }
                else { roleLabel = 'SISTEMA'; roleColor = '#888'; }
            }

            const displayTitle = isMessage ? sender.full_name : n.title;

            return `
                <div class="notification-item ${n.is_read ? 'read' : 'unread'}" 
                     onclick="handleNotificationClick(event, '${n.id}', '${n.link}')" 
                     style="background: ${n.is_read ? '#111' : '#1a1a1a'}; 
                            padding: 1.25rem; 
                            border-radius: 20px; 
                            border: 1px solid ${n.is_read ? '#222' : 'rgba(168, 85, 247, 0.3)'}; 
                            display: flex; 
                            flex-direction: column;
                            gap: 12px; 
                            cursor: pointer; 
                            margin-bottom: 0.75rem;
                            position: relative;
                            overflow: hidden;
                            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);">
                    <div style="display: flex; gap: 15px; align-items: center; width: 100%;">
                        <div class="avatar-circle" style="width: 45px; height: 45px; background: #333; color: #fff; font-weight: 900; font-size: 1.2rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
                            ${displayAvatar}
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div style="display: flex; flex-direction: column;">
                                    <h4 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: ${n.is_read ? '#aaa' : '#fff'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayTitle}</h4>
                                    ${isMessage ? `<span style="font-size: 0.6rem; color: ${roleColor}; font-weight: 900; letter-spacing: 1px; margin-top: 2px;">${roleLabel}</span>` : ''}
                                </div>
                                <span style="font-size: 0.65rem; color: #555; flex-shrink: 0;">${isToday ? timeStr : dateStr}</span>
                            </div>
                            <p class="notif-short-text" style="margin: 6px 0 0 0; font-size: 0.85rem; color: ${n.is_read ? '#666' : '#888'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: all 0.3s ease;">
                                ${n.content}
                            </p>
                        </div>
                        ${!n.is_read ? '<div style="width: 8px; height: 8px; background: #a855f7; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);"></div>' : ''}
                    </div>

                    <!-- Expansion Detail Panel (Walks / Scrolls text on Hover/Click) -->
                    <div class="notif-detail-panel" style="max-height: 0; opacity: 0; overflow: hidden; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; gap: 10px; border-top: 1px solid rgba(255,255,255,0.03); padding-top: 0;">
                        <!-- Walking text ticker marquee -->
                        <div class="marquee-ticker-container" style="overflow: hidden; width: 100%; position: relative; background: rgba(168, 85, 247, 0.05); border: 1px solid rgba(168, 85, 247, 0.1); border-radius: 10px; padding: 8px 12px; margin-top: 6px;">
                            <div class="notif-marquee-wrapper" style="overflow: hidden; white-space: nowrap; width: 100%;">
                                <div class="notif-marquee-text" style="font-size: 0.85rem; color: #fff; display: inline-block; font-weight: 700; letter-spacing: 0.5px;">
                                    📢 &nbsp; ${n.content} &nbsp;&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;&nbsp; 📢 &nbsp; ${n.content}
                                </div>
                            </div>
                        </div>
                        
                        <!-- Full content readable multiline -->
                        <div class="notif-full-text" style="font-size: 0.85rem; color: #aaa; line-height: 1.4; padding: 4px 4px 0 4px;">
                            ${n.content}
                        </div>

                        <!-- Action bar -->
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #555; margin-top: 4px;">
                            <span>Enviado em: <strong style="color: #888;">${dateStr} às ${timeStr}</strong></span>
                            <div style="display: flex; gap: 8px;">
                                ${n.link ? `<button class="btn btn-sm" onclick="event.stopPropagation(); executeNotificationLink('${n.id}', '${n.link}')" style="background: var(--primary-accent); padding: 6px 14px; border-radius: 8px; font-weight: 900; font-size: 0.7rem; border: none; color: white; cursor: pointer; box-shadow: 0 4px 10px rgba(168, 85, 247, 0.2);">Acessar</button>` : ''}
                                ${!n.is_read ? `<button class="btn btn-sm" onclick="event.stopPropagation(); markOneAsRead('${n.id}')" style="background: rgba(255,255,255,0.05); padding: 6px 14px; border-radius: 8px; font-weight: 800; font-size: 0.7rem; border: 1px solid rgba(255,255,255,0.1); color: #ccc; cursor: pointer;">Lida</button>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.executeNotificationLink = async function(notifId, link) {
        if (!supabaseClient) return;
        await supabaseClient
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notifId);
        
        updateNotificationBadges();
        window.location.hash = link;
    };

    window.markOneAsRead = async function(notifId) {
        if (!supabaseClient) return;
        await supabaseClient
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notifId);
        
        updateNotificationBadges();
        renderNotifications();
    };

    window.handleNotificationClick = async function(event, notifId, link) {
        if (!supabaseClient) return;
        
        const isMobile = window.innerWidth <= 768;
        const card = event.currentTarget;

        if (isMobile) {
            if (!card.classList.contains('expanded')) {
                document.querySelectorAll('.notification-item.expanded').forEach(c => {
                    c.classList.remove('expanded');
                });
                card.classList.add('expanded');
                return;
            } else {
                card.classList.remove('expanded');
                return;
            }
        }

        await markOneAsRead(notifId);
        if (link) window.location.hash = link;
    };

    window.markAllNotificationsAsRead = async function() {
        if (!supabaseClient) return;
        const user = await getCurrentUser();
        if (!user) return;

        const { error } = await supabaseClient
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        if (error) {
            console.error("Error marking dedicated notifications as read:", error);
        } else {
            updateNotificationBadges();
            renderNotifications();
        }
    };

    // ==========================================
    // SISTEMA DE ALARME DE AGENDAMENTO (24H)
    // ==========================================
    window.playNotificationSound = function() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc1 = audioCtx.createOscillator();
            const gain1 = audioCtx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
            gain1.gain.setValueAtTime(0, audioCtx.currentTime);
            gain1.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
            gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            osc1.connect(gain1);
            gain1.connect(audioCtx.destination);
            osc1.start(audioCtx.currentTime);
            osc1.stop(audioCtx.currentTime + 0.3);
            
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
            gain2.gain.setValueAtTime(0, audioCtx.currentTime + 0.1);
            gain2.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.start(audioCtx.currentTime + 0.1);
            osc2.stop(audioCtx.currentTime + 0.5);
        } catch(e) { console.warn('AudioContext não suportado ou bloqueado', e); }
    };

    async function checkUpcomingAppointments(user) {
        if (!user || !user.id || !supabaseClient) return;

        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        const getLocalDateStr = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dayStr = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${dayStr}`;
        };

        const todayStr = getLocalDateStr(now);
        const tomorrowStr = getLocalDateStr(tomorrow);

        try {
            const { data: apps } = await supabaseClient
                .from('appointments')
                .select('*')
                .or(`client_id.eq.${user.id},professional_id.eq.${user.id}`)
                .gte('date', todayStr)
                .lte('date', tomorrowStr)
                .neq('status', 'cancelled'); // Don't check cancelled

            if (!apps) return;

            for (const a of apps) {
                const appDate = new Date(`${a.date}T${a.time}:00-03:00`);
                const timeDiffMs = appDate.getTime() - now.getTime();
                
                if (timeDiffMs > 0 && timeDiffMs <= 24 * 60 * 60 * 1000) {
                    const cacheKey = 'notified_app_24h_' + a.id;
                    if (!localStorage.getItem(cacheKey)) {
                        window.playNotificationSound();
                        const dateParts = a.date.split('-');
                        const brDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : a.date;
                        
                        if (user.id === a.client_id && a.status === 'pending') {
                            // Cliente precisa confirmar
                            window.showReconfirmModal(a.id, brDate, a.time);
                        } else {
                            // Profissional ou Cliente já confirmado apenas recebe aviso
                            showSuccessModal('⏰ Lembrete de Agendamento!', `Você tem um horário para ${brDate} às ${a.time}. Falta menos de 1 dia!`, () => {});
                        }
                        localStorage.setItem(cacheKey, 'true');
                    }
                }
            }
        } catch (err) {
            console.warn('Erro ao verificar alarmes:', err);
        }
    }

    window.showReconfirmModal = (appId, dateBr, time) => {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
            <div style="background:#1a1a1a; padding:2rem; border-radius:16px; border:2px solid #a855f7; text-align:center; max-width:400px; width:90%; box-shadow:0 0 30px rgba(168, 85, 247, 0.4);">
                <h2 style="color:#fff; margin-top:0;">⏰ Seu horário está chegando!</h2>
                <p style="color:#aaa; font-size:1rem; margin-bottom:1.5rem;">Seu agendamento para o dia <b>${dateBr}</b> às <b>${time}</b> é amanhã! Por favor, reconfirme sua presença para garantir a vaga com o profissional.</p>
                <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                    <button id="btn-reconfirm-yes" style="background:#10B981; color:#fff; border:none; padding:12px 20px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:1rem;">Confirmar Presença</button>
                    <button id="btn-reconfirm-no" style="background:#333; color:#aaa; border:none; padding:12px 20px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:1rem;">Lembrar Depois</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('btn-reconfirm-yes').onclick = async () => {
            const btn = document.getElementById('btn-reconfirm-yes');
            btn.innerHTML = 'Confirmando...';
            btn.disabled = true;
            await supabaseClient.from('appointments').update({ status: 'confirmed' }).eq('id', appId);
            modal.remove();
            showSuccessModal('Obrigado!', 'Sua presença foi confirmada e o profissional já foi avisado!', () => {
                 if (location.hash === '#agendamento' && window.renderAgendamentoScreen) {
                     renderAgendamentoScreen();
                 }
            });
        };
        
        document.getElementById('btn-reconfirm-no').onclick = () => {
            modal.remove();
        };
    };

    // Libera o áudio no primeiro clique do usuário na tela (Política de autoplay dos navegadores)
    let audioCtxUnlocked = false;
    document.body.addEventListener('click', () => {
        if (!audioCtxUnlocked) {
            audioCtxUnlocked = true;
            getCurrentUser().then(user => {
                if (user) {
                    checkUpcomingAppointments(user);
                    // Checa novamente a cada 15 minutos se o app ficar aberto
                    setInterval(() => checkUpcomingAppointments(user), 15 * 60 * 1000);
                }
            });
        }
    }, { once: true });

    init();

    async function renderGastosData() {
        const totalEl = document.getElementById('gastos-total');
        const preferidosList = document.getElementById('gastos-preferidos-list');
        const historicoList = document.getElementById('gastos-historico-list');
        
        if (!totalEl || !preferidosList || !historicoList) return;

        const user = await getCurrentUser();
        if (!user) return;

        // Dynamic detection of Admin level
        const userEmail = user.email ? user.email.toLowerCase() : '';
        const userMetaName = user.user_metadata?.full_name ? user.user_metadata.full_name.toLowerCase() : '';
        const myName = localStorage.getItem('user_name') || '';
        const isZeroAdm = userEmail.includes('admin@zerosynapses.com') || 
                         userMetaName.includes('zero') || 
                         userMetaName.includes('zynapse') || 
                         myName.toLowerCase().includes('zero') ||
                         myName.toLowerCase().includes('zynapse') ||
                         localStorage.getItem('user_type') === 'admin';

        const isProf = !isZeroAdm && (user.user_metadata?.user_type === 'professional' || localStorage.getItem('user_type') === 'professional');

        // Atualiza os rótulos do DOM de acordo com o tipo de usuário
        const headerTitle = document.querySelector('#gastos h3');
        const infoLabel = document.querySelector('#gastos .info-label');
        const favTitle = document.querySelector('#gastos h4:nth-of-type(1)');
        const histTitle = document.querySelector('#gastos h4:nth-of-type(2)');

        if (isZeroAdm) {
            if (headerTitle) headerTitle.innerText = 'Movimentação Geral';
            if (infoLabel) infoLabel.innerText = 'Total Movimentado no Aplicativo';
            if (favTitle) favTitle.innerText = 'Melhores Estabelecimentos';
            if (histTitle) histTitle.innerText = 'Histórico Geral de Transações';
        } else if (isProf) {
            if (headerTitle) headerTitle.innerText = 'Meu Lucro';
            if (infoLabel) infoLabel.innerText = 'Total Ganho na Plataforma';
            if (favTitle) favTitle.innerText = 'Clientes Mais Frequentes';
            if (histTitle) histTitle.innerText = 'Últimos 12 Atendimentos';
        } else {
            if (headerTitle) headerTitle.innerText = 'Meus Gastos';
            if (infoLabel) infoLabel.innerText = 'Total Gasto na Plataforma';
            if (favTitle) favTitle.innerText = 'Meus Lugares Preferidos';
            if (histTitle) histTitle.innerText = 'Últimos 12 Agendamentos';
        }

        // Show preloader
        totalEl.innerHTML = '<span class="skeleton-pulse" style="display:inline-block; width:140px; height:24px; border-radius:6px; margin: 0.5rem auto 0 auto;"></span>';
        
        preferidosList.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:10px; width:100%;">
                <div style="background:#111; border:1px solid #222; border-radius:16px; padding:1.25rem; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; flex-direction:column; gap:8px; flex:1;">
                        <div class="skeleton-pulse" style="width:150px; height:14px; border-radius:7px;"></div>
                        <div class="skeleton-pulse" style="width:100px; height:10px; border-radius:5px;"></div>
                    </div>
                    <div class="skeleton-pulse" style="width:50px; height:25px; border-radius:8px;"></div>
                </div>
            </div>
        `;
        
        historicoList.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:12px; width:100%;">
                <div style="background:#111; border:1px solid #222; border-radius:16px; padding:1.25rem; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; flex-direction:column; gap:8px; flex:1;">
                        <div class="skeleton-pulse" style="width:130px; height:14px; border-radius:7px;"></div>
                        <div class="skeleton-pulse" style="width:170px; height:10px; border-radius:5px;"></div>
                    </div>
                    <div class="skeleton-pulse" style="width:65px; height:30px; border-radius:10px;"></div>
                </div>
                <div style="background:#111; border:1px solid #222; border-radius:16px; padding:1.25rem; display:flex; justify-content:space-between; align-items:center; opacity:0.6;">
                    <div style="display:flex; flex-direction:column; gap:8px; flex:1;">
                        <div class="skeleton-pulse" style="width:100px; height:14px; border-radius:7px;"></div>
                        <div class="skeleton-pulse" style="width:140px; height:10px; border-radius:5px;"></div>
                    </div>
                    <div class="skeleton-pulse" style="width:65px; height:30px; border-radius:10px;"></div>
                </div>
            </div>
        `;

        let apps = [];
        let isOffline = false;

        try {
            // 1. Fetch appointments: clients fetch by client_id, professionals by professional_id, ADM fetches ALL!
            let query = supabaseClient.from('appointments');
            if (isZeroAdm) {
                query = query.select('*, client:client_id(full_name), professional:professional_id(full_name, category)');
            } else if (isProf) {
                query = query.select('*, client:client_id(full_name)').eq('professional_id', user.id);
            } else {
                query = query.select('*, professional:professional_id(full_name, category)').eq('client_id', user.id);
            }

            const result = await Promise.race([
                query.order('date', { ascending: false }).order('time', { ascending: false }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 4000))
            ]);

            if (result.error) throw result.error;
            apps = result.data || [];
        } catch (err) {
            console.warn("⚠️ Erro ao carregar agendamentos do Supabase para Gastos:", err.message || err);
            isOffline = true;
        }

        if (isOffline || apps.length === 0) {
            // Tenta carregar do localStorage local como fallback imediato e à prova de falhas
            const localStr = localStorage.getItem('user_appointments');
            if (localStr) {
                try {
                    const parsed = JSON.parse(localStr);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        apps = parsed.map(a => ({
                            ...a,
                            professional: a.professional || { full_name: a.profName || 'Profissional', category: 'Serviços' },
                            client: a.client || { full_name: a.clientName || 'Cliente' }
                        }));
                    }
                } catch (e) {
                    console.warn("Erro ao parsear user_appointments local:", e);
                }
            }
        }

        try {
            // 2. Calculate Total Spent / Earned
            let totalSpent = 0;
            const itemCounts = {}; 

            apps.forEach(a => {
                const price = a.price ? Number(a.price) : 45.0; // fallback to 45
                totalSpent += price;

                const displayName = isZeroAdm
                    ? (a.professional?.full_name || a.profName || 'Profissional')
                    : (isProf 
                        ? (a.client?.full_name || 'Cliente')
                        : (a.professional?.full_name || 'Profissional'));
                itemCounts[displayName] = (itemCounts[displayName] || 0) + 1;
            });

            totalEl.innerText = `R$ ${totalSpent.toFixed(2).replace('.', ',')}`;

            // 3. Find favorite professional / client
            let favItem = null;
            let maxCount = 0;
            for (const [name, count] of Object.entries(itemCounts)) {
                if (count > maxCount) {
                    maxCount = count;
                    favItem = name;
                }
            }

            if (favItem) {
                if (isZeroAdm) {
                    const favProfObj = apps.find(a => (a.professional?.full_name || a.profName || a.professional_id) === favItem)?.professional;
                    const category = favProfObj?.category || 'Profissional';
                    preferidosList.innerHTML = `
                        <div style="background:#111; padding:1.25rem; border-radius:16px; border:1px solid #222; display: flex; align-items: center; gap: 12px; margin-bottom: 1rem; width: 100%;">
                            <div style="width:45px; height:45px; background:rgba(168, 85, 247, 0.1); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; color:#a855f7;">🏆</div>
                            <div style="flex:1;">
                                <div style="font-weight: 800; color: #fff; font-size: 1.05rem;">${favItem}</div>
                                <div style="font-size: 0.75rem; color: #888; font-weight: 600; margin-top: 2px;">Melhor Estabelecimento • ${category} • ${maxCount} agendamentos</div>
                            </div>
                        </div>
                    `;
                } else if (isProf) {
                    preferidosList.innerHTML = `
                        <div style="background:#111; padding:1.25rem; border-radius:16px; border:1px solid #222; display: flex; align-items: center; gap: 12px; margin-bottom: 1rem; width: 100%;">
                            <div style="width:45px; height:45px; background:rgba(16, 185, 129, 0.1); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; color:#10B981;">👤</div>
                            <div style="flex:1;">
                                <div style="font-weight: 800; color: #fff; font-size: 1.05rem;">${favItem}</div>
                                <div style="font-size: 0.75rem; color: #888; font-weight: 600; margin-top: 2px;">Cliente VIP • ${maxCount} atendimentos</div>
                            </div>
                        </div>
                    `;
                } else {
                    const favProfObj = apps.find(a => a.professional?.full_name === favItem)?.professional;
                    const category = favProfObj?.category || 'Profissional';
                    preferidosList.innerHTML = `
                        <div style="background:#111; padding:1.25rem; border-radius:16px; border:1px solid #222; display: flex; align-items: center; gap: 12px; margin-bottom: 1rem; width: 100%;">
                            <div style="width:45px; height:45px; background:rgba(168, 85, 247, 0.1); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; color:#a855f7;">💼</div>
                            <div style="flex:1;">
                                <div style="font-weight: 800; color: #fff; font-size: 1.05rem;">${favItem}</div>
                                <div style="font-size: 0.75rem; color: #888; font-weight: 600; margin-top: 2px;">${category} • ${maxCount} agendamentos</div>
                            </div>
                        </div>
                    `;
                }
            } else {
                preferidosList.innerHTML = isZeroAdm
                    ? '<p style="color: #666; font-size: 0.9rem; text-align: center; margin: 1rem 0;">Ainda não há transações registradas no aplicativo.</p>'
                    : (isProf 
                        ? '<p style="color: #666; font-size: 0.9rem; text-align: center; margin: 1rem 0;">Você ainda não tem clientes recorrentes.</p>'
                        : '<p style="color: #666; font-size: 0.9rem; text-align: center; margin: 1rem 0;">Você ainda não tem um lugar preferido.</p>');
            }

            // 4. Render Last 12 Appointments
            const last12 = apps.slice(0, 12);
            if (last12.length === 0) {
                historicoList.innerHTML = isZeroAdm
                    ? '<p style="color: #666; font-size: 0.9rem; text-align: center; margin: 1rem 0;">Nenhuma movimentação foi registrada na aplicação até o momento.</p>'
                    : (isProf
                        ? '<p style="color: #666; font-size: 0.9rem; text-align: center; margin: 1rem 0;">Você ainda não possui atendimentos faturados.</p>'
                        : '<p style="color: #666; font-size: 0.9rem; text-align: center; margin: 1rem 0;">Você ainda não realizou nenhum agendamento.</p>');
            } else {
                historicoList.innerHTML = last12.map(a => {
                    const dateParts = a.date.split('-');
                    const dateBr = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : a.date;
                    const displayName = isZeroAdm
                        ? `${a.client?.full_name || 'Cliente'} ➔ ${a.professional?.full_name || a.profName || 'Profissional'}`
                        : (isProf 
                            ? (a.client?.full_name || 'Cliente') 
                            : (a.professional?.full_name || 'Profissional'));
                    const serviceName = a.service_name || 'Serviço';
                    const priceVal = a.price ? Number(a.price).toFixed(2).replace('.', ',') : '45,00';
                    
                    let statusBadge = '';
                    if (a.status === 'confirmed') {
                        statusBadge = '<span style="background: rgba(16, 185, 129, 0.1); color: #10B981; padding: 2px 6px; border-radius: 4px; font-size: 0.6rem; font-weight: 800; border: 1px solid rgba(16, 185, 129, 0.2); margin-top: 4px; display: inline-block;">CONFIRMADO</span>';
                    } else if (a.status === 'pending') {
                        statusBadge = '<span style="background: rgba(245, 158, 11, 0.1); color: #F59E0B; padding: 2px 6px; border-radius: 4px; font-size: 0.6rem; font-weight: 800; border: 1px solid rgba(245, 158, 11, 0.2); margin-top: 4px; display: inline-block;">PENDENTE</span>';
                    } else {
                        statusBadge = '<span style="background: rgba(239, 68, 68, 0.1); color: #EF4444; padding: 2px 6px; border-radius: 4px; font-size: 0.6rem; font-weight: 800; border: 1px solid rgba(239, 68, 68, 0.2); margin-top: 4px; display: inline-block;">CANCELADO</span>';
                    }

                    return `
                        <div style="background:#111; padding:1.25rem; border-radius:16px; border:1px solid #222; display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <div style="min-width: 0; flex: 1;">
                                <div style="font-weight: 800; color: #fff; font-size: 1.05rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayName}</div>
                                <div style="font-size: 0.75rem; color: #888; font-weight: 600; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${serviceName} • ${dateBr} às ${a.time}</div>
                                ${statusBadge}
                            </div>
                            <div style="font-size: 1.15rem; font-weight: 900; color: #10B981; margin-left: 10px; flex-shrink: 0;">
                                R$ ${priceVal}
                            </div>
                        </div>
                    `;
                }).join('');
            }

        } catch (err) {
            console.error("Erro ao carregar dados de gastos:", err);
            preferidosList.innerHTML = '';
            historicoList.innerHTML = '<p style="color: #f87171; font-size: 0.9rem; text-align: center; margin: 1rem 0;">Erro ao carregar os dados.</p>';
        }
    }
    window.renderGastosData = renderGastosData;

window.setupCustomProfDropdown = function(profsData, clientCity) {
    const searchInput = document.getElementById('prof-search-input');
    const hiddenSelect = document.getElementById('client-select-prof');
    const dropdownOptions = document.getElementById('prof-dropdown-options');
    const arrow = document.querySelector('.custom-select-arrow');
    const trigger = document.querySelector('.custom-select-trigger');

    if (!searchInput || !hiddenSelect || !dropdownOptions) return;

    window.loadedProfessionalsList = profsData || [];

    const renderOptions = (filteredProfs) => {
        if (!filteredProfs || filteredProfs.length === 0) {
            dropdownOptions.innerHTML = `<div style="padding: 1.2rem; color: #666; font-size: 0.85rem; text-align: center; font-weight: 600;">Nenhum profissional encontrado</div>`;
            return;
        }

        dropdownOptions.innerHTML = filteredProfs.map(p => {
            const cityText = p.city ? p.city.toUpperCase() : 'REGIÃO NÃO INFORMADA';
            const isNear = clientCity && p.city && (p.city.trim().toLowerCase() === clientCity.trim().toLowerCase());
            
            const badgeHtml = isNear 
                ? `<span style="background: rgba(168, 85, 247, 0.12); color: #c084fc; font-size: 0.65rem; padding: 2px 6px; border-radius: 6px; font-weight: 800; border: 1px solid rgba(168, 85, 247, 0.25); display: inline-block;">📍 PRÓXIMO DE VOCÊ</span>`
                : `<span style="background: rgba(255, 255, 255, 0.05); color: #888; font-size: 0.65rem; padding: 2px 6px; border-radius: 6px; font-weight: 700; border: 1px solid rgba(255, 255, 255, 0.1); display: inline-block;">📍 ${cityText}</span>`;

            return `
                <div class="custom-prof-option" data-id="${p.id}" data-name="${p.full_name}" style="padding: 1.2rem 1.2rem; color: #ccc; cursor: pointer; transition: all 0.2s ease; border-bottom: 1px solid #111; display: flex; flex-direction: column; gap: 6px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                        <span style="font-weight: 800; color: #fff; font-size: 0.95rem; text-transform: uppercase;">${p.full_name}</span>
                        ${badgeHtml}
                    </div>
                    <div style="font-size: 0.75rem; color: #888; font-weight: 600;">
                        ${p.specialty || 'Profissional'} • R$ ${(p.price ? Number(p.price) : 45.0).toFixed(2).replace('.', ',')}
                    </div>
                    ${p.address ? `<div style="font-size: 0.7rem; color: #666; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.address}</div>` : ''}
                </div>
            `;
        }).join('');

        const optionEls = dropdownOptions.querySelectorAll('.custom-prof-option');
        optionEls.forEach(opt => {
            opt.addEventListener('mouseenter', () => {
                opt.style.background = 'rgba(168, 85, 247, 0.1)';
                opt.style.color = '#a855f7';
            });
            opt.addEventListener('mouseleave', () => {
                opt.style.background = 'transparent';
                opt.style.color = '#ccc';
            });
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = opt.getAttribute('data-id');
                const name = opt.getAttribute('data-name');
                selectProfessional(id, name);
            });
        });
    };

    const selectProfessional = (id, name) => {
        hiddenSelect.value = id;
        searchInput.value = name.toUpperCase();
        searchInput.style.fontSize = '1.1rem';
        searchInput.style.color = '#fff';
        closeDropdown();
        hiddenSelect.dispatchEvent(new Event('change'));
    };

    const openDropdown = () => {
        dropdownOptions.style.display = 'block';
        if (arrow) arrow.style.transform = 'rotate(180deg)';
        if (trigger) trigger.style.borderColor = '#a855f7';
        
        const filterVal = searchInput.value.trim().toLowerCase();
        const matchesAnyName = (profsData || []).some(p => p.full_name.toLowerCase() === filterVal);
        if (matchesAnyName || filterVal === '') {
            renderOptions(profsData);
        } else {
            const filtered = (profsData || []).filter(p => p.full_name.toLowerCase().includes(filterVal));
            renderOptions(filtered);
        }
    };

    const closeDropdown = () => {
        dropdownOptions.style.display = 'none';
        if (arrow) arrow.style.transform = 'rotate(0deg)';
        if (trigger) trigger.style.borderColor = '#333';
        
        const currentId = hiddenSelect.value;
        if (currentId) {
            const selectedProf = (profsData || []).find(p => p.id === currentId);
            if (selectedProf) {
                searchInput.value = selectedProf.full_name.toUpperCase();
            }
        } else {
            searchInput.value = '';
        }
    };

    // Remove duplicates click listeners by cleaning previous listeners
    if (window._customProfDropdownTriggerListener) {
        trigger.removeEventListener('click', window._customProfDropdownTriggerListener);
    }
    window._customProfDropdownTriggerListener = (e) => {
        e.stopPropagation();
        if (e.target !== searchInput) {
            if (dropdownOptions.style.display === 'block') {
                closeDropdown();
            } else {
                searchInput.focus();
            }
        }
    };
    trigger.addEventListener('click', window._customProfDropdownTriggerListener);

    if (window._customProfDropdownFocusListener) {
        searchInput.removeEventListener('focus', window._customProfDropdownFocusListener);
    }
    window._customProfDropdownFocusListener = (e) => {
        e.stopPropagation();
        openDropdown();
    };
    searchInput.addEventListener('focus', window._customProfDropdownFocusListener);

    if (window._customProfDropdownInputClickListener) {
        searchInput.removeEventListener('click', window._customProfDropdownInputClickListener);
    }
    window._customProfDropdownInputClickListener = (e) => {
        e.stopPropagation();
        openDropdown();
    };
    searchInput.addEventListener('click', window._customProfDropdownInputClickListener);

    if (window._customProfDropdownInputListener) {
        searchInput.removeEventListener('input', window._customProfDropdownInputListener);
    }
    window._customProfDropdownInputListener = () => {
        dropdownOptions.style.display = 'block';
        if (arrow) arrow.style.transform = 'rotate(180deg)';
        
        const filterVal = searchInput.value.trim().toLowerCase();
        const filtered = (profsData || []).filter(p => p.full_name.toLowerCase().includes(filterVal));
        renderOptions(filtered);
    };
    searchInput.addEventListener('input', window._customProfDropdownInputListener);

    // Global document-wide touch/click detector to dismiss the custom dropdown beautifully on both mobile & desktop
    if (window._customProfDropdownGlobalClickListener) {
        document.removeEventListener('click', window._customProfDropdownGlobalClickListener);
    }
    window._customProfDropdownGlobalClickListener = (e) => {
        if (!trigger.contains(e.target) && !dropdownOptions.contains(e.target)) {
            closeDropdown();
        }
    };
    document.addEventListener('click', window._customProfDropdownGlobalClickListener);

    if (hiddenSelect.value) {
        const initialProf = (profsData || []).find(p => p.id === hiddenSelect.value);
        if (initialProf) {
            searchInput.value = initialProf.full_name.toUpperCase();
            searchInput.style.fontSize = '1.1rem';
        }
    } else {
        searchInput.value = '';
        searchInput.style.fontSize = '0.85rem';
    }
};

window.renderAgendamentoScreen = async function() {
    const container = document.getElementById('agendamento-dynamic-content');
    if (!container || !supabaseClient) return;

    try {

    container.innerHTML = `
        <div class="agendamento-preloader" style="padding: 1rem; display: flex; flex-direction: column; gap: 2rem; width: 100%; animation: fadeIn 0.3s ease-out;">
            <!-- Skeleton Title/Header -->
            <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: 1rem;">
                <div class="skeleton-pulse" style="width: 150px; height: 16px; border-radius: 8px;"></div>
                <div class="skeleton-pulse" style="width: 280px; height: 48px; border-radius: 12px; margin-top: 5px;"></div>
            </div>
            
            <!-- Skeleton Select/Inputs -->
            <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 1rem;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <div class="skeleton-pulse" style="width: 120px; height: 12px; border-radius: 6px;"></div>
                    <div class="skeleton-pulse" style="width: 100%; height: 56px; border-radius: 12px;"></div>
                </div>
            </div>

            <!-- Skeleton Appointment List -->
            <div style="margin-top: 2rem; display: flex; flex-direction: column; gap: 15px;">
                <div class="skeleton-pulse" style="width: 180px; height: 14px; border-radius: 7px; margin: 0 auto 10px auto;"></div>
                
                <!-- Card 1 -->
                <div style="background: #111; border: 1px solid #222; border-radius: 16px; padding: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
                        <div class="skeleton-pulse" style="width: 80px; height: 10px; border-radius: 5px;"></div>
                        <div class="skeleton-pulse" style="width: 140px; height: 16px; border-radius: 8px;"></div>
                        <div class="skeleton-pulse" style="width: 100px; height: 12px; border-radius: 6px;"></div>
                    </div>
                    <div class="skeleton-pulse" style="width: 60px; height: 35px; border-radius: 12px;"></div>
                </div>
                
                <!-- Card 2 -->
                <div style="background: #111; border: 1px solid #222; border-radius: 16px; padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; opacity: 0.6;">
                    <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
                        <div class="skeleton-pulse" style="width: 80px; height: 10px; border-radius: 5px;"></div>
                        <div class="skeleton-pulse" style="width: 120px; height: 16px; border-radius: 8px;"></div>
                        <div class="skeleton-pulse" style="width: 100px; height: 12px; border-radius: 6px;"></div>
                    </div>
                    <div class="skeleton-pulse" style="width: 60px; height: 35px; border-radius: 12px;"></div>
                </div>
            </div>
        </div>
    `;

    const user = await getCurrentUser();
    if (!user) {
        container.innerHTML = '<p style="text-align:center; padding: 2rem; color: #fff;">Por favor, faça login para acessar a agenda.</p>';
        return;
    }

    let userProfile = null;
    try {
        const query = supabaseClient.from('profiles').select('city, address, user_type').eq('id', user.id).maybeSingle();
        const result = await Promise.race([
            query,
            new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 3000))
        ]);
        userProfile = result.data || null;
    } catch(e) {
        console.warn("⚠️ Erro ou Timeout ao buscar dados do perfil do usuário logado:", e);
    }

    // Cache-First role detection (Instant, offline-friendly, no network hang)
    const cachedUserType = localStorage.getItem('user_type') || 'client';
    const userEmail = user.email ? user.email.toLowerCase() : '';
    const isAdmin = cachedUserType === 'admin' || userEmail.includes('admin@zerosynapses.com') || userEmail.includes('lara.cabeleireira@teste.com');
    const isProfessional = cachedUserType === 'professional';

    // Background profile check to ensure local role is up-to-date without blocking the screen render!
    if (user.id && user.id !== '00000000-0000-0000-0000-000000000000') {
        supabaseClient.from('profiles').select('user_type').eq('id', user.id).maybeSingle().then(res => {
            if (res && res.data && res.data.user_type) {
                const freshRole = res.data.user_type;
                if (freshRole !== cachedUserType) {
                    console.log(`Role updated in background: ${cachedUserType} -> ${freshRole}. Re-rendering.`);
                    localStorage.setItem('user_type', freshRole);
                    renderAgendamentoScreen();
                }
            }
        }).catch(err => console.warn("Background role check error (ignored):", err));
    }

    if (isAdmin) {
        // ==========================================
        // 1. VISÃO DO ADMINISTRADOR (ADM)
        // ==========================================
        container.innerHTML = `
            <div class="admin-tabs" style="display: flex; gap: 10px; margin-bottom: 1.5rem; background: #000; padding: 6px; border-radius: 14px; border: 1px solid #222;">
                <button id="admin-tab-list" style="flex: 1; padding: 12px; border-radius: 10px; font-weight: 800; font-size: 0.8rem; border: none; cursor: pointer; transition: all 0.2s;">📋 Todos Agendamentos</button>
                <button id="admin-tab-book" style="flex: 1; padding: 12px; border-radius: 10px; font-weight: 800; font-size: 0.8rem; border: none; cursor: pointer; transition: all 0.2s;">📅 Novo Agendamento</button>
            </div>
            <div id="admin-content-area" style="display: flex; flex-direction: column; gap: 1rem;"></div>
        `;

        const tabList = document.getElementById('admin-tab-list');
        const tabBook = document.getElementById('admin-tab-book');
        const contentArea = document.getElementById('admin-content-area');

        const switchAdminTab = async (tab) => {
            window.currentAdminTab = tab;
            if (tab === 'list') {
                tabList.style.background = '#a855f7';
                tabList.style.color = '#fff';
                tabBook.style.background = 'transparent';
                tabBook.style.color = '#888';
                
                contentArea.innerHTML = '<div style="text-align:center; padding: 2rem;"><span class="loader-mini"></span></div>';
                
                const { data: apps, error } = await supabaseClient
                    .from('appointments')
                    .select('*, client:client_id(full_name), professional:professional_id(full_name)')
                    .order('date', { ascending: false })
                    .order('time', { ascending: false });

                if (error) {
                    contentArea.innerHTML = `<p style="color:#ff4d4d; text-align:center;">Erro ao buscar agendamentos: ${error.message}</p>`;
                    return;
                }

                if (!apps || apps.length === 0) {
                    contentArea.innerHTML = '<p style="color:#666; text-align:center; padding: 3rem 0; font-size:0.9rem;">Nenhum agendamento cadastrado no sistema.</p>';
                    return;
                }

                contentArea.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 0.5rem;">
                        ${apps.map(a => {
                            const dateParts = a.date.split('-');
                            const date = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : a.date;
                            const time = a.time;
                            const profName = a.professional?.full_name || 'Profissional';
                            const clientName = a.client?.full_name || 'Cliente';
                            
                            return `
                            <div style="background:#111; padding:1.25rem; border-radius:16px; border:1px solid #222; display:flex; justify-content:space-between; align-items:center;">
                                <div style="min-width: 0; flex: 1;">
                                    <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px; flex-wrap: wrap;">
                                        <span style="color:#a855f7; font-size:0.65rem; font-weight:900; letter-spacing:1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;">DE: ${clientName.toUpperCase()}</span>
                                        <span style="color:#555; font-size:0.65rem;">➔</span>
                                        <span style="color:#10B981; font-size:0.65rem; font-weight:900; letter-spacing:1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;">PARA: ${profName.toUpperCase()}</span>
                                    </div>
                                    <div style="font-size:0.8rem; color:#888; margin-top: 2px; font-weight:500;">Data: ${date} às ${time}</div>
                                    <div style="font-size:0.65rem; color:#555; margin-top: 4px; font-weight:700;">STATUS: ${a.status.toUpperCase()}</div>
                                </div>
                                <button onclick="window.adminCancelAppointment('${a.id}')" style="background: rgba(255, 77, 77, 0.1); border: 1px solid rgba(255, 77, 77, 0.3); color: #ff4d4d; font-weight: 800; padding: 8px 14px; border-radius: 10px; font-size: 0.7rem; cursor: pointer; transition: all 0.2s; flex-shrink: 0;">
                                    Cancelar
                                </button>
                            </div>`;
                        }).join('')}
                    </div>
                `;
            } else {
                tabBook.style.background = '#a855f7';
                tabBook.style.color = '#fff';
                tabList.style.background = 'transparent';
                tabList.style.color = '#888';

                contentArea.innerHTML = '<div style="text-align:center; padding: 2rem;"><span class="loader-mini"></span></div>';

                // Fetch both professionals and clients
                const { data: clients } = await supabaseClient.from('profiles').select('id, full_name').eq('user_type', 'client');
                const { data: profs } = await supabaseClient.from('profiles').select('id, full_name, specialty, price:price_range, phone, address, city').eq('user_type', 'professional');
                window.loadedProfessionalsList = profs || [];

                contentArea.innerHTML = `
                    <div class="input-group" style="margin-top: 2rem; text-align: center;">
                        <label style="display: block; margin-bottom: 1rem; font-size: 0.85rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #888;">Escolha o Cliente</label>
                        <select id="admin-select-client" style="width: 100%; font-size: 0.85rem; padding: 1.2rem; border-radius: 12px; background: #000000; color: #fff; border: 1px solid #333; text-transform: uppercase; cursor: pointer; box-shadow: 0 4px 20px rgba(168, 85, 247, 0.1); transition: font-size 0.2s ease;">
                            <option value="">Selecione o cliente...</option>
                            ${(clients || []).map(c => `<option value="${c.id}">${c.full_name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="input-group" style="margin-top: 3rem; text-align: center; position: relative;">
                        <label style="display: block; margin-bottom: 1rem; font-size: 0.85rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #888;">Escolha o Profissional</label>
                        <div class="custom-select-wrapper" style="position: relative; text-align: left;">
                            <div class="custom-select-trigger" style="display: flex; align-items: center; justify-content: space-between; padding: 1.2rem; border-radius: 12px; background: #000000; border: 1px solid #333; cursor: pointer; box-shadow: 0 4px 20px rgba(168, 85, 247, 0.1); transition: all 0.2s ease;">
                                <input type="text" id="prof-search-input" placeholder="SELECIONE O PROFISSIONAL..." autocomplete="off" style="width: 100%; background: transparent; border: none; padding: 0; margin: 0; color: #fff; font-size: 0.85rem; font-weight: 700; outline: none; cursor: pointer; text-transform: uppercase;">
                                <span class="custom-select-arrow" style="font-size: 0.8rem; color: #888; margin-left: 10px; transition: transform 0.2s;">▼</span>
                            </div>
                            <input type="hidden" id="client-select-prof" value="">
                            <div id="prof-dropdown-options" style="display: none; position: absolute; top: calc(100% + 5px); left: 0; right: 0; background: #0a0a0a; border: 1px solid #333; border-radius: 12px; max-height: 220px; overflow-y: auto; z-index: 1000; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9); padding: 5px 0;">
                            </div>
                        </div>
                    </div>
                    
                    <!-- Caixa informativa de serviço/preço -->
                    <div id="prof-service-info-box" style="display: none; margin-top: 1.5rem; background: rgba(168, 85, 247, 0.05); border: 1px dashed rgba(168, 85, 247, 0.2); padding: 1.25rem; border-radius: 16px; text-align: center; animation: fadeIn 0.3s ease;">
                        <!-- Nome do profissional -->
                        <div id="prof-selected-name" style="font-size: 1.25rem; font-weight: 900; color: #fff; text-transform: uppercase; margin-bottom: 6px;">Marcos Silva</div>
                        
                        <!-- Telefone e Endereço -->
                        <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; font-size: 0.8rem; color: #aaa;">
                            <div id="prof-selected-phone">📞 (11) 99999-9999</div>
                            <div id="prof-selected-address">📍 Av. Paulista, 1000 - São Paulo, SP</div>
                        </div>

                        <div style="width: 40px; height: 1px; background: rgba(168, 85, 247, 0.2); margin: 10px auto;"></div>

                        <div style="font-size: 0.75rem; color: #a855f7; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Serviço & Valor</div>
                        <div id="prof-service-name" style="font-size: 1.15rem; font-weight: 800; color: #fff; margin-top: 6px;">Corte Social</div>
                        <div id="prof-service-price" style="font-size: 1.35rem; font-weight: 900; color: #10B981; margin-top: 4px;">R$ 45,00</div>
                    </div>
                    <div class="input-group" id="client-date-group" style="display:none; margin-top: 3rem; text-align: center;">
                        <label>Escolha a Data</label>
                        <input type="date" id="client-agenda-date" style="width: 100%; font-size: 1rem; padding: 1rem; border-radius: 12px; background: #000000; color: #fff; border: 1px solid #333; text-transform: uppercase;">
                    </div>
                    <div class="input-group" id="client-time-group" style="display:none; margin-top: 1rem;">
                        <label>Horários Disponíveis</label>
                        <div id="client-time-slots" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;"></div>
                    </div>

                    <button id="btn-confirm-agendamento" class="btn btn-primary" style="margin-top: 1.5rem; display:none; max-width: 250px; align-self: center;">Confirmar Agendamento</button>
                `;

                window.setupCustomProfDropdown(profs || [], null);
                setupBookingHandlers(true);
            }
        };

        window.adminCancelAppointment = async (appId) => {
            if (!confirm('Deseja realmente cancelar este agendamento?')) return;
            const { error } = await supabaseClient.from('appointments').delete().eq('id', appId);
            if (error) {
                alert('Erro ao cancelar: ' + error.message);
            } else {
                switchAdminTab(window.currentAdminTab);
            }
        };

        tabList.addEventListener('click', () => switchAdminTab('list'));
        tabBook.addEventListener('click', () => switchAdminTab('book'));
        switchAdminTab('list');

    } else if (isProfessional) {
        // ==========================================
        // 2. VISÃO DO PROFISSIONAL
        // ==========================================
        const todayLocal = new Date();
        todayLocal.setHours(0, 0, 0, 0);
        
        container.innerHTML = `
            <div style="flex: 1; display: flex; flex-direction: column;">
                <h4 style="margin: 0 0 1rem 0; color: #fff; font-size: 1.1rem; text-align: center;">Agenda de Cortes Marcados</h4>
                <div id="prof-appointments-list" style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="text-align:center; padding: 2rem;"><span class="loader-mini"></span></div>
                </div>

                <h4 style="margin: 2.5rem 0 1rem 0; color: #fff; font-size: 1.1rem; text-align: center; border-top: 1px solid #222; padding-top: 2rem;">Histórico de Agendamentos</h4>
                <div id="prof-history-list" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 2rem;">
                    <div style="text-align:center; padding: 2rem;"><span class="loader-mini"></span></div>
                </div>
            </div>
        `;

        const loadProfAgenda = async () => {
            const getLocalDateStr = (d) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dayStr = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${dayStr}`;
            };
            const todayStr = getLocalDateStr(todayLocal);
            // Próximos agendamentos (de hoje em diante)
            const { data: upcomingApps } = await supabaseClient
                .from('appointments')
                .select('*, client:client_id(full_name, avatar_url)')
                .eq('professional_id', user.id)
                .gte('date', todayStr)
                .order('date', { ascending: true })
                .order('time', { ascending: true });

            const listContainer = document.getElementById('prof-appointments-list');
            if (!upcomingApps || upcomingApps.length === 0) {
                listContainer.innerHTML = '<p style="color: #666; font-size: 0.9rem; text-align: center; margin: 2rem 0; font-weight: 500;">Nenhum cliente agendado para os próximos dias.</p>';
            } else {
                listContainer.innerHTML = upcomingApps.map(a => {
                    const dateParts = a.date.split('-');
                    const date = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : a.date;
                    const time = a.time;
                    const clientName = a.client?.full_name || 'Cliente';
                    let statusBadge = '';
                    if (a.status === 'pending') {
                        statusBadge = '<span style="background: rgba(59, 130, 246, 0.1); color: #3B82F6; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 800; border: 1px solid rgba(59, 130, 246, 0.3); margin-top: 6px; display: inline-block;">⏳ PRONTO</span>';
                    } else if (a.status === 'confirmed') {
                        statusBadge = '<span style="background: rgba(16, 185, 129, 0.1); color: #10B981; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 800; border: 1px solid rgba(16, 185, 129, 0.3); margin-top: 6px; display: inline-block;">✓ CONFIRMADO</span>';
                    } else {
                        statusBadge = '<span style="background: rgba(239, 68, 68, 0.1); color: #EF4444; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 800; border: 1px solid rgba(239, 68, 68, 0.3); margin-top: 6px; display: inline-block;">CANCELADO</span>';
                    }

                    return `
                    <div style="background:#111; padding:1.25rem; border-radius:16px; border:1px solid #222; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="color:#a855f7; font-size:0.7rem; font-weight:800; letter-spacing:1px; margin-bottom:4px;">CLIENTE</div>
                            <div style="font-weight:800; color:#fff; font-size:1.05rem;">${clientName}</div>
                            <div style="font-size:0.8rem; color:#888; margin-top: 2px; font-weight:500;">${date}</div>
                            ${statusBadge}
                        </div>
                        <div style="background:#000; border:1px solid #333; padding:8px 16px; border-radius:12px; font-weight:900; color:#10B981; font-size: 1.1rem; flex-shrink: 0;">
                            ${time}
                        </div>
                    </div>`;
                }).join('');
            }

            // Histórico (antes de hoje)
            const { data: historyApps } = await supabaseClient
                .from('appointments')
                .select('*, client:client_id(full_name, avatar_url)')
                .eq('professional_id', user.id)
                .lt('date', todayStr)
                .order('date', { ascending: false })
                .order('time', { ascending: false })
                .limit(20);

            const historyContainer = document.getElementById('prof-history-list');
            if (!historyApps || historyApps.length === 0) {
                historyContainer.innerHTML = '<p style="color: #666; font-size: 0.9rem; text-align: center; margin: 2rem 0; font-weight: 500;">Nenhum histórico encontrado.</p>';
            } else {
                historyContainer.innerHTML = historyApps.map(a => {
                    const dateParts = a.date.split('-');
                    const date = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : a.date;
                    const time = a.time;
                    const clientName = a.client?.full_name || 'Cliente';
                    return `
                    <div style="background:#0a0a0a; padding:1rem; border-radius:12px; border:1px solid #1a1a1a; display:flex; justify-content:space-between; align-items:center; opacity: 0.7;">
                        <div>
                            <div style="font-weight:700; color:#ccc; font-size:0.95rem;">${clientName}</div>
                            <div style="font-size:0.75rem; color:#666; margin-top: 2px; font-weight:500;">${date}</div>
                        </div>
                        <div style="font-weight:800; color:#888; font-size: 0.95rem;">
                            ${time}
                        </div>
                    </div>`;
                }).join('');
            }
        };

        loadProfAgenda();

    } else {
        // ==========================================
        // 3. VISÃO DO CLIENTE
        // ==========================================
        
        container.innerHTML = `
            <div class="input-group" style="margin-top: 2rem; text-align: center; position: relative;">
                <label style="display: block; margin-bottom: 1rem; font-size: 0.85rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #888;">Escolha o Profissional</label>
                <div class="custom-select-wrapper" style="position: relative; text-align: left;">
                    <div class="custom-select-trigger" style="display: flex; align-items: center; justify-content: space-between; padding: 1.2rem; border-radius: 12px; background: #000000; border: 1px solid #333; cursor: pointer; box-shadow: 0 4px 20px rgba(168, 85, 247, 0.1); transition: all 0.2s ease;">
                        <input type="text" id="prof-search-input" placeholder="SELECIONE O PROFISSIONAL..." autocomplete="off" style="width: 100%; background: transparent; border: none; padding: 0; margin: 0; color: #fff; font-size: 0.85rem; font-weight: 700; outline: none; cursor: pointer; text-transform: uppercase;">
                        <span class="custom-select-arrow" style="font-size: 0.8rem; color: #888; margin-left: 10px; transition: transform 0.2s;">▼</span>
                    </div>
                    <input type="hidden" id="client-select-prof" value="">
                    <div id="prof-dropdown-options" style="display: none; position: absolute; top: calc(100% + 5px); left: 0; right: 0; background: #0a0a0a; border: 1px solid #333; border-radius: 12px; max-height: 220px; overflow-y: auto; z-index: 1000; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9); padding: 5px 0;">
                        <div style="padding: 1rem; color: #888; font-size: 0.85rem; text-align: center;">Carregando profissionais...</div>
                    </div>
                </div>
            </div>
            
            <!-- Caixa informativa de serviço/preço -->
            <div id="prof-service-info-box" style="display: none; margin-top: 1.5rem; background: rgba(168, 85, 247, 0.05); border: 1px dashed rgba(168, 85, 247, 0.2); padding: 1.25rem; border-radius: 16px; text-align: center; animation: fadeIn 0.3s ease;">
                <!-- Nome do profissional -->
                <div id="prof-selected-name" style="font-size: 1.25rem; font-weight: 900; color: #fff; text-transform: uppercase; margin-bottom: 6px;">Marcos Silva</div>
                
                <!-- Telefone e Endereço -->
                <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; font-size: 0.8rem; color: #aaa;">
                    <div id="prof-selected-phone">📞 (11) 99999-9999</div>
                    <div id="prof-selected-address">📍 Av. Paulista, 1000 - São Paulo, SP</div>
                </div>

                <div style="width: 40px; height: 1px; background: rgba(168, 85, 247, 0.2); margin: 10px auto;"></div>

                <div style="font-size: 0.75rem; color: #a855f7; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Serviço & Valor</div>
                <div id="prof-service-name" style="font-size: 1.15rem; font-weight: 800; color: #fff; margin-top: 6px;">Corte Social</div>
                <div id="prof-service-price" style="font-size: 1.35rem; font-weight: 900; color: #10B981; margin-top: 4px;">R$ 45,00</div>
            </div>
            <div class="input-group" id="client-date-group" style="display:none; margin-top: 3rem; text-align: center;">
                <label style="display: block; margin-bottom: 1rem; font-size: 0.85rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #888;">Escolha a Data</label>
                <input type="date" id="client-agenda-date" style="width: 100%; font-size: 1.1rem; padding: 1.2rem; border-radius: 12px; background: #000000; color: #fff; border: 1px solid #333; text-transform: uppercase; cursor: pointer;">
            </div>
            <div class="input-group" id="client-time-group" style="display:none; margin-top: 3rem; text-align: center;">
                <label style="display: block; margin-bottom: 1rem; font-size: 0.85rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #888;">Horários Disponíveis</label>
                <div id="client-time-slots" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;"></div>
            </div>

            <button id="btn-confirm-agendamento" class="btn btn-primary" style="margin-top: 1.5rem; display:none; max-width: 250px; align-self: center;">Confirmar Agendamento</button>

            <div style="margin-top: 2rem; flex: 1; display: flex; flex-direction: column;">
                <h4 style="margin: 0 0 1rem 0; color: #fff; font-size: 1.1rem; text-align: center;">Meus Próximos Agendamentos</h4>
                <div id="client-appointments-list" style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="text-align:center; padding: 2rem;"><span class="loader-mini"></span></div>
                </div>
            </div>
        `;

        const loadProfessionalsRealtime = async () => {
            const profSelect = document.getElementById('client-select-prof');
            if (!profSelect) return;

            const fetchProfs = async () => {
                const cacheKey = 'cached_professionals_list';
                let data = [];
                const fallbackProfs = [
                    { id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', full_name: 'Marcos Silva', specialty: 'Barbeiro / Corte Masculino', price: 45.0, phone: '(11) 99999-9999', address: 'Av. Paulista, 1000 - São Paulo, SP', city: 'São Paulo' },
                    { id: '22222222-2222-2222-2222-222222222222', full_name: 'Carlos Barbeiro', specialty: 'Corte & Barba Especialista', price: 35.0, phone: '(11) 98888-8888', address: 'Rua Augusta, 500 - São Paulo, SP', city: 'São Paulo' },
                    { id: 'cb6971fa-4597-4aaa-8717-eccd697712c7', full_name: 'Daisy Souza (Cabeleireira)', specialty: 'Escova & Hidratação', price: 80.0, phone: '(11) 97777-7777', address: 'Av. Brigadeiro Luís Antônio, 2000 - São Paulo, SP', city: 'São Paulo' },
                    { id: 'c3d4e5f6-a7b8-4c7d-0e1f-2a3b4c5d6e7f', full_name: 'Rodrigo Barber', specialty: 'Design de Barba & Degradê', price: 50.0, phone: '(11) 96666-6666', address: 'Av. Rebouças, 1500 - São Paulo, SP', city: 'São Paulo' },
                    { id: 'b2c3d4e5-f6a7-4b6c-9d8e-1f0a2b3c4d5e', full_name: 'Juliana Beauty', specialty: 'Estética & Maquiagem Profissional', price: 120.0, phone: '(11) 95555-5555', address: 'Rua Oscar Freire, 800 - São Paulo, SP', city: 'São Paulo' },
                    { id: '1d304048-e0ba-42ad-b76c-7600c47d7ba1', full_name: 'Terapeuta Capilar', specialty: 'Terapia Capilar & Recuperação', price: 150.0, phone: '(11) 94444-4444', address: 'Av. Faria Lima, 3000 - São Paulo, SP', city: 'São Paulo' }
                ];

                try {
                    const query = supabaseClient.from('profiles').select('id, full_name, specialty, price:price_range, phone, address, city').eq('user_type', 'professional');
                    const result = await Promise.race([
                        query,
                        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10000))
                    ]);
                    if (result.error) throw result.error;
                    data = result.data || [];
                    if (data.length > 0) {
                        localStorage.setItem(cacheKey, JSON.stringify(data));
                    }
                } catch(err) {
                    console.warn("⚠️ Erro ou Timeout ao carregar profissionais (usando cache local):", err);
                    const cached = localStorage.getItem(cacheKey);
                    if (cached) {
                        data = JSON.parse(cached);
                    }
                }

                // Se não há dados remotos nem no cache, usa os fallbacks premium
                if (!data || data.length === 0) {
                    console.log("ℹ️ Usando profissionais fallback estáticos para garantir carregamento instantâneo no celular.");
                    data = fallbackProfs;
                }

                let sortedProfs = data || [];
                const clientCity = (userProfile?.city || '').trim().toLowerCase();
                
                if (clientCity && sortedProfs.length > 0) {
                    sortedProfs.sort((a, b) => {
                        const cityA = (a.city || '').trim().toLowerCase();
                        const cityB = (b.city || '').trim().toLowerCase();
                        const isMatchA = cityA === clientCity ? 1 : 0;
                        const isMatchB = cityB === clientCity ? 1 : 0;
                        return isMatchB - isMatchA; // Match comes first
                    });
                }

                const currentVal = profSelect.value;
                if (currentVal && sortedProfs.some(p => p.id === currentVal)) {
                    profSelect.value = currentVal;
                } else {
                    profSelect.value = '';
                }
                window.setupCustomProfDropdown(sortedProfs, clientCity);
            };

            await fetchProfs();

            // Real-time subscription to auto-update the list
            if (window.profDropdownSub) { supabaseClient.removeChannel(window.profDropdownSub); }
            window.profDropdownSub = supabaseClient.channel('prof-list-updates')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                    console.log("Atualizando lista de profissionais em tempo real...");
                    fetchProfs();
                })
                .subscribe();
        };

        loadProfessionalsRealtime();

        // Carregar agendamentos do cliente (Timezone-safe filter from starting today!)
        const loadClientAgenda = async () => {
            const todayLocal = new Date();
            todayLocal.setHours(0, 0, 0, 0);
            
            const getLocalDateStr = (d) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dayStr = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${dayStr}`;
            };
            const todayStr = getLocalDateStr(todayLocal);
            
            const cacheKey = `client_apps_${user.id}`;
            let apps = [];
            let isOffline = false;

            try {
                const query = supabaseClient
                    .from('appointments')
                    .select('*, professional:professional_id(full_name)')
                    .eq('client_id', user.id)
                    .gte('date', todayStr);

                const result = await Promise.race([
                    query.order('date', { ascending: true }).order('time', { ascending: true }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 4000))
                ]);

                if (result.error) throw result.error;
                apps = result.data || [];
                localStorage.setItem(cacheKey, JSON.stringify(apps));
            } catch (err) {
                console.warn("⚠️ Erro ao carregar agendamentos do cliente (usando cache local):", err);
                isOffline = true;
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    apps = JSON.parse(cached);
                }
            }

            const listContainer = document.getElementById('client-appointments-list');
            if (!listContainer) return;

            if (!apps || apps.length === 0) {
                listContainer.innerHTML = `<p style="color: #666; font-size: 0.9rem; text-align: center; margin: 2rem 0; font-weight: 500;">Você não tem nenhum agendamento futuro.${isOffline ? ' (Offline)' : ''}</p>`;
                return;
            }

            listContainer.innerHTML = apps.map(a => {
                const dateParts = a.date.split('-');
                const date = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : a.date;
                const time = a.time;
                const profName = a.professional?.full_name || 'Profissional';
                return `
                <div style="background:#111; padding:1.25rem; border-radius:16px; border:1px solid #222; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="color:#a855f7; font-size:0.7rem; font-weight:800; letter-spacing:1px; margin-bottom:4px;">PROFISSIONAL</div>
                        <div style="font-weight:800; color:#fff; font-size:1.05rem;">${profName}</div>
                        <div style="font-size:0.8rem; color:#888; margin-top: 2px; font-weight:500;">${date}</div>
                    </div>
                    <div style="background:#000; border:1px solid #333; padding:8px 16px; border-radius:12px; font-weight:900; color:#10B981; font-size: 1.1rem; flex-shrink: 0;">
                        ${time}
                    </div>
                </div>`;
            }).join('');
        };
        loadClientAgenda();
        setupBookingHandlers(false);
    }

    // Real-time subscription to auto-update appointments on insert/update/delete (Client & Professional)
    if (window.appointmentsRealtimeSub) {
        supabaseClient.removeChannel(window.appointmentsRealtimeSub);
    }
    window.appointmentsRealtimeSub = supabaseClient.channel('appointments-realtime-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
            console.log("Atualização de agendamento detectada! Recarregando...");
            const isAgendamentoVisible = document.getElementById('agendamento-dynamic-content') !== null;
            if (!isAgendamentoVisible) {
                if (window.appointmentsRealtimeSub) {
                    supabaseClient.removeChannel(window.appointmentsRealtimeSub);
                    window.appointmentsRealtimeSub = null;
                }
                return;
            }
            if (isProfessional) {
                if (typeof loadProfAgenda === 'function') loadProfAgenda();
            } else if (isAdmin) {
                if (typeof switchAdminTab === 'function' && window.currentAdminTab) switchAdminTab(window.currentAdminTab);
            } else {
                if (typeof loadClientAgenda === 'function') loadClientAgenda();
            }
        })
        .subscribe();

    // Encapsulated booking handlers shared by clients and administrators!
    function setupBookingHandlers(isAdminBooking) {
        const clientSelect = isAdminBooking ? document.getElementById('admin-select-client') : null;
        const profSelect = document.getElementById('client-select-prof');
        const dateGroup = document.getElementById('client-date-group');
        const dateInput = document.getElementById('client-agenda-date');
        const timeGroup = document.getElementById('client-time-group');
        const timeSlotsContainer = document.getElementById('client-time-slots');
        const btnConfirm = document.getElementById('btn-confirm-agendamento');
        
        let selectedTime = null;

        // Set min attribute to today's local date to avoid back-dated bookings
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;
        if (dateInput) dateInput.setAttribute('min', today);

        // Set initial state based on value
        if (profSelect.value) {
            profSelect.style.fontSize = '1.1rem';
            const serviceBox = document.getElementById('prof-service-info-box');
            const serviceNameEl = document.getElementById('prof-service-name');
            const servicePriceEl = document.getElementById('prof-service-price');
            const nameEl = document.getElementById('prof-selected-name');
            const phoneEl = document.getElementById('prof-selected-phone');
            const addressEl = document.getElementById('prof-selected-address');

            const prof = (window.loadedProfessionalsList || []).find(p => p.id === profSelect.value);
            if (prof && serviceBox && serviceNameEl && servicePriceEl) {
                const specialty = prof.specialty || 'Serviço Personalizado';
                const priceVal = prof.price ? Number(prof.price).toFixed(2).replace('.', ',') : '45,00';
                serviceNameEl.innerText = specialty.toUpperCase();
                servicePriceEl.innerText = `R$ ${priceVal}`;
                
                if (nameEl) nameEl.innerText = prof.full_name;
                if (phoneEl) phoneEl.innerText = `📞 ${prof.phone || '(11) 99999-9999'}`;
                if (addressEl) {
                    addressEl.innerText = `📍 ${prof.address ? `${prof.address}${prof.city ? ' - ' + prof.city : ''}` : `Av. Paulista, 1000 - ${prof.city || 'São Paulo, SP'}`}`;
                }

                serviceBox.style.display = 'block';
            }
        } else {
            profSelect.style.fontSize = '0.85rem';
            const serviceBox = document.getElementById('prof-service-info-box');
            if (serviceBox) serviceBox.style.display = 'none';
        }

        if (clientSelect) {
            if (clientSelect.value) {
                clientSelect.style.fontSize = '1.1rem';
            } else {
                clientSelect.style.fontSize = '0.85rem';
            }
            
            clientSelect.addEventListener('change', () => {
                if (clientSelect.value) {
                    clientSelect.style.fontSize = '1.1rem';
                } else {
                    clientSelect.style.fontSize = '0.85rem';
                }
            });
        }

        profSelect.addEventListener('change', () => {
            const serviceBox = document.getElementById('prof-service-info-box');
            const serviceNameEl = document.getElementById('prof-service-name');
            const servicePriceEl = document.getElementById('prof-service-price');

            if (profSelect.value) {
                profSelect.style.fontSize = '1.1rem';
                
                // Exibir serviço e preço do profissional escolhido
                const serviceBox = document.getElementById('prof-service-info-box');
                const serviceNameEl = document.getElementById('prof-service-name');
                const servicePriceEl = document.getElementById('prof-service-price');
                const nameEl = document.getElementById('prof-selected-name');
                const phoneEl = document.getElementById('prof-selected-phone');
                const addressEl = document.getElementById('prof-selected-address');

                const prof = (window.loadedProfessionalsList || []).find(p => p.id === profSelect.value);
                if (prof && serviceBox && serviceNameEl && servicePriceEl) {
                    const specialty = prof.specialty || 'Serviço Personalizado';
                    const priceVal = prof.price ? Number(prof.price).toFixed(2).replace('.', ',') : '45,00';
                    
                    serviceNameEl.innerText = specialty.toUpperCase();
                    servicePriceEl.innerText = `R$ ${priceVal}`;

                    if (nameEl) nameEl.innerText = prof.full_name;
                    if (phoneEl) phoneEl.innerText = `📞 ${prof.phone || '(11) 99999-9999'}`;
                    if (addressEl) {
                        addressEl.innerText = `📍 ${prof.address ? `${prof.address}${prof.city ? ' - ' + prof.city : ''}` : `Av. Paulista, 1000 - ${prof.city || 'São Paulo, SP'}`}`;
                    }

                    serviceBox.style.display = 'block';
                }

                dateGroup.style.display = 'block';
                dateInput.value = '';
                timeGroup.style.display = 'none';
                btnConfirm.style.display = 'none';
            } else {
                profSelect.style.fontSize = '0.85rem';
                if (serviceBox) serviceBox.style.display = 'none';
                dateGroup.style.display = 'none';
                timeGroup.style.display = 'none';
                btnConfirm.style.display = 'none';
            }
        });

        dateInput.addEventListener('change', async () => {
            if (!dateInput.value) return;
            timeGroup.style.display = 'block';
            timeSlotsContainer.innerHTML = '<span class="loader-mini" style="margin:0 auto; grid-column: span 3;"></span>';
            btnConfirm.style.display = 'none';
            selectedTime = null;

            const profId = profSelect.value;
            const dateVal = dateInput.value;

            // Fetch booked times (ignoring cancelled ones)
            const { data: booked } = await supabaseClient
                .from('appointments')
                .select('time')
                .eq('professional_id', profId)
                .eq('date', dateVal)
                .neq('status', 'cancelled');

            const bookedTimes = (booked || []).map(a => a.time);

            // Generate slots
            const allSlots = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
            
            timeSlotsContainer.innerHTML = '';
            
            if (allSlots.every(s => bookedTimes.includes(s))) {
                timeSlotsContainer.innerHTML = '<p style="grid-column: span 3; color: #f87171; text-align: center; font-size: 0.85rem;">Agenda lotada para este dia.</p>';
                return;
            }

            allSlots.forEach(slot => {
                const isBooked = bookedTimes.includes(slot);
                const btn = document.createElement('button');
                btn.style.padding = '12px 10px';
                btn.style.borderRadius = '14px';
                btn.style.border = '1px solid #333';
                btn.style.fontWeight = '800';
                btn.style.fontSize = '0.9rem';
                btn.style.position = 'relative';
                btn.style.transition = 'all 0.2s ease';
                btn.style.boxSizing = 'border-box';
                btn.style.whiteSpace = 'pre-line';
                btn.style.lineHeight = '1.3';

                if (isBooked) {
                    btn.innerText = `${slot}\n[OCUPADO]`;
                    btn.style.cursor = 'not-allowed';
                    btn.style.background = 'rgba(239, 68, 68, 0.04)';
                    btn.style.color = 'rgba(239, 68, 68, 0.45)';
                    btn.style.borderColor = 'rgba(239, 68, 68, 0.18)';
                    btn.style.textDecoration = 'line-through';
                    btn.style.fontSize = '0.75rem';
                } else {
                    btn.innerText = slot;
                    btn.style.cursor = 'pointer';
                    btn.style.background = '#000';
                    btn.style.color = '#fff';
                    
                    btn.onclick = () => {
                        Array.from(timeSlotsContainer.children).forEach(c => {
                            if(c.style.cursor !== 'not-allowed') {
                                c.style.background = '#000';
                                c.style.color = '#fff';
                                c.style.borderColor = '#333';
                            }
                        });
                        btn.style.background = 'rgba(176, 133, 245, 0.1)';
                        btn.style.color = '#b085f5';
                        btn.style.borderColor = '#b085f5';
                        selectedTime = slot;
                        btnConfirm.style.display = 'block';
                    };
                }
                timeSlotsContainer.appendChild(btn);
            });
        });

        btnConfirm.onclick = async () => {
            const profId = profSelect.value;
            const dateVal = dateInput.value;
            const targetClientId = isAdminBooking ? clientSelect.value : user.id;

            if (!profId || !dateVal || !selectedTime || (isAdminBooking && !targetClientId)) {
                alert('Por favor, preencha todos os campos!');
                return;
            }

            btnConfirm.innerHTML = '<span class="loader-mini"></span>';
            btnConfirm.disabled = true;

            // Pre-validation checking if slot has been booked by another user right before executing insertion (prevent race conditions)
            const { data: duplicateCheck } = await supabaseClient
                .from('appointments')
                .select('id')
                .eq('professional_id', profId)
                .eq('date', dateVal)
                .eq('time', selectedTime)
                .neq('status', 'cancelled')
                .limit(1);

            if (duplicateCheck && duplicateCheck.length > 0) {
                alert('⚠️ Atenção: Este horário acabou de ser reservado por outro cliente! Por favor, escolha outro horário disponível.');
                btnConfirm.innerHTML = 'Confirmar Agendamento';
                btnConfirm.disabled = false;
                // Re-trigger date input change to refresh available slots
                dateInput.dispatchEvent(new Event('change'));
                return;
            }

            const prof = (window.loadedProfessionalsList || []).find(p => p.id === profId);
            const specialty = prof?.specialty || 'Serviço Personalizado';
            const priceVal = prof?.price ? Number(prof.price) : 45.00;

            let insertData = {
                professional_id: profId,
                client_id: targetClientId,
                date: dateVal,
                time: selectedTime,
                status: 'pending',
                service_name: specialty,
                price: priceVal
            };

            let { error } = await supabaseClient.from('appointments').insert([insertData]);

            // Resilient Fallback: If service_name or price columns do not exist in the DB, retry without them
            if (error && (error.message.includes('service_name') || error.message.includes('price') || error.code === '42703')) {
                console.warn("Colunas de serviço/preço ainda não existem na tabela de agendamentos. Salvando sem elas...");
                delete insertData.service_name;
                delete insertData.price;
                const retryResult = await supabaseClient.from('appointments').insert([insertData]);
                error = retryResult.error;
            }

            if (error) {
                alert('Erro ao agendar: ' + error.message);
                btnConfirm.innerHTML = 'Confirmar Agendamento';
                btnConfirm.disabled = false;
                return;
            }

            // Create Notification for Professional
            const profName = prof?.full_name || 'Profissional';
            const dateParts = dateVal.split('-');
            const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : dateVal;
            const myName = (await supabaseClient.from('profiles').select('full_name').eq('id', targetClientId).single()).data?.full_name || 'Um cliente';

            await supabaseClient.from('notifications').insert([{
                user_id: profId,
                sender_id: targetClientId,
                type: 'appointment',
                title: 'Novo Agendamento!',
                content: `${myName} agendou para ${formattedDate} às ${selectedTime}.`,
                link: '#agendamento'
            }]);

            // Notification for Client
            await supabaseClient.from('notifications').insert([{
                user_id: targetClientId,
                sender_id: profId,
                type: 'appointment',
                title: 'Agendamento Confirmado!',
                content: `Você tem um horário com ${profName} dia ${formattedDate} às ${selectedTime}.`,
                link: '#agendamento'
            }]);

            showSuccessModal('Agendado!', 'O horário foi garantido com sucesso.', () => {
                if (isAdminBooking) {
                    switchAdminTab('list');
                } else {
                    renderAgendamentoScreen();
                }
            });
        };
    }
    } catch (criticalError) {
        container.innerHTML = `<div style="padding: 2rem; background: #220000; border: 1px solid #ff4d4d; border-radius: 12px; color: #ff8888; font-weight: bold; margin-top: 1rem;"><h3 style="color:#ff4d4d; margin-top:0;">Erro Crítico:</h3><p>${criticalError.message}</p><pre style="font-size: 0.7rem; overflow-x: auto; margin-top: 10px;">${criticalError.stack}</pre></div>`;
        console.error("Critical error in renderAgendamentoScreen:", criticalError);
    }
};
});

// --- Custom Mobile Pull-to-Refresh Gesture (2s hold) ---
function initMobilePullToRefresh() {
    if (window.innerWidth >= 600) return; // Only on mobile
    
    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    let pullTimer = null;
    let countdownInterval = null;
    let secondsLeft = 2;
    
    // Create elegant glassmorphic indicator
    const indicator = document.createElement('div');
    indicator.id = 'pull-to-refresh-indicator';
    indicator.style.position = 'fixed';
    indicator.style.top = '-80px';
    indicator.style.left = '50%';
    indicator.style.transform = 'translateX(-50%)';
    indicator.style.width = '240px';
    indicator.style.height = '60px';
    indicator.style.background = 'rgba(26, 26, 26, 0.9)';
    indicator.style.border = '1px solid rgba(176, 133, 245, 0.2)';
    indicator.style.borderRadius = '30px';
    indicator.style.display = 'flex';
    indicator.style.alignItems = 'center';
    indicator.style.justifyContent = 'center';
    indicator.style.gap = '10px';
    indicator.style.color = '#fff';
    indicator.style.fontFamily = 'system-ui, sans-serif';
    indicator.style.fontSize = '0.85rem';
    indicator.style.fontWeight = 'bold';
    indicator.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)';
    indicator.style.backdropFilter = 'blur(12px)';
    indicator.style.webkitBackdropFilter = 'blur(12px)';
    indicator.style.zIndex = '9999';
    indicator.style.transition = 'top 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    
    indicator.innerHTML = `
        <div class="refresh-spinner" style="width: 20px; height: 20px; border: 3px solid rgba(176, 133, 245, 0.2); border-top: 3px solid #b085f5; border-radius: 50%; animation: spin 1s linear infinite; box-sizing: border-box;"></div>
        <span id="pull-to-refresh-text">Puxe para atualizar</span>
    `;
    
    // Add keyframe animation for spinner if not present
    if (!document.getElementById('refresh-spinner-style')) {
        const style = document.createElement('style');
        style.id = 'refresh-spinner-style';
        style.innerHTML = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(indicator);
    
    document.addEventListener('touchstart', (e) => {
        // Only trigger if we are at the very top of the scroll
        if (window.scrollY > 5) return;
        
        startY = e.touches[0].clientY;
        isPulling = false;
        secondsLeft = 2;
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        if (window.scrollY > 5) return;
        
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        
        if (diff > 50) {
            isPulling = true;
            // Limit pulling distance to max 90px
            const pullDistance = Math.min(diff * 0.4, 90); 
            indicator.style.top = `${pullDistance - 70}px`;
            
            const textEl = document.getElementById('pull-to-refresh-text');
            
            // If pulled fully down, trigger the 2s countdown
            if (pullDistance >= 35 && !pullTimer) {
                textEl.innerText = `Segure por 2s...`;
                textEl.style.color = '#b085f5';
                
                pullTimer = setTimeout(() => {
                    textEl.innerText = `Atualizando página...`;
                    window.location.reload();
                }, 2000);
                
                secondsLeft = 2;
                countdownInterval = setInterval(() => {
                    secondsLeft -= 1;
                    if (secondsLeft > 0) {
                        textEl.innerText = `Segure por ${secondsLeft}s...`;
                    } else {
                        textEl.innerText = `Atualizando...`;
                        clearInterval(countdownInterval);
                    }
                }, 1000);
            }
        }
    }, { passive: true });
    
    document.addEventListener('touchend', () => {
        indicator.style.top = '-80px';
        isPulling = false;
        
        // Cancel timer and interval if user releases
        if (pullTimer) {
            clearTimeout(pullTimer);
            pullTimer = null;
        }
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        
        const textEl = document.getElementById('pull-to-refresh-text');
        if (textEl) {
            textEl.innerText = `Puxe para atualizar`;
            textEl.style.color = '#fff';
        }
    }, { passive: true });
}
