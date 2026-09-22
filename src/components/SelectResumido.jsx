import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export default function SelectResumido({ value, opcoes, placeholder = "Selecione...", onChange, disabled, widthClass = "w-64" }) {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState(null);
  const ref = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const fechar = (e) => {
      if (ref.current && ref.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setAberto(false);
      setPosicao(null);
    };
    const fecharEvento = () => { setAberto(false); setPosicao(null); };
    document.addEventListener('mousedown', fechar);
    window.addEventListener('scroll', fecharEvento, true);
    window.addEventListener('resize', fecharEvento);
    return () => {
      document.removeEventListener('mousedown', fechar);
      window.removeEventListener('scroll', fecharEvento, true);
      window.removeEventListener('resize', fecharEvento);
    };
  }, []);

  const atual = opcoes.find(o => o.valor === value);

  const abrir = () => {
    if (disabled) return;
    if (aberto) { setAberto(false); setPosicao(null); return; }
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const largura = Math.max(r.width, 256);
    const alturaMax = 230;
    const alturaReal = Math.min(alturaMax, Math.max(120, (opcoes.length + 1) * 33 + 8));
    const espacoTopo = r.top;
    const espacoBaixo = window.innerHeight - r.bottom;
    const abrirCima = espacoBaixo < alturaReal && espacoTopo > espacoBaixo;
    setPosicao({
      topo: abrirCima ? Math.max(8, r.top - alturaReal - 4) : r.bottom + 4,
      esquerda: Math.max(8, Math.min(r.left, window.innerWidth - largura - 8)),
      largura,
    });
    setAberto(true);
  };

  const menus = aberto && posicao ? createPortal(
      <div
        ref={menuRef}
        style={{ position: 'fixed', top: posicao.topo, left: posicao.esquerda, width: posicao.largura, maxWidth: 448 }}
        className="bg-white border border-cream-200 rounded-xl shadow-lg max-h-56 overflow-y-auto py-1 z-[1000] animate-in fade-in zoom-in-95 duration-100"
      >
        <button
          type="button"
          onClick={() => { onChange(''); setAberto(false); setPosicao(null); }}
          className={`w-full px-3 py-2 text-left text-xs truncate hover:bg-cream-50 ${value === '' ? 'text-brand-700 font-semibold' : 'text-stone-500'}`}
        >
          {placeholder}
        </button>
        {opcoes.map(o => (
          <button
            key={o.valor}
            type="button"
            title={o.rotulo}
            onClick={() => { onChange(o.valor); setAberto(false); setPosicao(null); }}
            className={`w-full px-3 py-2 text-left text-xs truncate hover:bg-cream-50 ${value === o.valor ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-stone-700'}`}
          >
            {o.rotulo}
          </button>
        ))}
      </div>,
      document.body
    ) : null;

  return (
    <div ref={ref} className={`relative ${widthClass}`}>
      <button
        type="button"
        disabled={disabled}
        title={atual ? atual.rotulo : placeholder}
        onClick={abrir}
        className={`w-full flex items-center gap-2 px-3 py-2 border rounded-xl text-xs bg-white outline-none focus:ring-2 focus:ring-brand-500/40 text-left transition-colors ${disabled ? 'opacity-60 cursor-not-allowed' : 'border-cream-200 hover:border-brand-300'}`}
      >
        <span className={`flex-1 truncate ${atual ? 'text-stone-800 font-medium' : 'text-stone-400'}`}>{atual ? atual.rotulo : placeholder}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-stone-400 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {menus}
    </div>
  );
}