import React, { useState, useMemo } from 'react';
import { 
  Lock, 
  CheckCircle2, 
  Building2, 
  Sparkles, 
  Save, 
  Check, 
  Flame, 
  FileSpreadsheet, 
  Loader2, 
  Copy, 
  X, 
  ExternalLink, 
  Trash2, 
  RotateCcw
} from 'lucide-react';
import { generateDailyDispatchSummary } from '../services/geminiService';

const DEPARTMENTS = [
  "Public Works Department",
  "Municipal Sanitation",
  "Electricity Board",
  "Water Supply Board",
  "Police/Public Safety",
  "General Administration"
];

const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const STATUSES = ["Reported", "In Progress", "Resolved"];

export default function AdminView({ complaints, onUpdateComplaint, onDeleteComplaint, onResetDemoData, apiKey, modelName }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState('');
  
  // Per-complaint edits in progress
  const [notesDrafts, setNotesDrafts] = useState({});
  const [savedSuccessMap, setSavedSuccessMap] = useState({});
  const [filterDept, setFilterDept] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // AI Daily Dispatch Summary state
  const [isGeneratingDispatch, setIsGeneratingDispatch] = useState(false);
  const [dispatchSummary, setDispatchSummary] = useState(null);
  const [dispatchError, setDispatchError] = useState('');
  const [copiedDispatch, setCopiedDispatch] = useState(false);

  const openHighCriticalCount = useMemo(() => {
    return complaints.filter(c => c.status !== 'Resolved' && (c.priority === 'High' || c.priority === 'Critical')).length;
  }, [complaints]);

  const handleGenerateDispatch = async () => {
    setIsGeneratingDispatch(true);
    setDispatchError('');
    try {
      const summary = await generateDailyDispatchSummary({ complaints, apiKey, modelName });
      setDispatchSummary(summary);
    } catch (err) {
      console.error("Failed to generate dispatch summary:", err);
      setDispatchError("Failed to generate dispatch summary.");
    } finally {
      setIsGeneratingDispatch(false);
    }
  };

  const handleCopyDispatch = () => {
    if (!dispatchSummary) return;
    let text = `${dispatchSummary.summaryTitle}\n${dispatchSummary.overview}\n\n`;
    (dispatchSummary.departments || []).forEach(d => {
      text += `[${d.department}]\n- Action: ${d.actionPlan}\n- Target IDs: ${(d.complaintIds || []).join(', ')}\n- Field Crew: ${d.recommendedCrew || 'Rapid Response'}\n\n`;
    });
    navigator.clipboard.writeText(text);
    setCopiedDispatch(true);
    setTimeout(() => setCopiedDispatch(false), 2000);
  };

  // Verify PIN (admin123)
  const handleAuth = (e) => {
    e?.preventDefault();
    if (pinInput.trim() === 'admin123') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid Admin PIN. Use "admin123" for demo evaluation.');
    }
  };

  const handleQuickLogin = () => {
    setPinInput('admin123');
    setIsAuthenticated(true);
    setAuthError('');
  };

  // KPIs
  const stats = useMemo(() => {
    const total = complaints.length;
    const resolved = complaints.filter(c => c.status === "Resolved").length;
    const critical = complaints.filter(c => c.priority === "Critical" && c.status !== "Resolved").length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Dept counts
    const deptCounts = {};
    DEPARTMENTS.forEach(d => { deptCounts[d] = 0; });
    complaints.forEach(c => {
      if (deptCounts[c.recommendedDepartment] !== undefined) {
        deptCounts[c.recommendedDepartment]++;
      } else {
        deptCounts[c.recommendedDepartment] = 1;
      }
    });

    return { total, resolved, critical, resolutionRate, deptCounts };
  }, [complaints]);

  // Handle Note Save
  const handleSaveNotes = (id, fallbackVal = '') => {
    const note = notesDrafts[id] !== undefined ? notesDrafts[id] : fallbackVal;
    onUpdateComplaint(id, { adminNotes: note });
    setSavedSuccessMap(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setSavedSuccessMap(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const handleDeleteComplaint = (item) => {
    if (!window.confirm(`Delete ${item.id} permanently? This cannot be undone.`)) return;
    if (!onDeleteComplaint(item.id)) {
      window.alert('Could not delete this complaint because browser storage is unavailable.');
    }
  };

  const handleResetDemoData = () => {
    if (!window.confirm('Reset all complaints to the six seeded demo records? All locally added reports, edits, and upvotes will be removed.')) return;
    if (!onResetDemoData()) {
      window.alert('Could not reset demo data because browser storage is unavailable.');
    }
  };

  // Filter complaints
  const filtered = useMemo(() => {
    return complaints.filter(c => {
      const matchDept = filterDept === 'All' || c.recommendedDepartment === filterDept;
      const matchStatus = filterStatus === 'All' || c.status === filterStatus;
      return matchDept && matchStatus;
    });
  }, [complaints, filterDept, filterStatus]);

  // PIN GATE SCREEN
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 animate-fade-in text-slate-100">
        <div className="bg-slate-900/90 rounded-2xl shadow-2xl border border-white/[0.08] overflow-hidden text-center p-8 backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto mb-4 shadow-glow-teal">
            <Lock className="w-8 h-8 text-teal-300" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">Operations Center</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            Authorized administrative dashboard for complaint disposition and municipal crew dispatch.
          </p>

          {/* Quick Demo Credentials Box for Hackathon Judges */}
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-300 uppercase tracking-wide mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>PromptWars Judge Access</span>
            </div>
            <p className="text-xs text-amber-200">
              Demo evaluation PIN is pre-set to: <strong className="font-mono text-amber-100 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/40">admin123</strong>
            </p>
            <button
              type="button"
              onClick={handleQuickLogin}
              className="mt-3 w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold transition-all shadow-sm cursor-pointer"
            >
              1-Click Instant Judge Login
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter PIN (admin123)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/[0.1] bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-teal-400 text-center font-mono text-lg tracking-widest text-slate-100 placeholder-slate-600 shadow-inner"
              />
            </div>

            {authError && (
              <p className="text-xs text-rose-400 font-semibold">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-extrabold text-sm shadow-glow-teal transition-all cursor-pointer"
            >
              Authorize & Enter Portal
            </button>
          </form>

        </div>
      </div>
    );
  }

  // AUTHENTICATED ADMIN DASHBOARD
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-7 animate-fade-in text-slate-100">
      
      {/* Header: Operations Center & Municipal Operations Command Center */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/10 text-teal-300 border border-teal-500/30">
              Operations Center
            </span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Authorized Control-Room Session</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight mt-1">
            Municipal Operations Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Control-room dispatch, triage review, workload distribution, and live administrative notes.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            data-testid="ai-daily-dispatch-btn"
            onClick={handleGenerateDispatch}
            disabled={isGeneratingDispatch}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs sm:text-sm shadow-glow-teal flex items-center space-x-2 transition-all hover:scale-[1.02] disabled:opacity-60 cursor-pointer"
          >
            {isGeneratingDispatch ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Synthesizing Dispatch...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>AI Daily Dispatch Summary</span>
                {openHighCriticalCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white ml-0.5 shadow-sm">
                    {openHighCriticalCount} Open
                  </span>
                )}
              </>
            )}
          </button>

          <button
            onClick={() => setIsAuthenticated(false)}
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl border border-white/[0.1] hover:bg-slate-900 text-xs font-bold text-slate-300 transition-colors"
          >
            Lock / Logout
          </button>
        </div>
      </div>

      {/* AI DAILY DISPATCH SUMMARY RESULT */}
      {dispatchSummary && (
        <div data-testid="dispatch-summary-card" className="bg-gradient-to-br from-indigo-950 via-slate-900 to-teal-950 text-white rounded-2xl shadow-2xl border border-teal-500/40 p-6 sm:p-7 animate-fade-in space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center text-slate-950 shadow-glow-teal font-bold">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-400/30">
                    Municipal Emergency Dispatch Directive
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    dispatchSummary.isMock ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  }`}>
                    {dispatchSummary.isMock ? 'Mock AI mode' : (dispatchSummary.modelUsed || 'Gemini Flash-Lite')}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Generated: {dispatchSummary.generatedAt}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">
                  {dispatchSummary.summaryTitle}
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleCopyDispatch}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center space-x-1.5 transition-colors border border-white/20"
              >
                {copiedDispatch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDispatch ? 'Copied' : 'Copy Plan'}</span>
              </button>
              <button
                type="button"
                onClick={() => setDispatchSummary(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors border border-white/20"
                title="Dismiss Dispatch Directive"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-white/10">
            {dispatchSummary.overview}
          </p>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300">
              Department Action Plans & Priority Deployments
            </h4>

            {dispatchSummary.departments && dispatchSummary.departments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dispatchSummary.departments.map((dept, idx) => (
                  <div key={idx} className="bg-slate-900/80 hover:bg-slate-900 rounded-xl p-4 border border-white/10 space-y-2.5 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-teal-400" />
                        <span className="font-bold text-sm text-white">{dept.department}</span>
                      </div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-400/30">
                        {dept.complaintIds?.length || 0} issues
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed">
                      {dept.actionPlan}
                    </p>

                    {dept.recommendedCrew && (
                      <div className="text-[11px] text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-400/20">
                        <strong className="text-amber-200">Field Crew:</strong> {dept.recommendedCrew}
                      </div>
                    )}

                    {dept.complaintIds && dept.complaintIds.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400">Target IDs:</span>
                        {dept.complaintIds.map(id => (
                          <span key={id} className="text-[10px] font-mono font-bold bg-slate-950 text-cyan-300 px-2 py-0.5 rounded border border-teal-500/30">
                            {id}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 p-4 bg-slate-950/60 rounded-xl">
                No departmental action required — no open High or Critical complaints.
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPI STATS ROW (Control-Room Tiles) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-white/[0.08] shadow-subtle-dark hover:-translate-y-0.5 transition-transform backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Docket</span>
            <FileSpreadsheet className="w-4 h-4 text-teal-400" />
          </div>
          <span className="text-3xl font-extrabold text-slate-100 mt-2 block">{stats.total}</span>
          <span className="text-xs text-teal-400 mt-1 block">Active civic records</span>
        </div>

        <div className="bg-slate-900/90 p-5 rounded-2xl border border-white/[0.08] shadow-subtle-dark hover:-translate-y-0.5 transition-transform backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Resolution Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-3xl font-extrabold text-emerald-400 mt-2 block">{stats.resolutionRate}%</span>
          <span className="text-xs text-slate-400 mt-1 block">{stats.resolved} of {stats.total} closed</span>
        </div>

        <div className="bg-slate-900/90 p-5 rounded-2xl border border-red-500/30 shadow-subtle-dark hover:-translate-y-0.5 transition-transform backdrop-blur-sm">
          <div className="flex items-center justify-between text-rose-300 text-xs font-semibold uppercase tracking-wider">
            <span>Critical Unresolved</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <span className="text-3xl font-extrabold text-rose-400 mt-2 block">{stats.critical}</span>
          <span className="text-xs text-rose-300 font-medium mt-1 block">Requires instant dispatch</span>
        </div>

        <div className="bg-slate-900/90 p-5 rounded-2xl border border-white/[0.08] shadow-subtle-dark hover:-translate-y-0.5 transition-transform backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Active Departments</span>
            <Building2 className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-3xl font-extrabold text-cyan-400 mt-2 block">
            {Object.values(stats.deptCounts).filter(c => c > 0).length}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">Of 6 municipal units deployed</span>
        </div>

      </div>

      {/* DEPARTMENT WORKLOAD BREAKDOWN */}
      <div className="bg-slate-900/90 p-6 rounded-2xl border border-white/[0.08] shadow-subtle-dark backdrop-blur-sm">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-teal-400" />
          <span>Departmental Workload Allocation</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(stats.deptCounts).map(([dept, count]) => (
            <div key={dept} className="p-3.5 rounded-xl bg-slate-950/80 border border-white/[0.06]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-300 truncate" title={dept}>{dept}</span>
                <span className="text-sm font-extrabold text-teal-300">{count}</span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400" 
                  style={{ width: `${stats.total ? Math.max(8, (count / stats.total) * 100) : 0}%` }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COMPLAINTS DISPATCH & MANAGEMENT LIST */}
      <div className="bg-slate-900/90 rounded-2xl border border-white/[0.08] shadow-subtle-dark overflow-hidden backdrop-blur-sm">
        
        {/* Table Filters Toolbar */}
        <div className="p-5 border-b border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-950/60">
          <div>
            <h3 className="font-extrabold text-slate-100 text-base">Municipal Action Docket</h3>
            <p className="text-xs text-slate-400">Edit status, reassign department, or attach official resolution notes.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-white/[0.1] text-xs bg-slate-950 text-slate-200 font-medium"
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-white/[0.1] text-xs bg-slate-950 text-slate-200 font-medium"
            >
              <option value="All">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Separated Destructive Action in Red */}
            <div className="pl-2 ml-1 border-l border-rose-500/30">
              <button
                type="button"
                onClick={handleResetDemoData}
                className="px-3 py-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Restore the six seeded demo complaints"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* List of items */}
        <div className="divide-y divide-white/[0.08]">
          {filtered.map((item) => (
            <div key={item.id} className="p-5 sm:p-6 space-y-4 hover:bg-slate-950/40 transition-colors">
              
              {/* Item Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <span className="font-mono font-extrabold text-sm text-cyan-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-teal-500/30">
                    {item.id}
                  </span>
                  <span className="font-bold text-slate-100 text-base">
                    {item.title}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400 font-medium">
                    {item.location}
                  </span>
                  
                  {((item.coordinates?.lat && item.coordinates?.lng) || (item.lat && item.lng)) && (
                    <a
                      href={`https://www.google.com/maps?q=${item.coordinates?.lat || item.lat},${item.coordinates?.lng || item.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`admin-maps-link-${item.id}`}
                      className="inline-flex items-center space-x-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline ml-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Open in Maps</span>
                    </a>
                  )}

                  {/* Destructive Delete Button Separated in Red */}
                  <button
                    type="button"
                    onClick={() => handleDeleteComplaint(item)}
                    className="inline-flex items-center space-x-1 text-xs font-bold px-2 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 transition-colors ml-1 cursor-pointer"
                    data-testid={`delete-complaint-${item.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Controls Row: Status, Priority, Department */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                
                {/* Status Toggle */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={item.status}
                    onChange={(e) => onUpdateComplaint(item.id, { status: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${
                      item.status === 'Resolved' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' :
                      item.status === 'In Progress' ? 'bg-sky-500/15 text-sky-300 border-sky-500/40' :
                      'bg-amber-500/15 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {STATUSES.map(s => <option key={s} value={s} className="bg-slate-900 text-slate-100">{s}</option>)}
                  </select>
                </div>

                {/* Priority Override */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Priority Level
                  </label>
                  <select
                    value={item.priority}
                    onChange={(e) => onUpdateComplaint(item.id, { priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold border border-white/[0.1] bg-slate-950 text-slate-200"
                  >
                    {PRIORITIES.map(p => <option key={p} value={p} className="bg-slate-900 text-slate-100">{p}</option>)}
                  </select>
                </div>

                {/* Department Reassign */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Assigned Department
                  </label>
                  <select
                    value={item.recommendedDepartment}
                    onChange={(e) => onUpdateComplaint(item.id, { recommendedDepartment: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold border border-white/[0.1] bg-slate-950 text-slate-200"
                  >
                    {DEPARTMENTS.map(d => <option key={d} value={d} className="bg-slate-900 text-slate-100">{d}</option>)}
                  </select>
                </div>

              </div>

              {/* Official Admin Note Box */}
              <div className="pt-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Official Municipal Dispatch / Resolution Note (Publicly Visible on Track View)
                </label>
                <div className="flex gap-2">
                  <input
                    data-testid="admin-note-input"
                    type="text"
                    placeholder="e.g. Crew assigned to patch road; expected completion by 6 PM today."
                    value={notesDrafts[item.id] !== undefined ? notesDrafts[item.id] : (item.adminNotes || '')}
                    onChange={(e) => setNotesDrafts({ ...notesDrafts, [item.id]: e.target.value })}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-white/[0.1] bg-slate-950 text-xs text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-teal-400 focus:outline-none"
                  />
                  <button
                    data-testid="admin-save-note-btn"
                    onClick={(e) => {
                      const input = e.currentTarget.parentElement?.querySelector('input');
                      handleSaveNotes(item.id, input ? input.value : item.adminNotes);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-all shadow-glow-teal cursor-pointer"
                  >
                    {savedSuccessMap[item.id] ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-slate-950" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5 text-slate-950" />
                        <span>Save Note</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
