import { useState } from 'react';
import { api } from '../services/api';
import { Check, X, Loader2 } from 'lucide-react';

const TODOS_OS_MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function EditarDespesaInline({ despesa, mesesDisponiveis, onCancelar, onSalvo }) {
  const [valor, setValor] = useState(() => Number(despesa.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  const [nomeEmpresa, setNomeEmpresa] = useState(despesa.nomeEmpresa || '');
  const [emitente, setEmitente] = useState(despesa.emitente || '');
  const [observacao, setObservacao] = useState(despesa.observacao || '');
  const [mesAtual, setMesAtual] = useState(() => {
    const m = (despesa.dataCompetencia || '').split('-')[1];
    return m ? parseInt(m, 10) : null;
  });
  const [isSaving, setIsSaving] = useState(false);

  const meses = [...(mesesDisponiveis && mesesDisponiveis.length > 0 ? mesesDisponiveis : TODOS_OS_MESES)];
  const nomeMesAtual = TODOS_OS_MESES[(mesAtual || 1) - 1];
  if (mesAtual && !meses.includes(nomeMesAtual)) meses.unshift(nomeMesAtual);

  const salvar = async () => {
    const valorNum = parseFloat(valor.replace(/\./g, '').replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) return alert("Informe um valor válido.");
    if (!mesAtual) return alert("Selecione o mês de competência.");

    const ano = (despesa.dataCompetencia || '').split('-')[0] || new Date().getFullYear();
    const competencia = `${ano}-${String(mesAtual).padStart(2, '0')}`;

    setIsSaving(true);
    try {
      await api.put(`/despesas/${despesa.id}`, {
        valor: valorNum,
        dataCompetencia: competencia,
        emitente: emitente.trim(),
        nomeEmpresa: nomeEmpresa.trim() || null,
        observacao: observacao.trim() || null,
      });
      onSalvo();
    } catch (error) {
      console.error("Erro ao editar despesa:", error);
      alert(error.response?.data || "Erro ao salvar a despesa.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <tr className="bg-amber-50/60">
      <td colSpan={5} className="px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Empresa</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-cream-200 bg-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
              value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Emitente (nota)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-cream-200 bg-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
              value={emitente} onChange={(e) => setEmitente(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Valor (R$)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-cream-200 bg-white rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/40"
              value={valor} onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Mês de Competência</label>
            <select
              className="w-full px-3 py-2 border border-cream-200 bg-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
              value={mesAtual || ''} onChange={(e) => setMesAtual(parseInt(e.target.value, 10))}
            >
              <option value="">Selecione...</option>
              {meses.map((m, i) => (<option key={m} value={i + 1}>{m}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Observação</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-cream-200 bg-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
              value={observacao} onChange={(e) => setObservacao(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-3">
          <button onClick={onCancelar} disabled={isSaving} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-cream-200 text-stone-500 hover:text-stone-800 text-xs font-semibold transition-colors disabled:opacity-50">
            <X className="w-3.5 h-3.5" /> Cancelar
          </button>
          <button onClick={salvar} disabled={isSaving} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold transition-colors disabled:opacity-50">
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Salvar
          </button>
        </div>
      </td>
    </tr>
  );
}