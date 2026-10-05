import { api } from './api';

export const listarChecklistPagamentos = async (ano, mes) => {
  const { data } = await api.get('/checklist-pagamentos', { params: { ano, mes } });
  return data;
};

export const salvarChecklistPagamento = async (usuarioId, ano, mes, entregouDocumentos, pagamentoFeito) => {
  const { data } = await api.put('/checklist-pagamentos', { usuarioId, ano, mes, entregouDocumentos, pagamentoFeito });
  return data;
};
