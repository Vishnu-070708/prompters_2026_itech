import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  Building2, 
  Sparkles, 
  CheckCircle2, 
  CircleDot, 
  AlertTriangle, 
  Eye, 
  MessageSquare,
  FileCheck2
} from 'lucide-react';

const STATUS_STAGES = ["Reported", "In Progress", "Resolved"];

const PRIORITY_STYLES = {
  Critical: "bg-rose-100 text-rose-800 border-rose-300 font-extrabold",
  High: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-300 font-semibold",
  Low: "bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold"
};

const CATEGORIES = [
  "All Categories",
  "Roads & Infrastructure",
  "Sanitation & Waste",
  "Street Lighting",
  "Water Supply & Drainage",
  "Public Safety",
  "Other"
];

export default function TrackView({ complaints, onSelectReport }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');

  // Stats computation
  const stats = useMemo(() => {
    const total = complaints.length;
    const reported = complaints.filter(c => c.status === "Reported").length;
    const inProgress = complaints.filter(c => c.status === "In Progress").length;
    const resolved = complaints.filter(c => c.status === "Resolved").length;
    return { total, reported, inProgress, resolved };
  }, [complaints]);

  // Filtering
  const filteredComplaints = useMemo(() => {
    return complaints.filter(item => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        item.id.toLowerCase().includes(query) ||
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query) ||
        item.recommendedDepartment.toLowerCase().includes(query);

      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
      const matchesPriority = priorityFilter === 'All' || item.priority === priorityFilter;
      const matchesCategory = categoryFilter === 'All Categories' || item.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });
  }, [complaints, searchQuery, statusFilter, priorityFilter, categoryFilter]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "Recently";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Public Civic Tracker
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Real-time transparency on complaints, municipal department actions, and resolution workflows.
          </p>
        </div>
        <button
          onClick={onSelectReport}
          className="self-start md:self-auto px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-md transition-colors"
        >
          + Report New Issue
        </button>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => setStatusFilter('All')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'All' ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-400' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Filed</span>
          <span className="text-3xl font-extrabold text-slate-900 mt-1 block">{stats.total}</span>
          <span className="text-xs text-sky-700 font-medium mt-1 inline-block">All municipal reports</span>
        </div>

        <div 
          onClick={() => setStatusFilter('Reported')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Reported' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">Reported</span>
          <span className="text-3xl font-extrabold text-amber-600 mt-1 block">{stats.reported}</span>
          <span className="text-xs text-slate-500 font-medium mt-1 inline-block">Awaiting officer dispatch</span>
        </div>

        <div 
          onClick={() => setStatusFilter('In Progress')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'In Progress' ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-400' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-bold text-sky-700 uppercase tracking-wider block">In Progress</span>
          <span className="text-3xl font-extrabold text-sky-600 mt-1 block">{stats.inProgress}</span>
          <span className="text-xs text-slate-500 font-medium mt-1 inline-block">Teams deployed on site</span>
        </div>

        <div 
          onClick={() => setStatusFilter('Resolved')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Resolved' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Resolved</span>
          <span className="text-3xl font-extrabold text-emerald-600 mt-1 block">{stats.resolved}</span>
          <span className="text-xs text-slate-500 font-medium mt-1 inline-block">Fixed & verified</span>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by Tracking ID (e.g. CR-1042), keyword, or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-44">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm bg-white font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Reported">Reported</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="w-full md:w-40">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm bg-white font-medium"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-56">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm bg-white font-medium"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* COMPLAINTS LIST */}
      {filteredComplaints.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No issues found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            No complaints match your current search and filter criteria. Try clearing some filters.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('All'); setPriorityFilter('All'); setCategoryFilter('All Categories'); }}
            className="mt-4 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredComplaints.map((item) => {
            const currentStageIndex = STATUS_STAGES.indexOf(item.status);

            return (
              <div 
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-5 sm:p-6 space-y-4">
                  
                  {/* Card Header: Tracking ID + Badges + Date */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-extrabold text-base text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                        {item.id}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {item.category}
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-md border ${PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.Medium}`}>
                        {item.priority} Priority
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex flex-col lg:flex-row gap-5">
                    
                    {/* Optional Image */}
                    {item.imageUrl && (
                      <div className="w-full lg:w-48 h-36 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                        <img 
                          src={item.imageUrl} 
                          alt={item.title} 
                          className="w-full h-full object-cover hover:scale-105 transition-transform" 
                        />
                      </div>
                    )}

                    {/* Text Details */}
                    <div className="flex-1 space-y-2.5">
                      <h3 className="text-lg font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h3>
                      
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-slate-600">
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span className="font-medium text-slate-800">{item.location}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="font-medium text-slate-800">{item.recommendedDepartment}</span>
                        </span>
                      </div>

                      {/* AI Reasoning Pill */}
                      {item.aiReasoning && (
                        <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 text-xs text-slate-700 flex items-start space-x-2">
                          <Sparkles className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-sky-900">AI Assessment: </span>
                            <span>{item.aiReasoning}</span>
                          </div>
                        </div>
                      )}

                      {/* Admin Notes if any */}
                      {item.adminNotes && (
                        <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start space-x-2">
                          <MessageSquare className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-amber-950">Official Municipal Action: </span>
                            <span>{item.adminNotes}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3-STEP PROGRESS TRACKER */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Resolution Progress
                    </div>
                    <div className="flex items-center justify-between relative max-w-xl mx-auto">
                      
                      {/* Background Bar */}
                      <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0"></div>
                      
                      {/* Active Progress Bar */}
                      <div 
                        className="absolute top-1/2 left-0 h-1 bg-sky-600 -translate-y-1/2 z-0 transition-all duration-500"
                        style={{
                          width: currentStageIndex === 0 ? '0%' : currentStageIndex === 1 ? '50%' : '100%'
                        }}
                      ></div>

                      {STATUS_STAGES.map((stage, idx) => {
                        const isCompleted = idx <= currentStageIndex;
                        const isCurrent = idx === currentStageIndex;

                        return (
                          <div key={stage} className="relative z-10 flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                              isCompleted 
                                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30' 
                                : 'bg-white border-2 border-slate-300 text-slate-400'
                            } ${isCurrent ? 'ring-4 ring-sky-100' : ''}`}>
                              {isCompleted ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <span>{idx + 1}</span>
                              )}
                            </div>
                            <span className={`text-xs mt-1.5 font-semibold ${
                              isCurrent ? 'text-sky-700 font-bold' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                            }`}>
                              {stage}
                            </span>
                          </div>
                        );
                      })}

                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
