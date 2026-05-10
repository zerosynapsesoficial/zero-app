const DATA = {
  categories: [
    { id: 1, icon: '⚖️', name: 'Direito', count: 45 },
    { id: 2, icon: '🏥', name: 'Saúde', count: 38 },
    { id: 3, icon: '💻', name: 'Tecnologia', count: 62 },
    { id: 4, icon: '🏗️', name: 'Construção', count: 29 },
    { id: 5, icon: '✂️', name: 'Beleza', count: 41 },
    { id: 6, icon: '📊', name: 'Finanças', count: 33 },
    { id: 7, icon: '🎓', name: 'Educação', count: 55 },
    { id: 8, icon: '🍳', name: 'Gastronomia', count: 17 },
  ],

  professionals: [
    {
      id: 1, name: 'Ana Oliveira', category: 'Direito', specialty: 'Direito Civil',
      rating: 4.9, reviews: 127, price: 200, priceUnit: 'h',
      location: 'São Paulo, SP', distance: '2.3 km', verified: true, featured: true,
      bio: 'Advogada com 12 anos de experiência em direito civil e família. Membro ativo da comunidade Zero há 5 anos.',
      avatar: 'AO', avatarColor: '#4F46E5',
      availability: 'Seg–Sex, 8h–18h', responseTime: '~2h',
      services: [
        { id: 1, name: 'Consulta Jurídica', price: 200, duration: 60, description: 'Análise do caso e orientação jurídica completa.' },
        { id: 2, name: 'Elaboração de Contratos', price: 800, duration: 0, description: 'Contratos personalizados para seus negócios.' },
        { id: 3, name: 'Representação Judicial', price: 2500, duration: 0, description: 'Representação completa em processos judiciais.' },
      ],
    },
    {
      id: 2, name: 'Carlos Santos', category: 'Tecnologia', specialty: 'Desenvolvimento Web',
      rating: 4.8, reviews: 94, price: 150, priceUnit: 'h',
      location: 'São Paulo, SP', distance: '0.8 km', verified: true, featured: true,
      bio: 'Desenvolvedor full-stack com 8 anos de experiência. Especialista em React, Node.js e soluções em nuvem.',
      avatar: 'CS', avatarColor: '#3B82F6',
      availability: 'Seg–Sab, 9h–20h', responseTime: '~30min',
      services: [
        { id: 1, name: 'Consultoria Técnica', price: 150, duration: 60, description: 'Análise e planejamento de projetos tecnológicos.' },
        { id: 2, name: 'Desenvolvimento de Site', price: 3000, duration: 0, description: 'Site profissional completo e responsivo.' },
        { id: 3, name: 'App Mobile', price: 8000, duration: 0, description: 'Aplicativo para iOS e Android.' },
      ],
    },
    {
      id: 3, name: 'Mariana Lima', category: 'Saúde', specialty: 'Nutrição',
      rating: 5.0, reviews: 203, price: 180, priceUnit: 'consulta',
      location: 'São Paulo, SP', distance: '1.5 km', verified: true, featured: false,
      bio: 'Nutricionista especializada em reeducação alimentar e nutrição esportiva. Atende online e presencialmente.',
      avatar: 'ML', avatarColor: '#10B981',
      availability: 'Seg–Sex, 7h–19h', responseTime: '~1h',
      services: [
        { id: 1, name: 'Consulta Inicial', price: 180, duration: 60, description: 'Avaliação nutricional completa e plano alimentar.' },
        { id: 2, name: 'Retorno', price: 120, duration: 45, description: 'Acompanhamento e ajuste do plano alimentar.' },
        { id: 3, name: 'Pacote Mensal', price: 450, duration: 0, description: '4 consultas mensais com acompanhamento contínuo.' },
      ],
    },
    {
      id: 4, name: 'Roberto Ferreira', category: 'Construção', specialty: 'Arquitetura',
      rating: 4.7, reviews: 68, price: 250, priceUnit: 'h',
      location: 'São Paulo, SP', distance: '3.1 km', verified: true, featured: true,
      bio: 'Arquiteto e urbanista com foco em projetos residenciais sustentáveis. 15 anos no mercado.',
      avatar: 'RF', avatarColor: '#F59E0B',
      availability: 'Seg–Sex, 8h–18h', responseTime: '~4h',
      services: [
        { id: 1, name: 'Consulta Inicial', price: 250, duration: 60, description: 'Análise do terreno/imóvel e definição do escopo.' },
        { id: 2, name: 'Projeto Residencial', price: 15000, duration: 0, description: 'Projeto arquitetônico completo.' },
        { id: 3, name: 'Acompanhamento de Obra', price: 3000, duration: 0, description: 'Gestão e supervisão de obra.' },
      ],
    },
    {
      id: 5, name: 'Fernanda Costa', category: 'Finanças', specialty: 'Planejamento Financeiro',
      rating: 4.9, reviews: 156, price: 300, priceUnit: 'h',
      location: 'São Paulo, SP', distance: '1.9 km', verified: true, featured: false,
      bio: 'Planejadora financeira certificada. Ajudo pessoas e empresas a alcançar independência financeira.',
      avatar: 'FC', avatarColor: '#8B5CF6',
      availability: 'Seg–Sex, 9h–18h', responseTime: '~2h',
      services: [
        { id: 1, name: 'Diagnóstico Financeiro', price: 300, duration: 90, description: 'Análise completa da sua situação financeira.' },
        { id: 2, name: 'Planejamento Anual', price: 2400, duration: 0, description: 'Plano financeiro detalhado para o ano.' },
        { id: 3, name: 'Consultoria Empresarial', price: 500, duration: 120, description: 'Gestão financeira para pequenas empresas.' },
      ],
    },
    {
      id: 6, name: 'Diego Almeida', category: 'Educação', specialty: 'Coaching',
      rating: 4.8, reviews: 89, price: 220, priceUnit: 'sessão',
      location: 'São Paulo, SP', distance: '0.5 km', verified: true, featured: true,
      bio: 'Coach executivo certificado. Especialista em desenvolvimento de liderança e performance profissional.',
      avatar: 'DA', avatarColor: '#F97316',
      availability: 'Seg–Sab, 7h–21h', responseTime: '~1h',
      services: [
        { id: 1, name: 'Sessão de Coaching', price: 220, duration: 60, description: 'Sessão focada em seus objetivos profissionais.' },
        { id: 2, name: 'Programa de Liderança', price: 2800, duration: 0, description: '12 sessões para desenvolvimento de liderança.' },
        { id: 3, name: 'Workshop em Grupo', price: 150, duration: 180, description: 'Treinamento intensivo para equipes.' },
      ],
    },
  ],

  reviews: [
    { id: 1, professionalId: 1, author: 'João P.', authorAvatar: 'JP', rating: 5, comment: 'Excelente profissional! Resolveu meu caso de forma rápida e eficiente.', date: '2 dias atrás' },
    { id: 2, professionalId: 1, author: 'Maria S.', authorAvatar: 'MS', rating: 5, comment: 'Muito atenciosa e competente. Recomendo muito!', date: '1 semana atrás' },
    { id: 3, professionalId: 1, author: 'Pedro L.', authorAvatar: 'PL', rating: 4, comment: 'Ótima advogada, bem preparada e comunicativa.', date: '2 semanas atrás' },
    { id: 4, professionalId: 2, author: 'Ana C.', authorAvatar: 'AC', rating: 5, comment: 'Entregou o projeto no prazo e com qualidade excepcional!', date: '3 dias atrás' },
    { id: 5, professionalId: 2, author: 'Lucas R.', authorAvatar: 'LR', rating: 5, comment: 'Profissional incrível, entende exatamente o que precisa ser feito.', date: '1 semana atrás' },
    { id: 6, professionalId: 3, author: 'Carla M.', authorAvatar: 'CM', rating: 5, comment: 'Mudou minha vida! Perdi 8kg em 3 meses com saúde.', date: '5 dias atrás' },
  ],

  conversations: [
    {
      id: 1, professionalId: 1, professionalName: 'Ana Oliveira',
      professionalAvatar: 'AO', avatarColor: '#4F46E5',
      lastMessage: 'Perfeito! Confirmo o horário das 14h então.', time: '14:30', unread: 2,
      messages: [
        { id: 1, sender: 'professional', text: 'Olá! Vi que você agendou uma consulta. Como posso te ajudar?', time: '13:00' },
        { id: 2, sender: 'user', text: 'Oi Ana! Tenho uma questão sobre divórcio amigável.', time: '13:05' },
        { id: 3, sender: 'professional', text: 'Claro! Posso te passar mais detalhes sobre o processo. Qual o horário de preferência?', time: '13:10' },
        { id: 4, sender: 'user', text: 'Pode ser amanhã às 14h?', time: '14:28' },
        { id: 5, sender: 'professional', text: 'Perfeito! Confirmo o horário das 14h então.', time: '14:30' },
      ],
    },
    {
      id: 2, professionalId: 2, professionalName: 'Carlos Santos',
      professionalAvatar: 'CS', avatarColor: '#3B82F6',
      lastMessage: 'Vou enviar o orçamento ainda hoje!', time: '11:15', unread: 0,
      messages: [
        { id: 1, sender: 'user', text: 'Carlos, preciso de um orçamento para um site e-commerce.', time: '10:00' },
        { id: 2, sender: 'professional', text: 'Oi! Que tipo de e-commerce? Quantos produtos aproximadamente?', time: '10:15' },
        { id: 3, sender: 'user', text: 'Moda feminina, cerca de 200 produtos.', time: '10:20' },
        { id: 4, sender: 'professional', text: 'Perfeito! Tenho experiência com isso. Vou enviar o orçamento ainda hoje!', time: '11:15' },
      ],
    },
    {
      id: 3, professionalId: 3, professionalName: 'Mariana Lima',
      professionalAvatar: 'ML', avatarColor: '#10B981',
      lastMessage: 'Obrigada pela confiança! Até quinta. 😊', time: 'Seg', unread: 0,
      messages: [
        { id: 1, sender: 'user', text: 'Mariana, quero iniciar um programa nutricional.', time: 'Seg' },
        { id: 2, sender: 'professional', text: 'Que ótimo! Preparei um questionário inicial pra você.', time: 'Seg' },
        { id: 3, sender: 'user', text: 'Perfeito, já respondi!', time: 'Seg' },
        { id: 4, sender: 'professional', text: 'Obrigada pela confiança! Até quinta. 😊', time: 'Seg' },
      ],
    },
  ],

  timeSlots: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],

  currentUser: {
    name: 'Lucas Mendes', email: 'lucas@email.com',
    avatar: 'LM', avatarColor: '#4F46E5',
    type: 'client', bookings: 8, reviews: 5, connections: 34, memberSince: 'Jan 2024',
  },

  adminStats: {
    totalUsers: 1842, totalProfessionals: 324,
    totalBookings: 5621, newUsersToday: 23, activeNow: 187,
  },

  pendingApprovals: [
    { id: 1, name: 'Felipe Rocha', category: 'Saúde', specialty: 'Fisioterapia', time: '2h atrás' },
    { id: 2, name: 'Beatriz Nunes', category: 'Beleza', specialty: 'Estética', time: '5h atrás' },
    { id: 3, name: 'Thiago Ramos', category: 'Direito', specialty: 'Direito Trabalhista', time: '1d atrás' },
  ],
};
