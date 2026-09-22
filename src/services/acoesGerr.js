import { api } from './api';

export const listarAcoesGerr = async (categoria, incluirInativas = false) => {
  const { data } = await api.get('/acoes-gerr', { params: { categoria, incluirInativas } });
  return data;
};

export const criarAcaoGerr = async (categoria, nome) => {
  const { data } = await api.post('/acoes-gerr', { categoria, nome });
  return data;
};

export const atualizarAcaoGerr = async (id, payload) => {
  const { data } = await api.put(`/acoes-gerr/${id}`, payload);
  return data;
};

export const reordenarAcoesGerr = async (categoria, ids) => {
  const { data } = await api.post('/acoes-gerr/reordenar', { categoria, ids });
  return data;
};

export const excluirAcaoGerr = async (id) => {
  await api.delete(`/acoes-gerr/${id}`);
};