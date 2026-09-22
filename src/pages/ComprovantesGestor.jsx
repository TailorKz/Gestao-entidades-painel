import { useState, useEffect, useCallback } from 'react';
import { api, obterMensagemErro } from '../services/api';
import { categoriaQueryParam, getSetorAtivo, selecionarParcela, salvarParcelaLembrada } from '../services/setor';
import { rotuloMeses } from '../services/meses';
import {
  Landmark, Link2, Loader2, Check, X, FileText, CalendarDays,
  ShieldCheck, FileWarning, Layers, Eye, Trash2
} from 'lucide-react';
import ModalConciliacao from '../components/ModalConciliacao';

const fmtValor = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

export default function ComprovantesGestor() {
  const [parcelas, setParcelas] = useState([]);
  const [parcelaSelecionada, setParcelaSelecionada] = useState(null);

  const [comprovantes, setComprovantes] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [filtro, setFiltro] = useState('TODOS'); // 'TODOS' | 'PENDENTES'
  const [vincularPara, setVincularPara] = useState({});
  const [vinculandoId, setVinculandoId] = useState(null);

  const [modalConciliacao, setModalConciliacao] = useState(false);

  const carregarParcelas = useCallback(async () => {
    try {
      const res = await api.get('/parcelas', { params: categoriaQueryParam() });
      if (res.data.length > 0) {
        setParcelas(res.data);
        setParcelaSelecionada(prev => selecionarParcela({ parcelas: res.data, atual: prev, setor: getSetorAtivo() }));
      }
    } catch { /* silencioso */ }
  }, []);

  const carregarComprovantes = useCallback(async (parcelaId) => {
    if (!parcelaId) return;
    setCarregando(true);
    try {
      const [resComp, resDesp] = await Promise.all([
        api.get(`/despesas/${parcelaId}/comprovantes`),
        api.get(`/despesas/parcela/${parcelaId}`),
      ]);
      setComprovantes(resComp.data);
      setDespesas(resDesp.data);
    } catch { /* silencioso */ }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarParcelas();
    const aoMudarSetor = () => carregarParcelas();
    window.addEventListener('setor-changed', aoMudarSetor);
    return () => window.removeEventListener('setor-changed', aoMudarSetor);
  }, [carregarParcelas]);

  useEffect(() => {
    if (parcelaSelecionada) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      carregarComprovantes(parcelaSelecionada.id);
      setVincularPara({});
    }
  }, [parcelaSelecionada, carregarComprovantes]);

  const pendentes = comprovantes.filter(c => !c.despesaId);
  const vinculados = comprovantes.filter(c => c.despesaId);
  const comNota = vinculados.filter(c => c.temNotaFiscal);

  const candidatas = despesas.filter(d => !d.temComprovante);

  const listaExibida = filtro === 'PENDENTES' ? pendentes : comprovantes;

  const vincular = async (comprovanteId) => {
    const despesaId = vincularPara[comprovanteId];
    if (!despesaId) return;
    setVinculandoId(comprovanteId);
    try {
      await api.post("/despesas/conciliacao/vincular", {
        parcelaId: parcelaSelecionada.id,
        comprovanteId,
        despesaId,
      });
      await carregarComprovantes(parcelaSelecionada.id);
    } catch (error) {
      alert(obterMensagemErro(error, "Erro ao vincular o comprovante."));
    } finally {
      setVinculandoId(null);
    }
  };

  const verPdf = (comp) => {
    if (!comp.chaveS3) return;
    const apiBase = api.defaults.baseURL || 'http://localhost:8080';
    window.open(`${apiBase}/arquivos/${encodeURIComponent(comp.chaveS3)}`, '_blank');
  };

  const excluir = async (comp) => {
    const confirmacao = comp.despesaId
      ? "Excluir este comprovante? Ele será desvinculado da despesa e o arquivo apagado do S3."
      : "Excluir este comprovante? O arquivo será apagado do S3.";
    if (!window.confirm(confirmacao)) return;
    try {
      await api.delete(`/despesas/${parcelaSelecionada.id}/comprovantes/${comp.id}`);
      await carregarComprovantes(parcelaSelecionada.id);
    } catch (error) {
      alert(obterMensagemErro(error, "Erro ao excluir o comprovante."));
    }
  };

  const StatusBadge = ({ comprovante }) => {
    if (!comprovante.despesaId) {
      return (
        <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide">
          <X className="w-3 h-3" /> Não vinculado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide">
        <Check className="w-3 h-3" /> Vinculado
      </span>
    );
  };

  return (
    <div className="flex flex-col max-w-6xl w-full mx-auto p-6 lg:p-10 space-y-6">

      {/* 1. SELETOR DE PARCELA */}
      <div className="bg-white border border-cream-200 shadow-sm p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full">
          <h2 className="text-sm font-bold text-brand-700 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Landmark className="w-4 h-4" /> Configuração de Comprovantes
          </h2>
          <select
            className="bg-brand-50 border border-brand-200 text-stone-800 text-lg rounded-xl focus:ring-brand-500 focus:border-brand-500 block p-2.5 font-semibold outline-none cursor-pointer min-w-[220px] w-full md:w-auto"
            value={parcelaSelecionada?.id || ''}
            onChange={(e) => {
              const p = parcelas.find(x => x.id === e.target.value);
              setParcelaSelecionada(p);
              salvarParcelaLembrada(p?.id);
            }}
          >
            {parcelas.map(p => (
              <option key={p.id} value={p.id}>
                {p.categoria === 'ESPORTE' ? 'Esporte' : 'Cultura'} — Parcela 0{p.numero} {rotuloMeses(p.mesesReferencia)}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setModalConciliacao(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 transition-colors shadow-sm"
        >
          <Layers className="w-4 h-4" /> Conciliar Lote BB
        </button>
      </div>

      {/* 2. RESUMO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-cream-200 rounded-2xl p-4">
          <p className="text-[11px] text-stone-500 font-semibold uppercase tracking-wide">Total de comprovantes</p>
          <p className="text-2xl font-bold text-stone-900 mt-1">{comprovantes.length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wide">Vinculados</p>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{vinculados.length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-[11px] text-amber-700 font-semibold uppercase tracking-wide">Pendentes de vínculo</p>
          <p className="text-2xl font-bold text-amber-800 mt-1">{pendentes.length}</p>
        </div>
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4">
          <p className="text-[11px] text-brand-700 font-semibold uppercase tracking-wide">Com nota fiscal + comprovante</p>
          <p className="text-2xl font-bold text-brand-800 mt-1">{comNota.length}</p>
        </div>
      </div>

      {/* 3. FILTROS */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 bg-cream-100 rounded-full p-1 border border-cream-200">
          {[
            { valor: 'TODOS', rotulo: `Todos (${comprovantes.length})` },
            { valor: 'PENDENTES', rotulo: `Não vinculados (${pendentes.length})` },
          ].map(f => (
            <button
              key={f.valor}
              onClick={() => setFiltro(f.valor)}
              className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                filtro === f.valor
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-stone-500 hover:text-brand-700'
              }`}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
        {filtro === 'PENDENTES' && pendentes.length === 0 && !carregando && (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> Tudo vinculado! Nenhum comprovante aguardando vínculo.
          </p>
        )}
      </div>

      {/* 4. LISTA */}
      {carregando && !comprovantes.length ? (
        <div className="flex items-center justify-center gap-2 text-stone-500 text-sm py-16">
          <Loader2 className="w-5 h-5 animate-spin text-brand-600" /> Carregando comprovantes...
        </div>
      ) : listaExibida.length === 0 ? (
        <div className="bg-white border border-cream-200 rounded-2xl p-10 text-center text-stone-400 text-sm">
          Nenhum comprovante encontrado nesta parcela.
        </div>
      ) : (
        <div className="space-y-3">
          {listaExibida.map(comp => (
            <div key={comp.id} className="bg-white border border-cream-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                {/* Identificação do comprovante */}
                <div className="min-w-0 flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-brand-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-800 truncate">
                      {comp.favorecido || comp.nomeArquivo}
                    </p>
                    <p className="text-xs text-stone-500 flex items-center gap-1 flex-wrap">
                      <span>{comp.documentoFavorecido || 'sem CPF/CNPJ'}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {fmtData(comp.dataPagamento)}</span>
                    </p>
                    <p className="text-[11px] text-stone-400 truncate mt-0.5">{comp.nomeArquivo}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-base font-bold text-stone-900">{fmtValor(comp.valor)}</span>
                  <StatusBadge comprovante={comp} />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => verPdf(comp)}
                      disabled={!comp.chaveS3}
                      className="p-2 rounded-lg text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={comp.chaveS3 ? 'Ver PDF' : 'Arquivo indisponível (comprovante antigo)'}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => excluir(comp)}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Excluir comprovante"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {comp.despesaId ? (
                /* Já vinculado */
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 bg-emerald-50/60 border border-emerald-200 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-emerald-900 flex items-center gap-1.5 min-w-0">
                    <Link2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Linkado à despesa: <strong>{comp.despesaDescricao || '—'}</strong></span>
                  </p>
                  {comp.temNotaFiscal ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-200 text-emerald-900 px-2 py-1 rounded-full text-[10px] font-bold uppercase">
                      <Check className="w-3 h-3" /> Com nota fiscal
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-[10px] font-bold uppercase">
                      <FileWarning className="w-3 h-3" /> Sem nota fiscal
                    </span>
                  )}
                </div>
              ) : (
                /* Pendente: vincular aqui */
                <div className="mt-3 flex flex-wrap gap-2 items-center bg-amber-50/50 border border-amber-200 rounded-xl px-3 py-2.5">
                  <p className="text-[11px] text-amber-700 mr-1 inline-flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5" /> Vincular a uma despesa:
                  </p>
                  <select
                    className="flex-1 min-w-[200px] px-3 py-2 border border-amber-200 bg-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 cursor-pointer"
                    value={vincularPara[comp.id] || ''}
                    onChange={e => setVincularPara(prev => ({ ...prev, [comp.id]: e.target.value }))}
                  >
                    <option value="">Selecione a despesa...</option>
                    {candidatas.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.nomeEmpresa || d.emitente || 'Despesa'} · {fmtValor(d.valor)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => vincular(comp.id)}
                    disabled={!vincularPara[comp.id] || vinculandoId === comp.id}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors disabled:opacity-40"
                  >
                    {vinculandoId === comp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                    Vincular
                  </button>
                  {candidatas.length === 0 && (
                    <p className="text-[11px] text-amber-700 w-full">
                      Nenhuma despesa sem comprovante disponível. Lance a despesa primeiro em "Lançar Despesa".
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 5. NOTA DE RODAPÉ */}
      <p className="text-[11px] text-stone-400 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
        Você pode deixar qualquer comprovante sem vínculo e resolvê-lo depois — ele permanece salvo como pendente.
      </p>

      {modalConciliacao && (
        <ModalConciliacao
          parcela={parcelaSelecionada}
          despesas={despesas}
          onFechar={() => setModalConciliacao(false)}
          onProcessado={() => carregarComprovantes(parcelaSelecionada.id)}
        />
      )}
    </div>
  );
}