import { api } from './api';

const abrirBlob = (url) => {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const erroLegivel = async (erro) => {
  const dados = erro?.response?.data;
  if (dados && typeof dados.text === 'function') {
    try {
      const texto = await dados.text();
      const json = JSON.parse(texto);
      if (typeof json.mensagem === 'string' && json.mensagem.trim()) return json.mensagem;
    } catch {
      /* corpo não é JSON */
    }
  }
  if (erro?.response?.status === 403) return 'Acesso negado a este arquivo.';
  if (erro?.response?.status === 404) return 'Arquivo não encontrado.';
  return 'Não foi possível abrir o arquivo.';
};

/**
 * Baixa o arquivo pelo axios (mantém o header Authorization) e abre em nova aba.
 * A aba é aberta de forma síncrona para não ser bloqueada pelo popup blocker;
 * a URL do blob só é atribuída depois que o download termina.
 */
export const abrirArquivoEmNovaAba = async (chave) => {
  if (!chave) throw new Error('Arquivo indisponível.');

  const aba = window.open('', '_blank');
  try {
    const resposta = await api.get(`/arquivos/${encodeURIComponent(chave)}`, { responseType: 'blob' });
    const tipo = resposta.headers?.['content-type'] || 'application/pdf';
    const url = URL.createObjectURL(new Blob([resposta.data], { type: tipo }));

    if (aba) {
      aba.location.href = url;
    } else {
      abrirBlob(url);
    }

    setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
    return true;
  } catch (erro) {
    if (aba) aba.close();
    throw new Error(await erroLegivel(erro), { cause: erro });
  }
};
