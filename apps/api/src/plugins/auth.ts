import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { type Role, verifyAccessToken } from "../auth/tokens.js";
import { forbidden, unauthorized } from "../errors.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: { id: string; role: Role };
  }
  interface FastifyInstance {
    /** preHandler: rejects anyone without a valid access token. */
    requireAuth: (req: FastifyRequest) => Promise<void>;
    /** preHandler factory: rejects anyone outside the listed roles. */
    requireRole: (...roles: Role[]) => (req: FastifyRequest) => Promise<void>;
  }
}

const plugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("user", undefined);

  app.decorate("requireAuth", async (req: FastifyRequest) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw unauthorized();
    try {
      const claims = await verifyAccessToken(header.slice(7));
      req.user = { id: claims.sub, role: claims.role };
    } catch {
      // Expired and forged tokens are deliberately indistinguishable here.
      throw unauthorized("Invalid or expired token");
    }
  });

  app.decorate("requireRole", (...roles: Role[]) => async (req: FastifyRequest) => {
    await app.requireAuth(req);
    if (!req.user || !roles.includes(req.user.role)) throw forbidden();
  });
};

export const authPlugin = fp(plugin, { name: "auth" });
