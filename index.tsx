import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Layout, Settings, Code as CodeIcon, PlusCircle, 
  AlertTriangle, CloudOff, RefreshCw, CheckCircle, 
  XCircle, Loader, Save, ArrowLeft, Image as ImageIcon, 
  Upload, Edit2, Trash2, ExternalLink, Copy, Check
} from 'lucide-react';

// --- TYPES ---
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

// --- CONSTANTS ---
const STORAGE_KEY_API = 'cms_api_url';
const STORAGE_KEY_IK_PUBLIC = 'cms_ik_public_key';

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * SERVERLESS HEADLESS CMS - BACKEND SCRIPT
 * Version: 1.0.1
 */

const SHEET_NAME = 'LIVE WEBSITE';
const CONFIG_SHEET = 'CONFIG';
const MEDIA_SHEET = 'MEDIA';

function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const action = e.parameter.action;
    if (action === 'getAllPosts') return getAllPosts();
    if (action === 'getPostBySlug') return getPostBySlug(e.parameter.slug);
    if (action === 'authImageKit') return authImageKit();
    if (action === 'getSystemStatus') return getSystemStatus();
    return response({ status: 'error', message: 'Invalid Action: ' + action });
  } catch (err) {
    return response({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const action = e.parameter.action;
    let data = JSON.parse(e.postData.contents);
    if (action === 'createPost') return createPost(data);
    if (action === 'updatePost') return updatePost(data);
    if (action === 'deletePost') return deletePost(data);
    if (action === 'logMedia') return logMedia(data);
    return response({ status: 'error', message: 'Invalid Action: ' + action });
  } catch (err) {
    return response({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getConfig(key) {
  const props = PropertiesService.getScriptProperties();
  let val = props.getProperty(key);
  if (val) return val;
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG_SHEET);
    if (!sheet) return null;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === key) return String(data[i][1]).trim();
    }
  } catch (e) {}
  return null;
}

function getSystemStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return response({
    status: 'success',
    data: {
      sheets: {
        website: !!ss.getSheetByName(SHEET_NAME),
        config: !!ss.getSheetByName(CONFIG_SHEET),
        media: !!ss.getSheetByName(MEDIA_SHEET)
      },
      config: { imageKitKey: !!getConfig('IMAGEKIT_PRIVATE_KEY') },
      version: '1.0.1'
    }
  });
}

function getAllPosts() {
  const sheet = getSheet(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const posts = data.slice(1).map(row => ({
    title: row[0], label: row[1], image: row[2], content: row[3],
    slug: row[4], description: row[5], status: row[6], date: row[7], type: row[8]
  }));
  return response({ status: 'success', data: posts });
}

function createPost(data) {
  const sheet = getSheet(SHEET_NAME);
  sheet.appendRow([data.title, data.label, data.image, data.content, data.slug, data.description, data.status, data.date, data.type]);
  return response({ status: 'success', message: 'Post created' });
}

function updatePost(data) {
  const sheet = getSheet(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][4] === data.slug || (data.oldSlug && rows[i][4] === data.oldSlug)) {
      rowIndex = i + 1; break;
    }
  }
  if (rowIndex === -1) return response({ status: 'error', message: 'Post not found' });
  sheet.getRange(rowIndex, 1, 1, 9).setValues([[data.title, data.label, data.image, data.content, data.slug, data.description, data.status, data.date, data.type]]);
  return response({ status: 'success', message: 'Post updated' });
}

function deletePost(data) {
  const sheet = getSheet(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][4] === data.slug) { rowIndex = i + 1; break; }
  }
  if (rowIndex === -1) return response({ status: 'error', message: 'Post not found' });
  sheet.deleteRow(rowIndex);
  return response({ status: 'success', message: 'Post deleted' });
}

function authImageKit() {
  const privateKey = getConfig('IMAGEKIT_PRIVATE_KEY');
  if (!privateKey) return response({ status: 'error', message: 'Private key missing' });
  const token = Utilities.getUuid();
  const expire = Math.floor(Date.now() / 1000) + 2400;
  const signature = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_1, token + expire, privateKey)
    .reduce((str,chr) => str + (chr < 0 ? chr + 256 : chr).toString(16).padStart(2, '0'), '');
  return response({ status: 'success', data: { token, expire, signature } });
}

function logMedia(data) {
  const sheet = getSheet(MEDIA_SHEET);
  sheet.appendRow([data.file_name, data.file_url, new Date().toISOString()]);
  return response({ status: 'success' });
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(name);
  if (!s) throw new Error('Sheet ' + name + ' not found. Run setup().');
  return s;
}

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(CONFIG_SHEET)) {
    const s = ss.insertSheet(CONFIG_SHEET);
    s.appendRow(['Key', 'Value']);
    s.appendRow(['IMAGEKIT_PRIVATE_KEY', '']);
  }
  if (!ss.getSheetByName(MEDIA_SHEET)) {
    const s = ss.insertSheet(MEDIA_SHEET);
    s.appendRow(['file_name', 'file_url', 'uploaded_at']);
  }
  if (!ss.getSheetByName(SHEET_NAME)) {
     const s = ss.insertSheet(SHEET_NAME);
     s.appendRow(['Judul', 'Label', 'Gambar', 'Body', 'Slug', 'Meta Deskripsi', 'Status', 'Tgl', 'Type']);
  }
}`;

// --- SERVICES ---
export const getApiUrl = (): string => localStorage.getItem(STORAGE_KEY_API) || '';
export const setApiUrl = (url: string) => localStorage.setItem(STORAGE_KEY_API, url);
export const getImageKitPublicKey = (): string => localStorage.getItem(STORAGE_KEY_IK_PUBLIC) || '';
export const setImageKitPublicKey = (key: string) => localStorage.setItem(STORAGE_KEY_IK_PUBLIC, key);

async function apiRequest<T>(action: string, method: 'GET' | 'POST', body?: any): Promise<ApiResponse<T>> {
  const baseUrl = getApiUrl();
  if (!baseUrl) return { status: 'error', message: 'API URL not configured.' };
  let url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}action=${action}`;
  const options: RequestInit = { method: 'POST' };
  if (method === 'GET') {
     if (body) url += `&${new URLSearchParams(body).toString()}`;
     options.method = 'GET';
  } else {
    options.body = JSON.stringify(body);
  }
  try {
    const res = await fetch(url, options);
    return await res.json();
  } catch (error) {
    return { status: 'error', message: 'Network error.' };
  }
}

export const cms = {
  getAllPosts: () => apiRequest<Post[]>('getAllPosts', 'GET'),
  createPost: (post: Post) => apiRequest('createPost', 'POST', post),
  updatePost: (post: Post) => apiRequest('updatePost', 'POST', post),
  deletePost: (slug: string) => apiRequest('deletePost', 'POST', { slug }),
  authImageKit: () => apiRequest<{token: string, expire: number, signature: string}>('authImageKit', 'GET'),
  logMedia: (data: { file_name: string, file_url: string }) => apiRequest('logMedia', 'POST', data),
  checkConnection: () => apiRequest<SystemStatus>('getSystemStatus', 'GET'),
};

// --- COMPONENTS ---

const Dashboard: React.FC<{ posts: Post[], onEdit: (p: Post) => void, onDelete: (s: string) => void, loading: boolean }> = ({ posts, onEdit, onDelete, loading }) => {
  if (loading) return <div className="flex justify-center py-20"><Loader className="animate-spin text-blue-600" size={40} /></div>;
  if (posts.length === 0) return <div className="text-center py-20 bg-white rounded-lg border">No posts found.</div>;
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden border">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title / Slug</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {posts.map(post => (
            <tr key={post.slug} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="flex items-center">
                  {post.image && <img className="h-8 w-8 rounded object-cover mr-3" src={post.image} />}
                  <div>
                    <div className="text-sm font-medium text-gray-900 line-clamp-1">{post.title}</div>
                    <div className="text-xs text-gray-500 font-mono">{post.slug}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${post.status === 'Published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {post.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button onClick={() => onEdit(post)} className="text-blue-600 mr-3"><Edit2 size={16}/></button>
                <button onClick={() => onDelete(post.slug)} className="text-red-600"><Trash2 size={16}/></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Editor: React.FC<{ initialData?: Post | null, onSave: (p: Post) => void, onCancel: () => void, isSaving: boolean }> = ({ initialData, onSave, onCancel, isSaving }) => {
  const [form, setForm] = useState<Post>(initialData || { title: '', label: '', image: '', content: '', slug: '', description: '', status: 'Draft', date: new Date().toISOString().split('T')[0], type: 'Post' });
  const [uploading, setUploading] = useState(false);
  const handleImage = async (e: any) => {
    const file = e.target.files[0]; if (!file) return;
    const pubKey = getImageKitPublicKey(); if (!pubKey) return alert("Public key required.");
    setUploading(true);
    try {
      const auth = await cms.authImageKit(); if (auth.status !== 'success' || !auth.data) throw new Error(auth.message);
      const fd = new FormData();
      fd.append('file', file); fd.append('fileName', file.name); fd.append('publicKey', pubKey);
      fd.append('signature', auth.data.signature); fd.append('expire', auth.data.expire.toString());
      fd.append('token', auth.data.token); fd.append('useUniqueFileName', 'true');
      const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body: fd });
      const data = await res.json(); if (!res.ok) throw new Error(data.message);
      setForm(prev => ({ ...prev, image: data.url }));
      await cms.logMedia({ file_name: file.name, file_url: data.url });
    } catch (err: any) { alert(err.message); } finally { setUploading(false); }
  };
  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="flex justify-between p-6 border-b">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="text-gray-500"><ArrowLeft/></button>
          <h2 className="text-xl font-bold">{initialData ? 'Edit' : 'New'} Post</h2>
        </div>
        <button onClick={() => onSave(form)} disabled={isSaving} className="bg-blue-600 text-white px-4 py-2 rounded flex gap-2 items-center disabled:opacity-50">
          <Save size={18}/> {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <input type="text" placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-2 border rounded" />
          <input type="text" placeholder="Slug" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="w-full p-2 border rounded font-mono" />
          <textarea rows={10} placeholder="Content" value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="w-full p-2 border rounded font-mono" />
        </div>
        <div className="space-y-4">
          <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full p-2 border rounded">
            <option>Draft</option><option>Published</option>
          </select>
          <div className="border p-4 rounded bg-gray-50">
            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Image</label>
            <input type="text" value={form.image} onChange={e => setForm({...form, image: e.target.value})} className="w-full p-2 border rounded text-xs mb-2" />
            <input type="file" onChange={handleImage} className="text-xs" />
            {uploading && <Loader className="animate-spin mt-2" size={16}/>}
            {form.image && <img src={form.image} className="mt-2 rounded w-full border" />}
          </div>
        </div>
      </div>
    </div>
  );
};

const ScriptViewer: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="font-bold mb-2">Instructions</h3>
        <ol className="list-decimal ml-5 text-sm space-y-1 text-gray-600">
          <li>Create Google Apps Script. Paste code. Save.</li>
          <li>Run <code>setup</code> function once.</li>
          <li>Add ImageKit Key to <b>CONFIG</b> sheet cell B2.</li>
          <li>Deploy as Web App (Anyone access).</li>
        </ol>
      </div>
      <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs relative max-h-96 overflow-auto">
        <button onClick={copy} className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded">{copied ? 'Copied' : 'Copy'}</button>
        <pre>{GOOGLE_APPS_SCRIPT_CODE}</pre>
      </div>
    </div>
  );
};

// --- MAIN APP ---
const App = () => {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [apiUrl, setApiUrlState] = useState(getApiUrl());
  const [tempApiUrl, setTempApiUrl] = useState(getApiUrl());
  const [tempIkKey, setTempIkKey] = useState(getImageKitPublicKey());
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => { if (view === 'dashboard' && apiUrl) fetchPosts(); }, [view, apiUrl]);
  
  const fetchPosts = async () => { setLoading(true); const res = await cms.getAllPosts(); if (res.status === 'success') setPosts(res.data || []); setLoading(false); };
  const handleSave = async (p: Post) => {
    setLoading(true);
    const res = editingPost ? await cms.updatePost({...p, oldSlug: editingPost.slug} as any) : await cms.createPost(p);
    if (res.status === 'success') { setView('dashboard'); fetchPosts(); }
    setLoading(false);
  };
  const handleDelete = async (s: string) => { if (!confirm('Delete?')) return; await cms.deletePost(s); fetchPosts(); };
  const saveSettings = () => { setApiUrl(tempApiUrl); setApiUrlState(tempApiUrl); setImageKitPublicKey(tempIkKey); alert('Saved!'); setView('dashboard'); };
  const testConn = async () => { setApiUrl(tempApiUrl); const res = await cms.checkConnection(); if (res.data) setStatus(res.data); };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-white border-r h-auto md:h-screen flex flex-col p-6">
        <h1 className="text-xl font-black mb-8">CMS PANEL</h1>
        <nav className="flex-1 space-y-2">
          <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-2 p-2 rounded ${view === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}><Layout size={18}/> Posts</button>
          <button onClick={() => { setEditingPost(null); setView('editor'); }} className={`w-full flex items-center gap-2 p-2 rounded ${view === 'editor' ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}><PlusCircle size={18}/> New</button>
          <button onClick={() => setView('script')} className={`w-full flex items-center gap-2 p-2 rounded ${view === 'script' ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}><CodeIcon size={18}/> Backend</button>
          <button onClick={() => setView('settings')} className={`w-full flex items-center gap-2 p-2 rounded ${view === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}><Settings size={18}/> Settings</button>
        </nav>
        <div className={`mt-auto p-3 rounded text-xs ${apiUrl ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {apiUrl ? 'Connected' : 'Setup Required'}
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {view === 'dashboard' && (apiUrl ? <Dashboard posts={posts} onEdit={p => { setEditingPost(p); setView('editor'); }} onDelete={handleDelete} loading={loading} /> : <div className="text-center py-20 bg-white rounded border">No API. Go to Settings.</div>)}
          {view === 'editor' && <Editor initialData={editingPost} onSave={handleSave} onCancel={() => setView('dashboard')} isSaving={loading} />}
          {view === 'script' && <ScriptViewer />}
          {view === 'settings' && (
            <div className="bg-white p-6 rounded border shadow-sm space-y-6">
              <h2 className="text-xl font-bold">Settings</h2>
              <div><label className="block text-sm font-bold mb-1">Web App URL</label><input type="text" value={tempApiUrl} onChange={e => setTempApiUrl(e.target.value)} className="w-full p-2 border rounded font-mono text-sm" /></div>
              <div><label className="block text-sm font-bold mb-1">ImageKit Pub Key</label><input type="text" value={tempIkKey} onChange={e => setTempIkKey(e.target.value)} className="w-full p-2 border rounded font-mono text-sm" /></div>
              <div className="flex gap-2">
                <button onClick={saveSettings} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
                <button onClick={testConn} className="bg-gray-800 text-white px-4 py-2 rounded">Test</button>
              </div>
              {status && <div className="p-4 bg-gray-50 rounded border text-xs space-y-1">
                <p>Website Sheet: {status.sheets.website ? '✅' : '❌'}</p>
                <p>Config Sheet: {status.sheets.config ? '✅' : '❌'}</p>
                <p>Media Sheet: {status.sheets.media ? '✅' : '❌'}</p>
                <p>Private Key: {status.config.imageKitKey ? '✅' : '❌'}</p>
              </div>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
