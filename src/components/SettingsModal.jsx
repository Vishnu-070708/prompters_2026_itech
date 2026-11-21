import React, { useState, useEffect } from 'react';
import { X, Key, Cpu, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, ExternalLink } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, apiKey, setApiKey, modelName, setModelName }) {
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [selectedModel, setSelectedModel] = useState(modelName || 'gemini-2.5-flash');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setInputKey(apiKey || '');
    setSelectedModel(modelName || 'gemini-2.5-flash');
  }, [apiKey, modelName, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    setApiKey(inputKey.trim());
    setModelName(selectedModel.trim());
    localStorage.setItem('civic_gemini_api_key', inputKey.trim());
    localStorage.setItem('civic_gemini_model', selectedModel.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleClear = () => {
    setInputKey('');
    setApiKey('');
    localStorage.removeItem('civic_gemini_api_key');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-sky-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-sky-200" />
            <h3 className="font-bold text-lg">AI & Gemini Engine Settings</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Key className="w-4 h-4 text-sky-600" />
                <span>Google Gemini API Key</span>
              </span>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-sky-600 hover:text-sky-800 flex items-center space-x-1 hover:underline"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-xs text-slate-800 shadow-sm"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Key is saved only in your local browser storage. If omitted, CivicResolve uses the keyword-based <strong>Mock AI mode</strong>.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-sky-600" />
              <span>Gemini Model</span>
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm text-slate-800 bg-white shadow-sm"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended, fastest)</option>
              <option value="gemini-1.5-flash">gemini-1.5-flash (Fast & lightweight)</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash (General purpose)</option>
            </select>
          </div>

          {/* Status Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            {inputKey ? (
              <div className="flex items-start space-x-2 text-emerald-700 text-xs">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>API Key configured. Multimodal analysis (photos + text) enabled with Google GenAI SDK.</span>
              </div>
            ) : (
              <div className="flex items-start space-x-2 text-amber-700 text-xs">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Running in <strong>Mock AI Mode</strong>. Triage uses rule-based keyword matching without external API requests.</span>
              </div>
            )}
          </div>

          {savedSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center justify-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings saved successfully!</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            {inputKey ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold hover:underline"
              >
                Clear Key
              </button>
            ) : <span />}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
