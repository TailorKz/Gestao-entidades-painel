import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import DashboardGestor from './pages/DashboardGestor';
import PortalInstrutor from './pages/PortalInstrutor';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/gestor" replace />} />
                
                <Route path="/gestor" element={<DashboardGestor />} />
                
                <Route path="/instrutor" element={<PortalInstrutor />} />
            </Routes>
        </BrowserRouter>
    );
}