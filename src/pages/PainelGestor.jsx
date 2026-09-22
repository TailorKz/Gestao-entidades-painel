import { useState, useEffect } from 'react';
import { api, obterMensagemErro } from '../services/api';
import { categoriaQueryParam, getSetorAtivo } from '../services/setor';
import { Users, UserPlus, X, Activity, Music, ArrowLeft, ArrowRight, FileText, Send, Trash2 } from 'lucide-react';

const heading = { fontFamily: "'Varela Round', sans-serif" };

// O tenant é derivado do usuário autenticado no backend
export default function PainelGestor() {

  // Estados da Lista Principal
  const [instrutores, setInstrutores] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // ESTADO CORRIGIDO: Único objeto para todo o formulário
  const [dadosInstrutor, setDadosInstrutor] = useState({
      nome: '',
      login: '',
      senha: '',
      categoria: getSetorAtivo(),
      observacoes: ''
  });

  // Estados da Visão Detalhada (Pasta do Instrutor)
  const [instrutorSelecionado, setInstrutorSelecionado] = useState(null);
  const [despesasInstrutor, setDespesasInstrutor] = useState([]);
  const [carregandoDespesas, setCarregandoDespesas] = useState(false);
  const [modalArquivosAberto, setModalArquivosAberto] = useState(false);
  const [arquivosDaDespesa, setArquivosDaDespesa] = useState([]);
  const [carregandoAnexos, setCarregandoAnexos] = useState(false);
  const [despesaIdArquivos, setDespesaIdArquivos] = useState(null);

  const carregarInstrutores = async () => {
    try {
      const response = await api.get(`/usuarios/instrutores`, { params: categoriaQueryParam() });
      setInstrutores(response.data);
    } catch (error) {
      console.error("Erro ao carregar instrutores", error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarInstrutores();
  }, []);

  useEffect(() => {
    const aoMudarSetor = () => carregarInstrutores();
    window.addEventListener('setor-changed', aoMudarSetor);
    return () => window.removeEventListener('setor-changed', aoMudarSetor);
  }, []);

  // FUNÇÃO DE SALVAR CORRIGIDA: Usando dadosInstrutor e enviando observacoes
  const handleCadastrar = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nome: dadosInstrutor.nome,
        login: dadosInstrutor.login,
        senha: dadosInstrutor.senha,
        observacoes: dadosInstrutor.observacoes,
        role: 'INSTRUTOR',
        categoria: dadosInstrutor.categoria
      };

      await api.post('/usuarios', payload);

      alert("Instrutor cadastrado com sucesso!");
      setShowModal(false);
      setDadosInstrutor({ nome: '', login: '', senha: '', categoria: getSetorAtivo(), observacoes: '' });
      carregarInstrutores();
    } catch (error) {
      alert(obterMensagemErro(error, "Erro ao cadastrar. Verifique os dados."));
    }
  };

  // Função para abrir a pasta do instrutor
  const abrirPastaInstrutor = async (instrutor) => {
    setInstrutorSelecionado(instrutor);
    setCarregandoDespesas(true);
    try {
      const response = await api.get(`/despesas/usuario/${instrutor.id}`);
      setDespesasInstrutor(response.data);
    } catch (error) {
      console.error("Erro ao carregar despesas do instrutor", error);
      setDespesasInstrutor([]);
    } finally {
      setCarregandoDespesas(false);
    }
  };

  const handleVerArquivos = async (despesaId) => {
    setModalArquivosAberto(true);
    setDespesaIdArquivos(despesaId);
    setCarregandoAnexos(true);
    try {
      const response = await api.get(`/despesas/${despesaId}/anexos`);
      setArquivosDaDespesa(response.data);
    } catch (error) {
      console.error("Erro ao buscar anexos:", error);
    } finally {
      setCarregandoAnexos(false);
    }
  };

  const handleExcluirAnexo = async (anexo) => {
    const rotulo = anexo.tipo === 'NOTA_FISCAL' ? 'nota fiscal' : 'arquivo';
    if (!window.confirm(`Excluir ${rotulo} "${anexo.nomeOriginal}"? O arquivo será apagado do S3.`)) return;
    try {
      await api.delete(`/anexos/${anexo.id}`);
      await handleVerArquivos(despesaIdArquivos);
      if (instrutorSelecionado) await abrirPastaInstrutor(instrutorSelecionado);
    } catch (error) {
      alert(obterMensagemErro(error, "Erro ao excluir o arquivo."));
    }
  };

  const abrirPdfEmNovaAba = (caminhoCompleto) => {
    const nomeArquivo = caminhoCompleto.replace('uploads\\', '').replace('uploads/', '');
    const apiBase = api.defaults.baseURL || 'http://localhost:8080';
    window.open(`${apiBase}/arquivos/${nomeArquivo}`, '_blank');
  };

  const renderStatus = (status) => {
    const estilos = {
      AGUARDANDO_DOCUMENTOS: { cor: 'text-amber-700 bg-amber-50 border-amber-200', rotulo: 'Aguardando documentos' },
      PRONTA_PARA_MATCH: { cor: 'text-brand-700 bg-brand-50 border-brand-200', rotulo: 'Pronta para conciliação' },
      MATCH_REALIZADO: { cor: 'text-violet-700 bg-violet-50 border-violet-200', rotulo: 'Conciliação realizada' },
      ENVIADA_GERR: { cor: 'text-emerald-700 bg-emerald-50 border-emerald-200', rotulo: 'Enviada ao GERR' },
    };
    const cfg = estilos[status] || estilos.AGUARDANDO_DOCUMENTOS;
    return <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wide border ${cfg.cor}`}>{cfg.rotulo}</span>;
  };

  const PROXIMO_STATUS = {
    PRONTA_PARA_MATCH: 'MATCH_REALIZADO',
    MATCH_REALIZADO: 'ENVIADA_GERR',
  };

  const handleAvancarStatus = async (despesa) => {
    const proximo = PROXIMO_STATUS[despesa.status];
    if (!proximo) return;
    if (!window.confirm('Avançar esta prestação para "' + proximo.replace(/_/g, ' ') + '"?')) return;
    try {
      const response = await api.patch(`/despesas/${despesa.id}/status`, { novoStatus: proximo });
      setDespesasInstrutor(despesasInstrutor.map(d => d.id === despesa.id ? { ...d, status: response.data.status } : d));
    } catch (error) {
      alert(obterMensagemErro(error, 'Erro ao avançar o status.'));
    }
  };

  const instrutoresFiltrados = instrutores;

  return (
    <div className="flex flex-col max-w-6xl w-full mx-auto p-6 lg:p-10">
      {/* SE UM INSTRUTOR ESTIVER SELECIONADO -> MOSTRA A PASTA DELE */}
      {instrutorSelecionado ? (
        <div className="animate-in fade-in slide-in-from-right-2 duration-200">
          <button
            onClick={() => setInstrutorSelecionado(null)}
            className="flex items-center gap-2 text-sm text-stone-500 hover:text-brand-700 font-medium mb-5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para a lista de equipe
          </button>
          <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-cream-200 flex items-center gap-4 bg-cream-50">
              <div className="w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm text-white bg-brand-700">
                {instrutorSelecionado.nome.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={heading} className="text-base text-stone-900">{instrutorSelecionado.nome}</h2>
                <p className="text-stone-500 text-xs">Depto de {instrutorSelecionado.categoria === 'ESPORTE' ? 'Esporte' : 'Cultura'}</p>
                {instrutorSelecionado.observacoes ? (
                  <p className="text-stone-600 text-xs mt-1 max-w-md leading-relaxed">
                    <span className="font-medium text-stone-500">Observações: </span>{instrutorSelecionado.observacoes}
                  </p>
                ) : (
                  <p className="text-stone-400 text-xs mt-1 italic">Sem observações cadastradas.</p>
                )}
              </div>
            </div>
            <div className="p-5">
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText className="text-stone-400 w-3.5 h-3.5" /> Histórico de Prestações de Contas
              </h3>
              {carregandoDespesas ? (
                <div className="text-center py-10 text-sm text-stone-500">Buscando envios...</div>
              ) : despesasInstrutor.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-cream-200 rounded-2xl bg-cream-50 text-sm text-stone-500">
                  Este instrutor ainda não enviou nenhuma prestação de contas.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[560px]">
                    <thead>
                      <tr className="bg-cream-50 text-stone-500 text-[11px] uppercase tracking-wider border-b border-cream-200">
                        <th className="px-4 py-2 font-medium">Mês de Competência</th>
                        <th className="px-4 py-2 font-medium">Valor (R$)</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                        <th className="px-4 py-2 font-medium text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {despesasInstrutor.map((despesa) => (
                        <tr key={despesa.id} className="border-b border-cream-100 hover:bg-cream-50/80 transition-colors">
                          <td className="px-4 py-2.5 text-sm font-medium text-stone-900">{despesa.dataCompetencia}</td>
                          <td className="px-4 py-2.5 text-sm text-stone-600">
                            R$ {despesa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2.5">{renderStatus(despesa.status)}</td>
                          <td className="px-4 py-2.5 text-right space-x-2">
                            {PROXIMO_STATUS[despesa.status] && (
                              <button
                                onClick={() => handleAvancarStatus(despesa)}
                                className="text-brand-700 hover:text-brand-800 text-xs font-medium inline-flex items-center gap-1"
                                title="Avançar para a próxima etapa"
                              >
                                {despesa.status === 'MATCH_REALIZADO' ? <Send className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                                Avançar
                              </button>
                            )}
                            <button
                              onClick={() => handleVerArquivos(despesa.id)}
                              className="text-stone-600 hover:text-stone-800 text-xs font-medium"
                            >
                              Ver Arquivos
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* CASO CONTRÁRIO -> MOSTRA A LISTA GERAL */
        <div className="animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-5">
            <h2 style={heading} className="text-xl text-stone-900 flex items-center gap-2">
              <Users className="text-brand-700 w-6 h-6" /> Equipe de Instrutores
            </h2>
            <button
              onClick={() => setShowModal(true)}
              className="bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
            >
              <UserPlus className="w-4 h-4" /> Novo Instrutor
            </button>
          </div>
          <p className="mb-5 text-sm text-stone-600 flex items-center gap-2">
            {getSetorAtivo() === 'ESPORTE' ? <Activity className="w-4 h-4 text-emerald-600" /> : <Music className="w-4 h-4 text-amber-500" />}
            Departamento de {getSetorAtivo() === 'ESPORTE' ? 'Esporte' : 'Cultura'} — filtrando equipe pelo seletor no topo.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {instrutoresFiltrados.length === 0 ? (
              <div className="col-span-full py-12 text-center text-sm text-stone-500 border border-dashed border-cream-200 rounded-2xl">
                Nenhum instrutor cadastrado neste departamento.
              </div>
            ) : (
              instrutoresFiltrados.map((instrutor) => (
                <div key={instrutor.id} onClick={() => abrirPastaInstrutor(instrutor)} className="bg-white border border-cream-200 rounded-2xl p-4 hover:border-brand-300 hover:shadow-md transition-all cursor-pointer group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs text-white bg-brand-700">
                      {instrutor.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-stone-900 text-sm truncate group-hover:text-brand-700 transition-colors">{instrutor.nome}</h3>
                      <p className="text-xs text-stone-500 truncate">Clique para abrir a pasta</p>
                    </div>
                  </div>
                  <div className="pt-2.5 border-t border-cream-100 flex justify-between items-center text-xs">
                    <span className="text-stone-500 font-medium">Acessar histórico</span>
                    <ArrowLeft className="w-3.5 h-3.5 text-brand-500 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO CORRIGIDO */}
      {showModal && (
        <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-cream-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-cream-200 flex justify-between items-center bg-cream-50">
              <h3 style={heading} className="font-semibold text-stone-800 text-sm">Cadastrar Instrutor</h3>
              <button onClick={() => setShowModal(false)} className="text-stone-400 hover:text-stone-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCadastrar} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">Nome Completo</label>
                <input
                  required
                  type="text"
                  className="w-full px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                  value={dadosInstrutor.nome}
                  onChange={e => setDadosInstrutor({...dadosInstrutor, nome: e.target.value})}
                />
              </div>

              <div className="col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase">
                      Observações e Dados Bancários (Criptografado)
                  </label>
                  <textarea
                      rows="3"
                      placeholder="Ex: Chave PIX, Banco, Agência, Conta, CPF..."
                      className="w-full px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 resize-none bg-cream-50"
                      value={dadosInstrutor.observacoes}
                      onChange={e => setDadosInstrutor({...dadosInstrutor, observacoes: e.target.value})}
                  />
                  <p className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                        Estes dados são salvos de forma segura.
                  </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">Login</label>
                  <input
                    required
                    type="text"
                    className="w-full px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                    value={dadosInstrutor.login}
                    onChange={e => setDadosInstrutor({...dadosInstrutor, login: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">Senha Provisória</label>
                  <input
                    required
                    type="password"
                    placeholder="Ex: 123456"
                    className="w-full px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                    value={dadosInstrutor.senha}
                    onChange={e => setDadosInstrutor({...dadosInstrutor, senha: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">Departamento</label>
                <select
                  className="w-full px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 bg-white"
                  value={dadosInstrutor.categoria}
                  onChange={e => setDadosInstrutor({...dadosInstrutor, categoria: e.target.value})}
                >
                  <option value="ESPORTE">Esporte</option>
                  <option value="CULTURA">Cultura</option>
                </select>
              </div>

              <button type="submit" className="w-full bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors mt-2">
                Salvar Instrutor
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO DE ARQUIVOS */}
      {modalArquivosAberto && (
        <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-cream-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-cream-200 flex justify-between items-center bg-cream-50">
              <h3 style={heading} className="font-semibold text-stone-800 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-700" /> Documentos da Prestação
              </h3>
              <button onClick={() => setModalArquivosAberto(false)} className="text-stone-400 hover:text-stone-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {carregandoAnexos ? (
                <div className="text-center py-8 text-sm text-stone-500">Buscando documentos...</div>
              ) : arquivosDaDespesa.length === 0 ? (
                <div className="text-center py-8 text-sm text-amber-600 bg-amber-50 rounded-xl border border-amber-200">
                  Nenhum arquivo encontrado para esta prestação.
                </div>
              ) : (
                <ul className="space-y-3">
                  {arquivosDaDespesa.map(anexo => (
                    <li key={anexo.id} className="flex justify-between items-center p-3 bg-cream-50 border border-cream-200 rounded-xl hover:border-brand-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText className={`w-5 h-5 ${anexo.tipo === 'NOTA_FISCAL' ? 'text-brand-700' : 'text-stone-400'}`} />
                        <div>
                          <p className="text-xs font-bold text-stone-700">
                            {anexo.tipo === 'NOTA_FISCAL' ? 'Nota Fiscal Principal' : 'Relatório Extra'}
                          </p>
                          <p className="text-[11px] text-stone-500 truncate max-w-[200px]">{anexo.nomeOriginal}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => abrirPdfEmNovaAba(anexo.caminhoReal)}
                        className="bg-brand-100 text-brand-700 hover:bg-brand-700 hover:text-white px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
                      >
                        Visualizar
                      </button>
                      <button
                        onClick={() => handleExcluirAnexo(anexo)}
                        className="text-stone-400 hover:text-red-600 transition-colors p-1.5"
                        title={`Excluir ${anexo.tipo === 'NOTA_FISCAL' ? 'nota fiscal' : 'arquivo'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}