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
    recommendedDepartment: {
      type: "string"
    },
    aiReasoning: {
      type: "string"
    }
  },
  required: ["category", "priority", "recommendedDepartment", "aiReasoning"]
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
async function callGeminiRestSingle({ apiKey, model, systemPrompt, userPrompt, imageBase64, timeoutMs = 15000 }) {
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
    response_schema: RESPONSE_SCHEMA,
    max_output_tokens: 400
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
async function callWithRetry({ apiKey, model, systemPrompt, userPrompt, imageBase64 }) {
  try {
    return await callGeminiRestSingle({ apiKey, model, systemPrompt, userPrompt, imageBase64, timeoutMs: 15000 });
  } catch (firstError) {
    const is503 = firstError.status === 503 || (firstError.message && firstError.message.includes("503"));
    const isTimeout = firstError.name === "AbortError" || (firstError.message && firstError.message.includes("Timeout"));

    if (is503 || isTimeout) {
      console.warn(`CivicResolve: ${model} failed with ${is503 ? '503 (High Demand)' : 'Timeout'}. Retrying in 2 seconds...`);
      // Wait 2 seconds before retry
      await new Promise(r => setTimeout(r, 2000));
      return await callGeminiRestSingle({ apiKey, model, systemPrompt, userPrompt, imageBase64, timeoutMs: 15000 });
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
category, priority, recommendedDepartment, aiReasoning (1-2 crisp sentences on urgency and impact).`;

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

      return {
        category,
        priority,
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
