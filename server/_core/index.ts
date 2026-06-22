import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

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
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid messages format" });
      }

      const latestUserMessage = messages[messages.length - 1]?.content || '';

      // Search in parallel
      const [niceResults, pubmedResults] = await Promise.all([
        searchNICE(latestUserMessage).catch(() => []),
        searchPubMed(latestUserMessage).catch(() => [])
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
- Be encouraging and exam-focused`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1500,
          system: systemPrompt,
          messages: messages,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Claude API error:", error);
        return res.status(500).json({ error: "Failed to get AI response" });
      }

      const data = await response.json();
      const reply = data.content[0]?.text || "Sorry, I couldn't generate a response.";
      res.json({ reply, sources: allSources });
    } catch (error) {
      console.error("AI Coach error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);
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
