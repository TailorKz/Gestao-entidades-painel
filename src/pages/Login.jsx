import React, { useState } from 'react';
import { api } from '../services/api';
import { User, Lock, ArrowRight, ShieldCheck, Loader2, KeyRound } from 'lucide-react';

const heading = { fontFamily: "'Poppins', sans-serif" };

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
      await api.post('/auth/trocar-senha', {
        usuarioId: usuarioTemp.usuarioId,
        novaSenha: novaSenha
      });

      alert('Senha atualizada com sucesso!');
      
      // Como ele trocou a senha e já sabemos quem é, iniciamos a sessão
      iniciarSessao(usuarioTemp);

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

    // Redireciona de acordo com o nível de acesso
    if (dados.role === 'SUPER_ADMIN' || dados.role === 'GESTOR_ENTIDADE') {
      window.location.href = '/admin';
    } else {
      window.location.href = '/instrutor';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Detalhe de fundo */}
      <div className="absolute top-0 w-full h-64 bg-slate-900" />
      <div className="absolute top-64 w-full h-1 bg-gradient-to-r from-sky-500 via-sky-600 to-slate-900" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <h2 style={heading} className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
          INDACI
        </h2>
        <p className="text-center text-sky-400 font-medium text-sm mt-1">
          Portal de Prestações de Contas
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-200 sm:rounded-xl sm:px-10">
          
          {/* FASE 1: LOGIN PADRÃO */}
          {fase === 'LOGIN' && (
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <h3 style={heading} className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-6">
                  <ShieldCheck className="text-sky-600 w-5 h-5" /> Acesso ao Sistema
                </h3>
                
                {erro && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-md">
                    {erro}
                  </div>
                )}

                <label className="block text-xs font-medium text-slate-700 mb-1.5">Login do Usuário</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    className="block w-full pl-10 px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-600"
                    placeholder="Seu login"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    className="block w-full pl-10 px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-600"
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors disabled:opacity-70"
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
                <h3 style={heading} className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-2">
                  <KeyRound className="text-sky-600 w-5 h-5" /> Primeiro Acesso
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  Olá, <strong>{usuarioTemp?.nome}</strong>. Por motivos de segurança, você precisa cadastrar uma senha particular antes de continuar.
                </p>
                
                {erro && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-md">
                    {erro}
                  </div>
                )}

                <label className="block text-xs font-medium text-slate-700 mb-1.5">Nova Senha Definiva</label>
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    className="block w-full pl-10 px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-600"
                    placeholder="Mínimo de 6 caracteres"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                  />
                </div>

                <label className="block text-xs font-medium text-slate-700 mb-1.5">Confirme a Nova Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    className="block w-full pl-10 px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-600"
                    placeholder="Repita a senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 transition-colors disabled:opacity-70"
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