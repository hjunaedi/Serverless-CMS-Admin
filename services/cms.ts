import { Post, ApiResponse } from '../types';
import { MOCK_POSTS } from '../constants';

const STORAGE_KEY_API = 'cms_api_url';

export const getApiUrl = (): string => {
  return localStorage.getItem(STORAGE_KEY_API) || '';
};

export const setApiUrl = (url: string) => {
  localStorage.setItem(STORAGE_KEY_API, url);
};

// Generic fetch wrapper
async function apiRequest<T>(action: string, method: 'GET' | 'POST', body?: any): Promise<ApiResponse<T>> {
  const baseUrl = getApiUrl();
  
  if (!baseUrl) {
    // Return mock data if no API URL configured
    return new Promise((resolve) => {
      setTimeout(() => {
        if (action === 'getAllPosts') {
          resolve({ status: 'success', data: MOCK_POSTS as unknown as T });
        } else if (action === 'createPost') {
           resolve({ status: 'success', message: 'Mock Created' });
        } else if (action === 'updatePost') {
           resolve({ status: 'success', message: 'Mock Updated' });
        } else if (action === 'deletePost') {
           resolve({ status: 'success', message: 'Mock Deleted' });
        } else {
           resolve({ status: 'error', message: 'Unknown mock action' });
        }
      }, 500);
    });
  }

  // Real API Call
  let url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}action=${action}`;
  
  const options: RequestInit = {
    method: 'POST', // GAS Web Apps often use POST for payload handling easily, or GET for simple retrieval
  };

  if (method === 'GET') {
     // For GAS, we can use GET for retrieval if data is in query params, 
     // but complex JSON usually goes better in POST body if we want to be uniform.
     // However, requirements specified doGet for getAllPosts.
     if (body) {
         // Append query params
         const params = new URLSearchParams(body).toString();
         url += `&${params}`;
     }
     options.method = 'GET';
  } else {
    // POST
    options.body = JSON.stringify(body);
    // GAS requires explicit text/plain or no content-type sometimes to avoid CORS preflight complex issues in simple apps,
    // but usually standard fetch works if deployed correctly.
    // 'no-cors' mode would hide response, so we need CORS allowed in GAS script (ContentService handles this).
  }

  try {
    const res = await fetch(url, options);
    const json = await res.json();
    return json;
  } catch (error) {
    console.error("API Error", error);
    return { status: 'error', message: 'Network error or invalid JSON response' };
  }
}

export const cms = {
  getAllPosts: () => apiRequest<Post[]>('getAllPosts', 'GET'),
  createPost: (post: Post) => apiRequest('createPost', 'POST', post),
  updatePost: (post: Post) => apiRequest('updatePost', 'POST', post),
  deletePost: (slug: string) => apiRequest('deletePost', 'POST', { slug }),
};