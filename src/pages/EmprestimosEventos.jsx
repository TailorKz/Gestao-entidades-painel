import { useState, useEffect } from 'react';
import { api, obterMensagemErro } from '../services/api';
import { categoriaQueryParam, getSetorAtivo } from '../services/setor';
import { Package, Trash2, Check, Loader2, Edit2, X, Bell, ArrowLeftRight, Clock } from 'lucide-react';

const heading = { fontFamily: "'Varela Round', sans-serif" };

const todayStr = () => new Date().toISOString().split('T')[0];

const fmtDataBR = (iso) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
};

export default function EmprestimosEventos() {
    const [abaAtiva, setAbaAtiva] = useState('EMPRESTIMOS');
    const [filtroEmprestimos, setFiltroEmprestimos] = useState('TODOS');

    const [emprestimos, setEmprestimos] = useState([]);
    const [lembretes, setLembretes] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // Estado da nova linha do empréstimo
    const [novaLinha, setNovaLinha] = useState({ equipamento: '', nomeRetirante: '' });

    // Estado de edição inline
    const [emEdicao, setEmEdicao] = useState(null);
    const [dadosEdicao, setDadosEdicao] = useState({ equipamento: '', nomeRetirante: '', dataRetirada: '' });

    // Estado do lembrete
    const [novoLembrete, setNovoLembrete] = useState({ titulo: '', data: todayStr() });

    const carregarEmprestimos = async () => {
        try {
            let url = '/emprestimos';
            if (filtroEmprestimos === 'ABERTOS') url = '/emprestimos/ativos';
            else if (filtroEmprestimos === 'ENTREGUES') url = '/emprestimos/entregues';
            const res = await api.get(url, { params: categoriaQueryParam() });
            setEmprestimos(res.data);
        } catch { console.error("Erro ao carregar empréstimos"); }
    };

    const carregarLembretes = async () => {
        try {
            const res = await api.get('/lembretes/proximos', { params: { dias: 30 } });
            setLembretes(res.data);
        } catch { console.error("Erro ao carregar lembretes"); }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        carregarEmprestimos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtroEmprestimos]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        carregarLembretes();
    }, []);

    useEffect(() => {
        const aoMudarSetor = () => { carregarEmprestimos(); carregarLembretes(); };
        window.addEventListener('setor-changed', aoMudarSetor);
        return () => window.removeEventListener('setor-changed', aoMudarSetor);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- EMPRÉSTIMOS: Criar ---
    const handleCriarEmprestimo = async () => {
        if (!novaLinha.equipamento.trim() || !novaLinha.nomeRetirante.trim()) return;
        setIsSaving(true);
        try {
            await api.post('/emprestimos', {
                equipamento: novaLinha.equipamento,
                nomeRetirante: novaLinha.nomeRetirante,
                dataRetirada: todayStr(),
                categoria: getSetorAtivo()
            });
            setNovaLinha({ equipamento: '', nomeRetirante: '' });
            await carregarEmprestimos();
        } catch (error) { alert(obterMensagemErro(error, "Erro ao registrar empréstimo.")); }
        finally { setIsSaving(false); }
    };

    const handleKeyDownEmprestimo = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleCriarEmprestimo(); }
    };

    // --- EMPRÉSTIMOS: Editar ---
    const iniciarEdicao = (emp) => {
        setEmEdicao(emp);
        setDadosEdicao({ equipamento: emp.equipamento, nomeRetirante: emp.nomeRetirante, dataRetirada: emp.dataRetirada });
    };

    const cancelarEdicao = () => { setEmEdicao(null); setDadosEdicao({ equipamento: '', nomeRetirante: '', dataRetirada: '' }); };

    const handleSalvarEdicao = async () => {
        if (!dadosEdicao.equipamento.trim() || !dadosEdicao.nomeRetirante.trim()) return;
        setIsSaving(true);
        try {
            await api.put(`/emprestimos/${emEdicao.id}`, {
                equipamento: dadosEdicao.equipamento,
                nomeRetirante: dadosEdicao.nomeRetirante,
                dataRetirada: dadosEdicao.dataRetirada || todayStr(),
                categoria: getSetorAtivo()
            });
            cancelarEdicao();
            await carregarEmprestimos();
        } catch (error) { alert(obterMensagemErro(error, "Erro ao editar empréstimo.")); }
        finally { setIsSaving(false); }
    };

    // --- EMPRÉSTIMOS: Devolver ---
    const handleDevolver = async (emp) => {
        if (!window.confirm(`Marcar como entregue: ${emp.equipamento}?`)) return;
        setIsSaving(true);
        try {
            await api.post(`/emprestimos/${emp.id}/devolver`);
            await carregarEmprestimos();
        } catch (error) { alert(obterMensagemErro(error, "Erro ao registrar entrega.")); }
        finally { setIsSaving(false); }
    };

    // --- EMPRÉSTIMOS: Deletar ---
    const handleDeletarEmprestimo = async (id) => {
        if (!window.confirm("Remover este empréstimo?")) return;
        try { await api.delete(`/emprestimos/${id}`); await carregarEmprestimos(); }
        catch (error) { alert(obterMensagemErro(error, "Erro ao excluir.")); }
    };

    // --- LEMBRETES: Criar ---
    const handleCriarLembrete = async () => {
        if (!novoLembrete.titulo.trim()) return;
        setIsSaving(true);
        try {
            await api.post('/lembretes', { titulo: novoLembrete.titulo, data: novoLembrete.data || todayStr() });
            setNovoLembrete({ titulo: '', data: todayStr() });
            await carregarLembretes();
        } catch (error) { alert(obterMensagemErro(error, "Erro ao salvar lembrete.")); }
        finally { setIsSaving(false); }
    };

    const handleDeletarLembrete = async (id) => {
        if (!window.confirm("Remover este lembrete?")) return;
        try { await api.delete(`/lembretes/${id}`); await carregarLembretes(); }
        catch (error) { alert(obterMensagemErro(error, "Erro ao excluir lembrete.")); }
    };

    const inputClass = "w-full bg-white border border-cream-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl shadow-sm text-sm px-3 py-2 outline-none placeholder:text-stone-400";
    const inputEdicaoClass = "w-full px-3 py-2 border border-cream-200 bg-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40";
    const hoje = todayStr();

    const lembretesHoje = lembretes.filter(l => l.data === hoje);
    const lembretesFuturos = lembretes.filter(l => l.data > hoje);

    return (
        <div className="flex flex-col max-w-5xl w-full mx-auto p-6 lg:p-10 space-y-6">

            {/* CABEÇALHO */}
            <div>
                <h2 style={heading} className="text-lg font-bold text-stone-800 flex items-center gap-2.5">
                    <ArrowLeftRight className="w-5 h-5 text-brand-600" />
                    Empréstimos e Eventos
                </h2>
                <p className="text-sm text-stone-500 mt-1">Controle de equipamentos emprestados e lembretes importantes.</p>
            </div>

            {/* ABAS */}
            <div className="flex bg-cream-100 p-1.5 rounded-full w-fit border border-cream-200">
                <button
                    onClick={() => setAbaAtiva('EMPRESTIMOS')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${abaAtiva === 'EMPRESTIMOS' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700 hover:bg-cream-100'}`}
                >
                    <Package className="w-4 h-4" /> Empréstimos
                </button>
                <button
                    onClick={() => setAbaAtiva('LEMBRETES')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${abaAtiva === 'LEMBRETES' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700 hover:bg-cream-100'}`}
                >
                    <Bell className="w-4 h-4" /> Lembretes
                </button>
            </div>

            {/* --- ABA EMPRÉSTIMOS --- */}
            {abaAtiva === 'EMPRESTIMOS' && (
                <>
                    {/* FILTROS */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {[
                            { key: 'TODOS', label: 'Todos' },
                            { key: 'ABERTOS', label: 'Em aberto' },
                            { key: 'ENTREGUES', label: 'Entregues' },
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFiltroEmprestimos(f.key)}
                                className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                                    filtroEmprestimos === f.key
                                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                                        : 'bg-white text-stone-600 border-cream-200 hover:border-brand-300 hover:text-brand-700'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* TABELA */}
                    <div className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[560px]">
                                <thead>
                                    <tr className="border-b-2 border-cream-200 text-stone-800 text-sm">
                                        <th className="px-6 py-4 font-bold">Equipamento</th>
                                        <th className="px-6 py-4 font-bold">Retirado por</th>
                                        <th className="px-6 py-4 font-bold w-36">Data Retirada</th>
                                        <th className="px-6 py-4 font-bold w-36">Entrega</th>
                                        <th className="px-6 py-4 font-bold text-center w-44">Status</th>
                                        <th className="px-6 py-4 font-bold text-right w-28">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {emprestimos.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-sm text-stone-500">
                                                Nenhum empréstimo registrado para {getSetorAtivo() === 'ESPORTE' ? 'Esporte' : 'Cultura'}.
                                            </td>
                                        </tr>
                                    )}

                                    {emprestimos.map((emp, index) => {
                                        const emEd = emEdicao?.id === emp.id;
                                        return (
                                            <tr
                                                key={emp.id}
                                                className={`${index % 2 === 0 ? 'bg-white' : 'bg-cream-50/50'} border-b border-cream-100 group`}
                                            >
                                                {emEd ? (
                                                    <>
                                                        <td className="px-6 py-3.5">
                                                            <input type="text" className={inputEdicaoClass} value={dadosEdicao.equipamento} onChange={e => setDadosEdicao({...dadosEdicao, equipamento: e.target.value})} />
                                                        </td>
                                                        <td className="px-6 py-3.5">
                                                            <input type="text" className={inputEdicaoClass} value={dadosEdicao.nomeRetirante} onChange={e => setDadosEdicao({...dadosEdicao, nomeRetirante: e.target.value})} />
                                                        </td>
                                                        <td className="px-6 py-3.5">
                                                            <input type="date" className={inputEdicaoClass} value={dadosEdicao.dataRetirada} onChange={e => setDadosEdicao({...dadosEdicao, dataRetirada: e.target.value})} />
                                                        </td>
                                                        <td className="px-6 py-3.5 text-sm text-stone-500">—</td>
                                                        <td className="px-6 py-3.5 text-center">—</td>
                                                        <td className="px-6 py-3.5 text-right space-x-1">
                                                            <button onClick={handleSalvarEdicao} disabled={isSaving} className="p-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50" title="Salvar">
                                                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                            </button>
                                                            <button onClick={cancelarEdicao} className="p-1.5 rounded-md bg-stone-200 text-stone-600 hover:bg-stone-300 transition-colors" title="Cancelar">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-6 py-4 text-sm font-medium text-stone-700">{emp.equipamento}</td>
                                                        <td className="px-6 py-4 text-sm text-stone-600">{emp.nomeRetirante}</td>
                                                        <td className="px-6 py-4 text-sm text-stone-500">{fmtDataBR(emp.dataRetirada)}</td>
                                                        <td className="px-6 py-4 text-sm text-stone-500">{emp.dataEntrega ? fmtDataBR(emp.dataEntrega) : '—'}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            {emp.dataEntrega ? (
                                                                <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide">
                                                                    <Check className="w-3 h-3" /> Entregue
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide">
                                                                    <Clock className="w-3 h-3" /> Em aberto
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right space-x-1">
                                                            {!emp.dataEntrega && (
                                                                <button
                                                                    onClick={() => handleDevolver(emp)}
                                                                    disabled={isSaving}
                                                                    className="p-1.5 rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50 cursor-pointer"
                                                                    title="Marcar como entregue"
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <button onClick={() => iniciarEdicao(emp)} className="text-stone-300 hover:text-brand-700 transition-colors p-1.5 rounded-md cursor-pointer" title="Editar">
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => handleDeletarEmprestimo(emp.id)} className="text-stone-300 hover:text-red-500 transition-colors p-1.5 rounded-md cursor-pointer" title="Excluir">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })}

                                    {/* LINHA DE CRIAÇÃO */}
                                    <tr className="bg-brand-50/40 border-b border-cream-200">
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                placeholder="Equipamento retirado..."
                                                className={inputClass}
                                                value={novaLinha.equipamento}
                                                onChange={e => setNovaLinha({...novaLinha, equipamento: e.target.value})}
                                                onKeyDown={handleKeyDownEmprestimo}
                                                disabled={isSaving}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                placeholder="Nome de quem retirou..."
                                                className={inputClass}
                                                value={novaLinha.nomeRetirante}
                                                onChange={e => setNovaLinha({...novaLinha, nomeRetirante: e.target.value})}
                                                onKeyDown={handleKeyDownEmprestimo}
                                                disabled={isSaving}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-sm text-stone-500 pl-4">{fmtDataBR(hoje)}</td>
                                        <td className="px-4 py-3 text-sm text-stone-400 pl-4">—</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide">
                                                <Clock className="w-3 h-3" /> Em aberto
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={handleCriarEmprestimo}
                                                disabled={!novaLinha.equipamento || !novaLinha.nomeRetirante || isSaving}
                                                className="bg-brand-700 text-white p-2 rounded-xl hover:bg-brand-800 disabled:opacity-40 transition-colors cursor-pointer"
                                            >
                                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* --- ABA LEMBRETES --- */}
            {abaAtiva === 'LEMBRETES' && (
                <div className="space-y-6">
                    {/* FORMULÁRIO NOVO LEMBRETE */}
                    <div className="bg-white rounded-2xl border border-cream-200 shadow-sm p-5">
                        <h3 style={heading} className="text-sm font-bold text-stone-700 mb-4 uppercase tracking-widest flex items-center gap-2">
                            <Bell className="w-4 h-4 text-brand-600" /> Adicionar Lembrete
                        </h3>
                        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase">Lembrete</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Devolver equipamento..."
                                    className="w-full px-3 py-2.5 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 font-medium"
                                    value={novoLembrete.titulo}
                                    onChange={e => setNovoLembrete({...novoLembrete, titulo: e.target.value})}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCriarLembrete(); } }}
                                    disabled={isSaving}
                                />
                            </div>
                            <div className="w-full sm:w-44">
                                <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase">Data</label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2.5 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 bg-white"
                                    value={novoLembrete.data}
                                    onChange={e => setNovoLembrete({...novoLembrete, data: e.target.value})}
                                    disabled={isSaving}
                                />
                            </div>
                            <button
                                onClick={handleCriarLembrete}
                                disabled={!novoLembrete.titulo.trim() || isSaving}
                                className="bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                            </button>
                        </div>
                    </div>

                    {/* LISTA DE LEMBRETES */}
                    <div className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[560px]">
                                <thead>
                                    <tr className="border-b-2 border-cream-200 text-stone-800 text-sm">
                                        <th className="px-6 py-4 font-bold">Lembrete</th>
                                        <th className="px-6 py-4 font-bold w-40">Data</th>
                                        <th className="px-6 py-4 font-bold text-right w-28">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lembretes.length === 0 ? (
                                        <tr><td colSpan="3" className="px-6 py-12 text-center text-sm text-stone-500">Nenhum lembrete registrado.</td></tr>
                                    ) : (
                                        <>
                                            {lembretesHoje.length > 0 && (
                                                <tr><td colSpan="3" className="px-6 py-2.5 bg-amber-50 text-xs font-bold text-amber-800 uppercase tracking-wider border-b border-amber-100">Hoje</td></tr>
                                            )}
                                            {lembretesHoje.map((l, idx) => (
                                                <LembreteRow key={l.id} lembrete={l} index={idx} isSaving={isSaving} onDelete={handleDeletarLembrete} />
                                            ))}
                                            {lembretesFuturos.length > 0 && (
                                                <tr><td colSpan="3" className="px-6 py-2.5 bg-stone-50 text-xs font-bold text-stone-600 uppercase tracking-wider border-b border-cream-100">Próximos</td></tr>
                                            )}
                                            {lembretesFuturos.map((l, idx) => (
                                                <LembreteRow key={l.id} lembrete={l} index={idx} isSaving={isSaving} onDelete={handleDeletarLembrete} />
                                            ))}
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function LembreteRow({ lembrete, index, isSaving, onDelete }) {
    return (
        <tr className={`${index % 2 === 0 ? 'bg-white' : 'bg-cream-50/50'} border-b border-cream-100`}>
            <td className="px-6 py-4 text-sm font-medium text-stone-700">{lembrete.titulo}</td>
            <td className="px-6 py-4 text-sm text-stone-500">{fmtDataBR(lembrete.data)}</td>
            <td className="px-6 py-4 text-right">
                <button
                    onClick={() => onDelete(lembrete.id)}
                    disabled={isSaving}
                    className="text-stone-300 hover:text-red-500 transition-colors p-1.5 rounded-md cursor-pointer"
                    title="Remover lembrete"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </td>
        </tr>
    );
}