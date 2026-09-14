import { useState } from 'react';
import { api } from '../services/api';
import { User, Lock, ArrowRight, Loader2, KeyRound } from 'lucide-react';

const heading = { fontFamily: "'Varela Round', sans-serif" };

export default function Login() {
  const [fase, setFase] = useState('LOGIN'); // 'LOGIN' ou 'TROCAR_SENHA'
  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState('');

  // Dados do formulário
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  // Guarda o ID temporariamente caso ele precise trocar a senha
  const [usuarioTemp, setUsuarioTemp] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErro('');

    try {
      const response = await api.post('/auth/login', { login, senha });
      const dadosUsuario = response.data;

      // Verifica se é o primeiro acesso (O Java devolve Status 202 ACCEPTED)
      if (dadosUsuario.precisaTrocarSenha) {
        setUsuarioTemp(dadosUsuario);
        setFase('TROCAR_SENHA');
        setIsLoading(false);
        return;
      }

      // Se não precisa trocar, finaliza o login com sucesso!
      iniciarSessao(dadosUsuario);

    } catch (error) {
      setErro(error.response?.data || 'Erro ao conectar com o servidor.');
      setIsLoading(false);
    }
  };

  const handleTrocarSenha = async (e) => {
    e.preventDefault();
    setErro('');

    if (novaSenha !== confirmarSenha) {
      return setErro('As senhas não coincidem!');
    }
    if (novaSenha.length < 6) {
      return setErro('A nova senha deve ter no mínimo 6 caracteres.');
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/trocar-senha', {
        usuarioId: usuarioTemp.usuarioId,
        novaSenha: novaSenha
      });

      alert('Senha atualizada com sucesso!');

      // A resposta já vem com o token de acesso do novo login
      iniciarSessao(response.data);

    } catch (error) {
      setErro(error.response?.data || 'Erro ao trocar a senha.');
      setIsLoading(false);
    }
  };

  const iniciarSessao = (dados) => {
    // Salva os dados do usuário no navegador (Local Storage)
    localStorage.setItem('usuarioId', dados.usuarioId);
    localStorage.setItem('usuarioNome', dados.nome);
    localStorage.setItem('usuarioRole', dados.role);
    if (dados.token) localStorage.setItem('token', dados.token);
    if (dados.tenantId) localStorage.setItem('tenantId', dados.tenantId);
    if (dados.categoria) localStorage.setItem('usuarioCategoria', dados.categoria);
    if (dados.categoria) localStorage.setItem('setorAtivo', dados.categoria);

    // Redireciona de acordo com o nível de acesso
    if (dados.role === 'SUPER_ADMIN' || dados.role === 'GESTOR_ENTIDADE') {
      window.location.href = '/admin';
    } else {
      window.location.href = '/instrutor';
    }
  };

  return (
    <div className="min-h-screen bg-warm flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Detalhes decorativos de fundo */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-100/60 blur-3xl" />
      <div className="absolute -bottom-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-amber-100/50 blur-3xl" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-emerald-100/40 blur-3xl" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <img src="/logo-indaci.png" alt="INDACI" className="h-20 w-auto mx-auto drop-shadow-sm" />
        <p className="text-center text-brand-700 font-semibold text-sm mt-3">
          Portal de Prestações de Contas
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-lg border border-cream-200 sm:rounded-2xl sm:px-10">

          {/* FASE 1: LOGIN PADRÃO */}
          {fase === 'LOGIN' && (
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <h3 style={heading} className="text-lg text-stone-800 flex items-center gap-2 mb-6">
                  <Lock className="text-brand-700 w-5 h-5" /> Acesso ao Sistema
                </h3>

                {erro && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-xl">
                    {erro}
                  </div>
                )}

                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Login do Usuário</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-stone-400" />
                  </div>
                  <input
                    type="text"
                    required
                    className="block w-full pl-10 px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                    placeholder="Seu login"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-stone-400" />
                  </div>
                  <input
                    type="password"
                    required
                    className="block w-full pl-10 px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors disabled:opacity-70"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {isLoading ? 'Autenticando...' : 'Entrar no Portal'}
              </button>
            </form>
          )}

          {/* FASE 2: PRIMEIRO ACESSO (CRIAR SENHA) */}
          {fase === 'TROCAR_SENHA' && (
            <form className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300" onSubmit={handleTrocarSenha}>
              <div>
                <h3 style={heading} className="text-lg text-stone-800 flex items-center gap-2 mb-2">
                  <KeyRound className="text-brand-700 w-5 h-5" /> Primeiro Acesso
                </h3>
                <p className="text-xs text-stone-500 mb-6">
                  Olá, <strong>{usuarioTemp?.nome}</strong>. Por motivos de segurança, você precisa cadastrar uma senha particular antes de continuar.
                </p>

                {erro && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-xl">
                    {erro}
                  </div>
                )}

                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Nova Senha Definitiva</label>
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-stone-400" />
                  </div>
                  <input
                    type="password"
                    required
                    className="block w-full pl-10 px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                    placeholder="Mínimo de 6 caracteres"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                  />
                </div>

                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Confirme a Nova Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-stone-400" />
                  </div>
                  <input
                    type="password"
                    required
                    className="block w-full pl-10 px-3 py-2 border border-cream-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                    placeholder="Repita a senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 transition-colors disabled:opacity-70"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar e Acessar'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}