import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Banknote, Check, ClipboardCheck, FileCheck2, Loader2, Users } from 'lucide-react';
import { api, obterMensagemErro } from '../services/api';
import { listarChecklistPagamentos, salvarChecklistPagamento } from '../services/checklistPagamentos';

const heading = { fontFamily: "'Varela Round', sans-serif" };

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julio', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const GRUPOS = [
  { chave: 'ESPORTE', rotulo: 'Esporte', ponto: 'bg-emerald-500' },
  { chave: 'CULTURA', rotulo: 'Cultura', ponto: 'bg-amber-500' },
  { chave: 'ADMINISTRATIVO', rotulo: 'Administrativo', ponto: 'bg-stone-400' },
  { chave: 'SEM_DEPARTAMENTO', rotulo: 'Sem departamento', ponto: 'bg-stone-300' },
];

const marcaVazia = (usuario) => ({
  usuarioId: usuario.id,
  nome: usuario.nome,
  categoria: usuario.categoria || null,
  entregouDocumentos: false,
  pagamentoFeito: false,
});

export default function ChecklistPagamentos() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [instrutores, setInstrutores] = useState([]);
  const [marcas, setMarcas] = useState(new Map());
  const [salvando, setSalvando] = useState(new Set());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const anosDisponiveis = [hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1];

  const carregar = async () => {
    setCarregando(true);
    try {
      const [listaInstrutores, marcasDoMes] = await Promise.all([
        api.get('/usuarios/instrutores').then((r) => r.data),
        listarChecklistPagamentos(ano, mes),
      ]);
      setInstrutores(listaInstrutores);
      setMarcas(new Map(marcasDoMes.map((m) => [m.usuarioId, m])));
      setErro('');
    } catch (e) {
      setErro(obterMensagemErro(e));
      setInstrutores([]);
      setMarcas(new Map());
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, mes]);

  const estadoDe = (instrutor) => marcas.get(instrutor.id) || marcaVazia(instrutor);

  const persistir = async (instrutor, proximo) => {
    const anterior = marcas.get(instrutor.id) || marcaVazia(instrutor);
    setMarcas((prev) => new Map(prev).set(instrutor.id, { ...anterior, ...proximo }));
    setSalvando((prev) => new Set(prev).add(instrutor.id));

    try {
      const salvo = await salvarChecklistPagamento(
        instrutor.id,
        ano,
        mes,
        proximo.entregouDocumentos,
        proximo.pagamentoFeito
      );
      setMarcas((prev) => new Map(prev).set(instrutor.id, salvo));
      setErro('');
    } catch (e) {
      setMarcas((prev) => new Map(prev).set(instrutor.id, anterior));
      setErro(obterMensagemErro(e));
    } finally {
      setSalvando((prev) => {
        const proximoSet = new Set(prev);
        proximoSet.delete(instrutor.id);
        return proximoSet;
      });
    }
  };

  const alternarCampo = (instrutor, campo) => {
    const atual = estadoDe(instrutor);
    persistir(instrutor, { [campo]: !atual[campo] });
  };

  const alternarAmbos = (instrutor) => {
    const atual = estadoDe(instrutor);
    const marcar = !(atual.entregouDocumentos && atual.pagamentoFeito);
    persistir(instrutor, { entregouDocumentos: marcar, pagamentoFeito: marcar });
  };

  const grupos = useMemo(() => {
    const ordenados = [...instrutores].sort((a, b) =>
      String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')
    );
    return GRUPOS.map((grupo) => ({
      ...grupo,
      membros: ordenados.filter((i) => {
        const categoria = i.categoria || 'SEM_DEPARTAMENTO';
        return categoria === grupo.chave;
      }),
    })).filter((grupo) => grupo.membros.length > 0);
  }, [instrutores]);

  const resumo = useMemo(() => {
    const total = instrutores.length;
    let comDocumentos = 0;
    let pagos = 0;
    instrutores.forEach((i) => {
      const m = marcas.get(i.id);
      if (m?.entregouDocumentos) comDocumentos += 1;
      if (m?.pagamentoFeito) pagos += 1;
    });
    return { total, comDocumentos, pagos };
  }, [instrutores, marcas]);

  const cartaoResumo = (rotulo, valor, total, Icone, cor) => (
    <div className="bg-white border border-cream-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Icone className={`w-4 h-4 ${cor}`} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">{rotulo}</span>
      </div>
      <p className="text-xl font-bold text-stone-900">
        {valor}
        <span className="text-sm font-medium text-stone-400"> / {total}</span>
      </p>
    </div>
  );

  return (
    <div className="flex flex-col max-w-6xl w-full mx-auto p-6 lg:p-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 style={heading} className="text-2xl text-stone-900 flex items-center gap-2">
            <ClipboardCheck className="text-brand-700 w-6 h-6" /> Checklist de Pagamentos
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Controle de documentos e pagamentos por instrutor. Clique no nome para marcar os dois.
          </p>
        </div>
        <div className="bg-cream-50 px-3 py-2 rounded-xl border border-cream-200">
          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">Ano</label>
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="bg-white border border-cream-200 rounded-lg text-sm font-semibold text-stone-800 px-2 py-1 outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            {anosDisponiveis.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">{erro}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-cream-200 shadow-sm p-4 lg:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 style={heading} className="text-sm font-semibold text-stone-800">Mês de referência</h3>
          <span className="text-sm text-stone-500">{MESES[mes - 1]} / {ano}</span>
        </div>
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
          {MESES_CURTOS.map((rotulo, indice) => {
            const numero = indice + 1;
            const ativo = numero === mes;
            return (
              <button
                key={rotulo}
                type="button"
                onClick={() => setMes(numero)}
                title={MESES[indice]}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                  ativo
                    ? 'bg-brand-700 text-white border-brand-700 shadow-sm'
                    : 'bg-cream-50 text-stone-600 border-cream-200 hover:border-brand-300 hover:text-brand-700'
                }`}
              >
                {rotulo}
              </button>
            );
          })}
        </div>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando instrutores...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {cartaoResumo('Instrutores', instrutores.length, instrutores.length, Users, 'text-stone-500')}
            {cartaoResumo('Documentos entregues', resumo.comDocumentos, resumo.total, FileCheck2, 'text-emerald-600')}
            {cartaoResumo('Pagamentos feitos', resumo.pagos, resumo.total, Banknote, 'text-brand-700')}
          </div>

          {grupos.length === 0 ? (
            <div className="py-14 text-center text-sm text-stone-500 border border-dashed border-cream-200 rounded-2xl bg-cream-50">
              Nenhum instrutor cadastrado ainda.
            </div>
          ) : (
            grupos.map((grupo) => {
              const docs = grupo.membros.filter((i) => estadoDe(i).entregouDocumentos).length;
              const pagos = grupo.membros.filter((i) => estadoDe(i).pagamentoFeito).length;
              const pendentes = grupo.membros.filter(
                (i) => estadoDe(i).pagamentoFeito && !estadoDe(i).entregouDocumentos
              ).length;

              return (
                <div key={grupo.chave} className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-cream-50 border-b border-cream-200 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${grupo.ponto}`} />
                      <h3 style={heading} className="text-sm font-semibold text-stone-800">{grupo.rotulo}</h3>
                      <span className="text-xs text-stone-400">({grupo.membros.length})</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-medium text-stone-600 bg-white border border-cream-200 rounded-full px-2.5 py-1">
                        Docs {docs}/{grupo.membros.length}
                      </span>
                      <span className="text-[11px] font-medium text-stone-600 bg-white border border-cream-200 rounded-full px-2.5 py-1">
                        Pagos {pagos}/{grupo.membros.length}
                      </span>
                      {pendentes > 0 && (
                        <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                          {pendentes} pago sem documento
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hidden md:grid grid-cols-12 px-4 py-2 bg-white text-[11px] font-semibold uppercase tracking-wider text-stone-400 border-b border-cream-100">
                    <span className="col-span-6">Instrutor</span>
                    <span className="col-span-3">Documentos</span>
                    <span className="col-span-3">Pagamento</span>
                  </div>

                  <div>
                    {grupo.membros.map((instrutor) => {
                      const marca = estadoDe(instrutor);
                      const emAndamento = salvando.has(instrutor.id);
                      const ambosMarcados = marca.entregouDocumentos && marca.pagamentoFeito;
                      const inicial = String(instrutor.nome || '?').trim().charAt(0).toUpperCase();

                      return (
                        <div
                          key={instrutor.id}
                          className={`grid grid-cols-12 items-center px-4 py-3 gap-2 border-b border-cream-100 last:border-b-0 transition-colors ${
                            ambosMarcados ? 'bg-emerald-50/40' : 'hover:bg-cream-50/80'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => alternarAmbos(instrutor)}
                            title="Clique para marcar/desmarcar os dois"
                            className="col-span-12 md:col-span-6 flex items-center gap-3 text-left group min-w-0"
                          >
                            <span className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white bg-brand-700 shrink-0">
                              {inicial}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-stone-800 truncate group-hover:text-brand-700 transition-colors">
                                {instrutor.nome}
                              </span>
                            </span>
                            {emAndamento && <Loader2 className="w-3.5 h-3.5 text-stone-400 animate-spin shrink-0" />}
                            {ambosMarcados && !emAndamento && (
                              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                          </button>

                          <label className="col-span-6 md:col-span-3 flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={marca.entregouDocumentos}
                              onChange={() => alternarCampo(instrutor, 'entregouDocumentos')}
                              className="w-4 h-4 accent-emerald-600 cursor-pointer"
                            />
                            <span className="text-xs text-stone-600">Entregue</span>
                          </label>

                          <label className="col-span-6 md:col-span-3 flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={marca.pagamentoFeito}
                              onChange={() => alternarCampo(instrutor, 'pagamentoFeito')}
                              className="w-4 h-4 accent-brand-700 cursor-pointer"
                            />
                            <span className="text-xs text-stone-600">Pago</span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
