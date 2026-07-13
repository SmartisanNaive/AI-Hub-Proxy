// Reverse proxy for AI/LLM APIs
// Deploy with: docker compose up -d

const PORT = parseInt(Deno.env.get("PORT") ?? "8080");
const HOST = Deno.env.get("HOST") ?? "0.0.0.0";
const INDEX_PATH = Deno.env.get("INDEX_PATH") ?? "./public/index.html";
const PUBLIC_DIR = Deno.env.get("PUBLIC_DIR") ?? "./public";

let indexHtml: string | null = null;
try {
  indexHtml = await Deno.readTextFile(INDEX_PATH);
} catch (error) {
  console.warn(`Could not read ${INDEX_PATH}:`, error);
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

function getContentType(path: string): string {
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

async function serveStaticFile(pathname: string): Promise<Response | null> {
  // 安全校验：禁止路径穿越
  if (pathname.includes("..") || pathname.includes("\\")) {
    return null;
  }

  const cleanPath = pathname.replace(/^\/+/, "");
  const filePath = `${PUBLIC_DIR}/${cleanPath}`;

  try {
    const fileInfo = await Deno.stat(filePath);
    if (!fileInfo.isFile) return null;

    const file = await Deno.readFile(filePath);
    return new Response(file, {
      status: 200,
      headers: {
        "Content-Type": getContentType(filePath),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return null;
  }
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
  // 基础必要头
  if (["accept", "content-type", "authorization"].includes(lower)) return true;
  // 自定义扩展头（OpenAI/Anthropic SDK 多数功能性头也在此列）
  if (lower.startsWith("x-")) return true;
  // 厂商实验性功能头
  if (lower.startsWith("openai-")) return true;
  if (lower.startsWith("anthropic-")) return true;
  return false;
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

  // 静态资源（logo、字体等）
  const staticResponse = await serveStaticFile(pathname);
  if (staticResponse) return staticResponse;

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
