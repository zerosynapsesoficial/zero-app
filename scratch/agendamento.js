window.renderAgendamentoScreen = async function() {
    const container = document.getElementById('agendamento-dynamic-content');
    if (!container || !supabaseClient) return;

    container.innerHTML = '<div style="text-align:center; margin-top: 3rem;"><span class="loader-mini"></span></div>';

    const user = await getCurrentUser();
    if (!user) {
        container.innerHTML = '<p style="text-align:center; padding: 2rem; color: #fff;">Por favor, faça login para acessar a agenda.</p>';
        return;
    }

    const { data: myProfile } = await supabaseClient.from('profiles').select('user_type').eq('id', user.id).single();
    const isProfessional = myProfile?.user_type === 'professional';

    if (isProfessional) {
        // VISÃO DO PROFISSIONAL
        const today = new Date().toISOString().split('T')[0];
        
        container.innerHTML = `
            <div class="input-group">
                <label>Ver agenda do dia:</label>
                <input type="date" id="prof-agenda-date" value="${today}" style="width: 100%; font-size: 1rem; padding: 1rem; border-radius: 12px; background: #000000; color: #fff; border: 1px solid #333; text-transform: uppercase;">
            </div>
            <div style="margin-top: 1rem; flex: 1; overflow-y: auto;">
                <h4 style="margin: 0 0 1rem 0; color: #fff; font-size: 1.1rem; text-align: center;">Agendamentos do Dia</h4>
                <div id="prof-appointments-list" style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="text-align:center;"><span class="loader-mini"></span></div>
                </div>
            </div>
        `;

        const loadProfAgenda = async () => {
            const dateVal = document.getElementById('prof-agenda-date').value;
            if (!dateVal) return;
            const startOfDay = new Date(dateVal + 'T00:00:00-03:00').toISOString();
            const endOfDay = new Date(dateVal + 'T23:59:59-03:00').toISOString();

            const { data: apps } = await supabaseClient
                .from('appointments')
                .select('*, client:client_id(full_name, avatar_url)')
                .eq('professional_id', user.id)
                .gte('appointment_date', startOfDay)
                .lte('appointment_date', endOfDay)
                .order('appointment_date', { ascending: true });

            const listContainer = document.getElementById('prof-appointments-list');
            if (!apps || apps.length === 0) {
                listContainer.innerHTML = '<p style="color: #666; font-size: 0.9rem; text-align: center; margin: 1rem 0;">Nenhum cliente agendado para este dia.</p>';
                return;
            }

            listContainer.innerHTML = apps.map(a => {
                const time = new Date(a.appointment_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const clientName = a.client?.full_name || 'Cliente';
                return \`
                <div style="background:#111; padding:1.25rem; border-radius:16px; border:1px solid #222; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="color:#a855f7; font-size:0.7rem; font-weight:800; letter-spacing:1px; margin-bottom:4px;">CLIENTE</div>
                        <div style="font-weight:800; color:#fff; font-size:1.05rem;">\${clientName}</div>
                    </div>
                    <div style="background:#000; border:1px solid #333; padding:8px 16px; border-radius:12px; font-weight:900; color:#10B981; font-size: 1.1rem;">
                        \${time}
                    </div>
                </div>\`;
            }).join('');
        };

        document.getElementById('prof-agenda-date').addEventListener('change', loadProfAgenda);
        loadProfAgenda();

    } else {
        // VISÃO DO CLIENTE (E ADM)
        const { data: profs } = await supabaseClient.from('profiles').select('id, full_name').eq('user_type', 'professional');
        
        container.innerHTML = `
            <div class="input-group">
                <label>Escolha o Profissional</label>
                <select id="client-select-prof" style="width: 100%; font-size: 1rem; padding: 1rem; border-radius: 12px; background: #000000; color: #fff; border: 1px solid #333; text-transform: uppercase;">
                    <option value="">Selecione o profissional...</option>
                    \${(profs || []).map(p => \`<option value="\${p.id}">\${p.full_name}</option>\`).join('')}
                </select>
            </div>
            <div class="input-group" id="client-date-group" style="display:none;">
                <label>Escolha a Data</label>
                <input type="date" id="client-agenda-date" style="width: 100%; font-size: 1rem; padding: 1rem; border-radius: 12px; background: #000000; color: #fff; border: 1px solid #333; text-transform: uppercase;">
            </div>
            <div class="input-group" id="client-time-group" style="display:none;">
                <label>Horários Disponíveis</label>
                <div id="client-time-slots" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;"></div>
            </div>

            <button id="btn-confirm-agendamento" class="btn btn-primary" style="margin-top: 1rem; display:none; max-width: 250px; align-self: center;">Confirmar Agendamento</button>

            <div style="margin-top: 2rem; flex: 1; overflow-y: auto;">
                <h4 style="margin: 0 0 1rem 0; color: #fff; font-size: 1.1rem; text-align: center;">Meus Próximos Agendamentos</h4>
                <div id="client-appointments-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
            </div>
        `;

        // Carregar agendamentos do cliente
        const loadClientAgenda = async () => {
            const { data: apps } = await supabaseClient
                .from('appointments')
                .select('*, professional:professional_id(full_name)')
                .eq('client_id', user.id)
                .gte('appointment_date', new Date().toISOString())
                .order('appointment_date', { ascending: true });

            const listContainer = document.getElementById('client-appointments-list');
            if (!apps || apps.length === 0) {
                listContainer.innerHTML = '<p style="color: #666; font-size: 0.9rem; text-align: center; margin: 1rem 0;">Você não tem nenhum agendamento futuro.</p>';
                return;
            }

            listContainer.innerHTML = apps.map(a => {
                const dateObj = new Date(a.appointment_date);
                const date = dateObj.toLocaleDateString('pt-BR');
                const time = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const profName = a.professional?.full_name || 'Profissional';
                return \`
                <div style="background:#111; padding:1.25rem; border-radius:16px; border:1px solid #222; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="color:#a855f7; font-size:0.7rem; font-weight:800; letter-spacing:1px; margin-bottom:4px;">PROFISSIONAL</div>
                        <div style="font-weight:800; color:#fff; font-size:1.05rem;">\${profName}</div>
                        <div style="font-size:0.8rem; color:#888; margin-top: 2px;">\${date}</div>
                    </div>
                    <div style="background:#000; border:1px solid #333; padding:8px 16px; border-radius:12px; font-weight:900; color:#10B981; font-size: 1.1rem;">
                        \${time}
                    </div>
                </div>\`;
            }).join('');
        };
        loadClientAgenda();

        const profSelect = document.getElementById('client-select-prof');
        const dateGroup = document.getElementById('client-date-group');
        const dateInput = document.getElementById('client-agenda-date');
        const timeGroup = document.getElementById('client-time-group');
        const timeSlotsContainer = document.getElementById('client-time-slots');
        const btnConfirm = document.getElementById('btn-confirm-agendamento');
        
        let selectedTime = null;

        profSelect.addEventListener('change', () => {
            if (profSelect.value) {
                dateGroup.style.display = 'block';
                dateInput.value = '';
                timeGroup.style.display = 'none';
                btnConfirm.style.display = 'none';
            } else {
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
            const startOfDay = new Date(dateVal + 'T00:00:00-03:00').toISOString();
            const endOfDay = new Date(dateVal + 'T23:59:59-03:00').toISOString();

            // Fetch booked times
            const { data: booked } = await supabaseClient
                .from('appointments')
                .select('appointment_date')
                .eq('professional_id', profId)
                .gte('appointment_date', startOfDay)
                .lte('appointment_date', endOfDay);

            const bookedTimes = (booked || []).map(a => {
                return new Date(a.appointment_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            });

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
                btn.innerText = slot;
                btn.style.padding = '10px';
                btn.style.borderRadius = '8px';
                btn.style.border = '1px solid #333';
                btn.style.fontWeight = '800';
                btn.style.cursor = isBooked ? 'not-allowed' : 'pointer';
                btn.style.background = isBooked ? '#111' : '#000';
                btn.style.color = isBooked ? '#555' : '#fff';
                
                if (!isBooked) {
                    btn.onclick = () => {
                        // clear selected
                        Array.from(timeSlotsContainer.children).forEach(c => {
                            if(c.style.cursor !== 'not-allowed') {
                                c.style.background = '#000';
                                c.style.color = '#fff';
                                c.style.borderColor = '#333';
                            }
                        });
                        btn.style.background = 'rgba(168, 85, 247, 0.1)';
                        btn.style.color = '#a855f7';
                        btn.style.borderColor = '#a855f7';
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
            if (!profId || !dateVal || !selectedTime) return;

            btnConfirm.innerHTML = '<span class="loader-mini"></span>';
            btnConfirm.disabled = true;

            const appointmentIso = new Date(\`\${dateVal}T\${selectedTime}:00-03:00\`).toISOString();

            const { error } = await supabaseClient.from('appointments').insert([{
                professional_id: profId,
                client_id: user.id,
                appointment_date: appointmentIso
            }]);

            if (error) {
                alert('Erro ao agendar: ' + error.message);
                btnConfirm.innerHTML = 'Confirmar Agendamento';
                btnConfirm.disabled = false;
                return;
            }

            // Create Notification for Professional
            const profName = profSelect.options[profSelect.selectedIndex].text;
            const dateObj = new Date(appointmentIso);
            const formattedDate = dateObj.toLocaleDateString('pt-BR');
            const myName = (await supabaseClient.from('profiles').select('full_name').eq('id', user.id).single()).data?.full_name || 'Um cliente';

            await supabaseClient.from('notifications').insert([{
                user_id: profId,
                sender_id: user.id,
                type: 'appointment',
                title: 'Novo Agendamento!',
                content: \`\${myName} agendou para \${formattedDate} às \${selectedTime}.\`,
                link: '#agendamento'
            }]);

            // Notification for Client
            await supabaseClient.from('notifications').insert([{
                user_id: user.id,
                sender_id: profId,
                type: 'appointment',
                title: 'Agendamento Confirmado!',
                content: \`Você tem um horário com \${profName} dia \${formattedDate} às \${selectedTime}.\`,
                link: '#agendamento'
            }]);

            showSuccessModal('Agendado!', 'Seu horário está garantido.', () => {
                renderAgendamentoScreen();
            });
        };
    }
};
