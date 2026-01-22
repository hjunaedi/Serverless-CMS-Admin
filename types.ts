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

export interface SystemStatus {
  sheets: {
    website: boolean;
    config: boolean;
    media: boolean;
  };
  config: {
    imageKitKey: boolean;
  };
  version: string;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export type ViewMode = 'dashboard' | 'editor' | 'script' | 'settings';