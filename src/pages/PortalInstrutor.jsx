import React, { useState } from "react";
import { api } from "../services/api";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const heading = { fontFamily: "'Poppins', sans-serif" };

export default function PortalInstrutor() {
  const navigate = useNavigate();

  // Puxa o nome de quem logou (ou escreve "Instrutor" se falhar)
  const userName = localStorage.getItem("usuarioNome") || "Instrutor";
  const userInitials = userName.charAt(0).toUpperCase();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };
  const [caminho, setCaminho] = useState([]);

  // Simulação de Perfil
  const [isEditing, setIsEditing] = useState(false);

  // Estados do Motor de OCR
  const [isLendoNota, setIsLendoNota] = useState(false);
  const [showFormulario, setShowFormulario] = useState(false);

  const [dadosNota, setDadosNota] = useState({
    emitente: "",
    valor: "",
    data: "",
    numero: "",
    descricao: "",
  });

  // Arquivos
  const [arquivoNotaFiscal, setArquivoNotaFiscal] = useState(null);
  const [anexosExtras, setAnexosExtras] = useState([]);

  const anos = ["2025", "2026"];
  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
  ];

  const entrarNaPasta = (pasta) => setCaminho([...caminho, pasta]);
  const voltarParaRaiz = () => {
    setCaminho([]);
    resetarFluxoUpload();
  };
  const voltarParaAno = () => {
    setCaminho([caminho[0]]);
    resetarFluxoUpload();
  };

  const resetarFluxoUpload = () => {
    setArquivoNotaFiscal(null);
    setAnexosExtras([]);
    setShowFormulario(false);
    setIsEditing(false);
  };

  const limite30MB = 30 * 1024 * 1024; // 30 MB em bytes

  const handleArquivoSelecionado = async (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    // --- TRAVA DE UX ---
    if (arquivo.size > limite30MB) {
      return alert(
        "O arquivo excedeu o limite de 30MB. Reduza o tamanho ou divida em partes.",
      );
    }
    const nome = arquivo.name.toLowerCase();
    if (nome.endsWith(".doc") || nome.endsWith(".docx")) {
      return alert(
        "Documentos Word não são aceitos pelo sistema do INDACI. Por favor, salve como PDF.",
      );
    }
    // ------------------------

    setArquivoNotaFiscal(arquivo);
    setIsLendoNota(true);
    setShowFormulario(false);

    const formData = new FormData();
    formData.append("arquivo", arquivo);

    try {
      const response = await api.post("/anexos/ler-nota", formData, {
        headers: { "Content-Type": "multipart/form-data" },
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
      });
    } catch (error) {
      console.error("Erro na leitura do OCR:", error);
      setDadosNota({
        emitente: "",
        valor: "",
        data: "",
        numero: "",
        descricao: "",
      });
    } finally {
      setIsLendoNota(false);
    }
  };

  const handleAnexosExtras = (e) => {
    const limite30MB = 30 * 1024 * 1024; // 30 MB

    // 1. Pega todos os arquivos que o instrutor selecionou de uma vez
    const files = Array.from(e.target.files);

    // 2. Filtra a lista, deixando passar apenas os permitidos
    const arquivosValidos = files.filter((arquivo) => {
      const nome = arquivo.name.toLowerCase();

      // Regra 1: Bloqueia Word
      if (nome.endsWith(".doc") || nome.endsWith(".docx")) {
        alert(
          `O arquivo "${arquivo.name}" foi recusado. Documentos Word não são aceitos, salve como PDF.`,
        );
        return false; // Remove da lista
      }

      // Regra 2: Bloqueia maiores que 30MB
      if (arquivo.size > limite30MB) {
        alert(
          `O arquivo "${arquivo.name}" excedeu o limite de 30MB e foi recusado.`,
        );
        return false; // Remove da lista
      }

      return true;
    });

    // 3. Adiciona no estado apenas os arquivos que passaram do filtro
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
    if (
      !dadosNota.emitente ||
      !dadosNota.valor ||
      !dadosNota.data ||
      !dadosNota.numero
    ) {
      // Se faltar dado, força o usuário a abrir a gaveta para arrumar
      setShowFormulario(true);
      return alert(
        "Preencha todos os campos obrigatórios da nota antes de enviar.",
      );
    }

    alert("Iniciando envio para o servidor...");

    const formData = new FormData();

    // ATENÇÃO: COLOQUE UUIDS REAIS AQUI PARA TESTAR
    formData.append("parcelaId", "333e4567-e89b-12d3-a456-426614174000");
    formData.append("usuarioId", localStorage.getItem("usuarioId"));
    formData.append("dataCompetencia", "2026-08");

    formData.append("emitente", dadosNota.emitente);
    formData.append("valor", dadosNota.valor);
    formData.append("dataEmissao", dadosNota.data);
    formData.append("numero", dadosNota.numero);
    formData.append("descricao", dadosNota.descricao);

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

      voltarParaAno();
    } catch (error) {
      console.error("Erro ao salvar despesa:", error);
      alert("Erro ao enviar a prestação de contas. Verifique o console.");
    }
  };

  const isLocked = !isEditing;
  const temPendenciaOCR =
    arquivoNotaFiscal &&
    (!dadosNota.emitente ||
      !dadosNota.valor ||
      !dadosNota.data ||
      !dadosNota.numero);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900">
        <div className="max-w-5xl mx-auto px-8 h-14 flex justify-between items-center">
          <div>
            <h1
              style={heading}
              className="text-sm font-semibold text-white tracking-wide"
            >
              Área do Instrutor
            </h1>
            <p className="text-[11px] text-slate-400">
              Vinculado à{" "}
              <span className="text-sky-400 font-medium">INDACI</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Divisória sutil */}
            <div className="h-5 w-px bg-slate-700 mx-1"></div>

            {/* Perfil Real */}
            <span className="text-xs text-slate-400">{userName}</span>
            <div className="w-7 h-7 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-semibold">
              {userInitials}
            </div>

            {/* Botão de Logout */}
            <button
              onClick={handleLogout}
              className="ml-1 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
              title="Sair do Portal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
      <div className="h-[3px] bg-gradient-to-r from-sky-500 via-sky-600 to-slate-900" />

      <main className="flex-1 max-w-5xl w-full mx-auto p-8">
        <div className="flex items-center gap-2 mb-7 text-sm font-medium text-slate-500">
          <button
            onClick={voltarParaRaiz}
            className="hover:text-sky-700 transition-colors"
          >
            Prestação de Contas
          </button>
          {caminho.length > 0 && (
            <>
              <span className="text-slate-300">/</span>
              <button
                onClick={voltarParaAno}
                className="hover:text-sky-700 transition-colors"
              >
                {caminho[0]}
              </button>
            </>
          )}
          {caminho.length > 1 && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900">{caminho[1]}</span>
            </>
          )}
        </div>

        {/* PASTAS: ANOS */}
        {caminho.length === 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {anos.map((ano) => (
              <button
                key={ano}
                onClick={() => entrarNaPasta(ano)}
                className="bg-sky-50/60 border border-sky-100 p-8 rounded-md hover:border-sky-300 hover:bg-sky-50 hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col items-center group"
              >
                <Folder
                  className="w-14 h-14 text-sky-300 group-hover:text-sky-500 group-hover:scale-110 group-hover:-rotate-2 transition-all duration-200 mb-3"
                  strokeWidth={1.5}
                />
                <span className="text-slate-700 font-medium text-sm group-hover:text-slate-900">
                  {ano}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* PASTAS: MESES */}
        {caminho.length === 1 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {meses.map((mes) => (
              <button
                key={mes}
                onClick={() => entrarNaPasta(mes)}
                className="bg-white border border-slate-200 p-5 rounded-md hover:border-sky-300 hover:shadow-sm transition-all flex flex-col items-center group"
              >
                <Folder
                  className="w-8 h-8 text-slate-300 group-hover:text-sky-600 transition-colors mb-2.5"
                  strokeWidth={1.5}
                />
                <span className="text-slate-700 font-medium text-sm group-hover:text-slate-900">
                  {mes}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ÁREA DE UPLOADS E ENVIO */}
        {caminho.length === 2 && (
          <form
            onSubmit={handleConfirmarEnvio}
            className="bg-white rounded-md border border-slate-200 p-7 max-w-4xl mx-auto space-y-7"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* BLOCO 1: NOTA FISCAL */}
              {isLendoNota ? (
                <div className="border border-slate-200 bg-slate-50 p-7 rounded-md text-center flex flex-col items-center justify-center">
                  <Loader2 className="w-7 h-7 text-sky-600 animate-spin mb-3" />
                  <h3 className="font-medium text-sm text-slate-700">
                    Lendo PDF...
                  </h3>
                </div>
              ) : arquivoNotaFiscal ? (
                <div
                  className={`border p-5 rounded-md text-center flex flex-col items-center justify-center relative transition-colors ${temPendenciaOCR ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}
                >
                  {/* Botão de Lápis para abrir a gaveta */}
                  <button
                    type="button"
                    onClick={() => setShowFormulario(!showFormulario)}
                    className="absolute top-3 right-3 p-1.5 bg-white rounded-md hover:bg-slate-50 text-slate-500 transition-colors border border-slate-200"
                    title="Ver/Editar Dados"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {temPendenciaOCR ? (
                    <AlertTriangle
                      className="w-8 h-8 text-amber-500 mb-2.5"
                      strokeWidth={1.5}
                    />
                  ) : (
                    <CheckCircle2
                      className="w-8 h-8 text-emerald-600 mb-2.5"
                      strokeWidth={1.5}
                    />
                  )}

                  <h3
                    className={`font-medium text-sm ${temPendenciaOCR ? "text-amber-900" : "text-emerald-900"}`}
                  >
                    Nota Anexada
                  </h3>
                  <p className="text-xs mt-1 truncate max-w-[200px] text-slate-500">
                    {arquivoNotaFiscal.name}
                  </p>

                  {temPendenciaOCR && (
                    <span className="mt-2 text-[11px] font-medium text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded uppercase tracking-wide">
                      Clique no lápis para corrigir
                    </span>
                  )}

                  <label className="text-xs text-sky-700 hover:text-sky-800 hover:underline mt-3.5 cursor-pointer">
                    Trocar arquivo
                    <input
                      type="file"
                      accept=".pdf, image/*"
                      onChange={handleArquivoSelecionado}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-sky-400 transition-colors p-7 rounded-md text-center flex flex-col items-center justify-center relative">
                  <input
                    type="file"
                    accept=".pdf, image/*"
                    onChange={handleArquivoSelecionado}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud
                    className="w-8 h-8 text-slate-400 mb-2.5"
                    strokeWidth={1.5}
                  />
                  <h3 className="font-medium text-sm text-slate-700">
                    1. Nota Fiscal
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Arraste o PDF aqui
                  </p>
                </div>
              )}

              {/* BLOCO 2: RELATÓRIOS EXTRAS */}
              <div
                className={`border transition-colors p-5 rounded-md flex flex-col relative ${anexosExtras.length > 0 ? "border-slate-200 bg-slate-50" : "border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-sky-400"}`}
              >
                {anexosExtras.length === 0 ? (
                  <div className="text-center flex flex-col items-center justify-center h-full">
                    <input
                      type="file"
                      multiple
                      accept=".pdf, image/*"
                      onChange={handleAnexosExtras}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <FileText
                      className="w-8 h-8 text-slate-400 mb-2.5"
                      strokeWidth={1.5}
                    />
                    <h3 className="font-medium text-sm text-slate-700">
                      2. Relatórios Extras
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Listas de presença, recibos...
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <h3 className="text-sm font-medium text-slate-700 mb-2.5 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" /> Arquivos
                      Adicionados
                    </h3>
                    <ul className="flex-1 overflow-y-auto max-h-32 space-y-1.5 mb-3.5 pr-1">
                      {anexosExtras.map((f, i) => (
                        <li
                          key={i}
                          className="flex justify-between items-center bg-white px-3 py-2 rounded-md border border-slate-200 text-xs"
                        >
                          <span className="truncate max-w-[150px] text-slate-700 font-medium">
                            {f.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removerAnexo(i)}
                            className="text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="relative mt-auto">
                      <button
                        type="button"
                        className="w-full py-2 bg-white text-sky-700 hover:bg-sky-50 border border-slate-200 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Adicionar mais
                      </button>
                      <input
                        type="file"
                        multiple
                        accept=".pdf, image/*"
                        onChange={handleAnexosExtras}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* A GAVETA COM OS DADOS (Aberta apenas se clicar no lápis ou se der erro) */}
            {showFormulario && arquivoNotaFiscal && (
              <div className="pt-6 border-t border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between items-center mb-5">
                  <h3
                    style={heading}
                    className="text-sm font-semibold text-slate-900"
                  >
                    Dados Extraídos da Nota
                  </h3>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-md transition-colors border border-slate-200 font-medium"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Destravar para Edição
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Emitente / Fornecedor
                      </label>
                      <input
                        type="text"
                        disabled={isLocked}
                        className={`w-full px-3 py-2 border rounded-md text-sm outline-none ${isLocked ? "bg-slate-50 text-slate-500" : "focus:ring-2 focus:ring-sky-500/40 focus:border-sky-600"} ${!dadosNota.emitente && !isLocked ? "border-red-300 bg-red-50" : "border-slate-300"}`}
                        value={dadosNota.emitente}
                        onChange={(e) =>
                          setDadosNota({
                            ...dadosNota,
                            emitente: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Valor (R$)
                      </label>
                      <input
                        type="text"
                        disabled={isLocked}
                        className={`w-full px-3 py-2 border rounded-md text-sm outline-none font-medium ${isLocked ? "bg-slate-50 text-slate-500" : "focus:ring-2 focus:ring-sky-500/40 focus:border-sky-600"} ${!dadosNota.valor && !isLocked ? "border-red-300 bg-red-50" : "border-slate-300"}`}
                        value={dadosNota.valor}
                        onChange={(e) =>
                          setDadosNota({ ...dadosNota, valor: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Data da Nota
                      </label>
                      <input
                        type="date"
                        disabled={isLocked}
                        className={`w-full px-3 py-2 border rounded-md text-sm outline-none ${isLocked ? "bg-slate-50 text-slate-500" : "focus:ring-2 focus:ring-sky-500/40 focus:border-sky-600"} ${!dadosNota.data && !isLocked ? "border-red-300 bg-red-50" : "border-slate-300"}`}
                        value={dadosNota.data}
                        onChange={(e) =>
                          setDadosNota({ ...dadosNota, data: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Número da NF
                      </label>
                      <input
                        type="text"
                        disabled={isLocked}
                        className={`w-full px-3 py-2 border rounded-md text-sm outline-none ${isLocked ? "bg-slate-50 text-slate-500" : "focus:ring-2 focus:ring-sky-500/40 focus:border-sky-600"} ${!dadosNota.numero && !isLocked ? "border-red-300 bg-red-50" : "border-slate-300"}`}
                        value={dadosNota.numero}
                        onChange={(e) =>
                          setDadosNota({ ...dadosNota, numero: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Descrição
                      </label>
                      <input
                        type="text"
                        disabled={isLocked}
                        className={`w-full px-3 py-2 border rounded-md text-sm outline-none ${isLocked ? "bg-slate-50 text-slate-500" : "focus:ring-2 focus:ring-sky-500/40 focus:border-sky-600 border-slate-300"}`}
                        value={dadosNota.descricao}
                        onChange={(e) =>
                          setDadosNota({
                            ...dadosNota,
                            descricao: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BOTÃO GLOBAL DE ENVIO (Sempre visível se houver nota anexada) */}
            {arquivoNotaFiscal && (
              <div className="pt-6 border-t border-slate-200 mt-6">
                <button
                  type="submit"
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-3 rounded-md transition-colors flex justify-center items-center gap-2 text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" /> Confirmar e Enviar
                  Prestação Definitiva
                </button>
              </div>
            )}
          </form>
        )}
      </main>
    </div>
  );
}
