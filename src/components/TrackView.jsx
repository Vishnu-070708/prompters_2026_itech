import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  Building2, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  MessageSquare,
  ThumbsUp,
  ExternalLink,
  Activity,
  PlusCircle
} from 'lucide-react';

const STATUS_STAGES = ["Reported", "In Progress", "Resolved"];

const PRIORITY_STYLES = {
  Critical: "bg-red-500/15 text-red-400 border-red-500/40 shadow-glow-critical font-extrabold",
  High: "bg-orange-500/15 text-orange-400 border-orange-500/40 font-bold",
  Medium: "bg-amber-500/15 text-amber-300 border-amber-500/40 font-semibold",
  Low: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 font-semibold"
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-7 animate-fade-in text-slate-100">

      {/* Top Banner: Service Requests Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 px-3 py-1 text-xs font-bold text-teal-300">
            <Activity className="h-3.5 w-3.5 text-teal-400" />
            <span className="uppercase tracking-wider text-[10px]">In-browser municipal registry</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-100 tracking-tight sm:text-4xl">
            Service Requests
          </h1>
          <p className="text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
            Public municipal grievance registry. Monitor status changes, dispatch actions, and community upvotes.
          </p>
        </div>
        <button
          onClick={onSelectReport}
          className="self-start md:self-auto flex items-center space-x-2 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-glow-teal transition-all hover:scale-[1.02] cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-slate-950" />
          <span>Report New Issue</span>
        </button>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setStatusFilter('All')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer backdrop-blur-sm ${statusFilter === 'All'
            ? 'bg-slate-900 border-teal-500/60 ring-1 ring-teal-500/50 shadow-glow-teal'
            : 'bg-slate-900/80 border-white/[0.08] hover:border-white/[0.18]'
            }`}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Filed</span>
          <span className="text-3xl font-extrabold text-slate-100 mt-1 block">{stats.total}</span>
          <span className="text-xs text-teal-400 font-medium mt-1 inline-block">All municipal reports</span>
        </div>

        <div
          onClick={() => setStatusFilter('Reported')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer backdrop-blur-sm ${statusFilter === 'Reported'
            ? 'bg-slate-900 border-amber-500/60 ring-1 ring-amber-500/50 shadow-md shadow-amber-500/10'
            : 'bg-slate-900/80 border-white/[0.08] hover:border-white/[0.18]'
            }`}
        >
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Reported</span>
          <span className="text-3xl font-extrabold text-amber-400 mt-1 block">{stats.reported}</span>
          <span className="text-xs text-slate-400 font-medium mt-1 inline-block">Awaiting field crew</span>
        </div>

        <div
          onClick={() => setStatusFilter('In Progress')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer backdrop-blur-sm ${statusFilter === 'In Progress'
            ? 'bg-slate-900 border-sky-500/60 ring-1 ring-sky-500/50 shadow-md shadow-sky-500/10'
            : 'bg-slate-900/80 border-white/[0.08] hover:border-white/[0.18]'
            }`}
        >
          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">In Progress</span>
          <span className="text-3xl font-extrabold text-sky-400 mt-1 block">{stats.inProgress}</span>
          <span className="text-xs text-slate-400 font-medium mt-1 inline-block">Teams deployed on site</span>
        </div>

        <div
          onClick={() => setStatusFilter('Resolved')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer backdrop-blur-sm ${statusFilter === 'Resolved'
            ? 'bg-slate-900 border-emerald-500/60 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-500/10'
            : 'bg-slate-900/80 border-white/[0.08] hover:border-white/[0.18]'
            }`}
        >
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Resolved</span>
          <span className="text-3xl font-extrabold text-emerald-400 mt-1 block">{stats.resolved}</span>
          <span className="text-xs text-slate-400 font-medium mt-1 inline-block">Fixed & verified</span>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-white/[0.08] shadow-subtle-dark space-y-4 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-300">
          <Filter className="h-3.5 w-3.5 text-teal-400" />
          <span>Filter & Search Registry</span>
        </div>

        <div className="flex flex-col md:flex-row gap-3">

          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by Tracking ID (e.g. CR-1042), keyword, or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/[0.1] bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm text-slate-100 placeholder-slate-500 shadow-inner"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-44">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-white/[0.1] bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm font-medium text-slate-200 shadow-inner"
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
              className="w-full px-3 py-2.5 rounded-xl border border-white/[0.1] bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm font-medium text-slate-200 shadow-inner"
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
              className="w-full px-3 py-2.5 rounded-xl border border-white/[0.1] bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm font-medium text-slate-200 shadow-inner"
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
              className="w-full px-3 py-2.5 rounded-xl border border-white/[0.1] bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm font-medium text-slate-200 shadow-inner"
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
        <div className="p-12 text-center bg-slate-900/80 rounded-2xl border border-white/[0.08] shadow-subtle-dark">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">No matching requests found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            No complaints match your current search and filter criteria. Try adjusting or clearing filters.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('All'); setPriorityFilter('All'); setCategoryFilter('All Categories'); }}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-white/[0.08] transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {sortedComplaints.map((item) => {
            const currentStageIndex = STATUS_STAGES.indexOf(item.status);

            const priorityBorderColor =
              item.priority === 'Critical' ? 'border-l-red-500 shadow-[0_0_15px_-4px_rgba(239,68,68,0.25)]' :
                item.priority === 'High' ? 'border-l-orange-500' :
                  item.priority === 'Medium' ? 'border-l-amber-500' : 'border-l-emerald-500';

            const statusChipStyle =
              item.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
                item.status === 'In Progress' ? 'bg-sky-500/10 text-sky-300 border-sky-500/30' :
                  'bg-amber-500/10 text-amber-300 border-amber-500/30';

            return (
              <div
                key={item.id}
                data-testid="complaint-card"
                className={`bg-slate-900/90 rounded-2xl border border-white/[0.08] shadow-subtle-dark hover:shadow-2xl hover:border-white/[0.18] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden border-l-4 ${priorityBorderColor}`}
              >
                <div className="p-5 sm:p-6 space-y-4">

                  {/* Card Header: Tracking ID + Badges + Date */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-extrabold text-sm sm:text-base text-cyan-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-teal-500/30">
                        {item.id}
                      </span>

                      <span className={`text-xs px-2.5 py-0.5 rounded-full border ${statusChipStyle} font-bold`}>
                        {item.status}
                      </span>

                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-white/[0.08]">
                        {item.category}
                      </span>

                      <span className={`text-xs px-2.5 py-0.5 rounded-md border ${PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.Medium}`}>
                        {item.priority}
                      </span>

                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1" data-testid="complaint-severity">
                        <span className="font-normal text-indigo-400">Severity:</span>
                        <span>{item.severityScore ? `${item.severityScore}/10` : '5/10'}</span>
                      </span>

                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-white/[0.08] flex items-center space-x-1" data-testid="complaint-est-time">
                        <Clock className="w-3 h-3 text-cyan-400" />
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm ${upvotedIds.includes(item.id)
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-glow-teal cursor-default'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-teal-300 border border-white/[0.1] hover:border-teal-500/30 active:scale-95 cursor-pointer'
                          }`}
                        title={upvotedIds.includes(item.id) ? "You have already upvoted this complaint" : "Click to upvote this issue (Me Too)"}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${upvotedIds.includes(item.id) ? 'text-teal-300 fill-teal-300' : 'text-slate-400'}`} />
                        <span>{upvotedIds.includes(item.id) ? 'Supported' : 'Me Too'}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-extrabold ${upvotedIds.includes(item.id) ? 'bg-teal-500/30 text-teal-200' : 'bg-slate-800 text-slate-300'
                          }`}>
                          {item.upvotes || 0}
                        </span>
                      </button>

                      <div className="flex items-center space-x-1 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex flex-col lg:flex-row gap-5">

                    {/* Optional Image */}
                    {item.imageUrl && (
                      <div className="w-full lg:w-48 h-36 rounded-xl bg-slate-950 overflow-hidden flex-shrink-0 border border-white/[0.08]">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                    )}

                    {/* Text Details */}
                    <div className="flex-1 space-y-2.5">
                      <h3 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                        {item.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-slate-400">
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-400" />
                          <span className="font-medium text-slate-300">{item.location}</span>
                        </span>

                        <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-slate-950 border border-white/[0.06]">
                          <Building2 className="w-3.5 h-3.5 text-teal-400" />
                          <span className="font-medium text-teal-300">{item.recommendedDepartment}</span>
                        </span>

                        {((item.coordinates?.lat && item.coordinates?.lng) || (item.lat && item.lng)) && (
                          <a
                            href={`https://www.google.com/maps?q=${item.coordinates?.lat || item.lat},${item.coordinates?.lng || item.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`maps-link-${item.id}`}
                            className="inline-flex items-center space-x-1 font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Open in Maps</span>
                          </a>
                        )}
                      </div>

                      {/* AI Reasoning Pill */}
                      {item.aiReasoning && (
                        <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-teal-500/20 text-xs text-slate-300 flex items-start space-x-2">
                          <Sparkles className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-teal-300">AI Assessment: </span>
                            <span>{item.aiReasoning}</span>
                          </div>
                        </div>
                      )}

                      {/* Admin Notes if any */}
                      {item.adminNotes && (
                        <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start space-x-2">
                          <MessageSquare className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-amber-300">Official Municipal Action: </span>
                            <span>{item.adminNotes}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3-STEP PROGRESS TRACKER WITH TIMESTAMPS & ADMIN NOTES */}
                  <div className="pt-4 border-t border-white/[0.08]">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Resolution Progress & Timestamps
                    </div>
                    <div className="relative max-w-2xl mx-auto">

                      {/* Background Bar */}
                      <div className="absolute top-4 left-10 right-10 h-1 bg-slate-800 -translate-y-1/2 z-0"></div>

                      {/* Active Progress Bar */}
                      <div
                        className="absolute top-4 left-10 h-1 bg-gradient-to-r from-teal-500 to-cyan-400 -translate-y-1/2 z-0 transition-all duration-500 shadow-glow-teal"
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
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${isCompleted
                                ? 'bg-teal-500 text-slate-950 shadow-glow-teal'
                                : 'bg-slate-950 border border-slate-700 text-slate-500'
                                } ${isCurrent ? 'ring-4 ring-teal-500/20 border-teal-400' : ''}`}>
                                {isCompleted ? (
                                  <CheckCircle2 className="w-4.5 h-4.5" />
                                ) : (
                                  <span>{idx + 1}</span>
                                )}
                              </div>

                              <span className={`text-xs mt-1.5 font-semibold ${isCurrent ? 'text-teal-300 font-bold' : isCompleted ? 'text-slate-200' : 'text-slate-500'
                                }`}>
                                {stage}
                              </span>

                              {/* Timestamp for each status change */}
                              {stageInfo.timestamp ? (
                                <span
                                  data-testid={`tracker-time-${item.id}-${stage.toLowerCase().replace(/\s+/g, '-')}`}
                                  className="text-[10px] text-slate-400 font-medium flex items-center justify-center space-x-1 mt-0.5"
                                >
                                  <Clock className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" />
                                  <span>{formatStageDateTime(stageInfo.timestamp)}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-600 mt-0.5 italic">Pending</span>
                              )}

                              {/* Admin note associated with this status */}
                              {stageInfo.note && (
                                <div
                                  data-testid={`tracker-note-${item.id}-${stage.toLowerCase().replace(/\s+/g, '-')}`}
                                  className="mt-2 p-2 rounded-xl bg-slate-950/90 border border-amber-500/30 text-[10px] text-amber-200 leading-tight w-full max-w-[100px] sm:max-w-[200px] break-words shadow-sm text-left"
                                >
                                  <span className="font-bold text-[9px] uppercase tracking-wider text-amber-300 block mb-0.5">
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
