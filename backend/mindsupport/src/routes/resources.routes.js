import { body, validationResult } from "express-validator";
import { YOUTUBE_API_KEY } from "../config/env.js";

const VALID_TYPES = ["video", "article", "audiobook", "audio", "pdf", "blog"];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array().map((e) => e.msg).join(". ") });
    return;
  }
  next();
};

const languageCodes = {
  english: "en",
  hindi: "hi",
  tamil: "ta",
  telugu: "te",
  kannada: "kn",
  marathi: "mr",
  bengali: "bn",
};

const categoryQueries = {
  anxiety: "anxiety coping skills mental health",
  stress: "stress relief breathing exercise mental health",
  sleep: "sleep hygiene relaxation mental health",
  burnout: "burnout recovery self care",
  depression: "depression self care mental health support",
  motivation: "motivation self confidence student wellbeing",
  "self confidence": "build self confidence motivation wellbeing",
  "career stress": "career stress motivation mental wellbeing",
  "student pressure": "student pressure exam stress motivation",
  meditation: "guided meditation mental wellness",
  relationships: "healthy relationships emotional wellbeing",
  loneliness: "loneliness coping mental health",
  "addiction recovery": "addiction recovery peer support wellbeing",
  "trauma support": "trauma grounding coping skills",
};

function parseYoutubeDuration(value = "") {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match) return 0;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return Math.max(1, Math.round(hours * 60 + minutes + seconds / 60));
}

function fallbackVideos(query, max) {
  const topic = query || "mental wellness";
  return [
    {
      id: "yt:fallback-breathing",
      title: `Breathing support for ${topic}`,
      type: "video",
      category: "Stress",
      language: "English",
      url: "https://www.youtube.com/watch?v=tEmt1Znux58",
      description: "A short breathing practice for calming the body during stress.",
      durationMin: 4,
      tags: ["breathing", "stress", "youtube"],
      source: "youtube-fallback",
    },
    {
      id: "yt:fallback-meditation",
      title: `Mindfulness practice for ${topic}`,
      type: "video",
      category: "Meditation",
      language: "English",
      url: "https://www.youtube.com/watch?v=inpok4MKVLM",
      description: "A simple guided mindfulness practice for grounding and focus.",
      durationMin: 10,
      tags: ["mindfulness", "meditation", "youtube"],
      source: "youtube-fallback",
    },
  ].slice(0, max);
}

function buildYoutubeQuery(req) {
  const q = String(req.query.q || "").trim();
  if (q) return q;
  const category = String(req.query.category || "").trim().toLowerCase();
  if (category && category !== "all") return categoryQueries[category] || `${category} mental wellness`;
  return "mental health motivation self care";
}

function withinDuration(item, req) {
  const min = req.query.minDur ? Number(req.query.minDur) : undefined;
  const max = req.query.maxDur ? Number(req.query.maxDur) : undefined;
  if (Number.isFinite(min) && item.durationMin < min) return false;
  if (Number.isFinite(max) && item.durationMin > max) return false;
  return true;
}

export function registerResourceRoutes(app, context) {
  const { Resource, asyncRoute, authRequired, requireRoles } = context;

  app.get(
    "/api/resources",
    asyncRoute(async (req, res) => {
      const query = {};
      if (req.query.type && VALID_TYPES.includes(String(req.query.type))) query.type = String(req.query.type);
      if (req.query.category) query.category = new RegExp(String(req.query.category), "i");
      if (req.query.language) query.language = new RegExp(String(req.query.language), "i");
      if (req.query.q) {
        const rx = new RegExp(String(req.query.q), "i");
        query.$or = [{ title: rx }, { description: rx }, { tags: rx }, { category: rx }];
      }
      if (req.query.tags) {
        const tags = String(req.query.tags)
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
        if (tags.length) query.tags = { $in: tags.map((tag) => new RegExp(tag, "i")) };
      }
      const duration = {};
      if (req.query.minDur) duration.$gte = Number(req.query.minDur);
      if (req.query.maxDur) duration.$lte = Number(req.query.maxDur);
      if (Object.keys(duration).length) query.durationMin = duration;
      const resources = await Resource.find(query).sort({ createdAt: -1 });
      res.json(resources);
    })
  );

  app.post(
    "/api/resources",
    asyncRoute(authRequired),
    requireRoles("admin", "counsellor", "psychiatrist"),
    body("title").notEmpty().trim().escape().withMessage("Title is required"),
    body("type").isIn(VALID_TYPES).withMessage("Type must be video, article, audiobook, audio, pdf, or blog"),
    body("category").optional().trim().escape(),
    body("language").optional().trim().escape(),
    body("url").optional().trim(),
    body("description").optional().trim().escape(),
    body("tags").optional().isArray(),
    validate,
    asyncRoute(async (req, res) => {
      const resource = await Resource.create({
        title: req.body?.title,
        type: VALID_TYPES.includes(req.body?.type) ? req.body.type : "article",
        category: req.body?.category || "General",
        language: req.body?.language || "English",
        url: req.body?.url,
        thumbnail: req.body?.thumbnail || req.body?.imageUrl || req.body?.coverImage || "",
        description: req.body?.description || "",
        durationMin: Number(req.body?.durationMin || 5),
        tags: Array.isArray(req.body?.tags) ? req.body.tags : [],
        createdBy: req.user._id,
      });
      res.status(201).json(resource);
    })
  );

  app.get(
    "/api/resources/mine",
    asyncRoute(authRequired),
    requireRoles("counsellor", "psychiatrist", "admin"),
    asyncRoute(async (req, res) => {
      const resources = await Resource.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
      res.json(resources);
    })
  );

  app.patch(
    "/api/resources/:id",
    asyncRoute(authRequired),
    requireRoles("counsellor", "psychiatrist", "admin"),
    body("title").optional().trim().escape(),
    body("type").optional().isIn(VALID_TYPES),
    body("category").optional().trim().escape(),
    body("language").optional().trim().escape(),
    body("url").optional().trim(),
    body("thumbnail").optional().trim(),
    body("description").optional().trim().escape(),
    body("durationMin").optional().isNumeric(),
    body("tags").optional().isArray(),
    validate,
    asyncRoute(async (req, res) => {
      const resource = await Resource.findById(req.params.id);
      if (!resource) { res.status(404).json({ error: "Resource not found" }); return; }
      if (String(resource.createdBy) !== String(req.user._id) && req.user.role !== "admin") {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const allowed = ["title", "type", "category", "language", "url", "thumbnail", "description", "durationMin", "tags"];
      for (const key of allowed) {
        if (key in req.body) resource[key] = req.body[key];
      }
      await resource.save();
      res.json(resource);
    })
  );

  app.delete(
    "/api/resources/:id",
    asyncRoute(authRequired),
    requireRoles("counsellor", "psychiatrist", "admin"),
    asyncRoute(async (req, res) => {
      const resource = await Resource.findById(req.params.id);
      if (!resource) { res.status(404).json({ error: "Resource not found" }); return; }
      if (String(resource.createdBy) !== String(req.user._id) && req.user.role !== "admin") {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      await resource.deleteOne();
      res.json({ success: true });
    })
  );

  app.get(
    "/api/resources/youtube",
    asyncRoute(async (req, res) => {
      const query = buildYoutubeQuery(req);
      const max = Math.min(Math.max(Number(req.query.maxResults || 8), 1), 12);
      const language = String(req.query.language || "").trim().toLowerCase();
      const languageCode = languageCodes[language];
      const displayLanguage = language && language !== "all" ? `${language.charAt(0).toUpperCase()}${language.slice(1)}` : "English";

      if (!YOUTUBE_API_KEY) {
        res.json(fallbackVideos(query, max).filter((item) => withinDuration(item, req)));
        return;
      }

      try {
        const searchParams = new URLSearchParams({
          key: YOUTUBE_API_KEY,
          part: "snippet",
          type: "video",
          videoEmbeddable: "true",
          safeSearch: "strict",
          maxResults: String(max),
          q: query,
        });
        if (languageCode) searchParams.set("relevanceLanguage", languageCode);

        const searchResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`);
        if (!searchResponse.ok) throw new Error(`YouTube search failed: ${searchResponse.status}`);
        const searchData = await searchResponse.json();
        const ids = (searchData.items || []).map((item) => item.id?.videoId).filter(Boolean);
        if (!ids.length) {
          res.json([]);
          return;
        }

        const detailParams = new URLSearchParams({
          key: YOUTUBE_API_KEY,
          part: "contentDetails,statistics",
          id: ids.join(","),
        });
        const detailsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?${detailParams}`);
        if (!detailsResponse.ok) throw new Error(`YouTube details failed: ${detailsResponse.status}`);
        const detailsData = await detailsResponse.json();
        const detailsById = new Map((detailsData.items || []).map((item) => [item.id, item]));

        const category = String(req.query.category || "Wellness");
        const videos = (searchData.items || [])
          .map((item) => {
            const videoId = item.id?.videoId;
            const detail = detailsById.get(videoId);
            const durationMin = parseYoutubeDuration(detail?.contentDetails?.duration);
            return {
              id: `yt:${videoId}`,
              title: item.snippet?.title || "Wellness video",
              type: "video",
              category: category === "all" ? "Wellness" : category,
              language: displayLanguage,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || "",
              description: item.snippet?.description || "Curated YouTube wellness video.",
              durationMin,
              tags: ["youtube", query, category].filter(Boolean),
              channelTitle: item.snippet?.channelTitle || "",
              source: "youtube",
            };
          })
          .filter((item) => withinDuration(item, req));

        res.json(videos);
      } catch (error) {
        console.error(error.message);
        res.json(fallbackVideos(query, max).filter((item) => withinDuration(item, req)));
      }
    })
  );
}
