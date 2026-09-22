export const SETORES = [
  { valor: 'ESPORTE', rotulo: 'Esporte' },
  { valor: 'CULTURA', rotulo: 'Cultura' },
];

const CHAVE = 'setorAtivo';

export function getSetorAtivo() {
  return localStorage.getItem(CHAVE) || 'ESPORTE';
}

export function setSetorAtivo(valor) {
  localStorage.setItem(CHAVE, valor);
  window.dispatchEvent(new CustomEvent('setor-changed', { detail: { valor } }));
}

export function categoriaQueryParam(setor = getSetorAtivo()) {
  return { categoria: setor };
}

const CHAVE_PARCELA = 'parcelaLembrada';

export function getParcelaLembrada(setor = getSetorAtivo()) {
  return localStorage.getItem(`${CHAVE_PARCELA}_${setor}`) || null;
}

export function salvarParcelaLembrada(parcelaId, setor = getSetorAtivo()) {
  if (parcelaId) localStorage.setItem(`${CHAVE_PARCELA}_${setor}`, String(parcelaId));
  else localStorage.removeItem(`${CHAVE_PARCELA}_${setor}`);
}

export function selecionarParcela({ parcelas, atual, setor }) {
  if (!parcelas || parcelas.length === 0) return null;
  const lembrada = getParcelaLembrada(setor);
  const preferida = lembrada ? parcelas.find(p => String(p.id) === lembrada) : null;
  return preferida || atual || parcelas[0];
}