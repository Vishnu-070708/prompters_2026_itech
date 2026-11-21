import { GoogleGenAI } from '@google/genai';

/**
 * EDITABLE MODEL FALLBACK LIST (Order of Priority):
 * Edit models here in one place. The engine tries VITE_GEMINI_MODEL
 * (or session-cached working model) first, then falls back through this list.
 */
export const MODEL_FALLBACK_LIST = [
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite"
];

const CATEGORIES = [
  "Roads & Infrastructure",
  "Sanitation & Waste",
  "Street Lighting",
  "Water Supply & Drainage",
  "Public Safety",
  "Other"
];

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: CATEGORIES
    },
    priority: {
      type: "string",
      enum: PRIORITIES
    },
    severityScore: {
      type: "integer",
      description: "Severity score from 1 to 10 where 1 is minimal inconvenience and 10 is immediate life-threatening emergency"
    },
    estimatedResolutionTime: {
      type: "string",
      description: "Estimated resolution time, e.g. '24-48 hours', '2-6 hours', '3-5 days'"
    },
    recommendedDepartment: {
      type: "string"
    },
    aiReasoning: {
      type: "string"
    }
  },
  required: ["category", "priority", "severityScore", "estimatedResolutionTime", "recommendedDepartment", "aiReasoning"]
};

const SNAP_TO_FILL_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "Concise title for the civic issue shown in the photo"
    },
    description: {
      type: "string",
      description: "Detailed description of the issue shown in the photo"
    },
    category: {
      type: "string",
      enum: CATEGORIES
    }
  },
  required: ["title", "description", "category"]
};

const DISPATCH_SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    summaryTitle: {
      type: "string",
      description: "Directive headline for today's municipal daily dispatch"
    },
    overview: {
      type: "string",
      description: "Brief 1-2 sentence executive summary of open high/critical incidents"
    },
    departments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          department: {
            type: "string",
            description: "Municipal department name"
          },
          actionPlan: {
            type: "string",
            description: "Clear, concrete dispatch action plan steps for this department"
          },
          complaintIds: {
            type: "array",
            items: { type: "string" }
          },
          recommendedCrew: {
            type: "string",
            description: "Recommended crew and equipment dispatched"
          }
        },
        required: ["department", "actionPlan", "complaintIds"]
      }
    }
  },
  required: ["summaryTitle", "overview", "departments"]
};

// In-memory + sessionStorage cache for whichever model worked for the session
let inMemoryCachedWorkingModel = null;

export function getCachedWorkingModel() {
  if (inMemoryCachedWorkingModel) return inMemoryCachedWorkingModel;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = window.sessionStorage.getItem('civic_cached_working_model');
      if (stored) {
        inMemoryCachedWorkingModel = stored;
        return stored;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function setCachedWorkingModel(modelName) {
  inMemoryCachedWorkingModel = modelName;
  try {
    if (typeof window !== 'undefined') {
      if (window.sessionStorage) {
        window.sessionStorage.setItem('civic_cached_working_model', modelName);
      }
      if (window.localStorage) {
        window.localStorage.setItem('civic_last_answered_model', modelName);
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Keyword-based fallback classifier when all models/retries fail or no key is provided.
 */
export function mockClassifyIssue(title, description, reason = "Local Heuristic") {
  const text = `${title} ${description}`.toLowerCase();
  
  let category = "Other";
  let priority = "Medium";
  let recommendedDepartment = "General Administration";
  let aiReasoning = "Triaged via local heuristic rules based on keywords.";

  const matches = (pattern) => pattern.test(text);

  // 1. Street Lighting
  if (matches(/\b(streetlight|streetlights|street light|street lights|lamp post|sodium lamp|dark street|pitch dark|illumination)\b/)) {
    category = "Street Lighting";
    recommendedDepartment = "Electricity Board";
    priority = matches(/\b(pitch|women|danger|junction|accident|blackout|critical)\b/) ? "High" : "Medium";
    aiReasoning = "Inadequate nighttime illumination compromises urban security and vehicle visibility.";
  }
  // 2. Public Safety (live wires, electric shock, trees falling, fire)
  else if (matches(/\b(wire|wires|power line|electric|electrical|shock|electrocution|spark|sparks|fire|flames|fallen tree|tree branch|banyan|collapsed|hazard|threat)\b/)) {
    category = "Public Safety";
    recommendedDepartment = "Police/Public Safety";
    priority = "Critical";
    aiReasoning = "Direct life-safety hazard identified requiring urgent administrative and emergency intervention.";
  }
  // 3. Water Supply & Drainage
  else if (matches(/\b(water|pipe|pipeline|leak|leakage|burst|drain|drainage|sewage|sewer|flood|flooding|gutter|potable)\b/)) {
    category = "Water Supply & Drainage";
    recommendedDepartment = "Water Supply Board";
    priority = matches(/\b(burst|drinking|potable|flood|flooding|severe|gushing)\b/) ? "Critical" : "High";
    aiReasoning = "Water distribution failure or drainage blockage can cause urban inundation and waterborne infections.";
  }
  // 4. Sanitation & Waste
  else if (matches(/\b(garbage|waste|trash|stench|smell|bin|bins|dump|debris|litter|refuse|maggots)\b/)) {
    category = "Sanitation & Waste";
    recommendedDepartment = "Municipal Sanitation";
    priority = matches(/\b(overflow|overflowing|hospital|school|days|disease|stench)\b/) ? "High" : "Medium";
    aiReasoning = "Accumulated organic or civic waste poses biological contamination and public hygiene risks.";
  }
  // 5. Roads & Infrastructure
  else if (matches(/\b(pothole|potholes|road|roads|highway|bridge|asphalt|pavement|footpath|sidewalk|slab|crater|tar)\b/)) {
    category = "Roads & Infrastructure";
    recommendedDepartment = "Public Works Department";
    priority = matches(/\b(deep|accident|accidents|danger|dangerous|busy|artery|crater)\b/) ? "High" : "Medium";
    aiReasoning = "Road structural flaws directly endanger motor traffic and pedestrian commute safety.";
  }

  let severityScore = 5;
  let estimatedResolutionTime = "3-5 days";

  if (priority === "Critical") {
    severityScore = matches(/\b(wire|wires|power line|shock|electrocution|fire|flames)\b/) ? 10 : 9;
    estimatedResolutionTime = "2-6 hours";
  } else if (priority === "High") {
    severityScore = matches(/\b(deep|danger|dangerous|artery|hospital|flood|burst)\b/) ? 8 : 7;
    estimatedResolutionTime = "24-48 hours";
  } else if (priority === "Medium") {
    severityScore = 5;
    estimatedResolutionTime = "3-5 days";
  } else {
    severityScore = 3;
    estimatedResolutionTime = "5-7 days";
  }

  const modelBadge = `Mock AI mode (${reason})`;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('civic_last_answered_model', modelBadge);
    }
  } catch {
    // ignore
  }

  return {
    category,
    priority,
    severityScore,
    estimatedResolutionTime,
    recommendedDepartment,
    aiReasoning: `${aiReasoning} (${reason})`,
    isMock: true,
    mockReason: reason,
    modelUsed: modelBadge,
    aiMode: modelBadge
  };
}

/**
 * Clean and parse strict JSON from Gemini model output
 */
function cleanJsonOutput(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return JSON.parse(cleaned.trim());
}

/**
 * Single attempt to call Gemini via REST API with 15s timeout
 */
async function callGeminiRestSingle({ apiKey, model, systemPrompt, userPrompt, imageBase64, responseSchema = RESPONSE_SCHEMA, timeoutMs = 15000 }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Timeout: ${model} call exceeded ${timeoutMs / 1000}s`));
  }, timeoutMs);

  const parts = [];
  if (imageBase64 && imageBase64.includes(",")) {
    const [header, base64Data] = imageBase64.split(",");
    const mimeMatch = header.match(/data:([^;]+);base64/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: base64Data
      }
    });
  }

  parts.push({
    text: `${systemPrompt}\n\n${userPrompt}`
  });

  // Configure generation options
  const generationConfig = {
    response_mime_type: "application/json",
    response_schema: responseSchema,
    max_output_tokens: 500
  };

  // Only pass thinking_config to models that support reasoning (e.g. 3.8-flash)
  if (model.includes("3.8")) {
    generationConfig.thinking_config = {
      thinking_budget: 0
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error(`HTTP ${response.status}: ${errorText}`);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) throw new Error("Empty candidate output from Gemini REST");
    return cleanJsonOutput(textOutput);

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Attempt call with 1 retry after 2 seconds if status is 503 or timeout
 */
async function callWithRetry({ apiKey, model, systemPrompt, userPrompt, imageBase64, responseSchema = RESPONSE_SCHEMA }) {
  try {
    return await callGeminiRestSingle({ apiKey, model, systemPrompt, userPrompt, imageBase64, responseSchema, timeoutMs: 15000 });
  } catch (firstError) {
    const is503 = firstError.status === 503 || (firstError.message && firstError.message.includes("503"));
    const isTimeout = firstError.name === "AbortError" || (firstError.message && firstError.message.includes("Timeout"));

    if (is503 || isTimeout) {
      console.warn(`CivicResolve: ${model} failed with ${is503 ? '503 (High Demand)' : 'Timeout'}. Retrying in 2 seconds...`);
      // Wait 2 seconds before retry
      await new Promise(r => setTimeout(r, 2000));
      return await callGeminiRestSingle({ apiKey, model, systemPrompt, userPrompt, imageBase64, responseSchema, timeoutMs: 15000 });
    }
    // If other error, throw immediately to try next model in fallback list
    throw firstError;
  }
}

/**
 * Main Triage Function:
 * 1. Checks session cache for last working model
 * 2. Tries candidate models in order: cached model -> VITE_GEMINI_MODEL -> MODEL_FALLBACK_LIST
 * 3. On 503/timeout, retries once after 2 seconds
 * 4. Caches working model for the session
 * 5. Falls back to keyword mock if all models fail
 */
export async function triageIssueWithGemini({ title, description, location, selectedCategory, imageBase64, apiKey, modelName }) {
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';
  const envModel = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_MODEL) || 'gemini-flash-lite-latest';

  const key = apiKey || envKey;
  const configuredModel = modelName || envModel || "gemini-flash-lite-latest";

  // If no API key is provided, use fallback mock immediately
  if (!key || key.trim() === "") {
    console.warn("CivicResolve: No Gemini API Key set. Running in Mock AI mode.");
    return mockClassifyIssue(title, description, "No API Key");
  }

  // Build ordered candidate list
  const sessionCached = getCachedWorkingModel();
  const candidateModels = [];

  // Prioritize session-cached model if one succeeded previously in this session
  if (sessionCached && !candidateModels.includes(sessionCached)) {
    candidateModels.push(sessionCached);
  }
  // Then the user configured model
  if (configuredModel && !candidateModels.includes(configuredModel)) {
    candidateModels.push(configuredModel);
  }
  // Then append all models from the fallback list
  for (const m of MODEL_FALLBACK_LIST) {
    if (!candidateModels.includes(m)) {
      candidateModels.push(m);
    }
  }

  const systemPrompt = `You are CivicResolve AI, an expert municipal triage engine.
Analyze the citizen civic complaint and return strict JSON assessment.

Categories:
- "Roads & Infrastructure"
- "Sanitation & Waste"
- "Street Lighting"
- "Water Supply & Drainage"
- "Public Safety"
- "Other"

Priorities: "Low", "Medium", "High", "Critical"

STRICT OUTPUT REQUIREMENT:
Respond ONLY with a JSON object conforming to the schema with:
category, priority, severityScore (integer 1-10), estimatedResolutionTime (e.g. "24-48 hours"), recommendedDepartment, aiReasoning (1-2 crisp sentences on urgency and impact).`;

  const userPrompt = `Analyze this citizen complaint:
Title: ${title}
Description: ${description}
Location: ${location || "Not specified"}
User Suggested Category: ${selectedCategory || "Auto-detect with AI"}`;

  let lastError = null;

  // Iterate through fallback models
  for (const modelToTry of candidateModels) {
    try {
      console.log(`CivicResolve: Attempting triage with model: ${modelToTry}`);
      const parsed = await callWithRetry({
        apiKey: key.trim(),
        model: modelToTry,
        systemPrompt,
        userPrompt,
        imageBase64
      });

      // Cache this working model for the session
      setCachedWorkingModel(modelToTry);
      console.log(`CivicResolve: Successfully triaged using: ${modelToTry}`);

      const category = CATEGORIES.includes(parsed.category) ? parsed.category : "Roads & Infrastructure";
      const priority = PRIORITIES.includes(parsed.priority) ? parsed.priority : "Medium";
      const recommendedDepartment = parsed.recommendedDepartment || "Public Works Department";
      const aiReasoning = parsed.aiReasoning || "Automated triage performed by Gemini model.";

      const rawScore = parseInt(parsed.severityScore, 10);
      const defaultScore = priority === "Critical" ? 9 : priority === "High" ? 7 : priority === "Medium" ? 5 : 3;
      const severityScore = (!isNaN(rawScore) && rawScore >= 1 && rawScore <= 10) ? rawScore : defaultScore;

      const defaultTime = priority === "Critical" ? "2-6 hours" : priority === "High" ? "24-48 hours" : priority === "Medium" ? "3-5 days" : "5-7 days";
      const estimatedResolutionTime = (parsed.estimatedResolutionTime && String(parsed.estimatedResolutionTime).trim()) || defaultTime;

      return {
        category,
        priority,
        severityScore,
        estimatedResolutionTime,
        recommendedDepartment,
        aiReasoning,
        isMock: false,
        modelUsed: modelToTry,
        aiMode: modelToTry
      };

    } catch (err) {
      lastError = err;
      console.warn(`CivicResolve: Model ${modelToTry} failed:`, err.message);
      // Continue to next model in fallback list
    }
  }

  // All models failed -> Log exact error to browser console
  console.error("CivicResolve: All Gemini models in fallback list failed. Exact last error:", lastError);

  const isTimeout = lastError?.name === "AbortError" || (lastError?.message && lastError.message.includes("Timeout"));
  const shortReason = isTimeout ? "Timeout" : (lastError?.status === 503 ? "All Models Busy (503)" : "API Error");

  const fallback = mockClassifyIssue(title, description, shortReason);
  fallback.aiReasoning = `${fallback.aiReasoning} (All fallback models exhausted: ${lastError?.message || shortReason})`;
  return fallback;
}

/**
 * Mock fallback for photo analysis (Snap-to-Fill)
 */
export function mockAnalyzePhoto(reason = "Local Heuristic") {
  return {
    title: "Damaged roadway and severe pothole crater",
    description: "Visual analysis of the uploaded photo reveals extensive pavement cracking and a dangerous pothole crater creating vehicular transit hazards.",
    category: "Roads & Infrastructure",
    isMock: true,
    mockReason: reason,
    modelUsed: `Mock AI mode (${reason})`
  };
}

/**
 * Snap-to-Fill: Analyzes uploaded photo using Gemini Vision to extract
 * title, description, and category.
 */
export async function analyzePhotoWithGemini({ imageBase64, apiKey, modelName }) {
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';
  const envModel = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_MODEL) || 'gemini-flash-lite-latest';

  const key = apiKey || envKey;
  const configuredModel = modelName || envModel || "gemini-flash-lite-latest";

  if (!key || key.trim() === "") {
    console.warn("CivicResolve: No Gemini API Key for photo analysis. Using Mock Vision analysis.");
    return mockAnalyzePhoto("No API Key");
  }

  const sessionCached = getCachedWorkingModel();
  const candidateModels = [];

  if (sessionCached && !candidateModels.includes(sessionCached)) {
    candidateModels.push(sessionCached);
  }
  if (configuredModel && !candidateModels.includes(configuredModel)) {
    candidateModels.push(configuredModel);
  }
  for (const m of MODEL_FALLBACK_LIST) {
    if (!candidateModels.includes(m)) {
      candidateModels.push(m);
    }
  }

  const systemPrompt = `You are CivicResolve AI vision assistant.
Examine the uploaded civic complaint photograph and accurately determine what municipal problem is shown.
Return strict JSON with:
title: A crisp, clear issue title (5-10 words)
description: A 2-3 sentence description detailing the visible damage, safety hazard, and context
category: Exactly one of: "Roads & Infrastructure", "Sanitation & Waste", "Street Lighting", "Water Supply & Drainage", "Public Safety", "Other"`;

  const userPrompt = "Analyze this uploaded photo of a municipal civic issue and determine its title, description, and category.";

  let lastError = null;

  for (const modelToTry of candidateModels) {
    try {
      console.log(`CivicResolve: Attempting Snap-to-Fill photo analysis with: ${modelToTry}`);
      const parsed = await callWithRetry({
        apiKey: key.trim(),
        model: modelToTry,
        systemPrompt,
        userPrompt,
        imageBase64,
        responseSchema: SNAP_TO_FILL_SCHEMA
      });

      setCachedWorkingModel(modelToTry);
      const validCategory = CATEGORIES.includes(parsed.category) && parsed.category !== "Auto-detect with AI"
        ? parsed.category
        : "Roads & Infrastructure";

      return {
        title: parsed.title || "Detected Civic Issue",
        description: parsed.description || "Issue identified from uploaded image.",
        category: validCategory,
        isMock: false,
        modelUsed: modelToTry
      };
    } catch (err) {
      lastError = err;
      console.warn(`CivicResolve Snap-to-Fill: Model ${modelToTry} failed:`, err.message);
    }
  }

  console.error("CivicResolve Snap-to-Fill: All models failed, falling back to mock vision:", lastError);
  return mockAnalyzePhoto(lastError?.message || "Fallback");
}

/**
 * Mock fallback for AI Daily Dispatch Summary
 */
export function mockDailyDispatchSummary(openComplaints, reason = "Local Heuristic") {
  const grouped = {};
  openComplaints.forEach(c => {
    const dept = c.recommendedDepartment || "General Administration";
    if (!grouped[dept]) grouped[dept] = [];
    grouped[dept].push(c);
  });

  const departments = Object.entries(grouped).map(([department, items]) => {
    const ids = items.map(c => c.id);
    let plan = `Inspect and execute priority remediation for ${items.length} open high-priority issue(s).`;
    let crew = "Rapid Response Municipal Unit";

    if (department.includes("Water")) {
      plan = `Isolate section gate valves, excavate compromised roadway sub-base, and install high-pressure pipe repair sleeve.`;
      crew = "Pipeline Emergency Repair Team (JCB + Dewatering Pump + Shoring)";
    } else if (department.includes("Roads") || department.includes("Public Works")) {
      plan = `Cordon off severe craters with reflective safety barriers. Dispatch rapid hot-mix asphalt patching team for surface leveling.`;
      crew = "PWD Road Maintenance Crew (Hot-Mix Asphalt Paver + Roller)";
    } else if (department.includes("Sanitation")) {
      plan = `Reroute compactor truck to clear overflowing community waste bins immediately. Apply lime powder and pest disinfectant.`;
      crew = "Solid Waste Collection Team + Sanitation Sprayer";
    } else if (department.includes("Electricity")) {
      plan = `Deploy high-reach bucket truck to inspect non-functional streetlights and isolate vulnerable overhead cable connections.`;
      crew = "Linemen Emergency Unit (Boom Lift Truck + Cable Splicer)";
    } else if (department.includes("Police") || department.includes("Safety")) {
      plan = `Establish security perimeter around structural or electrical hazards and manage detour traffic around danger zones.`;
      crew = "Public Safety Quick Response Patrol";
    }

    return {
      department,
      actionPlan: plan,
      complaintIds: ids,
      recommendedCrew: crew
    };
  });

  return {
    summaryTitle: `Municipal Emergency Daily Dispatch Plan (${reason})`,
    overview: `${openComplaints.length} open high and critical priority civic issue(s) prioritized for immediate field action.`,
    departments,
    isMock: true,
    mockReason: reason,
    generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}

/**
 * AI Daily Dispatch Summary: sends all open High/Critical complaints to Gemini
 * and returns an action plan grouped by department.
 */
export async function generateDailyDispatchSummary({ complaints, apiKey, modelName }) {
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';
  const envModel = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_MODEL) || 'gemini-flash-lite-latest';

  const key = apiKey || envKey;
  const configuredModel = modelName || envModel || "gemini-flash-lite-latest";

  // Filter for open high/critical complaints
  const openHighCritical = (complaints || []).filter(c => 
    c.status !== "Resolved" && (c.priority === "High" || c.priority === "Critical")
  );

  if (openHighCritical.length === 0) {
    return {
      summaryTitle: "All Critical Issues Resolved",
      overview: "There are currently no open High or Critical priority complaints in the docket.",
      departments: [],
      isMock: false,
      generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  if (!key || key.trim() === "") {
    console.warn("CivicResolve: No Gemini API Key for dispatch summary. Using mock fallback.");
    return mockDailyDispatchSummary(openHighCritical, "No API Key");
  }

  const sessionCached = getCachedWorkingModel();
  const candidateModels = [];

  if (sessionCached && !candidateModels.includes(sessionCached)) {
    candidateModels.push(sessionCached);
  }
  if (configuredModel && !candidateModels.includes(configuredModel)) {
    candidateModels.push(configuredModel);
  }
  for (const m of MODEL_FALLBACK_LIST) {
    if (!candidateModels.includes(m)) {
      candidateModels.push(m);
    }
  }

  const systemPrompt = `You are CivicResolve Chief Municipal Dispatch Officer.
Review the list of active High and Critical citizen complaints and synthesize a cohesive Daily Dispatch Action Plan grouped by department.
Return strict JSON matching the schema with:
summaryTitle: Directive headline (e.g., "Daily Municipal Emergency Action Directive")
overview: Executive summary of critical situations and immediate operational risks
departments: Array of objects, each containing:
  - department: Name of municipal department
  - actionPlan: 2-3 specific, actionable steps the department's field crews must execute today
  - complaintIds: Array of complaint IDs (e.g. ["CR-1042", "CR-1045"])
  - recommendedCrew: Equipment/personnel needed (e.g. "JCB + PWD Asphalt Patching Unit")`;

  const complaintsList = openHighCritical.map(c => 
    `[${c.id}] ${c.title} | Priority: ${c.priority} | Severity: ${c.severityScore || 'N/A'}/10 | Dept: ${c.recommendedDepartment} | Location: ${c.location} | Details: ${c.description}`
  ).join("\n");

  const userPrompt = `Here are the active High and Critical civic complaints requiring immediate dispatch:\n\n${complaintsList}\n\nSynthesize the daily dispatch action plan grouped by department.`;

  let lastError = null;

  for (const modelToTry of candidateModels) {
    try {
      console.log(`CivicResolve: Generating daily dispatch summary with: ${modelToTry}`);
      const parsed = await callWithRetry({
        apiKey: key.trim(),
        model: modelToTry,
        systemPrompt,
        userPrompt,
        responseSchema: DISPATCH_SUMMARY_SCHEMA
      });

      setCachedWorkingModel(modelToTry);
      return {
        summaryTitle: parsed.summaryTitle || "Municipal Daily Dispatch Action Plan",
        overview: parsed.overview || "High and Critical complaints prioritized for departmental mobilization.",
        departments: Array.isArray(parsed.departments) ? parsed.departments : [],
        isMock: false,
        modelUsed: modelToTry,
        generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    } catch (err) {
      lastError = err;
      console.warn(`CivicResolve Dispatch Summary: Model ${modelToTry} failed:`, err.message);
    }
  }

  console.error("CivicResolve Dispatch Summary: All models failed, using mock fallback:", lastError);
  return mockDailyDispatchSummary(openHighCritical, lastError?.message || "Fallback");
}
