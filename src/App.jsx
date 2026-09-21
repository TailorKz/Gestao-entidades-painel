import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login'; 
import DashboardGestor from './pages/DashboardGestor';
import PrestacaoGestor from './pages/PrestacaoGestor';
import ComprovantesGestor from './pages/ComprovantesGestor';
import PortalInstrutor from './pages/PortalInstrutor';
import PainelGestor from './pages/PainelGestor';
import LancarDespesa from './pages/LancarDespesa';
import EmprestimosEventos from './pages/EmprestimosEventos';
import Ginasios from './pages/Ginasios';
import LayoutGestor from './components/LayoutGestor';
import RequireAuth from './components/RequireAuth';

const ROLES_GESTOR = ['SUPER_ADMIN', 'GESTOR_ENTIDADE'];

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />

                <Route element={<RequireAuth roles={ROLES_GESTOR}><LayoutGestor /></RequireAuth>}>
                    <Route path="/gestor" element={<DashboardGestor />} />
                    <Route path="/prestacoes" element={<PrestacaoGestor />} />
                    <Route path="/comprovantes" element={<ComprovantesGestor />} />
                    <Route path="/lancar-despesa" element={<LancarDespesa />} />
                    <Route path="/emprestimos-eventos" element={<EmprestimosEventos />} />
                    <Route path="/ginasios" element={<Ginasios />} />
                    <Route path="/painel" element={<PainelGestor />} />
                </Route>

                <Route path="/admin" element={<Navigate to="/gestor" replace />} />
                <Route path="/instrutor" element={<RequireAuth roles={['INSTRUTOR']}><PortalInstrutor /></RequireAuth>} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}