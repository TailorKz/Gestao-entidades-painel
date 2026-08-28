import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login'; 
import DashboardGestor from './pages/DashboardGestor';
import PrestacaoGestor from './pages/PrestacaoGestor'; // <-- Importe aqui
import PortalInstrutor from './pages/PortalInstrutor';
import PainelGestor from './pages/PainelGestor';
import LayoutGestor from './components/LayoutGestor'; 

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                
                <Route element={<LayoutGestor />}>
                    <Route path="/gestor" element={<DashboardGestor />} />
                    <Route path="/prestacoes" element={<PrestacaoGestor />} /> {/* <-- Nova rota */}
                    <Route path="/painel" element={<PainelGestor />} />
                </Route>
                
                <Route path="/admin" element={<Navigate to="/gestor" replace />} />
                <Route path="/instrutor" element={<PortalInstrutor />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}