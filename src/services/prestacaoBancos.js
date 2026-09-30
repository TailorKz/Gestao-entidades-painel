import { api } from './api';

export const listarContasBancarias = async () => {
  const { data } = await api.get('/prestacao-bancos/contas');
  return data;
};

export const criarContaBancaria = async (banco, finalidade) => {
  const { data } = await api.post('/prestacao-bancos/contas', { banco, finalidade });
  return data;
};

export const atualizarContaBancaria = async (id, banco, finalidade) => {
  const { data } = await api.put(`/prestacao-bancos/contas/${id}`, { banco, finalidade });
  return data;
};

export const excluirContaBancaria = async (id) => {
  await api.delete(`/prestacao-bancos/contas/${id}`);
};

export const importarOfx = async (contaId, arquivo) => {
  const formData = new FormData();
  formData.append('file', arquivo);
  const { data } = await api.post(`/prestacao-bancos/contas/${contaId}/importar-ofx`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const listarTransacoesBancarias = async (contaId, mes, ano) => {
  const { data } = await api.get(`/prestacao-bancos/contas/${contaId}/transacoes`, {
    params: { mes, ano },
  });
  return data;
};

export const adicionarTransacaoManual = async (contaId, payload) => {
  const { data } = await api.post(`/prestacao-bancos/contas/${contaId}/transacoes/manual`, payload);
  return data;
};

export const excluirTransacaoBancaria = async (id) => {
  await api.delete(`/prestacao-bancos/transacoes/${id}`);
};

export const limparMesBancario = async (contaId, mes, ano) => {
  await api.delete(`/prestacao-bancos/contas/${contaId}/transacoes/limpar`, {
    params: { mes, ano },
  });
};

export const listarGrupos = async (contaId) => {
  const { data } = await api.get(`/prestacao-bancos/contas/${contaId}/grupos`);
  return data;
};

export const criarGrupo = async (contaId, nome, cor) => {
  const { data } = await api.post(`/prestacao-bancos/contas/${contaId}/grupos`, { nome, cor });
  return data;
};

export const atualizarGrupo = async (contaId, grupoId, nome, cor) => {
  const { data } = await api.put(`/prestacao-bancos/contas/${contaId}/grupos/${grupoId}`, { nome, cor });
  return data;
};

export const excluirGrupo = async (contaId, grupoId) => {
  await api.delete(`/prestacao-bancos/contas/${contaId}/grupos/${grupoId}`);
};

export const classificarTransacoes = async (ids, grupoId) => {
  const { data } = await api.post('/prestacao-bancos/transacoes/classificar', { ids, grupoId });
  return data;
};

export const obterRelatorio = async (contaId, ano) => {
  const { data } = await api.get(`/prestacao-bancos/contas/${contaId}/relatorio`, {
    params: { ano },
  });
  return data;
};