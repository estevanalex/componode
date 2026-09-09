import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { errorHandler } from "../../src/plugins/error-handler.js";

describe("not-found handler", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await errorHandler(app);
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
});
