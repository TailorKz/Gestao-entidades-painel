import { useState, useEffect, Fragment } from 'react';
import { api, obterMensagemErro } from '../services/api';
import { categoriaQueryParam, getSetorAtivo } from '../services/setor';
import { Calculator, Activity, Trash2, Check, Loader2, Plus, Edit2, X, CalendarDays, FileDown } from 'lucide-react';
import EditarDespesaInline from '../components/EditarDespesaInline';
import { exportarPdfProjecao, exportarPdfPrestacoes } from '../services/exportarPdf';

const heading = { fontFamily: "'Varela Round', sans-serif" };

const TODOS_OS_MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function PrestacaoGestor() {
    const [parcelas, setParcelas] = useState([]);
    const [parcelaSelecionada, setParcelaSelecionada] = useState(null);
    const [abaAtiva, setAbaAtiva] = useState('ESTIMADA');

    const [despesas, setDespesas] = useState([]);
    const [estimativas, setEstimativas] = useState([]);

    const [novaLinha, setNovaLinha] = useState({ descricao: '', valor: '' });
    const [isSaving, setIsSaving] = useState(false);

    const [estimativaEmEdicao, setEstimativaEmEdicao] = useState(null);
    const [dadosEstEdicao, setDadosEstEdicao] = useState({ descricao: '', valor: '' });
    const [despesaEmEdicao, setDespesaEmEdicao] = useState(null);

    // Estados do Modal
    const [modalParcela, setModalParcela] = useState({ aberto: false, modo: 'NOVA' });
    const [dadosParcela, setDadosParcela] = useState({ numero: '', valorInicial: '', categoria: getSetorAtivo() });
    const [mesesSelecionados, setMesesSelecionados] = useState([]);

    const carregarParcelas = async () => {
        try {
            const res = await api.get('/parcelas', { params: categoriaQueryParam() });
            if (res.data.length > 0) {
                setParcelas(res.data);
                // Se já tinha uma selecionada, tenta manter ela, senão pega a primeira
                const manterSelecionada = parcelaSelecionada ? res.data.find(p => p.id === parcelaSelecionada.id) : res.data[0];
                setParcelaSelecionada(manterSelecionada || res.data[0]);
            } else {
                setParcelas([]);
                setParcelaSelecionada(null);
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

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        carregarParcelas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const aoMudarSetor = () => carregarParcelas();
        window.addEventListener('setor-changed', aoMudarSetor);
        return () => window.removeEventListener('setor-changed', aoMudarSetor);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (parcelaSelecionada) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            carregarGastosDaParcela(parcelaSelecionada.id);
        }
    }, [parcelaSelecionada]);

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
        } catch (error) { alert(obterMensagemErro(error, "Erro ao salvar o gasto.")); }
        finally { setIsSaving(false); }
    };

    const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSalvarNovaLinha(); } };
    const handleDeletarEstimativa = async (id) => {
        if(!window.confirm("Deseja remover este registro?")) return;
        try { await api.delete(`/estimativas/${id}`); await carregarGastosDaParcela(parcelaSelecionada.id); }
        catch (error) { alert(obterMensagemErro(error, "Erro ao excluir registro.")); }
    };

    const iniciarEdicaoEstimativa = (est) => {
        setEstimativaEmEdicao(est);
        setDadosEstEdicao({ descricao: est.descricao, valor: Number(est.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) });
    };

    const handleSalvarEdicaoEstimativa = async () => {
        if (!dadosEstEdicao.descricao.trim() || !dadosEstEdicao.valor.trim()) return;
        const valorNum = parseFloat(dadosEstEdicao.valor.replace(/\./g, '').replace(',', '.'));
        if (isNaN(valorNum) || valorNum <= 0) return alert("Valor inválido.");
        setIsSaving(true);
        try {
            await api.put(`/estimativas/${estimativaEmEdicao.id}`, { descricao: dadosEstEdicao.descricao.trim(), valor: valorNum });
            setEstimativaEmEdicao(null);
            await carregarGastosDaParcela(parcelaSelecionada.id);
        } catch (error) { alert(obterMensagemErro(error, "Erro ao salvar o gasto.")); }
        finally { setIsSaving(false); }
    };

    const handleExcluirDespesa = async (despesa) => {
        if (!window.confirm("Excluir esta despesa? O valor será devolvido ao saldo da parcela.")) return;
        try {
            await api.delete(`/despesas/${despesa.id}`);
            await carregarGastosDaParcela(parcelaSelecionada.id);
        } catch (error) { alert(obterMensagemErro(error, "Erro ao excluir a despesa.")); }
    };

    const renderStatusReal = (status) => {
        const verificada = status && status !== 'AGUARDANDO_DOCUMENTOS';
        return verificada ? (
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide">
                <Check className="w-3 h-3" /> Verificada
            </span>
        ) : (
            <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide">
                Não verificada
            </span>
        );
    };

    const legendaEstimativa = (descricao) => (descricao || '').replace(/^Lançamento avulso\s+[—-]\s*/i, '');

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
                    fomentoId: parcelaSelecionada?.fomentoId || undefined,
                    numero: parseInt(dadosParcela.numero),
                    valorInicial: parseFloat(valorLimpo),
                    mesesReferencia: mesesString,
                    categoria: dadosParcela.categoria
                });
            } else {
                await api.put(`/parcelas/${parcelaSelecionada.id}`, {
                    novoValorInicial: parseFloat(valorLimpo),
                    mesesReferencia: mesesString
                });
            }
            setModalParcela({ aberto: false, modo: 'NOVA' });
            await carregarParcelas();
        } catch (error) { alert(obterMensagemErro(error, "Erro ao salvar parcela.")); }
        finally { setIsSaving(false); }
    };

    const abrirModalNovaParcela = () => {
        const proximoNumero = parcelas.length > 0 ? Math.max(...parcelas.map(p => p.numero)) + 1 : 1;
        setDadosParcela({ numero: proximoNumero, valorInicial: '', categoria: getSetorAtivo() });
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
        <div className="flex flex-col max-w-5xl w-full mx-auto p-6 lg:p-10 space-y-6">

            {/* 1. SELETOR DE PARCELA */}
            <div className="bg-white border border-cream-200 shadow-sm p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1">
                    <h2 className="text-sm font-bold text-brand-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" /> Período de Prestação de Contas
                    </h2>
                    <div className="flex items-center gap-3">
                        <select
                            className="bg-brand-50 border border-brand-200 text-stone-800 text-lg rounded-xl focus:ring-brand-500 focus:border-brand-500 block p-2.5 font-semibold outline-none cursor-pointer min-w-[200px]"
                            value={parcelaSelecionada?.id || ''}
                            onChange={(e) => {
                                const p = parcelas.find(x => x.id === e.target.value);
                                setParcelaSelecionada(p);
                            }}
                        >
                            {parcelas.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.categoria === 'ESPORTE' ? 'Esporte' : 'Cultura'} — Parcela 0{p.numero} {p.mesesReferencia ? `(${p.mesesReferencia.split(', ').length} meses)` : ''}
                                </option>
                            ))}
                        </select>
                        <button onClick={abrirModalEditarParcela} title="Editar Parcela" className="p-2.5 bg-white border border-cream-200 text-stone-500 hover:text-brand-700 hover:border-brand-200 rounded-xl shadow-sm transition-colors">
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={abrirModalNovaParcela} title="Nova Parcela" className="p-2.5 bg-brand-700 text-white border border-transparent hover:bg-brand-800 rounded-xl shadow-sm transition-colors">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* BLOCO DE RESUMO FINANCEIRO */}
                {parcelaSelecionada && (
                    <div className="bg-cream-100 p-4 rounded-2xl min-w-[300px] text-sm text-stone-700 border border-cream-200">
                        <div className="flex justify-between mb-1">
                            <span>Valor Inicial:</span>
                            <span className="font-medium">R$ {formatarMoeda(parcelaSelecionada.valorInicial)}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span>Total Gasto:</span>
                            <span className="font-medium text-amber-700">R$ {formatarMoeda(abaAtiva === 'REAL' ? (parcelaSelecionada.valorInicial - parcelaSelecionada.saldoAtual) : totalEstimado)}</span>
                        </div>
                        <div className="h-px bg-cream-200 my-2 w-full" />
                        <div className="flex justify-between text-base">
                            <span className="font-bold text-stone-900">Saldo Disponível:</span>
                            <span className={`font-bold ${saldoProjetado < 0 ? 'text-red-600' : 'text-stone-900'}`}>
                                R$ {formatarMoeda(abaAtiva === 'REAL' ? parcelaSelecionada.saldoAtual : saldoProjetado)}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. ABAS */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex bg-cream-100 p-1.5 rounded-full w-fit border border-cream-200">
                    <button onClick={() => setAbaAtiva('ESTIMADA')} className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${abaAtiva === 'ESTIMADA' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700 hover:bg-cream-100'}`}>
                        <Calculator className="w-4 h-4" /> Projeção de Gastos
                    </button>
                    <button onClick={() => setAbaAtiva('REAL')} className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${abaAtiva === 'REAL' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700 hover:bg-cream-100'}`}>
                        <Activity className="w-4 h-4" /> Prestação em Tempo Real
                    </button>
                </div>

                <button
                    onClick={() => {
                        const nomeUsuario = localStorage.getItem('usuarioNome') || 'Gestor';
                        if (abaAtiva === 'ESTIMADA') exportarPdfProjecao({ parcela: parcelaSelecionada, estimativas, nomeUsuario });
                        else exportarPdfPrestacoes({ parcela: parcelaSelecionada, despesas, nomeUsuario });
                    }}
                    disabled={abaAtiva === 'ESTIMADA' ? estimativas.length === 0 : despesas.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <FileDown className="w-4 h-4" /> Exportar PDF
                </button>
            </div>

            {/* 3. ÁREA DA TABELA */}
            <div className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden">

                {/* TABELA: PROJEÇÃO ESTIMADA */}
                {abaAtiva === 'ESTIMADA' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[560px]">
                            <thead>
                                <tr className="border-b-2 border-cream-200 text-stone-800 text-sm">
                                    <th className="px-6 py-4 font-bold">Descrição</th>
                                    <th className="px-6 py-4 font-bold w-48">Valor (R$)</th>
                                    <th className="px-6 py-4 w-16"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {estimativas.map((est, index) => (
                                    <tr key={est.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-cream-50/50'} border-b border-cream-100 group`}>
                                        {estimativaEmEdicao?.id === est.id ? (
                                            <>
                                                <td className="px-6 py-3.5">
                                                    <input
                                                        type="text"
                                                        className="w-full px-3 py-2 border border-cream-200 bg-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
                                                        value={dadosEstEdicao.descricao}
                                                        onChange={e => setDadosEstEdicao({ ...dadosEstEdicao, descricao: e.target.value })}
                                                    />
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <input
                                                        type="text"
                                                        className="w-full px-3 py-2 border border-cream-200 bg-white rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/40"
                                                        value={dadosEstEdicao.valor}
                                                        onChange={e => setDadosEstEdicao({ ...dadosEstEdicao, valor: e.target.value })}
                                                    />
                                                </td>
                                                <td className="px-6 py-3.5 text-right space-x-1">
                                                    <button onClick={handleSalvarEdicaoEstimativa} disabled={isSaving} className="p-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50" title="Salvar">
                                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                    </button>
                                                    <button onClick={() => setEstimativaEmEdicao(null)} className="p-1.5 rounded-md bg-stone-200 text-stone-600 hover:bg-stone-300 transition-colors" title="Cancelar">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-6 py-3.5 text-sm text-stone-700">{legendaEstimativa(est.descricao)}</td>
                                                <td className="px-6 py-3.5 text-sm font-medium text-stone-900">{formatarMoeda(est.valor)}</td>
                                                <td className="px-6 py-3.5 text-right">
                                                    <button onClick={() => iniciarEdicaoEstimativa(est)} className="text-stone-300 hover:text-brand-700 transition-colors p-1.5 rounded-md" title="Editar">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeletarEstimativa(est.id)} className="text-stone-300 hover:text-red-500 transition-colors p-1.5 rounded-md" title="Excluir">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}

                                {/* Linha Contínua */}
                                <tr className="bg-brand-50/40 border-b border-cream-200">
                                    <td className="px-4 py-3">
                                        <input
                                            type="text" placeholder="Descreva o novo gasto..."
                                            className="w-full bg-white border border-cream-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl shadow-sm text-sm px-3 py-2 outline-none placeholder:text-stone-400"
                                            value={novaLinha.descricao} onChange={e => setNovaLinha({...novaLinha, descricao: e.target.value})} onKeyDown={handleKeyDown} disabled={isSaving}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="text" placeholder="0,00"
                                            className="w-full bg-white border border-cream-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl shadow-sm text-sm font-medium px-3 py-2 outline-none placeholder:text-stone-400"
                                            value={novaLinha.valor} onChange={e => setNovaLinha({...novaLinha, valor: e.target.value})} onKeyDown={handleKeyDown} disabled={isSaving}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={handleSalvarNovaLinha} disabled={!novaLinha.descricao || !novaLinha.valor || isSaving} className="bg-brand-700 text-white p-2 rounded-xl hover:bg-brand-800 disabled:opacity-40 transition-colors">
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
                        <table className="w-full text-left border-collapse min-w-[560px]">
                            <thead>
                                <tr className="border-b-2 border-cream-200 text-stone-800 text-sm">
                                    <th className="px-6 py-4 font-bold">Empresa</th>
                                    <th className="px-6 py-4 font-bold">Competência</th>
                                    <th className="px-6 py-4 font-bold">Valor (R$)</th>
                                    <th className="px-6 py-4 font-bold">Status</th>
                                    <th className="px-6 py-4 font-bold text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {despesas.length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-12 text-center text-sm text-stone-500">Nenhuma prestação recebida para esta parcela.</td></tr>
                                ) : (
                                    despesas.map((despesa, index) => (
                                        <Fragment key={despesa.id}>
                                        <tr className={`${index % 2 === 0 ? 'bg-white' : 'bg-cream-50/50'} border-b border-cream-100`}>
                                            <td className="px-6 py-4 text-sm">
                                                <span className="font-medium text-stone-700">{despesa.nomeEmpresa || despesa.emitente || '—'}</span>
                                                {despesa.observacao && <span className="block text-xs text-stone-400 mt-0.5">Obs: {despesa.observacao}</span>}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-stone-500">{despesa.dataCompetencia}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-stone-900">R$ {formatarMoeda(despesa.valor)}</td>
                                            <td className="px-6 py-4">{renderStatusReal(despesa.status)}</td>
                                            <td className="px-6 py-4 text-right space-x-1">
                                                <button onClick={() => setDespesaEmEdicao(despesaEmEdicao?.id === despesa.id ? null : despesa)} className="text-stone-400 hover:text-brand-700 transition-colors p-1.5 rounded-md" title="Editar">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleExcluirDespesa(despesa)} className="text-stone-400 hover:text-red-500 transition-colors p-1.5 rounded-md" title="Excluir">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                        {despesaEmEdicao?.id === despesa.id && (
                                            <EditarDespesaInline
                                                despesa={despesa}
                                                mesesDisponiveis={parcelaSelecionada?.mesesReferencia ? parcelaSelecionada.mesesReferencia.split(', ').filter(m => TODOS_OS_MESES.includes(m)) : []}
                                                onCancelar={() => setDespesaEmEdicao(null)}
                                                onSalvo={async () => { setDespesaEmEdicao(null); await carregarGastosDaParcela(parcelaSelecionada.id); }}
                                            />
                                        )}
                                        </Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL DE PARCELA COM SELEÇÃO DE MESES */}
            {modalParcela.aberto && (
                <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl border border-cream-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-5 py-4 border-b border-cream-200 flex justify-between items-center bg-cream-50">
                            <h3 style={heading} className="font-semibold text-stone-800 text-sm">
                                {modalParcela.modo === 'NOVA' ? 'Criar Nova Parcela' : 'Editar Parcela Existente'}
                            </h3>
                            <button onClick={() => setModalParcela({ aberto: false, modo: 'NOVA' })} className="text-stone-400 hover:text-stone-700 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSalvarParcela} className="p-6 space-y-5">
                            {modalParcela.modo === 'NOVA' && (
                                <div>
                                    <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase">Setor</label>
                                    <select
                                        required
                                        className="w-full px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 bg-white"
                                        value={dadosParcela.categoria}
                                        onChange={e => setDadosParcela({...dadosParcela, categoria: e.target.value})}
                                    >
                                        <option value="ESPORTE">Esporte</option>
                                        <option value="CULTURA">Cultura</option>
                                    </select>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase">Nº da Parcela</label>
                                    <input
                                        required type="number" disabled={modalParcela.modo === 'EDITAR'}
                                        className="w-full px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 bg-cream-50 disabled:text-stone-500"
                                        value={dadosParcela.numero} onChange={e => setDadosParcela({...dadosParcela, numero: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase">Valor Total (R$)</label>
                                    <input
                                        required type="text" placeholder="Ex: 85000,00"
                                        className="w-full px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 font-medium"
                                        value={dadosParcela.valorInicial} onChange={e => setDadosParcela({...dadosParcela, valorInicial: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* SELEÇÃO DOS MESES */}
                            <div>
                                <label className="block text-xs font-bold text-stone-700 mb-2.5 uppercase border-b border-cream-200 pb-2">Meses de Competência (Opcional)</label>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                                    {TODOS_OS_MESES.map(mes => (
                                        <label key={mes} className={`flex items-center justify-center gap-2 px-2 py-1.5 border rounded-lg text-[11px] cursor-pointer select-none transition-colors ${mesesSelecionados.includes(mes) ? 'bg-brand-100 border-brand-300 text-brand-800 font-semibold' : 'bg-white border-cream-200 text-stone-600 hover:bg-cream-50'}`}>
                                            <input
                                                type="checkbox" className="hidden"
                                                checked={mesesSelecionados.includes(mes)}
                                                onChange={() => toggleMes(mes)}
                                            />
                                            {mes}
                                        </label>
                                    ))}
                                </div>
                                <p className="text-[10px] text-stone-400 mt-2 text-center">Isso ajudará a filtrar as pastas de prestação depois.</p>
                            </div>

                            <button type="submit" disabled={isSaving} className="w-full bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold py-3 rounded-xl transition-colors mt-2 flex justify-center items-center gap-2 disabled:opacity-70">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Dados da Parcela'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}