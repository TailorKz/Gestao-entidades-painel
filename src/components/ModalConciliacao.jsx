import { useState, useEffect, useRef, useCallback } from 'react';
import { api, obterMensagemErro } from '../services/api';
import { UploadCloud, Loader2, Check, X, FileText, AlertTriangle, Link2, Landmark } from 'lucide-react';

const heading = { fontFamily: "'Varela Round', sans-serif" };

const fmtValor = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};
const dataNota = (d) => d.dataEmissao
  ? fmtData(d.dataEmissao)
  : (d.dataCompetencia ? `comp. ${String(d.dataCompetencia).slice(0, 7).replace('-', '/')}` : 'sem data');

export default function ModalConciliacao({ parcela, despesas, candidatas, categoria, ano, mes, onFechar, onProcessado }) {
  // Modo legado (por parcela) é usado em PrestacaoGestor; o modo novo (por mês) em ComprovantesGestor
  const legado = Boolean(parcela);

  const [arquivos, setArquivos] = useState([]);
  const [arrastando, setArrastando] = useState(false);
  const [lendo, setLendo] = useState(false);
  const [vinculados, setVinculados] = useState([]);
  const [pendentes, setPendentes] = useState([]);
  const [duplicados, setDuplicados] = useState(0);
  const [erros, setErros] = useState([]);
  const [processou, setProcessou] = useState(false);
  const [vincularPara, setVincularPara] = useState({});
  const [vinculandoId, setVinculandoId] = useState(null);
  const inputRef = useRef(null);

  // Despesas que ainda aceitam comprovante (dropdown)
  const candidatasOrigem = legado
    ? (despesas || []).filter(d => !d.temComprovante)
    : (candidatas || []);

  const despesasPorParcela = candidatasOrigem.reduce((acc, d) => {
    const n = d.numeroParcela ?? 0;
    (acc[n] ||= []).push(d);
    return acc;
  }, {});
  const parcelasCandidatas = Object.keys(despesasPorParcela)
    .sort((a, b) => Number(a) - Number(b))
    .map((n) => ({ numero: n, despesas: despesasPorParcela[n] }));

  const carregarPendentesLegado = useCallback(async () => {
    if (!legado) return;
    try {
      const res = await api.get(`/despesas/${parcela.id}/comprovantes-pendentes`);
      setPendentes(res.data);
    } catch {
      setPendentes([]);
    }
  }, [legado, parcela]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarPendentesLegado();
  }, [carregarPendentesLegado]);

  const adicionarArquivos = (lista) => {
    const novos = Array.from(lista).filter(f => {
      const nome = f.name.toLowerCase();
      return nome.endsWith('.pdf') || nome.endsWith('.zip');
    });
    const recusados = Array.from(lista).length - novos.length;
    if (recusados > 0) alert(`${recusados} arquivo(s) recusado(s). Envie apenas PDFs ou o .zip do Banco do Brasil.`);
    setArquivos(prev => [...prev, ...novos]);
  };

  const processar = async () => {
    if (arquivos.length === 0) return alert("Selecione os comprovantes (PDFs ou o .zip).");
    setLendo(true);
    setProcessou(false);
    setVincularPara({});

    const formData = new FormData();
    let url;
    if (legado) {
      formData.append("parcelaId", parcela.id);
      arquivos.forEach(a => formData.append("arquivos", a));
      url = "/despesas/conciliacao/processar-lote";
    } else {
      formData.append("categoria", categoria);
      formData.append("ano", String(ano));
      formData.append("mes", String(mes));
      arquivos.forEach(a => formData.append("arquivos", a));
      url = "/despesas/conciliacao/importar-mes";
    }

    try {
      const res = await api.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setVinculados(res.data.vinculados || []);
      setDuplicados(res.data.ignoradosDuplicados || 0);
      setErros(res.data.erros || []);
      setProcessou(true);
      setArquivos([]);
      setPendentes(res.data.pendentes || []);
      await onProcessado();
    } catch (error) {
      alert(obterMensagemErro(error, "Erro ao processar os comprovantes."));
    } finally {
      setLendo(false);
    }
  };

  const vincular = async (comprovanteId) => {
    const despesaId = vincularPara[comprovanteId];
    if (!despesaId) return;
    setVinculandoId(comprovanteId);
    try {
      const body = legado
        ? { parcelaId: parcela.id, comprovanteId, despesaId }
        : { comprovanteId, despesaId, categoria };
      const res = await api.post("/despesas/conciliacao/vincular", body);
      const novo = res.data;
      setVinculados(prev => [...prev, novo]);
      setPendentes(prev => prev.filter(p => p.id !== comprovanteId));
      setVincularPara(prev => ({ ...prev, [comprovanteId]: '' }));
      await onProcessado();
    } catch (error) {
      alert(obterMensagemErro(error, "Erro ao vincular o comprovante."));
    } finally {
      setVinculandoId(null);
    }
  };

  const titulo = legado
    ? "Conciliar Comprovantes BB"
    : `Importar Comprovantes BB — ${String(mes).padStart(2, '0')}/${ano}`;
  const subtitulo = legado
    ? "Anexe os comprovantes para vincular às despesas da parcela."
    : `Comprovantes deste mês serão cruzados com as despesas do ${categoria === 'ESPORTE' ? 'esporte' : 'cultura'}.`;
  const rotuloBotao = legado
    ? (lendo ? "Lendo comprovantes e cruzando com as despesas..." : `Processar ${arquivos.length} comprovante(s)`)
    : (lendo ? "Lendo comprovantes e cruzando com as despesas do setor..." : `Processar ${arquivos.length} comprovante(s) para ${String(mes).padStart(2, '0')}/${ano}`);

  return (
    <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-cream-200 shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-cream-200 flex justify-between items-center bg-cream-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
              <Landmark className="w-4 h-4 text-brand-700" />
            </div>
            <div>
              <h3 style={heading} className="font-semibold text-stone-800 text-sm">{titulo}</h3>
              <p className="text-[11px] text-stone-500">{subtitulo}</p>
            </div>
          </div>
          <button onClick={onFechar} className="text-stone-400 hover:text-stone-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-6 overflow-y-auto">
          {/* DROPZONE */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => { e.preventDefault(); setArrastando(false); adicionarArquivos(e.dataTransfer.files); }}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${arrastando ? 'border-brand-500 bg-brand-50' : 'border-cream-300 bg-white hover:border-brand-300 hover:bg-brand-50/30'}`}
          >
            <input ref={inputRef} type="file" multiple accept=".pdf,.zip" className="hidden" onChange={(e) => { adicionarArquivos(e.target.files); e.target.value = ''; }} />
            <UploadCloud className="w-8 h-8 text-brand-600 mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-sm text-stone-600 font-medium">Arraste os PDFs aqui <span className="text-stone-400">ou o</span> .zip</p>
            <p className="text-[11px] text-stone-400 mt-1">
              {legado
                ? "Você pode soltar os comprovantes individuais ou o arquivo ZIP baixado no Banco do Brasil."
                : "A data do débito (DÉBITO EM / data da transferência) de cada comprovante é lida automaticamente."}
            </p>
          </div>

          {arquivos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {arquivos.map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 bg-cream-100 border border-cream-200 text-stone-600 text-xs px-2.5 py-1.5 rounded-lg">
                  <FileText className="w-3 h-3" /> {a.name}
                  <button onClick={() => setArquivos(arquivos.filter((_, j) => j !== i))} className="text-stone-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <button
            onClick={processar}
            disabled={arquivos.length === 0 || lendo}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {lendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {rotuloBotao}
          </button>

          {duplicados > 0 && processou && (
            <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              {duplicados} arquivo(s) ignorados por já terem sido importados antes.
            </p>
          )}

          {erros.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <p className="text-[11px] font-bold text-red-700 mb-1">Alguns arquivos não puderam ser lidos:</p>
              <ul className="text-[11px] text-red-600 space-y-0.5 list-disc pl-4">
                {erros.map((erro, i) => <li key={i}>{erro}</li>)}
              </ul>
            </div>
          )}

          {/* CONCILIADOS */}
          {vinculados.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Conciliados automaticamente ({vinculados.length})
              </h4>
              <div className="border border-emerald-200 bg-emerald-50/60 rounded-2xl divide-y divide-emerald-100 overflow-hidden">
                {vinculados.map(c => (
                  <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-emerald-900">{c.favorecido || c.nomeArquivo}</p>
                      <p className="text-xs text-emerald-700">→ Vinculado à despesa: {c.despesaDescricao || '—'}
                        {c.numeroParcela ? <span> · Parcela 0{c.numeroParcela}</span> : null} · {fmtData(c.dataPagamento)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-emerald-800">{fmtValor(c.valor)}</span>
                      <span className="inline-flex items-center gap-1 bg-emerald-200 text-emerald-900 px-2 py-1 rounded-full text-[10px] font-bold uppercase">
                        <Check className="w-3 h-3" /> OK
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PENDENTES */}
          {pendentes.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Precisam de vínculo manual ({pendentes.length})
              </h4>
              <div className="border border-amber-200 bg-amber-50/40 rounded-2xl divide-y divide-amber-100 overflow-hidden">
                {pendentes.map(c => (
                  <div key={c.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-800">{c.favorecido || c.nomeArquivo}</p>
                        <p className="text-xs text-stone-500">{c.documentoFavorecido || 'sem CPF/CNPJ'} · Débito em {fmtData(c.dataPagamento)} · {c.nomeArquivo}</p>
                      </div>
                      <span className="text-sm font-bold text-stone-900 shrink-0">{fmtValor(c.valor)}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                      <select
                        className="flex-1 min-w-0 px-3 py-2 border border-amber-200 bg-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 cursor-pointer"
                        value={vincularPara[c.id] || ''}
                        onChange={e => setVincularPara(prev => ({ ...prev, [c.id]: e.target.value }))}
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
                        onClick={() => vincular(c.id)}
                        disabled={!vincularPara[c.id] || vinculandoId === c.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors disabled:opacity-40"
                      >
                        {vinculandoId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                        Vincular
                      </button>
                    </div>
                    {candidatasOrigem.length === 0 && (
                      <p className="text-[11px] text-amber-700 mt-2">
                        {legado ? "Nenhuma despesa sem comprovante disponível nesta parcela." : "Nenhuma despesa sem comprovante disponível no setor."}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!lendo && !processou && arquivos.length === 0 && vinculados.length === 0 && pendentes.length === 0 && (
            <div className="flex items-center justify-center gap-2 text-stone-400 text-sm py-4">
              <AlertTriangle className="w-4 h-4" />
              Nenhum comprovante importado ainda nesta sessão.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}