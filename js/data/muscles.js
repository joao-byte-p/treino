// Grupos musculares para filtrar a biblioteca.
//
// Cada exercício já trazia os músculos escritos à mão, em linguagem de treino
// ("Deltoide posterior", "Tendão patelar", "Flexores da anca"). São 59 termos
// distintos: bons para ler na ficha do exercício, impossíveis como filtro. Aqui
// traduzo cada um para um dos grupos que uma pessoa procura — e a tradução é
// uma tabela explícita, não uma adivinha por palavra-chave, porque "Tendão de
// Aquiles" e "Tibial anterior" não têm nada em comum na escrita e tudo em comum
// no sítio do corpo. tools/audit10.mjs garante que nenhum termo fica de fora.
import { EXERCISES } from './exercises.js';

export const GRUPOS = [
  ['peito', 'Peito'],
  ['costas', 'Costas'],
  ['ombros', 'Ombros'],
  ['biceps', 'Bíceps'],
  ['triceps', 'Tríceps'],
  ['core', 'Core'],
  ['gluteos', 'Glúteos'],
  ['quadriceps', 'Quadríceps'],
  ['isquios', 'Isquiotibiais'],
  ['anca', 'Anca'],
  ['gemeos', 'Gémeos e tornozelo'],
  ['cardio', 'Cardio'],
];

export const GRUPO_LABEL = Object.fromEntries(GRUPOS);

// termo escrito na ficha -> grupos a que pertence (pode ser mais do que um)
const MAPA = {
  'Peito': ['peito'], 'Peito superior': ['peito'], 'Peito inferior': ['peito'], 'Peito interno': ['peito'],
  'Costas': ['costas'], 'Trapézio': ['costas'], 'Trapézio médio': ['costas'], 'Trapézio superior': ['costas'],
  'Extensores da coluna': ['costas'], 'Lombar': ['costas'], 'Coluna': ['costas'], 'Coluna torácica': ['costas'],
  'Torácica': ['costas'],
  'Ombros': ['ombros'], 'Ombros anteriores': ['ombros'], 'Deltoide posterior': ['ombros', 'costas'],
  'Deltoide lateral': ['ombros'],
  'Bíceps': ['biceps'], 'Braquial': ['biceps'], 'Antebraço': ['biceps'], 'Pega': ['biceps'],
  'Tríceps': ['triceps'],
  'Core': ['core'], 'Core total': ['core'], 'Core profundo': ['core'], 'Abdominais': ['core'],
  'Abdominais inferiores': ['core'], 'Oblíquos': ['core'], 'Anti-extensão': ['core'], 'Anti-rotação': ['core'],
  'Diafragma': ['core'],
  'Glúteos': ['gluteos'], 'Glúteo': ['gluteos'], 'Glúteo médio': ['gluteos', 'anca'],
  'Quadríceps': ['quadriceps'], 'Tendão patelar': ['quadriceps'], 'Controlo do joelho': ['quadriceps'],
  'Joelhos': ['quadriceps'],
  'Isquiotibiais': ['isquios'],
  'Anca': ['anca'], 'Flexores da anca': ['anca'], 'Estabilidade da anca': ['anca'],
  'Rotação da anca': ['anca'], 'Adutores': ['anca'], 'Piriforme': ['anca'],
  'Gémeos': ['gemeos'], 'Tendão de Aquiles': ['gemeos'], 'Tibial anterior': ['gemeos'],
  'Tornozelo': ['gemeos'], 'Tornozelos': ['gemeos'],
  'Cardio': ['cardio'], 'Sistema cardiovascular': ['cardio'], 'Limiar': ['cardio'],
  'Recuperação ativa': ['cardio'],
  // Qualidades, não músculos: não dão grupo nenhum. O exercício entra pelos
  // outros termos que tem, ou pelo padrão de movimento (ver abaixo).
  'Pernas': [], 'Equilíbrio': [], 'Coordenação': [], 'Estabilidade': [], 'Corpo inteiro': [],
  'Sistema nervoso': [],
};

// Rede de segurança: um exercício cujos termos sejam todos qualidades ainda tem de
// aparecer nalgum filtro, senão desaparece da biblioteca ao filtrar.
const POR_PADRAO = {
  push: ['peito', 'ombros', 'triceps'], pull: ['costas', 'biceps'], squat: ['quadriceps', 'gluteos'],
  knee: ['quadriceps'], hinge: ['isquios', 'gluteos'], glute: ['gluteos'], core: ['core'],
  hiit: ['cardio'], cardio: ['cardio'], mobility: ['anca'], warmup: ['cardio'],
};

export function termosDesconhecidos() {
  const fora = new Set();
  for (const e of EXERCISES) for (const m of e.muscles) if (!(m in MAPA)) fora.add(m);
  return [...fora];
}

export function gruposDe(ex) {
  const g = new Set();
  for (const m of ex.muscles) for (const k of MAPA[m] || []) g.add(k);
  if (!g.size) for (const k of POR_PADRAO[ex.pattern] || []) g.add(k);
  return g;
}

export function temGrupo(ex, grupo) {
  return grupo === 'todos' || gruposDe(ex).has(grupo);
}
