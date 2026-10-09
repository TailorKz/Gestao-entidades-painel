import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Banknote,
  BarChart3,
  Check,
  FileDown,
  FolderPlus,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Search,
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

function montarListaGrupos(configurados, buckets) {
  const porId = new Map();
  for (const b of buckets || []) {
    if (b.grupo) porId.set(b.grupo.id, b);
  }
  const lista = [];
  for (const g of configurados || []) {
    const b = porId.get(g.id);
    lista.push(b || { grupo: g, entradas: 0, saidas: 0, saldo: 0, quantidade: 0, porMes: [] });
    porId.delete(g.id);
  }
  for (const restante of porId.values()) lista.push(restante);
  const semGrupo = (buckets || []).find((b) => !b.grupo);
  if (semGrupo) lista.push(semGrupo);
  return lista;
}

function DonutDistribuicao({ grupos, tipo }) {
  const rotulo = tipo === 'entradas' ? 'Entradas' : 'Saídas';
  const itens = (grupos || [])
    .map((g) => ({
      nome: g.grupo?.nome || 'Não classificado',
      cor: g.grupo?.cor || '#78716C',
      valor: Number(g[tipo] || 0),
    }))
    .filter((i) => i.valor > 0);

  const total = itens.reduce((acc, i) => acc + i.valor, 0);
  if (total <= 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-stone-400">
        Nenhuma {rotulo.toLowerCase()} registrada no ano.
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
          <span className="text-[10px] font-semibold text-stone-400 uppercase">{rotulo}</span>
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

function BarrasPorMes({ grupos, tipo }) {
  const dados = Array.from({ length: 12 }, (_, m) => {
    const porGrupo = (grupos || [])
      .map((g) => ({
        nome: g.grupo?.nome || 'Não classificado',
        cor: g.grupo?.cor || '#78716C',
        valor: Number(g.porMes?.find((p) => p.mes === m + 1)?.[tipo] || 0),
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
          <div key={d.mes} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${MESES_CURTOS[d.mes - 1]}: R$ ${formatarMoeda(d.total)}`}>
            <div className="w-full rounded-t-sm overflow-hidden" style={{ height: `${Math.max(d.total > 0 ? 4 : 0, (d.total / maxMes) * 100)}%` }}>
              {d.porGrupo.map((g, idx) => (
                <div
                  key={`${g.nome}-${idx}`}
                  style={{ backgroundColor: g.cor, height: `${(g.valor / Math.max(0.0001, d.total)) * 100}%` }}
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

function TabelaResumoGrupos({ grupos, tipo }) {
  const rotulo = tipo === 'entradas' ? 'Entradas' : 'Saídas';
  const totalDirecao = (grupos || []).reduce((acc, g) => acc + Number(g[tipo] || 0), 0);

  return (
    <div className="mt-6 pt-5 border-t border-cream-200">
      <p className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-3">Resumo por grupo</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-cream-200">
              <th className="px-3 py-2.5 text-xs text-stone-500 font-semibold">Grupo</th>
              <th className="px-3 py-2.5 text-xs text-stone-500 font-semibold text-right">Entradas</th>
              <th className="px-3 py-2.5 text-xs text-stone-500 font-semibold text-right">Saídas</th>
              <th className="px-3 py-2.5 text-xs text-stone-500 font-semibold text-right">Saldo</th>
              <th className="px-3 py-2.5 text-xs text-stone-500 font-semibold text-center">Lanç.</th>
              <th className="px-3 py-2.5 text-xs text-stone-500 font-semibold text-right">% {rotulo}</th>
            </tr>
          </thead>
          <tbody>
            {(grupos || []).map((g, idx) => {
              const nome = g.grupo?.nome || 'Não classificado';
              const cor = g.grupo?.cor || '#78716C';
              const v = Number(g[tipo] || 0);
              const pct = totalDirecao > 0 ? ((v / totalDirecao) * 100).toFixed(1).replace('.', ',') : '0,0';
              return (
                <tr key={`${nome}-${idx}`} className="border-b border-cream-100 hover:bg-cream-50">
                  <td className="px-3 py-2.5 text-sm">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cor }} />
                      <span className="font-semibold text-stone-700">{nome}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm font-bold text-emerald-600 text-right">R$ {formatarMoeda(g.entradas)}</td>
                  <td className="px-3 py-2.5 text-sm font-bold text-red-600 text-right">R$ {formatarMoeda(g.saidas)}</td>
                  <td className={`px-3 py-2.5 text-sm font-bold text-right ${Number(g.saldo || 0) >= 0 ? 'text-stone-800' : 'text-red-600'}`}>
                    R$ {formatarMoeda(g.saldo)}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-stone-500 text-center">{g.quantidade ?? 0}</td>
                  <td className="px-3 py-2.5 text-sm text-stone-500 text-right">{pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PainelGrafico({ grupos, ano }) {
  const [tipo, setTipo] = useState('saidas');
  const rotulo = tipo === 'entradas' ? 'Entradas' : 'Saídas';

  return (
    <div className="bg-white rounded-2xl p-5 border border-brand-100 shadow-sm mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h3 style={heading} className="text-base text-stone-800">Painel Gráfico de {ano}</h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTipo('entradas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              tipo === 'entradas' ? 'bg-brand-600 text-white shadow-sm' : 'bg-cream-100 text-stone-500 hover:bg-cream-200'
            }`}
          >
            Entradas
          </button>
          <button
            onClick={() => setTipo('saidas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              tipo === 'saidas' ? 'bg-brand-600 text-white shadow-sm' : 'bg-cream-100 text-stone-500 hover:bg-cream-200'
            }`}
          >
            Saídas
          </button>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-cream-50 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-3">Distribuição de {rotulo} por Grupo</p>
          <DonutDistribuicao grupos={grupos} tipo={tipo} />
        </div>
        <div className="bg-cream-50 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-3">{rotulo} por Mês</p>
          <BarrasPorMes grupos={grupos} tipo={tipo} />
          <LegendaGrupos grupos={grupos} />
        </div>
      </div>
      <TabelaResumoGrupos grupos={grupos} tipo={tipo} />
    </div>
  );
}

function ResumoGrupoPorMes({ grupos, meses }) {
  const [tipo, setTipo] = useState('saidas');
  const rotulo = tipo === 'entradas' ? 'Entradas' : 'Saídas';
  const mesesArr = (meses || []).slice().sort((a, b) => a - b);

  const linhas = (grupos || [])
    .map((g) => {
      const porMes = g.porMes || [];
      const celulas = mesesArr.map((m) => {
        const p = porMes.find((x) => x.mes === m);
        return { m, entradas: Number(p?.entradas || 0), saidas: Number(p?.saidas || 0) };
      });
      return {
        nome: g.grupo?.nome || 'Não classificado',
        cor: g.grupo?.cor || '#78716C',
        celulas,
        total: celulas.reduce((acc, c) => acc + c[tipo], 0),
        temMovimento: celulas.some((c) => c.entradas > 0 || c.saidas > 0),
      };
    })
    .filter((l) => l.temMovimento);

  const totaisPorMes = mesesArr.map((_, idx) => linhas.reduce((acc, l) => acc + l.celulas[idx][tipo], 0));
  const totalPeriodo = linhas.reduce((acc, l) => acc + l.total, 0);

  return (
    <div className="bg-white rounded-2xl p-5 border border-brand-100 shadow-sm mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 style={heading} className="text-base text-stone-800">Resumo por grupo por mês</h3>
          <p className="text-xs text-stone-500 mt-1">Valores exatos de cada grupo nos meses selecionados.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTipo('entradas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              tipo === 'entradas' ? 'bg-brand-600 text-white shadow-sm' : 'bg-cream-100 text-stone-500 hover:bg-cream-200'
            }`}
          >
            Entradas
          </button>
          <button
            onClick={() => setTipo('saidas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              tipo === 'saidas' ? 'bg-brand-600 text-white shadow-sm' : 'bg-cream-100 text-stone-500 hover:bg-cream-200'
            }`}
          >
            Saídas
          </button>
        </div>
      </div>

      {linhas.length === 0 ? (
        <p className="text-sm text-stone-400 py-4 text-center">
          Nenhuma movimentação classificada nos meses selecionados.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-cream-200">
                <th className="px-3 py-2.5 text-xs text-stone-500 font-semibold">Grupo</th>
                {mesesArr.map((m) => (
                  <th key={m} className="px-3 py-2.5 text-xs text-stone-500 font-semibold text-right">{MESES_CURTOS[m - 1]}</th>
                ))}
                <th className="px-3 py-2.5 text-xs text-stone-500 font-semibold text-right">Total {rotulo}</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, idx) => (
                <tr key={`${l.nome}-${idx}`} className="border-b border-cream-100 hover:bg-cream-50">
                  <td className="px-3 py-2.5 text-sm">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: l.cor }} />
                      <span className="font-semibold text-stone-700">{l.nome}</span>
                    </span>
                  </td>
                  {l.celulas.map((c, i) => (
                    <td key={i} className="px-3 py-2.5 text-sm text-stone-600 text-right">
                      {c[tipo] !== 0 ? `R$ ${formatarMoeda(c[tipo])}` : '—'}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-sm font-bold text-stone-800 text-right">R$ {formatarMoeda(l.total)}</td>
                </tr>
              ))}
              <tr className="bg-cream-50">
                <td className="px-3 py-2.5 text-sm font-bold text-stone-800">Total</td>
                {totaisPorMes.map((v, i) => (
                  <td key={i} className="px-3 py-2.5 text-sm font-bold text-stone-800 text-right">
                    {v !== 0 ? `R$ ${formatarMoeda(v)}` : '—'}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-sm font-bold text-brand-700 text-right">R$ {formatarMoeda(totalPeriodo)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function PrestacaoBancos() {
  const [contas, setContas] = useState([]);
  const [tela, setTela] = useState('home');
  const [contaAtiva, setContaAtiva] = useState(null);

  const mesAtual = new Date().getMonth() + 1;
  const [ano, setAno] = useState(ANO_ATUAL);
  const [meses, setMeses] = useState(() => new Set([mesAtual]));
  const [transacoes, setTransacoes] = useState([]);
  const [relatorio, setRelatorio] = useState(null);

  const [arquivo, setArquivo] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('');

  const [grupos, setGrupos] = useState([]);
  const [modalGrupo, setModalGrupo] = useState({ aberto: false, modo: 'NOVA', id: null, nome: '', cor: '#0F6E65' });
  const [modoClassificar, setModoClassificar] = useState(false);
  const [verPrestacao, setVerPrestacao] = useState(false);
  const [selecionadas, setSelecionadas] = useState(() => new Set());
  const [grupoClassificar, setGrupoClassificar] = useState('');
  const [exportando, setExportando] = useState(false);
  const [mesApagar, setMesApagar] = useState('');
  const [busca, setBusca] = useState('');

  const [modalConta, setModalConta] = useState({ aberto: false, modo: 'NOVA', id: null, banco: '', finalidade: '' });
  const [salvando, setSalvando] = useState(false);
  const inputArquivo = useRef(null);
  const ultimoCliqueRef = useRef(null);

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
      carregarTransacoes(contaAtiva.id, 0, ano);
      carregarRelatorio(contaAtiva.id, ano);
    }
  }, [tela, contaAtiva, ano, carregarTransacoes, carregarRelatorio]);

  // Feedback temporário
  useEffect(() => {
    if (!mensagem) return;
    const timer = setTimeout(() => setMensagem(''), 4000);
    return () => clearTimeout(timer);
  }, [mensagem]);

  const abrirConta = (conta) => {
    setContaAtiva(conta);
    setMeses(new Set([new Date().getMonth() + 1]));
    setMensagem('');
    setModoClassificar(false);
    setVerPrestacao(false);
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
    setVerPrestacao(false);
    setSelecionadas(new Set());
  };

  const alternarMes = (n) => {
    setMeses((atual) => {
      const nova = new Set(atual);
      if (nova.has(n)) {
        if (nova.size === 1) return nova;
        nova.delete(n);
      } else {
        nova.add(n);
      }
      return nova;
    });
    setSelecionadas(new Set());
  };

  const selecionarAnoCompleto = () => {
    setMeses(new Set(MESES.map((m) => m.num)));
    setSelecionadas(new Set());
  };

  const selecionarSomenteMes = (n) => {
    setMeses(new Set([n]));
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
      await carregarTransacoes(contaAtiva.id, 0, ano);
      await carregarRelatorio(contaAtiva.id, ano);
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
    if (Number.isNaN(valor)) {
      setMensagem('Valor inválido. Use o formato 5000,00 (ou -5000,00 se a conta estiver negativa).');
      return;
    }
    const descricaoSaldo = `Saldo Inicial em Caixa - ${ano}`;
    if (transacoes.some((t) => t.descricao === descricaoSaldo)) {
      setMensagem(`⚠️ Já existe o lançamento "${descricaoSaldo}". Para corrigir, exclua-o na lista e adicione novamente.`);
      return;
    }
    try {
      setSalvando(true);
      await adicionarTransacaoManual(contaAtiva.id, {
        data: `${ano}-01-01`,
        descricao: descricaoSaldo,
        tipo: 'ENTRADA',
        valor,
      });
      setSaldoInicial('');
      setMensagem('✅ Saldo inicial adicionado.');
      await carregarTransacoes(contaAtiva.id, 0, ano);
      await carregarRelatorio(contaAtiva.id, ano);
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
      await carregarTransacoes(contaAtiva.id, 0, ano);
    } catch (error) {
      setMensagem('❌ ' + obterMensagemErro(error, 'Erro ao excluir transação.'));
    }
  };

  const limparMesEscolhido = async () => {
    const m = Number(mesApagar);
    if (!m) return;
    const nomeMes = MESES.find((x) => x.num === m)?.nome || '';
    if (!window.confirm(`⚠️ Isso vai apagar TODAS as transações de ${nomeMes}/${ano}. Deseja continuar?`)) return;
    try {
      setSalvando(true);
      await limparMesBancario(contaAtiva.id, m, ano);
      setMensagem('✅ Extrato do mês apagado.');
      setSelecionadas(new Set());
      setMesApagar('');
      await carregarTransacoes(contaAtiva.id, 0, ano);
      await carregarRelatorio(contaAtiva.id, ano);
    } catch (error) {
      setMensagem('❌ ' + obterMensagemErro(error, 'Erro ao limpar o mês.'));
    } finally {
      setSalvando(false);
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
      await carregarTransacoes(contaAtiva.id, 0, ano);
      await carregarRelatorio(contaAtiva.id, ano);
    } catch (error) {
      setMensagem('❌ ' + obterMensagemErro(error, 'Erro ao excluir o grupo.'));
    }
  };

  // ----- Classificação em lote -----
  const alternarSelecao = (id, shift = false) => {
    setSelecionadas((atual) => {
      const nova = new Set(atual);
      if (shift && ultimoCliqueRef.current && ultimoCliqueRef.current !== id) {
        const ids = transacoesVisiveis.map((t) => t.id);
        const a = ids.indexOf(ultimoCliqueRef.current);
        const b = ids.indexOf(id);
        if (a !== -1 && b !== -1) {
          const [ini, fim] = a < b ? [a, b] : [b, a];
          const marcar = !atual.has(id);
          for (let i = ini; i <= fim; i += 1) {
            if (marcar) nova.add(ids[i]);
            else nova.delete(ids[i]);
          }
          ultimoCliqueRef.current = id;
          return nova;
        }
      }
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      ultimoCliqueRef.current = id;
      return nova;
    });
  };

  const alternarTodasVisiveis = () => {
    setSelecionadas((atual) => {
      const visiveis = transacoesVisiveis.map((t) => t.id);
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
      await carregarTransacoes(contaAtiva.id, 0, ano);
      await carregarRelatorio(contaAtiva.id, ano);
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
  const listaMeses = Array.from(meses).sort((a, b) => a - b);
  const ehAnoCompleto = listaMeses.length === 12;
  const nomeMes = (n) => MESES.find((m) => m.num === n)?.nome || '';
  const rotuloPeriodo = (arr) => {
    if (arr.length === 12) return 'Ano';
    if (arr.length === 1) return nomeMes(arr[0]);
    const contiguo = arr.every((m, i) => i === 0 || m === arr[i - 1] + 1);
    if (contiguo) return `${nomeMes(arr[0])} a ${nomeMes(arr[arr.length - 1])}`;
    return arr.map(nomeMes).join(' e ');
  };
  const periodo = rotuloPeriodo(listaMeses);
  const mesDoMes = (t) => Number(t.data.slice(5, 7));
  const transacoesDoMes = transacoes.filter((t) => meses.has(mesDoMes(t)));
  const termoBusca = busca.trim().toLowerCase();
  const transacoesVisiveis = termoBusca
    ? transacoesDoMes.filter((t) => (t.descricao || '').toLowerCase().includes(termoBusca))
    : transacoesDoMes;
  const totalEntradas = transacoesDoMes.filter((t) => t.tipo === 'ENTRADA').reduce((acc, t) => acc + Number(t.valor), 0);
  const totalSaidas = transacoesDoMes.filter((t) => t.tipo === 'SAIDA').reduce((acc, t) => acc + Number(t.valor), 0);
  const balanco = totalEntradas - totalSaidas;
  const ultimoMes = listaMeses.length > 0 ? Math.max(...listaMeses) : 0;
  const transacoesAteFinal = transacoes.filter((t) => mesDoMes(t) <= ultimoMes);
  const saldoFinal = transacoesAteFinal.filter((t) => t.tipo === 'ENTRADA').reduce((acc, t) => acc + Number(t.valor), 0)
    - transacoesAteFinal.filter((t) => t.tipo === 'SAIDA').reduce((acc, t) => acc + Number(t.valor), 0);
  const balancoPorMes = listaMeses.map((m) => {
    const doMes = transacoes.filter((t) => mesDoMes(t) === m);
    const entradasM = doMes.filter((t) => t.tipo === 'ENTRADA').reduce((acc, t) => acc + Number(t.valor), 0);
    const saidasM = doMes.filter((t) => t.tipo === 'SAIDA').reduce((acc, t) => acc + Number(t.valor), 0);
    return { m, nome: nomeMes(m), entradas: entradasM, saidas: saidasM, saldo: entradasM - saidasM, lancamentos: doMes.length };
  });

  const salvar = salvando;
  const mesesComDados = [...new Set(transacoes.map((t) => mesDoMes(t)))].sort((a, b) => a - b);

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

      {tela === 'conta' && contaAtiva && verPrestacao && (
        <div className="animate-in fade-in">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <button
                onClick={() => setVerPrestacao(false)}
                className="flex items-center gap-1.5 text-sm text-brand-700 font-semibold hover:underline mb-2"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar para a conta
              </button>
              <h1 style={heading} className="text-2xl text-stone-800">
                Prestação{' '}
                <span className="font-normal text-stone-500">| {contaAtiva.banco} · {contaAtiva.finalidade}</span>
              </h1>
              <p className="text-sm text-stone-500 mt-1">
                {periodo} de {ano} — entradas, saídas, saldo e distribuição por grupo.
              </p>
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
              <button
                onClick={exportarPdf}
                disabled={exportando || salvar}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-60"
              >
                {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                Exportar PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
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

          {relatorio ? (
            <>
              <PainelGrafico grupos={montarListaGrupos(grupos, relatorio.grupos)} ano={ano} />

              <div className="bg-white rounded-2xl p-5 border border-brand-100 shadow-sm mb-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h3 style={heading} className="text-base text-stone-800">Balanço por mês</h3>
                  <span className="text-xs font-semibold text-stone-500">Entrada × Saída × Saldo de cada mês selecionado</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-cream-200">
                        <th className="px-3 py-2.5 text-xs text-stone-500 font-semibold">Mês</th>
                        <th className="px-3 py-2.5 text-xs text-stone-500 font-semibold text-right">Entradas</th>
                        <th className="px-3 py-2.5 text-xs text-stone-500 font-semibold text-right">Saídas</th>
                        <th className="px-3 py-2.5 text-xs text-stone-500 font-semibold text-right">Saldo</th>
                        <th className="px-3 py-2.5 text-xs text-stone-500 font-semibold text-center">Lanç.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balancoPorMes.map((b) => (
                        <tr key={b.m} className="border-b border-cream-100 hover:bg-cream-50">
                          <td className="px-3 py-2.5 text-sm font-semibold text-stone-700">{b.nome}</td>
                          <td className="px-3 py-2.5 text-sm font-bold text-emerald-600 text-right">R$ {formatarMoeda(b.entradas)}</td>
                          <td className="px-3 py-2.5 text-sm font-bold text-red-600 text-right">R$ {formatarMoeda(b.saidas)}</td>
                          <td className={`px-3 py-2.5 text-sm font-bold text-right ${b.saldo >= 0 ? 'text-stone-800' : 'text-red-600'}`}>
                            R$ {formatarMoeda(b.saldo)}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-stone-500 text-center">{b.lancamentos}</td>
                        </tr>
                      ))}
                      <tr className="bg-cream-50">
                        <td className="px-3 py-2.5 text-sm font-bold text-stone-800">Total do período</td>
                        <td className="px-3 py-2.5 text-sm font-bold text-emerald-600 text-right">R$ {formatarMoeda(totalEntradas)}</td>
                        <td className="px-3 py-2.5 text-sm font-bold text-red-600 text-right">R$ {formatarMoeda(totalSaidas)}</td>
                        <td className={`px-3 py-2.5 text-sm font-bold text-right ${balanco >= 0 ? 'text-stone-800' : 'text-red-600'}`}>
                          R$ {formatarMoeda(balanco)}
                        </td>
                        <td className="px-3 py-2.5 text-sm font-bold text-stone-500 text-center">{transacoesDoMes.length}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <ResumoGrupoPorMes grupos={montarListaGrupos(grupos, relatorio.grupos)} meses={listaMeses} />
            </>
          ) : (
            <div className="text-center py-16 text-sm text-stone-400 bg-white rounded-2xl border border-cream-200">
              Carregando os dados do ano…
            </div>
          )}
        </div>
      )}

      {tela === 'conta' && contaAtiva && !verPrestacao && (
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

          <div className="mb-6">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {MESES.map((m) => {
                const ativo = meses.has(m.num);
                return (
                  <button
                    key={m.num}
                    onClick={() => alternarMes(m.num)}
                    className={`px-2 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                      ativo ? 'bg-stone-800 text-white shadow-sm' : 'bg-white text-stone-500 border border-cream-200 hover:bg-cream-100'
                    }`}
                  >
                    {m.nome}
                  </button>
                );
              })}
              <button
                onClick={() => (ehAnoCompleto ? selecionarSomenteMes(mesAtual) : selecionarAnoCompleto())}
                className={`col-span-3 sm:col-span-4 lg:col-span-7 px-2 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                  ehAnoCompleto ? 'bg-brand-600 text-white shadow-sm' : 'bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100'
                }`}
              >
                Anual
              </button>
            </div>
            <p className="mt-3 text-xs font-semibold text-stone-500">
              {ehAnoCompleto ? 'Ano completo selecionado' : `${listaMeses.length} de 12 meses selecionados`}
            </p>
          </div>

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
                ultimoCliqueRef.current = null;
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm ${
                modoClassificar ? 'bg-stone-800 text-white' : 'bg-white text-stone-700 border border-cream-200 hover:bg-cream-100'
              }`}
            >
              <Layers className="w-4 h-4 text-brand-700" />
              {modoClassificar ? 'Sair do modo classificação' : 'Classificar lançamentos'}
            </button>
            <button
              onClick={() => setVerPrestacao(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm ml-auto"
            >
              <BarChart3 className="w-4 h-4" /> Prestação
            </button>
          </div>

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

              {modoClassificar && selecionadas.size > 0 && (
                <div className="bg-white rounded-2xl p-4 border border-brand-200 shadow-sm mb-4 animate-in fade-in">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold whitespace-nowrap">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-xs mr-1.5">
                        {selecionadas.size}
                      </span>
                      {selecionadas.size === 1 ? 'lançamento selecionado' : 'lançamentos selecionados'}
                    </span>
                    {grupos.length === 0 ? (
                      <span className="flex-1 flex flex-wrap items-center gap-2 text-sm text-stone-500">
                        Nenhum grupo cadastrado ainda.
                        <button
                          onClick={abrirNovoGrupo}
                          disabled={salvar}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-700 border border-brand-300 hover:bg-brand-50 disabled:opacity-60 transition-colors"
                        >
                          <FolderPlus className="w-3.5 h-3.5" /> Criar grupo
                        </button>
                      </span>
                    ) : (
                      <>
                        <select
                          value={grupoClassificar}
                          onChange={(e) => setGrupoClassificar(e.target.value)}
                          className="flex-1 min-w-40 px-3 py-2 rounded-lg border border-cream-200 bg-white text-sm text-stone-700"
                        >
                          <option value="" className="text-stone-800">Escolher grupo…</option>
                          {grupos.map((g) => (
                            <option key={g.id} value={g.id} className="text-stone-800">{g.nome}</option>
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
                          className="px-3 py-2 rounded-lg text-xs font-semibold text-red-600 border border-red-500 hover:bg-red-50 disabled:opacity-60 transition-colors"
                        >
                          Remover grupo
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setSelecionadas(new Set());
                        ultimoCliqueRef.current = null;
                      }}
                      className="px-3 py-2 rounded-lg text-xs font-semibold text-stone-400 hover:text-stone-700 transition-colors"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl p-5 border border-cream-200 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h3 style={heading} className="text-base text-stone-800">
                    Movimentações de {periodo}
                  </h3>
                  {mesesComDados.length > 0 && (
                    <div className="flex items-center gap-2">
                      <select
                        value={mesApagar}
                        onChange={(e) => setMesApagar(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-cream-200 bg-white text-xs font-semibold text-stone-700"
                        title="Escolha o mês cujo extrato (OFX) deseja apagar"
                      >
                        <option value="">Excluir extrato de…</option>
                        {mesesComDados.map((m) => (
                          <option key={m} value={m}>
                            {nomeMes(m)}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={limparMesEscolhido}
                        disabled={!mesApagar || salvar}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 border border-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir mês
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Buscar por descrição…"
                      className="w-full pl-9 pr-9 py-2 rounded-lg border border-cream-200 bg-white text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400"
                    />
                    {busca && (
                      <button
                        onClick={() => setBusca('')}
                        title="Limpar busca"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-stone-400 hover:text-stone-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {modoClassificar && (
                    <span className="text-xs text-stone-500">
                      Clique no primeiro, segure <kbd className="px-1.5 py-0.5 rounded border border-stone-300 bg-stone-100 font-sans text-[11px]">Shift</kbd> e clique no último para selecionar um intervalo.
                    </span>
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
                              checked={transacoesVisiveis.length > 0 && transacoesVisiveis.every((t) => selecionadas.has(t.id))}
                              onChange={alternarTodasVisiveis}
                              title="Selecionar todas as movimentações listadas"
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
                      {transacoesVisiveis.length > 0 ? (
                        transacoesVisiveis.map((t) => (
                          <tr
                            key={t.id}
                            onClick={(e) => {
                              if (!modoClassificar) return;
                              if (e.target.closest('button')) return;
                              alternarSelecao(t.id, e.shiftKey);
                            }}
                            className={`border-b border-cream-100 hover:bg-cream-50 ${modoClassificar ? 'cursor-pointer select-none' : ''} ${selecionadas.has(t.id) ? 'bg-brand-50/40' : ''}`}
                          >
                            {modoClassificar && (
                              <td className="px-3 py-3 w-8">
                                <input
                                  type="checkbox"
                                  checked={selecionadas.has(t.id)}
                                  onChange={() => {}}
                                  tabIndex={-1}
                                  className="w-4 h-4 accent-brand-600 pointer-events-none"
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
                            {termoBusca
                              ? `Nenhuma movimentação encontrada para "${busca}".`
                              : 'Nenhuma movimentação registrada neste período.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="lg:w-80 shrink-0">
              {listaMeses.length === 1 ? (
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