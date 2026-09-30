import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Banknote,
  Check,
  FileDown,
  FolderPlus,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Tags,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { obterMensagemErro } from '../services/api';
import {
  listarContasBancarias,
  criarContaBancaria,
  atualizarContaBancaria,
  excluirContaBancaria,
  importarOfx,
  listarTransacoesBancarias,
  adicionarTransacaoManual,
  excluirTransacaoBancaria,
  limparMesBancario,
  listarGrupos,
  criarGrupo,
  atualizarGrupo,
  excluirGrupo,
  classificarTransacoes,
  obterRelatorio,
} from '../services/prestacaoBancos';
import { exportarPdfPrestacaoBancos } from '../services/exportarPdf';

const heading = { fontFamily: "'Varela Round', sans-serif" };

const MESES = [
  { num: 1, nome: 'Janeiro' }, { num: 2, nome: 'Fevereiro' }, { num: 3, nome: 'Março' },
  { num: 4, nome: 'Abril' }, { num: 5, nome: 'Maio' }, { num: 6, nome: 'Junho' },
  { num: 7, nome: 'Julho' }, { num: 8, nome: 'Agosto' }, { num: 9, nome: 'Setembro' },
  { num: 10, nome: 'Outubro' }, { num: 11, nome: 'Novembro' }, { num: 12, nome: 'Dezembro' },
];

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const ANO_ATUAL = new Date().getFullYear();
const ANOS = Array.from({ length: 4 }, (_, i) => ANO_ATUAL - 1 + i);

const CORES_BANCO = {
  'Banco do Brasil': '#F9D100',
  'BANCO DO BRASIL': '#F9D100',
  SICREDI: '#00B13A',
  SICOOB: '#003A63',
};

const CORES_SUGESTAO = ['#0F6E65', '#4F46E5', '#B45309', '#DC2626', '#7C3AED', '#0E7490', '#C026D3', '#16A34A', '#F59E0B', '#64748B'];

const formatarMoeda = (valor) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);

const fmtData = (iso) => {
  const [ano, mes, dia] = String(iso || '').split('-');
  return `${dia}/${mes}/${ano}`;
};

const CorBanco = (conta) => {
  const chave = String(conta?.banco || '').toUpperCase();
  const cor = CORES_BANCO[String(conta?.banco || '')] || CORES_BANCO[chave] || '#1a1a1a';
  return cor;
};

function DonutSaidas({ grupos }) {
  const itens = (grupos || [])
    .map((g) => ({
      nome: g.grupo?.nome || 'Não classificado',
      cor: g.grupo?.cor || '#78716C',
      valor: Number(g.saidas || 0),
    }))
    .filter((i) => i.valor > 0);

  const total = itens.reduce((acc, i) => acc + i.valor, 0);
  if (total <= 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-stone-400">
        Nenhuma saída registrada no ano.
      </div>
    );
  }

  const RAIO = 54;
  const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
  const { segmentos } = itens.reduce(
    (acc, i) => {
      const frac = i.valor / total;
      return {
        offset: acc.offset + frac * CIRCUNFERENCIA,
        segmentos: [...acc.segmentos, { ...i, frac, offset: acc.offset }],
      };
    },
    { offset: 0, segmentos: [] }
  );

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0">
        <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90">
          <circle cx="75" cy="75" r={RAIO} fill="none" stroke="#F1EEE7" strokeWidth="26" />
          {segmentos.map((s, idx) => (
            <circle
              key={`${s.nome}-${idx}`}
              cx="75"
              cy="75"
              r={RAIO}
              fill="none"
              stroke={s.cor}
              strokeWidth="26"
              strokeDasharray={`${s.frac * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`}
              strokeDashoffset={-s.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-semibold text-stone-400 uppercase">Saídas</span>
          <span className="text-sm font-bold text-stone-800">R$ {formatarMoeda(total)}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2">
        {segmentos.map((s, idx) => (
          <li key={`${s.nome}-${idx}`} className="flex items-center gap-2 text-sm">
            <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.cor }} />
            <span className="flex-1 min-w-0 truncate text-stone-600">{s.nome}</span>
            <span className="font-bold text-stone-800">R$ {formatarMoeda(s.valor)}</span>
            <span className="w-12 text-right text-xs text-stone-400">{(s.frac * 100).toFixed(1).replace('.', ',')}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarrasMensais({ grupos }) {
  const dados = Array.from({ length: 12 }, (_, m) => {
    const porGrupo = (grupos || [])
      .map((g) => ({
        nome: g.grupo?.nome || 'Não classificado',
        cor: g.grupo?.cor || '#78716C',
        valor: Number(g.porMes?.find((p) => p.mes === m + 1)?.saidas || 0),
      }))
      .filter((i) => i.valor > 0);
    return {
      mes: m + 1,
      total: porGrupo.reduce((acc, i) => acc + i.valor, 0),
      porGrupo,
    };
  });

  const maxMes = Math.max(1, ...dados.map((d) => d.total));

  return (
    <div>
      <div className="flex items-end gap-1.5 h-48">
        {dados.map((d) => (
          <div key={d.mes} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${d.mes}/${ANO_ATUAL}: R$ ${formatarMoeda(d.total)}`}>
            <div className="w-full flex flex-col justify-end rounded-t-sm overflow-hidden" style={{ height: `${Math.max(d.total > 0 ? 4 : 0, (d.total / maxMes) * 100)}%` }}>
              {d.porGrupo.map((g, idx) => (
                <div
                  key={`${g.nome}-${idx}`}
                  style={{ backgroundColor: g.cor }}
                  title={`${g.nome}: R$ ${formatarMoeda(g.valor)}`}
                  className="w-full [&+div]:border-t border-white/40"
                />
              ))}
            </div>
            <span className="text-[10px] text-stone-500">{MESES_CURTOS[d.mes - 1]}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 h-5 relative">
        {[0.25, 0.5, 0.75, 1].map((frac) => (
          <div key={frac} className="absolute w-full border-b border-dashed border-cream-200" style={{ bottom: `${frac * 100}%` }} />
        ))}
      </div>
    </div>
  );
}

function LegendaGrupos({ grupos }) {
  const itens = (grupos || [])
    .map((g) => ({ nome: g.grupo?.nome || 'Não classificado', cor: g.grupo?.cor || '#78716C' }))
    .filter((g, idx, arr) => arr.findIndex((x) => x.nome === g.nome && x.cor === g.cor) === idx && g.nome !== 'Não classificado');

  if (itens.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
      {itens.map((g) => (
        <span key={g.nome} className="inline-flex items-center gap-2 text-xs text-stone-600">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: g.cor }} />
          {g.nome}
        </span>
      ))}
      {grupos.some((g) => g.saldo !== undefined && g.grupo === null) && (
        <span className="inline-flex items-center gap-2 text-xs text-stone-600">
          <span className="inline-block w-3 h-3 rounded-full bg-stone-400" />
          Não classificado
        </span>
      )}
    </div>
  );
}

export default function PrestacaoBancos() {
  const [contas, setContas] = useState([]);
  const [tela, setTela] = useState('home');
  const [contaAtiva, setContaAtiva] = useState(null);

  const [ano, setAno] = useState(ANO_ATUAL);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [transacoes, setTransacoes] = useState([]);
  const [relatorio, setRelatorio] = useState(null);

  const [arquivo, setArquivo] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('');

  const [grupos, setGrupos] = useState([]);
  const [modalGrupo, setModalGrupo] = useState({ aberto: false, modo: 'NOVA', id: null, nome: '', cor: '#0F6E65' });
  const [modoClassificar, setModoClassificar] = useState(false);
  const [selecionadas, setSelecionadas] = useState(() => new Set());
  const [grupoClassificar, setGrupoClassificar] = useState('');
  const [exportando, setExportando] = useState(false);

  const [modalConta, setModalConta] = useState({ aberto: false, modo: 'NOVA', id: null, banco: '', finalidade: '' });
  const [salvando, setSalvando] = useState(false);
  const inputArquivo = useRef(null);

  const carregarContas = useCallback(async () => {
    try {
      setContas(await listarContasBancarias());
    } catch {
      setMensagem('⚠️ Erro ao carregar contas bancárias.');
    }
  }, []);

  const carregarTransacoes = useCallback(
    async (contaId, mesBusca, anoBusca) => {
      try {
        setTransacoes(await listarTransacoesBancarias(contaId, mesBusca, anoBusca));
      } catch {
        setTransacoes([]);
      }
    },
    []
  );

  const carregarGrupos = useCallback(async (contaId) => {
    try {
      setGrupos(await listarGrupos(contaId));
    } catch {
      setGrupos([]);
    }
  }, []);

  const carregarRelatorio = useCallback(async (contaId, anoBusca) => {
    try {
      setRelatorio(await obterRelatorio(contaId, anoBusca));
    } catch {
      setRelatorio(null);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarContas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tela === 'conta' && contaAtiva) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      carregarTransacoes(contaAtiva.id, mes, ano);
    }
  }, [tela, contaAtiva, mes, ano, carregarTransacoes]);

  useEffect(() => {
    if (tela === 'conta' && contaAtiva && mes === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      carregarRelatorio(contaAtiva.id, ano);
    }
  }, [tela, contaAtiva, mes, ano, carregarRelatorio]);

  // Feedback temporário
  useEffect(() => {
    if (!mensagem) return;
    const timer = setTimeout(() => setMensagem(''), 4000);
    return () => clearTimeout(timer);
  }, [mensagem]);

  const abrirConta = (conta) => {
    setContaAtiva(conta);
    setMes(new Date().getMonth() + 1);
    setMensagem('');
    setModoClassificar(false);
    setSelecionadas(new Set());
    setTela('conta');
    carregarGrupos(conta.id);
  };

  const voltar = () => {
    setTela('home');
    setContaAtiva(null);
    setTransacoes([]);
    setRelatorio(null);
    setGrupos([]);
    setMensagem('');
    setModoClassificar(false);
    setSelecionadas(new Set());
  };

  const mudarMes = (n) => {
    setMes(n);
    setSelecionadas(new Set());
  };

  // ----- Upload OFX -----
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!arquivo) {
      setMensagem('Selecione um arquivo OFX.');
      return;
    }
    try {
      setSalvando(true);
      const resultado = await importarOfx(contaAtiva.id, arquivo);
      setMensagem('✅ ' + (resultado.mensagem || 'Extrato importado com sucesso!'));
      setArquivo(null);
      if (inputArquivo.current) inputArquivo.current.value = '';
      await carregarTransacoes(contaAtiva.id, mes, ano);
    } catch (error) {
      setMensagem('❌ ' + obterMensagemErro(error, 'Erro ao importar o arquivo.'));
    } finally {
      setSalvando(false);
    }
  };

  // ----- Saldo inicial manual -----
  const handleSaldoInicial = async () => {
    if (!saldoInicial.trim()) {
      setMensagem('Digite o valor do saldo inicial.');
      return;
    }
    const valor = parseFloat(saldoInicial.replace('.', '').replace(',', '.'));
    if (Number.isNaN(valor) || valor <= 0) {
      setMensagem('Valor inválido. Use o formato 5000,00.');
      return;
    }
    try {
      setSalvando(true);
      await adicionarTransacaoManual(contaAtiva.id, {
        data: `${ano}-01-01`,
        descricao: `Saldo Inicial em Caixa - ${ano}`,
        tipo: 'ENTRADA',
        valor,
      });
      setSaldoInicial('');
      setMensagem('✅ Saldo inicial adicionado.');
      await carregarTransacoes(contaAtiva.id, mes, ano);
    } catch (error) {
      setMensagem('❌ ' + obterMensagemErro(error, 'Erro ao adicionar saldo inicial.'));
    } finally {
      setSalvando(false);
    }
  };

  const deletarTransacao = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta transação?')) return;
    try {
      await excluirTransacaoBancaria(id);
      setSelecionadas((atual) => {
        const nova = new Set(atual);
        nova.delete(id);
        return nova;
      });
      await carregarTransacoes(contaAtiva.id, mes, ano);
    } catch (error) {
      setMensagem('❌ ' + obterMensagemErro(error, 'Erro ao excluir transação.'));
    }
  };

  const limparMesCompleto = async () => {
    const nomeMes = MESES.find((m) => m.num === mes)?.nome;
    if (!window.confirm(`⚠️ Isso vai apagar TODAS as transações de ${nomeMes}/${ano}. Deseja continuar?`)) return;
    try {
      await limparMesBancario(contaAtiva.id, mes, ano);
      setMensagem('✅ Mês apagado.');
      setSelecionadas(new Set());
      await carregarTransacoes(contaAtiva.id, mes, ano);
      if (mes === 0) await carregarRelatorio(contaAtiva.id, ano);
    } catch (error) {
      setMensagem('❌ ' + obterMensagemErro(error, 'Erro ao limpar o mês.'));
    }
  };

  // ----- CRUD de contas -----
  const salvarConta = async (e) => {
    e.preventDefault();
    const banco = modalConta.banco.trim();
    const finalidade = modalConta.finalidade.trim();
    if (!banco || !finalidade) {
      setMensagem('Informe o banco e a finalidade.');
      return;
    }
    try {
      setSalvando(true);
      if (modalConta.modo === 'NOVA') {
        await criarContaBancaria(banco, finalidade);
      } else {
        await atualizarContaBancaria(modalConta.id, banco, finalidade);
      }
      setModalConta({ aberto: false, modo: 'NOVA', id: null, banco: '', finalidade: '' });
      setMensagem('✅ Conta salva.');
      await carregarContas();
    } catch (error) {
      setMensagem('❌ ' + obterMensagemErro(error, 'Erro ao salvar a conta.'));
    } finally {
      setSalvando(false);
    }
  };

  const excluirConta = async (conta) => {
    if (!window.confirm(`Excluir a conta ${conta.banco} (${conta.finalidade})? Todas as transações também serão apagadas.`)) return;
    try {
      await excluirContaBancaria(conta.id);
      setMensagem('✅ Conta excluída.');
      await carregarContas();
    } catch (error) {
      setMensagem('❌ ' + obterMensagemErro(error, 'Erro ao excluir a conta.'));
    }
  };

  // ----- CRUD de grupos -----
  const abrirNovoGrupo = () => setModalGrupo({ aberto: true, modo: 'NOVA', id: null, nome: '', cor: '#0F6E65' });

  const abrirEditarGrupo = (grupo) =>
    setModalGrupo({ aberto: true, modo: 'EDITAR', id: grupo.id, nome: grupo.nome, cor: grupo.cor });

  const salvarGrupo = async (e) => {
    e.preventDefault();
    if (!modalGrupo.nome.trim()) {
      setMensagem('Informe o nome do grupo.');
      return;
    }
    try {
      setSalvando(true);
      if (modalGrupo.modo === 'NOVA') {
        await criarGrupo(contaAtiva.id, modalGrupo.nome.trim(), modalGrupo.cor);
      } else {
        await atualizarGrupo(contaAtiva.id, modalGrupo.id, modalGrupo.nome.trim(), modalGrupo.cor);
      }
      setModalGrupo({ aberto: false, modo: 'NOVA', id: null, nome: '', cor: '#0F6E65' });
      setMensagem('✅ Grupo salvo.');
      await carregarGrupos(contaAtiva.id);
    } catch (error) {
      setMensagem('❌ ' + obterMensagemErro(error, 'Erro ao salvar o grupo.'));
    } finally {
      setSalvando(false);
    }
  };

  const excluirGrupoConfirm = async (grupo) => {
    if (!window.confirm(`Excluir o grupo "${grupo.nome}"? Os lançamentos classificados ficarão sem grupo.`)) return;
    try {
      await excluirGrupo(contaAtiva.id, grupo.id);
      setMensagem('✅ Grupo excluído.');
      await carregarGrupos(contaAtiva.id);
      await carregarTransacoes(contaAtiva.id, mes, ano);
      if (mes === 0) await carregarRelatorio(contaAtiva.id, ano);
    } catch (error) {
      setMensagem('❌ ' + obterMensagemErro(error, 'Erro ao excluir o grupo.'));
    }
  };

  // ----- Classificação em lote -----
  const alternarSelecao = (id) => {
    setSelecionadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });
  };

  const alternarTodasVisiveis = () => {
    setSelecionadas((atual) => {
      const visiveis = transacoesDoMes.map((t) => t.id);
      const todasMarcadas = visiveis.length > 0 && visiveis.every((id) => atual.has(id));
      const nova = new Set(atual);
      if (todasMarcadas) visiveis.forEach((id) => nova.delete(id));
      else visiveis.forEach((id) => nova.add(id));
      return nova;
    });
  };

  const aplicarClassificacao = async (remover) => {
    const ids = [...selecionadas];
    if (ids.length === 0) return;
    if (!remover && !grupoClassificar) {
      setMensagem('Escolha um grupo para classificar.');
      return;
    }
    try {
      setSalvando(true);
      const resultado = await classificarTransacoes(ids, remover ? null : grupoClassificar);
      setSalvando(false);
      setMensagem('✅ ' + (resultado.mensagem || `${ids.length} lançamento(s) classificados.`));
      setSelecionadas(new Set());
      setModoClassificar(false);
      setGrupoClassificar('');
      await carregarTransacoes(contaAtiva.id, mes, ano);
      if (mes === 0) await carregarRelatorio(contaAtiva.id, ano);
    } catch (error) {
      setSalvando(false);
      setMensagem('❌ ' + obterMensagemErro(error, 'Erro ao classificar os lançamentos.'));
    }
  };

  // ----- PDF -----
  const exportarPdf = async () => {
    try {
      setExportando(true);
      const dados = relatorio || (await obterRelatorio(contaAtiva.id, ano));
      const nomeUsuario = localStorage.getItem('usuarioNome') || 'Gestor';
      exportarPdfPrestacaoBancos({ conta: contaAtiva, ano, relatorio: dados, nomeUsuario });
      setMensagem('✅ PDF gerado.');
    } catch (error) {
      setMensagem('❌ ' + obterMensagemErro(error, 'Erro ao gerar o PDF.'));
    } finally {
      setExportando(false);
    }
  };

  // ----- Cálculos -----
  const transacoesDoMes = mes === 0 ? transacoes : transacoes.filter((t) => Number(t.data.slice(5, 7)) === mes);
  const totalEntradas = transacoesDoMes.filter((t) => t.tipo === 'ENTRADA').reduce((acc, t) => acc + Number(t.valor), 0);
  const totalSaidas = transacoesDoMes.filter((t) => t.tipo === 'SAIDA').reduce((acc, t) => acc + Number(t.valor), 0);
  const balanco = totalEntradas - totalSaidas;
  const saldoFinal = transacoes.filter((t) => t.tipo === 'ENTRADA').reduce((acc, t) => acc + Number(t.valor), 0)
    - transacoes.filter((t) => t.tipo === 'SAIDA').reduce((acc, t) => acc + Number(t.valor), 0);

  const periodo = mes === 0 ? 'Ano' : MESES.find((m) => m.num === mes)?.nome;

  const salvar = salvando;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {mensagem && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold bg-white border border-cream-200 shadow-sm animate-in fade-in">
          {mensagem}
        </div>
      )}

      {tela === 'home' && (
        <div>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 style={heading} className="text-2xl text-stone-800">Prestação Bancos</h1>
              <p className="text-sm text-stone-500 mt-1">
                Selecione a conta para visualizar ou importar o extrato (OFX).
              </p>
            </div>
            <button
              onClick={() => setModalConta({ aberto: true, modo: 'NOVA', id: null, banco: '', finalidade: '' })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nova Conta
            </button>
          </div>

          {contas.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-cream-200">
              <Banknote className="w-10 h-10 mx-auto text-stone-300" />
              <p className="mt-3 text-sm text-stone-500">Nenhuma conta cadastrada.</p>
              <button
                onClick={() => setModalConta({ aberto: true, modo: 'NOVA', id: null, banco: '', finalidade: '' })}
                className="mt-4 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
              >
                Cadastrar a primeira conta
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {contas.map((conta) => (
                <div
                  key={conta.id}
                  onClick={() => abrirConta(conta)}
                  className="group cursor-pointer bg-white rounded-2xl p-6 border border-cream-200 border-t-4 shadow-sm transition-transform hover:-translate-y-1"
                  style={{ borderTopColor: CorBanco(conta) }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 style={heading} className="text-lg text-stone-800 truncate">{conta.banco}</h2>
                      <span className="inline-block mt-2 px-3 py-1 rounded-full bg-cream-100 text-xs font-semibold text-stone-600">
                        {conta.finalidade}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalConta({ aberto: true, modo: 'EDITAR', id: conta.id, banco: conta.banco, finalidade: conta.finalidade });
                        }}
                        title="Editar conta"
                        className="p-2 rounded-lg text-stone-400 hover:text-brand-700 hover:bg-cream-100 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          excluirConta(conta);
                        }}
                        title="Excluir conta"
                        className="p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tela === 'conta' && contaAtiva && (
        <div>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <button
                onClick={voltar}
                className="flex items-center gap-1.5 text-sm text-brand-700 font-semibold hover:underline mb-2"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar para Contas
              </button>
              <h1 style={heading} className="text-2xl text-stone-800">
                {contaAtiva.banco} <span className="font-normal text-stone-500">| {contaAtiva.finalidade}</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-stone-500">Ano Base:</span>
              <select
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="px-3 py-2 rounded-lg border border-cream-200 bg-white text-sm font-semibold text-stone-700"
              >
                {ANOS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
            {MESES.map((m) => (
              <button
                key={m.num}
                onClick={() => mudarMes(m.num)}
                className={`px-2 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                  mes === m.num ? 'bg-stone-800 text-white shadow-sm' : 'bg-white text-stone-500 border border-cream-200 hover:bg-cream-100'
                }`}
              >
                {m.nome}
              </button>
            ))}
          </div>

          <button
            onClick={() => mudarMes(0)}
            className={`w-full px-4 py-3 rounded-xl font-bold text-sm mb-6 transition-colors ${
              mes === 0 ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-stone-500 border border-cream-200 hover:bg-cream-100'
            }`}
          >
            📊 Visualizar Balanço {ano} Completo
          </button>

          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
              onClick={abrirNovoGrupo}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-stone-700 text-sm font-semibold border border-cream-200 hover:bg-cream-100 transition-colors shadow-sm"
            >
              <Tags className="w-4 h-4 text-brand-700" /> Grupos
            </button>
            <button
              onClick={() => {
                setModoClassificar((v) => !v);
                setSelecionadas(new Set());
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm ${
                modoClassificar ? 'bg-stone-800 text-white' : 'bg-white text-stone-700 border border-cream-200 hover:bg-cream-100'
              }`}
            >
              <Layers className="w-4 h-4 text-brand-700" />
              {modoClassificar ? 'Sair do modo classificação' : 'Classificar lançamentos'}
            </button>
            {mes === 0 && (
              <button
                onClick={exportarPdf}
                disabled={exportando || salvar}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-60"
              >
                {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                Exportar PDF
              </button>
            )}
          </div>

          {mes === 0 && (
            <div className="bg-white rounded-2xl p-5 border border-brand-100 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 style={heading} className="text-base text-stone-800">Painel Gráfico de {ano}</h3>
                <span className="text-xs text-stone-400">Composição das saídas por grupo</span>
              </div>
              {relatorio && (
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="bg-cream-50 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-3">Distribuição de Saídas</p>
                    <DonutSaidas grupos={relatorio.grupos} />
                  </div>
                  <div className="bg-cream-50 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-3">Saídas por Mês</p>
                    <BarrasMensais grupos={relatorio.grupos} />
                    <LegendaGrupos grupos={relatorio.grupos} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 min-w-0 space-y-6">
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl p-4 border border-cream-200 border-l-4 border-l-emerald-500 shadow-sm">
                  <p className="text-xs font-semibold text-stone-500">Entradas de {periodo}</p>
                  <p className="mt-1 text-lg font-bold text-emerald-600">R$ {formatarMoeda(totalEntradas)}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-cream-200 border-l-4 border-l-red-500 shadow-sm">
                  <p className="text-xs font-semibold text-stone-500">Saídas de {periodo}</p>
                  <p className="mt-1 text-lg font-bold text-red-600">R$ {formatarMoeda(totalSaidas)}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-cream-200 border-l-4 border-l-brand-600 shadow-sm">
                  <p className="text-xs font-semibold text-stone-500">Balanço de {periodo}</p>
                  <p className={`mt-1 text-lg font-bold ${balanco >= 0 ? 'text-stone-800' : 'text-red-600'}`}>
                    R$ {formatarMoeda(balanco)}
                  </p>
                </div>
                <div className="bg-stone-800 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-stone-400">Valor Final na Conta</p>
                  <p className={`mt-1 text-lg font-bold ${saldoFinal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    R$ {formatarMoeda(saldoFinal)}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-cream-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 style={heading} className="text-base text-stone-800">
                    Movimentações de {periodo}
                  </h3>
                  {modoClassificar && (
                    <span className="text-xs font-semibold text-stone-500">
                      {selecionadas.size} selecionado(s)
                    </span>
                  )}
                  {mes !== 0 && transacoesDoMes.length > 0 && (
                    <button
                      onClick={limparMesCompleto}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 border border-red-500 hover:bg-red-50 transition-colors"
                    >
                      ⚠️ Apagar Tudo de {periodo}
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-cream-200">
                        {modoClassificar && (
                          <th className="px-3 py-2.5 w-8">
                            <input
                              type="checkbox"
                              checked={transacoesDoMes.length > 0 && transacoesDoMes.every((t) => selecionadas.has(t.id))}
                              onChange={alternarTodasVisiveis}
                              className="w-4 h-4 accent-brand-600"
                            />
                          </th>
                        )}
                        <th className="px-3 py-2.5 text-xs text-stone-500 font-semibold">Data</th>
                        <th className="px-3 py-2.5 text-xs text-stone-500 font-semibold">Descrição</th>
                        <th className="px-3 py-2.5 text-xs text-stone-500 font-semibold text-right">Valor (R$)</th>
                        <th className="px-3 py-2.5 text-xs text-stone-500 font-semibold text-center w-14">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transacoesDoMes.length > 0 ? (
                        transacoesDoMes.map((t) => (
                          <tr key={t.id} className={`border-b border-cream-100 hover:bg-cream-50 ${selecionadas.has(t.id) ? 'bg-brand-50/40' : ''}`}>
                            {modoClassificar && (
                              <td className="px-3 py-3 w-8">
                                <input
                                  type="checkbox"
                                  checked={selecionadas.has(t.id)}
                                  onChange={() => alternarSelecao(t.id)}
                                  className="w-4 h-4 accent-brand-600"
                                />
                              </td>
                            )}
                            <td className="px-3 py-3 text-sm font-semibold text-stone-700 whitespace-nowrap">{fmtData(t.data)}</td>
                            <td className="px-3 py-3 text-sm text-stone-600">
                              <div className="flex flex-wrap items-center gap-2">
                                <span>{t.descricao}</span>
                                {t.grupoNome && (
                                  <span
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                                    style={{ backgroundColor: `${t.grupoCor}22`, color: t.grupoCor }}
                                  >
                                    {t.grupoNome}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className={`px-3 py-3 text-sm font-bold text-right whitespace-nowrap ${t.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {t.tipo === 'ENTRADA' ? '+' : '-'} R$ {formatarMoeda(t.valor)}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <button
                                onClick={() => deletarTransacao(t.id)}
                                title="Excluir transação"
                                className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={modoClassificar ? 5 : 4} className="px-3 py-10 text-center text-sm text-stone-400">
                            Nenhuma movimentação registrada neste período.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="lg:w-80 shrink-0">
              {mes !== 0 ? (
                <div className="bg-stone-800 rounded-2xl p-5 text-white sticky top-4">
                  <h3 style={heading} className="text-base mb-1.5">Importar Extrato</h3>
                  <p className="text-xs text-stone-400 mb-4">
                    Faça o upload do arquivo .OFX referente a {periodo}/{ano}.
                  </p>
                  <form onSubmit={handleUpload} className="space-y-3">
                    <input
                      ref={inputArquivo}
                      type="file"
                      accept=".ofx,.ofx.gz"
                      onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                      className="w-full text-xs text-stone-300 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-stone-700 file:text-white file:text-xs file:font-semibold file:cursor-pointer"
                    />
                    <button
                      type="submit"
                      disabled={salvar}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-500 disabled:opacity-60 transition-colors"
                    >
                      {salvar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Processar Arquivo
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-5 border border-cream-200 shadow-sm sticky top-4">
                  <h3 style={heading} className="text-base text-stone-800 mb-1.5">Configuração de Caixa</h3>
                  <p className="text-xs text-stone-500 mb-4">
                    Defina o valor exato que havia na conta no dia 01/01/{ano}.
                  </p>
                  <input
                    type="text"
                    placeholder="Ex: 5000,00"
                    value={saldoInicial}
                    onChange={(e) => setSaldoInicial(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-cream-200 text-sm mb-3"
                  />
                  <button
                    onClick={handleSaldoInicial}
                    disabled={salvar}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-800 text-white text-sm font-bold hover:bg-stone-700 disabled:opacity-60 transition-colors"
                  >
                    {salvar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Adicionar Saldo Inicial
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {modoClassificar && selecionadas.size > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[min(95vw,38rem)] bg-stone-800 text-white rounded-2xl shadow-2xl px-4 py-3 flex flex-wrap items-center gap-3 animate-in slide-in-up">
          <span className="text-sm font-bold whitespace-nowrap">{selecionadas.size} lançamento(s)</span>
          <select
            value={grupoClassificar}
            onChange={(e) => setGrupoClassificar(e.target.value)}
            className="flex-1 min-w-32 px-3 py-2 rounded-lg bg-stone-700 text-white text-sm border border-stone-600"
          >
            <option value="">Escolher grupo…</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>{g.nome}</option>
            ))}
          </select>
          <button
            onClick={() => aplicarClassificacao(false)}
            disabled={salvar}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-bold hover:bg-brand-500 disabled:opacity-60 transition-colors"
          >
            {salvar ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Classificar'}
          </button>
          <button
            onClick={() => aplicarClassificacao(true)}
            disabled={salvar}
            title="Remover a classificação dos lançamentos selecionados"
            className="px-3 py-2 rounded-lg text-xs font-semibold text-red-300 border border-red-400/40 hover:bg-red-500/10 transition-colors"
          >
            Remover grupo
          </button>
          <button
            onClick={() => setSelecionadas(new Set())}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-stone-400 hover:text-white transition-colors"
          >
            Limpar
          </button>
        </div>
      )}

      {modalConta.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40" onClick={() => !salvar && setModalConta({ ...modalConta, aberto: false })} aria-hidden="true" />
          <form
            onSubmit={salvarConta}
            className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-xl animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 style={heading} className="text-lg text-stone-800">
                {modalConta.modo === 'NOVA' ? 'Nova Conta Bancária' : 'Editar Conta Bancária'}
              </h3>
              <button
                type="button"
                onClick={() => setModalConta({ ...modalConta, aberto: false })}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-cream-100"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="block text-sm font-semibold text-stone-600">
              Banco
              <input
                type="text"
                value={modalConta.banco}
                onChange={(e) => setModalConta({ ...modalConta, banco: e.target.value })}
                placeholder="Ex: Banco do Brasil, SICREDI, SICOOB"
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-cream-200 text-sm"
                required
              />
            </label>

            <label className="block mt-4 text-sm font-semibold text-stone-600">
              Finalidade
              <input
                type="text"
                value={modalConta.finalidade}
                onChange={(e) => setModalConta({ ...modalConta, finalidade: e.target.value })}
                placeholder="Ex: Esporte, Cultura"
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-cream-200 text-sm"
                required
              />
            </label>

            <button
              type="submit"
              disabled={salvar}
              className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 disabled:opacity-60 transition-colors"
            >
              {salvar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {modalConta.modo === 'NOVA' ? 'Cadastrar Conta' : 'Salvar Alterações'}
            </button>
          </form>
        </div>
      )}

      {modalGrupo.aberto && contaAtiva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40" onClick={() => !salvar && setModalGrupo({ ...modalGrupo, aberto: false })} aria-hidden="true" />
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 style={heading} className="text-lg text-stone-800">
                {modalGrupo.modo === 'NOVA' ? 'Novo Grupo de Classificação' : 'Editar Grupo'}
              </h3>
              <button
                onClick={() => setModalGrupo({ ...modalGrupo, aberto: false })}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-cream-100"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={salvarGrupo}>
              <label className="block text-sm font-semibold text-stone-600">
                Nome do grupo
                <input
                  type="text"
                  value={modalGrupo.nome}
                  onChange={(e) => setModalGrupo({ ...modalGrupo, nome: e.target.value })}
                  placeholder="Ex: Manutenção de campo, Premiação, Material…"
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-cream-200 text-sm"
                  required
                />
              </label>

              <div className="mt-4">
                <span className="text-sm font-semibold text-stone-600">Cor do grupo</span>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {CORES_SUGESTAO.map((cor) => (
                    <button
                      type="button"
                      key={cor}
                      onClick={() => setModalGrupo({ ...modalGrupo, cor })}
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${modalGrupo.cor === cor ? 'ring-2 ring-offset-2 ring-stone-700' : ''}`}
                      style={{ backgroundColor: cor }}
                      title={cor}
                    />
                  ))}
                  <label className="flex items-center gap-2 ml-2 text-xs text-stone-500">
                    <input
                      type="color"
                      value={modalGrupo.cor}
                      onChange={(e) => setModalGrupo({ ...modalGrupo, cor: e.target.value })}
                      className="w-8 h-8 cursor-pointer"
                    />
                    Personalizada
                  </label>
                </div>
                <p className="mt-2 text-xs text-stone-400">
                  A cor é usada nos lançamentos classificados, gráficos e planilhas.
                </p>
              </div>

              <div className="flex items-center justify-between mt-6">
                <button
                  type="submit"
                  disabled={salvar}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 disabled:opacity-60 transition-colors"
                >
                  {salvar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {modalGrupo.modo === 'NOVA' ? 'Criar Grupo' : 'Salvar Alterações'}
                </button>
                {modalGrupo.modo === 'EDITAR' && (
                  <button
                    type="button"
                    onClick={() => excluirGrupoConfirm({ id: modalGrupo.id, nome: modalGrupo.nome })}
                    disabled={salvar}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-red-600 border border-red-500 hover:bg-red-50 disabled:opacity-60 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                )}
              </div>
            </form>

            <div className="mt-6 pt-4 border-t border-cream-200">
              <p className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-2">
                Grupos de {contaAtiva.banco} ({grupos.length})
              </p>
              {grupos.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-stone-400">
                  <FolderPlus className="w-4 h-4" /> Nenhum grupo ainda. Crie o primeiro acima.
                </div>
              ) : (
                <ul className="space-y-2 max-h-52 overflow-y-auto">
                  {grupos.map((g) => (
                    <li key={g.id} className="flex items-center gap-2 text-sm">
                      <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: g.cor }} />
                      <span className="flex-1 truncate text-stone-700">{g.nome}</span>
                      <button
                        onClick={() => abrirEditarGrupo(g)}
                        title="Editar grupo"
                        className="p-1.5 rounded-lg text-stone-400 hover:text-brand-700 hover:bg-cream-100 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}