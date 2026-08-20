export const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_SOCKET_URL ||
  window.location.origin
).replace(/\/$/, '');

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export const getApiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  // If BACKEND_URL already ends with /api and endpoint starts with /api, remove duplicate /api
  if (BACKEND_URL.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
    return `${BACKEND_URL}${cleanEndpoint.substring(4)}`;
  }
  return `${BACKEND_URL}${cleanEndpoint}`;
};
