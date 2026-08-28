import React from 'react';
import { Users, AlertCircle, CheckCircle2, Clock3, TrendingUp } from 'lucide-react';

const heading = { fontFamily: "'Poppins', sans-serif" };

export default function DashboardGestor() {
    const userName = localStorage.getItem('usuarioNome') || 'Gestor';

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <main className="flex-1 max-w-6xl w-full mx-auto p-8 space-y-8">
                
                {/* SAUDAÇÃO E RESUMO */}
                <div>
                    <h2 style={heading} className="text-2xl font-semibold text-slate-900">
                        Olá, {userName}!
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Aqui está o resumo das atividades e pendências do INDACI de hoje.
                    </p>
                </div>

                {/* CARDS DE INDICADORES (MOCK INICIAL) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Equipe Ativa</h3>
                            <div className="p-2 bg-sky-50 rounded-lg"><Users className="w-4 h-4 text-sky-600" /></div>
                        </div>
                        <p style={heading} className="text-3xl font-semibold text-slate-900">12</p>
                        <p className="text-xs text-slate-500 mt-2">Instrutores cadastrados</p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider">Aguardando Envio</h3>
                            <div className="p-2 bg-amber-50 rounded-lg"><Clock3 className="w-4 h-4 text-amber-600" /></div>
                        </div>
                        <p style={heading} className="text-3xl font-semibold text-slate-900">4</p>
                        <p className="text-xs text-slate-500 mt-2">Faltam prestar contas neste mês</p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Notas Recebidas</h3>
                            <div className="p-2 bg-emerald-50 rounded-lg"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></div>
                        </div>
                        <p style={heading} className="text-3xl font-semibold text-slate-900">8</p>
                        <p className="text-xs text-slate-500 mt-2">Prestações validadas</p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-sky-600 uppercase tracking-wider">Saúde da Parcela</h3>
                            <div className="p-2 bg-sky-50 rounded-lg"><TrendingUp className="w-4 h-4 text-sky-600" /></div>
                        </div>
                        <p style={heading} className="text-3xl font-semibold text-slate-900">85%</p>
                        <p className="text-xs text-slate-500 mt-2">Do orçamento comprometido</p>
                    </div>
                </div>

                {/* ÁREA DE ALERTAS / PENDÊNCIAS */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        <h3 style={heading} className="text-sm font-semibold text-slate-900">
                            Atenção Requerida: Instrutores Pendentes
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="text-center py-8 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                            <p className="text-sm text-slate-500">
                                A integração com os envios pendentes será exibida aqui.
                            </p>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}