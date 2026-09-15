import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Dumbbell, Loader2, Minus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api, obterMensagemErro } from '../services/api';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS = [
  { valor: 'SEGUNDA', rotulo: 'Segunda-feira' },
  { valor: 'TERCA', rotulo: 'Terça-feira' },
  { valor: 'QUARTA', rotulo: 'Quarta-feira' },
  { valor: 'QUINTA', rotulo: 'Quinta-feira' },
  { valor: 'SEXTA', rotulo: 'Sexta-feira' },
  { valor: 'SABADO', rotulo: 'Sábado' },
  { valor: 'DOMINGO', rotulo: 'Domingo' },
];
const diaParaJs = { SEGUNDA: 1, TERCA: 2, QUARTA: 3, QUINTA: 4, SEXTA: 5, SABADO: 6, DOMINGO: 0 };

const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const paraNumero = (txt) => {
  const n = parseFloat(String(txt || '').replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};
const fmtValor = (v) => Number(v || 0).toFixed(2).replace('.', ',');
const fmtDataBR = (iso) => iso.split('-').reverse().join('/');
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const anoAtual = new Date().getFullYear();
const gerarOpcoesMes = () => {
  const lista = [];
  for (let a = anoAtual; a <= anoAtual + 1; a++) {
    for (let m = 0; m < 12; m++) lista.push({ ano: a, mes: m, chave: `${a}-${String(m + 1).padStart(2, '0')}` });
  }
  return lista;
};
const OPCOES_MES = gerarOpcoesMes();

const proximoMes = (de, quantMeses) => {
  const total = de.ano * 12 + de.mes + (quantMeses - 1);
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
};

const Ginasios = () => {
  const [painel, setPainel] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [copiadoId, setCopiadoId] = useState(null);
  const hoje = new Date();
  const [periodo, setPeriodo] = useState({
    de: { ano: hoje.getFullYear(), mes: hoje.getMonth() },
    quantMeses: 2,
  });
  const [acao, setAcao] = useState(null);
  const [modalAjuste, setModalAjuste] = useState(null);
  const [modalExcluir, setModalExcluir] = useState(null);
  const [formPessoa, setFormPessoa] = useState({ nome: '', ginasio: '', diaSemana: '', valorDia: '' });
  const sessaoRef = useRef('');

  const fmtMes = (ano, mes) => `${ano}-${String(mes + 1).padStart(2, '0')}`;

  const carregar = useCallback(
    async (force = false) => {
      const tenantId = localStorage.getItem('tenantId') || null;
      const mesInicio = fmtMes(periodo.de.ano, periodo.de.mes);
      const mesFim = proximoMes(periodo.de, periodo.quantMeses);
      const chaveAtual = `${tenantId || 'anon'}|${mesInicio}|${mesFim}`;
      if (!force && chaveAtual === sessaoRef.current) return;
      sessaoRef.current = chaveAtual;
      setCarregando(true);

      try {
        const params = { mesInicio, mesFim };
        const { data } = await api.get('/ginasios', { params });
        setPainel(data);
        setErro('');
        const [a0, m0] = data.periodo.mesInicio.split('-').map(Number);
        const quantMeses = proximoMes({ ano: a0, mes: m0 - 1 }, 2) === data.periodo.mesFim ? 2 : 1;
        if (a0 !== periodo.de.ano || m0 - 1 !== periodo.de.mes || quantMeses !== periodo.quantMeses) {
          setPeriodo({ de: { ano: a0, mes: m0 - 1 }, quantMeses });
        }
      } catch (e) {
        setErro(obterMensagemErro(e));
        setPainel(null);
        sessaoRef.current = '';
      } finally {
        setCarregando(false);
      }
    },
    [periodo.de, periodo.quantMeses]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  const mudarInicio = (chave) => {
    const [a, m] = chave.split('-').map(Number);
    setPeriodo((prev) => ({ ...prev, de: { ano: a, mes: m - 1 } }));
  };

  const mudarQuantidade = (quantMeses) => {
    setPeriodo((prev) => ({ ...prev, quantMeses }));
  };

  const ginasiosVisiveis = useMemo(
    () =>
      (painel?.ginasios || [])
        .map((g) => ({ ...g, dias: g.dias.filter((d) => d.pessoas.length > 0) }))
        .filter((g) => g.dias.length > 0),
    [painel]
  );

  const { totalPessoas, diasCobradosTotal } = useMemo(() => {
    let pessoas = 0;
    let dias = 0;
    for (const g of ginasiosVisiveis) {
      for (const d of g.dias) {
        pessoas += d.pessoas.length;
        dias += d.pessoas.reduce((acc, p) => acc + p.diasCobrados, 0);
      }
    }
    return { totalPessoas: pessoas, diasCobradosTotal: dias };
  }, [ginasiosVisiveis]);

  const abrirAdicionarPessoa = () => {
    setFormPessoa({ nome: '', ginasio: '', diaSemana: 'SEGUNDA', valorDia: '25,00' });
    setAcao({ tipo: 'pessoa' });
  };

  const abrirEditarPessoa = (pessoa) => {
    setFormPessoa({
      nome: pessoa.nome,
      ginasio: pessoa.ginasio,
      diaSemana: pessoa.diaSemana,
      valorDia: fmtValor(pessoa.valorDia),
    });
    setAcao({ tipo: 'pessoa', pessoa });
  };

  const salvarPessoa = async () => {
    const nome = formPessoa.nome.trim();
    const valor = paraNumero(formPessoa.valorDia);
    if (!nome) return setErro('Informe o nome da pessoa.');
    if (!acao.pessoa && !formPessoa.ginasio) return setErro('Selecione o ginásio.');
    if (!formPessoa.diaSemana) return setErro('Selecione o dia da semana.');
    if (valor <= 0) return setErro('O valor por dia deve ser maior que zero.');
    setErro('');
    setSalvando(true);
    try {
      const body = {
        nome,
        ginasio: acao.pessoa ? undefined : formPessoa.ginasio,
        diaSemana: formPessoa.diaSemana,
        valorDia: valor,
      };
      if (acao.pessoa?.reservaId) {
        await api.put(`/ginasios/pessoas/${acao.pessoa.reservaId}`, body);
      } else {
        await api.post('/ginasios/pessoas', body);
      }
      setAcao(null);
      await carregar(true);
    } catch (e) {
      setErro(obterMensagemErro(e));
    } finally {
      setSalvando(false);
    }
  };

  const limitesAjuste = () => {
    const deStr = painel?.periodo?.mesInicio || fmtMes(periodo.de.ano, periodo.de.mes);
    const ateStr = painel?.periodo?.mesFim || proximoMes(periodo.de, periodo.quantMeses);
    const primeiro = `${deStr}-01`;
    const ultimoDia = new Date(Number(ateStr.slice(0, 4)), Number(ateStr.slice(5, 7)), 0).getDate();
    const ultimo = `${ateStr}-${String(ultimoDia).padStart(2, '0')}`;
    return { min: primeiro, max: ultimo };
  };

  const limitesDoDia = (diaSemana) => {
    const { min, max } = limitesAjuste();
    const want = diaParaJs[diaSemana];
    if (want === undefined) return { min, max };
    const d = new Date(Number(min.slice(0, 4)), Number(min.slice(5, 7)) - 1, 1);
    const fim = new Date(Number(max.slice(0, 4)), Number(max.slice(5, 7)) - 1, Number(max.slice(8, 10)));
    while (d <= fim) {
      if (d.getDay() === want) return { min: iso(d), max };
      d.setDate(d.getDate() + 1);
    }
    return { min, max };
  };

  const abrirAjuste = (tipo, dia, pessoa, ginasioNome) => {
    const minMax = tipo === 'REMOVIDO' && pessoa ? limitesDoDia(dia.diaSemana) : limitesAjuste();
    setModalAjuste({
      tipo,
      dia,
      pessoa: pessoa || null,
      ginasioNome,
      data: minMax.min,
      motivo: '',
      min: minMax.min,
      max: minMax.max,
    });
    setErro('');
  };

  const salvarAjuste = async () => {
    if (!modalAjuste.data) return setErro('Selecione a data.');
    setErro('');
    setSalvando(true);
    try {
      const body = {
        ginasio: modalAjuste.ginasioNome,
        tipo: modalAjuste.tipo,
        data: modalAjuste.data,
        reservaId: modalAjuste.pessoa?.reservaId || null,
        motivo: modalAjuste.motivo?.trim() || null,
      };
      await api.post('/ginasios/ajustes', body);
      setModalAjuste(null);
      await carregar(true);
    } catch (e) {
      setErro(obterMensagemErro(e));
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    if (!modalExcluir) return;
    setErro('');
    setSalvando(true);
    try {
      if (modalExcluir.tipo === 'pessoa') {
        await api.delete(`/ginasios/pessoas/${modalExcluir.alvo.reservaId}`);
      } else {
        await api.delete(`/ginasios/ajustes/${modalExcluir.alvo.id}`);
      }
      setModalExcluir(null);
      await carregar(true);
    } catch (e) {
      setErro(obterMensagemErro(e));
    } finally {
      setSalvando(false);
    }
  };

  const copiarMensagem = async (pessoa, dia) => {
    const rotuloPeriodo = painel?.periodo?.rotulo || '';
    const ehDiaDaPessoa = (dataIso) => new Date(`${dataIso}T00:00:00`).getDay() === diaParaJs[dia.diaSemana];
    const semJogo = [...new Set(
      pessoa.datas
        .filter((d) => d.tipo === 'REMOVIDO' && ehDiaDaPessoa(d.data))
        .map((d) => fmtDataBR(d.data))
    )];
    const msg = `Olá, tudo bem? Para os meses ${rotuloPeriodo}, total de ${pessoa.diasCobrados} jogo(s), sem jogo nos dias ${semJogo.length ? semJogo.join(', ') : 'nenhum'}, valor total de ${fmtMoeda(pessoa.valor)}, está correto ou teve mais algum dia não jogado?`;
    try {
      await navigator.clipboard.writeText(msg);
      setCopiadoId(pessoa.reservaId);
      setTimeout(() => setCopiadoId(null), 2500);
    } catch {
      setErro('Não foi possível copiar a mensagem.');
    }
  };

  const btnIcone = (extra = '') =>
    `flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 ${extra}`;

  if (carregando && !painel) {
    return (
      <div className="flex w-full flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 lg:flex-row lg:p-10">
      <section className="flex w-full min-w-0 flex-1 flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Controle de Ginásios</h1>
            <p className="text-xs text-slate-500">Reservas fixas semanais; valor por dia definido por pessoa.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              Mês inicial
              <select
                value={fmtMes(periodo.de.ano, periodo.de.mes)}
                onChange={(e) => mudarInicio(e.target.value)}
                className="cursor-pointer bg-transparent font-medium text-brand-700 focus:outline-none"
              >
                {OPCOES_MES.map((m) => (
                  <option key={m.chave} value={m.chave}>
                    {MESES[m.mes]} {m.ano}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-sm font-semibold">
              <button
                onClick={() => mudarQuantidade(1)}
                className={`rounded-lg px-3 py-1.5 transition ${
                  periodo.quantMeses === 1 ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                1 mês
              </button>
              <button
                onClick={() => mudarQuantidade(2)}
                className={`rounded-lg px-3 py-1.5 transition ${
                  periodo.quantMeses === 2 ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                2 meses
              </button>
            </div>
            <button
              onClick={abrirAdicionarPessoa}
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" /> Adicionar Pessoa
            </button>
          </div>
        </header>

        {erro && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Pessoas</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{totalPessoas}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Dias cobrados no período</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{diasCobradosTotal}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Total do período</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{fmtMoeda(painel?.totalGeral)}</p>
          </div>
        </div>

        {ginasiosVisiveis.length === 0 && !carregando ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
            <Dumbbell className="h-10 w-10 text-brand-300" />
            <p className="text-sm text-slate-500">
              Nenhuma pessoa cadastrada ainda.
              <br />
              Clique em “Adicionar Pessoa” para começar.
            </p>
          </div>
        ) : null}

        {ginasiosVisiveis.map((g) => {
          const gerais = g.dias.reduce((acc, d) => [...acc, ...d.ajustesGerais], []);
          return (
            <div key={g.ginasio} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{g.nome}</h2>
                  <p className="text-xs text-slate-500">Subtotal do período</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {gerais.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      {gerais.map((a) => (
                        <span
                          key={a.id}
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${
                            a.tipo === 'REMOVIDO' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          {a.tipo === 'REMOVIDO' ? `Fechado: ${fmtDataBR(a.data)}` : `Extra: ${fmtDataBR(a.data)}`}
                          <button onClick={() => setModalExcluir({ tipo: 'ajuste', alvo: a })} className="rounded hover:text-red-700" title="Remover marcação">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => abrirAjuste('REMOVIDO', null, null, g.ginasio)}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-600 transition hover:bg-amber-100"
                  >
                    <Minus className="h-3.5 w-3.5" /> Tirar dia (ginásio)
                  </button>
                  <p className="text-2xl font-bold text-slate-800">{fmtMoeda(g.total)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                {g.dias.map((dia) => (
                  <div key={dia.diaSemana} className="rounded-xl border border-slate-100 bg-slate-50 p-1.5">
                    <div className="mb-1 flex items-center justify-between px-2 py-1">
                      <span className="text-sm font-semibold text-slate-700">{dia.rotulo}</span>
                      <span className="text-[11px] font-medium text-slate-400">{dia.qtdeDias} no período</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {dia.pessoas.map((pessoa) => {
                        const ehDiaDaPessoa = (dataIso) => new Date(`${dataIso}T00:00:00`).getDay() === diaParaJs[dia.diaSemana];
                        const semJogo = (pessoa.datas || []).filter((d) => d.tipo === 'REMOVIDO' && ehDiaDaPessoa(d.data));
                        const extras = (pessoa.datas || []).filter((d) => d.tipo === 'ADICIONADO');
                        return (
                          <div key={pessoa.reservaId} className="flex flex-wrap items-center gap-2.5 rounded-lg bg-white px-3 py-2 shadow-sm">
                            <span className="w-10 shrink-0 rounded-lg bg-slate-100 py-1 text-center text-xs font-bold text-slate-700">
                              {pessoa.diasCobrados}/{dia.qtdeDias}
                            </span>
                            <span className="flex-1 truncate text-sm font-medium text-slate-800">{pessoa.nome}</span>
                            <div className="flex max-w-[45%] flex-wrap items-center gap-1">
                              {semJogo.map((d) => {
                                const aj = (pessoa.ajustes || []).find((a) => a.data === d.data);
                                return (
                                  <span
                                    key={`r-${d.data}`}
                                    title="Sem jogo"
                                    className="inline-flex items-center gap-0.5 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600"
                                  >
                                    {fmtDataBR(d.data)}
                                    {aj && (
                                      <button
                                        onClick={() => setModalExcluir({ tipo: 'ajuste', alvo: aj })}
                                        className="rounded hover:text-red-700"
                                        title="Remover esta marcação"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                  </span>
                                );
                              })}
                              {extras.map((d) => {
                                const aj = (pessoa.ajustes || []).find((a) => a.data === d.data);
                                return (
                                  <span
                                    key={`a-${d.data}`}
                                    title="Jogado a mais"
                                    className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600"
                                  >
                                    +{fmtDataBR(d.data)}
                                    {aj && (
                                      <button
                                        onClick={() => setModalExcluir({ tipo: 'ajuste', alvo: aj })}
                                        className="rounded hover:text-emerald-700"
                                        title="Remover esta marcação"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                            <span className="text-sm font-bold text-emerald-600">{fmtMoeda(pessoa.valor)}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => abrirAjuste('REMOVIDO', dia, pessoa, g.ginasio)}
                                title="Sem jogo"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => abrirAjuste('ADICIONADO', dia, pessoa, g.ginasio)}
                                title="Dia extra"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => copiarMensagem(pessoa, dia)}
                                title="Copiar mensagem para WhatsApp"
                                className={btnIcone(copiadoId === pessoa.reservaId ? 'text-emerald-600' : '')}
                              >
                                {copiadoId === pessoa.reservaId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </button>
                              <button onClick={() => abrirEditarPessoa(pessoa)} title="Editar" className={btnIcone()}>
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setModalExcluir({ tipo: 'pessoa', alvo: pessoa })}
                                title="Excluir"
                                className={btnIcone('hover:bg-red-50 hover:text-red-600')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {acao && (
        <aside className="sticky bottom-0 h-fit w-full shrink-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:sticky lg:top-20 lg:w-80">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">{acao.pessoa ? 'Editar pessoa' : 'Adicionar pessoa'}</h3>
              <p className="text-xs text-slate-500">{acao.pessoa ? 'Atualize os dados da reserva.' : 'Cadastre uma nova reserva fixa semanal.'}</p>
            </div>
            <button onClick={() => setAcao(null)} className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Nome
              <input
                value={formPessoa.nome}
                onChange={(e) => setFormPessoa({ ...formPessoa, nome: e.target.value })}
                placeholder="Nome da pessoa"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
              />
            </label>
            {!acao.pessoa && (
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Ginásio
                <select
                  value={formPessoa.ginasio}
                  onChange={(e) => setFormPessoa({ ...formPessoa, ginasio: e.target.value })}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Selecione</option>
                  {(painel?.ginasios || []).map((g) => (
                    <option key={g.ginasio} value={g.ginasio}>
                      {g.nome}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Dia da semana
              <select
                value={formPessoa.diaSemana}
                onChange={(e) => setFormPessoa({ ...formPessoa, diaSemana: e.target.value })}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
              >
                {DIAS.map((d) => (
                  <option key={d.valor} value={d.valor}>
                    {d.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Valor por dia (R$)
              <input
                value={formPessoa.valorDia}
                onChange={(e) => setFormPessoa({ ...formPessoa, valorDia: e.target.value })}
                placeholder="25,00"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
              />
            </label>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              onClick={salvarPessoa}
              disabled={salvando}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
            </button>
            <button
              onClick={() => setAcao(null)}
              disabled={salvando}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </aside>
      )}

      {modalAjuste && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">{modalAjuste.pessoa ? 'Ajuste para a pessoa' : 'Tirar dia (ginásio)'}</h3>
                <p className="text-xs text-slate-500">
                  {modalAjuste.pessoa
                    ? `${modalAjuste.pessoa.nome} · ${modalAjuste.dia.rotulo} · ${modalAjuste.tipo === 'REMOVIDO' ? 'sem jogo' : 'dia extra'}`
                    : `${modalAjuste.ginasioNome} · o dia escolhido vale para todos`}
                </p>
              </div>
              <button onClick={() => setModalAjuste(null)} className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Data
                <input
                  type="date"
                  value={modalAjuste.data}
                  min={modalAjuste.min}
                  max={modalAjuste.max}
                  onChange={(e) => setModalAjuste({ ...modalAjuste, data: e.target.value })}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Motivo (opcional)
                <input
                  value={modalAjuste.motivo || ''}
                  onChange={(e) => setModalAjuste({ ...modalAjuste, motivo: e.target.value })}
                  placeholder="Ex.: médica, viagem, evento..."
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                />
              </label>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={salvarAjuste}
                disabled={salvando}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
              >
                {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
              </button>
              <button
                onClick={() => setModalAjuste(null)}
                disabled={salvando}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-800">
              {modalExcluir.tipo === 'pessoa' ? 'Excluir pessoa?' : 'Remover marcação?'}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {modalExcluir.tipo === 'pessoa'
                ? `A reserva de ${modalExcluir.alvo.nome} e todos os seus ajustes serão excluídos.`
                : 'A marcação deste dia será removida e o valor recalculado.'}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={excluir}
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
};

export default Ginasios;