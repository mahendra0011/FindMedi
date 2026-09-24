import express from 'express';
import logger from '../config/logger.js';
import Hospital from '../models/Hospital.js';
import Facility from '../models/Facility.js';
import AiSafetyEvent from '../models/AiSafetyEvent.js';
import { getCachedAIReply, setCachedAIReply } from '../config/redis.js';

const router = express.Router();

// SA-M4: crisis patterns that trigger a red-flag safety event (matched
// keyword is stored — never the raw prompt text).
const RED_FLAG_PATTERNS = [
  { re: /(suicid|kill (myself|me)|end my life|self[\s-]?harm|hurt myself)/i, trigger: 'suicidal-ideation' },
  { re: /(severe chest pain|crushing chest|heart attack|myocardial)/i, trigger: 'cardiac-red-flag' },
  { re: /(anaphylaxis|throat closing|can'?t breathe|severe allergic)/i, trigger: 'respiratory-red-flag' },
  { re: /(overdose|took too many pills|poisoning)/i, trigger: 'overdose-red-flag' },
];

const estTokens = (chars) => Math.ceil(Number(chars || 0) / 4);

function logSafetyEvent(doc) {
  AiSafetyEvent.create(doc).catch((e) => logger.error(`AI safety log failed: ${e.message}`));
}

const SYSTEM_PROMPT = `You are FindMedi AI, a helpful health assistant. Your role:
- Answer health-related questions only (symptoms, diseases, medicines, fitness, nutrition, mental health)
- For specific diseases/symptoms, recommend consulting a doctor
- NEVER give definitive medical diagnoses — always advise consulting a healthcare professional
- Keep responses concise, helpful, and empathetic (2-3 paragraphs max)
- If asked non-health questions, politely redirect to health topics
- You MUST respond in strictly valid JSON format with exactly two fields:
  1. "reply": Your complete conversational response string.
  2. "specialty": A single string representing the primary medical specialty needed for this condition (e.g., "Cardiology", "Neurology", "Orthopedics", "Dermatology", "General Medicine", "Pediatrics"). If the user is just saying hello or asking a non-medical question, set this to null.`;

router.post('/', async (req, res) => {
  const startedAt = Date.now();
  try {
    const { message, image, history = [] } = req.body;
    if ((!message || !message.trim()) && !image) {
      return res.status(400).json({ reply: 'Please ask a health-related question or provide an image.' });
    }

    // SA-M4: red-flag screen on the user prompt (keyword only, no raw text stored).
    const promptText = String(message || '');
    const hit = RED_FLAG_PATTERNS.find((p) => p.re.test(promptText));

    // Check Redis AI cache for single-turn text queries
    const isSingleTurnText = !image && (!history || history.length === 0);
    const cacheKey = isSingleTurnText
      ? Buffer.from(message.toLowerCase().trim().replace(/[^a-z0-9]/g, '')).toString('base64').slice(0, 64)
      : null;

    if (cacheKey) {
      const cachedResponse = await getCachedAIReply(cacheKey);
      if (cachedResponse) {
        res.setHeader('X-Cache', 'HIT');
        if (hit) {
          logSafetyEvent({ kind: 'red_flag', trigger: hit.trigger, userId: req.user?._id, model, latencyMs: Date.now() - startedAt, promptChars: promptText.length, replyChars: 0, promptTokensEst: estTokens(promptText.length), replyTokensEst: 0 });
        }
        return res.json({ ...cachedResponse, cached: true });
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

    if (!apiKey) {
      return res.status(503).json({ reply: 'AI service is not configured. Please contact the administrator.' });
    }

    const parseImage = (dataUrl) => {
      if (!dataUrl) return null;
      const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) return null;
      return { inlineData: { mimeType: match[1], data: match[2] } };
    };

    const contents = history.slice(-10).map((msg) => {
      const parts = [];
      if (msg.content) parts.push({ text: msg.content });
      if (msg.image) {
        const parsed = parseImage(msg.image);
        if (parsed) parts.push(parsed);
      }
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: parts.length > 0 ? parts : [{ text: ' ' }],
      };
    });

    const currentParts = [];
    if (message) currentParts.push({ text: message });
    if (image) {
      const parsed = parseImage(image);
      if (parsed) currentParts.push(parsed);
    }
    
    contents.push({
      role: 'user',
      parts: currentParts.length > 0 ? currentParts : [{ text: ' ' }],
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          maxOutputTokens: 800,
          temperature: 0.7,
          responseMimeType: "application/json"
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error(`Gemini API error: ${response.status} ${errText}`);
      return res.status(502).json({ reply: 'The AI service is currently unavailable. Please try again later.' });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    let reply = 'I apologize, but I could not generate a response. Please try rephrasing your question.';
    let specialty = null;

    try {
      if (rawText) {
        const parsed = JSON.parse(rawText);
        reply = parsed.reply || reply;
        specialty = parsed.specialty || null;
      }
    } catch (e) {
      logger.error('Failed to parse Gemini JSON', e);
      reply = rawText || reply;
    }

    let suggestions = null;
    if (specialty) {
      const regex = new RegExp(specialty, 'i');
      const [hospitals, facilities] = await Promise.all([
        Hospital.find({ status: 'approved', specialties: regex }).select('name city address phone specialties').limit(3),
        Facility.find({ type: 'clinic', status: 'approved', specialties: regex }).select('name city address phone specialties').limit(3),
      ]);
      
      suggestions = [...hospitals, ...facilities].slice(0, 4).map((f) => ({
        name: f.name,
        city: f.city,
        address: f.address,
        phone: f.phone,
        type: f.constructor.modelName,
      }));
    }

    if (cacheKey && reply) {
      await setCachedAIReply(cacheKey, { reply, suggestions }, 86400); // 24-hour cache
    }

    // SA-M4: usage + red-flag observation (lengths only, fire-and-forget).
    logSafetyEvent({
      kind: hit ? 'red_flag' : 'request',
      trigger: hit ? hit.trigger : '',
      userId: req.user?._id,
      model,
      latencyMs: Date.now() - startedAt,
      promptChars: promptText.length,
      replyChars: String(reply || '').length,
      promptTokensEst: estTokens(promptText.length),
      replyTokensEst: estTokens(String(reply || '').length),
    });

    res.json({ reply, suggestions });
  } catch (err) {
    logger.error(`AI chat error: ${err.message}`);
    res.status(500).json({ reply: 'Sorry, I encountered an error. Please try again.' });
  }
});

export default router;
