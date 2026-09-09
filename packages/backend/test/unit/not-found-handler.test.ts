import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import { errorHandler } from "../../src/plugins/error-handler.js";

describe("not-found handler", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await errorHandler(app);
    app.decorateReply("sendFile", async function (this: FastifyReply, file: string) {
      return this.type("text/html").send(`<!doctype html><html lang="en"><head><title>Componode</title></head><body><div id="root"></div><script src="/${file}"></script></body></html>`);
    });
    await app.ready();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it("returns application/problem+json for unknown routes", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/unknown",
    });

    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");

    const body = res.json();
    expect(body.type).toBe("https://componode.io/problems/NOT_FOUND");
    expect(body.title).toBe("Not found");
    expect(body.status).toBe(404);
    expect(body.code).toBe("NOT_FOUND");
    expect(body.message).toBeTruthy();
  });

  it("serves index.html for direct navigation to a frontend route", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/login",
      headers: { accept: "text/html" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.body).toContain("<title>Componode</title>");
  });

  it("returns application/problem+json for API 404s even with text/html accept", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/unknown",
      headers: { accept: "text/html" },
    });

    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");
  });
});
