export const envSchema = {
  type: "object",
  required: ["DATABASE_URL", "WEB_ORIGIN"],
  properties: {
    PORT: { type: "number", default: 3000 },
    DATABASE_URL: { type: "string", minLength: 1 },
    WEB_ORIGIN: { type: "string", minLength: 1 },
  },
};

declare module "fastify" {
  interface FastifyInstance {
    config: { PORT: number; DATABASE_URL: string; WEB_ORIGIN: string };
  }
}
