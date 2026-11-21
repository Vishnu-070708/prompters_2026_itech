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
  FileCheck2,
  ThumbsUp,
  ArrowUpDown,
  ExternalLink
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

export default function TrackView({ complaints, onSelectReport, onUpvoteComplaint }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'most-upvoted' | 'highest-priority'

  // Track upvoted complaints (one vote per browser in localStorage)
  const [upvotedIds, setUpvotedIds] = useState(() => {
    try {
      const stored = localStorage.getItem('civic_upvoted_complaint_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleUpvote = (complaintId) => {
    if (upvotedIds.includes(complaintId)) return;
    const nextVoted = [...upvotedIds, complaintId];
    setUpvotedIds(nextVoted);
    try {
      localStorage.setItem('civic_upvoted_complaint_ids', JSON.stringify(nextVoted));
    } catch (e) {
      console.warn("Failed to persist upvote:", e);
    }
    if (onUpvoteComplaint) {
      onUpvoteComplaint(complaintId);
    }
  };

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

  // Sorting & Filtering
  const sortedComplaints = useMemo(() => {
    return [...filteredComplaints].sort((a, b) => {
      if (sortBy === 'most-upvoted') {
        const votesA = a.upvotes || 0;
        const votesB = b.upvotes || 0;
        if (votesB !== votesA) return votesB - votesA;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === 'highest-priority') {
        const pOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        const pDiff = (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
        if (pDiff !== 0) return pDiff;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      // Default: newest
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [filteredComplaints, sortBy]);

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

  const formatStageDateTime = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getStageInfo = (item, stage) => {
    if (Array.isArray(item.statusHistory)) {
      const entry = item.statusHistory.find(h => h.status === stage);
      if (entry) {
        return {
          timestamp: entry.timestamp,
          note: entry.note || (item.status === stage ? item.adminNotes : '')
        };
      }
    }
    if (stage === "Reported") {
      return {
        timestamp: item.createdAt,
        note: (item.status === "Reported" && item.adminNotes) ? item.adminNotes : ""
      };
    }
    if (stage === "In Progress" && (item.status === "In Progress" || item.status === "Resolved")) {
      return {
        timestamp: item.inProgressAt || item.createdAt,
        note: item.status === "In Progress" ? item.adminNotes : ""
      };
    }
    if (stage === "Resolved" && item.status === "Resolved") {
      return {
        timestamp: item.resolvedAt || item.createdAt,
        note: item.adminNotes || ""
      };
    }
    return { timestamp: null, note: null };
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

          {/* Sort By Filter */}
          <div className="w-full md:w-48">
            <select
              data-testid="sort-by-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm bg-white font-medium text-slate-800"
            >
              <option value="newest">Newest first</option>
              <option value="most-upvoted">Most upvoted</option>
              <option value="highest-priority">Highest priority</option>
            </select>
          </div>

        </div>
      </div>

      {/* COMPLAINTS LIST */}
      {sortedComplaints.length === 0 ? (
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
          {sortedComplaints.map((item) => {
            const currentStageIndex = STATUS_STAGES.indexOf(item.status);

            return (
              <div 
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-5 sm:p-6 space-y-4">
                  
                  {/* Card Header: Tracking ID + Badges + Date */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-extrabold text-base text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                        {item.id}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {item.category}
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-md border ${PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.Medium}`}>
                        {item.priority} Priority
                      </span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center space-x-1" data-testid="complaint-severity">
                        <span className="font-normal text-indigo-500">Severity:</span>
                        <span>{item.severityScore ? `${item.severityScore}/10` : '5/10'}</span>
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-50 text-slate-700 border border-slate-200 flex items-center space-x-1" data-testid="complaint-est-time">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Est: {item.estimatedResolutionTime || '24-48 hours'}</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* "Me Too" Upvote Button */}
                      <button
                        type="button"
                        data-testid={`upvote-btn-${item.id}`}
                        onClick={() => handleUpvote(item.id)}
                        disabled={upvotedIds.includes(item.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm ${
                          upvotedIds.includes(item.id)
                            ? 'bg-sky-100 text-sky-800 border border-sky-300 cursor-default'
                            : 'bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-300 hover:border-sky-300 active:scale-95 cursor-pointer'
                        }`}
                        title={upvotedIds.includes(item.id) ? "You have already upvoted this complaint" : "Click to upvote this issue (Me Too)"}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${upvotedIds.includes(item.id) ? 'text-sky-600 fill-sky-600' : 'text-slate-500'}`} />
                        <span>{upvotedIds.includes(item.id) ? 'Supported' : 'Me Too'}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-extrabold ${
                          upvotedIds.includes(item.id) ? 'bg-sky-200 text-sky-900' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {item.upvotes || 0}
                        </span>
                      </button>

                      <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
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
                        {((item.coordinates?.lat && item.coordinates?.lng) || (item.lat && item.lng)) && (
                          <a
                            href={`https://www.google.com/maps?q=${item.coordinates?.lat || item.lat},${item.coordinates?.lng || item.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`maps-link-${item.id}`}
                            className="inline-flex items-center space-x-1 font-semibold text-sky-600 hover:text-sky-800 hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                            <span>Open in Maps</span>
                          </a>
                        )}
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

                  {/* 3-STEP PROGRESS TRACKER WITH TIMESTAMPS & ADMIN NOTES */}
                  <div className="pt-4 border-t border-slate-100">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Resolution Progress & Timestamps
                    </div>
                    <div className="relative max-w-2xl mx-auto">
                      
                      {/* Background Bar */}
                      <div className="absolute top-4 left-10 right-10 h-1 bg-slate-200 -translate-y-1/2 z-0"></div>
                      
                      {/* Active Progress Bar */}
                      <div 
                        className="absolute top-4 left-10 h-1 bg-sky-600 -translate-y-1/2 z-0 transition-all duration-500"
                        style={{
                          width: currentStageIndex === 0 ? '0%' : currentStageIndex === 1 ? '50%' : 'calc(100% - 5rem)'
                        }}
                      ></div>

                      <div className="flex items-start justify-between relative z-10">
                        {STATUS_STAGES.map((stage, idx) => {
                          const isCompleted = idx <= currentStageIndex;
                          const isCurrent = idx === currentStageIndex;
                          const stageInfo = getStageInfo(item, stage);

                          return (
                            <div key={stage} className="flex flex-col items-center flex-1 px-1 text-center">
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

                              {/* Timestamp for each status change */}
                              {stageInfo.timestamp ? (
                                <span 
                                  data-testid={`tracker-time-${item.id}-${stage.toLowerCase().replace(/\s+/g, '-')}`}
                                  className="text-[10px] text-slate-500 font-medium flex items-center justify-center space-x-1 mt-0.5"
                                >
                                  <Clock className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
                                  <span>{formatStageDateTime(stageInfo.timestamp)}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 mt-0.5 italic">Pending</span>
                              )}

                              {/* Admin note associated with this status */}
                              {stageInfo.note && (
                                <div 
                                  data-testid={`tracker-note-${item.id}-${stage.toLowerCase().replace(/\s+/g, '-')}`}
                                  className="mt-2 p-1.5 rounded-lg bg-amber-50/90 border border-amber-200/90 text-[10px] text-amber-900 leading-tight max-w-[190px] shadow-xs text-left"
                                >
                                  <span className="font-bold text-[9px] uppercase tracking-wider text-amber-950 block mb-0.5">
                                    Admin Note:
                                  </span>
                                  <span>{stageInfo.note}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

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
