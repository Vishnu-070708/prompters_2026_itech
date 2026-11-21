import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SettingsModal from './components/SettingsModal';
import ReportView from './components/ReportView';
import TrackView from './components/TrackView';
import AdminView from './components/AdminView';
import { INITIAL_COMPLAINTS } from './data/sampleComplaints';

export default function App() {
  const [currentView, setCurrentView] = useState('track'); // 'report' | 'track' | 'admin'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // API Key & Model from localStorage or env
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('civic_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
  });
  
  const [modelName, setModelName] = useState(() => {
    return localStorage.getItem('civic_gemini_model') || import.meta.env.VITE_GEMINI_MODEL || 'gemini-flash-lite-latest';
  });

  const [lastAnsweredModel, setLastAnsweredModel] = useState(() => {
    return localStorage.getItem('civic_last_answered_model') || 'None yet';
  });

  // Complaints state persisted in localStorage
  const [complaints, setComplaints] = useState(() => {
    try {
      const stored = localStorage.getItem('civic_complaints_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn("Error reading localStorage complaints:", err);
    }
    return INITIAL_COMPLAINTS;
  });

  // Save complaints to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('civic_complaints_data', JSON.stringify(complaints));
    } catch (err) {
      console.warn("Failed to persist complaints in localStorage:", err);
    }
  }, [complaints]);

  // Handler to add a new complaint
  const handleAddComplaint = (newComplaint) => {
    setComplaints((prev) => [newComplaint, ...prev]);
    if (newComplaint.aiMode) {
      setLastAnsweredModel(newComplaint.aiMode);
    }
  };

  // Handler for admin updating a complaint
  const handleUpdateComplaint = (id, updates) => {
    setComplaints((prev) => 
      prev.map((item) => item.id === id ? { ...item, ...updates } : item)
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenSettings={() => setIsSettingsOpen(true)}
        hasApiKey={Boolean(apiKey && apiKey.trim() !== '')}
        complaintsCount={complaints.length}
      />

      {/* Main Content Views */}
      <main className="flex-1">
        {currentView === 'report' && (
          <ReportView
            onComplaintAdded={handleAddComplaint}
            onViewTrack={() => setCurrentView('track')}
            apiKey={apiKey}
            modelName={modelName}
          />
        )}

        {currentView === 'track' && (
          <TrackView
            complaints={complaints}
            onSelectReport={() => setCurrentView('report')}
          />
        )}

        {currentView === 'admin' && (
          <AdminView
            complaints={complaints}
            onUpdateComplaint={handleUpdateComplaint}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        setApiKey={setApiKey}
        modelName={modelName}
        setModelName={setModelName}
        lastAnsweredModel={lastAnsweredModel}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            <strong>CivicResolve</strong> — AI-Powered Civic Issue Reporting & Triage Platform
          </div>
          <div>
            Built with <strong>Google Gemini</strong> on <strong>Google Antigravity</strong> • PromptWars 2026
          </div>
        </div>
      </footer>

    </div>
  );
}
