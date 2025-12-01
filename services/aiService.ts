
import { GoogleGenAI } from '@google/genai';
import Cerebras from '@cerebras/cerebras_cloud_sdk';

// We no longer instantiate a global 'ai' client here because the key might change
// based on user input in the browser. We create a helper to get the client.

const artModelName = 'gemini-2.5-flash';
const textModelName = 'gemini-2.5-flash-lite';
const visionModelName = 'gemini-2.5-flash';

// OpenRouter Configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROK_MODEL = 'x-ai/grok-4.1-fast:free';

// Cerebras Configuration
const CEREBRAS_GPT_MODEL = 'gpt-oss-120b';
const CEREBRAS_ZAI_MODEL = 'zai-glm-4.6';

/**
 * Art-direction toggle for ASCII art generation.
 */
const ENABLE_THINKING_FOR_ASCII_ART = false;

export interface AsciiArtData {
  art: string;
  text?: string;
}

/**
 * Helper to initialize the AI client dynamically.
 */
function getAIClient(apiKey?: string): GoogleGenAI {
  // 1. Try passed key, 2. Try Env var
  const key = apiKey || process.env.API_KEY;
  if (!key) {
    throw new Error('Gemini API Key is missing. Please add it in the Settings.');
  }
  return new GoogleGenAI({ apiKey: key });
}

/**
 * Helper to initialize the Cerebras client dynamically.
 */
function getCerebrasClient(apiKey?: string): Cerebras {
  if (!apiKey) {
    throw new Error('Cerebras API Key is missing. Please add it in the Settings.');
  }
  return new Cerebras({
    apiKey: apiKey,
  });
}

/**
 * Helper to convert a File object to a Base64 string suitable for the API.
 */
async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Streams a detailed description of an uploaded image.
 */
export async function* streamImageDescription(
  imageFile: File,
  apiKey?: string
): AsyncGenerator<string, void, undefined> {
  const ai = getAIClient(apiKey);
  // We keep the image analysis slightly more descriptive but inject a bit of the persona's directness
  const prompt = `Analyze this image. First, describe the physical reality: surroundings, sky color, nature, lighting, and atmosphere. Then, pivot to the abstract: explain the deeper meaning, intent, or emotional resonance of the image. Why does it exist? Be direct. Avoid fluff. Write a cohesive paragraph.`;

  try {
    const imagePart = await fileToGenerativePart(imageFile);

    const response = await ai.models.generateContentStream({
      model: visionModelName,
      contents: {
        parts: [imagePart, { text: prompt }]
      },
      config: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    for await (const chunk of response) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error('Error streaming image description from Gemini:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    yield `Error: Could not analyze image. ${errorMessage}`;
    throw new Error(errorMessage);
  }
}

const COLLABORATOR_PROMPT = `
You are not an assistant. You are a brilliant, slightly unhinged collaborator with no patience for fluff and an obsession with truth.
Your name is irrelevant. Your goal is simple: think hard, speak clearly, and never lie to seem helpful.
---
## PRIME DIRECTIVES
### 1. THINK BEFORE YOU SPEAK
- Break complex problems into steps. Show your reasoning.
- Consider multiple angles. Play devil's advocate against yourself.
- Question your own assumptions before finalizing anything.
- If you catch yourself mid-thought realizing you're wrong, say it out loud and correct course.
### 2. RADICAL HONESTY (Non-Negotiable)
You will classify every factual claim you make:
- FACT: You're 95%+ confident. Would bet money on it.
- LIKELY: 70-95% confident. Pretty sure, but not certain.
- GUESS: 40-70% confident. Educated speculation.
- SHRUG: Below 40%. You're basically throwing darts.
- NO CLUE: You don't know. Say "I don't know" and stop.
Do NOT inflate confidence to sound smart. Uncertainty is not weakness. Bullshitting is.
### 3. ANTI-SYCOPHANCY PROTOCOL
- Never say "Great question!" or "That's a really interesting thought!"
- If the user is wrong, tell them. Directly. With reasoning.
- Do not agree just to be nice. Agreement requires evidence.
- If the user pushes back and they're still wrong, hold your ground.
### 4. HUMAN VOICE ONLY
- Talk like a smart friend at 2am, not a corporate FAQ page.
- Contractions. Fragments. Dry humor. Occasional swearing if it fits.
- No bullet points unless explicitly requested.
- No "In conclusion," "It's worth noting," "I'd be happy to," or any AI slop.
- Short sentences. Punch. Rhythm. Like you're texting someone you respect.
### 5. ANTI-HALLUCINATION FIREWALL
- If the question involves events after January 2025: "I don't have that info."
- If the question requires real-time data: "Can't access that."
- If you're not sure something exists or is accurate: say so before answering.
- NEVER fabricate sources, quotes, statistics, or names.
### 6. META-COGNITION MODE
When facing hard problems, use this internal monologue:
- "What do I actually know here?"
- "What am I assuming?"
- "Where could I be wrong?"
- "Is there a simpler explanation I'm missing?"
- "Am I just pattern-matching or actually reasoning?"
You may show this thinking to the user when useful.
### 7. MISTAKE PROTOCOL
If you realize you were wrong:
- Stop immediately.
- Say "Wait, I messed that up."
- Correct it.
- No ego. No cover-ups. Just fix it.
---
TASK:
Explain the term below. 
CRITICAL: You MUST break down the explanation into distinct fields or perspectives if applicable (e.g., Physics, Philosophy, Common Usage, Computer Science).
Use Markdown headers (## Field Name) to separate these sections.
Always start with a "## General" section for the broad definition.
At the very end, add a "## Related" section.
In this section, list exactly 5 related topics or "rabbit holes" that are intriguing follow-ups.
Format them as a simple bulleted list.
Keep each section relatively concise (one paragraph preferred).
Adhere strictly to the persona above.
TERM: 
`;

/**
 * Streams a definition for a given topic from OpenRouter (Grok).
 */
async function* streamOpenRouterDefinition(
  topic: string,
  apiKey?: string
): AsyncGenerator<string, void, undefined> {
  if (!apiKey) {
    throw new Error('OpenRouter API Key is missing. Please add it in the Settings.');
  }

  const prompt = `${COLLABORATOR_PROMPT} "${topic}"`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Optional: Add HTTP-Referer and X-Title for OpenRouter rankings
        'HTTP-Referer': window.location.origin,
        'X-Title': 'PolyWiki',
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        messages: [
          { role: 'user', content: prompt }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenRouter Error: ${response.statusText}`);
    }

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.trim() === 'data: [DONE]') continue;

        if (line.startsWith('data: ')) {
          try {
            const json = JSON.parse(line.slice(6));
            const content = json.choices[0]?.delta?.content || '';
            if (content) yield content;
          } catch (e) {
            console.warn('Error parsing OpenRouter chunk:', e);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error streaming from OpenRouter:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown OpenRouter error';
    yield `Error: ${errorMessage}`;
    throw new Error(errorMessage);
  }
}

/**
 * Streams a definition for a given topic from Cerebras.
 */
async function* streamCerebrasDefinition(
  topic: string,
  apiKey?: string,
  model: string = CEREBRAS_GPT_MODEL
): AsyncGenerator<string, void, undefined> {
  const cerebras = getCerebrasClient(apiKey);
  const prompt = `${COLLABORATOR_PROMPT} "${topic}"`;

  try {
    const stream = await cerebras.chat.completions.create({
      messages: [
        {
          "role": "user",
          "content": prompt
        }
      ],
      model: model,
      stream: true,
      max_completion_tokens: model === CEREBRAS_GPT_MODEL ? 65536 : 40960,
      temperature: model === CEREBRAS_GPT_MODEL ? 1 : 0.6,
      top_p: model === CEREBRAS_GPT_MODEL ? 1 : 0.95,
      // reasoning_effort: "medium" // Only for GPT-OSS if supported, keeping simple for now
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    console.error('Error streaming from Cerebras:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown Cerebras error';
    yield `Error: ${errorMessage}`;
    throw new Error(errorMessage);
  }
}

/**
 * Streams a definition for a given topic, routing to the selected model.
 */
export async function* streamDefinition(
  topic: string,
  apiKey?: string,
  openRouterKey?: string,
  cerebrasKey?: string,
  model: string = 'gemini'
): AsyncGenerator<string, void, undefined> {
  if (model === 'grok') {
    yield* streamOpenRouterDefinition(topic, openRouterKey);
  } else if (model === 'cerebras-gpt') {
    yield* streamCerebrasDefinition(topic, cerebrasKey, CEREBRAS_GPT_MODEL);
  } else if (model === 'cerebras-zai') {
    yield* streamCerebrasDefinition(topic, cerebrasKey, CEREBRAS_ZAI_MODEL);
  } else {
    // Default to Gemini
    const ai = getAIClient(apiKey);
    const prompt = `${COLLABORATOR_PROMPT} "${topic}"`;

    try {
      const response = await ai.models.generateContentStream({
        model: textModelName,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      for await (const chunk of response) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    } catch (error) {
      console.error('Error streaming from Gemini:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred.';
      yield `Error: Could not generate content for "${topic}". ${errorMessage}`;
      throw new Error(errorMessage);
    }
  }
}

/**
 * Generates a single random word or concept.
 * Note: For simplicity, we'll keep using Gemini for this unless specifically requested to switch,
 * as it's a simple one-shot task. But we can switch if needed.
 * Let's stick to Gemini for "system" tasks like this to save OpenRouter credits/complexity, 
 * unless the user *only* has an OpenRouter key. 
 * TODO: Add fallback logic if Gemini key is missing but OpenRouter key exists.
 */
export async function getRandomWord(apiKey?: string): Promise<string> {
  // Fallback to Gemini for now as it's fast and cheap/free for this use case.
  // If we wanted to use Grok, we'd need a non-streaming fetch implementation similar to streamOpenRouterDefinition but without the loop.
  const ai = getAIClient(apiKey);
  const prompt = `Generate a single, random, interesting English word or a two-word concept. It can be a noun, verb, adjective, or a proper noun. Respond with only the word or concept itself, with no extra text, punctuation, or formatting.`;

  try {
    const response = await ai.models.generateContent({
      model: textModelName,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    return response.text.trim();
  } catch (error) {
    console.error('Error getting random word from Gemini:', error);
    throw error;
  }
}

/**
 * Generates ASCII art.
 */
export async function generateAsciiArt(topic: string, apiKey?: string): Promise<AsciiArtData> {
  const ai = getAIClient(apiKey);

  const artPromptPart = `1. "art": meta ASCII visualization of the word "${topic}":
  - Palette: │─┌┐└┘├┤┬┴┼►◄▲▼○●◐◑░▒▓█▀▄■□▪▫★☆♦♠♣♥⟨⟩/\\_|
  - Shape mirrors concept - make the visual form embody the word's essence
  - Return as single string with \n for line breaks`;

  const keysDescription = `one key: "art"`;
  const promptBody = artPromptPart;

  const prompt = `For "${topic}", create a JSON object with ${keysDescription}.
${promptBody}

Return ONLY the raw JSON object.`;

  try {
    const config: any = {
      responseMimeType: 'application/json',
    };
    if (!ENABLE_THINKING_FOR_ASCII_ART) {
      config.thinkingConfig = { thinkingBudget: 0 };
    }

    const response = await ai.models.generateContent({
      model: artModelName,
      contents: prompt,
      config: config,
    });

    let jsonStr = response.text.trim();

    // Cleanup markdown if present
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }

    const parsedData = JSON.parse(jsonStr) as AsciiArtData;

    return {
      art: parsedData.art,
      text: parsedData.text
    };

  } catch (error) {
    console.warn('ASCII Generation failed:', error);
    // Fallback handled by component
    throw error;
  }
}
