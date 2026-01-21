import React, { useState, useEffect } from 'react';
import { Post, ViewMode } from './types';
import { cms, getApiUrl, setApiUrl, getImageKitPublicKey, setImageKitPublicKey } from './services/cms';
import Dashboard from './components/Dashboard';
import Editor from './components/Editor';
import ScriptViewer from './components/ScriptViewer';
import { Layout, Settings, Code, PlusCircle, AlertTriangle, CloudOff } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  
  // Config States
  const [apiUrl, setApiUrlState] = useState(getApiUrl());
  const [tempApiUrl, setTempApiUrl] = useState(getApiUrl());
  const [tempIkKey, setTempIkKey] = useState(getImageKitPublicKey());
  
  const [notification, setNotification] = useState<{msg: string, type: 'success'|'error'} | null>(null);

  useEffect(() => {
    if (view === 'dashboard') {
      fetchPosts();
    }
  }, [view, apiUrl]);

  const showNotification = (msg: string, type: 'success'|'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchPosts = async () => {
    if (!apiUrl) {
       setPosts([]);
       return;
    }

    setLoading(true);
    const res = await cms.getAllPosts();
    if (res.status === 'success' && res.data) {
      setPosts(res.data);
    } else {
      showNotification(res.message || 'Failed to fetch posts', 'error');
      // If error suggests API issue, maybe we should not clear posts, but for now we keep it simple
    }
    setLoading(false);
  };

  const handleCreatePost = () => {
    if (!apiUrl) {
        showNotification("Please configure API URL in Settings first.", "error");
        return;
    }
    setEditingPost(null);
    setView('editor');
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setView('editor');
  };

  const handleSavePost = async (post: Post) => {
    setLoading(true);
    let res;
    if (editingPost) {
       res = await cms.updatePost({ ...post, oldSlug: editingPost.slug } as any);
    } else {
       res = await cms.createPost(post);
    }

    setLoading(false);
    if (res.status === 'success') {
      showNotification(res.message || 'Saved successfully', 'success');
      setView('dashboard');
    } else {
      showNotification(res.message || 'Error saving post', 'error');
    }
  };

  const handleDeletePost = async (slug: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    setLoading(true);
    const res = await cms.deletePost(slug);
    setLoading(false);
    
    if (res.status === 'success') {
       showNotification('Post deleted', 'success');
       fetchPosts();
    } else {
       showNotification(res.message || 'Error deleting', 'error');
    }
  };

  const handleSaveSettings = () => {
    setApiUrl(tempApiUrl);
    setApiUrlState(tempApiUrl);
    setImageKitPublicKey(tempIkKey);
    showNotification('Settings saved locally', 'success');
    setView('dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans text-gray-800">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col sticky top-0 md:h-screen">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
             C
           </div>
           <h1 className="text-xl font-bold tracking-tight">CMS Admin</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Layout size={18} />
            All Posts
          </button>
          
          <button
            onClick={handleCreatePost}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === 'editor' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <PlusCircle size={18} />
            New Post
          </button>

          <div className="pt-4 mt-4 border-t border-gray-100">
             <p className="px-4 text-xs font-semibold text-gray-400 uppercase mb-2">Configuration</p>
             <button
                onClick={() => setView('script')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === 'script' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
             >
                <Code size={18} />
                Backend Code
             </button>
             <button
                onClick={() => setView('settings')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
             >
                <Settings size={18} />
                Settings
             </button>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100">
           {!apiUrl ? (
             <div className="bg-red-50 text-red-800 text-xs p-3 rounded border border-red-100 flex gap-2 items-start">
               <CloudOff size={14} className="mt-0.5 shrink-0" />
               <p>Setup Required. Go to Settings.</p>
             </div>
           ) : (
             <div className="bg-green-50 text-green-800 text-xs p-3 rounded border border-green-100 flex gap-2 items-center">
               <div className="w-2 h-2 rounded-full bg-green-500"></div>
               <p>API Connected</p>
             </div>
           )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto h-screen relative">
        {/* Notification Toast */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded shadow-lg text-white text-sm font-medium animate-fade-in-down ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {notification.msg}
          </div>
        )}

        <div className="max-w-5xl mx-auto p-8">
           <header className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">
                {view === 'dashboard' && 'Dashboard'}
                {view === 'editor' && (editingPost ? 'Edit Post' : 'Create Post')}
                {view === 'script' && 'Backend Script Generator'}
                {view === 'settings' && 'Settings'}
              </h1>
              <p className="text-gray-500 mt-1">
                {view === 'dashboard' && 'Manage your content.'}
                {view === 'script' && 'Generate the Google Apps Script backend.'}
                {view === 'settings' && 'Configure connection to Google Sheets.'}
              </p>
           </header>

           {view === 'dashboard' && (
             !apiUrl ? (
               <div className="text-center py-20 bg-white rounded-lg shadow border border-gray-200">
                  <CloudOff size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">Not Connected</h3>
                  <p className="mt-2 text-gray-500 mb-6">Connect your Google Sheet backend to start managing content.</p>
                  <button onClick={() => setView('settings')} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                    Go to Settings
                  </button>
               </div>
             ) : (
               <Dashboard 
                 posts={posts} 
                 onEdit={handleEditPost} 
                 onDelete={handleDeletePost} 
                 loading={loading} 
               />
             )
           )}

           {view === 'editor' && (
             <Editor 
               initialData={editingPost} 
               onSave={handleSavePost} 
               onCancel={() => setView('dashboard')} 
               isSaving={loading}
             />
           )}

           {view === 'script' && <ScriptViewer />}

           {view === 'settings' && (
             <div className="bg-white p-6 rounded-lg shadow border border-gray-200 max-w-2xl space-y-6">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Google Apps Script</h3>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Web App URL</label>
                  <input 
                    type="text" 
                    value={tempApiUrl}
                    onChange={(e) => setTempApiUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                    placeholder="https://script.google.com/macros/s/..."
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Deploy the backend script and paste the URL here.
                  </p>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">ImageKit Integration</h3>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Public Key</label>
                  <input 
                    type="text" 
                    value={tempIkKey}
                    onChange={(e) => setTempIkKey(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                    placeholder="public_..."
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Required for image uploads.
                    <br/>
                    <span className="text-gray-400">Note: Private Key must be set in the Google Sheet (CONFIG tab).</span>
                  </p>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleSaveSettings}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                  >
                    Save Configuration
                  </button>
                </div>
             </div>
           )}
        </div>
      </main>
    </div>
  );
}