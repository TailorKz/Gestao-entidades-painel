import { useState, useEffect, useCallback, useRef } from 'react';
import { api, obterMensagemErro } from '../services/api';
import { categoriaQueryParam, getSetorAtivo } from '../services/setor';
import {
  Landmark, Link2, Loader2, Check, X, FileText, CalendarDays,
  ShieldCheck, FileWarning, Layers, Eye, Trash2, CalendarRange, FileSpreadsheet, Unlink
} from 'lucide-react';
import ModalConciliacao from '../components/ModalConciliacao';

const NOMES_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const fmtValor = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};
const dataNota = (d) => d.dataEmissao
  ? fmtData(d.dataEmissao)
  : (d.dataCompetencia ? `comp. ${String(d.dataCompetencia).slice(0, 7).replace('-', '/')}` : 'sem data');

export default function ComprovantesGestor() {
  const setor = getSetorAtivo();
  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const anosDisponiveis = [anoAtual - 1, anoAtual, anoAtual + 1];

  const [ano, setAno] = useState(anoAtual);
  const [mes, setMes] = useState(agora.getMonth() + 1);

  const [sumario, setSumario] = useState([]);
  const [comprovantes, setComprovantes] = useState([]);
  const [candidatas, setCandidatas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [vincularPara, setVincularPara] = useState({});
  const [vinculandoId, setVinculandoId] = useState(null);

  const [modalConciliacao, setModalConciliacao] = useState(false);

  const categoria = (s) => s === 'ESPORTE' ? 'ESPORTE' : 'CULTURA';

  const carregarSumario = useCallback(async () => {
    try {
      const res = await api.get('/despesas/conciliacao/sumarizado', { params: { ...categoriaQueryParam(), ano } });
      setSumario(res.data);
    } catch { setSumario([]); }
  }, [ano]);

  const carregarMes = useCallback(async (anoEscolhido, mesEscolhido) => {
    setCarregando(true);
    try {
      const params = { ...categoriaQueryParam(), ano: anoEscolhido, mes: mesEscolhido };
      const res = await api.get('/despesas/conciliacao/comprovantes-mes', { params });
      setComprovantes(res.data);
    } catch { /* silencioso */ }
    finally { setCarregando(false); }
  }, []);

  // As candidatas (despesas sem comprovante) só dependem do setor — não do mês.
  const carregarCandidatas = useCallback(async () => {
    try {
      const res = await api.get('/despesas/conciliacao/candidatas', { params: categoriaQueryParam() });
      setCandidatas(res.data);
    } catch { setCandidatas([]); }
  }, []);

  const anoRef = useRef(ano);
  const mesRef = useRef(mes);
  useEffect(() => { anoRef.current = ano; mesRef.current = mes; }, [ano, mes]);

  // Trocar de mês/ano carrega SOMENTE aquele mês (no instante do clique).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarMes(ano, mes);
  }, [ano, mes, carregarMes]);

  // Sumário do ano: carrega na montagem e quando o ano muda.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarSumario();
  }, [carregarSumario]);

  // Candidatas + reagir à troca de setor (uma única vez registrado o listener).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarCandidatas();
    const aoMudarSetor = () => {
      carregarCandidatas();
      carregarSumario();
      carregarMes(anoRef.current, mesRef.current);
    };
    window.addEventListener('setor-changed', aoMudarSetor);
    return () => window.removeEventListener('setor-changed', aoMudarSetor);
  }, [carregarCandidatas, carregarSumario, carregarMes]);

  const totalMeses = sumario.reduce((acc, m) => acc + m.total, 0);
  const totalVinculados = sumario.reduce((acc, m) => acc + m.vinculados, 0);
  const totalPendentes = sumario.reduce((acc, m) => acc + m.pendentes, 0);

  const mesCorrente = sumario.find(m => m.mes === mes);
  const totalDoMes = (mesCorrente ? mesCorrente.total : 0) || comprovantes.length;
  const pendentesDoMes = mesCorrente ? mesCorrente.pendentes : 0;
  const vinculadosDoMes = mesCorrente ? mesCorrente.vinculados : 0;

  const vincular = async (comprovanteId, despesaId) => {
    if (!despesaId) return;
    setVinculandoId(comprovanteId);
    try {
      await api.post("/despesas/conciliacao/vincular", {
        comprovanteId,
        despesaId,
        categoria: categoria(setor),
      });
      await Promise.all([carregarMes(ano, mes), carregarSumario(), carregarCandidatas()]);
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

  const exclusaoConfirmacao = (comp) => comp.despesaId
    ? "Excluir este comprovante? Ele será desvinculado da despesa e o arquivo apagado do armazenamento. Para apenas desvincular, use 'Desvincular'."
    : "Excluir este comprovante? O arquivo será apagado do armazenamento.";

  const excluir = async (comp) => {
    if (!window.confirm(exclusaoConfirmacao(comp))) return;
    try {
      await api.delete(`/despesas/conciliacao/comprovantes/${comp.id}`);
      await Promise.all([carregarMes(ano, mes), carregarSumario(), carregarCandidatas()]);
    } catch (error) {
      alert(obterMensagemErro(error, "Erro ao excluir o comprovante."));
    }
  };

  const desvincular = async (comp) => {
    if (!window.confirm("Desvincular este comprovante da despesa? Ele permanece salvo e volta a aguardar vínculo.")) return;
    try {
      await api.post(`/despesas/conciliacao/comprovantes/${comp.id}/desvincular`);
      await Promise.all([carregarMes(ano, mes), carregarSumario(), carregarCandidatas()]);
    } catch (error) {
      alert(obterMensagemErro(error, "Erro ao desvincular o comprovante."));
    }
  };

  const excluirMes = async () => {
    if (!comprovantes.length) return;
    const confirmacao = `Excluir os ${comprovantes.length} comprovantes de ${NOMES_MESES[mes - 1]}/${ano} do setor de ${setor === 'ESPORTE' ? 'esporte' : 'cultura'}? Os PDFs serão apagados do armazenamento e as despesas vinculadas voltam a aguardar novo vínculo.`;
    if (!window.confirm(confirmacao)) return;
    try {
      await api.delete('/despesas/conciliacao/comprovantes-mes', {
        params: { ...categoriaQueryParam(), ano, mes },
      });
      await Promise.all([carregarMes(ano, mes), carregarSumario(), carregarCandidatas()]);
    } catch (error) {
      alert(obterMensagemErro(error, "Erro ao excluir os comprovantes do mês."));
    }
  };

  const despesasPorParcela = candidatas.reduce((acc, d) => {
    const n = d.numeroParcela ?? 0;
    (acc[n] ||= []).push(d);
    return acc;
  }, {});

  const parcelasCandidatas = Object.keys(despesasPorParcela)
    .sort((a, b) => Number(a) - Number(b))
    .map((n) => ({ numero: n, despesas: despesasPorParcela[n] }));

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

      {/* 1. CABEÇALHO + ANO */}
      <div className="bg-white border border-cream-200 shadow-sm p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full">
          <h2 className="text-sm font-bold text-brand-700 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Landmark className="w-4 h-4" /> Comprovantes por Mês — {setor === 'ESPORTE' ? 'Esporte' : 'Cultura'}
          </h2>
          <p className="text-xs text-stone-500">
            Importe os comprovantes do Banco do Brasil agrupados pelo mês do débito. Cada comprovante é cruzado com as despesas do setor e vinculado à parcela da despesa correspondente.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Ano</label>
          <select
            className="bg-brand-50 border border-brand-200 text-stone-800 text-sm rounded-xl focus:ring-brand-500 focus:border-brand-500 block p-2 font-semibold outline-none cursor-pointer"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
          >
            {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* 2. RESUMO DO ANO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-cream-200 rounded-2xl p-4">
          <p className="text-[11px] text-stone-500 font-semibold uppercase tracking-wide">Comprovantes em {ano}</p>
          <p className="text-2xl font-bold text-stone-900 mt-1">{totalMeses}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wide">Vinculados</p>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{totalVinculados}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-[11px] text-amber-700 font-semibold uppercase tracking-wide">Pendentes de vínculo</p>
          <p className="text-2xl font-bold text-amber-800 mt-1">{totalPendentes}</p>
        </div>
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4">
          <p className="text-[11px] text-brand-700 font-semibold uppercase tracking-wide">No mês de {NOMES_MESES[mes - 1]}</p>
          <p className="text-2xl font-bold text-brand-800 mt-1">{totalDoMes}</p>
        </div>
      </div>

      {/* 3. MALHA JAN-DEZ */}
      <div className="bg-white border border-cream-200 rounded-2xl p-5 shadow-sm">
        <p className="text-[11px] text-stone-500 font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <CalendarRange className="w-3.5 h-3.5 text-brand-600" /> Selecione o mês
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
            const info = sumario.find(x => x.mes === m);
            const total = info ? info.total : 0;
            const pend = info ? info.pendentes : 0;
            const selecionado = mes === m;
            return (
              <button
                key={m}
                onClick={() => { setMes(m); setVincularPara({}); }}
                className={`relative flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 transition-all ${
                  selecionado
                    ? 'bg-brand-700 border-brand-800 text-white shadow-md'
                    : 'bg-white border-cream-200 text-stone-700 hover:border-brand-300 hover:bg-brand-50'
                }`}
              >
                <span className="text-sm font-bold">{MESES_CURTOS[m - 1]}</span>
                <span className={`text-[11px] ${selecionado ? 'text-brand-100' : 'text-stone-400'}`}>
                  {total === 0 ? '—' : `${total} doc${total > 1 ? 's' : ''}`}
                </span>
                {pend > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow ${selecionado ? 'bg-amber-400 text-amber-950' : 'bg-amber-500 text-white'}`}>
                    {pend}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. PAINEL DO MÊS */}
      {mesCorrente && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-stone-800">Comprovantes de {NOMES_MESES[mes - 1]}/{ano}</h3>
            <span className="inline-flex items-center gap-1 bg-cream-100 border border-cream-200 text-stone-600 text-xs px-2.5 py-1 rounded-full">
              <FileSpreadsheet className="w-3.5 h-3.5 text-brand-600" />
              {vinculadosDoMes} vinculados · {pendentesDoMes} pendentes
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={excluirMes}
              disabled={comprovantes.length === 0}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={`Excluir todos os comprovantes de ${NOMES_MESES[mes - 1]}/${ano}`}
            >
              <Trash2 className="w-4 h-4" /> Excluir todos ({comprovantes.length})
            </button>
            <button
              onClick={() => setModalConciliacao(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 transition-colors shadow-sm"
            >
              <Layers className="w-4 h-4" /> Importar comprovantes de {NOMES_MESES[mes - 1]}
            </button>
          </div>
        </div>
      )}

      {/* 5. LISTA DO MÊS */}
      {carregando && !comprovantes.length ? (
        <div className="flex items-center justify-center gap-2 text-stone-500 text-sm py-16">
          <Loader2 className="w-5 h-5 animate-spin text-brand-600" /> Carregando comprovantes...
        </div>
      ) : comprovantes.length === 0 ? (
        <div className="bg-white border border-cream-200 rounded-2xl p-10 text-center text-stone-400 text-sm">
          Nenhum comprovante importado em {NOMES_MESES[mes - 1]}/{ano}. Use o botão acima para importar os PDFs ou o .zip do Banco do Brasil.
        </div>
      ) : (
        <div className="space-y-3">
          {comprovantes.map(comp => (
            <div key={comp.id} className="bg-white border border-cream-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
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
                      <span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Débito em {fmtData(comp.dataPagamento)}</span>
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
                <div className="mt-3 bg-emerald-50/60 border border-emerald-200 rounded-xl px-3.5 py-3 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide inline-flex items-center gap-1.5">
                        <FileText className="w-3 h-3" /> Nota (despesa)
                      </p>
                      <p className="text-sm font-semibold text-emerald-950 truncate">{comp.despesaDescricao || '—'}</p>
                      <p className="text-xs text-emerald-800 inline-flex items-center gap-1.5 flex-wrap">
                        <CalendarDays className="w-3 h-3" />
                        {comp.despesaDataEmissao ? fmtData(comp.despesaDataEmissao) : 'sem data de emissão'}
                        <span>·</span>
                        <span className="font-semibold">{fmtValor(comp.despesaValor ?? comp.valor)}</span>
                      </p>
                    </div>
                    <div className="shrink-0">
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
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-100 pt-2">
                    <p className="text-[11px] text-emerald-800 inline-flex items-center gap-1.5 flex-wrap">
                      <Link2 className="w-3 h-3 shrink-0" />
                      Comprovante <strong>{fmtValor(comp.valor)}</strong> · débito em {fmtData(comp.dataPagamento)}
                      {comp.numeroParcela ? (
                        <span className="text-emerald-700">· entrou na Parcela 0{comp.numeroParcela}</span>
                      ) : null}
                    </p>
                    <button
                      onClick={() => desvincular(comp)}
                      disabled={vinculandoId === comp.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-[11px] font-bold hover:bg-emerald-100 transition-colors disabled:opacity-40"
                      title="Desvincular (o comprovante permanece salvo)"
                    >
                      <Unlink className="w-3.5 h-3.5" /> Desvincular
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2 items-center bg-amber-50/50 border border-amber-200 rounded-xl px-3 py-2.5">
                  <p className="text-[11px] text-amber-700 mr-1 inline-flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5" /> Vincular a uma despesa:
                  </p>
                  <select
                    className="flex-1 min-w-[280px] px-3 py-2 border border-amber-200 bg-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 cursor-pointer"
                    value={vincularPara[comp.id] || ''}
                    onChange={e => setVincularPara(prev => ({ ...prev, [comp.id]: e.target.value }))}
                  >
                    <option value="">Selecione a parcela e a despesa...</option>
                    {parcelasCandidatas.map(({ numero, despesas }) => (
                      <optgroup key={numero} label={`Parcela 0${numero} — ${despesas.length} despesa(s)`}>
                        {despesas.map(d => (
                          <option key={d.id} value={d.id}>
                            {dataNota(d)} · {fmtValor(d.valor)} · {d.nomeEmpresa || d.emitente || 'Despesa'}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <button
                    onClick={() => vincular(comp.id, vincularPara[comp.id])}
                    disabled={!vincularPara[comp.id] || vinculandoId === comp.id}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors disabled:opacity-40"
                  >
                    {vinculandoId === comp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                    Vincular
                  </button>
                  {candidatas.length === 0 && (
                    <p className="text-[11px] text-amber-700 w-full">
                      Nenhuma despesa sem comprovante disponível no setor. Lance a despesa primeiro em "Lançar Despesa".
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 6. NOTA DE RODAPÉ */}
      <p className="text-[11px] text-stone-400 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
        O auto-vínculo cruza valor exato + CPF/CNPJ ou primeiro nome, e só vincula quando a nota é
        “esperada” para o débito (emitida há pouco tempo ou competência no mês/anterior ao débito).
        Se algum vínculo sair errado, use “Desvincular” e o comprovante volta a aguardar — nada é apagado.
      </p>

      {modalConciliacao && (
        <ModalConciliacao
          categoria={categoria(setor)}
          ano={ano}
          mes={mes}
          candidatas={candidatas}
          onFechar={() => setModalConciliacao(false)}
          onProcessado={() => Promise.all([carregarMes(ano, mes), carregarSumario(), carregarCandidatas()])}
        />
      )}
    </div>
  );
}