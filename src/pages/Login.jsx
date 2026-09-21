import { useState } from 'react';
import { api, obterMensagemErro } from '../services/api';
import {
  User, Lock, ArrowRight, Loader2, KeyRound,
  FileScan, Link2, Send, ShieldCheck, Sparkles
} from 'lucide-react';

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
      setErro(obterMensagemErro(error, 'Erro ao conectar com o servidor.'));
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
      setErro(obterMensagemErro(error, 'Erro ao trocar a senha.'));
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
    <div className="min-h-screen bg-warm flex flex-col lg:flex-row">
      {/* ===== PAINEL INSTITUCIONAL ===== */}
      <div className="flex flex-col justify-start lg:justify-between bg-brand-900 text-white relative overflow-hidden px-6 py-8 sm:px-10 lg:px-12 lg:py-12 lg:w-1/2">
        {/* Detalhes decorativos do painel */}
        <div className="absolute -top-32 -left-24 w-[26rem] h-[26rem] rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 w-[30rem] h-[30rem] rounded-full bg-brand-700/40 blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-40 h-40 rounded-full bg-brand-300/10 blur-2xl" />
        <div className="absolute top-24 right-10 w-2 h-2 rounded-full bg-brand-300/60" />
        <div className="absolute bottom-40 left-16 w-3 h-3 rounded-full bg-brand-300/40" />

        <div className="relative z-10">
          <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-center lg:justify-start">
            <div className="w-20 h-20 rounded-2xl bg-brand-300/15 border border-brand-300/30 flex items-center justify-center overflow-hidden shrink-0">
              <img src="/logo-indaci.png" alt="INDACI" className="max-h-14 w-auto max-w-[4.5rem] object-contain" />
            </div>
            <p className="text-xs text-brand-200 font-medium max-w-[11rem] sm:max-w-xs hidden lg:block">
              Instituto Indaci · Iporá – GO
            </p>
            <p className="text-sm text-brand-100 font-semibold lg:hidden">
              Portal de Prestações de Contas
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-lg my-10 lg:my-0 hidden lg:block">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-300/15 border border-brand-300/30 text-brand-100 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Plataforma de Gestão de Entidades
          </span>

          <h1 style={heading} className="mt-6 text-3xl leading-tight sm:text-4xl">
            Automação de Serviços e Prestação de Contas
          </h1>
          <p className="mt-4 text-brand-100/90 text-sm leading-relaxed">
            O portal reúne o lançamento de despesas, a leitura automática de comprovantes
            e a preparação das prestações de contas em um só lugar — com menos digitação,
            mais agilidade e mais precisão.
          </p>

          <div className="mt-8 lg:mt-10 space-y-5">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-brand-300/15 border border-brand-300/30 flex items-center justify-center">
                <FileScan className="w-5 h-5 text-brand-300" />
              </div>
              <div>
                <p className="font-semibold text-sm">Leitura inteligente</p>
                <p className="text-brand-100/80 text-xs mt-1 leading-relaxed">
                  Notas e comprovantes (PIX, TED/DOC e boletos) são lidos automaticamente, com
                  reconhecimento de valores, datas e favorecidos.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-brand-300/15 border border-brand-300/30 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-brand-300" />
              </div>
              <div>
                <p className="font-semibold text-sm">Conciliação automática</p>
                <p className="text-brand-100/80 text-xs mt-1 leading-relaxed">
                  Comprovantes vinculados às despesas por valor e favorecido, com revisão
                  manual sempre que precisar.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-brand-300/15 border border-brand-300/30 flex items-center justify-center">
                <Send className="w-5 h-5 text-brand-300" />
              </div>
              <div>
                <p className="font-semibold text-sm">Tudo pronto para enviar</p>
                <p className="text-brand-100/80 text-xs mt-1 leading-relaxed">
                  Dados organizados e exportação preparada para a prestação de contas,
                  sem retrabalho.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 hidden lg:flex items-center gap-2 text-brand-200 text-xs">
          <ShieldCheck className="w-4 h-4 text-brand-300" />
          Acesso protegido · Sistema de Gestão de Entidades
        </div>
      </div>

      {/* ===== ÁREA DO FORMULÁRIO ===== */}
      <div className="flex-1 flex flex-col justify-center px-4 py-10 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Detalhes decorativos de fundo */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-100/60 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-amber-100/50 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-emerald-100/40 blur-3xl" />

        {/* Título no mobile (preenche o espaço entre o painel e o card) */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-8 lg:hidden">
          <h2 style={heading} className="text-2xl text-brand-900 leading-snug">
            Automação de Serviços e Prestação de Contas
          </h2>
          <p className="text-sm text-stone-500 mt-2">
            Despesas, comprovantes e prestações de contas em um só lugar.
          </p>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 lg:mt-0">
          <div className="bg-white py-8 px-4 shadow-lg border border-cream-200 sm:rounded-2xl sm:px-10">

            {/* FASE 1: LOGIN PADRÃO */}
            {fase === 'LOGIN' && (
              <form className="space-y-6" onSubmit={handleLogin}>
                <div>
                  <h3 style={heading} className="text-xl text-stone-800">
                    Bem-vindo(a) de volta!
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 mb-6">
                    Acesse com suas credenciais para continuar.
                  </p>

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
    </div>
  );
}