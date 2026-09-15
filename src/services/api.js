import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
    headers: {
        'Content-Type': 'application/json',
    }
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.clear();
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export function obterMensagemErro(error, padrao = 'Erro inesperado.') {
    const dados = error?.response?.data;
    if (dados && typeof dados === 'string') return dados;
    if (dados && typeof dados.mensagem === 'string' && dados.mensagem.trim()) return dados.mensagem;
    return padrao;
}