import React, { useState } from 'react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../constants';
import { Copy, Check, ExternalLink } from 'lucide-react';

const ScriptViewer: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
          1. Deployment Instructions
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Open your Google Sheet.</li>
          <li>Go to <span className="font-mono bg-gray-100 px-1 rounded">Extensions</span> {'>'} <span className="font-mono bg-gray-100 px-1 rounded">Apps Script</span>.</li>
          <li>Delete any existing code in <span className="font-mono bg-gray-100 px-1 rounded">Code.gs</span> and paste the code below.</li>
          <li>Save the project.</li>
          <li>Run the <span className="font-mono bg-gray-100 px-1 rounded">setup()</span> function once to create the CONFIG and MEDIA tabs.</li>
          <li>
             Click <span className="font-bold text-blue-600">Deploy</span> {'>'} <span className="font-bold text-blue-600">New deployment</span>.
             <ul className="list-disc list-inside ml-6 mt-1 text-sm text-gray-600">
                <li>Select type: <span className="font-medium">Web app</span>.</li>
                <li>Description: <em>v1</em>.</li>
                <li>Execute as: <span className="font-medium">Me</span>.</li>
                <li>Who has access: <span className="font-medium">Anyone</span> (Crucial for API access).</li>
             </ul>
          </li>
          <li>Copy the resulting <span className="font-mono bg-gray-100 px-1 rounded">Web App URL</span>.</li>
          <li>Go to the <strong>Settings</strong> tab in this app and paste the URL.</li>
        </ol>
      </div>

      <div className="bg-gray-900 rounded-lg overflow-hidden shadow-lg flex flex-col h-[600px]">
        <div className="flex justify-between items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
          <span className="text-gray-300 font-mono text-sm">Code.gs</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded transition-colors"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
          <pre className="font-mono text-sm text-green-400 whitespace-pre">
            {GOOGLE_APPS_SCRIPT_CODE}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ScriptViewer;