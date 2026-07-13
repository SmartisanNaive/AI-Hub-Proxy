// Reverse proxy for AI/LLM APIs
// Deploy with: docker compose up -d

const PORT = parseInt(Deno.env.get("PORT") ?? "8080");
const HOST = Deno.env.get("HOST") ?? "0.0.0.0";
const INDEX_PATH = Deno.env.get("INDEX_PATH") ?? "./public/index.html";

let indexHtml: string | null = null;
try {
  indexHtml = await Deno.readTextFile(INDEX_PATH);
} catch (error) {
  console.warn(`Could not read ${INDEX_PATH}:`, error);
}

const apiMapping: Record<string, string> = {
  "/discord": "https://discord.com/api",
  "/telegram": "https://api.telegram.org",
  "/openai": "https://api.openai.com",
  "/claude": "https://api.anthropic.com",
  "/gemini": "https://generativelanguage.googleapis.com",
  "/meta": "https://www.meta.ai/api",
  "/groq": "https://api.groq.com/openai",
  "/xai": "https://api.x.ai",
  "/cohere": "https://api.cohere.ai",
  "/huggingface": "https://api-inference.huggingface.co",
  "/together": "https://api.together.xyz",
  "/novita": "https://api.novita.ai",
  "/portkey": "https://api.portkey.ai",
  "/fireworks": "https://api.fireworks.ai",
  "/openrouter": "https://openrouter.ai/api",
};

const prefixes = Object.keys(apiMapping).sort((a, b) => b.length - a.length);

function extractPrefixAndRest(pathname: string): [string, string] | [null, null] {
  for (const prefix of prefixes) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return [prefix, pathname.slice(prefix.length)];
    }
  }
  return [null, null];
}

function isAllowedHeader(name: string): boolean {
  const lower = name.toLowerCase();
  return lower === "accept" ||
    lower === "content-type" ||
    lower === "authorization" ||
    lower.startsWith("x-");
}

async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname === "/" || pathname === "/index.html") {
    if (indexHtml) {
      return new Response(indexHtml, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    }
    return new Response("Service is running!", {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }

  if (pathname === "/robots.txt") {
    return new Response("User-agent: *\nDisallow: /", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  if (pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok", time: new Date().toISOString() }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [prefix, rest] = extractPrefixAndRest(pathname);
  if (!prefix) {
    return new Response("Not Found", { status: 404 });
  }

  const targetUrl = `${apiMapping[prefix]}${rest}`;

  try {
    const headers = new Headers();
    for (const [key, value] of request.headers.entries()) {
      if (isAllowedHeader(key)) {
        headers.set(key, value);
      }
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "follow",
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    responseHeaders.set("X-Frame-Options", "DENY");
    responseHeaders.set("Referrer-Policy", "no-referrer");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`Failed to fetch ${targetUrl}:`, error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

Deno.serve({ port: PORT, hostname: HOST }, handler);
console.log(`Reverse proxy listening on http://${HOST}:${PORT}`);
