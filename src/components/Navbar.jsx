import React from 'react';
import { ShieldCheck, PlusCircle, Search, SlidersHorizontal, Settings, Sparkles } from 'lucide-react';

export default function Navbar({ currentView, setCurrentView, onOpenSettings, hasApiKey, complaintsCount }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-slate-950/85 backdrop-blur-xl shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-1 sm:gap-4">
          
          {/* Logo & Brand */}
          <div 
            onClick={() => setCurrentView('track')}
            className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer group flex-shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-teal-500 via-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-teal-500/20 group-hover:scale-105 group-hover:shadow-teal-500/40 transition-all duration-200 flex-shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-teal-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                  CivicResolve
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  Gov Command
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Report. Track. Resolve.</p>
            </div>
          </div>

          {/* Navigation Tabs - Order preserved for test selectors: 1) Report, 2) Track, 3) Admin */}
          <nav className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            <button
              onClick={() => setCurrentView('report')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                currentView === 'report'
                  ? 'bg-slate-900 text-teal-300 border border-teal-500/40 shadow-sm shadow-teal-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400" />
              <span>Report an Issue</span>
            </button>

            <button
              onClick={() => setCurrentView('track')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                currentView === 'track'
                  ? 'bg-slate-900 text-teal-300 border border-teal-500/40 shadow-sm shadow-teal-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
              <span>Track Requests</span>
              {complaintsCount > 0 && (
                <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold ml-1 ${
                  currentView === 'track' 
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' 
                    : 'bg-slate-800 text-slate-400 border border-white/[0.06]'
                }`}>
                  {complaintsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentView('admin')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                currentView === 'admin'
                  ? 'bg-slate-900 text-teal-300 border border-teal-500/40 shadow-sm shadow-teal-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
              <span>Operations (Admin)</span>
              <span className="hidden xl:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 ml-1">
                PIN: admin123
              </span>
            </button>
          </nav>

          {/* Right Action: AI Status Badge & Settings Gear */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
            {hasApiKey ? (
              <div 
                onClick={onOpenSettings}
                title="Google Gemini AI is active"
                className="hidden lg:flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 cursor-pointer hover:bg-emerald-900/60 transition-colors shadow-sm shadow-emerald-500/10"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span>Gemini Active</span>
              </div>
            ) : (
              <div 
                onClick={onOpenSettings}
                title="Click to configure Google Gemini API Key"
                className="hidden lg:flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-500/40 cursor-pointer hover:bg-amber-900/60 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>Mock AI Mode</span>
              </div>
            )}

            <button
              onClick={onOpenSettings}
              title="API Key & Settings"
              className="p-2 rounded-xl text-slate-400 hover:text-teal-300 hover:bg-slate-900 transition-colors border border-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
