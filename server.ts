import express from 'express';
import { createServer as createViteServer } from 'vite';
import { YoutubeTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js';
import { fileURLToPath } from 'url';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log('[Server] Starting bootstrap...');
  const app = express();
  app.use(express.json());
  
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
  
  // Health Check for diagnostics
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      time: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development'
    });
  });

  // Hardcoded by structure
  const PORT = 3000;

  // API Route for YouTube processing
  app.all('/api/import/youtube', async (req, res) => {
    try {
      const url = req.method === 'GET' ? req.query.url as string : req.body.url;
      if (!url) {
        return res.status(400).json({ error: 'Missing YouTube URL' });
      }

      // Extract YouTube ID
      let videoId = '';
      try {
        const urlObj = new URL(url);
        videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop() || '';
      } catch (e) {
        // Handle short URLs or just IDs
        videoId = url.includes('youtu.be/') ? url.split('youtu.be/')[1] : url;
      }

      if (!videoId) {
        return res.status(400).json({ error: 'Could not extract Video ID' });
      }

      // We'll fetch basic oEmbed metadata
      let oembedTitle = 'YouTube Video';
      let oembedAuthor = 'Unknown Channel';
      let oembedThumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const oembedRes = await fetch(oembedUrl);
        const oembed = await oembedRes.json();
        if (oembed.title) oembedTitle = oembed.title;
        if (oembed.author_name) oembedAuthor = oembed.author_name;
        if (oembed.thumbnail_url) oembedThumbnail = oembed.thumbnail_url;
      } catch (e) {
        console.warn("Could not fetch oembed", e);
      }

      // Fetch transcript via youtube-transcript
      // This will throw if the video has no captions
      const transcriptList = await YoutubeTranscript.fetchTranscript(videoId);

      const lines = transcriptList.map((t, idx) => ({
        id: `line-${idx}`,
        start: t.offset / 1000,
        end: (t.offset + t.duration) / 1000,
        en: t.text,
        zh: '', // Keeping this empty by default, the AI deep analysis will handle translation per sentence
        words: []
      }));

      res.json({
        meta: {
          title: oembedTitle,
          channel: oembedAuthor,
          thumbnail: oembedThumbnail,
          youtubeId: videoId
        },
        transcript: lines
      });

    } catch (e) {
      console.error("YouTube parse error:", e);
      res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to parse YouTube video. Make sure it has closed captions enabled.' });
    }
  });

  // AI Proxy Route (Point 22)
  app.post('/api/ai', async (req, res) => {
    try {
      const { prompt, model } = req.body;
      
      if (!ai) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
      }

      const response = await ai.models.generateContent({
        model: model || 'gemini-1.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const text = response.text ?? '';
      
      try {
        // Strip markdown fences if present
        const cleaned = text.replace(/```json\n?|```/g, '').trim();
        res.json(JSON.parse(cleaned));
      } catch (e) {
        res.status(500).json({ error: 'AI returned non-JSON response', raw: text.slice(0, 200) });
      }
    } catch (e) {
      console.error("AI Proxy Error:", e);
      res.status(500).json({ error: e instanceof Error ? e.message : 'AI generation failed' });
    }
  });

  // Vite integration
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (process.env.NODE_ENV !== "production") {
    console.log('[Server] Configuring Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log('[Server] Vite middleware injected.');
  } else {
    // Standard full-stack path resolution: dist is at process.cwd()/dist
    const distPath = path.join(process.cwd(), 'dist');
    console.log(`[Production] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[Server] Health check: http://0.0.0.0:${PORT}/api/health`);
  });
}

startServer();
