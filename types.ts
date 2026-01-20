export interface Post {
  title: string;
  label: string;
  image: string;
  content: string;
  slug: string;
  description: string;
  status: string;
  date: string;
  type: string;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export type ViewMode = 'dashboard' | 'editor' | 'script' | 'settings';