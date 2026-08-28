import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Calculator, Activity, Trash2, Check, Loader2, Plus, Edit2, X, CalendarDays } from 'lucide-react';

const heading = { fontFamily: "'Poppins', sans-serif" };

const TODOS_OS_MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function DashboardGestor() {
    const [parcelas, setParcelas] = useState([]);
    const [parcelaSelecionada, setParcelaSelecionada] = useState(null);
    const [abaAtiva, setAbaAtiva] = useState('ESTIMADA');
    
    const [despesas, setDespesas] = useState([]);
    const [estimativas, setEstimativas] = useState([]);
    
    const [novaLinha, setNovaLinha] = useState({ descricao: '', valor: '' });
    const [isSaving, setIsSaving] = useState(false);

    // Estados do Modal
    const [modalParcela, setModalParcela] = useState({ aberto: false, modo: 'NOVA' });
    const [dadosParcela, setDadosParcela] = useState({ numero: '', valorInicial: '' });
    const [mesesSelecionados, setMesesSelecionados] = useState([]);

    useEffect(() => { carregarParcelas(); }, []);
    useEffect(() => { if (parcelaSelecionada) carregarGastosDaParcela(parcelaSelecionada.id); }, [parcelaSelecionada]);

    const carregarParcelas = async () => {
        try {
            const res = await api.get('/parcelas');
            if (res.data.length > 0) {
                setParcelas(res.data);
                // Se já tinha uma selecionada, tenta manter ela, senão pega a primeira
                const manterSelecionada = parcelaSelecionada ? res.data.find(p => p.id === parcelaSelecionada.id) : res.data[0];
                setParcelaSelecionada(manterSelecionada || res.data[0]);
            }
        } catch (error) { console.error("Erro ao carregar parcelas:", error); }
    };

    const carregarGastosDaParcela = async (parcelaId) => {
        try {
            const [resDespesas, resEstimativas] = await Promise.all([
                api.get(`/despesas/parcela/${parcelaId}`),
                api.get(`/estimativas/parcela/${parcelaId}`)
            ]);
            setDespesas(resDespesas.data);
            setEstimativas(resEstimativas.data);
        } catch (error) { console.error("Erro ao carregar gastos:", error); }
    };

    const handleSalvarNovaLinha = async () => {
        if (!novaLinha.descricao.trim() || !novaLinha.valor.trim()) return;
        setIsSaving(true);
        const valorLimpo = novaLinha.valor.replace(/\./g, '').replace(',', '.');
        try {
            await api.post('/estimativas', {
                descricao: novaLinha.descricao,
                valor: parseFloat(valorLimpo),
                parcelaId: parcelaSelecionada.id
            });
            setNovaLinha({ descricao: '', valor: '' });
            await carregarGastosDaParcela(parcelaSelecionada.id);
        } catch (error) { alert("Erro ao salvar o gasto."); } 
        finally { setIsSaving(false); }
    };

    const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSalvarNovaLinha(); } };
    const handleDeletarEstimativa = async (id) => {
        if(!window.confirm("Deseja remover este registro?")) return;
        try { await api.delete(`/estimativas/${id}`); await carregarGastosDaParcela(parcelaSelecionada.id); } 
        catch (error) { alert("Erro ao excluir registro."); }
    };

    // --- FUNÇÕES DA PARCELA ---
    const toggleMes = (mes) => {
        if (mesesSelecionados.includes(mes)) setMesesSelecionados(mesesSelecionados.filter(m => m !== mes));
        else setMesesSelecionados([...mesesSelecionados, mes]);
    };

    const handleSalvarParcela = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const valorLimpo = dadosParcela.valorInicial.toString().replace(/\./g, '').replace(',', '.');
        const mesesString = mesesSelecionados.join(', '); // Ex: "Janeiro, Fevereiro"

        try {
            if (modalParcela.modo === 'NOVA') {
                await api.post('/parcelas', {
                    fomentoId: parcelaSelecionada?.fomentoId || '123e4567-e89b-12d3-a456-426614174000', // Prevenção se a lista estiver vazia
                    numero: parseInt(dadosParcela.numero),
                    valorInicial: parseFloat(valorLimpo),
                    mesesReferencia: mesesString
                });
            } else {
                await api.put(`/parcelas/${parcelaSelecionada.id}`, {
                    novoValorInicial: parseFloat(valorLimpo),
                    mesesReferencia: mesesString
                });
            }
            setModalParcela({ aberto: false, modo: 'NOVA' });
            await carregarParcelas();
        } catch (error) { alert("Erro ao salvar parcela."); } 
        finally { setIsSaving(false); }
    };

    const abrirModalNovaParcela = () => {
        const proximoNumero = parcelas.length > 0 ? Math.max(...parcelas.map(p => p.numero)) + 1 : 1;
        setDadosParcela({ numero: proximoNumero, valorInicial: '' });
        setMesesSelecionados([]);
        setModalParcela({ aberto: true, modo: 'NOVA' });
    };

    const abrirModalEditarParcela = () => {
        setDadosParcela({ 
            numero: parcelaSelecionada.numero, 
            valorInicial: parcelaSelecionada.valorInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) 
        });
        setMesesSelecionados(parcelaSelecionada.mesesReferencia ? parcelaSelecionada.mesesReferencia.split(', ') : []);
        setModalParcela({ aberto: true, modo: 'EDITAR' });
    };

    const totalEstimado = estimativas.reduce((acc, curr) => acc + curr.valor, 0);
    const saldoProjetado = parcelaSelecionada ? (parcelaSelecionada.valorInicial - totalEstimado) : 0;
    const formatarMoeda = (valor) => Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <main className="flex-1 max-w-5xl w-full mx-auto p-8 space-y-6">
                
                {/* 1. SELETOR DE PARCELA GIGANTE E DESTACADO */}
                <div className="bg-white border border-sky-200 shadow-sm p-5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex-1">
                        <h2 className="text-sm font-bold text-sky-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <CalendarDays className="w-4 h-4" /> Período de Prestação de Contas
                        </h2>
                        <div className="flex items-center gap-3">
                            <select 
                                className="bg-sky-50 border border-sky-300 text-sky-900 text-lg rounded-lg focus:ring-sky-600 focus:border-sky-600 block p-2.5 font-semibold outline-none cursor-pointer min-w-[200px]"
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
                            </select>
                            <button onClick={abrirModalEditarParcela} title="Editar Parcela" className="p-2.5 bg-white border border-slate-300 text-slate-500 hover:text-sky-600 hover:border-sky-300 rounded-lg shadow-sm transition-colors">
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={abrirModalNovaParcela} title="Nova Parcela" className="p-2.5 bg-sky-600 text-white border border-transparent hover:bg-sky-700 rounded-lg shadow-sm transition-colors">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* BLOCO DE RESUMO FINANCEIRO (Como na imagem) */}
                    {parcelaSelecionada && (
                        <div className="bg-slate-100 p-4 rounded-lg min-w-[300px] text-sm text-slate-700 border border-slate-200">
                            <div className="flex justify-between mb-1">
                                <span>Valor Inicial:</span>
                                <span className="font-medium">R$ {formatarMoeda(parcelaSelecionada.valorInicial)}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span>Total Gasto:</span>
                                <span className="font-medium text-amber-700">R$ {formatarMoeda(abaAtiva === 'REAL' ? (parcelaSelecionada.valorInicial - parcelaSelecionada.saldoAtual) : totalEstimado)}</span>
                            </div>
                            <div className="h-px bg-slate-300 my-2 w-full" />
                            <div className="flex justify-between text-base">
                                <span className="font-bold text-slate-900">Saldo Disponível:</span>
                                <span className={`font-bold ${saldoProjetado < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                    R$ {formatarMoeda(abaAtiva === 'REAL' ? parcelaSelecionada.saldoAtual : saldoProjetado)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. ABAS EM DESTAQUE */}
                <div className="flex bg-slate-200/70 p-1.5 rounded-lg w-fit shadow-inner">
                    <button onClick={() => setAbaAtiva('ESTIMADA')} className={`flex items-center gap-2 px-6 py-2.5 rounded-md font-semibold text-sm transition-all ${abaAtiva === 'ESTIMADA' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                        <Calculator className="w-4 h-4" /> Projeção de Gastos
                    </button>
                    <button onClick={() => setAbaAtiva('REAL')} className={`flex items-center gap-2 px-6 py-2.5 rounded-md font-semibold text-sm transition-all ${abaAtiva === 'REAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                        <Activity className="w-4 h-4" /> Prestação em Tempo Real
                    </button>
                </div>

                {/* 3. ÁREA DA TABELA */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    
                    {/* TABELA: PROJEÇÃO ESTIMADA */}
                    {abaAtiva === 'ESTIMADA' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-slate-200 text-slate-800 text-sm">
                                        <th className="px-6 py-4 font-bold">Descrição</th>
                                        <th className="px-6 py-4 font-bold w-48">Valor (R$)</th>
                                        <th className="px-6 py-4 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {estimativas.map((est, index) => (
                                        <tr key={est.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-b border-slate-100 group`}>
                                            <td className="px-6 py-3.5 text-sm text-slate-700">{est.descricao}</td>
                                            <td className="px-6 py-3.5 text-sm font-medium text-slate-900">{formatarMoeda(est.valor)}</td>
                                            <td className="px-6 py-3.5 text-right">
                                                <button onClick={() => handleDeletarEstimativa(est.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1.5 rounded-md opacity-0 group-hover:opacity-100" title="Excluir">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Linha Contínua */}
                                    <tr className="bg-sky-50/40 border-b border-slate-200">
                                        <td className="px-4 py-3">
                                            <input 
                                                type="text" placeholder="Descreva o novo gasto..."
                                                className="w-full bg-white border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-md shadow-sm text-sm px-3 py-2 outline-none placeholder:text-slate-400"
                                                value={novaLinha.descricao} onChange={e => setNovaLinha({...novaLinha, descricao: e.target.value})} onKeyDown={handleKeyDown} disabled={isSaving}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input 
                                                type="text" placeholder="0,00"
                                                className="w-full bg-white border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-md shadow-sm text-sm font-medium px-3 py-2 outline-none placeholder:text-slate-400"
                                                value={novaLinha.valor} onChange={e => setNovaLinha({...novaLinha, valor: e.target.value})} onKeyDown={handleKeyDown} disabled={isSaving}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={handleSalvarNovaLinha} disabled={!novaLinha.descricao || !novaLinha.valor || isSaving} className="bg-sky-600 text-white p-2 rounded-md hover:bg-sky-700 disabled:opacity-40 transition-colors">
                                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TABELA: TEMPO REAL */}
                    {abaAtiva === 'REAL' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-slate-200 text-slate-800 text-sm">
                                        <th className="px-6 py-4 font-bold">Instrutor</th>
                                        <th className="px-6 py-4 font-bold">Competência</th>
                                        <th className="px-6 py-4 font-bold">Valor Oficial</th>
                                        <th className="px-6 py-4 font-bold">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {despesas.length === 0 ? (
                                        <tr><td colSpan="4" className="px-6 py-12 text-center text-sm text-slate-500">Nenhuma prestação oficial recebida para esta parcela.</td></tr>
                                    ) : (
                                        despesas.map((despesa, index) => (
                                            <tr key={despesa.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-b border-slate-100`}>
                                                <td className="px-6 py-4 text-sm font-medium text-slate-700">{despesa.nomeInstrutor}</td>
                                                <td className="px-6 py-4 text-sm text-slate-500">{despesa.dataCompetencia}</td>
                                                <td className="px-6 py-4 text-sm font-semibold text-slate-900">R$ {formatarMoeda(despesa.valor)}</td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide">
                                                        {despesa.status.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* MODAL DE PARCELA COM SELEÇÃO DE MESES */}
            {modalParcela.aberto && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-md border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-900">
                            <h3 style={heading} className="font-semibold text-white text-sm">
                                {modalParcela.modo === 'NOVA' ? 'Criar Nova Parcela' : 'Editar Parcela Existente'}
                            </h3>
                            <button onClick={() => setModalParcela({ aberto: false, modo: 'NOVA' })} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSalvarParcela} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Nº da Parcela</label>
                                    <input 
                                        required type="number" disabled={modalParcela.modo === 'EDITAR'}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500/40 bg-slate-50 disabled:text-slate-500" 
                                        value={dadosParcela.numero} onChange={e => setDadosParcela({...dadosParcela, numero: e.target.value})} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Valor Total (R$)</label>
                                    <input 
                                        required type="text" placeholder="Ex: 85000,00"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 font-medium" 
                                        value={dadosParcela.valorInicial} onChange={e => setDadosParcela({...dadosParcela, valorInicial: e.target.value})} 
                                    />
                                </div>
                            </div>

                            {/* SELEÇÃO DOS MESES */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2.5 uppercase border-b border-slate-200 pb-2">Meses de Competência (Opcional)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {TODOS_OS_MESES.map(mes => (
                                        <label key={mes} className={`flex items-center justify-center gap-2 px-2 py-1.5 border rounded-md text-xs cursor-pointer select-none transition-colors ${mesesSelecionados.includes(mes) ? 'bg-sky-100 border-sky-400 text-sky-800 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                            <input 
                                                type="checkbox" className="hidden"
                                                checked={mesesSelecionados.includes(mes)}
                                                onChange={() => toggleMes(mes)}
                                            />
                                            {mes}
                                        </label>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 text-center">Isso ajudará a filtrar as pastas de prestação depois.</p>
                            </div>
                            
                            <button type="submit" disabled={isSaving} className="w-full bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium py-3 rounded-md transition-colors mt-2 flex justify-center items-center gap-2 disabled:opacity-70">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Dados da Parcela'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}