import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, ShieldCheck, Wallet, Activity, Music } from 'lucide-react';
import { SETORES, getSetorAtivo, setSetorAtivo } from '../services/setor';

const heading = { fontFamily: "'Varela Round', sans-serif" };

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

  // Pega o nome do gestor salvo no login
  const userName = localStorage.getItem('usuarioNome') || 'Gestor';
  const [setorAtivo, setSetorLocal] = useState(getSetorAtivo());

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
    { path: '/painel', label: 'Equipe de Instrutores', icon: Users },
  ];

  const IconeSetor = setorAtivo === 'ESPORTE' ? Activity : Music;

  return (
    <div className="min-h-screen bg-warm flex flex-col">
      {/* TOPO FIXO: MARCA + SELEÇÃO DE SETOR + USUÁRIO */}
      <header className="sticky top-0 z-40 bg-cream-50/90 backdrop-blur border-b border-cream-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Marca */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-700 text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 style={heading} className="text-base text-stone-800 leading-tight">INDACI</h1>
              <p className="text-[10px] text-stone-500 leading-tight">Portal de Prestação de Contas</p>
            </div>
          </div>

          {/* Seletor global de setor */}
          <div className="flex items-center gap-1.5 bg-cream-100 rounded-full p-1 border border-cream-200">
            {SETORES.map((s) => {
              const cfg = CORES_SETOR[s.valor];
              const ativo = setorAtivo === s.valor;
              return (
                <button
                  key={s.valor}
                  onClick={() => handleTrocarSetor(s.valor)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200 ${
                    ativo ? cfg.ativo : cfg.inativo
                  }`}
                >
                  {s.rotulo}
                </button>
              );
            })}
          </div>

          {/* Usuário + sair */}
          <div className="flex items-center gap-3">
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
        {/* MENU LATERAL: APENAS NAVEGAÇÃO */}
        <aside className="w-56 shrink-0 bg-cream-50 border-r border-cream-200 py-6 px-4 flex flex-col">
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
    </div>
  );
}