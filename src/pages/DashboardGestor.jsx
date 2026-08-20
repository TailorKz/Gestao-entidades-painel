import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function DashboardGestor() {
    const [parcela, setParcela] = useState(null);
    const [despesas, setDespesas] = useState([]);

    useEffect(() => {
        api.get('/parcelas')
            .then(response => {
                if (response.data.length > 0) {
                    const parcelaAtual = response.data[0];
                    setParcela(parcelaAtual);
                    return api.get(`/despesas/parcela/${parcelaAtual.id}`);
                }
            })
            .then(response => {
                if (response) {
                    setDespesas(response.data);
                }
            })
            .catch(error => console.error("Erro na API:", error));
    }, []);

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-white shadow-sm border-b border-slate-200 px-8 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold text-slate-800">Painel de Gestão - INDACI</h1>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-500">Gestor Administrativo</span>
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">G</div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">
                            {parcela ? parcela.tituloFomento : "Carregando..."}
                        </h2>
                        <p className="text-slate-500 mt-1">Acompanhamento de saldo e aprovação de despesas.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-sm font-medium text-slate-500">Valor Inicial (Fomento)</h3>
                        <p className="text-3xl font-bold text-slate-800 mt-2">
                            {parcela ? `R$ ${parcela.valorInicial}` : "..."}
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-sm font-medium text-slate-500">Saldo Atual</h3>
                        <p className="text-3xl font-bold text-emerald-600 mt-2">
                            {parcela ? `R$ ${parcela.saldoAtual}` : "..."}
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-sm font-medium text-slate-500">Número da Parcela</h3>
                        <p className="text-3xl font-bold text-amber-500 mt-2">
                            {parcela ? `Parcela 0${parcela.numero}` : "..."}
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mt-8">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800">Extrato de Despesas</h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                                    <th className="p-4 font-medium">Instrutor</th>
                                    <th className="p-4 font-medium">Competência</th>
                                    <th className="p-4 font-medium">Valor</th>
                                    <th className="p-4 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {despesas.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="p-6 text-center text-slate-500">
                                            Nenhuma despesa registrada ainda.
                                        </td>
                                    </tr>
                                ) : (
                                    despesas.map(despesa => (
                                        <tr key={despesa.id} className="border-b border-slate-50 hover:bg-slate-50">
                                            <td className="p-4 text-slate-800 font-medium">{despesa.nomeInstrutor}</td>
                                            <td className="p-4 text-slate-600">{despesa.dataCompetencia}</td>
                                            <td className="p-4 text-slate-800 font-medium">R$ {despesa.valor}</td>
                                            <td className="p-4">
                                                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold">
                                                    {despesa.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}