import { useState, useEffect, Fragment } from 'react';
import { api, obterMensagemErro } from '../services/api';
import { categoriaQueryParam, getSetorAtivo } from '../services/setor';
import {
  Send, Briefcase, UserPlus, UploadCloud, FileText, Trash2,
  Loader2, CheckCircle2, Wallet, X, Edit2, Plus, Eye,
} from 'lucide-react';
import EditarDespesaInline from '../components/EditarDespesaInline';
import ModalNotaDigitalizada from '../components/ModalNotaDigitalizada';
import { visualizarArquivo } from '../services/visualizar';
import { rotuloMeses } from '../services/meses';

const heading = { fontFamily: "'Varela Round', sans-serif" };
const TODOS_OS_MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const CORES_SETOR = { ESPORTE: 'emerald', CULTURA: 'amber' };
const MES_ATUAL = TODOS_OS_MESES[new Date().getMonth()];

export default function LancarDespesa() {
  const [parcelas, setParcelas] = useState([]);
  const [parcelaSelecionada, setParcelaSelecionada] = useState(null);
  const [instrutores, setInstrutores] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [despesaEmEdicao, setDespesaEmEdicao] = useState(null);

  // Formulário
  const [formAberto, setFormAberto] = useState(false);
  const [modo, setModo] = useState('AVULSO'); // INSTRUTOR | AVULSO
  const [isSaving, setIsSaving] = useState(false);
  const [isLendoNota, setIsLendoNota] = useState(false);
  const [modalNota, setModalNota] = useState(null);

  // Campos instrutor
  const [instrutorId, setInstrutorId] = useState('');

  // Campos compartilhados
  const [mesCompetencia, setMesCompetencia] = useState('');
  const [observacao, setObservacao] = useState('');
  const [arquivoNotaFiscal, setArquivoNotaFiscal] = useState(null);
  const [anexosExtras, setAnexosExtras] = useState([]);
  const [dadosNota, setDadosNota] = useState({ emitente: '', valor: '', data: '', numero: '', descricao: '', documento: '' });
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const limite30MB = 30 * 1024 * 1024;

  // --- CARREGAMENTO ---
  const carregarParcelas = async () => {
    try {
      const res = await api.get('/parcelas', { params: categoriaQueryParam() });
      setParcelas(res.data);
      if (res.data.length > 0) {
        const manterSelecionada = parcelaSelecionada ? res.data.find(p => p.id === parcelaSelecionada.id) : null;
        const parcelaMesAtual = res.data.find(p => p.mesesReferencia && p.mesesReferencia.split(', ').includes(MES_ATUAL));
        setParcelaSelecionada(manterSelecionada || parcelaMesAtual || res.data[0]);
      } else {
        setParcelaSelecionada(null);
      }
    } catch (error) { console.error("Erro ao carregar parcelas:", error); }
  };

  const carregarInstrutores = async () => {
    try {
      const res = await api.get('/usuarios/instrutores', { params: categoriaQueryParam() });
      setInstrutores(res.data);
    } catch (error) { console.error("Erro ao carregar instrutores:", error); }
  };

  const carregarDespesas = async (parcelaId) => {
    try {
      const res = await api.get(`/despesas/parcela/${parcelaId}`);
      setDespesas(res.data);
    } catch (error) { console.error("Erro ao carregar despesas:", error); }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarParcelas();
    carregarInstrutores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const h = () => carregarParcelas(); window.addEventListener('setor-changed', h); return () => window.removeEventListener('setor-changed', h); }, []);
  useEffect(() => {
    if (parcelaSelecionada) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      carregarDespesas(parcelaSelecionada.id);
    }
  }, [parcelaSelecionada]);

  // --- RESET AO TROCAR ABA ---
  const resetarForm = () => {
    setArquivoNotaFiscal(null);
    setAnexosExtras([]);
    setDadosNota({ emitente: '', valor: '', data: '', numero: '', descricao: '' });
    setInstrutorId('');
    setMesCompetencia('');
    setNomeEmpresa('');
    setObservacao('');
    setIsLendoNota(false);
    setModalNota(null);
  };

  const trocarModo = (novoModo) => {
    resetarForm();
    setModo(novoModo);
  };

  const abrirForm = () => { resetarForm(); setFormAberto(true); };
  const fecharForm = () => { setFormAberto(false); resetarForm(); };

  // --- OCR ---
  const handleArquivoNota = async (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    if (arquivo.size > limite30MB) return alert("Arquivo excedeu o limite de 30MB.");
    if (arquivo.name.toLowerCase().endsWith('.doc') || arquivo.name.toLowerCase().endsWith('.docx')) {
      return alert("Documentos Word não são aceitos. Salve como PDF.");
    }

    setArquivoNotaFiscal(arquivo);
    setIsLendoNota(true);
    const formData = new FormData();
    formData.append("arquivo", arquivo);

    try {
      const response = await api.post("/anexos/ler-nota", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const extraido = response.data;
      let dataFormatada = extraido.data;
      if (dataFormatada && dataFormatada.includes("/")) {
        const [dia, mes, ano] = dataFormatada.split("/");
        if (ano && mes && dia) dataFormatada = `${ano}-${mes}-${dia}`;
      }
      setDadosNota({
        emitente: extraido.emitente || "",
        valor: extraido.valor || "",
        data: dataFormatada || "",
        numero: extraido.numero || "",
        descricao: extraido.descricao || "",
        documento: extraido.documento || "",
      });

      // Auto-preencher nome da empresa no modo avulso
      if (modo === 'AVULSO' && extraido.emitente) {
        setNomeEmpresa(extraido.emitente.trim());
      }

      // Auto-preencher mês de competência
      if (dataFormatada) {
        const mesNum = parseInt(dataFormatada.split('-')[1], 10);
        if (!isNaN(mesNum)) setMesCompetencia(String(mesNum).padStart(2, "0"));
      }
    } catch (error) {
      console.error("Erro na leitura OCR:", error);

      const status = error.response?.status;
      const mensagemErro = error.response?.data?.mensagem || "Não foi possível ler a nota automaticamente.";

      setDadosNota({ emitente: "", valor: "", data: "", numero: "", descricao: "", documento: "" });
      setModalNota(
        status === 422
          ? mensagemErro
          : "Não conseguimos extrair os dados automaticamente. Você pode visualizar a nota ou preencher as informações manualmente."
      );
    } finally {
      setIsLendoNota(false);
    }
  };

  const handleExtras = (e) => {
    const files = Array.from(e.target.files);
    const validos = files.filter((arquivo) => {
      const nome = arquivo.name.toLowerCase();
      if (nome.endsWith('.doc') || nome.endsWith('.docx')) { alert(`"${arquivo.name}" recusado. Salve como PDF.`); return false; }
      if (arquivo.size > limite30MB) { alert(`"${arquivo.name}" excedeu 30MB.`); return false; }
      return true;
    });
    setAnexosExtras([...anexosExtras, ...validos]);
  };

  const removerExtra = (i) => { const n = [...anexosExtras]; n.splice(i, 1); setAnexosExtras(n); };

  // --- MESSES DISPONÍVEIS ---
  const mesesDisponiveis = () => {
    const fonte = parcelaSelecionada?.mesesReferencia;
    const lista = fonte ? fonte.split(', ').filter(m => TODOS_OS_MESES.includes(m)) : [];
    return lista.length > 0 ? lista : TODOS_OS_MESES;
  };

  // --- SUBMIT ---
  const handleLancar = async (e) => {
    e.preventDefault();
    if (!arquivoNotaFiscal) return alert("Anexe a Nota Fiscal.");
    if (!dadosNota.emitente || !dadosNota.valor || !dadosNota.data || !dadosNota.numero) {
      return alert("Preencha todos os campos obrigatórios da nota.");
    }

    let parcelaId, anoVigencia;
    if (modo === 'INSTRUTOR') {
      if (!instrutorId) return alert("Selecione o instrutor.");
      if (!mesCompetencia) return alert("Selecione o mês de competência.");
      parcelaId = parcelaSelecionada.id;
      anoVigencia = parcelaSelecionada.anoVigencia;
    } else {
      if (!nomeEmpresa.trim()) return alert("Informe o nome da empresa.");
      if (!mesCompetencia) return alert("Selecione o mês de competência.");
      parcelaId = parcelaSelecionada.id;
      anoVigencia = parcelaSelecionada.anoVigencia;
    }

    const competencia = `${anoVigencia}-${mesCompetencia}`;
    const formData = new FormData();
    formData.append("parcelaId", parcelaId);
    if (modo === 'INSTRUTOR') formData.append("usuarioId", instrutorId);
    formData.append("dataCompetencia", competencia);
    formData.append("emitente", dadosNota.emitente);
    formData.append("valor", dadosNota.valor);
    formData.append("dataEmissao", dadosNota.data);
    formData.append("numero", dadosNota.numero);
    formData.append("descricao", dadosNota.descricao);
    if (modo === 'AVULSO') formData.append("nomeEmpresa", nomeEmpresa.trim());
    if (observacao.trim()) formData.append("observacao", observacao.trim());
    if (dadosNota.documento) formData.append("documentoFavorecido", dadosNota.documento);
    formData.append("notaFiscal", arquivoNotaFiscal);
    if (anexosExtras.length > 0) anexosExtras.forEach(a => formData.append("anexosExtras", a));

    setIsSaving(true);
    try {
      await api.post("/despesas/admin-lancar", formData, { headers: { "Content-Type": "multipart/form-data" } });
      alert(modo === 'INSTRUTOR' ? "Despesa lançada para o instrutor com sucesso!" : "Lançamento avulso registrado com sucesso!");
      fecharForm();
      await Promise.all([carregarDespesas(parcelaSelecionada.id), carregarParcelas()]);
    } catch (error) {
      console.error("Erro ao lançar despesa:", error);
      alert(obterMensagemErro(error, "Erro ao lançar a despesa."));
    } finally {
      setIsSaving(false);
    }
  };

  const formatarMoeda = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const corSetor = CORES_SETOR[getSetorAtivo()] || 'emerald';

  const handleExcluirDespesa = async (despesa) => {
    if (!window.confirm("Excluir esta despesa? O valor será devolvido ao saldo da parcela.")) return;
    try {
      await api.delete(`/despesas/${despesa.id}`);
      await Promise.all([carregarDespesas(parcelaSelecionada.id), carregarParcelas()]);
    } catch (error) {
      alert(obterMensagemErro(error, "Erro ao excluir a despesa."));
    }
  };

  const renderStatusReal = (status) => {
    const verificada = status && status !== 'AGUARDANDO_DOCUMENTOS';
    return verificada ? (
      <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide">
        <CheckCircle2 className="w-3 h-3" /> Verificada
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide">
        Não verificada
      </span>
    );
  };

  return (
    <div className="flex flex-col max-w-5xl w-full mx-auto p-6 lg:p-10 space-y-6">

      {/* 1. SELETOR DE PARCELA */}
      <div className="bg-white border border-cream-200 shadow-sm p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <h2 style={heading} className="text-sm font-bold text-brand-700 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Lançar Despesa
          </h2>
          <div className="flex items-center gap-3">
            <select
              className="bg-brand-50 border border-brand-200 text-stone-800 text-lg rounded-xl focus:ring-brand-500 focus:border-brand-500 block p-2.5 font-semibold outline-none cursor-pointer min-w-[200px]"
              value={parcelaSelecionada?.id || ''}
              onChange={(e) => setParcelaSelecionada(parcelas.find(x => x.id === e.target.value))}
            >
              {parcelas.map(p => (
                <option key={p.id} value={p.id}>
                  {p.categoria === 'ESPORTE' ? 'Esporte' : 'Cultura'} — Parcela 0{p.numero} {rotuloMeses(p.mesesReferencia)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {parcelaSelecionada && (
          <div className="bg-cream-100 p-4 rounded-2xl min-w-[280px] text-sm text-stone-700 border border-cream-200">
            <div className="flex justify-between mb-1"><span>Valor Inicial:</span><span className="font-medium">R$ {formatarMoeda(parcelaSelecionada.valorInicial)}</span></div>
            <div className="flex justify-between mb-2"><span>Total Gasto:</span><span className="font-medium text-amber-700">R$ {formatarMoeda(parcelaSelecionada.valorInicial - parcelaSelecionada.saldoAtual)}</span></div>
            <div className="h-px bg-cream-200 my-2 w-full" />
            <div className="flex justify-between text-base"><span className="font-bold text-stone-900">Saldo Disponível:</span><span className={`font-bold ${parcelaSelecionada.saldoAtual < 0 ? 'text-red-600' : 'text-stone-900'}`}>R$ {formatarMoeda(parcelaSelecionada.saldoAtual)}</span></div>
          </div>
        )}
      </div>

      {/* 2. BOTÃO DE LANÇAR */}
      {parcelaSelecionada && !formAberto && (
        <button onClick={abrirForm} className="w-full bg-brand-700 hover:bg-brand-800 text-white font-semibold py-4 rounded-2xl transition-colors flex justify-center items-center gap-2 text-sm shadow-sm">
          <Plus className="w-4 h-4" /> Lançar Nova Despesa nesta Parcela
        </button>
      )}

      {/* 3. FORMULÁRIO INLINE */}
      {formAberto && parcelaSelecionada && (
        <div className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden animate-in fade-in duration-150">
          <div className="px-5 py-4 border-b border-cream-200 flex justify-between items-center bg-cream-50">
            <h3 style={heading} className="font-semibold text-stone-800 text-sm flex items-center gap-2">
              <Send className="w-4 h-4 text-amber-500" /> Nova Despesa — Parcela 0{parcelaSelecionada.numero}
            </h3>
            <button onClick={fecharForm} className="text-stone-400 hover:text-stone-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Abas */}
          <div className="flex bg-cream-100 p-1.5 mx-5 mt-4 rounded-full border border-cream-200 w-fit">
            <button onClick={() => trocarModo('INSTRUTOR')} className={`flex items-center gap-2 px-5 py-2 rounded-full font-semibold text-sm transition-all ${modo === 'INSTRUTOR' ? `bg-white text-${corSetor}-700 shadow-sm` : 'text-stone-500 hover:text-stone-700'}`}>
              <UserPlus className="w-4 h-4" /> Para Instrutor
            </button>
            <button onClick={() => trocarModo('AVULSO')} className={`flex items-center gap-2 px-5 py-2 rounded-full font-semibold text-sm transition-all ${modo === 'AVULSO' ? 'bg-white text-amber-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
              <Briefcase className="w-4 h-4" /> Lançamento Avulso
            </button>
          </div>

          <form onSubmit={handleLancar} className="p-5 space-y-5">
            {/* CAMPOS ESPECÍFICOS POR MODO */}
            {modo === 'INSTRUTOR' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase">Instrutor Responsável</label>
                  <select required className="w-full px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 bg-white font-medium" value={instrutorId} onChange={(e) => setInstrutorId(e.target.value)}>
                    <option value="">Selecione um instrutor...</option>
                    {instrutores.map(i => (<option key={i.id} value={i.id}>{i.nome}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase">Mês de Competência</label>
                  <select required className="w-full px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 bg-white font-medium" value={mesCompetencia} onChange={(e) => setMesCompetencia(e.target.value)}>
                    <option value="">Selecione o mês...</option>
                    {mesesDisponiveis().map(m => (<option key={m} value={String(TODOS_OS_MESES.indexOf(m) + 1).padStart(2, "0")}>{m}</option>))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase">Nome da Empresa / Fornecedor</label>
                  <input type="text" required placeholder="Preenchido automaticamente pelo OCR..." className="w-full px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 font-medium" value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} />
                  {nomeEmpresa && <p className="text-[10px] text-amber-600 mt-1">Extraído da nota fiscal. Edite se necessário.</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase">Mês de Competência</label>
                  <select required className="w-full px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/40 bg-white font-medium" value={mesCompetencia} onChange={(e) => setMesCompetencia(e.target.value)}>
                    <option value="">Selecione o mês...</option>
                    {mesesDisponiveis().map(m => (<option key={m} value={String(TODOS_OS_MESES.indexOf(m) + 1).padStart(2, "0")}>{m}</option>))}
                  </select>
                </div>
              </div>
            )}

            {/* NOTA FISCAL + RELATÓRIOS EXTRAS lado a lado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* NOTA FISCAL */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase">Nota Fiscal (Obrigatório)</label>
                {isLendoNota ? (
                  <div className="border border-cream-200 bg-cream-50 p-6 rounded-2xl text-center flex flex-col items-center justify-center animate-in fade-in duration-150">
                    <Loader2 className="w-7 h-7 text-brand-700 animate-spin mb-2.5" />
                    <h3 className="font-semibold text-sm text-stone-700">Analisando nota fiscal...</h3>
                    <p className="text-xs text-stone-500 mt-1.5 leading-relaxed max-w-[220px]">
                      Não conseguimos extrair os dados automaticamente, aguarde nosso modelo extrair as informações.
                    </p>
                  </div>
                ) : arquivoNotaFiscal ? (
                  <div className="relative border border-emerald-200 bg-emerald-50 p-5 rounded-2xl text-center flex flex-col items-center justify-center">
                    <button
                      type="button"
                      onClick={() => visualizarArquivo(arquivoNotaFiscal)}
                      className="absolute top-3 right-3 p-1.5 bg-white rounded-xl hover:bg-cream-50 text-stone-500 hover:text-brand-700 transition-colors border border-cream-200 cursor-pointer"
                      title="Visualizar nota"
                      aria-label="Visualizar nota"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <CheckCircle2 className="w-7 h-7 text-emerald-600 mb-2" strokeWidth={1.5} />
                    <h3 className="font-semibold text-sm text-emerald-900">Nota Anexada</h3>
                    <p className="text-xs mt-1 truncate max-w-[180px] text-stone-500">{arquivoNotaFiscal.name}</p>
                    <label className="text-xs text-brand-700 hover:text-brand-800 hover:underline mt-2 cursor-pointer">
                      Trocar arquivo
                      <input type="file" accept=".pdf, image/*" onChange={handleArquivoNota} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <label className="border border-dashed border-cream-200 bg-cream-50 hover:bg-cream-100 hover:border-brand-400 transition-colors p-6 rounded-2xl text-center flex flex-col items-center justify-center cursor-pointer relative">
                    <input type="file" accept=".pdf, image/*" onChange={handleArquivoNota} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <UploadCloud className="w-7 h-7 text-brand-300 mb-2" strokeWidth={1.5} />
                    <h3 className="font-semibold text-sm text-stone-700">Arraste o PDF da Nota</h3>
                    <p className="text-xs text-stone-500 mt-1">PDF ou imagem (máx. 30MB)</p>
                  </label>
                )}
              </div>

              {/* RELATÓRIOS EXTRAS */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase">Relatórios / Anexos Extras</label>
                {anexosExtras.length === 0 ? (
                  <label className="border border-dashed border-cream-200 bg-cream-50 hover:bg-cream-100 hover:border-brand-400 transition-colors p-6 rounded-2xl text-center flex flex-col items-center justify-center cursor-pointer relative h-full min-h-[130px]">
                    <input type="file" multiple accept=".pdf, image/*" onChange={handleExtras} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <FileText className="w-7 h-7 text-brand-300 mb-2" strokeWidth={1.5} />
                    <h3 className="font-semibold text-sm text-stone-700">Listas, recibos, imagens...</h3>
                    <p className="text-xs text-stone-500 mt-1">Selecione vários arquivos</p>
                  </label>
                ) : (
                  <div className="border border-cream-200 bg-cream-50 p-3 rounded-2xl space-y-1.5 h-full">
                    <ul className="max-h-28 overflow-y-auto pr-1 space-y-1">
                      {anexosExtras.map((f, i) => (
                        <li key={i} className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-cream-200 text-xs">
                          <span className="truncate max-w-[140px] text-stone-700 font-medium">{f.name}</span>
                          <button type="button" onClick={() => removerExtra(i)} className="text-stone-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <label className="flex items-center justify-center gap-2 text-xs text-brand-700 hover:text-brand-800 border border-dashed border-cream-200 bg-white p-2 rounded-xl cursor-pointer hover:bg-cream-100 transition-colors mt-auto">
                      <input type="file" multiple accept=".pdf, image/*" onChange={handleExtras} className="hidden" />
                      <span>Adicionar mais arquivos</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* DADOS DA NOTA (OCR) */}
            {arquivoNotaFiscal && !isLendoNota && (
              <div className="border-t border-cream-200 pt-5 animate-in fade-in duration-150">
                <h3 style={heading} className="text-sm text-stone-900 mb-3">Dados Extraídos da Nota</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">Emitente / Fornecedor</label>
                    <input type="text" className="w-full px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" value={dadosNota.emitente} onChange={(e) => setDadosNota({ ...dadosNota, emitente: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">Valor (R$)</label>
                    <input type="text" className="w-full px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none font-medium focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" value={dadosNota.valor} onChange={(e) => setDadosNota({ ...dadosNota, valor: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">Data da Nota</label>
                    <input type="date" className="w-full px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" value={dadosNota.data} onChange={(e) => setDadosNota({ ...dadosNota, data: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">Número da NF</label>
                    <input type="text" className="w-full px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" value={dadosNota.numero} onChange={(e) => setDadosNota({ ...dadosNota, numero: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">Descrição</label>
                    <input type="text" className="w-full px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" value={dadosNota.descricao} onChange={(e) => setDadosNota({ ...dadosNota, descricao: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {/* OBSERVAÇÃO */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase">Observações (Opcional)</label>
              <textarea
                rows={2}
                placeholder={modo === 'AVULSO' ? "Ex: Nota referente a material de escritório..." : "Ex: Referente a evento em julho..."}
                className="w-full px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 resize-none placeholder:text-stone-400"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>

            <button type="submit" disabled={isSaving || isLendoNota || !arquivoNotaFiscal} className="w-full bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold py-3 rounded-xl transition-colors flex justify-center items-center gap-2 disabled:opacity-70">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {modo === 'INSTRUTOR' ? 'Lançar Despesa para Instrutor' : 'Registrar Lançamento Avulso'}
            </button>
          </form>
        </div>
      )}

      {/* 4. TABELA: PRESTAÇÃO EM TEMPO REAL */}
      {parcelaSelecionada && (
        <div className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-cream-200 bg-cream-50 flex items-center gap-2">
            <h3 style={heading} className="text-sm text-stone-800 font-semibold">Prestação em Tempo Real</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[560px]">
              <thead>
                <tr className="border-b-2 border-cream-200 text-stone-800 text-sm">
                  <th className="px-5 py-3 font-bold">Empresa</th>
                  <th className="px-5 py-3 font-bold">Competência</th>
                  <th className="px-5 py-3 font-bold">Valor (R$)</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {despesas.length === 0 ? (
                  <tr><td colSpan="5" className="px-5 py-12 text-center text-sm text-stone-500">Nenhuma prestação recebida para esta parcela.</td></tr>
                ) : (
                  despesas.map((d, index) => (
                    <Fragment key={d.id}>
                    <tr className={`${index % 2 === 0 ? 'bg-white' : 'bg-cream-50/50'} border-b border-cream-100`}>
                      <td className="px-5 py-3 text-sm">
                        <span className="font-medium text-stone-700">{d.nomeEmpresa || d.emitente || '—'}</span>
                        {d.observacao && <span className="block text-xs text-stone-400 mt-0.5">Obs: {d.observacao}</span>}
                      </td>
                      <td className="px-5 py-3 text-sm text-stone-500">{d.dataCompetencia}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-stone-900">R$ {formatarMoeda(d.valor)}</td>
                      <td className="px-5 py-3">{renderStatusReal(d.status)}</td>
                      <td className="px-5 py-3 text-right space-x-1">
                        <button onClick={() => setDespesaEmEdicao(despesaEmEdicao?.id === d.id ? null : d)} className="text-stone-400 hover:text-brand-700 transition-colors p-1.5 rounded-md" title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleExcluirDespesa(d)} className="text-stone-400 hover:text-red-500 transition-colors p-1.5 rounded-md" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    {despesaEmEdicao?.id === d.id && (
                      <EditarDespesaInline
                        despesa={d}
                        mesesDisponiveis={parcelaSelecionada?.mesesReferencia ? parcelaSelecionada.mesesReferencia.split(', ').filter(m => TODOS_OS_MESES.includes(m)) : []}
                        onCancelar={() => setDespesaEmEdicao(null)}
                        onSalvo={async () => { setDespesaEmEdicao(null); await carregarDespesas(parcelaSelecionada.id); await carregarParcelas(); }}
                      />
                    )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    {/* MODAL: NOTA NÃO LIDA */}
      {modalNota && (
        <ModalNotaDigitalizada
          mensagem={modalNota}
          onFechar={() => setModalNota(null)}
          onPreencherManual={() => setModalNota(null)}
        />
      )}
    </div>
  );
}
