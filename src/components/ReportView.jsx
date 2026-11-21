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
  Check
} from 'lucide-react';
import { triageIssueWithGemini } from '../services/geminiService';

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
  const [category, setCategory] = useState('Auto-detect with AI');
  const [imagePreview, setImagePreview] = useState(null);
  
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [submissionResult, setSubmissionResult] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  // Geolocation handler
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setValidationError("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Approximate location label for Coimbatore region
        setLocation(`Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)} (Peelamedu, Coimbatore)`);
        setIsLocating(false);
      },
      (error) => {
        console.warn("Geolocation error:", error);
        setLocation("Avinashi Road, Peelamedu, Coimbatore");
        setIsLocating(false);
      },
      { timeout: 7000 }
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
        category: triage.category,
        priority: triage.priority,
        recommendedDepartment: triage.recommendedDepartment,
        aiReasoning: triage.aiReasoning,
        status: "Reported",
        imageUrl: imagePreview,
        createdAt: new Date().toISOString(),
        adminNotes: "",
        aiMode: triage.aiMode || (triage.isMock ? "Mock AI mode" : "Gemini 3.8 Flash")
      };

      onComplaintAdded(newComplaint);
      setSubmissionResult(newComplaint);

      // Reset form fields
      setTitle('');
      setDescription('');
      setLocation('');
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[11px] text-slate-500 font-medium block">Category</span>
                <span className="text-sm font-bold text-slate-800">{submissionResult.category}</span>
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
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
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
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 placeholder-slate-400 text-sm shadow-sm"
                />
              </div>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isLocating}
                className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm flex items-center space-x-1.5 transition-colors border border-slate-200"
              >
                {isLocating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                ) : (
                  <MapPin className="w-4 h-4 text-sky-600" />
                )}
                <span className="hidden sm:inline">Use My Location</span>
              </button>
            </div>
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
              <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 max-h-64 flex items-center justify-center">
                <img src={imagePreview} alt="Issue preview" className="object-contain max-h-64 w-full" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-3 right-3 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
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
