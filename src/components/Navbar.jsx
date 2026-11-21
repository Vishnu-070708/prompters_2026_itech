import React from 'react';
import { ShieldCheck, PlusCircle, Search, SlidersHorizontal, Settings, Sparkles } from 'lucide-react';

export default function Navbar({ currentView, setCurrentView, onOpenSettings, hasApiKey, complaintsCount }) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-1 sm:gap-4">
          
          {/* Logo & Brand */}
          <div 
            onClick={() => setCurrentView('track')}
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group flex-shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-sky-700 via-indigo-700 to-sky-900 bg-clip-text text-transparent">
                  CivicResolve
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                  AI Gov
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Report. Track. Resolve.</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            <button
              onClick={() => setCurrentView('report')}
              className={`flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                currentView === 'report'
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Report<span className="hidden md:inline"> Issue</span></span>
            </button>

            <button
              onClick={() => setCurrentView('track')}
              className={`flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                currentView === 'track'
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Track<span className="hidden md:inline"> Issues</span></span>
              {complaintsCount > 0 && (
                <span className={`text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full font-bold ml-0.5 ${
                  currentView === 'track' ? 'bg-sky-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {complaintsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentView('admin')}
              className={`flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                currentView === 'admin'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Admin</span>
              <span className="hidden xl:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 ml-1">
                PIN: admin123
              </span>
            </button>
          </nav>

          {/* Right Action: AI Status & Settings */}
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            {hasApiKey ? (
              <div 
                onClick={onOpenSettings}
                title="Google Gemini AI is active"
                className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer hover:bg-emerald-100 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Gemini Active</span>
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
              className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors border border-slate-200"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
