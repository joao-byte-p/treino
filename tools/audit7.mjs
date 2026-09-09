// Sincronização: testa a decisão de quem ganha, sem tocar na rede.
// O `fetch` é substituído por um servidor de mentira que guarda um documento em
// memória. Correr: node tools/audit7.mjs
const problemas = [];
const falha = m => problemas.push(m);

const guardado = new Map();
globalThis.localStorage = {
  getItem: k => (guardado.has(k) ? guardado.get(k) : null),
  setItem: (k, v) => guardado.set(k, String(v)),
  removeItem: k => guardado.delete(k),
};

// servidor de mentira
let doc = null;              // { dados, updated_at }
let pedidos = [];
let recusarTabela = false;
globalThis.fetch = async (url, opts = {}) => {
  pedidos.push({ url: String(url), metodo: opts.method || 'GET', cab: opts.headers || {} });
  const u = String(url);
  const resp = (status, corpo) => ({ ok: status < 300, status, json: async () => corpo });
  if (u.includes('/auth/v1/otp')) return resp(200, {});
  if (u.includes('/auth/v1/verify')) return resp(200, { access_token: 'tok', refresh_token: 'ref', expires_in: 3600, user: { email: JSON.parse(opts.body).email } });
  if (u.includes('grant_type=refresh_token')) return resp(200, { access_token: 'tok2', refresh_token: 'ref2', expires_in: 3600, user: { email: 'joao@onya.pt' } });
  if (u.includes('/rest/v1/estado')) {
    if (recusarTabela) return resp(404, { message: 'relation "public.estado" does not exist' });
    if ((opts.method || 'GET') === 'GET') return resp(200, doc ? [doc] : []);
    doc = { dados: JSON.parse(opts.body).dados, updated_at: JSON.parse(opts.body).updated_at };
    return resp(201, {});
  }
  return resp(500, {});
};

const S = await import('../js/sync.js');

// ── 1. entrada e saída ────────────────────────────────────────
if (S.ligado()) falha('começou com sessão sem ninguém ter entrado');
await S.pedirCodigo('joao@onya.pt');
await S.confirmarCodigo('joao@onya.pt', '123456');
if (!S.ligado()) falha('não ficou ligado depois de confirmar o código');
if (S.email() !== 'joao@onya.pt') falha(`email errado: ${S.email()}`);

// a chave pública vai em todos os pedidos, e o token só nos que precisam dele
const semChave = pedidos.filter(p => !p.cab.apikey);
if (semChave.length) falha(`${semChave.length} pedidos sem apikey`);
const otp = pedidos.find(p => p.url.includes('/otp'));
if (otp.cab.Authorization) falha('pedido de código levou Authorization, e ainda não havia sessão');

// ── 2. primeira sincronização: nada lá, envia ─────────────────
let aplicado = null;
const local = { updatedAt: 1000, logs: ['a'] };
let r = await S.sincronizar(local, d => { aplicado = d; });
if (r.acao !== 'enviado') falha(`primeira sincronização devia enviar, fez "${r.acao}"`);
if (aplicado) falha('primeira sincronização não devia aplicar nada localmente');
if (!doc) falha('nada chegou ao servidor');

// ── 3. remoto mais novo: recebe ───────────────────────────────
doc = { dados: { updatedAt: 5000, logs: ['a', 'b'] }, updated_at: new Date(5000).toISOString() };
aplicado = null;
r = await S.sincronizar({ updatedAt: 2000, logs: ['a'] }, d => { aplicado = d; });
if (r.acao !== 'recebido') falha(`remoto mais novo devia ser recebido, fez "${r.acao}"`);
if (!aplicado || aplicado.logs.length !== 2) falha('não aplicou o estado remoto');

// ── 4. local mais novo: envia e o remoto fica igual ───────────
r = await S.sincronizar({ updatedAt: 9000, logs: ['a', 'b', 'c'] }, () => falha('não devia aplicar nada'));
if (r.acao !== 'enviado') falha(`local mais novo devia ser enviado, fez "${r.acao}"`);
if (doc.dados.logs.length !== 3) falha('o servidor não ficou com a versão local');

// ── 5. iguais: não mexe ───────────────────────────────────────
doc = { dados: { updatedAt: 7000 }, updated_at: new Date(7000).toISOString() };
r = await S.sincronizar({ updatedAt: 7000 }, () => falha('iguais não aplicam nada'));
if (r.acao !== 'igual') falha(`timestamps iguais deviam dar "igual", deu "${r.acao}"`);

// ── 6. tabela em falta: erro que se entende ───────────────────
recusarTabela = true;
try {
  await S.sincronizar({ updatedAt: 1 }, () => {});
  falha('tabela em falta passou sem erro');
} catch (e) {
  if (!/tabela .*estado.* ainda não existe/i.test(e.message)) falha(`mensagem pouco clara: ${e.message}`);
}
recusarTabela = false;

// ── 7. sessão expirada refresca sozinha ───────────────────────
const s = JSON.parse(localStorage.getItem('treino.sessao'));
s.expira = Date.now() - 1000;
localStorage.setItem('treino.sessao', JSON.stringify(s));
pedidos = [];
doc = { dados: { updatedAt: 100 }, updated_at: new Date(100).toISOString() };
await S.sincronizar({ updatedAt: 200 }, () => {});
if (!pedidos.some(p => p.url.includes('grant_type=refresh_token'))) falha('sessão expirada não foi refrescada');
if (JSON.parse(localStorage.getItem('treino.sessao')).access_token !== 'tok2') falha('não guardou o token novo');

// ── 8. sair apaga tudo ────────────────────────────────────────
S.sair();
if (S.ligado() || localStorage.getItem('treino.sessao')) falha('sair não apagou a sessão');

// ── 9. o SQL da tabela liga a RLS ─────────────────────────────
if (!/enable row level security/i.test(S.SQL_TABELA)) falha('o SQL da tabela não liga RLS');
if ((S.SQL_TABELA.match(/create policy/gi) || []).length < 3) falha('faltam políticas de RLS (ler, criar, alterar)');

console.log(`sincronização: 9 cenários`);
if (problemas.length) { console.log(`${problemas.length} problemas:\n  ` + problemas.join('\n  ')); process.exitCode = 1; }
else console.log('sem problemas');
