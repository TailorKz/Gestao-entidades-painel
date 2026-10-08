import { useState, useEffect } from 'react';
import { api, obterMensagemErro } from '../services/api';
import { abrirArquivoEmNovaAba } from '../services/arquivos';
import { Loader2, Check, X, Link2, Unlink, Eye, Landmark, CalendarDays, AlertTriangle } from 'lucide-react';

const heading = { fontFamily: "'Varela Round', sans-serif" };

const fmtValor = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

export default function ModalComprovanteDespesa({ despesa, categoria, onFechar, onSalvo }) {
  const [carregando, setCarregando] = useState(true);
  const [vinculado, setVinculado] = useState(null);
  const [pendentes, setPendentes] = useState([]);
  const [busca, setBusca] = useState('');
  const [processandoId, setProcessandoId] = useState(null);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      setCarregando(true);
      try {
        const [resVinculado, resPendentes] = await Promise.all([
          api.get(`/despesas/${despesa.id}/comprovante`).catch(err => (err?.response?.status === 204 ? { data: null } : Promise.reject(err))),
          api.get('/despesas/conciliacao/comprovantes-pendentes', { params: categoria ? { categoria } : {} }).catch(() => ({ data: [] })),
        ]);
        if (!ativo) return;
        setVinculado(resVinculado.data || null);
        setPendentes(resPendentes.data || []);
      } catch (error) {
        if (ativo) alert(obterMensagemErro(error, 'Erro ao carregar o comprovante.'));
      } finally {
        if (ativo) setCarregando(false);
      }
    };
    carregar();
    return () => { ativo = false; };
  }, [despesa.id, categoria]);

  const verPdf = async (comp) => {
    if (!comp.chaveS3) return alert("Arquivo indisponível para este comprovante.");
    try {
      await abrirArquivoEmNovaAba(comp.chaveS3);
    } catch (error) {
      alert(error.message || "Não foi possível abrir o comprovante.");
    }
  };

  const vincular = async (comp) => {
    setProcessandoId(comp.id);
    try {
      await api.post('/despesas/conciliacao/vincular', {
        comprovanteId: comp.id,
        despesaId: despesa.id,
        categoria,
      });
      await onSalvo();
      onFechar();
    } catch (error) {
      alert(obterMensagemErro(error, "Erro ao vincular o comprovante."));
    } finally {
      setProcessandoId(null);
    }
  };

  const desvincular = async () => {
    if (!vinculado) return;
    if (!window.confirm("Desvincular este comprovante da despesa? Ele permanece salvo e volta para os pendentes.")) return;
    setProcessandoId(vinculado.id);
    try {
      await api.post(`/despesas/conciliacao/comprovantes/${vinculado.id}/desvincular`);
      await onSalvo();
      onFechar();
    } catch (error) {
      alert(obterMensagemErro(error, "Erro ao desvincular o comprovante."));
    } finally {
      setProcessandoId(null);
    }
  };

  const alvo = busca.trim().toLowerCase();
  const filtradas = alvo
    ? pendentes.filter(c => {
        const nome = (c.favorecido || c.nomeArquivo || '').toLowerCase();
        return nome.includes(alvo) || fmtValor(c.valor).toLowerCase().includes(alvo) || String(c.valor).includes(alvo);
      })
    : pendentes;

  return (
    <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-cream-200 shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-cream-200 flex justify-between items-center bg-cream-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
              <Landmark className="w-4 h-4 text-brand-700" />
            </div>
            <div>
              <h3 style={heading} className="font-semibold text-stone-800 text-sm">Comprovante da Despesa</h3>
              <p className="text-[11px] text-stone-500">
                {despesa.nomeEmpresa || despesa.emitente || 'Despesa'} · {despesa.dataCompetencia} · {fmtValor(despesa.valor)}
              </p>
            </div>
          </div>
          <button onClick={onFechar} className="text-stone-400 hover:text-stone-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {carregando ? (
            <div className="flex items-center justify-center gap-2 text-stone-500 text-sm py-10">
              <Loader2 className="w-5 h-5 animate-spin text-brand-600" /> Carregando comprovante...
            </div>
          ) : vinculado ? (
            <div className="space-y-3">
              <div className="border border-emerald-200 bg-emerald-50/60 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 bg-emerald-200 text-emerald-900 px-2 py-1 rounded-full text-[10px] font-bold uppercase">
                    <Check className="w-3 h-3" /> Vinculado
                  </span>
                </div>
                <p className="text-sm font-semibold text-emerald-950">{vinculado.favorecido || vinculado.nomeArquivo}</p>
                <p className="text-xs text-emerald-800 inline-flex items-center gap-1 flex-wrap mt-0.5">
                  <CalendarDays className="w-3 h-3" /> Débito em {fmtData(vinculado.dataPagamento)} · <strong>{fmtValor(vinculado.valor)}</strong>
                  {vinculado.documentoFavorecido ? <span>· {vinculado.documentoFavorecido}</span> : null}
                </p>
                <p className="text-[11px] text-stone-400 truncate mt-1">{vinculado.nomeArquivo}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => verPdf(vinculado)}
                  disabled={!vinculado.chaveS3}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-brand-200 text-brand-700 text-xs font-bold hover:bg-brand-50 transition-colors disabled:opacity-40"
                >
                  <Eye className="w-3.5 h-3.5" /> Ver PDF
                </button>
                <button
                  onClick={desvincular}
                  disabled={processandoId === vinculado.id}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-600 text-xs font-bold hover:bg-stone-100 transition-colors disabled:opacity-40"
                >
                  {processandoId === vinculado.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />} Desvincular
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-stone-500 inline-flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-amber-500" />
                Esta despesa está sem comprovante. Escolha um comprovante pendente para vincular:
              </p>
              <input
                autoFocus
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por nome ou valor..."
                className="w-full px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
              />
              {filtradas.length === 0 ? (
                <div className="flex items-center gap-2 text-stone-400 text-xs py-6 justify-center">
                  <AlertTriangle className="w-4 h-4" />
                  {pendentes.length === 0 ? 'Nenhum comprovante pendente para este setor. Importe no menu Comprovantes.' : 'Nenhum comprovante encontrado para a busca.'}
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-cream-100 border border-cream-200 rounded-xl">
                  {filtradas.map(c => {
                    const valorIgual = Number(c.valor) === Number(despesa.valor);
                    return (
                      <button
                        key={c.id}
                        onClick={() => vincular(c)}
                        disabled={processandoId === c.id}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-amber-50 transition-colors disabled:opacity-50"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-stone-800 truncate">
                            {c.favorecido || c.nomeArquivo}
                            {valorIgual && (
                              <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full align-middle">valor igual</span>
                            )}
                          </p>
                          <p className="text-[11px] text-stone-500 inline-flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" /> débito em {fmtData(c.dataPagamento)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold text-stone-900">{fmtValor(c.valor)}</span>
                          {processandoId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" /> : <Link2 className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}