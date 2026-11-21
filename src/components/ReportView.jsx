import React, { useState } from 'react';
import {
  Sparkles,
  MapPin,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Building2,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  ExternalLink,
  Info,
  Clock,
  Car,
  Trash2,
  Lightbulb,
  Droplets,
  ShieldAlert,
  Flame,
  Activity,
  CheckCheck
} from 'lucide-react';
import { triageIssueWithGemini, analyzePhotoWithGemini } from '../services/geminiService';
import { generateTrackingId } from '../utils/trackingId';
import { compressImageForStorage } from '../utils/imageCompression';

const CATEGORIES = [
  "Auto-detect with AI",
  "Roads & Infrastructure",
  "Sanitation & Waste",
  "Street Lighting",
  "Water Supply & Drainage",
  "Public Safety",
  "Other"
];

const SERVICE_TILES = [
  { id: 'Roads & Infrastructure', name: 'Roads', icon: Car, desc: 'Potholes, cracks, signals' },
  { id: 'Sanitation & Waste', name: 'Sanitation & Waste', icon: Trash2, desc: 'Garbage, cleaning, dumps' },
  { id: 'Street Lighting', name: 'Street Lighting', icon: Lightbulb, desc: 'Dark rows, outages' },
  { id: 'Water Supply & Drainage', name: 'Water & Drainage', icon: Droplets, desc: 'Leaks, bursts, drains' },
  { id: 'Public Safety', name: 'Public Safety', icon: ShieldAlert, desc: 'Open trenches, hazards' },
];

export default function ReportView({ onComplaintAdded, onViewTrack, apiKey, modelName, existingComplaintIds, complaints = [] }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState(null);
  const [locationNote, setLocationNote] = useState('');
  const [category, setCategory] = useState('Auto-detect with AI');
  const [imagePreview, setImagePreview] = useState(null);

  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [submissionResult, setSubmissionResult] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [snapSuccess, setSnapSuccess] = useState('');
  const [photoValidation, setPhotoValidation] = useState(null);

  // Stats computed from complaints data
  const totalFiled = complaints.length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;
  const openCriticalCount = complaints.filter(c => c.status !== 'Resolved' && (c.priority === 'Critical' || c.priority === 'High')).length;

  // IP-based approximate location lookup fallback using ipwho.is
  const fetchIpLocation = async () => {
    try {
      const response = await fetch('https://ipwho.is/');
      if (!response.ok) {
        throw new Error(`ipwho.is returned HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data && data.success !== false && (data.city || data.region)) {
        const parts = [data.city, data.region].filter(Boolean);
        const locString = parts.length > 0 ? `${parts.join(', ')} (approximate)` : "Approximate location";
        setLocation(locString);
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          setCoords({ lat: data.latitude, lng: data.longitude });
        }
        setLocationNote("Approximate location - please refine if needed");
        setValidationError('');
        return true;
      }
      throw new Error("ipwho.is payload missing location details");
    } catch (err) {
      console.warn("IP geolocation fallback failed:", err);
      setLocation('');
      setCoords(null);
      setLocationNote('');
      setValidationError("Couldn't get your location, please type it");
      return false;
    }
  };

  // Geolocation handler with OpenStreetMap Nominatim reverse geocoding and ipwho.is fallback
  const handleGetLocation = () => {
    setIsLocating(true);
    setValidationError('');
    setLocationNote('');

    if (!navigator.geolocation) {
      fetchIpLocation().finally(() => setIsLocating(false));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          setCoords({ lat: latitude, lng: longitude });

          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          if (!response.ok) {
            throw new Error(`Nominatim request failed with status: ${response.status}`);
          }
          const data = await response.json();
          if (data && data.display_name) {
            setLocation(data.display_name);
            setLocationNote('');
            setValidationError('');
            setIsLocating(false);
            return;
          }
          throw new Error("No address found in reverse geocoding response");
        } catch (error) {
          console.warn("Reverse geocode failed, attempting IP fallback...", error);
          await fetchIpLocation();
          setIsLocating(false);
        }
      },
      async (error) => {
        console.warn("navigator.geolocation failed, attempting IP fallback...", error);
        await fetchIpLocation();
        setIsLocating(false);
      },
      { timeout: 7000, enableHighAccuracy: false }
    );
  };

  // Image Upload handler
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setImagePreview(null);
      setValidationError('Please upload a PNG, JPG, or WEBP photo.');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setValidationError("Photo must be smaller than 4 MB.");
      return;
    }

    try {
      const compressedImage = await compressImageForStorage(file);
      setImagePreview(compressedImage);
      setPhotoValidation(null);
      setValidationError('');
      setSnapSuccess('');
    } catch (err) {
      console.error('Photo compression failed:', err);
      setImagePreview(null);
      setPhotoValidation(null);
      setValidationError('Unable to prepare this photo. Please try a different image.');
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setPhotoValidation(null);
    setSnapSuccess('');
    setValidationError('');
  };

  // Snap-to-Fill: AI Vision analysis of uploaded photo
  const handleAnalyzePhoto = async () => {
    if (!imagePreview) return;
    setIsAnalyzingPhoto(true);
    setValidationError('');
    setSnapSuccess('');

    try {
      const result = await analyzePhotoWithGemini({
        imageBase64: imagePreview,
        apiKey,
        modelName
      });

      if (!result.is_valid_civic_issue || (typeof result.confidence === 'number' && result.confidence < 0.6)) {
        setPhotoValidation({ isValid: false, reason: result.reason, confidence: result.confidence });
        setCategory('Auto-detect with AI');
        const reasonSuffix = result.reason ? ` Reason: ${result.reason}` : '';
        setValidationError(`This image doesn't appear to show a civic issue. Please upload a clear photo of the problem (for example a pothole, garbage, or a broken streetlight).${reasonSuffix}`);
        return;
      }

      setPhotoValidation({ isValid: true, reason: result.reason, confidence: result.confidence });
      if (result.title) setTitle(result.title);
      if (result.description) setDescription(result.description);
      if (result.category) setCategory(result.category);

      setSnapSuccess('✨ AI analyzed photo and filled title, description, and category. You can edit before submitting.');
    } catch (err) {
      console.error("Photo analysis error:", err);
      setValidationError("Failed to analyze photo with AI. You can still enter details manually.");
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  // Submit & Triage
  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (photoValidation && !photoValidation.isValid) {
      const reasonSuffix = photoValidation.reason ? ` Reason: ${photoValidation.reason}` : '';
      setValidationError(`This image doesn't appear to show a civic issue. Please upload a clear photo of the problem (for example a pothole, garbage, or a broken streetlight).${reasonSuffix}`);
      return;
    }

    if (!title.trim()) {
      setValidationError('Please enter a title for the issue.');
      return;
    }
    if (!description.trim()) {
      setValidationError('Please describe the issue in detail.');
      return;
    }

    // If an image is attached and has not been verified yet, verify it before creating a complaint
    if (imagePreview && !photoValidation) {
      setIsSubmitting(true);
      try {
        const check = await analyzePhotoWithGemini({
          imageBase64: imagePreview,
          apiKey,
          modelName
        });
        if (!check.is_valid_civic_issue || (typeof check.confidence === 'number' && check.confidence < 0.6)) {
          setPhotoValidation({ isValid: false, reason: check.reason, confidence: check.confidence });
          setCategory('Auto-detect with AI');
          const reasonSuffix = check.reason ? ` Reason: ${check.reason}` : '';
          setValidationError(`This image doesn't appear to show a civic issue. Please upload a clear photo of the problem (for example a pothole, garbage, or a broken streetlight).${reasonSuffix}`);
          setIsSubmitting(false);
          return;
        }
        setPhotoValidation({ isValid: true, reason: check.reason, confidence: check.confidence });
      } catch (err) {
        console.warn("Pre-submission photo verification warning:", err);
      }
    }

    setIsSubmitting(true);

    try {
      const triage = await triageIssueWithGemini({
        title,
        description,
        location,
        selectedCategory: category === "Auto-detect with AI" ? null : category,
        imageBase64: imagePreview,
        apiKey,
        modelName
      });

      const trackingId = generateTrackingId(existingComplaintIds);

      const newComplaint = {
        id: trackingId,
        title: title.trim(),
        description: description.trim(),
        location: location.trim() || "Unspecified Location",
        coordinates: coords ? { lat: coords.lat, lng: coords.lng } : null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        category: triage.category,
        priority: triage.priority,
        severityScore: triage.severityScore,
        estimatedResolutionTime: triage.estimatedResolutionTime,
        recommendedDepartment: triage.recommendedDepartment,
        aiReasoning: triage.aiReasoning,
        status: "Reported",
        imageUrl: imagePreview,
        createdAt: new Date().toISOString(),
        adminNotes: "",
        aiMode: triage.aiMode || (triage.isMock ? "Mock AI mode" : "Gemini Flash-Lite"),
        upvotes: 0,
        statusHistory: [
          {
            status: "Reported",
            timestamp: new Date().toISOString(),
            note: "Complaint submitted and automatically triaged by CivicResolve AI."
          }
        ]
      };

      const wasSaved = onComplaintAdded(newComplaint);
      if (!wasSaved) {
        setValidationError('Your report could not be saved because browser storage is full. Remove the photo or clear older demo reports, then try again.');
        return;
      }
      setSubmissionResult(newComplaint);

      // Reset form fields
      setTitle('');
      setDescription('');
      setLocation('');
      setCoords(null);
      setLocationNote('');
      setCategory('Auto-detect with AI');
      setImagePreview(null);
      setPhotoValidation(null);

    } catch (err) {
      console.error(err);
      setValidationError("Failed to triage complaint. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10 space-y-8 animate-fade-in">

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/80 border border-white/[0.08] p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl">
          <div className="inline-flex items-center space-x-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-bold text-teal-300 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span className="uppercase tracking-wider text-[10px]">Municipal Triage & Dispatch Prototype</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-100">
            Your city. Your voice. <span className="bg-gradient-to-r from-teal-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">Fixed faster.</span>
          </h1>

          <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-400 max-w-2xl">
            Report local hazards, road defects, or public utilities. Google Gemini classifies severity, estimates resolution time, and suggests the right municipal crew.
          </p>
        </div>

        {/* Live Service Stats Strip */}
        <div className="mt-8 pt-6 border-t border-white/[0.08] grid grid-cols-3 gap-2 sm:gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:space-x-3 p-2 sm:p-3 rounded-2xl bg-slate-950/60 border border-white/[0.06] text-center sm:text-left">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-1 sm:mb-0">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-[9px] sm:text-[11px] uppercase tracking-wider font-semibold text-slate-400">Total Filed</p>
              <p className="text-base sm:text-2xl font-extrabold text-slate-100">{totalFiled}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:space-x-3 p-2 sm:p-3 rounded-2xl bg-slate-950/60 border border-white/[0.06] text-center sm:text-left">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-1 sm:mb-0">
              <CheckCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-[9px] sm:text-[11px] uppercase tracking-wider font-semibold text-slate-400">Resolved</p>
              <p className="text-base sm:text-2xl font-extrabold text-emerald-400">{resolvedCount}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:space-x-3 p-2 sm:p-3 rounded-2xl bg-slate-950/60 border border-white/[0.06] text-center sm:text-left">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-1 sm:mb-0">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-[9px] sm:text-[11px] uppercase tracking-wider font-semibold text-slate-400">Open Critical</p>
              <p className="text-base sm:text-2xl font-extrabold text-rose-400">{openCriticalCount}</p>
            </div>
          </div>
        </div>

        {/* 5 Service Tiles */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
              Choose Service Department or Auto-Detect
            </span>
            {category !== 'Auto-detect with AI' && (
              <button
                type="button"
                onClick={() => setCategory('Auto-detect with AI')}
                className="text-xs text-teal-400 hover:text-teal-300 font-semibold underline"
              >
                Reset to AI Auto-detect
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
            {SERVICE_TILES.map((tile) => {
              const Icon = tile.icon;
              const isSelected = category === tile.id;
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => setCategory(tile.id)}
                  className={`p-3.5 rounded-2xl text-left transition-all duration-200 border flex flex-col justify-between group ${isSelected
                    ? 'bg-teal-500/15 border-teal-500/50 shadow-glow-teal text-slate-100 ring-1 ring-teal-400/40'
                    : 'bg-slate-950/60 border-white/[0.06] text-slate-300 hover:border-white/[0.15] hover:bg-slate-950/80'
                    }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-105 ${isSelected ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-800 text-teal-400'
                    }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight text-slate-200">{tile.name}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{tile.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3-Step "How it works" Strip */}
        <div className="mt-8 pt-6 border-t border-white/[0.08]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Workflow Lifecycle</p>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {[
              { num: '01', title: 'Citizen Report', desc: 'Describe or snap photo of the hazard', icon: FileText },
              { num: '02', title: 'Gemini AI Triage', desc: 'Auto-categorizes, rates severity 1-10 & ETA', icon: Sparkles },
              { num: '03', title: 'Track to Resolution', desc: 'Follow dispatch updates with verified admin notes', icon: CheckCircle2 }
            ].map((step) => {
              const StepIcon = step.icon;
              return (
                <div key={step.num} className="rounded-2xl border border-white/[0.06] bg-slate-950/40 p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono font-bold text-teal-400">{step.num}</span>
                    <StepIcon className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-200">{step.title}</p>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 leading-snug">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* SUCCESS / HERO AI TRIAGE RESULT CARD */}
      {submissionResult && (
        <div
          data-testid="triage-result-card"
          className="overflow-hidden rounded-3xl border-2 border-teal-500/40 bg-slate-900/95 p-6 sm:p-8 shadow-2xl shadow-teal-500/10 animate-fade-in text-slate-100"
        >
          {/* Top Bar: Success badge + Tracking ID */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-300 flex items-center justify-center font-bold shadow-glow-teal flex-shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                  Registered into Municipal Dispatch
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-100 mt-1 flex items-center gap-2">
                  <span>Tracking ID:</span>
                  <span data-testid="triage-tracking-id" className="font-mono text-cyan-300">{submissionResult.id}</span>
                </h3>
              </div>
            </div>

            <button
              onClick={() => handleCopyId(submissionResult.id)}
              className="self-start sm:self-auto flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-white/[0.1] hover:bg-white/[0.06] text-xs font-semibold text-slate-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copiedId ? 'Copied to Clipboard' : 'Copy Tracking ID'}</span>
            </button>
          </div>

          {/* AI Triage Hero Card */}
          <div className="mt-6 space-y-5 rounded-2xl border border-white/[0.08] bg-slate-950/70 p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center space-x-2 text-xs font-bold text-teal-300 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-teal-400 animate-pulse" />
                <span>Powered by Gemini Multimodal Triage</span>
              </div>
              <span data-testid="ai-mode-badge" className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${submissionResult.aiMode.includes('Mock')
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                }`}>
                {submissionResult.aiMode}
              </span>
            </div>

            {/* Main Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">

              {/* Category */}
              <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-slate-900 border border-white/[0.06]">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">Category</span>
                <span className="text-sm font-bold text-slate-100 truncate block">{submissionResult.category}</span>
              </div>

              {/* Priority Hero Pill */}
              <div className={`p-3.5 rounded-xl border ${submissionResult.priority === 'Critical'
                ? 'border-red-500/40 bg-red-500/15 shadow-glow-critical'
                : submissionResult.priority === 'High'
                  ? 'border-orange-500/40 bg-orange-500/15'
                  : submissionResult.priority === 'Medium'
                    ? 'border-amber-500/40 bg-amber-500/15'
                    : 'border-emerald-500/40 bg-emerald-500/15'
                }`}>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">Priority</span>
                <span className={`text-sm font-extrabold ${submissionResult.priority === 'Critical' ? 'text-red-400' :
                  submissionResult.priority === 'High' ? 'text-orange-400' :
                    submissionResult.priority === 'Medium' ? 'text-amber-300' : 'text-emerald-400'
                  }`}>
                  {submissionResult.priority}
                </span>
              </div>

              {/* Severity Segmented Progress Bar */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/[0.06]" data-testid="triage-severity">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Severity</span>
                  <span className="text-xs font-mono font-extrabold text-teal-300">
                    {submissionResult.severityScore || 5}<span className="text-[10px] text-slate-500 font-normal">/10</span>
                  </span>
                </div>
                {/* Segmented bar 1-10 */}
                <div className="flex gap-1 items-center mt-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                    const active = num <= (submissionResult.severityScore || 5);
                    return (
                      <div
                        key={num}
                        className={`h-2 flex-1 rounded-sm transition-colors ${active
                          ? num >= 9
                            ? 'bg-red-500 shadow-sm shadow-red-500/50'
                            : num >= 7
                              ? 'bg-orange-500'
                              : num >= 4
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                          : 'bg-slate-800'
                          }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Estimated Resolution Time */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/[0.06]" data-testid="triage-est-time">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">Est. Resolution</span>
                <span className="text-sm font-bold text-slate-100 flex items-center gap-1.5 truncate">
                  <Clock className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span>{submissionResult.estimatedResolutionTime || "24-48 hours"}</span>
                </span>
              </div>

              {/* Assigned Department */}
              <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-slate-900 border border-white/[0.06]">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">Assigned Unit</span>
                <span className="text-sm font-bold text-teal-300 truncate block">{submissionResult.recommendedDepartment}</span>
              </div>

            </div>

            {/* AI Impact Assessment */}
            <div className="rounded-xl border border-white/[0.08] bg-slate-900/90 p-4 text-xs sm:text-sm leading-relaxed text-slate-300">
              <strong className="block font-bold text-teal-300 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>AI Impact Assessment:</span>
              </strong>
              {submissionResult.aiReasoning}
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={() => setSubmissionResult(null)}
              className="text-xs sm:text-sm text-slate-400 hover:text-slate-100 font-semibold underline order-2 sm:order-1"
            >
              Report Another Issue
            </button>
            <button
              onClick={onViewTrack}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-glow-teal transition-all hover:scale-[1.02] order-1 sm:order-2"
            >
              <span>Track in Public Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* REPORT FORM */}
      <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/80 shadow-2xl backdrop-blur-xl">

        {/* Glowing top line accent */}
        <div className="h-1 bg-gradient-to-r from-teal-500 via-cyan-400 to-indigo-500"></div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">

          {validationError && (
            <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs sm:text-sm flex items-start space-x-2.5 animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
              <span className="font-medium">{validationError}</span>
            </div>
          )}

          {/* Issue Title */}
          <div>
            <label className="block text-xs uppercase tracking-wider font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-400" />
                <span>Issue Title <span className="text-rose-400">*</span></span>
              </span>
              <span className="text-[11px] text-slate-500 lowercase tracking-normal font-normal">Plain, specific summary</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dangerous 2-foot pothole causing skids near bus stop"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/[0.1] bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-slate-100 placeholder-slate-500 text-sm shadow-inner transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs uppercase tracking-wider font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Detailed Description <span className="text-rose-400">*</span></span>
              </span>
              <span className="text-[11px] text-slate-500 lowercase tracking-normal font-normal">What is visible & why it is dangerous</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describe the condition, how long it has been there, hazards to residents, and any specific landmarks..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/[0.1] bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-slate-100 placeholder-slate-500 text-sm shadow-inner transition-colors"
            />
          </div>

          {/* Location with Geolocation Button */}
          <div>
            <label className="block text-xs uppercase tracking-wider font-bold text-slate-300 mb-2">
              Location / Landmark
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="e.g. Avinashi Road, Peelamedu, Coimbatore"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    if (locationNote) setLocationNote('');
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/[0.1] bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-slate-100 placeholder-slate-500 text-sm shadow-inner transition-colors"
                />
              </div>
              <button
                type="button"
                data-testid="use-location-btn"
                onClick={handleGetLocation}
                disabled={isLocating}
                className="px-4 py-3 rounded-xl bg-slate-950 border border-teal-500/30 hover:border-teal-400 text-teal-300 font-semibold text-xs sm:text-sm flex items-center space-x-2 transition-colors cursor-pointer disabled:opacity-60 shadow-sm"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                    <span className="hidden sm:inline">Detecting location...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 text-teal-400" />
                    <span className="hidden sm:inline">Use My Location</span>
                  </>
                )}
              </button>
            </div>
            {locationNote && (
              <p data-testid="location-note" className="text-xs text-amber-300 font-medium mt-2 flex items-center space-x-1.5 animate-fade-in">
                <Info className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                <span>{locationNote}</span>
              </p>
            )}
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-xs uppercase tracking-wider font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span>Category</span>
              <span className="text-xs text-teal-400 font-semibold flex items-center space-x-1 lowercase tracking-normal">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI will auto-classify or refine</span>
              </span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/[0.1] bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-100 text-sm shadow-inner"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900 text-slate-100">
                  {cat === "Auto-detect with AI" ? "✨ Auto-detect with AI (Recommended)" : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Photo Upload with Preview & Snap-to-Fill */}
          <div>
            <label className="block text-xs uppercase tracking-wider font-bold text-slate-300 mb-2">
              Attach Photo <span className="text-xs font-normal text-slate-500 lowercase tracking-normal">(Optional - Gemini multimodal visual analysis)</span>
            </label>

            {imagePreview ? (
              <div className="space-y-3">
                <div className="relative rounded-2xl border border-white/[0.1] overflow-hidden bg-slate-950 max-h-64 flex items-center justify-center p-2">
                  <img src={imagePreview} alt="Issue preview" className="object-contain max-h-60 w-full rounded-xl" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-4 right-4 p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 rounded-full border border-white/[0.1] transition-colors"
                    title="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    data-testid="analyze-photo-btn"
                    onClick={handleAnalyzePhoto}
                    disabled={isAnalyzingPhoto}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs sm:text-sm shadow-glow-teal flex items-center justify-center space-x-2 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {isAnalyzingPhoto ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Analyzing photo with AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-slate-950" />
                        <span>Analyze photo with AI</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="py-3 px-4 rounded-xl border border-white/[0.1] hover:bg-white/[0.05] text-slate-400 hover:text-slate-200 font-semibold text-xs transition-colors"
                  >
                    Remove Photo
                  </button>
                </div>

                {photoValidation && !photoValidation.isValid && (
                  <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs space-y-1.5 animate-fade-in" data-testid="photo-validation-error">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold text-rose-200">
                          This image doesn't appear to show a civic issue. Please upload a clear photo of the problem (for example a pothole, garbage, or a broken streetlight).
                        </p>
                        {photoValidation.reason && (
                          <p className="text-[11px] text-rose-300/90 font-normal">
                            <span className="font-semibold text-rose-200">AI Observation:</span> {photoValidation.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {snapSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center space-x-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{snapSuccess}</span>
                  </div>
                )}
              </div>
            ) : (
              <label className="border-2 border-dashed border-white/[0.15] hover:border-teal-400/60 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-950/40 hover:bg-teal-500/5 group">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-white/[0.08] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform text-teal-400">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-slate-200">Click or drag image to upload</span>
                <span className="text-xs text-slate-500 mt-1">PNG, JPG, or WEBP (Compressed & verified, max 4MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500 hover:from-teal-400 hover:via-cyan-400 hover:to-indigo-400 text-slate-950 font-extrabold text-base shadow-glow-cyan transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center space-x-2.5 disabled:opacity-70 disabled:hover:scale-100 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                  <span>Gemini AI is Triaging Complaint...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-slate-950" />
                  <span>Submit & AI Triage Issue</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
