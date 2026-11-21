import React, { useState, useEffect } from 'react';
import { X, Key, Cpu, Sparkles, CheckCircle2, AlertTriangle, ExternalLink, Activity } from 'lucide-react';
import { MODEL_FALLBACK_LIST } from '../services/geminiService';

export default function SettingsModal({ isOpen, onClose, apiKey, setApiKey, modelName, setModelName, lastAnsweredModel }) {
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [selectedModel, setSelectedModel] = useState(modelName || 'gemini-flash-lite-latest');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeAnsweringModel, setActiveAnsweringModel] = useState(lastAnsweredModel || '');

  useEffect(() => {
    setInputKey(apiKey || '');
    setSelectedModel(modelName || 'gemini-flash-lite-latest');
    try {
      const cached = localStorage.getItem('civic_last_answered_model') || lastAnsweredModel || 'None yet';
      setActiveAnsweringModel(cached);
    } catch {
      setActiveAnsweringModel(lastAnsweredModel || 'None yet');
    }
  }, [apiKey, modelName, isOpen, lastAnsweredModel]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    setApiKey(inputKey.trim());
    setModelName(selectedModel.trim());
    try {
      localStorage.setItem('civic_gemini_api_key', inputKey.trim());
      localStorage.setItem('civic_gemini_model', selectedModel.trim());
    } catch (err) {
      console.warn("Failed to persist settings in localStorage:", err);
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleClear = () => {
    setInputKey('');
    setApiKey('');
    try {
      localStorage.removeItem('civic_gemini_api_key');
    } catch (err) {
      console.warn("Failed to clear API key in localStorage:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-white/[0.1] overflow-hidden text-slate-100">

        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-teal-900/80 via-slate-900 to-indigo-950/80 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">AI Engine & Model Config</h3>
              <p className="text-[11px] text-slate-400">Google Gemini & Multi-Model Triage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-teal-400" />
                <span>Google Gemini API Key</span>
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-teal-400 hover:text-teal-300 flex items-center space-x-1 hover:underline lowercase tracking-normal font-normal"
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-teal-400 font-mono text-xs text-slate-100 placeholder-slate-600 shadow-inner"
            />
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Stored securely in local browser storage. If omitted, CivicResolve uses heuristic <strong>Mock AI mode</strong>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Preferred Primary Model</span>
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-teal-400 text-xs text-slate-100 shadow-inner"
            >
              <option value="gemini-flash-lite-latest">gemini-flash-lite-latest (Default - Ultra-fast)</option>
              <option value="gemini-3.8-flash">gemini-3.8-flash (Advanced reasoning)</option>
              <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Flash-Lite)</option>
              <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Stable Flash-Lite)</option>
            </select>
          </div>

          {/* Dynamic Active Model Inspector */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/[0.08] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-teal-400" />
                <span>Last Answered Model:</span>
              </span>
              <span className="font-mono font-bold text-teal-300 bg-teal-500/10 px-2.5 py-0.5 rounded border border-teal-500/30 text-[11px]">
                {activeAnsweringModel || 'None yet'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 leading-tight">
              <strong className="text-slate-300">Fallback sequence:</strong> {MODEL_FALLBACK_LIST.join(' ➔ ')}
            </div>
          </div>

          {/* Status Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/[0.08]">
            {inputKey ? (
              <div className="flex items-start space-x-2 text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>API Key configured with 15s timeout, 1x retry on 503, and multi-model fallback.</span>
              </div>
            ) : (
              <div className="flex items-start space-x-2 text-amber-300 text-xs">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Running in <strong>Mock AI Mode</strong>. Triage uses rule-based keyword matching without external API requests.</span>
              </div>
            )}
          </div>

          {savedSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center space-x-1.5">
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
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold hover:underline"
              >
                Clear Key
              </button>
            ) : <span />}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 shadow-md shadow-teal-500/20 transition-all hover:scale-[1.02]"
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
