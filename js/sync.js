// Sincronização com Supabase pela API REST, sem biblioteca nem passo de build.
// Modelo: um documento por utilizador com o estado inteiro. Os treinos juntam-se um
// a um, e nenhum se perde; o resto (perfil, níveis, cargas) vem do aparelho onde
// ele mexeu por último. Ver `juntar`.
// A publishable key é pública por desenho; quem protege os dados é a RLS no servidor.
import { CONFIG } from './config.js';

const CHAVE_SESSAO = 'treino.sessao';
const URL = () => CONFIG.supabase.url.replace(/\/$/, '');
const KEY = () => CONFIG.supabase.publishableKey;

export const SQL_TABELA = `create table if not exists public.estado (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  dados jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.estado enable row level security;
create policy "ve o seu" on public.estado for select using (auth.uid() = user_id);
create policy "cria o seu" on public.estado for insert with check (auth.uid() = user_id);
create policy "altera o seu" on public.estado for update using (auth.uid() = user_id) with check (auth.uid() = user_id);`;

// ── sessão ────────────────────────────────────────────────────
export function sessao() {
  try { return JSON.parse(localStorage.getItem(CHAVE_SESSAO) || 'null'); } catch { return null; }
}
function guardarSessao(s) {
  if (s) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(s));
  else localStorage.removeItem(CHAVE_SESSAO);
}
export function ligado() { return !!sessao()?.access_token; }
export function email() { return sessao()?.email || null; }
export function sair() { guardarSessao(null); }

function normaliza(j, mail) {
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expira: Date.now() + (j.expires_in ? j.expires_in * 1000 : 3600e3) - 60e3,
    email: j.user?.email || mail || email(),
  };
}

async function pedir(caminho, opcoes = {}, comToken = true) {
  const s = sessao();
  const cab = { apikey: KEY(), 'Content-Type': 'application/json', ...(opcoes.headers || {}) };
  if (comToken && s?.access_token) cab.Authorization = `Bearer ${s.access_token}`;
  const r = await fetch(`${URL()}${caminho}`, { ...opcoes, headers: cab });
  return r;
}

// ── entrada por código no email (sem password para guardar) ───
// `create_user: false`: a app nunca cria contas. As inscrições estão fechadas no
// projeto, mas isso é uma definição do painel que se pode mudar sem ninguém dar
// por ela — e a chave pública que autoriza este pedido está num repositório
// público. Dito aqui, a app continua a recusar mesmo que a definição mude.
export async function pedirCodigo(mail) {
  const r = await pedir('/auth/v1/otp', { method: 'POST', body: JSON.stringify({ email: mail, create_user: false }) }, false);
  if (!r.ok) throw new Error(await mensagemErro(r, 'Não consegui enviar o código'));
  return true;
}

export async function confirmarCodigo(mail, codigo) {
  const r = await pedir('/auth/v1/verify', { method: 'POST', body: JSON.stringify({ type: 'email', email: mail, token: String(codigo).trim() }) }, false);
  if (!r.ok) throw new Error(await mensagemErro(r, 'Código recusado'));
  const j = await r.json();
  guardarSessao(normaliza(j, mail));
  return true;
}

async function refrescar() {
  const s = sessao();
  if (!s?.refresh_token) return false;
  const r = await pedir('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: s.refresh_token }) }, false);
  // Só um "não" do servidor termina a sessão. Um erro dele (5xx) é passageiro, e
  // deitar a sessão fora por isso desligava a sincronização sem ninguém saber.
  if (!r.ok) { if ([400, 401, 403].includes(r.status)) guardarSessao(null); return false; }
  guardarSessao(normaliza(await r.json(), s.email));
  return true;
}

async function comSessaoValida() {
  const s = sessao();
  if (!s?.access_token) throw new Error('Sem sessão');
  if (s.expira && Date.now() > s.expira) {
    if (!await refrescar()) throw new Error(ligado() ? 'Não consegui renovar a sessão. Tenta daqui a pouco.' : 'A sessão expirou. Entra outra vez.');
  }
}

async function mensagemErro(r, prefixo) {
  let detalhe = '';
  try {
    const j = await r.json();
    detalhe = j.msg || j.message || j.error_description || j.error || j.hint || '';
    if (/relation .*estado.* does not exist/i.test(detalhe) || r.status === 404) detalhe = 'a tabela `estado` ainda não existe no Supabase';
    // O serviço de email do próprio Supabase só entrega a endereços da equipa do
    // projeto, e manda 2 por hora. Sem isto, a mensagem em inglês não explica nada.
    else if (/not authorized/i.test(detalhe)) detalhe = 'este endereço não pertence à equipa do projeto Supabase. Usa o email da tua conta Supabase, ou configura SMTP próprio no projeto';
    else if (r.status === 429 || /rate limit|too many/i.test(detalhe)) detalhe = 'o Supabase só manda 2 emails por hora sem SMTP próprio. Espera um pouco e tenta outra vez';
    // Endereço que não tem conta: com as inscrições fechadas o Supabase recusa em
    // vez de criar. Quase sempre é uma gralha no email.
    else if (/signups? not allowed|user not found/i.test(detalhe)) detalhe = 'não há conta com este email. Confirma se está bem escrito — a app não cria contas novas';
  } catch { /* corpo vazio ou não-JSON */ }
  return `${prefixo}${detalhe ? `: ${detalhe}` : ` (HTTP ${r.status})`}`;
}

// ── documento ─────────────────────────────────────────────────
export async function puxar() {
  await comSessaoValida();
  const r = await pedir('/rest/v1/estado?select=dados,updated_at&limit=1', { method: 'GET' });
  if (!r.ok) throw new Error(await mensagemErro(r, 'Não consegui ler'));
  const linhas = await r.json();
  return linhas[0] ? { dados: linhas[0].dados, updatedAt: Date.parse(linhas[0].updated_at) } : null;
}

// `keepalive` deixa o envio acabar depois de a app ir para segundo plano. O browser
// só o aceita até 64 KB, por isso acima disso vai sem ele (e pode não chegar a
// tempo — a abertura seguinte trata disso).
export async function empurrar(estado, { keepalive = false } = {}) {
  await comSessaoValida();
  const body = JSON.stringify({ dados: estado, updated_at: new Date().toISOString() });
  const r = await pedir('/rest/v1/estado?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body,
    ...(keepalive && body.length < 60000 ? { keepalive: true } : {}),
  });
  if (!r.ok) throw new Error(await mensagemErro(r, 'Não consegui guardar'));
  return true;
}

// Junta dois estados. Os treinos são o que não se pode perder: entram todos, dia a
// dia, e se os dois aparelhos têm o mesmo dia fica o registo guardado por último. O
// resto vem do documento mais recente — ou do servidor, ao entrar num aparelho novo.
export function juntar(local, remoto, { baseRemota = false } = {}) {
  const base = baseRemota || (remoto.updatedAt || 0) > (local.updatedAt || 0) ? remoto : local;
  const outro = base === remoto ? local : remoto;
  const porDia = new Map();
  for (const l of base.logs || []) porDia.set(l.date, l);
  for (const l of outro.logs || []) {
    const ja = porDia.get(l.date);
    if (!ja || (l.updatedAt || 0) > (ja.updatedAt || 0)) porDia.set(l.date, l);
  }
  const logs = [...porDia.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return { ...base, logs };
}

const assinatura = d => JSON.stringify([d.updatedAt || 0, (d.logs || []).map(l => [l.date, l.updatedAt || 0])]);

// Decide sozinho o que fazer, e devolve o que fez em palavras.
// `aplicar` recebe o estado a pôr neste aparelho, quando há alguma coisa a mudar cá.
export const ERRO_FORMATO = 'O outro aparelho tem uma versão mais recente da app. Atualiza este antes de sincronizar.';

export async function sincronizar(local, aplicar, opcoes = {}) {
  const remoto = await puxar();
  if (!remoto) { await empurrar(local, opcoes); return { acao: 'enviado', texto: 'Primeira cópia enviada' }; }
  // Um aparelho por atualizar nunca escreve por cima de um documento que já não sabe
  // ler: apagaria os campos novos. Pára aqui e diz porquê.
  if ((remoto.dados?.schema || 0) > (local.schema || 0)) throw new Error(ERRO_FORMATO);
  const la = { ...remoto.dados, updatedAt: remoto.dados?.updatedAt || remoto.updatedAt || 0 };
  const junto = juntar(local, la);
  const mudaCa = assinatura(junto) !== assinatura(local);
  const mudaLa = assinatura(junto) !== assinatura(la);
  if (mudaCa && mudaLa) {
    // Os dois lados tinham coisas que o outro não tinha: o resultado é novo para ambos.
    junto.updatedAt = Date.now();
    aplicar(junto);
    await empurrar(junto, opcoes);
    return { acao: 'juntado', texto: 'Juntei os treinos dos dois aparelhos' };
  }
  if (mudaCa) { aplicar(junto); return { acao: 'recebido', texto: 'Recebi a versão do outro aparelho' }; }
  if (mudaLa) { await empurrar(junto, opcoes); return { acao: 'enviado', texto: 'Enviei a versão deste aparelho' }; }
  return { acao: 'igual', texto: 'Já estava igual nos dois lados' };
}

// Ao entrar num aparelho, a hora não serve para decidir. Um iPad novo acabou de
// passar pelo perfil inicial, logo o estado dele é o mais recente — e enviava um
// histórico vazio por cima do iPhone. Aqui manda o que já está no servidor; deste
// aparelho só se aproveitam os treinos que lá não existam.
export async function entrar(local, aplicar) {
  const remoto = await puxar();
  if (!remoto) { await empurrar(local); return { acao: 'enviado', texto: 'Primeira cópia enviada' }; }
  if ((remoto.dados?.schema || 0) > (local.schema || 0)) throw new Error(ERRO_FORMATO);
  const la = { ...remoto.dados, updatedAt: remoto.dados?.updatedAt || remoto.updatedAt || 0 };
  const junto = juntar(local, la, { baseRemota: true });
  const n = junto.logs.length - (la.logs || []).length;
  if (n) junto.updatedAt = Date.now();
  aplicar(junto);
  if (n) await empurrar(junto);
  return { acao: 'recebido', texto: n ? `Recebi os dados do outro aparelho e juntei ${n} ${n === 1 ? 'treino' : 'treinos'} deste` : 'Recebi os dados do outro aparelho' };
}
