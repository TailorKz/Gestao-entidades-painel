import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { api, obterMensagemErro } from '../services/api';

const GINASIOS = [
  { valor: 'ARTHUR_FRIDRICH', rotulo: 'Ginásio Arthur Friedrich' },
  { valor: 'POLIESPORTIVO', rotulo: 'Ginásio Poliesportivo' },
];

const DIAS = [
  { valor: 'SEGUNDA', rotulo: 'Segunda-feira' },
  { valor: 'TERCA', rotulo: 'Terça-feira' },
  { valor: 'QUARTA', rotulo: 'Quarta-feira' },
  { valor: 'QUINTA', rotulo: 'Quinta-feira' },
  { valor: 'SEXTA', rotulo: 'Sexta-feira' },
  { valor: 'SABADO', rotulo: 'Sábado' },
  { valor: 'DOMINGO', rotulo: 'Domingo' },
];

const DIA_POR_JS = { 0: 'DOMINGO', 1: 'SEGUNDA', 2: 'TERCA', 3: 'QUARTA', 4: 'QUINTA', 5: 'SEXTA', 6: 'SABADO' };

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const PERIODOS = [
  { chave: 'MANHA', rotulo: 'Manhã', ate: (h) => h < '12:00' },
  { chave: 'TARDE', rotulo: 'Tarde', ate: (h) => h >= '12:00' && h < '18:30' },
  { chave: 'NOITE', rotulo: 'Noite', ate: (h) => h >= '18:30' },
];

const fmtDataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const pad2 = (n) => String(n).padStart(2, '0');
const isoDeDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const isoHoje = () => isoDeDate(new Date());
const diasNoMes = (ano, mes) => new Date(ano, mes, 0).getDate();

export default function GradeGinasios() {
  const [ginasio, setGinasio] = useState('ARTHUR_FRIDRICH');
  const [aba, setAba] = useState('grade');

  const [grade, setGrade] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [eventosDesatualizados, setEventosDesatualizados] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [ano, setAno] = useState(() => new Date().getFullYear());
  const [trimestre, setTrimestre] = useState(() => Math.floor(new Date().getMonth() / 3));

  const [modalHorario, setModalHorario] = useState(null);
  const [modalEvento, setModalEvento] = useState(null);
  const [modalExcluir, setModalExcluir] = useState(null);

  const recarregarGrade = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setCarregando(true);
      try {
        const { data } = await api.get('/ginasios/grade', { params: { ginasio } });
        setGrade(data);
        setErro('');
      } catch (e) {
        setErro(obterMensagemErro(e));
      } finally {
        if (!silencioso) setCarregando(false);
      }
    },
    [ginasio]
  );

  const recarregarEventos = useCallback(
    async (silencioso = true) => {
      if (!silencioso) setCarregando(true);
      try {
        const { data } = await api.get('/ginasios/grade/eventos', { params: { ginasio } });
        setEventos(data);
        setEventosDesatualizados(false);
        setErro('');
      } catch (e) {
        setErro(obterMensagemErro(e));
      } finally {
        if (!silencioso) setCarregando(false);
      }
    },
    [ginasio]
  );

  const recarregarTudo = useCallback(async () => {
    setCarregando(true);
    try {
      const [g, ev] = await Promise.all([
        api.get('/ginasios/grade', { params: { ginasio } }),
        api.get('/ginasios/grade/eventos', { params: { ginasio } }),
      ]);
      setGrade(g.data);
      setEventos(ev.data);
      setEventosDesatualizados(false);
      setErro('');
    } catch (e) {
      setErro(obterMensagemErro(e));
    } finally {
      setCarregando(false);
    }
  }, [ginasio]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recarregarTudo();
  }, [recarregarTudo]);

  const trocarGinasio = (valor) => {
    if (valor === ginasio) return;
    setGinasio(valor);
    setGrade(null);
    setEventos([]);
    setEventosDesatualizados(false);
    setCarregando(true);
  };

  const irParaGrade = () => {
    setAba('grade');
    if (ginasio !== 'ARTHUR_FRIDRICH') trocarGinasio('ARTHUR_FRIDRICH');
  };

  const irParaEventos = () => {
    setAba('eventos');
    if (ginasio !== 'POLIESPORTIVO') {
      trocarGinasio('POLIESPORTIVO');
    } else if (eventosDesatualizados) {
      recarregarEventos(true);
    }
  };

  const mudarTrimestre = (delta) => {
    const nt = trimestre + delta;
    if (nt < 0) {
      setAno(ano - 1);
      setTrimestre(3);
    } else if (nt > 3) {
      setAno(ano + 1);
      setTrimestre(0);
    } else {
      setTrimestre(nt);
    }
  };

  const faixas = useMemo(() => {
    const mapa = new Map();
    for (const h of grade?.horarios || []) {
      const chave = `${h.horaInicio}|${h.horaFim}`;
      if (!mapa.has(chave)) mapa.set(chave, { chave, horaInicio: h.horaInicio, horaFim: h.horaFim });
    }
    return [...mapa.values()].sort((a, b) =>
      a.horaInicio === b.horaInicio ? a.horaFim.localeCompare(b.horaFim) : a.horaInicio.localeCompare(b.horaInicio)
    );
  }, [grade]);

  const celulas = useMemo(() => {
    const mapa = new Map();
    for (const h of grade?.horarios || []) {
      const chave = `${h.horaInicio}|${h.horaFim}|${h.diaSemana}`;
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave).push(h);
    }
    return mapa;
  }, [grade]);

  const eventosPorDia = useMemo(() => {
    const mapa = new Map();
    for (const e of eventos) {
      const inicio = new Date(`${e.dataInicio}T00:00:00`);
      const fim = new Date(`${e.dataFim || e.dataInicio}T00:00:00`);
      const d = new Date(inicio);
      while (d <= fim) {
        const chave = isoDeDate(d);
        if (!mapa.has(chave)) mapa.set(chave, []);
        mapa.get(chave).push(e);
        d.setDate(d.getDate() + 1);
      }
    }
    return mapa;
  }, [eventos]);

  const afetadosPreview = useMemo(() => {
    if (!modalEvento) return [];
    const { dataInicio, dataFim, diaInteiro, horaInicio, horaFim } = modalEvento;
    const horarios = grade?.horarios || [];
    if (!dataInicio) return [];
    const fim = dataFim && dataFim >= dataInicio ? dataFim : dataInicio;
    const filtraHora = !diaInteiro && horaInicio && horaFim;
    const out = [];
    const d = new Date(`${dataInicio}T00:00:00`);
    const fimDate = new Date(`${fim}T00:00:00`);
    while (d <= fimDate) {
      const diaValor = DIA_POR_JS[d.getDay()];
      for (const h of horarios) {
        if (h.diaSemana !== diaValor) continue;
        if (filtraHora && !(h.horaInicio < horaFim && h.horaFim > horaInicio)) continue;
        out.push({ ...h, data: isoDeDate(d) });
      }
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [modalEvento, grade]);

  // ---------- HORÁRIO ----------
  const abrirNovoHorario = (diaSemana = 'SEGUNDA', faixa = null) => {
    setModalHorario({
      id: null,
      diaSemana,
      horaInicio: faixa?.horaInicio || '07:00',
      horaFim: faixa?.horaFim || '08:00',
      nome: '',
      observacao: '',
    });
    setErro('');
  };

  const abrirEditarHorario = (h) => {
    setModalHorario({ ...h });
    setErro('');
  };

  const salvarHorario = async () => {
    const nome = (modalHorario.nome || '').trim();
    if (!nome) return setErro('Informe o nome do responsável pelo horário.');
    if (!modalHorario.horaInicio || !modalHorario.horaFim) return setErro('Informe o horário inicial e final.');
    if (modalHorario.horaFim <= modalHorario.horaInicio) return setErro('O horário final deve ser depois do inicial.');
    setErro('');
    setSalvando(true);
    try {
      const body = {
        ginasio,
        diaSemana: modalHorario.diaSemana,
        horaInicio: modalHorario.horaInicio,
        horaFim: modalHorario.horaFim,
        nome,
        observacao: modalHorario.observacao,
      };
      if (modalHorario.id) {
        await api.put(`/ginasios/grade/${modalHorario.id}`, body);
      } else {
        await api.post('/ginasios/grade', body);
      }
      setModalHorario(null);
      setEventosDesatualizados(true);
      await recarregarGrade(true);
    } catch (e) {
      setErro(obterMensagemErro(e));
    } finally {
      setSalvando(false);
    }
  };

  // ---------- EVENTO ----------
  const abrirNovoEvento = (data) => {
    const base = data || isoHoje();
    setModalEvento({ id: null, titulo: '', descricao: '', dataInicio: base, dataFim: base, diaInteiro: true, horaInicio: '', horaFim: '' });
    setErro('');
  };

  const abrirEditarEvento = (e) => {
    setModalEvento({
      id: e.id,
      titulo: e.titulo,
      descricao: e.descricao || '',
      dataInicio: e.dataInicio,
      dataFim: e.dataFim,
      diaInteiro: !e.horaInicio,
      horaInicio: e.horaInicio || '',
      horaFim: e.horaFim || '',
    });
    setErro('');
  };

  const salvarEvento = async () => {
    const titulo = (modalEvento.titulo || '').trim();
    if (!titulo) return setErro('Informe o título do evento.');
    if (!modalEvento.dataInicio) return setErro('Informe a data inicial.');
    const fim = modalEvento.dataFim || modalEvento.dataInicio;
    if (fim < modalEvento.dataInicio) return setErro('A data final não pode ser antes da inicial.');
    if (!modalEvento.diaInteiro) {
      if (!modalEvento.horaInicio || !modalEvento.horaFim) return setErro('Informe o horário inicial e final.');
      if (modalEvento.horaFim <= modalEvento.horaInicio) return setErro('O horário final deve ser depois do inicial.');
    }
    setErro('');
    setSalvando(true);
    try {
      const body = {
        ginasio,
        titulo,
        descricao: modalEvento.descricao,
        dataInicio: modalEvento.dataInicio,
        dataFim: fim,
        horaInicio: modalEvento.diaInteiro ? null : modalEvento.horaInicio,
        horaFim: modalEvento.diaInteiro ? null : modalEvento.horaFim,
      };
      if (modalEvento.id) {
        await api.put(`/ginasios/grade/eventos/${modalEvento.id}`, body);
      } else {
        await api.post('/ginasios/grade/eventos', body);
      }
      setModalEvento(null);
      await recarregarEventos(true);
    } catch (e) {
      setErro(obterMensagemErro(e));
    } finally {
      setSalvando(false);
    }
  };

  const confirmarExclusao = async () => {
    setSalvando(true);
    try {
      if (modalExcluir.tipo === 'horario') {
        await api.delete(`/ginasios/grade/${modalExcluir.alvo.id}`);
        setEventosDesatualizados(true);
        setModalExcluir(null);
        await recarregarGrade(true);
      } else {
        await api.delete(`/ginasios/grade/eventos/${modalExcluir.alvo.id}`);
        setModalExcluir(null);
        await recarregarEventos(true);
      }
    } catch (e) {
      setErro(obterMensagemErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 lg:p-10">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Grade de Horários Fixos</h1>
            <p className="text-sm text-slate-500">Horários fixos semanais e eventos por data dos ginásios.</p>
          </div>
          {aba === 'grade' ? (
            <button
              onClick={() => abrirNovoHorario()}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" /> Adicionar Horário
            </button>
          ) : (
            <button
              onClick={() => abrirNovoEvento()}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" /> Novo Evento
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white p-1">
            {GINASIOS.map((g) => (
              <button
                key={g.valor}
                onClick={() => trocarGinasio(g.valor)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  ginasio === g.valor ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:text-brand-700'
                }`}
              >
                {g.rotulo}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white p-1">
            <button
              onClick={irParaGrade}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                aba === 'grade' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="h-4 w-4" /> Grade Semanal
            </button>
            <button
              onClick={irParaEventos}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                aba === 'eventos' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarDays className="h-4 w-4" /> Eventos
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
          <Dumbbell className="h-5 w-5 shrink-0 text-brand-600" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
              {aba === 'grade' ? 'Grade Semanal' : 'Eventos'} · ginásio selecionado
            </p>
            <p className="text-base font-bold text-brand-800">{GINASIOS.find((g) => g.valor === ginasio)?.rotulo}</p>
          </div>
        </div>
      </header>

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {carregando && !grade ? (
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          <span className="text-sm font-medium text-slate-500">Carregando...</span>
        </div>
      ) : aba === 'grade' ? (
        <GradeTabela
          faixas={faixas}
          celulas={celulas}
          ginasioRotulo={grade?.rotulo}
          onAdicionar={abrirNovoHorario}
          onEditar={abrirEditarHorario}
        />
      ) : (
        <CalendarioEventos
          ano={ano}
          trimestre={trimestre}
          onNavegar={mudarTrimestre}
          eventosPorDia={eventosPorDia}
          onAdicionar={abrirNovoEvento}
          onEditar={abrirEditarEvento}
        />
      )}

      {modalHorario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              salvarHorario();
            }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">{modalHorario.id ? 'Editar horário' : 'Adicionar horário'}</h3>
                <p className="text-xs text-slate-500">{grade?.rotulo}</p>
              </div>
              <button type="button" onClick={() => setModalHorario(null)} className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Responsável / grupo
                <input
                  autoFocus
                  value={modalHorario.nome}
                  onChange={(e) => setModalHorario({ ...modalHorario, nome: e.target.value })}
                  placeholder="Ex.: Prof. João / Escolinha"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Dia da semana
                <select
                  value={modalHorario.diaSemana}
                  onChange={(e) => setModalHorario({ ...modalHorario, diaSemana: e.target.value })}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                >
                  {DIAS.map((d) => (
                    <option key={d.valor} value={d.valor}>
                      {d.rotulo}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Início
                  <input
                    type="time"
                    value={modalHorario.horaInicio}
                    onChange={(e) => setModalHorario({ ...modalHorario, horaInicio: e.target.value })}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Fim
                  <input
                    type="time"
                    value={modalHorario.horaFim}
                    onChange={(e) => setModalHorario({ ...modalHorario, horaFim: e.target.value })}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Observação (opcional)
                <input
                  value={modalHorario.observacao || ''}
                  onChange={(e) => setModalHorario({ ...modalHorario, observacao: e.target.value })}
                  placeholder="Ex.: quadra 1, turma infantil..."
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                />
              </label>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="submit"
                disabled={salvando}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
              >
                {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
              </button>
              {modalHorario.id && (
                <button
                  type="button"
                  onClick={() => setModalExcluir({ tipo: 'horario', alvo: modalHorario })}
                  disabled={salvando}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  title="Excluir horário"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalHorario(null)}
                disabled={salvando}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {modalEvento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              salvarEvento();
            }}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">{modalEvento.id ? 'Editar evento' : 'Novo evento'}</h3>
                <p className="text-xs text-slate-500">{grade?.rotulo}</p>
              </div>
              <button type="button" onClick={() => setModalEvento(null)} className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Título
                <input
                  autoFocus
                  value={modalEvento.titulo}
                  onChange={(e) => setModalEvento({ ...modalEvento, titulo: e.target.value })}
                  placeholder="Ex.: Campeonato municipal"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Data inicial
                  <input
                    type="date"
                    value={modalEvento.dataInicio}
                    onChange={(e) => setModalEvento({ ...modalEvento, dataInicio: e.target.value, dataFim: e.target.value < modalEvento.dataFim ? modalEvento.dataFim : e.target.value })}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Data final
                  <input
                    type="date"
                    value={modalEvento.dataFim}
                    min={modalEvento.dataInicio}
                    onChange={(e) => setModalEvento({ ...modalEvento, dataFim: e.target.value })}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={modalEvento.diaInteiro}
                  onChange={(e) => setModalEvento({ ...modalEvento, diaInteiro: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Dia inteiro
              </label>
              {!modalEvento.diaInteiro && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Início
                    <input
                      type="time"
                      value={modalEvento.horaInicio}
                      onChange={(e) => setModalEvento({ ...modalEvento, horaInicio: e.target.value })}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Fim
                    <input
                      type="time"
                      value={modalEvento.horaFim}
                      onChange={(e) => setModalEvento({ ...modalEvento, horaFim: e.target.value })}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                    />
                  </label>
                </div>
              )}
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Descrição (opcional)
                <textarea
                  value={modalEvento.descricao || ''}
                  onChange={(e) => setModalEvento({ ...modalEvento, descricao: e.target.value })}
                  rows={2}
                  placeholder="Ex.: evento..."
                  className="resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                />
              </label>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <Users className="h-3.5 w-3.5" /> Nesse horário ({afetadosPreview.length})
                </p>
                {afetadosPreview.length === 0 ? (
                  <p className="text-sm text-slate-400">Ninguém tem horário fixo nesse período.</p>
                ) : (
                  <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
                    {afetadosPreview.map((a, idx) => (
                      <li key={`${a.id}-${a.data}-${idx}`} className="flex flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm shadow-sm">
                        <span className="flex-1 truncate font-semibold text-slate-700">{a.nome}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                          {a.horaInicio}–{a.horaFim}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">{fmtDataBR(a.data)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Ao salvar, o sistema lista quem tem horário fixo nesse período para você avisar.
              </p>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="submit"
                disabled={salvando}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
              >
                {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
              </button>
              {modalEvento.id && (
                <button
                  type="button"
                  onClick={() => setModalExcluir({ tipo: 'evento', alvo: modalEvento })}
                  disabled={salvando}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  title="Excluir evento"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalEvento(null)}
                disabled={salvando}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {modalExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-800">
              {modalExcluir.tipo === 'horario' ? 'Excluir horário' : 'Excluir evento'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {modalExcluir.tipo === 'horario'
                ? `Remover "${modalExcluir.alvo.nome}" de ${DIAS.find((d) => d.valor === modalExcluir.alvo.diaSemana)?.rotulo}.`
                : `Remover o evento "${modalExcluir.alvo.titulo}".`}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={confirmarExclusao}
                disabled={salvando}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Excluir
              </button>
              <button
                onClick={() => setModalExcluir(null)}
                disabled={salvando}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function GradeTabela({ faixas, celulas, ginasioRotulo, onAdicionar, onEditar }) {
  if (faixas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
        <Dumbbell className="h-10 w-10 text-brand-300" />
        <p className="text-sm text-slate-500">
          Nenhum horário cadastrado em {ginasioRotulo || 'este ginásio'}.
          <br />
          Clique em “Adicionar Horário” para montar a grade.
        </p>
      </div>
    );
  }

  const grupos = PERIODOS.map((p) => ({
    ...p,
    itens: faixas.filter((f) => p.ate(f.horaInicio)),
  })).filter((g) => g.itens.length > 0);

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full min-w-[900px] border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="w-36 px-4 py-4 text-left text-sm font-bold uppercase tracking-wide text-slate-500">Horário</th>
            {DIAS.map((d) => (
              <th key={d.valor} className="px-2 py-4 text-center text-sm font-bold uppercase tracking-wide text-slate-500">
                {d.rotulo.replace('-feira', '')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grupos.map((grupo) => (
            <Fragment key={grupo.chave}>
              <tr>
                <td
                  colSpan={DIAS.length + 1}
                  className="border-t border-slate-200 bg-slate-100/80 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-500"
                >
                  {grupo.rotulo}
                </td>
              </tr>
              {grupo.itens.map((faixa) => (
                <tr key={faixa.chave} className="border-b border-slate-100 last:border-0">
              <th className="px-4 py-4 text-left align-top">
                <span className="flex items-center gap-2 whitespace-nowrap text-sm font-bold text-slate-700">
                  <Clock className="h-4 w-4 text-slate-400" />
                  {faixa.horaInicio}
                  <span className="text-slate-300">–</span>
                  {faixa.horaFim}
                </span>
              </th>
              {DIAS.map((d) => {
                const lista = celulas.get(`${faixa.horaInicio}|${faixa.horaFim}|${d.valor}`) || [];
                return (
                  <td key={d.valor} className="border-l border-slate-100 px-2 py-2 align-top">
                    <div className="flex min-h-[48px] flex-col gap-1.5">
                      {lista.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => onEditar(h)}
                          title={h.observacao ? `${h.nome} · ${h.observacao}` : h.nome}
                          className="group flex items-center justify-between gap-1 rounded-xl bg-brand-50 px-3 py-2.5 text-left text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
                        >
                          <span className="truncate">{h.nome}</span>
                          <Pencil className="h-3.5 w-3.5 shrink-0 text-brand-300 opacity-0 transition group-hover:opacity-100" />
                        </button>
                      ))}
                      {lista.length === 0 && (
                        <button
                          onClick={() => onAdicionar(d.valor, faixa)}
                          title={`Adicionar em ${d.rotulo} (${faixa.horaInicio}–${faixa.horaFim})`}
                          className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 py-2 text-slate-300 transition hover:border-brand-300 hover:text-brand-500"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                );
              })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalendarioEventos({ ano, trimestre, onNavegar, eventosPorDia, onAdicionar, onEditar }) {
  const hoje = isoHoje();
  const mesesBase = trimestre * 3;
  const mesesDoTri = MESES.slice(mesesBase, mesesBase + 3);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          onClick={() => onNavegar(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          title="Trimestre anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-800">
            {mesesDoTri.join(' · ')} {ano}
          </h2>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{trimestre + 1}º trimestre</p>
        </div>
        <button
          onClick={() => onNavegar(1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          title="Próximo trimestre"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr>
            <th className="w-12 px-2 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">Dia</th>
            {mesesDoTri.map((m) => (
              <th key={m} className="px-1 py-2 text-center text-sm font-bold uppercase tracking-wide text-slate-500">
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => (
            <tr key={dia} className="border-t border-slate-100">
              <th className="sticky left-0 bg-white px-2 py-1.5 text-center text-xs font-bold text-slate-500">{dia}</th>
              {mesesDoTri.map((_, idxMes) => {
                const mes = mesesBase + idxMes + 1;
                if (dia > diasNoMes(ano, mes)) {
                  return <td key={mes} className="border-l border-slate-100 bg-slate-50/60" />;
                }
                const data = `${ano}-${pad2(mes)}-${pad2(dia)}`;
                const lista = eventosPorDia.get(data) || [];
                const ehHoje = data === hoje;
                return (
                  <td key={mes} className="border-l border-slate-100 p-0.5 align-top">
                    <div
                      className={`flex min-h-[48px] flex-col gap-1 rounded-lg p-1.5 transition ${
                        ehHoje ? 'bg-amber-50 ring-1 ring-amber-300' : 'hover:bg-slate-50'
                      }`}
                    >
                      {lista.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => onEditar(e)}
                          title={e.titulo}
                          className="truncate rounded-md bg-brand-600 px-2 py-1 text-left text-xs font-semibold text-white transition hover:bg-brand-700"
                        >
                          {e.titulo}
                        </button>
                      ))}
                      <button
                        onClick={() => onAdicionar(data)}
                        title={`Adicionar evento em ${fmtDataBR(data)}`}
                        className="flex flex-1 items-center justify-center rounded-md border border-dashed border-transparent py-1 text-slate-300 transition hover:border-brand-300 hover:text-brand-500"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-xs text-slate-400">Clique em um campo vazio para adicionar um evento no dia; clique em um evento para editar.</p>
    </div>
  );
}
