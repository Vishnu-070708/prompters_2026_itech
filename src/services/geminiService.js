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

/**
 * Keyword-based fallback classifier when API key is missing or call fails.
 * Guarantees zero crashes and graceful degradation.
 */
export function mockClassifyIssue(title, description, reason = "Local Heuristic") {
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
    aiReasoning: `${aiReasoning} (${reason})`,
    isMock: true,
    mockReason: reason,
    aiMode: `Mock AI mode (${reason})`
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
 * Direct REST fallback to Gemini with AbortController timeout & minimal thinking
 */
async function callGeminiRest({ apiKey, model, systemPrompt, userPrompt, imageBase64, signal }) {
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
    signal,
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        response_mime_type: "application/json",
        response_schema: RESPONSE_SCHEMA,
        max_output_tokens: 400,
        thinking_config: {
          thinking_budget: 0
        }
      }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) throw new Error("Empty candidate output from Gemini REST");
  return cleanJsonOutput(textOutput);
}

/**
 * Classify issue with Google Gemini API:
 * - 15-second AbortController timeout
 * - Minimal/zero thinking budget (thinkingBudget: 0)
 * - Strict JSON responseSchema & maxOutputTokens: 400
 * - Logs exact errors to browser console
 * - Graceful fallback to Mock AI mode with short reason badge
 */
export async function triageIssueWithGemini({ title, description, location, selectedCategory, imageBase64, apiKey, modelName }) {
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';
  const envModel = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_MODEL) || 'gemini-3.8-flash';

  const key = apiKey || envKey;
  const model = modelName || envModel || "gemini-3.8-flash";

  // If no API key is provided, use fallback mock immediately
  if (!key || key.trim() === "") {
    console.warn("CivicResolve: No Gemini API Key set. Running in Mock AI mode.");
    return mockClassifyIssue(title, description, "No API Key");
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

  // Set up 15-second AbortController
  const controller = new AbortController();
  const timeoutMs = 15000;
  let timeoutTriggered = false;

  const timeoutId = setTimeout(() => {
    timeoutTriggered = true;
    controller.abort(new Error("Gemini call timed out after 15 seconds"));
  }, timeoutMs);

  const timeoutPromise = new Promise((_, reject) => {
    controller.signal.addEventListener("abort", () => {
      reject(new Error("Gemini call timed out after 15 seconds"));
    });
  });

  try {
    // Primary attempt: @google/genai SDK
    const runSdkCall = async () => {
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
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          maxOutputTokens: 400,
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      });

      const responseText = response.text;
      return cleanJsonOutput(responseText);
    };

    let parsed;
    try {
      parsed = await Promise.race([runSdkCall(), timeoutPromise]);
    } catch (sdkError) {
      if (timeoutTriggered || controller.signal.aborted) {
        throw sdkError;
      }
      console.warn("CivicResolve: @google/genai SDK error, falling back to direct REST API:", sdkError);
      // Secondary attempt: Direct REST with abort signal
      parsed = await Promise.race([
        callGeminiRest({
          apiKey: key.trim(),
          model: model.trim(),
          systemPrompt,
          userPrompt,
          imageBase64,
          signal: controller.signal
        }),
        timeoutPromise
      ]);
    }

    clearTimeout(timeoutId);

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
      aiMode: "Gemini 3.8 Flash"
    };

  } catch (error) {
    clearTimeout(timeoutId);
    // Log the exact error to the browser console as requested
    console.error("CivicResolve Gemini API exact error:", error);

    const isTimeout = timeoutTriggered || error.name === "AbortError" || (error.message && error.message.includes("timed out"));
    const shortReason = isTimeout ? "15s Timeout" : (error.message && error.message.includes("404") ? "Model Unavailable" : "API Error");

    const fallback = mockClassifyIssue(title, description, shortReason);
    fallback.aiReasoning = `${fallback.aiReasoning} (Fallback reason: ${error.message || shortReason})`;
    return fallback;
  }
}
