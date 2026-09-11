import { Navigate } from 'react-router-dom';

export default function RequireAuth({ roles, children }) {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('usuarioRole');

    if (!token) {
        return <Navigate to="/" replace />;
    }

    if (roles && !roles.includes(role)) {
        return <Navigate to="/" replace />;
    }

    return children;
}