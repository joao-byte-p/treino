// Configuração pública do cliente. A publishable key do Supabase é desenhada para viver no código do cliente;
// o acesso aos dados é controlado por Row Level Security no servidor (fase 3).
export const CONFIG = {
  appName: 'Treino',
  version: '0.5.0',
  supabase: {
    url: 'https://mdsmoqcaauihjvlwtbiu.supabase.co',
    publishableKey: 'sb_publishable_DpRiJn5-Bw_4Hq7plbuneQ_ihfSlf7i',
    enabled: false, // fase 3: liga a sincronização
  },
};
