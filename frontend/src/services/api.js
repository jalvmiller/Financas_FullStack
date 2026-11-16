const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Cliente HTTP centralizado para consumo da API REST.
 * - Anexa o token JWT automaticamente no cabeçalho Authorization.
 * - Trata expiração / 401 executando logout e redirecionando.
 * - Formata erros no padrão único { erro, campos }.
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = localStorage.getItem('financas_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Se a requisição não for a tentativa de login em si, limpa a sessão e desloga
    if (!endpoint.includes('/auth/login')) {
      localStorage.removeItem('financas_token');
      localStorage.removeItem('financas_usuario');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
  }

  // Respostas 204 No Content
  if (response.status === 204) {
    return null;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.erro || `Erro na requisição: ${response.statusText}`);
    error.status = response.status;
    error.data = data;
    error.campos = data?.campos || {};
    throw error;
  }

  return data;
}

export const api = {
  get: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) =>
    apiRequest(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options = {}) =>
    apiRequest(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
