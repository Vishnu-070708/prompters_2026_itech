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
  Info
} from 'lucide-react';
import { triageIssueWithGemini, analyzePhotoWithGemini } from '../services/geminiService';

const CATEGORIES = [
  "Auto-detect with AI",
  "Roads & Infrastructure",
  "Sanitation & Waste",
  "Street Lighting",
  "Water Supply & Drainage",
  "Public Safety",
  "Other"
];

export default function ReportView({ onComplaintAdded, onViewTrack, apiKey, modelName }) {
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
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setValidationError("Photo must be smaller than 4 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setValidationError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setSnapSuccess('');
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

    if (!title.trim()) {
      setValidationError('Please enter a title for the issue.');
      return;
    }
    if (!description.trim()) {
      setValidationError('Please describe the issue in detail.');
      return;
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

      const trackingId = `CR-${Math.floor(1000 + Math.random() * 9000)}`;

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

      onComplaintAdded(newComplaint);
      setSubmissionResult(newComplaint);

      // Reset form fields
      setTitle('');
      setDescription('');
      setLocation('');
      setCoords(null);
      setLocationNote('');
      setCategory('Auto-detect with AI');
      setImagePreview(null);

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
    <div className="max-w-3xl mx-auto px-4 py-8">
      
      {/* Page Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-sky-600" />
          <span>Intelligent Civic Redressal</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          Report a Civic Issue
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
          Submit potholes, broken streetlights, waste accumulation, or drainage faults. Our Gemini AI engine categorizes, prioritizes, and routes it immediately.
        </p>
      </div>

      {/* SUCCESS RESULT CARD */}
      {submissionResult && (
        <div className="mb-8 p-6 bg-white rounded-2xl border-2 border-emerald-500 shadow-xl animate-fadeIn">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Successfully Registered
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  Complaint Filed: <span className="font-mono text-sky-700">{submissionResult.id}</span>
                </h3>
              </div>
            </div>

            <button
              onClick={() => handleCopyId(submissionResult.id)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
            >
              {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
            </button>
          </div>

          {/* AI Triage Summary Box */}
          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-sky-600" />
                <span>AI Automated Triage Result</span>
              </div>
              <span data-testid="ai-mode-badge" className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                submissionResult.aiMode.includes('Mock') 
                  ? 'bg-amber-100 text-amber-800' 
                  : 'bg-indigo-100 text-indigo-800'
              }`}>
                {submissionResult.aiMode}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-500 font-medium block">Category</span>
                <span className="text-sm font-bold text-slate-800 truncate block">{submissionResult.category}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[11px] text-slate-500 font-medium block">Assessed Priority</span>
                <span className={`text-sm font-extrabold ${
                  submissionResult.priority === 'Critical' ? 'text-rose-600' :
                  submissionResult.priority === 'High' ? 'text-amber-600' :
                  submissionResult.priority === 'Medium' ? 'text-yellow-600' : 'text-emerald-600'
                }`}>
                  {submissionResult.priority}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200" data-testid="triage-severity">
                <span className="text-[11px] text-slate-500 font-medium block">Severity Score</span>
                <span className="text-sm font-extrabold text-indigo-700">
                  {submissionResult.severityScore || 5} <span className="text-xs font-normal text-slate-400">/ 10</span>
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200" data-testid="triage-est-time">
                <span className="text-[11px] text-slate-500 font-medium block">Est. Resolution</span>
                <span className="text-sm font-bold text-slate-800 truncate block">
                  {submissionResult.estimatedResolutionTime || "24-48 hours"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-500 font-medium block">Assigned Dept</span>
                <span className="text-sm font-bold text-slate-800 truncate block">{submissionResult.recommendedDepartment}</span>
              </div>
            </div>

            <div className="text-xs text-slate-700 bg-sky-50/70 p-3 rounded-lg border border-sky-100">
              <strong className="text-sky-900 block mb-0.5 font-semibold">AI Impact Assessment:</strong>
              {submissionResult.aiReasoning}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between pt-2">
            <button
              onClick={() => setSubmissionResult(null)}
              className="text-sm text-slate-600 hover:text-slate-900 font-semibold underline"
            >
              Report Another Issue
            </button>
            <button
              onClick={onViewTrack}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-md transition-colors"
            >
              <span>View in Tracking Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* REPORT FORM */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* Form header accent */}
        <div className="h-2 bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-600"></div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">

          {validationError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Issue Title */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Issue Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dangerous 2-foot pothole causing skids near bus stop"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 placeholder-slate-400 text-sm shadow-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Detailed Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describe the condition, how long it has been there, hazards to residents, and any specific landmarks..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 placeholder-slate-400 text-sm shadow-sm"
            />
          </div>

          {/* Location with Geolocation Button */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Location / Landmark
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="e.g. Avinashi Road, Peelamedu, Coimbatore"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    if (locationNote) setLocationNote('');
                  }}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 placeholder-slate-400 text-sm shadow-sm"
                />
              </div>
              <button
                type="button"
                data-testid="use-location-btn"
                onClick={handleGetLocation}
                disabled={isLocating}
                className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm flex items-center space-x-1.5 transition-colors border border-slate-200 cursor-pointer disabled:opacity-70"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                    <span className="hidden sm:inline">Detecting location...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 text-sky-600" />
                    <span className="hidden sm:inline">Use My Location</span>
                  </>
                )}
              </button>
            </div>
            {locationNote && (
              <p data-testid="location-note" className="text-xs text-amber-700 font-medium mt-1.5 flex items-center space-x-1 animate-fadeIn">
                <Info className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
                <span>{locationNote}</span>
              </p>
            )}
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1 flex items-center justify-between">
              <span>Category</span>
              <span className="text-xs text-sky-600 font-semibold flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI will auto-classify or refine</span>
              </span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 text-sm bg-white shadow-sm"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "Auto-detect with AI" ? "✨ Auto-detect with AI (Recommended)" : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Photo Upload with Preview */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Attach Photo <span className="text-xs font-normal text-slate-500">(Optional - Gemini multimodal analyzes images)</span>
            </label>

            {imagePreview ? (
              <div className="space-y-3">
                <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 max-h-64 flex items-center justify-center">
                  <img src={imagePreview} alt="Issue preview" className="object-contain max-h-64 w-full" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-3 right-3 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition-colors"
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
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center space-x-2 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {isAnalyzingPhoto ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-sky-200" />
                        <span>Analyzing photo with AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-sky-200" />
                        <span>Analyze photo with AI</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors"
                  >
                    Remove Photo
                  </button>
                </div>

                {snapSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{snapSuccess}</span>
                  </div>
                )}
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-sky-50/30">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm font-semibold text-slate-700">Click or drag image to upload</span>
                <span className="text-xs text-slate-400 mt-1">PNG, JPG or WEBP (Max 4MB)</span>
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
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 hover:from-sky-700 hover:to-indigo-800 text-white font-bold text-base shadow-lg shadow-sky-600/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Gemini AI is Triaging Complaint...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-sky-200" />
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
