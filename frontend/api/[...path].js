/**
 * Vercel Serverless Function acting as a same-origin proxy to the
 * Django backend on Render.
 *
 * Why this exists instead of a vercel.json "rewrite": Vercel's
 * external rewrites reliably forward GET requests, but do not
 * reliably forward POST/PATCH/DELETE bodies and methods to an
 * external destination — this caused login (a POST) to fail with a
 * blank 405 while GET health checks worked fine. A serverless
 * function has full control over the request/response and forwards
 * everything exactly as received, so this works for every method.
 *
 * This also solves the auth cookie problem: because the browser only
 * ever talks to this Vercel domain (never directly to Render), the
 * httpOnly JWT cookies set by Django are first-party cookies from the
 * browser's point of view, avoiding third-party cookie blocking.
 *
 * Catches every path under /api/* via the [...path] filename below.
 */

export const config = {
    api: {
      bodyParser: false,
    },
  };
  
  const BACKEND_URL = process.env.BACKEND_URL || "https://tutorflow-backend-rn70.onrender.com";
  
  export default async function handler(req, res) {
    const path = Array.isArray(req.query.path) ? req.query.path.join("/") : "";
    const search = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const targetUrl = `${BACKEND_URL}/api/${path}${search}`;
  
    // Read the raw request body as a buffer so it works for JSON,
    // empty bodies (GET/DELETE), and anything else without assuming a
    // content type.
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
  
    const forwardHeaders = { ...req.headers };
    delete forwardHeaders.host;
    delete forwardHeaders.connection;
    delete forwardHeaders["content-length"];
  
    let backendResponse;
    try {
      backendResponse = await fetch(targetUrl, {
        method: req.method,
        headers: forwardHeaders,
        body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
        redirect: "manual",
      });
    } catch (error) {
      res.status(502).json({
        error: { detail: "Could not reach the backend service.", fields: null },
      });
      return;
    }
  
    // Forward every Set-Cookie header exactly as the backend sent it,
    // so the httpOnly JWT cookies reach the browser unmodified.
    const setCookie = backendResponse.headers.get("set-cookie");
    if (setCookie) {
      res.setHeader("set-cookie", setCookie);
    }
  
    const contentType = backendResponse.headers.get("content-type");
    if (contentType) {
      res.setHeader("content-type", contentType);
    }
  
    const responseBody = Buffer.from(await backendResponse.arrayBuffer());
    res.status(backendResponse.status).send(responseBody);
  }