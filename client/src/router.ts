export interface Route {
  path: string;
  page: 'home' | 'personas' | 'threads' | 'thread-detail';
  params?: Record<string, string>;
}

export class Router {
  private listeners: Array<(route: Route) => void> = [];

  constructor() {
    window.addEventListener('popstate', () => {
      this.notifyListeners();
    });
  }

  subscribe(listener: (route: Route) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    const route = this.getCurrentRoute();
    this.listeners.forEach(listener => listener(route));
  }

  getCurrentRoute(): Route {
    const path = window.location.pathname;
    
    if (path === '/' || path === '') {
      return { path: '/', page: 'home' };
    }
    
    if (path === '/personas') {
      return { path: '/personas', page: 'personas' };
    }
    
    if (path === '/threads') {
      return { path: '/threads', page: 'threads' };
    }
    
    const threadMatch = path.match(/^\/threads\/(.+)$/);
    if (threadMatch) {
      return { 
        path, 
        page: 'thread-detail',
        params: { threadId: threadMatch[1] }
      };
    }
    
    // Default to home for unknown routes
    return { path: '/', page: 'home' };
  }

  navigate(page: 'home' | 'personas' | 'threads' | 'thread-detail', params?: Record<string, string>) {
    let path: string;
    
    switch (page) {
      case 'home':
        path = '/';
        break;
      case 'personas':
        path = '/personas';
        break;
      case 'threads':
        path = '/threads';
        break;
      case 'thread-detail':
        if (!params?.threadId) {
          throw new Error('threadId is required for thread-detail route');
        }
        path = `/threads/${params.threadId}`;
        break;
      default:
        path = '/';
    }

    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      this.notifyListeners();
    }
  }

  replace(page: 'home' | 'personas' | 'threads' | 'thread-detail', params?: Record<string, string>) {
    let path: string;
    
    switch (page) {
      case 'home':
        path = '/';
        break;
      case 'personas':
        path = '/personas';
        break;
      case 'threads':
        path = '/threads';
        break;
      case 'thread-detail':
        if (!params?.threadId) {
          throw new Error('threadId is required for thread-detail route');
        }
        path = `/threads/${params.threadId}`;
        break;
      default:
        path = '/';
    }

    window.history.replaceState({}, '', path);
    this.notifyListeners();
  }
}

export const router = new Router();