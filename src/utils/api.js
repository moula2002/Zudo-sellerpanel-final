import axios from 'axios';

const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.') ||
  window.location.hostname.startsWith('10.') ||
  window.location.hostname.endsWith('.local')
);

const PRODUCTION_DOMAIN = 'https://snbtradingco.in';

export const BASE_URL = isLocal ? '/api' : `${PRODUCTION_DOMAIN}/api`;
export const UPLOAD_URL = BASE_URL;
export const IMAGE_BASE_URL = PRODUCTION_DOMAIN;

const api = axios.create({
  baseURL: BASE_URL,
});

export const uploadApi = axios.create({
  baseURL: UPLOAD_URL,
});

const setupInterceptors = (instance) => {
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('zudo_seller_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const location = localStorage.getItem('zudo_seller_location');
    if (location && !config.headers['x-location']) {
      config.headers['x-location'] = location;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        if (error.response.data && error.response.data.code === 'SESSION_INVALIDATED') {
          alert('Session expired. You have logged in from another device.');
        } else {
          // alert('Session expired. Please log in again.');
        }
        localStorage.removeItem('zudo_seller_token');
        localStorage.removeItem('zudo_seller_user');
        localStorage.removeItem('zudo_seller_location');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
};

setupInterceptors(api);
setupInterceptors(uploadApi);

export const getImageUrl = (url) => {
  if (!url) return 'https://placehold.co/150';

  let cleanUrl = url;

  if (typeof cleanUrl === 'string' && cleanUrl.includes('via.placeholder.com')) {
    cleanUrl = cleanUrl.replace('via.placeholder.com', 'placehold.co');
  }

  // Remove existing domains to analyze the relative path
  if (cleanUrl.includes('snbtradingco.in')) {
    cleanUrl = cleanUrl.replace(/(https?:\/\/)?(https?\/\/)?(www\.)?snbtradingco\.in/g, '');
  }
  if (cleanUrl.includes('lightgreen-trout-176417.hostingersite.com')) {
    cleanUrl = cleanUrl.replace(/(https?:\/\/)?(https?\/\/)?lightgreen-trout-176417\.hostingersite\.com/g, '');
  }
  if (cleanUrl.includes('zudo.co.in/storage')) {
    cleanUrl = cleanUrl.replace(/(https?:\/\/)?(https?\/\/)?(www\.)?zudo\.co\.in\/storage/g, '/uploads');
  }

  // Remove localhost references
  if (cleanUrl.includes('localhost:5000')) {
    cleanUrl = cleanUrl.replace(/http:\/\/localhost:5000\/api/g, '')
      .replace(/http:\/\/localhost:5000/g, '');
  }

  // If it's still a full URL from somewhere else, return it as is
  if (cleanUrl.startsWith('http')) return cleanUrl;

  // Ensure leading slash
  cleanUrl = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;

  // New images and anything else use the primary base URL
  return `${IMAGE_BASE_URL}${cleanUrl}`;
};

export default api;