import React, { useState, useEffect } from 'react';
import { Post } from '../types';
import { Save, ArrowLeft, Image as ImageIcon, Upload, Loader } from 'lucide-react';
import { cms, getImageKitPublicKey } from '../services/cms';

interface EditorProps {
  initialData?: Post | null;
  onSave: (post: Post) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const emptyPost: Post = {
  title: '',
  label: '',
  image: '',
  content: '',
  slug: '',
  description: '',
  status: 'Draft',
  date: new Date().toISOString().split('T')[0],
  type: 'Post'
};

const Editor: React.FC<EditorProps> = ({ initialData, onSave, onCancel, isSaving }) => {
  const [formData, setFormData] = useState<Post>(emptyPost);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
        // Auto-generate date for new posts
        setFormData(prev => ({...prev, date: new Date().toISOString().split('T')[0]}));
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const publicKey = getImageKitPublicKey();
    if (!publicKey) {
        alert("Please configure ImageKit Public Key in Settings first.");
        return;
    }

    setUploading(true);
    try {
        // 1. Get Auth Params from Backend
        const authRes = await cms.authImageKit();
        if (authRes.status !== 'success' || !authRes.data) {
            throw new Error(authRes.message || "Failed to authenticate with ImageKit");
        }
        
        const { token, expire, signature } = authRes.data;

        // 2. Upload to ImageKit
        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('fileName', file.name);
        uploadData.append('publicKey', publicKey);
        uploadData.append('signature', signature);
        uploadData.append('expire', expire.toString());
        uploadData.append('token', token);
        uploadData.append('useUniqueFileName', 'true');

        const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
            method: 'POST',
            body: uploadData,
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || "Image upload failed");
        }

        // 3. Update form with new URL
        setFormData(prev => ({ ...prev, image: data.url }));

        // 4. Log to MEDIA Sheet (Fire and forget, but we await to ensure it doesn't error silently)
        await cms.logMedia({
            file_name: file.name,
            file_url: data.url
        });

    } catch (err: any) {
        console.error(err);
        alert(`Upload Error: ${err.message}`);
    } finally {
        setUploading(false);
        // Reset file input
        e.target.value = '';
    }
  };

  const generateSlug = () => {
    const slug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setFormData(prev => ({ ...prev, slug }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-xl font-bold text-gray-800">
            {initialData ? 'Edit Post' : 'New Post'}
          </h2>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save size={18} />
          {isSaving ? 'Saving...' : 'Save Post'}
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Content Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title (Col A)</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              onBlur={() => !formData.slug && generateSlug()}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Enter post title"
            />
          </div>

          <div>
             <div className="flex justify-between">
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (Col E)</label>
                <button type="button" onClick={generateSlug} className="text-xs text-blue-600 hover:underline">Generate from Title</button>
             </div>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
              placeholder="url-slug-here"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content Body (Col D)</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
              placeholder="HTML or Markdown content..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description (Col F)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-6">
          {/* Sidebar Controls */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
             <h3 className="font-semibold text-gray-700">Publishing</h3>
             
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status (Col G)</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
                >
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                  <option value="Archived">Archived</option>
                </select>
             </div>

             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date (Col H)</label>
                <input
                  type="datetime-local" 
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
                />
             </div>
             
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type (Col I)</label>
                <input
                  type="text"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
                  placeholder="e.g. Post, Page"
                />
             </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
             <h3 className="font-semibold text-gray-700">Organization</h3>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label/Category (Col B)</label>
                <input
                  type="text"
                  name="label"
                  value={formData.label}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
                />
             </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
             <h3 className="font-semibold text-gray-700">Featured Image (Col C)</h3>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <div className="flex gap-2">
                    <input
                      type="text"
                      name="image"
                      value={formData.image}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-xs"
                      placeholder="https://..."
                    />
                    <label className={`flex items-center justify-center px-3 py-2 bg-white border border-gray-300 rounded cursor-pointer hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {uploading ? (
                        <Loader size={16} className="animate-spin text-blue-600" />
                      ) : (
                        <Upload size={16} className="text-gray-600" />
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                    </label>
                </div>
                {formData.image && (
                    <div className="mt-2 rounded overflow-hidden border border-gray-200">
                        <img src={formData.image} alt="Preview" className="w-full h-auto" />
                    </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;