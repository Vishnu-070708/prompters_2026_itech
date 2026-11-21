import { GoogleGenAI } from '@google/genai';

const CATEGORIES = [
  "Roads & Infrastructure",
  "Sanitation & Waste",
  "Street Lighting",
  "Water Supply & Drainage",
  "Public Safety",
  "Other"
];

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

/**
 * Keyword-based fallback classifier when API key is missing or call fails.
 * Guarantees zero crashes and graceful degradation.
 */
export function mockClassifyIssue(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  let category = "Other";
  let priority = "Medium";
  let recommendedDepartment = "General Administration";
  let aiReasoning = "Triaged via local heuristic rules based on keywords.";

  // Regex helpers with word boundary awareness
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

  return {
    category,
    priority,
    recommendedDepartment,
    aiReasoning: `${aiReasoning} (Triaged using fallback heuristic engine).`,
    isMock: true
  };
}

/**
 * Clean and parse strict JSON from Gemini model output
 */
function cleanJsonOutput(text) {
  let cleaned = text.trim();
  // Strip markdown code fences if present (```json ... ``` or ``` ...)
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return JSON.parse(cleaned.trim());
}

/**
 * Direct REST fallback to Gemini in case SDK has browser environment constraints
 */
async function callGeminiRest({ apiKey, model, systemPrompt, userPrompt, imageBase64 }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
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

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        response_mime_type: "application/json"
      }
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) throw new Error("Empty candidate output from Gemini REST");
  return cleanJsonOutput(textOutput);
}

/**
 * Classify issue with Google Gemini API via @google/genai package,
 * with graceful REST backup and zero-crash mock fallback.
 */
export async function triageIssueWithGemini({ title, description, location, selectedCategory, imageBase64, apiKey, modelName }) {
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';
  const envModel = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_MODEL) || 'gemini-3.8-flash';

  const key = apiKey || envKey;
  const model = modelName || envModel || "gemini-3.8-flash";

  // If no API key is provided, use fallback mock
  if (!key || key.trim() === "") {
    console.warn("CivicResolve: No Gemini API Key set. Running in Mock AI mode.");
    return mockClassifyIssue(title, description);
  }

  const systemPrompt = `You are CivicResolve AI, an expert civic triage engine for municipal corporations.
Your task is to analyze reported civic complaints (title, description, location, and optional photo) and produce an authoritative municipal triage assessment.

Available Categories:
- "Roads & Infrastructure"
- "Sanitation & Waste"
- "Street Lighting"
- "Water Supply & Drainage"
- "Public Safety"
- "Other"

Available Priorities:
- "Low" (minor aesthetic or non-urgent maintenance)
- "Medium" (inconvenience, moderate delay permissible)
- "High" (major disruption, traffic blockage, severe sanitation risk)
- "Critical" (imminent threat to life, live electrical wires, flooding, open shafts)

Recommended Department examples:
- "Public Works Department"
- "Municipal Sanitation"
- "Electricity Board"
- "Water Supply Board"
- "Police/Public Safety"
- "General Administration"

STRICT OUTPUT REQUIREMENT:
You MUST respond ONLY with a raw JSON object (no markdown, no backticks, no explanatory chatter) containing these exact keys:
{
  "category": string (must be one of the 6 categories above),
  "priority": string (one of "Low", "Medium", "High", "Critical"),
  "recommendedDepartment": string,
  "aiReasoning": string (1-2 crisp sentences explaining the urgency, public risk, and civic impact)
}`;

  const userPrompt = `Analyze this citizen complaint:
Title: ${title}
Description: ${description}
Location: ${location || "Not specified"}
User Suggested Category: ${selectedCategory || "Auto-detect with AI"}`;

  // 1. Attempt using official @google/genai SDK
  try {
    const ai = new GoogleGenAI({ apiKey: key.trim() });
    const contents = [];

    if (imageBase64 && imageBase64.includes(",")) {
      const [header, base64Data] = imageBase64.split(",");
      const mimeMatch = header.match(/data:([^;]+);base64/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      contents.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
    }

    contents.push({
      text: `${systemPrompt}\n\n${userPrompt}`
    });

    const response = await ai.models.generateContent({
      model: model.trim(),
      contents: contents,
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text;
    const parsed = cleanJsonOutput(responseText);

    const category = CATEGORIES.includes(parsed.category) ? parsed.category : "Roads & Infrastructure";
    const priority = PRIORITIES.includes(parsed.priority) ? parsed.priority : "Medium";
    const recommendedDepartment = parsed.recommendedDepartment || "Public Works Department";
    const aiReasoning = parsed.aiReasoning || "Automated triage performed by Gemini vision-language model.";

    return {
      category,
      priority,
      recommendedDepartment,
      aiReasoning,
      isMock: false
    };

  } catch (sdkError) {
    console.warn("CivicResolve @google/genai SDK failed, attempting direct REST fallback:", sdkError);

    // 2. Direct REST Fallback
    try {
      const parsed = await callGeminiRest({
        apiKey: key.trim(),
        model: model.trim(),
        systemPrompt,
        userPrompt,
        imageBase64
      });

      const category = CATEGORIES.includes(parsed.category) ? parsed.category : "Roads & Infrastructure";
      const priority = PRIORITIES.includes(parsed.priority) ? parsed.priority : "Medium";
      const recommendedDepartment = parsed.recommendedDepartment || "Public Works Department";
      const aiReasoning = parsed.aiReasoning || "Automated triage performed by Gemini vision-language model.";

      return {
        category,
        priority,
        recommendedDepartment,
        aiReasoning,
        isMock: false
      };
    } catch (restError) {
      console.error("CivicResolve Gemini REST also failed:", restError);
      // 3. Graceful fallback to keyword mock so the app NEVER crashes
      const fallback = mockClassifyIssue(title, description);
      fallback.aiReasoning = `${fallback.aiReasoning} (API fallback: ${restError.message || sdkError.message || "Quota/Network"})`;
      return fallback;
    }
  }
}
