import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { randomUUID } from "crypto";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { invokeLLM } from "./llm";
import { addSSEClient, removeSSEClient } from "../liveQuizRouter";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Stripe webhook needs raw body BEFORE json parsing
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const { handleStripeWebhook } = await import("../webhooks/stripeWebhook");
    return handleStripeWebhook(req, res);
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Helper: Search NICE Guidelines
  async function searchNICE(query: string) {
    try {
      const url = `https://www.nice.org.uk/search?q=${encodeURIComponent(query)}&sp=guidance`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const html = await res.text();
      const matches = html.match(/href="(\/guidance\/[^"]+)"[^>]*>([^<]+)<\/a>/g) || [];
      return matches.slice(0, 3).map((match, i) => {
        const urlMatch = match.match(/href="([^"]+)"/);
        const titleMatch = match.match(/>([^<]+)<\/a>/);
        return {
          title: titleMatch?.[1] || `NICE Guidance ${i + 1}`,
          url: urlMatch?.[1] ? `https://www.nice.org.uk${urlMatch[1]}` : '',
          source: 'NICE'
        };
      }).filter(r => r.url);
    } catch (error) {
      console.error('NICE search error:', error);
      return [];
    }
  }

  // Helper: Search PubMed
  async function searchPubMed(query: string) {
    try {
      const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=3&retmode=json&sort=relevance`;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) return [];
      const searchData = await searchRes.json();
      const ids = (searchData as any).esearchresult?.idlist || [];
      if (!ids.length) return [];

      const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
      const summaryRes = await fetch(summaryUrl);
      if (!summaryRes.ok) return [];
      const summaryData = await summaryRes.json();

      return ids.map((id: string) => {
        const item = (summaryData as any).result?.[id];
        return {
          title: item?.title || '',
          summary: item?.source ? `${item.source}, ${item.pubdate}` : '',
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          source: 'PubMed'
        };
      }).filter((r: any) => r.title);
    } catch (error) {
      console.error('PubMed search error:', error);
      return [];
    }
  }

  // AI Coach RAG endpoint
  app.post("/api/ai-coach", async (req, res) => {
    try {
      const { messages, image } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid messages format" });
      }

      // Extract the latest user message text (handle both string and multimodal content)
      const lastMsg = messages[messages.length - 1];
      let latestUserMessage = '';
      if (typeof lastMsg?.content === 'string') {
        latestUserMessage = lastMsg.content;
      } else if (lastMsg?.content) {
        latestUserMessage = lastMsg.content;
      }

      // Search in parallel (only for text queries)
      const searchQuery = typeof latestUserMessage === 'string' ? latestUserMessage : '';
      const [niceResults, pubmedResults] = await Promise.all([
        searchQuery ? searchNICE(searchQuery).catch(() => []) : Promise.resolve([]),
        searchQuery ? searchPubMed(searchQuery).catch(() => []) : Promise.resolve([])
      ]);

      const allSources = [...niceResults, ...pubmedResults].slice(0, 4);

      const retrievedContext = allSources.length > 0
        ? `RETRIEVED MEDICAL SOURCES:\n` + allSources.map((s: any, i: number) =>
            `[${i+1}] ${s.source} - ${s.title}\n${s.summary ? `Summary: ${s.summary}` : ''}\nURL: ${s.url}`
          ).join('\n\n')
        : '';

      const systemPrompt = `You are AI Coach360, a medical exam preparation assistant for Question Grove 360. You help students prepare for MRCGP AKT, PLAB 1, PLAB 2, USMLE and MCCQE1.

${retrievedContext ? retrievedContext + '\n\nUse the sources above to inform your answer where relevant. Cite them by number e.g. [1] at the end of relevant sentences.' : ''}

Guidelines:
- Be accurate, concise and clinically focused
- For MRCGP AKT questions, reference NICE guidelines, BNF, BASHH, RCOG, BTS where applicable
- Explain the reasoning behind answers, not just the answer itself
- If sources were retrieved, end your response with a "Sources:" section listing the URLs
- If no sources were retrieved, answer from your medical knowledge and say so
- Be encouraging and exam-focused
- If the user uploads an image, analyse it thoroughly. For clinical images, describe findings and suggest differentials. For question screenshots, read and answer the question. For ECGs/X-rays, provide systematic interpretation.`;

      // Build LLM messages — handle image in the latest user message
      const llmMessages: any[] = [
        { role: "system" as const, content: systemPrompt },
      ];

      // Add conversation history (all messages except the last one as plain text)
      for (let i = 0; i < messages.length - 1; i++) {
        const m = messages[i];
        llmMessages.push({ role: m.role as "user" | "assistant", content: m.content });
      }

      // Add the latest user message — with image if provided
      if (image && image.data && image.mimeType) {
        // Multimodal message with image
        const contentParts: any[] = [];
        contentParts.push({
          type: "image_url",
          image_url: {
            url: `data:${image.mimeType};base64,${image.data}`,
            detail: "high"
          }
        });
        if (searchQuery) {
          contentParts.push({ type: "text", text: searchQuery });
        } else {
          contentParts.push({ type: "text", text: "Please analyse this image." });
        }
        llmMessages.push({ role: "user" as const, content: contentParts });
      } else {
        llmMessages.push({ role: "user" as const, content: latestUserMessage });
      }

      // Use claude-sonnet-4-6 for vision tasks, default model for text-only
      const useVisionModel = !!(image && image.data);
      const llmResponse = await invokeLLM({
        messages: llmMessages,
        ...(useVisionModel ? { model: "claude-sonnet-4-6" as any } : {})
      });
      const reply = (llmResponse.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.") as string;

      // Generate follow-up questions
      const followUpResponse = await invokeLLM({
        messages: [
          { role: "system" as const, content: "You generate exactly 3 short follow-up questions that help a medical student explore the topic further. Each question should be concise (under 60 characters), clinically relevant, and progressively deeper. Return ONLY a JSON array of 3 strings, nothing else. Example: [\"What are the diagnostic criteria?\",\"How does treatment differ in elderly?\",\"What are the key complications?\"]" },
          { role: "user" as const, content: `Based on this conversation about: ${searchQuery || 'an uploaded clinical image'}\n\nAI response: ${(reply as string).substring(0, 500)}\n\nGenerate 3 follow-up questions.` }
        ],
        response_format: { type: "json_object" as any }
      }).catch(() => null);

      let followUpQuestions: string[] = [];
      try {
        const followUpContent = (followUpResponse?.choices?.[0]?.message?.content || '[]') as string;
        const parsed = JSON.parse(followUpContent);
        followUpQuestions = Array.isArray(parsed) ? parsed.slice(0, 3) : (parsed.questions || parsed.follow_ups || []).slice(0, 3);
      } catch {
        followUpQuestions = [];
      }

      res.json({ reply, sources: allSources, followUpQuestions });
    } catch (error) {
      console.error("AI Coach error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Weekly digest cron handler
  app.post("/api/scheduled/weeklyDigest", async (req, res) => {
    const { weeklyDigestHandler } = await import("../weeklyDigestJob");
    return weeklyDigestHandler(req, res);
  });

  // Digest unsubscribe (one-click from email)
  // Sitemap.xml for SEO
  app.get("/sitemap.xml", (req, res) => {
    const baseUrl = "https://questiongrove360.com";
    const routes = [
      { path: "/", priority: "1.0", changefreq: "weekly" },
      { path: "/pricing", priority: "0.8", changefreq: "monthly" },
      { path: "/plab1", priority: "0.9", changefreq: "weekly" },
      { path: "/msra-landing", priority: "0.9", changefreq: "weekly" },
      { path: "/international", priority: "0.7", changefreq: "monthly" },
      { path: "/international/nigeria", priority: "0.7", changefreq: "monthly" },
      { path: "/international/nigeria/jamb", priority: "0.8", changefreq: "weekly" },
      { path: "/topics", priority: "0.8", changefreq: "weekly" },
      { path: "/topics/biology", priority: "0.7", changefreq: "monthly" },
      { path: "/topics/mathematics", priority: "0.7", changefreq: "monthly" },
      { path: "/topics/spelling-bee", priority: "0.7", changefreq: "monthly" },
      { path: "/picture360", priority: "0.7", changefreq: "monthly" },
      { path: "/live", priority: "0.6", changefreq: "weekly" },
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(r => `  <url>
    <loc>${baseUrl}${r.path}</loc>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
    res.set("Content-Type", "application/xml");
    res.send(xml);
  });

  app.get("/api/unsubscribe/digest", async (req, res) => {
    const { unsubscribeDigestHandler } = await import("../unsubscribeHandler");
    return unsubscribeDigestHandler(req, res);
  });

  // Paystack webhook
  app.post("/api/paystack/webhook", express.json(), async (req, res) => {
    const { paystackWebhookHandler } = await import("../paystackWebhook");
    return paystackWebhookHandler(req, res);
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // ─── SSE ENDPOINT FOR LIVE QUIZ ──────────────────────────────────────────
  app.get("/api/live-quiz/events/:sessionCode", (req, res) => {
    const { sessionCode } = req.params;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(`event: connected\ndata: ${JSON.stringify({ sessionCode })}\n\n`);
    const clientId = randomUUID();
    addSSEClient({ id: clientId, res, sessionCode });
    req.on("close", () => { removeSSEClient(clientId); });
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
