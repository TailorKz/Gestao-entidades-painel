import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, ShieldCheck, Wallet } from 'lucide-react';

const heading = { fontFamily: "'Poppins', sans-serif" };

export default function LayoutGestor() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Pega o nome do gestor salvo no login
  const userName = localStorage.getItem('usuarioNome') || 'Gestor';

  const handleLogout = () => {
    localStorage.clear(); // Limpa a sessão
    navigate('/'); // Manda pro login
  };

 const menuItems = [
    { path: '/gestor', label: 'Visão Geral (Dashboard)', icon: LayoutDashboard },
    { path: '/prestacoes', label: 'Controle de Parcelas', icon: Wallet }, // <-- A nova página
    { path: '/painel', label: 'Equipe de Instrutores', icon: Users },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      
      {/* SIDEBAR ESQUERDA */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800">
        
        {/* Logo/Marca */}
        <div className="h-14 flex items-center px-6 border-b border-slate-800 bg-slate-950/50">
          <h1 style={heading} className="text-white text-sm font-semibold tracking-wide flex items-center gap-2">
            <ShieldCheck className="text-sky-400 w-5 h-5" /> INDACI
          </h1>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 py-6 px-4 space-y-2">
          <p className="px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Menu Principal
          </p>
          
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-sky-600/10 text-sky-400 border border-sky-500/20' 
                    : 'hover:bg-slate-800 hover:text-white border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" /> {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Perfil e Logout */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-semibold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-[10px] text-sky-400 font-medium truncate">Administrador</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO CENTRAL */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* O Outlet é a "janela" mágica do React Router. 
            É aqui dentro que o PainelGestor ou DashboardGestor vão aparecer! */}
        <Outlet />
      </main>
      
    </div>
  );
}