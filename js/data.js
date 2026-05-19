export const DATA = {
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
      id: 'prof-101', user_type: 'professional', full_name: 'Marcos Silva', category: 'Barbearia & Estilo', specialty: 'Corte Masculino e Feminino',
      rating: 4.9, reviews: 85, price: 45, priceUnit: 'corte', subscription_plan: 'Plano Plus',
      city: 'São Paulo', address: 'Rua das Acácias, 118 - Santa Edwiges', verified: true, points: 450,
      bio: 'Especialista em cortes modernos e coloração. Com mais de 10 anos de experiência, busco sempre a excelência no atendimento e o bem-estar dos meus clientes.',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
      cover_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800',
      services: [
        { id: 1, name: 'Corte Social', price: 45, duration: 40, description: 'Corte tesoura ou máquina com acabamento.' },
        { id: 2, name: 'Barba Completa', price: 30, duration: 30, description: 'Toalha quente e produtos premium.' },
        { id: 3, name: 'Corte + Barba', price: 70, duration: 70, description: 'Combo completo para renovar o visual.' },
        { id: 4, name: 'Coloração Global', price: 120, duration: 90, description: 'Mudança de cor com produtos que não agridem os fios.' },
        { id: 5, name: 'Tratamento Capilar', price: 50, duration: 45, description: 'Hidratação profunda e reconstrução.' },
      ],
    },
    {
      id: 'prof-102', user_type: 'professional', full_name: 'Ricardo Barber', category: 'Barbearia', specialty: 'Barba Premium e Degradê',
      rating: 4.8, reviews: 120, price: 35, priceUnit: 'serviço',
      city: 'São Paulo', address: 'Avenida Bento de Souza, 247 - Santa Edwiges', verified: true, points: 890,
      bio: 'Referência em barboterapia e cortes fade na região. Ambiente climatizado e café cortesia para todos os clientes.',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
      cover_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800',
      services: [
        { id: 1, name: 'Barba Premium', price: 35, duration: 30, description: 'Toalha quente e óleos essenciais.' },
        { id: 2, name: 'Degradê Fade', price: 40, duration: 45, description: 'Corte com transição suave e precisa.' },
      ],
    },
    {
      id: 'prof-103', user_type: 'professional', full_name: 'Juliana Beauty', category: 'Estética', specialty: 'Estética e Maquiagem',
      rating: 5.0, reviews: 64, price: 120, priceUnit: 'sessão', subscription_plan: 'Plano Plus',
      city: 'São Paulo', address: 'Rua José Ferreira Lima, 62 - Jardim ABC', verified: true, points: 1200,
      bio: 'Especialista em estética avançada e maquiagem para eventos. Transformando vidas através da beleza e autoestima.',
      avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
      cover_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800',
      services: [
        { id: 1, name: 'Limpeza de Pele', price: 120, duration: 90, description: 'Tratamento completo com hidratação.' },
        { id: 2, name: 'Maquiagem Social', price: 150, duration: 60, description: 'Look impecável para sua festa.' },
        { id: 3, name: 'Peeling Químico', price: 200, duration: 45, description: 'Renovação celular e clareamento.' },
        { id: 4, name: 'Drenagem Linfática', price: 130, duration: 60, description: 'Redução de medidas e toxinas.' },
        { id: 5, name: 'Microagulhamento', price: 250, duration: 75, description: 'Estimulação de colágeno e rejuvenescimento.' },
      ],
    },
    {
      id: 'prof-104', user_type: 'professional', full_name: 'Bruno Style', category: 'Beleza Afro', specialty: 'Tranças e Mega Hair',
      rating: 4.7, reviews: 42, price: 80, priceUnit: 'hora',
      city: 'São Paulo', address: 'Travessa Santa Helena, 34 - Centro', verified: true, points: 310,
      bio: 'Especialista em tranças nagô, box braids e aplicação de mega hair. Arte e resistência em cada detalhe.',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      cover_url: 'https://images.unsplash.com/photo-1595475241949-06f2117cb00c?auto=format&fit=crop&q=80&w=800',
      services: [
        { id: 1, name: 'Tranças Nagô', price: 80, duration: 120, description: 'Design exclusivo no couro cabeludo.' },
        { id: 2, name: 'Box Braids', price: 250, duration: 240, description: 'Estilo clássico e duradouro.' },
      ],
    },
  ],

  clients: [
    {
      id: 'client-201', user_type: 'client', full_name: 'Felipe Souza',
      city: 'São Paulo', address: 'Rua das Acácias, 108', points: 50,
      bio: 'Entusiasta de tecnologia e amante de bons cortes de cabelo. Sempre em busca de novos profissionais na região.',
      avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200',
      cover_url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=800',
    },
    {
      id: 'client-202', user_type: 'client', full_name: 'Amanda Lima',
      city: 'Santo André', address: 'Avenida Bento de Souza, 277', points: 120,
      bio: 'Amo cuidar da minha autoestima e descobrir novos estúdios de beleza. Valorizo atendimento personalizado.',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
      cover_url: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=800',
    },
    {
      id: 'client-203', user_type: 'client', full_name: 'Thiago Oliveira',
      city: 'São Bernardo', address: 'Rua José Ferreira Lima, 66', points: 30,
      bio: 'Sempre buscando facilidade no dia a dia. Gosto de agendar tudo pelo app de forma rápida.',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
      cover_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800',
    },
    {
      id: 'client-204', user_type: 'client', full_name: 'Camila Santos',
      city: 'São Caetano', address: 'Travessa Santa Helena, 33', points: 80,
      bio: 'Adoro participar dos eventos da comunidade e conhecer as pessoas por trás dos serviços.',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      cover_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800',
    },
  ],

  currentUser: {
    name: 'Felipe Souza', email: 'felipe.cliente@zero.com',
    avatar: 'FS', avatarColor: '#000000',
    type: 'client', bookings: 12, reviews: 4, connections: 56, memberSince: 'Mai 2024',
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
  conversations: [
    {
      id: 'prof-101', professionalName: 'Marcos Silva', professionalAvatar: 'MS', avatarColor: '#3B82F6',
      lastMessage: 'Olá Felipe! Como posso te ajudar hoje?', time: '14:30',
      messages: [
        { sender: 'user', text: 'Oi Marcos, queria saber sobre o corte social.', time: '14:25' },
        { sender: 'other', text: 'Olá Felipe! Como posso te ajudar hoje?', time: '14:30' }
      ]
    },
    {
      id: 'prof-103', professionalName: 'Juliana Beauty', professionalAvatar: 'JB', avatarColor: '#EC4899',
      lastMessage: 'Seu agendamento foi confirmado para amanhã.', time: 'Ontem',
      messages: [
        { sender: 'user', text: 'Pode confirmar meu horário?', time: 'Ontem' },
        { sender: 'other', text: 'Seu agendamento foi confirmado para amanhã.', time: 'Ontem' }
      ]
    }
  ],
};
