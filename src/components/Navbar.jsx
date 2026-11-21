import React from 'react';
import { ShieldCheck, PlusCircle, Search, SlidersHorizontal, Settings, Sparkles } from 'lucide-react';

export default function Navbar({ currentView, setCurrentView, onOpenSettings, hasApiKey, complaintsCount }) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div 
            onClick={() => setCurrentView('track')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-sky-700 via-indigo-700 to-sky-900 bg-clip-text text-transparent">
                  CivicResolve
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                  AI Gov
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">Report. Track. Resolve.</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setCurrentView('report')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                currentView === 'report'
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Issue</span>
            </button>

            <button
              onClick={() => setCurrentView('track')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                currentView === 'track'
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Track Issues</span>
              {complaintsCount > 0 && (
                <span className={`text-xs px-1.5 py-0.2 rounded-full font-bold ml-1 ${
                  currentView === 'track' ? 'bg-sky-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {complaintsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentView('admin')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                currentView === 'admin'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Admin</span>
              <span className="hidden md:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                PIN: admin123
              </span>
            </button>
          </nav>

          {/* Right Action: AI Status & Settings */}
          <div className="flex items-center space-x-2">
            {hasApiKey ? (
              <div 
                onClick={onOpenSettings}
                title="Google Gemini AI is active"
                className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer hover:bg-emerald-100 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Gemini 2.5 Active</span>
              </div>
            ) : (
              <div 
                onClick={onOpenSettings}
                title="Click to configure Google Gemini API Key"
                className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 cursor-pointer hover:bg-amber-100 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Mock AI Mode</span>
              </div>
            )}

            <button
              onClick={onOpenSettings}
              title="API Key & Settings"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors border border-slate-200"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
