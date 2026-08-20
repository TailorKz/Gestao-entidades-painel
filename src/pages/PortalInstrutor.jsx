import React, { useState } from "react";
import { api } from "../services/api";

// Ícones SVG
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
    className="w-12 h-12 text-slate-400 mb-3"
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

  // Estados do Motor de OCR
  const [faseUpload, setFaseUpload] = useState("aguardando");
  const [dadosNota, setDadosNota] = useState({
    emitente: "",
    valor: "",
    data: "",
    numero: "",
    descricao: "",
  });

  // Guardar os arquivos reais para envio posterior
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
    setFaseUpload("aguardando");
    setArquivoNotaFiscal(null);
    setAnexosExtras([]);
  };

  const handleArquivoSelecionado = async (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    setArquivoNotaFiscal(arquivo);
    setFaseUpload("lendo");

    const formData = new FormData();
    formData.append("arquivo", arquivo);

    try {
      const response = await api.post("/anexos/ler-nota", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const extraido = response.data;

      // Converter a data de DD/MM/YYYY do PDF para YYYY-MM-DD do Input HTML
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
      // Mesmo se der erro, libera para o instrutor preencher manualmente
      setDadosNota({
        emitente: "",
        valor: "",
        data: "",
        numero: "",
        descricao: "",
      });
    } finally {
      setFaseUpload("revisao");
    }
  };

  const handleConfirmarEnvio = (e) => {
    e.preventDefault();
    // Na próxima etapa faremos o envio real da Despesa + Arquivos.
    // Por enquanto, validamos apenas a visualização.
    alert("Despesa e arquivos confirmados na interface!");
    voltarParaAno();
  };

  const handleAnexosExtras = (e) => {
    setAnexosExtras(Array.from(e.target.files));
  };

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

        {caminho.length === 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {anos.map((ano) => (
              <button
                key={ano}
                onClick={() => entrarNaPasta(ano)}
                className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col items-center justify-center group"
              >
                <FolderIcon />
                <span className="text-slate-700 font-bold group-hover:text-blue-600">
                  {ano}
                </span>
              </button>
            ))}
          </div>
        )}

        {caminho.length === 1 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {meses.map((mes) => (
              <button
                key={mes}
                onClick={() => entrarNaPasta(mes)}
                className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col items-center justify-center group"
              >
                <FolderIcon />
                <span className="text-slate-700 font-bold group-hover:text-blue-600">
                  {mes}
                </span>
              </button>
            ))}
          </div>
        )}

        {caminho.length === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 max-w-2xl mx-auto">
            {faseUpload === "aguardando" && (
              <div className="text-center py-12 border-dashed border-2 border-slate-300 rounded-xl bg-slate-50">
                <UploadIcon />
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  Arraste a Nota Fiscal
                </h3>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                  Nosso robô lerá o PDF e preencherá os dados para você.
                </p>
                <label className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg cursor-pointer transition-colors shadow-sm inline-block">
                  Selecionar Arquivo PDF
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf"
                    onChange={handleArquivoSelecionado}
                  />
                </label>
              </div>
            )}

            {faseUpload === "lendo" && (
              <div className="text-center py-16">
                <RobotIcon />
                <h3 className="text-xl font-bold text-slate-800 mb-2 animate-pulse">
                  Robô analisando documento...
                </h3>
                <p className="text-slate-500">
                  Extraindo informações na nuvem.
                </p>
              </div>
            )}

            {faseUpload === "revisao" && (
              <div>
                <div className="mb-6 pb-6 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-emerald-700">
                      Leitura Concluída!
                    </h3>
                    <p className="text-slate-500 text-sm mt-1">
                      Verifique se o robô extraiu os dados corretamente.
                    </p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-700 py-1 px-3 rounded-full text-xs font-bold">
                    NF Anexada
                  </span>
                </div>

                <form onSubmit={handleConfirmarEnvio} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Emitente / Fornecedor
                      </label>
                      <input
                        type="text"
                        className={`w-full px-4 py-2 border rounded-lg outline-none transition-colors ${dadosNota.emitente ? "border-slate-300 focus:ring-2 focus:ring-blue-500" : "border-red-400 bg-red-50 focus:ring-2 focus:ring-red-500"}`}
                        value={dadosNota.emitente}
                        onChange={(e) =>
                          setDadosNota({
                            ...dadosNota,
                            emitente: e.target.value,
                          })
                        }
                        placeholder={
                          dadosNota.emitente ? "" : "Preencha o fornecedor"
                        }
                      />
                      {!dadosNota.emitente && (
                        <span className="text-xs text-red-600 font-medium mt-1 inline-block">
                          ⚠️ Dado não localizado. Preencha manualmente.
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Valor (R$)
                      </label>
                      <input
                        type="text"
                        className={`w-full px-4 py-2 border rounded-lg outline-none font-medium transition-colors ${dadosNota.valor ? "border-slate-300 focus:ring-2 focus:ring-blue-500" : "border-red-400 bg-red-50 focus:ring-2 focus:ring-red-500"}`}
                        value={dadosNota.valor}
                        onChange={(e) =>
                          setDadosNota({ ...dadosNota, valor: e.target.value })
                        }
                        placeholder={dadosNota.valor ? "" : "Ex: 1500,00"}
                      />
                      {!dadosNota.valor && (
                        <span className="text-xs text-red-600 font-medium mt-1 inline-block">
                          ⚠️ Informe o valor.
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Data da Nota
                      </label>
                      <input
                        type="date"
                        className={`w-full px-4 py-2 border rounded-lg outline-none transition-colors ${dadosNota.data ? "border-slate-300 focus:ring-2 focus:ring-blue-500" : "border-red-400 bg-red-50 focus:ring-2 focus:ring-red-500"}`}
                        value={dadosNota.data}
                        onChange={(e) =>
                          setDadosNota({ ...dadosNota, data: e.target.value })
                        }
                      />
                      {!dadosNota.data && (
                        <span className="text-xs text-red-600 font-medium mt-1 inline-block">
                          ⚠️ Informe a data.
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Número da NF
                      </label>
                      <input
                        type="text"
                        className={`w-full px-4 py-2 border rounded-lg outline-none transition-colors ${dadosNota.numero ? "border-slate-300 focus:ring-2 focus:ring-blue-500" : "border-red-400 bg-red-50 focus:ring-2 focus:ring-red-500"}`}
                        value={dadosNota.numero}
                        onChange={(e) =>
                          setDadosNota({ ...dadosNota, numero: e.target.value })
                        }
                        placeholder={dadosNota.numero ? "" : "Ex: 104384"}
                      />
                      {!dadosNota.numero && (
                        <span className="text-xs text-red-600 font-medium mt-1 inline-block">
                          ⚠️ Informe o número.
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Descrição
                      </label>
                      <input
                        type="text"
                        className={`w-full px-4 py-2 border rounded-lg outline-none transition-colors ${dadosNota.descricao ? "border-slate-300 focus:ring-2 focus:ring-blue-500" : "border-red-400 bg-red-50 focus:ring-2 focus:ring-red-500"}`}
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

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <label className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-2">
                      + Anexar Listas de Presença ou Relatórios (
                      {anexosExtras.length} selecionados)
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept=".pdf,.jpg,.png,.jpeg"
                        onChange={handleAnexosExtras}
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors mt-6"
                  >
                    Confirmar e Enviar Prestação
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
