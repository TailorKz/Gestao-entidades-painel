import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Users, AlertCircle, CheckCircle2, Clock3, TrendingUp, CalendarDays, ArrowRight } from 'lucide-react';

const heading = { fontFamily: "'Poppins', sans-serif" };

export default function DashboardGestor() {
    const userName = localStorage.getItem('usuarioNome') || 'Gestor';
    
    const [parcelas, setParcelas] = useState([]);
    const [parcelaSelecionada, setParcelaSelecionada] = useState(null);
    const [resumo, setResumo] = useState(null);
    const [loading, setLoading] = useState(true);

    // 1. Carrega as parcelas primeiro
    useEffect(() => {
        const fetchParcelas = async () => {
            try {
                const res = await api.get('/parcelas');
                if (res.data.length > 0) {
                    setParcelas(res.data);
                    setParcelaSelecionada(res.data[0]);
                } else {
                    setLoading(false);
                }
            } catch (error) {
                console.error("Erro ao buscar parcelas:", error);
                setLoading(false);
            }
        };
        fetchParcelas();
    }, []);

    // 2. Quando a parcela muda, busca o resumo dela
    useEffect(() => {
        if (parcelaSelecionada) {
            carregarResumo(parcelaSelecionada.id);
        }
    }, [parcelaSelecionada]);

    const carregarResumo = async (parcelaId) => {
        setLoading(true);
        try {
            const res = await api.get(`/dashboard/resumo/${parcelaId}`);
            setResumo(res.data);
        } catch (error) {
            console.error("Erro ao carregar resumo do dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <main className="flex-1 max-w-6xl w-full mx-auto p-8 space-y-8">
                
                {/* SAUDAÇÃO E SELETOR DE PERÍODO */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 style={heading} className="text-2xl font-semibold text-slate-900">
                            Olá, {userName}!
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Aqui está o resumo das atividades e pendências da equipe.
                        </p>
                    </div>
                    
                    <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                        <CalendarDays className="w-5 h-5 text-sky-600" />
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Analisando Período:</p>
                            <select 
                                className="bg-transparent text-slate-800 text-sm font-semibold outline-none cursor-pointer"
                                value={parcelaSelecionada?.id || ''}
                                onChange={(e) => {
                                    const p = parcelas.find(x => x.id === e.target.value);
                                    setParcelaSelecionada(p);
                                }}
                            >
                                {parcelas.map(p => (
                                    <option key={p.id} value={p.id}>
                                        Parcela 0{p.numero} {p.mesesReferencia ? `(${p.mesesReferencia})` : ''}
                                    </option>
                                ))}
                                {parcelas.length === 0 && <option>Nenhuma parcela cadastrada</option>}
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20 text-slate-400"><Clock3 className="w-8 h-8 animate-pulse" /></div>
                ) : (
                    <>
                        {/* CARDS DINÂMICOS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Equipe Ativa</h3>
                                    <div className="p-2 bg-sky-50 rounded-lg"><Users className="w-4 h-4 text-sky-600" /></div>
                                </div>
                                <p style={heading} className="text-3xl font-semibold text-slate-900">{resumo?.totalInstrutores || 0}</p>
                                <p className="text-xs text-slate-500 mt-2">Instrutores cadastrados</p>
                            </div>

                            <div className={`p-5 rounded-xl border shadow-sm flex flex-col transition-colors ${resumo?.instrutoresPendentes > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className={`text-xs font-bold uppercase tracking-wider ${resumo?.instrutoresPendentes > 0 ? 'text-amber-700' : 'text-slate-500'}`}>Aguardando Envio</h3>
                                    <div className="p-2 bg-amber-100 rounded-lg"><Clock3 className="w-4 h-4 text-amber-600" /></div>
                                </div>
                                <p style={heading} className={`text-3xl font-semibold ${resumo?.instrutoresPendentes > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{resumo?.instrutoresPendentes || 0}</p>
                                <p className="text-xs text-slate-500 mt-2">Faltam prestar contas</p>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Notas Recebidas</h3>
                                    <div className="p-2 bg-emerald-50 rounded-lg"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></div>
                                </div>
                                <p style={heading} className="text-3xl font-semibold text-slate-900">{resumo?.prestacoesRecebidas || 0}</p>
                                <p className="text-xs text-slate-500 mt-2">Prestações validadas</p>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold text-sky-600 uppercase tracking-wider">Saúde da Parcela</h3>
                                    <div className="p-2 bg-sky-50 rounded-lg"><TrendingUp className="w-4 h-4 text-sky-600" /></div>
                                </div>
                                <p style={heading} className="text-3xl font-semibold text-slate-900">{resumo?.saudeParcela || 0}%</p>
                                <p className="text-xs text-slate-500 mt-2">Do orçamento comprometido</p>
                            </div>
                        </div>

                        {/* LISTA DE PENDENTES */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className={`px-6 py-4 border-b border-slate-200 flex items-center gap-2 ${resumo?.instrutoresPendentes > 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                                {resumo?.instrutoresPendentes > 0 ? (
                                    <AlertCircle className="w-5 h-5 text-amber-600" />
                                ) : (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                )}
                                <h3 style={heading} className="text-sm font-semibold text-slate-900">
                                    {resumo?.instrutoresPendentes > 0 ? 'Atenção Requerida: Instrutores Pendentes' : 'Tudo em Dia! Nenhuma pendência.'}
                                </h3>
                            </div>
                            
                            <div className="p-0">
                                {resumo?.instrutoresPendentes === 0 ? (
                                    <div className="text-center py-10 bg-white">
                                        <p className="text-sm text-slate-500 font-medium">Todos os instrutores já enviaram suas prestações de contas para esta parcela. 🎉</p>
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-slate-100">
                                        {resumo?.listaPendentes.map((instrutor) => (
                                            <li key={instrutor.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm">
                                                        {instrutor.nome.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">{instrutor.nome}</p>
                                                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mt-0.5">
                                                            Categoria: {instrutor.categoria || 'Não definida'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button 
                                                    className="text-xs font-medium text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5"
                                                    onClick={() => alert(`Lembrete enviado para ${instrutor.nome}!`)}
                                                >
                                                    Cobrar Envio <ArrowRight className="w-3 h-3" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}