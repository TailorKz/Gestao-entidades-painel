import { useState, useEffect, useRef } from "react";
import { api, obterMensagemErro } from "../services/api";
import { TIPOS_DOCUMENTO_GERR } from "../services/tiposDocumento";
import {
  Edit2,
  CheckCircle2,
  Plus,
  Trash2,
  AlertTriangle,
  FileText,
  Folder,
  UploadCloud,
  Loader2,
  LogOut,
  CalendarDays,
  Wallet,
  ShieldCheck,
  Activity,
  Music,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ModalNotaDigitalizada from "../components/ModalNotaDigitalizada";
import { visualizarArquivo } from "../services/visualizar";

const heading = { fontFamily: "'Varela Round', sans-serif" };

const TODOS_OS_MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function PortalInstrutor() {
  const navigate = useNavigate();

  const userName = localStorage.getItem("usuarioNome") || "Instrutor";
  const userInitials = userName.charAt(0).toUpperCase();
  const minhaCategoria = localStorage.getItem("usuarioCategoria") || "ESPORTE";
  const IconeSetor = minhaCategoria === "ESPORTE" ? Activity : Music;

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // Fluxo de pastas baseado em parcelas reais
  const [parcelas, setParcelas] = useState([]);
  const [carregandoParcelas, setCarregandoParcelas] = useState(true);
  const [parcelaSelecionada, setParcelaSelecionada] = useState(null);
  const [mesSelecionado, setMesSelecionado] = useState(null);

  const [isEditing, setIsEditing] = useState(false);

  // Histórico de prestações
  const [minhasPrestacoes, setMinhasPrestacoes] = useState([]);

  // Estados do Motor de OCR
  const [isLendoNota, setIsLendoNota] = useState(false);
  const [showFormulario, setShowFormulario] = useState(false);
  const [modalNota, setModalNota] = useState(null);

  const [dadosNota, setDadosNota] = useState({
    emitente: "",
    valor: "",
    data: "",
    numero: "",
    descricao: "",
  });
  const [tipoDocumento, setTipoDocumento] = useState("");

  // Arquivos
  const [arquivoNotaFiscal, setArquivoNotaFiscal] = useState(null);
  const [anexosExtras, setAnexosExtras] = useState([]);

  const carregarParcelas = async () => {
    setCarregandoParcelas(true);
    try {
      const params = minhaCategoria && minhaCategoria !== 'N/A' ? { categoria: minhaCategoria } : {};
      const res = await api.get("/parcelas", { params });
      setParcelas(res.data);
    } catch (error) {
      console.error("Erro ao carregar parcelas:", error);
    } finally {
      setCarregandoParcelas(false);
    }
  };

  const carregarMinhasPrestacoes = async () => {
    const usuarioId = localStorage.getItem('usuarioId');
    if (!usuarioId) return;
    try {
      const res = await api.get(`/despesas/usuario/${usuarioId}`);
      setMinhasPrestacoes(res.data);
    } catch (error) {
      console.error("Erro ao carregar prestações:", error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarParcelas();
    carregarMinhasPrestacoes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entrarNaParcela = (parcela) => {
    setParcelaSelecionada(parcela);
    resetarFluxoUpload();
  };

  const voltarParaParcelas = () => {
    setParcelaSelecionada(null);
    setMesSelecionado(null);
    resetarFluxoUpload();
  };

  const voltarParaMeses = () => {
    setMesSelecionado(null);
    resetarFluxoUpload();
  };

  const resetarFluxoUpload = () => {
    setArquivoNotaFiscal(null);
    setAnexosExtras([]);
    setShowFormulario(false);
    setIsEditing(false);
    setMesSelecionado(null);
  };

  const mesesDaParcela = parcelaSelecionada?.mesesReferencia
      ? parcelaSelecionada.mesesReferencia.split(", ").filter(m => TODOS_OS_MESES.includes(m))
      : [];

  const limite30MB = 30 * 1024 * 1024;

  const handleArquivoSelecionado = async (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    if (arquivo.size > limite30MB) {
      return alert("O arquivo excedeu o limite de 30MB. Reduza o tamanho ou divida em partes.");
    }
    const nome = arquivo.name.toLowerCase();
    if (nome.endsWith(".doc") || nome.endsWith(".docx")) {
      return alert("Documentos Word não são aceitos pelo sistema. Por favor, salve como PDF.");
    }

    setArquivoNotaFiscal(arquivo);
    setIsLendoNota(true);
    setShowFormulario(false);

    const controller = new AbortController();
    abortLeituraNotaRef.current = controller;

    const formData = new FormData();
    formData.append("arquivo", arquivo);

    try {
      const response = await api.post("/anexos/ler-nota", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        signal: controller.signal,
      });

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
      setTipoDocumento(extraido.tipoDocumento || "");
    } catch (error) {
      if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') return;

      console.error("Erro na leitura do OCR:", error);
      
      // Pega a mensagem do Java (ex: "Documento digitalizado...") ou usa uma padrão
      const status = error.response?.status;
      const mensagemErro = error.response?.data?.mensagem || "Não foi possível ler a nota automaticamente.";

      // Força a gaveta a abrir para edição manual depois que o usuário escolher
      setShowFormulario(true);
      setIsEditing(false);

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

  const abortLeituraNotaRef = useRef(null);

  const cancelarLeituraNota = () => {
    abortLeituraNotaRef.current?.abort();
    abortLeituraNotaRef.current = null;
    setIsLendoNota(false);
    setShowFormulario(true);
    setIsEditing(false);
  };

  const handleAnexosExtras = (e) => {
    const files = Array.from(e.target.files);

    const arquivosValidos = files.filter((arquivo) => {
      const nome = arquivo.name.toLowerCase();

      if (nome.endsWith(".doc") || nome.endsWith(".docx")) {
        alert(`O arquivo "${arquivo.name}" foi recusado. Documentos Word não são aceitos, salve como PDF.`);
        return false;
      }

      if (arquivo.size > limite30MB) {
        alert(`O arquivo "${arquivo.name}" excedeu o limite de 30MB e foi recusado.`);
        return false;
      }

      return true;
    });

    setAnexosExtras([...anexosExtras, ...arquivosValidos]);
  };

  const removerAnexo = (index) => {
    const novosAnexos = [...anexosExtras];
    novosAnexos.splice(index, 1);
    setAnexosExtras(novosAnexos);
  };

  const handleConfirmarEnvio = async (e) => {
    e.preventDefault();

    if (!arquivoNotaFiscal) {
      return alert("Por favor, anexe a Nota Fiscal.");
    }
    if (!dadosNota.emitente || !dadosNota.valor || !dadosNota.data || !dadosNota.numero) {
      setShowFormulario(true);
      return alert("Preencha todos os campos obrigatórios da nota antes de enviar.");
    }

    const numeroMes = String(TODOS_OS_MESES.indexOf(mesSelecionado) + 1).padStart(2, "0");
    const competencia = `${parcelaSelecionada.anoVigencia}-${numeroMes}`;

    const formData = new FormData();
    formData.append("parcelaId", parcelaSelecionada.id);
    formData.append("usuarioId", localStorage.getItem("usuarioId"));
    formData.append("dataCompetencia", competencia);

    formData.append("emitente", dadosNota.emitente);
    formData.append("valor", dadosNota.valor);
    formData.append("dataEmissao", dadosNota.data);
formData.append("numero", dadosNota.numero);
    formData.append("descricao", dadosNota.descricao);
    if (dadosNota.documento) formData.append("documentoFavorecido", dadosNota.documento);
    if (tipoDocumento) formData.append("tipoDocumento", tipoDocumento);
    formData.append("notaFiscal", arquivoNotaFiscal);

    if (anexosExtras.length > 0) {
      anexosExtras.forEach((anexo) => {
        formData.append("anexosExtras", anexo);
      });
    }

    try {
      const response = await api.post("/despesas/com-anexos", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Despesa salva com sucesso:", response.data);
      alert("Prestação de contas salva com sucesso!");

      voltarParaParcelas();
    } catch (error) {
      console.error("Erro ao salvar despesa:", error);
      alert(obterMensagemErro(error, "Erro ao enviar a prestação de contas. Verifique o console."));
    }
  };

  const isLocked = !isEditing;
  const temPendenciaOCR =
    arquivoNotaFiscal &&
    (!dadosNota.emitente || !dadosNota.valor || !dadosNota.data || !dadosNota.numero);

  return (
    <div className="min-h-screen bg-warm flex flex-col">
      {/* CABEÇALHO AMIGÁVEL */}
      <header className="bg-cream-50 border-b border-cream-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-700 text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 style={heading} className="text-base text-stone-800 leading-tight">
                Área do Instrutor
              </h1>
              <p className="text-[11px] text-stone-500 leading-tight">
                Vinculado ao{" "}
                <span className="font-medium text-brand-700">INDACI</span>
                <span className="inline-flex items-center gap-1 ml-1.5 text-stone-400">
                  <IconeSetor className="w-3 h-3" /> {minhaCategoria === 'ESPORTE' ? 'Esporte' : 'Cultura'}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-500 font-medium">{userName}</span>
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
              {userInitials}
            </div>
            <button
              onClick={handleLogout}
              className="ml-1 p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="Sair do Portal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-8">
        <div className="flex items-center gap-2 mb-7 text-sm font-medium text-stone-500">
          <button onClick={voltarParaParcelas} className="hover:text-brand-700 transition-colors">
            Prestação de Contas
          </button>
          {parcelaSelecionada && (
            <>
              <span className="text-stone-300">/</span>
              <button onClick={voltarParaMeses} className="hover:text-brand-700 transition-colors">
                Parcela 0{parcelaSelecionada.numero} ({parcelaSelecionada.anoVigencia})
              </button>
            </>
          )}
          {parcelaSelecionada && mesSelecionado && (
            <>
              <span className="text-stone-300">/</span>
              <span className="text-stone-900">{mesSelecionado}</span>
            </>
          )}
        </div>

        {/* PASSO 1: ESCOLHER A PARCELA */}
        {!parcelaSelecionada && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Wallet className="w-5 h-5 text-brand-700" />
              <h2 style={heading} className="text-xl text-stone-900">
                Escolha a parcela para prestar contas
              </h2>
            </div>

            {carregandoParcelas ? (
              <div className="flex justify-center py-16 text-stone-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : parcelas.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-cream-200 rounded-2xl bg-white text-sm text-stone-500">
                Nenhuma parcela liberada para prestação de contas no momento.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {parcelas.map((parcela) => (
                  <button
                    key={parcela.id}
                    onClick={() => entrarNaParcela(parcela)}
                    className="bg-white border border-cream-200 p-6 rounded-2xl hover:border-brand-300 hover:shadow-md transition-all flex flex-col items-center group"
                  >
                    <Folder className="w-12 h-12 text-brand-200 group-hover:text-brand-500 group-hover:scale-110 group-hover:-rotate-2 transition-all duration-200 mb-3" strokeWidth={1.5} />
                    <span className="text-stone-700 font-semibold text-sm group-hover:text-stone-900">
                      Parcela 0{parcela.numero}
                    </span>
                    <span className="text-xs text-stone-400 mt-1">
                      {parcela.anoVigencia} · Parcelas abertas
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* HISTÓRICO: MINHAS PRESTAÇÕES */}
            {minhasPrestacoes.length > 0 && (
              <div className="mt-10">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <h2 style={heading} className="text-lg text-stone-900">
                    Minhas Prestações Enviadas
                  </h2>
                </div>
                <div className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[560px]">
                    <thead>
                      <tr className="border-b-2 border-cream-200 text-stone-800 text-xs uppercase tracking-wide">
                        <th className="px-5 py-3 font-bold">Competência</th>
                        <th className="px-5 py-3 font-bold">Emitente</th>
                        <th className="px-5 py-3 font-bold">Valor (R$)</th>
                        <th className="px-5 py-3 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {minhasPrestacoes.map((p, index) => (
                        <tr key={p.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-cream-50/50'} border-b border-cream-100`}>
                          <td className="px-5 py-3 text-sm text-stone-700 font-medium">{p.dataCompetencia}</td>
                          <td className="px-5 py-3 text-sm text-stone-500">{p.emitente || '—'}</td>
                          <td className="px-5 py-3 text-sm font-semibold text-stone-900">
                            R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide">
                              {p.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PASSO 2: ESCOLHER O MÊS DE COMPETÊNCIA */}
        {parcelaSelecionada && !mesSelecionado && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <CalendarDays className="w-5 h-5 text-brand-700" />
              <h2 style={heading} className="text-xl text-stone-900">
                Parcela 0{parcelaSelecionada.numero} — escolha o mês de competência
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {(mesesDaParcela.length > 0 ? mesesDaParcela : TODOS_OS_MESES).map((mes) => (
                <button
                  key={mes}
                  onClick={() => setMesSelecionado(mes)}
                  className="bg-white border border-cream-200 p-5 rounded-2xl hover:border-brand-300 hover:shadow-sm transition-all flex flex-col items-center group"
                >
                  <Folder className="w-8 h-8 text-stone-300 group-hover:text-brand-600 transition-colors mb-2.5" strokeWidth={1.5} />
                  <span className="text-stone-700 font-semibold text-sm group-hover:text-stone-900">
                    {mes}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASSO 3: UPLOADS E ENVIO */}
        {parcelaSelecionada && mesSelecionado && (
          <form onSubmit={handleConfirmarEnvio} className="bg-white rounded-2xl border border-cream-200 p-7 max-w-4xl mx-auto space-y-7 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* BLOCO 1: NOTA FISCAL */}
              {isLendoNota ? (
                <div className="border border-cream-200 bg-cream-50 p-7 rounded-2xl text-center flex flex-col items-center justify-center animate-in fade-in duration-150">
                  <Loader2 className="w-7 h-7 text-brand-700 animate-spin mb-3" />
                  <h3 className="font-semibold text-sm text-stone-700">Analisando nota fiscal...</h3>
                  <p className="text-xs text-stone-500 mt-1.5 leading-relaxed max-w-[240px]">
                    Não conseguimos extrair os dados automaticamente, aguarde nosso modelo extrair as informações.
                  </p>
                  <button
                    type="button"
                    onClick={cancelarLeituraNota}
                    className="mt-4 px-4 py-2 bg-white border border-cream-300 hover:bg-cream-100 text-stone-600 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar e preencher manualmente
                  </button>
                </div>
              ) : arquivoNotaFiscal ? (
                <div className={`border p-5 rounded-2xl text-center flex flex-col items-center justify-center relative transition-colors ${temPendenciaOCR ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => visualizarArquivo(arquivoNotaFiscal)}
                      className="p-1.5 bg-white rounded-xl hover:bg-cream-50 text-stone-500 hover:text-brand-700 transition-colors border border-cream-200 cursor-pointer"
                      title="Visualizar nota"
                      aria-label="Visualizar nota"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFormulario(!showFormulario)}
                      className="p-1.5 bg-white rounded-xl hover:bg-cream-50 text-stone-500 transition-colors border border-cream-200"
                      title="Ver/Editar Dados"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {temPendenciaOCR ? (
                    <AlertTriangle className="w-8 h-8 text-amber-500 mb-2.5" strokeWidth={1.5} />
                  ) : (
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mb-2.5" strokeWidth={1.5} />
                  )}

                  <h3 className={`font-semibold text-sm ${temPendenciaOCR ? "text-amber-900" : "text-emerald-900"}`}>Nota Anexada</h3>
                  <p className="text-xs mt-1 truncate max-w-[200px] text-stone-500">{arquivoNotaFiscal.name}</p>

                  {temPendenciaOCR && (
                    <span className="mt-2 text-[11px] font-medium text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Clique no lápis para corrigir
                    </span>
                  )}

                  <label className="text-xs text-brand-700 hover:text-brand-800 hover:underline mt-3.5 cursor-pointer">
                    Trocar arquivo
                    <input type="file" accept=".pdf, image/*" onChange={handleArquivoSelecionado} className="hidden" />
                  </label>
                </div>
              ) : (
                <div className="border border-dashed border-cream-200 bg-cream-50 hover:bg-cream-100 hover:border-brand-400 transition-colors p-7 rounded-2xl text-center flex flex-col items-center justify-center relative">
                  <input type="file" accept=".pdf, image/*" onChange={handleArquivoSelecionado} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <UploadCloud className="w-8 h-8 text-brand-300 mb-2.5" strokeWidth={1.5} />
                  <h3 className="font-semibold text-sm text-stone-700">1. Nota Fiscal</h3>
                  <p className="text-xs text-stone-500 mt-1">Arraste o PDF aqui</p>
                </div>
              )}

              {/* BLOCO 2: RELATÓRIOS EXTRAS */}
              <div className={`border transition-colors p-5 rounded-2xl flex flex-col relative ${anexosExtras.length > 0 ? "border-cream-200 bg-cream-50" : "border-dashed border-cream-200 bg-cream-50 hover:bg-cream-100 hover:border-brand-400"}`}>
                {anexosExtras.length === 0 ? (
                  <div className="text-center flex flex-col items-center justify-center h-full">
                    <input type="file" multiple accept=".pdf, image/*" onChange={handleAnexosExtras} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <FileText className="w-8 h-8 text-brand-300 mb-2.5" strokeWidth={1.5} />
                    <h3 className="font-semibold text-sm text-stone-700">2. Relatórios Extras</h3>
                    <p className="text-xs text-stone-500 mt-1">Listas de presença, recibos...</p>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <h3 className="text-sm font-semibold text-stone-700 mb-2.5 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-stone-400" /> Arquivos Adicionados
                    </h3>
                    <ul className="flex-1 overflow-y-auto max-h-32 space-y-1.5 mb-3.5 pr-1">
                      {anexosExtras.map((f, i) => (
                        <li key={i} className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-cream-200 text-xs">
                          <span className="truncate max-w-[150px] text-stone-700 font-semibold">{f.name}</span>
                          <button type="button" onClick={() => removerAnexo(i)} className="text-stone-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="relative mt-auto">
                      <button type="button" className="w-full py-2 bg-white text-brand-700 hover:bg-brand-50 border border-cream-200 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" /> Adicionar mais
                      </button>
                      <input type="file" multiple accept=".pdf, image/*" onChange={handleAnexosExtras} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* A GAVETA COM OS DADOS */}
            {showFormulario && arquivoNotaFiscal && (
              <div className="pt-6 border-t border-cream-200 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between items-center mb-5">
                  <h3 style={heading} className="text-sm text-stone-900">Dados Extraídos da Nota</h3>
                  {!isEditing && (
                    <button type="button" onClick={() => setIsEditing(true)} className="flex items-center gap-2 text-xs bg-cream-100 hover:bg-cream-200 text-stone-700 py-1.5 px-3 rounded-xl transition-colors border border-cream-200 font-semibold">
                      <Edit2 className="w-3.5 h-3.5" /> Destravar para Edição
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-stone-700 mb-1.5">Emitente / Fornecedor</label>
                      <input type="text" disabled={isLocked} className={`w-full px-3 py-2 border rounded-xl text-sm outline-none ${isLocked ? "bg-cream-50 text-stone-500" : "focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"} ${!dadosNota.emitente && !isLocked ? "border-red-300 bg-red-50" : "border-cream-200"}`} value={dadosNota.emitente} onChange={(e) => setDadosNota({ ...dadosNota, emitente: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1.5">Valor (R$)</label>
                      <input type="text" disabled={isLocked} className={`w-full px-3 py-2 border rounded-xl text-sm outline-none font-medium ${isLocked ? "bg-cream-50 text-stone-500" : "focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"} ${!dadosNota.valor && !isLocked ? "border-red-300 bg-red-50" : "border-cream-200"}`} value={dadosNota.valor} onChange={(e) => setDadosNota({ ...dadosNota, valor: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1.5">Data da Nota</label>
                      <input type="date" disabled={isLocked} className={`w-full px-3 py-2 border rounded-xl text-sm outline-none ${isLocked ? "bg-cream-50 text-stone-500" : "focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"} ${!dadosNota.data && !isLocked ? "border-red-300 bg-red-50" : "border-cream-200"}`} value={dadosNota.data} onChange={(e) => setDadosNota({ ...dadosNota, data: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1.5">Número da NF</label>
                      <input type="text" disabled={isLocked} className={`w-full px-3 py-2 border rounded-xl text-sm outline-none ${isLocked ? "bg-cream-50 text-stone-500" : "focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"} ${!dadosNota.numero && !isLocked ? "border-red-300 bg-red-50" : "border-cream-200"}`} value={dadosNota.numero} onChange={(e) => setDadosNota({ ...dadosNota, numero: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1.5">Descrição</label>
                      <input type="text" disabled={isLocked} className={`w-full px-3 py-2 border rounded-xl text-sm outline-none ${isLocked ? "bg-cream-50 text-stone-500" : "focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 border-cream-200"}`} value={dadosNota.descricao} onChange={(e) => setDadosNota({ ...dadosNota, descricao: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1.5">Tipo de Documento (GERR)</label>
                      <select disabled={isLocked} className={`w-full px-3 py-2 border rounded-xl text-sm outline-none bg-white ${isLocked ? "bg-cream-50 text-stone-500" : "focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 border-cream-200"}`} value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
                        <option value="">Selecione...</option>
                        {TIPOS_DOCUMENTO_GERR.map(t => <option key={t.valor} value={t.valor}>{t.rotuloCompleto}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BOTÃO GLOBAL DE ENVIO */}
            {arquivoNotaFiscal && (
              <div className="pt-6 border-t border-cream-200 mt-6">
                <button type="submit" className="w-full bg-brand-700 hover:bg-brand-800 text-white font-semibold py-3 rounded-2xl transition-colors flex justify-center items-center gap-2 text-sm shadow-sm">
                  <CheckCircle2 className="w-4 h-4" /> Confirmar e Enviar Prestação Definitiva
                </button>
              </div>
            )}
          </form>
        )}

        {/* MODAL: NOTA NÃO LIDA */}
        {modalNota && (
          <ModalNotaDigitalizada
            mensagem={modalNota}
            onFechar={() => setModalNota(null)}
            onPreencherManual={() => {
              setModalNota(null);
              setIsEditing(true);
            }}
          />
        )}
      </main>
    </div>
  );
}