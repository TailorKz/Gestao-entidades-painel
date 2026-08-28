import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Users, UserPlus, X, ShieldCheck, Activity, Music, ArrowLeft, FileText, CheckCircle, Clock } from 'lucide-react';

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

  // Função para mapear o status visualmente
  const renderStatus = (status) => {
    if (status === 'PRONTA_PARA_MATCH' || status === 'MATCH_REALIZADO') {
      return <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md text-xs font-bold"><CheckCircle className="w-3 h-3"/> Enviado</span>;
    }
    return <span className="flex items-center gap-1 text-amber-700 bg-amber-100 px-2 py-1 rounded-md text-xs font-bold"><Clock className="w-3 h-3"/> Pendente</span>;
  };

  const instrutoresFiltrados = instrutores.filter(i => i.categoria === abaAtiva);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white shadow-sm border-b border-slate-200 px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Painel do Gestor</h1>
          <p className="text-sm text-slate-500 font-medium">Gestão de Equipe e Prestações</p>
        </div>
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-blue-600 w-5 h-5" />
          <span className="text-sm font-medium text-slate-700">Acesso Administrador</span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-8 mt-4">
        
        {/* SE UM INSTRUTOR ESTIVER SELECIONADO -> MOSTRA A PASTA DELE */}
        {instrutorSelecionado ? (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <button 
              onClick={() => setInstrutorSelecionado(null)} 
              className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-medium mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar para a lista de equipe
            </button>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl text-white ${instrutorSelecionado.categoria === 'ESPORTE' ? 'bg-blue-500' : 'bg-amber-500'}`}>
                  {instrutorSelecionado.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{instrutorSelecionado.nome}</h2>
                  <p className="text-slate-500 text-sm">{instrutorSelecionado.email} • Depto de {instrutorSelecionado.categoria}</p>
                </div>
              </div>

              <div className="p-6">
                <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <FileText className="text-blue-600 w-5 h-5" /> Histórico de Prestações de Contas
                </h3>
                
                {carregandoDespesas ? (
                  <div className="text-center py-8 text-slate-500">Buscando envios...</div>
                ) : despesasInstrutor.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500">
                    Este instrutor ainda não enviou nenhuma prestação de contas.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-sm border-b">
                          <th className="p-3 font-medium">Mês de Competência</th>
                          <th className="p-3 font-medium">Valor (R$)</th>
                          <th className="p-3 font-medium">Status</th>
                          <th className="p-3 font-medium text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {despesasInstrutor.map((despesa) => (
                          <tr key={despesa.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-medium text-slate-800">{despesa.dataCompetencia}</td>
                            <td className="p-3 text-slate-600">
                              R$ {despesa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3">{renderStatus(despesa.status)}</td>
                            <td className="p-3 text-right">
                              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Ver Arquivos</button>
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
          <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-blue-600" /> Equipe de Instrutores
              </h2>
              <button 
                onClick={() => setShowModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 shadow-sm"
              >
                <UserPlus className="w-4 h-4" /> Novo Instrutor
              </button>
            </div>

            <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2">
              <button onClick={() => setAbaAtiva('ESPORTE')} className={`flex items-center gap-2 pb-2 px-2 font-medium text-lg transition-colors ${abaAtiva === 'ESPORTE' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <Activity className="w-5 h-5" /> Departamento de Esporte
              </button>
              <button onClick={() => setAbaAtiva('CULTURA')} className={`flex items-center gap-2 pb-2 px-2 font-medium text-lg transition-colors ${abaAtiva === 'CULTURA' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <Music className="w-5 h-5" /> Departamento de Cultura
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {instrutoresFiltrados.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed rounded-xl">
                  Nenhum instrutor cadastrado neste departamento.
                </div>
              ) : (
                instrutoresFiltrados.map((instrutor) => (
                  <div key={instrutor.id} onClick={() => abrirPastaInstrutor(instrutor)} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition cursor-pointer group">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-sm ${abaAtiva === 'ESPORTE' ? 'bg-blue-500' : 'bg-amber-500'}`}>
                        {instrutor.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{instrutor.nome}</h3>
                        <p className="text-sm text-slate-500 truncate max-w-[150px]">{instrutor.email}</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Acessar Pasta</span>
                      <ArrowLeft className="w-4 h-4 text-blue-500 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
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
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Cadastrar Instrutor</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCadastrar} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label><input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={novoUsuario.nome} onChange={e => setNovoUsuario({...novoUsuario, nome: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">E-mail Profissional</label><input required type="email" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={novoUsuario.email} onChange={e => setNovoUsuario({...novoUsuario, email: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Login</label><input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={novoUsuario.login} onChange={e => setNovoUsuario({...novoUsuario, login: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Senha</label><input required type="password" placeholder="Ex: 123456" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={novoUsuario.senha} onChange={e => setNovoUsuario({...novoUsuario, senha: e.target.value})} /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Departamento</label>
                <select className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={novoUsuario.categoria} onChange={e => setNovoUsuario({...novoUsuario, categoria: e.target.value})}>
                  <option value="ESPORTE">Esporte</option>
                  <option value="CULTURA">Cultura</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors mt-2">Salvar Instrutor</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}