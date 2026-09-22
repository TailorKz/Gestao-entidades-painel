import { useState, useEffect } from 'react';
import {
  Plus, ChevronUp, ChevronDown, Loader2, Trash2, Check, X, Pencil, Activity, Music, AlertTriangle,
} from 'lucide-react';
import { obterMensagemErro } from '../services/api';
import {
  listarAcoesGerr, criarAcaoGerr, atualizarAcaoGerr, reordenarAcoesGerr, excluirAcaoGerr,
} from '../services/acoesGerr';

const heading = { fontFamily: "'Varela Round', sans-serif" };

export default function AcoesGerr() {
  const [acoes, setAcoes] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [editandoNome, setEditandoNome] = useState('');
  const [novaPorCategoria, setNovaPorCategoria] = useState({ ESPORTE: '', CULTURA: '' });
  const [ocupadoId, setOcupadoId] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const ehSuperAdmin = localStorage.getItem('usuarioRole') === 'SUPER_ADMIN';

  const recarregar = async () => {
    try {
      const [esporte, cultura] = await Promise.all([
        listarAcoesGerr('ESPORTE', true),
        listarAcoesGerr('CULTURA', true),
      ]);
      setAcoes([...esporte, ...cultura]);
    } catch (error) {
      alert(obterMensagemErro(error, "Erro ao carregar as ações."));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recarregar();
  }, []);

  const daCategoria = (cat) => acoes
    .filter(a => a.categoria === cat)
    .sort((a, b) => (a.posicao ?? 999) - (b.posicao ?? 999));

  const handleCriar = async (categoria) => {
    const nome = (novaPorCategoria[categoria] || '').trim();
    if (!nome) return;
    setOcupadoId('novo-' + categoria);
    try {
      await criarAcaoGerr(categoria, nome);
      setNovaPorCategoria({ ...novaPorCategoria, [categoria]: '' });
      await recarregar();
    } catch (error) {
      alert(obterMensagemErro(error, "Erro ao adicionar a ação."));
    } finally {
      setOcupadoId(null);
    }
  };

  const iniciarEdicao = (acao) => {
    setEditandoId(acao.id);
    setEditandoNome(acao.nome);
  };

  const salvarEdicao = async (acao) => {
    const nome = editandoNome.trim();
    if (!nome) return;
    setOcupadoId(acao.id);
    try {
      await atualizarAcaoGerr(acao.id, { nome });
      setEditandoId(null);
      await recarregar();
    } catch (error) {
      alert(obterMensagemErro(error, "Erro ao salvar a ação."));
    } finally {
      setOcupadoId(null);
    }
  };

  const alternarAtivo = async (acao) => {
    setOcupadoId(acao.id);
    try {
      await atualizarAcaoGerr(acao.id, { ativo: !acao.ativo });
      await recarregar();
    } catch (error) {
      alert(obterMensagemErro(error, "Erro ao alterar a ação."));
    } finally {
      setOcupadoId(null);
    }
  };

  const mover = async (categoria, index, direcao) => {
    const lista = [...daCategoria(categoria)];
    const alvo = index + direcao;
    if (alvo < 0 || alvo >= lista.length) return;
    const trocado = lista[index];
    lista[index] = lista[alvo];
    lista[alvo] = trocado;
    setOcupadoId('mover');
    try {
      await reordenarAcoesGerr(categoria, lista.map(a => a.id));
      await recarregar();
    } catch (error) {
      alert(obterMensagemErro(error, "Erro ao reordenar as ações."));
    } finally {
      setOcupadoId(null);
    }
  };

  const handleExcluir = async (acao) => {
    if (!window.confirm(`Desativar "${acao.nome}"? Ela deixa de aparecer nos lançamentos novos, mas despesas antigas continuam registradas.`)) return;
    setOcupadoId(acao.id);
    try {
      await excluirAcaoGerr(acao.id);
      await recarregar();
    } catch (error) {
      alert(obterMensagemErro(error, "Erro ao excluir a ação."));
    } finally {
      setOcupadoId(null);
    }
  };

  if (!ehSuperAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-10 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 style={heading} className="text-lg text-stone-800 font-semibold mb-1">Acesso restrito</h2>
        <p className="text-sm text-stone-500">Somente o administrador (SUPER_ADMIN) pode gerenciar a Lista de Ações do GERR.</p>
      </div>
    );
  }

  const renderPainel = (categoria, rotulo, Icon) => (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-cream-200 bg-cream-50 flex items-center gap-2">
        <Icon className={`w-5 h-5 ${categoria === 'ESPORTE' ? 'text-emerald-500' : 'text-amber-500'}`} />
        <h3 style={heading} className="text-sm text-stone-800 font-bold uppercase tracking-wide">{rotulo} — Lista de Ações</h3>
      </div>

      <div className="p-5">
        {/* ADICIONAR */}
        <div className="flex gap-2 mb-5">
          <input
            type="text"
            placeholder="Nome da ação (ex.: Atividades de Futsal, Handebol e Voleibol)"
            className="flex-1 px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            value={novaPorCategoria[categoria] || ''}
            onChange={(e) => setNovaPorCategoria({ ...novaPorCategoria, [categoria]: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCriar(categoria); }}
          />
          <button
            onClick={() => handleCriar(categoria)}
            disabled={ocupadoId === 'novo-' + categoria || !(novaPorCategoria[categoria] || '').trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors disabled:opacity-50 shrink-0"
          >
            {ocupadoId === 'novo-' + categoria ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Adicionar
          </button>
        </div>

        {carregando ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>
        ) : daCategoria(categoria).length === 0 ? (
          <p className="text-sm text-stone-500 text-center py-8">Nenhuma ação cadastrada ainda. Adicione a primeira acima.</p>
        ) : (
          <ul className="space-y-2">
            {daCategoria(categoria).map((acao, index) => {
              const editando = editandoId === acao.id;
              const ocupado = ocupadoId === acao.id;
              return (
                <li key={acao.id} className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 ${acao.ativo ? 'border-cream-200 bg-cream-50/60' : 'border-stone-200 bg-stone-50 opacity-60'}`}>
                  <div className="flex flex-col">
                    <button onClick={() => mover(categoria, index, -1)} disabled={index === 0 || ocupado} className="text-stone-400 hover:text-brand-700 disabled:opacity-30 transition-colors" title="Mover para cima">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => mover(categoria, index, 1)} disabled={index === daCategoria(categoria).length - 1 || ocupado} className="text-stone-400 hover:text-brand-700 disabled:opacity-30 transition-colors" title="Mover para baixo">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="w-7 text-center text-xs font-bold text-stone-400">{index + 1}</span>

                  {editando ? (
                    <input
                      type="text"
                      autoFocus
                      className="flex-1 px-2 py-1.5 border border-brand-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
                      value={editandoNome}
                      onChange={(e) => setEditandoNome(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') salvarEdicao(acao); if (e.key === 'Escape') setEditandoId(null); }}
                    />
                  ) : (
                    <span className={`flex-1 text-sm ${acao.ativo ? 'text-stone-800 font-medium' : 'text-stone-400 line-through'}`}>{acao.nome}</span>
                  )}

                  <button
                    onClick={() => alternarAtivo(acao)}
                    title={acao.ativo ? 'Desativar (some dos lançamentos novos)' : 'Reativar'}
                    disabled={ocupado}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${acao.ativo ? 'text-stone-500 hover:bg-stone-200' : 'text-emerald-700 hover:bg-emerald-100'}`}
                  >
                    {acao.ativo ? 'Ativa' : 'Inativa'}
                  </button>

                  {editando ? (
                    <span className="flex gap-1">
                      <button onClick={() => salvarEdicao(acao)} disabled={ocupado} className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors" title="Salvar">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditandoId(null)} className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-200 transition-colors" title="Cancelar">
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ) : (
                    <span className="flex gap-1">
                      <button onClick={() => iniciarEdicao(acao)} className="p-1.5 rounded-lg text-stone-400 hover:text-brand-700 hover:bg-cream-100 transition-colors" title="Editar nome">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleExcluir(acao)} className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-[11px] text-stone-400 mt-4">
          Excluir desativa a ação (some dos lançamentos novos). Despesas já classificadas continuam com o nome histórico.
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col max-w-5xl w-full mx-auto p-6 lg:p-10 space-y-6">
      <div>
        <h1 style={heading} className="text-xl text-stone-900 font-bold">Ações GERR</h1>
        <p className="text-sm text-stone-500 mt-1">
          A "Lista de Ações" usada na classificação do GERR. Definida livremente aqui, sem mexer em código.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderPainel('ESPORTE', 'Esporte', Activity)}
        {renderPainel('CULTURA', 'Cultura', Music)}
      </div>
    </div>
  );
}