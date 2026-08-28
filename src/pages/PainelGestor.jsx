import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Users, UserPlus, X, ShieldCheck, Activity, Music, ArrowLeft, FileText, CheckCircle2, Clock3 } from 'lucide-react';

const heading = { fontFamily: "'Poppins', sans-serif" };

// TODO: Substituir pelo ID dinâmico quando a tela de Login estiver pronta
export default function PainelGestor() {
  const TENANT_ID = "123e4567-e89b-12d3-a456-426614174000";

  // Estados da Lista Principal
  const [instrutores, setInstrutores] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState('ESPORTE');
  const [showModal, setShowModal] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState({
    nome: '', email: '', login: '', senha: '', categoria: 'ESPORTE'
  });

  // Estados da Visão Detalhada (Pasta do Instrutor)
  const [instrutorSelecionado, setInstrutorSelecionado] = useState(null);
  const [despesasInstrutor, setDespesasInstrutor] = useState([]);
  const [carregandoDespesas, setCarregandoDespesas] = useState(false);

  const [modalArquivosAberto, setModalArquivosAberto] = useState(false);
  const [arquivosDaDespesa, setArquivosDaDespesa] = useState([]);
  const [carregandoAnexos, setCarregandoAnexos] = useState(false);

  useEffect(() => {
    carregarInstrutores();
  }, []);

  const carregarInstrutores = async () => {
    try {
      const response = await api.get(`/usuarios/instrutores/${TENANT_ID}`);
      setInstrutores(response.data);
    } catch (error) {
      console.error("Erro ao carregar instrutores", error);
    }
  };

  const handleCadastrar = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        tenantId: TENANT_ID,
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        login: novoUsuario.login,
        senha: novoUsuario.senha,
        role: 'INSTRUTOR',
        categoria: novoUsuario.categoria
      };
      await api.post('/usuarios', payload);
      alert("Instrutor cadastrado com sucesso!");
      setShowModal(false);
      setNovoUsuario({ nome: '', email: '', login: '', senha: '', categoria: 'ESPORTE' });
      carregarInstrutores();
    } catch (error) {
      alert("Erro ao cadastrar: " + (error.response?.data || "Verifique os dados."));
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

  const abrirPdfEmNovaAba = (caminhoCompleto) => {
    // Pega só o nome do arquivo, removendo a pasta "uploads/" se vier junto do banco
    const nomeArquivo = caminhoCompleto.replace('uploads\\', '').replace('uploads/', '');
    window.open(`http://localhost:8080/arquivos/${nomeArquivo}`, '_blank');
  };

  // Função para mapear o status visualmente
  const renderStatus = (status) => {
    if (status === 'PRONTA_PARA_MATCH' || status === 'MATCH_REALIZADO') {
      return <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wide"><CheckCircle2 className="w-3 h-3"/> Enviado</span>;
    }
    return <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wide"><Clock3 className="w-3 h-3"/> Pendente</span>;
  };

  const instrutoresFiltrados = instrutores.filter(i => i.categoria === abaAtiva);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      

      <main className="flex-1 max-w-6xl w-full mx-auto p-8">

        {/* SE UM INSTRUTOR ESTIVER SELECIONADO -> MOSTRA A PASTA DELE */}
        {instrutorSelecionado ? (
          <div className="animate-in fade-in slide-in-from-right-2 duration-200">
            <button
              onClick={() => setInstrutorSelecionado(null)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-sky-700 font-medium mb-5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar para a lista de equipe
            </button>

            <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex items-center gap-4 bg-slate-50">
                <div className="w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm text-white bg-sky-600">
                  {instrutorSelecionado.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={heading} className="text-base font-semibold text-slate-900">{instrutorSelecionado.nome}</h2>
                  <p className="text-slate-500 text-xs">{instrutorSelecionado.email} &middot; Depto de {instrutorSelecionado.categoria === 'ESPORTE' ? 'Esporte' : 'Cultura'}</p>
                </div>
              </div>

              <div className="p-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText className="text-slate-400 w-3.5 h-3.5" /> Histórico de Prestações de Contas
                </h3>

                {carregandoDespesas ? (
                  <div className="text-center py-10 text-sm text-slate-500">Buscando envios...</div>
                ) : despesasInstrutor.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-300 rounded-md bg-slate-50 text-sm text-slate-500">
                    Este instrutor ainda não enviou nenhuma prestação de contas.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
                          <th className="px-4 py-2 font-medium">Mês de Competência</th>
                          <th className="px-4 py-2 font-medium">Valor (R$)</th>
                          <th className="px-4 py-2 font-medium">Status</th>
                          <th className="px-4 py-2 font-medium text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {despesasInstrutor.map((despesa) => (
                          <tr key={despesa.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-2.5 text-sm font-medium text-slate-900">{despesa.dataCompetencia}</td>
                            <td className="px-4 py-2.5 text-sm text-slate-600">
                              R$ {despesa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2.5">{renderStatus(despesa.status)}</td>
                            <td className="px-4 py-2.5 text-right">
                              <button 
  onClick={() => handleVerArquivos(despesa.id)}
  className="text-sky-700 hover:text-sky-800 text-xs font-medium"
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
              <h2 style={heading} className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Users className="text-sky-600 w-5 h-5" /> Equipe de Instrutores
              </h2>
              <button
                onClick={() => setShowModal(true)}
                className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" /> Novo Instrutor
              </button>
            </div>

            <div className="flex gap-6 mb-5 border-b border-slate-200">
              <button onClick={() => setAbaAtiva('ESPORTE')} className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${abaAtiva === 'ESPORTE' ? 'text-slate-900 border-sky-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>
                <Activity className="w-4 h-4" /> Departamento de Esporte
              </button>
              <button onClick={() => setAbaAtiva('CULTURA')} className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${abaAtiva === 'CULTURA' ? 'text-slate-900 border-sky-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>
                <Music className="w-4 h-4" /> Departamento de Cultura
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {instrutoresFiltrados.length === 0 ? (
                <div className="col-span-full py-12 text-center text-sm text-slate-500 border border-dashed border-slate-300 rounded-md">
                  Nenhum instrutor cadastrado neste departamento.
                </div>
              ) : (
                instrutoresFiltrados.map((instrutor) => (
                  <div key={instrutor.id} onClick={() => abrirPastaInstrutor(instrutor)} className="bg-white border border-slate-200 rounded-md p-4 hover:border-sky-300 hover:shadow-sm transition-all cursor-pointer group">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs text-white bg-slate-900">
                        {instrutor.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-slate-900 text-sm truncate group-hover:text-sky-700 transition-colors">{instrutor.nome}</h3>
                        <p className="text-xs text-slate-500 truncate">{instrutor.email}</p>
                      </div>
                    </div>
                    <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Acessar pasta</span>
                      <ArrowLeft className="w-3.5 h-3.5 text-sky-500 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE CADASTRO MANTIDO IGUAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-md border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-900">
              <h3 style={heading} className="font-semibold text-white text-sm">Cadastrar Instrutor</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCadastrar} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Nome Completo</label>
                <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-600" value={novoUsuario.nome} onChange={e => setNovoUsuario({...novoUsuario, nome: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">E-mail Profissional</label>
                <input required type="email" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-600" value={novoUsuario.email} onChange={e => setNovoUsuario({...novoUsuario, email: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Login</label>
                  <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-600" value={novoUsuario.login} onChange={e => setNovoUsuario({...novoUsuario, login: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Senha</label>
                  <input required type="password" placeholder="Ex: 123456" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-600" value={novoUsuario.senha} onChange={e => setNovoUsuario({...novoUsuario, senha: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Departamento</label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-600 bg-white" value={novoUsuario.categoria} onChange={e => setNovoUsuario({...novoUsuario, categoria: e.target.value})}>
                  <option value="ESPORTE">Esporte</option>
                  <option value="CULTURA">Cultura</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium py-2.5 rounded-md transition-colors mt-2">Salvar Instrutor</button>
            </form>
          </div>
        </div>
      )}
      {/* MODAL DE VISUALIZAÇÃO DE ARQUIVOS */}
      {modalArquivosAberto && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-md border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-900">
              <h3 style={heading} className="font-semibold text-white text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" /> Documentos da Prestação
              </h3>
              <button onClick={() => setModalArquivosAberto(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {carregandoAnexos ? (
                <div className="text-center py-8 text-sm text-slate-500">Buscando documentos...</div>
              ) : arquivosDaDespesa.length === 0 ? (
                <div className="text-center py-8 text-sm text-amber-600 bg-amber-50 rounded border border-amber-200">
                  Nenhum arquivo encontrado para esta prestação.
                </div>
              ) : (
                <ul className="space-y-3">
                  {arquivosDaDespesa.map(anexo => (
                    <li key={anexo.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded hover:border-sky-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText className={`w-5 h-5 ${anexo.tipo === 'NOTA_FISCAL' ? 'text-sky-600' : 'text-slate-400'}`} />
                        <div>
                          <p className="text-xs font-bold text-slate-700">
                            {anexo.tipo === 'NOTA_FISCAL' ? 'Nota Fiscal Principal' : 'Relatório Extra'}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{anexo.nomeOriginal}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => abrirPdfEmNovaAba(anexo.caminhoReal)}
                        className="bg-sky-100 text-sky-700 hover:bg-sky-600 hover:text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                      >
                        Visualizar
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