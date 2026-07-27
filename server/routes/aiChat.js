import express from 'express';
import logger from '../config/logger.js';
import Hospital from '../models/Hospital.js';
import Facility from '../models/Facility.js';

const router = express.Router();



const SYSTEM_PROMPT = `You are MediCore AI, a helpful health assistant. Your role:
- Answer health-related questions only (symptoms, diseases, medicines, fitness, nutrition, mental health)
- For specific diseases/symptoms, suggest visiting relevant clinics or hospitals and recommend consulting a doctor
- NEVER give definitive medical diagnoses — always advise consulting a healthcare professional
- Keep responses concise, helpful, and empathetic (2-3 paragraphs max)
- If asked non-health questions, politely redirect to health topics
- You can recommend general wellness tips, first aid, and when to see a doctor
- When users describe symptoms, suggest which type of specialist they should consult
- DO NOT invent or name specific hospitals or clinics yourself, as we will provide a list from our own database automatically.`;

router.post('/', async (req, res) => {
  try {
    const { message, image, history = [] } = req.body;
    if ((!message || !message.trim()) && !image) {
      return res.status(400).json({ reply: 'Please ask a health-related question or provide an image.' });
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
          maxOutputTokens: 500,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error(`Gemini API error: ${response.status} ${errText}`);
      return res.status(502).json({ reply: 'The AI service is currently unavailable. Please try again later.' });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I could not generate a response. Please try rephrasing your question.';

    const diseaseKeywords = ['symptom', 'disease', 'pain', 'ache', 'fever', 'infection', 'diagnos', 'treatment', 'doctor', 'specialist', 'clinic', 'hospital', 'consult'];
    const mentionsHealthIssue = diseaseKeywords.some((kw) => message.toLowerCase().includes(kw));

    let suggestions = null;
    if (mentionsHealthIssue) {
      const [hospitals, facilities] = await Promise.all([
        Hospital.find({ status: 'approved' }).select('name city address phone specialties').limit(3),
        Facility.find({ type: 'clinic', status: 'approved' }).select('name city address phone specialties').limit(3),
      ]);
      if (hospitals.length > 0 || facilities.length > 0) {
        suggestions = [...hospitals, ...facilities].slice(0, 4).map((f) => ({
          name: f.name,
          city: f.city,
          address: f.address,
          phone: f.phone,
          type: f.constructor.modelName,
        }));
      }
    }

    res.json({ reply, suggestions });
  } catch (err) {
    logger.error(`AI chat error: ${err.message}`);
    res.status(500).json({ reply: 'Sorry, I encountered an error. Please try again.' });
  }
});

export default router;
