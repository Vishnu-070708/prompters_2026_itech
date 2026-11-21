# CivicResolve — "Report. Track. Resolve."

AI-Powered Civic Issue Reporting & Municipal Triage Platform built for the **PromptWars 2026** Hackathon at PSG iTech (in collaboration with GDG on Campus PSG iTech).

![CivicResolve Platform](https://img.shields.io/badge/Status-Production%20Ready-emerald)
![AI-Powered](https://img.shields.io/badge/AI-Google%20Gemini%202.5%20Flash-indigo)
![Built-with](https://img.shields.io/badge/Built%20with-Google%20Antigravity-sky)
![Single Branch](https://img.shields.io/badge/Branch-main%20only-blue)

---

## 🌟 1. Problem Statement
In urban municipalities and smart cities, citizen grievance redressal is severely hindered by:
- **Chaotic, unstructured reporting**: Citizens submit vague descriptions or lack exact municipal categorization.
- **Manual triage bottlenecks**: Human desk officers must read thousands of daily complaints, manually identify the responsible department, and rank urgency.
- **Critical delay in hazardous scenarios**: Life-threatening civic emergencies (e.g., fractured high-pressure water mains, live snapped power lines, open storm drain trenches near primary schools) sit in the same queue as routine non-urgent cosmetic tasks.
- **Opaque resolution tracking**: Citizens lack visibility into which department is assigned, whether engineers inspected the site, or what real-world actions were taken.

---

## 💡 2. The CivicResolve Solution
**CivicResolve** transforms civic grievance reporting into an instantaneous, AI-directed municipal workflow:
1. **Citizen Submissions with Multimodal Analysis**: Citizens report issues using natural language, geolocation, and photos.
2. **Instant Gemini AI Triage**: Within 1.2 seconds, Google Gemini classifies the issue into one of 6 official municipal categories, assigns an objective priority level (*Low*, *Medium*, *High*, *Critical*), routes it to the specific municipal agency, and synthesizes a 1–2 sentence civic impact reasoning.
3. **Public Transparency & Tracking**: A public real-time dashboard with search, status filters, and visual 3-step resolution progress trackers (`Reported` ➔ `In Progress` ➔ `Resolved`).
4. **Municipal Official Command Center**: Secured administrative console for ward officers to inspect AI triages, update operational statuses, reassign departments, and publish official site notes.

---

## 🚀 3. Key Features

- **Multimodal AI Citizen Grievance Portal**:
  - Auto-geolocation tagging with browser Geolocation API.
  - Image upload with instant preview and base64 transmission to Gemini vision-language capabilities.
  - Strict JSON schema enforcement via `@google/genai`.
  - Generated Tracking ID (e.g., `CR-1042`) with 1-click clipboard copy.

- **Resilient AI Execution & Graceful Fallback**:
  - Connects to Google Gemini API via official `@google/genai` SDK using `VITE_GEMINI_API_KEY` and `VITE_GEMINI_MODEL` (`gemini-2.5-flash`).
  - **Zero-Crash Heuristic Mock Engine**: If no API key is configured or network quota limits are hit, the system seamlessly activates an embedded keyword-based municipal classifier.
  - UI visual badges distinguish `Gemini 2.5 Active` vs. `Mock AI mode`.

- **Public Tracking & Filter Dashboard**:
  - Real-time KPI counters (`Total Filed`, `Reported`, `In Progress`, `Resolved`).
  - Multi-parameter search by Tracking ID, locality keywords, or department name.
  - Color-coded priority badges and interactive 3-step progress steppers.
  - Pre-seeded with 6 realistic Coimbatore civic complaints (Peelamedu, RS Puram, Gandhipuram, Singanallur, Saravanampatti).

- **Municipal Admin Dashboard (Judge PIN: `admin123`)**:
  - Demo PIN gate with 1-click judge bypass for rapid hackathon evaluation.
  - Departmental workload allocation metrics.
  - Real-time status toggling and official municipal dispatch note publishing that immediately updates the citizen tracking view.

- **Runtime In-Browser AI Configuration**:
  - Settings modal (gear icon) allowing judges or evaluators to enter their own Google Gemini API key and select models directly in `localStorage` without altering environment files.

---

## 🛠️ 4. Tech Stack

- **Frontend Core**: React 18, Vite 6, JavaScript (ES Modules)
- **Styling & Design System**: Tailwind CSS, Lucide React Icon Suite
- **Generative AI & LLM**: Google Gemini (`gemini-2.5-flash`) via the official `@google/genai` SDK
- **Data Persistence**: Browser `localStorage` (100% serverless, zero external database setup needed)
- **Deployment & Architecture**: Pure client-side SPA, lightweight repository footprint (< 5 MB)

---

## 🤖 5. Role of Google Gemini & Google Antigravity

- **Google Gemini**:
  - Acts as the cognitive triage engine. It analyzes natural language citizen descriptions alongside photo evidence, detecting spatial hazards, estimating municipal liability, and producing structured JSON metadata for department routing.
- **Google Antigravity**:
  - Used as the agentic coding environment to scaffold, implement, debug, and package the complete full-stack civic application in a rapid 30-minute session.
  - Managed single-branch Git discipline, automated package integration, and ensured strict conformance to hackathon submission requirements.

---

## 💻 6. Setup & Installation Instructions

Follow these 3 simple steps to run CivicResolve locally:

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm (v9.0.0 or higher)

### 1. Clone & Install Dependencies
\`\`\`bash
git clone https://github.com/Vishnu-070708/prompters_2026_itech.git
cd prompters_2026_itech
npm install
\`\`\`

### 2. Configure Environment (Optional)
CivicResolve comes with a zero-setup Mock AI mode out of the box. To enable live Gemini AI:
\`\`\`bash
cp .env.example .env
\`\`\`
Edit `.env` and add your Gemini API Key:
\`\`\`env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_MODEL=gemini-2.5-flash
\`\`\`
*(Alternatively, you can just start the app and paste your API key into the Settings modal via the gear icon in the top navigation bar!)*

### 3. Start Development Server
\`\`\`bash
npm run dev
\`\`\`
Open your browser at `http://localhost:5173`.

---

## 🎯 7. Quick Demo & Evaluation Guide for Judges

1. **Explore Existing Seed Complaints**:
   - Go to the **Track Issues** tab.
   - Review pre-loaded Coimbatore civic issues (e.g. `CR-1042` pothole on Avinashi Road, `CR-1045` water pipeline burst on Trichy Road).
   - Test filters (e.g., select status `Reported` or filter by `Critical` priority).
2. **File a New Citizen Complaint**:
   - Navigate to **Report Issue**.
   - Click **Use My Location** (auto-populates Coimbatore coordinates).
   - Enter a title like *"Live electric wire sparking near bus stop"* and description *"Heavy rain caused wire to snap and spark onto the pavement."*
   - Leave Category on *"Auto-detect with AI"* and click **Submit & AI Triage Issue**.
   - Observe the instant AI triage card with assigned department (*Electricity Board / Police*), priority (*Critical*), and reasoning.
3. **Admin Dispatch & Resolution**:
   - Click on the **Admin** tab.
   - Click the yellow **1-Click Instant Judge Login** button (or enter PIN `admin123`).
   - Find your newly created complaint.
   - Change Status from `Reported` to `In Progress` or `Resolved`.
   - Add an official note: *"Linemen team dispatched. Wire isolated at 08:45 AM."* and click **Save Note**.
   - Switch back to **Track Issues** and see your changes updated in real time with the updated 3-step progress bar!

---

## 📄 License
Open source under the MIT License. Developed for PromptWars 2026.
