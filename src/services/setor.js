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