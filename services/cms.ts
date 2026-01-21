import { Post, ApiResponse } from '../types';

const STORAGE_KEY_API = 'cms_api_url';
const STORAGE_KEY_IK_PUBLIC = 'cms_ik_public_key';

export const getApiUrl = (): string => {
  return localStorage.getItem(STORAGE_KEY_API) || '';
};

export const setApiUrl = (url: string) => {
  localStorage.setItem(STORAGE_KEY_API, url);
};

export const getImageKitPublicKey = (): string => {
  return localStorage.getItem(STORAGE_KEY_IK_PUBLIC) || '';
};

export const setImageKitPublicKey = (key: string) => {
  localStorage.setItem(STORAGE_KEY_IK_PUBLIC, key);
};

// Generic fetch wrapper
async function apiRequest<T>(action: string, method: 'GET' | 'POST', body?: any): Promise<ApiResponse<T>> {
  const baseUrl = getApiUrl();
  
  if (!baseUrl) {
    return { 
        status: 'error', 
        message: 'API URL not configured. Please go to Settings to connect your Google Sheet.' 
    };
  }

  // Real API Call
  let url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}action=${action}`;
  
  const options: RequestInit = {
    method: 'POST', // GAS Web Apps often use POST for payload handling easily
  };

  if (method === 'GET') {
     if (body) {
         const params = new URLSearchParams(body).toString();
         url += `&${params}`;
     }
     options.method = 'GET';
  } else {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, options);
    const json = await res.json();
    return json;
  } catch (error) {
    console.error("API Error", error);
    return { status: 'error', message: 'Network error. Check your API URL or internet connection.' };
  }
}

export const cms = {
  getAllPosts: () => apiRequest<Post[]>('getAllPosts', 'GET'),
  createPost: (post: Post) => apiRequest('createPost', 'POST', post),
  updatePost: (post: Post) => apiRequest('updatePost', 'POST', post),
  deletePost: (slug: string) => apiRequest('deletePost', 'POST', { slug }),
  authImageKit: () => apiRequest<{token: string, expire: number, signature: string}>('authImageKit', 'GET'),
  logMedia: (data: { file_name: string, file_url: string }) => apiRequest('logMedia', 'POST', data),
};