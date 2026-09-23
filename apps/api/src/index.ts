import Fastify from "fastify";
import fastifyEnv from "@fastify/env";
import { envSchema } from "./env.js";

const app = Fastify({ logger: true });

await app.register(fastifyEnv, { schema: envSchema, dotenv: true });

app.get("/api/v1/health", async () => ({
  status: "ok",
}));

app.listen({ port: app.config.PORT }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
