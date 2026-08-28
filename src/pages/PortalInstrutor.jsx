import React, { useState } from "react";
import { api } from "../services/api";
import {
  Edit2,
  CheckCircle,
  Plus,
  Trash2,
  AlertTriangle,
  FileText,
} from "lucide-react";

// Ícones SVG Originais
const FolderIcon = () => (
  <svg
    className="w-16 h-16 text-blue-500 drop-shadow-sm mb-3"
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
  </svg>
);

const UploadIcon = () => (
  <svg
    className="w-10 h-10 text-blue-600 mb-3"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
    />
  </svg>
);

const RobotIcon = () => (
  <svg
    className="w-12 h-12 text-blue-500 mb-4 animate-bounce"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

export default function PortalInstrutor() {
  const [caminho, setCaminho] = useState([]);

  // Simulação de Perfil
  const [userRole, setUserRole] = useState("INSTRUTOR");
  const [isEditing, setIsEditing] = useState(userRole === "ADMIN");

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
    setIsEditing(userRole === "ADMIN");
  };

  const limite30MB = 30 * 1024 * 1024; // 30 MB em bytes

  const handleArquivoSelecionado = async (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    // --- NOVA TRAVA DE UX ---
    if (arquivo.size > limite30MB) {
        return alert("⚠️ O arquivo excedeu o limite de 30MB. Reduza o tamanho ou divida em partes.");
    }
    const nome = arquivo.name.toLowerCase();
    if (nome.endsWith(".doc") || nome.endsWith(".docx")) {
        return alert("⚠️ Documentos Word não são aceitos pelo sistema do INDACI. Por favor, salve como PDF.");
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

      if (userRole === "ADMIN") {
        setShowFormulario(true);
        setIsEditing(true);
      }
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
    const arquivosValidos = files.filter(arquivo => {
      const nome = arquivo.name.toLowerCase();

      // Regra 1: Bloqueia Word
      if (nome.endsWith(".doc") || nome.endsWith(".docx")) {
        alert(`❌ O arquivo "${arquivo.name}" foi recusado. Documentos Word não são aceitos, salve como PDF.`);
        return false; // Remove da lista
      }

      // Regra 2: Bloqueia maiores que 30MB
      if (arquivo.size > limite30MB) {
        alert(`❌ O arquivo "${arquivo.name}" excedeu o limite de 30MB e foi recusado.`);
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
    formData.append("usuarioId", "7545b48c-16db-448a-8dd0-24472b7ab0b5");
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
      <header className="bg-white shadow-sm border-b border-slate-200 px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Área do Instrutor
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Vinculado à: <span className="text-blue-600 font-bold">INDACI</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setUserRole(userRole === "INSTRUTOR" ? "ADMIN" : "INSTRUTOR");
              setIsEditing(userRole === "INSTRUTOR");
            }}
            className="text-xs bg-slate-100 p-2 rounded mr-4 border shadow-sm"
          >
            Modo: {userRole}
          </button>
          <span className="text-sm font-medium text-slate-500">
            Tailor Kunz
          </span>
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
            TK
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-8 mt-4">
        <div className="flex items-center gap-2 mb-8 text-lg font-medium text-slate-600">
          <button
            onClick={voltarParaRaiz}
            className="hover:text-blue-600 transition-colors"
          >
            Prestação de Contas
          </button>
          {caminho.length > 0 && (
            <>
              <span className="text-slate-400">/</span>
              <button
                onClick={voltarParaAno}
                className="hover:text-blue-600 transition-colors"
              >
                {caminho[0]}
              </button>
            </>
          )}
          {caminho.length > 1 && (
            <>
              <span className="text-slate-400">/</span>
              <span className="text-slate-800">{caminho[1]}</span>
            </>
          )}
        </div>

        {/* PASTAS: ANOS */}
        {caminho.length === 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {anos.map((ano) => (
              <button
                key={ano}
                onClick={() => entrarNaPasta(ano)}
                className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:border-blue-300 transition-all flex flex-col items-center group"
              >
                <FolderIcon />
                <span className="text-slate-700 font-bold group-hover:text-blue-600">
                  {ano}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* PASTAS: MESES */}
        {caminho.length === 1 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {meses.map((mes) => (
              <button
                key={mes}
                onClick={() => entrarNaPasta(mes)}
                className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:border-blue-300 transition-all flex flex-col items-center group"
              >
                <FolderIcon />
                <span className="text-slate-700 font-bold group-hover:text-blue-600">
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
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-4xl mx-auto space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* BLOCO 1: NOTA FISCAL */}
              {isLendoNota ? (
                <div className="border-2 border-dashed border-blue-300 bg-blue-50 p-8 rounded-xl text-center flex flex-col items-center justify-center">
                  <RobotIcon />
                  <h3 className="font-bold text-slate-800 animate-pulse">
                    Lendo PDF...
                  </h3>
                </div>
              ) : arquivoNotaFiscal ? (
                <div
                  className={`border-2 p-6 rounded-xl text-center flex flex-col items-center justify-center relative transition-colors ${temPendenciaOCR ? "border-amber-400 bg-amber-50" : "border-emerald-400 bg-emerald-50"}`}
                >
                  {/* Botão de Lápis para abrir a gaveta */}
                  <button
                    type="button"
                    onClick={() => setShowFormulario(!showFormulario)}
                    className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 text-slate-700 transition border"
                    title="Ver/Editar Dados"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {temPendenciaOCR ? (
                    <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
                  ) : (
                    <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
                  )}

                  <h3
                    className={`font-semibold text-lg ${temPendenciaOCR ? "text-amber-900" : "text-emerald-900"}`}
                  >
                    Nota Anexada
                  </h3>
                  <p className="text-sm font-medium mt-1 truncate max-w-[200px] text-slate-600">
                    {arquivoNotaFiscal.name}
                  </p>

                  {temPendenciaOCR && (
                    <span className="mt-2 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded">
                      ⚠️ Clique no lápis para corrigir
                    </span>
                  )}

                  <label className="text-xs text-blue-600 hover:underline mt-4 cursor-pointer">
                    Trocar arquivo
                    <input type="file" accept=".pdf, image/*" onChange={handleArquivoSelecionado}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 transition p-8 rounded-xl text-center flex flex-col items-center justify-center relative">
                  <input
                    type="file"
                    <input type="file" accept=".pdf, image/*" onChange={handleArquivoSelecionado}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadIcon />
                  <h3 className="font-semibold text-lg text-blue-900">
                    1. Nota Fiscal
                  </h3>
                  <p className="text-sm text-blue-700 mt-2">
                    Arraste o PDF aqui
                  </p>
                </div>
              )}

              {/* BLOCO 2: RELATÓRIOS EXTRAS */}
              <div
                className={`border-2 transition p-6 rounded-xl flex flex-col relative ${anexosExtras.length > 0 ? "border-solid border-slate-300 bg-slate-50" : "border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100"}`}
              >
                {anexosExtras.length === 0 ? (
                  <div className="text-center flex flex-col items-center justify-center h-full">
                    <input type="file" multiple accept=".pdf, image/*" onChange={handleAnexosExtras}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <FileText className="w-10 h-10 text-slate-400 mb-3" />
                    <h3 className="font-semibold text-lg text-slate-700">
                      2. Relatórios Extras
                    </h3>
                    <p className="text-sm text-slate-500 mt-2">
                      Listas de presença, recibos...
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5" /> Arquivos Adicionados
                    </h3>
                    <ul className="flex-1 overflow-y-auto max-h-32 space-y-2 mb-4 pr-1">
                      {anexosExtras.map((f, i) => (
                        <li
                          key={i}
                          className="flex justify-between items-center bg-white px-3 py-2 rounded border border-slate-200 text-sm shadow-sm"
                        >
                          <span className="truncate max-w-[150px] text-slate-700 font-medium">
                            {f.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removerAnexo(i)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="relative mt-auto">
                      <button
                        type="button"
                        className="w-full py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-medium rounded transition flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Adicionar mais
                      </button>
                      <input type="file" multiple accept=".pdf, image/*" onChange={handleAnexosExtras}
        
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* A GAVETA COM OS DADOS (Aberta apenas se clicar no lápis ou se der erro) */}
            {showFormulario && arquivoNotaFiscal && (
              <div className="pt-6 border-t border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-slate-800">
                    Dados Extraídos da Nota
                  </h3>
                  {userRole === "INSTRUTOR" && !isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg transition font-medium border shadow-sm"
                    >
                      <Edit2 className="w-4 h-4" /> Destravar para Edição
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Emitente / Fornecedor
                      </label>
                      <input
                        type="text"
                        disabled={isLocked}
                        className={`w-full px-4 py-2 border rounded-lg outline-none ${isLocked ? "bg-slate-50 text-slate-500" : "focus:ring-2 focus:ring-blue-500"} ${!dadosNota.emitente && !isLocked ? "border-red-400 bg-red-50" : "border-slate-300"}`}
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Valor (R$)
                      </label>
                      <input
                        type="text"
                        disabled={isLocked}
                        className={`w-full px-4 py-2 border rounded-lg outline-none font-medium ${isLocked ? "bg-slate-50 text-slate-500" : "focus:ring-2 focus:ring-blue-500"} ${!dadosNota.valor && !isLocked ? "border-red-400 bg-red-50" : "border-slate-300"}`}
                        value={dadosNota.valor}
                        onChange={(e) =>
                          setDadosNota({ ...dadosNota, valor: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Data da Nota
                      </label>
                      <input
                        type="date"
                        disabled={isLocked}
                        className={`w-full px-4 py-2 border rounded-lg outline-none ${isLocked ? "bg-slate-50 text-slate-500" : "focus:ring-2 focus:ring-blue-500"} ${!dadosNota.data && !isLocked ? "border-red-400 bg-red-50" : "border-slate-300"}`}
                        value={dadosNota.data}
                        onChange={(e) =>
                          setDadosNota({ ...dadosNota, data: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Número da NF
                      </label>
                      <input
                        type="text"
                        disabled={isLocked}
                        className={`w-full px-4 py-2 border rounded-lg outline-none ${isLocked ? "bg-slate-50 text-slate-500" : "focus:ring-2 focus:ring-blue-500"} ${!dadosNota.numero && !isLocked ? "border-red-400 bg-red-50" : "border-slate-300"}`}
                        value={dadosNota.numero}
                        onChange={(e) =>
                          setDadosNota({ ...dadosNota, numero: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Descrição
                      </label>
                      <input
                        type="text"
                        disabled={isLocked}
                        className={`w-full px-4 py-2 border rounded-lg outline-none ${isLocked ? "bg-slate-50 text-slate-500" : "focus:ring-2 focus:ring-blue-500 border-slate-300"}`}
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
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 rounded-xl transition-colors flex justify-center items-center gap-2 shadow-md text-lg"
                >
                  <CheckCircle className="w-6 h-6" /> Confirmar e Enviar
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
