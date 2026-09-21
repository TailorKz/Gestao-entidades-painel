import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Wallet, Activity, Music, Send, ArrowLeftRight, Bell, Dumbbell, Menu, X, Landmark } from 'lucide-react';
import { SETORES, getSetorAtivo, setSetorAtivo } from '../services/setor';
import { api } from '../services/api';

const heading = { fontFamily: "'Varela Round', sans-serif" };

const fmtDataBR = (iso) => {
  const [, m, d] = String(iso || '').split('-');
  return `${d}/${m}`;
};

const CORES_SETOR = {
  ESPORTE: {
    ativo: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
    inativo: 'text-stone-500 hover:text-emerald-700 bg-transparent border-transparent',
    icone: 'text-emerald-500',
  },
  CULTURA: {
    ativo: 'bg-amber-500 text-white border-amber-500 shadow-sm',
    inativo: 'text-stone-500 hover:text-amber-700 bg-transparent border-transparent',
    icone: 'text-amber-500',
  },
};

export default function LayoutGestor() {
  const location = useLocation();
  const navigate = useNavigate();

  const [menuAberto, setMenuAberto] = useState(false);

  // Pega o nome do gestor salvo no login
  const userName = localStorage.getItem('usuarioNome') || 'Gestor';
  const [setorAtivo, setSetorLocal] = useState(getSetorAtivo());
  const [lembretesHoje, setLembretesHoje] = useState([]);
  const [lembretesProximos, setLembretesProximos] = useState([]);
  const [bellAberto, setBellAberto] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    const carregarLembretes = async () => {
      try {
        const [hoje, proximos] = await Promise.all([
          api.get('/lembretes/hoje'),
          api.get('/lembretes/proximos'),
        ]);
        setLembretesHoje(hoje.data);
        const hojeStr = new Date().toISOString().slice(0, 10);
        setLembretesProximos(proximos.data.filter((l) => l.data > hojeStr));
      } catch {
        setLembretesHoje([]);
        setLembretesProximos([]);
      }
    };
    carregarLembretes();
    window.addEventListener('setor-changed', carregarLembretes);
    return () => window.removeEventListener('setor-changed', carregarLembretes);
  }, []);

  useEffect(() => {
    const aoClicarFora = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellAberto(false);
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  // Fecha o drawer ao trocar de página
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuAberto(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.clear(); // Limpa a sessão
    navigate('/'); // Manda pro login
  };

  const handleTrocarSetor = (valor) => {
    setSetorLocal(valor);
    setSetorAtivo(valor);
  };

  const menuItems = [
    { path: '/gestor', label: 'Visão Geral', icon: LayoutDashboard },
    { path: '/prestacoes', label: 'Controle de Parcelas', icon: Wallet },
    { path: '/comprovantes', label: 'Comprovantes', icon: Landmark },
    { path: '/lancar-despesa', label: 'Lançar Despesa', icon: Send },
    { path: '/emprestimos-eventos', label: 'Empréstimos e Eventos', icon: ArrowLeftRight },
    { path: '/ginasios', label: 'Controle de Ginásios', icon: Dumbbell },
    { path: '/painel', label: 'Equipe de Instrutores', icon: Users },
  ];

  const IconeSetor = setorAtivo === 'ESPORTE' ? Activity : Music;

  const renderSetorButtons = (classe) =>
    SETORES.map((s) => {
      const cfg = CORES_SETOR[s.valor];
      const ativo = setorAtivo === s.valor;
      return (
        <button
          key={s.valor}
          onClick={() => handleTrocarSetor(s.valor)}
          className={`flex items-center gap-2 ${classe} rounded-full text-xs sm:text-sm font-semibold border transition-all duration-200 ${
            ativo ? cfg.ativo : cfg.inativo
          }`}
        >
          {s.rotulo}
        </button>
      );
    });

  return (
    <div className="min-h-screen bg-warm flex flex-col">
      {/* TOPO FIXO: MARCA + AÇÕES (o seletor de setor vai para o drawer no mobile) */}
      <header className="sticky top-0 z-40 bg-cream-50/90 backdrop-blur border-b border-cream-200">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-1.5 sm:gap-3">
          {/* Hamburguer (mobile) */}
          <button
            onClick={() => setMenuAberto(true)}
            className="lg:hidden p-2 rounded-lg text-stone-600 hover:bg-cream-100 transition-colors"
            title="Abrir menu"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Marca */}
          <div className="flex items-center gap-2.5">
            <img src="/logo-indaci.png" alt="INDACI" className="h-10 w-auto" />
            <div className="leading-tight">
              <h1 style={heading} className="text-base text-stone-800">INDACI</h1>
              <p className="hidden md:block text-[10px] text-stone-500">Prestação de Contas</p>
            </div>
          </div>

          {/* Seletor global de setor (apenas desktop) */}
          <div className="hidden lg:flex items-center gap-1.5 bg-cream-100 rounded-full p-1 border border-cream-200">
            {renderSetorButtons('px-4 py-1.5')}
          </div>

          {/* Usuário + notificações + sair */}
          <div className="flex items-center gap-1 sm:gap-2.5">
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellAberto((v) => !v)}
                title="Lembretes de hoje"
                aria-label={`Notificações de hoje: ${lembretesHoje.length}`}
                aria-expanded={bellAberto}
                className={`relative p-2 rounded-lg transition-colors cursor-pointer ${lembretesHoje.length > 0 ? 'text-amber-600 hover:bg-amber-50' : 'text-stone-400 hover:text-stone-600 hover:bg-cream-100'}`}
              >
                <Bell className="w-5 h-5" />
                {lembretesHoje.length > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 border-2 border-white"
                  >
                    {lembretesHoje.length}
                  </span>
                )}
              </button>
              <span role="status" className="sr-only">
                {lembretesHoje.length > 0
                  ? `${lembretesHoje.length} lembrete${lembretesHoje.length > 1 ? 's' : ''} para hoje`
                  : 'Sem lembretes para hoje'}
              </span>
              {bellAberto && (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-cream-200 shadow-lg overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-cream-200 bg-cream-50">
                    <p style={heading} className="text-xs font-bold text-stone-700 uppercase tracking-widest">Lembretes de Hoje</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {lembretesHoje.length === 0 ? (
                      <p className="px-4 py-4 text-sm text-stone-500 text-center">Nenhum lembrete para hoje.</p>
                    ) : (
                      lembretesHoje.map((l) => (
                        <div key={l.id} className="px-4 py-3 border-b border-cream-100 flex items-start gap-2.5">
                          <span className="mt-0.5 w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                          <span className="text-sm text-stone-700">{l.titulo}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-3 border-b border-t border-cream-200 bg-cream-50">
                    <p style={heading} className="text-xs font-bold text-stone-700 uppercase tracking-widest">Próximos Dias</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {lembretesProximos.length === 0 ? (
                      <p className="px-4 py-4 text-sm text-stone-500 text-center">Nenhum lembrete nos próximos dias.</p>
                    ) : (
                      lembretesProximos.slice(0, 8).map((l) => (
                        <div key={l.id} className="px-4 py-3 border-b border-cream-100 flex items-start gap-2.5">
                          <span className="mt-1 w-10 shrink-0 text-right text-[11px] font-semibold text-stone-400">{fmtDataBR(l.data)}</span>
                          <span className="mt-0.5 w-2 h-2 rounded-full bg-brand-400 shrink-0" aria-hidden="true" />
                          <span className="text-sm text-stone-700">{l.titulo}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:block text-sm font-semibold text-stone-700">{userName}</span>
            </div>
            <button
              onClick={handleLogout}
              title="Sair do Sistema"
              className="p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* MENU LATERAL: APENAS NAVEGAÇÃO (desktop) */}
        <aside className="hidden lg:flex w-56 shrink-0 bg-cream-50 border-r border-cream-200 py-6 px-4 flex-col">
          <div className="flex items-center gap-2 px-3 mb-5">
            <IconeSetor className={`w-4 h-4 ${CORES_SETOR[setorAtivo].icone}`} />
            <span style={heading} className="text-sm text-stone-700">
              {setorAtivo === 'ESPORTE' ? 'Departamento de Esporte' : 'Departamento de Cultura'}
            </span>
          </div>

          <nav className="flex-1 space-y-1.5">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-stone-600 hover:bg-cream-100 hover:text-stone-900'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {item.label}
                </Link>
              );
            })}
          </nav>

          <p className="px-3 mt-6 text-[10px] text-stone-400 leading-relaxed">
            O seletor de setor no topo filtra todos os dados exibidos nas páginas.
          </p>
        </aside>

        {/* CONTEÚDO */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* DRAWER MOBILE (hambúrguer) */}
      {menuAberto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-stone-900/40" onClick={() => setMenuAberto(false)} aria-hidden="true" />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-cream-50 flex flex-col py-6 px-4 shadow-xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-3 mb-4">
              <div className="flex items-center gap-2">
                <IconeSetor className={`w-4 h-4 ${CORES_SETOR[setorAtivo].icone}`} />
                <span style={heading} className="text-sm text-stone-700">
                  {setorAtivo === 'ESPORTE' ? 'Departamento de Esporte' : 'Departamento de Cultura'}
                </span>
              </div>
              <button
                onClick={() => setMenuAberto(false)}
                className="p-2 rounded-lg text-stone-500 hover:bg-cream-100 transition-colors"
                title="Fechar menu"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Seletor de setor no mobile */}
            <div className="flex items-center gap-1.5 bg-white rounded-full p-1 border border-cream-200 mb-4">
              {renderSetorButtons('px-3 py-1.5 flex-1 justify-center')}
            </div>

            <nav className="flex-1 space-y-1.5 overflow-y-auto">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMenuAberto(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-stone-600 hover:bg-cream-100 hover:text-stone-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {item.label}
                  </Link>
                );
              })}
            </nav>

            <p className="px-3 mt-6 text-[10px] text-stone-400 leading-relaxed">
              O seletor de setor filtra todos os dados exibidos nas páginas.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}