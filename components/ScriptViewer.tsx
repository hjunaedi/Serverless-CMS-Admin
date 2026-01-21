import React, { useState } from 'react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../constants';
import { Copy, Check, AlertTriangle, RefreshCw } from 'lucide-react';

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
        
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-2">
                <RefreshCw size={16} />
                Updated Script Available
            </h3>
            <p className="text-sm text-blue-800">
                The backend code has been updated to connect your <strong>CONFIG</strong> and <strong>MEDIA</strong> sheets.
                Please redeploy following the instructions below.
            </p>
        </div>

        <ol className="list-decimal list-inside space-y-3 text-gray-700">
          <li>Open your Google Sheet.</li>
          <li>Go to <span className="font-mono bg-gray-100 px-1 rounded">Extensions</span> {'>'} <span className="font-mono bg-gray-100 px-1 rounded">Apps Script</span>.</li>
          <li>Delete any existing code in <span className="font-mono bg-gray-100 px-1 rounded">Code.gs</span> and paste the code below.</li>
          <li>Save the project (<span className="font-mono bg-gray-100 px-1 rounded">Ctrl+S</span>).</li>
          <li className="bg-green-50 p-3 rounded border border-green-100">
             <strong>Setup Sheets:</strong> Select <span className="font-mono bg-white px-1 rounded">setup</span> from the function dropdown (top bar) and click <strong>Run</strong>.
             <br/>
             <span className="text-xs text-gray-500 mt-1 block">
               This will create the <strong>CONFIG</strong> and <strong>MEDIA</strong> tabs if they don't exist.
             </span>
          </li>
          <li className="bg-yellow-50 p-3 rounded border border-yellow-100">
             <strong>Add ImageKit Key:</strong>
             <br/>
             Go to the newly created <strong>CONFIG</strong> tab in your Sheet.
             <br/>
             Paste your ImageKit Private Key in cell <strong>B2</strong> (next to IMAGEKIT_PRIVATE_KEY).
          </li>
          <li>
             <strong>Deploy:</strong>
             <ul className="list-disc list-inside ml-6 mt-1 text-sm text-gray-600 space-y-1">
                <li>Click <span className="font-bold text-blue-600">Deploy</span> {'>'} <span className="font-bold text-blue-600">Manage deployments</span>.</li>
                <li>Click the <span className="font-bold">Edit (Pencil)</span> icon on the active deployment.</li>
                <li className="font-bold text-red-600 bg-red-50 inline-block px-1 rounded">Version: Select "New version" (Essential!)</li>
                <li>Click <span className="font-bold text-blue-600">Deploy</span>.</li>
             </ul>
          </li>
          <li>Copy the Web App URL and paste it in the <strong>Settings</strong> tab here.</li>
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