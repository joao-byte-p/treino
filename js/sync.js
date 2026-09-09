// Sincronização com Supabase pela API REST, sem biblioteca nem passo de build.
// Modelo: um documento por utilizador com o estado inteiro. Para uma pessoa em dois
// aparelhos, ganha o lado com `updatedAt` mais recente — resolver conflito campo a
// campo seria complexidade a mais para um problema que ele não tem.
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
export async function pedirCodigo(mail) {
  const r = await pedir('/auth/v1/otp', { method: 'POST', body: JSON.stringify({ email: mail, create_user: true }) }, false);
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
  if (!r.ok) { guardarSessao(null); return false; }
  guardarSessao(normaliza(await r.json(), s.email));
  return true;
}

async function comSessaoValida() {
  const s = sessao();
  if (!s?.access_token) throw new Error('Sem sessão');
  if (s.expira && Date.now() > s.expira) {
    if (!await refrescar()) throw new Error('A sessão expirou. Entra outra vez.');
  }
}

async function mensagemErro(r, prefixo) {
  let detalhe = '';
  try {
    const j = await r.json();
    detalhe = j.msg || j.message || j.error_description || j.error || j.hint || '';
    if (/relation .*estado.* does not exist/i.test(detalhe) || r.status === 404) detalhe = 'a tabela `estado` ainda não existe no Supabase';
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

export async function empurrar(estado) {
  await comSessaoValida();
  const r = await pedir('/rest/v1/estado?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ dados: estado, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error(await mensagemErro(r, 'Não consegui guardar'));
  return true;
}

// Decide sozinho o que fazer, e devolve o que fez em palavras.
// `aplicar` recebe o estado remoto quando é ele o mais recente.
export async function sincronizar(local, aplicar) {
  const remoto = await puxar();
  if (!remoto) { await empurrar(local); return { acao: 'enviado', texto: 'Primeira cópia enviada' }; }
  const tLocal = local.updatedAt || 0;
  const tRemoto = remoto.dados?.updatedAt || remoto.updatedAt || 0;
  if (tRemoto > tLocal) { aplicar(remoto.dados); return { acao: 'recebido', texto: 'Recebi a versão do outro aparelho' }; }
  if (tLocal > tRemoto) { await empurrar(local); return { acao: 'enviado', texto: 'Enviei a versão deste aparelho' }; }
  return { acao: 'igual', texto: 'Já estava igual nos dois lados' };
}
