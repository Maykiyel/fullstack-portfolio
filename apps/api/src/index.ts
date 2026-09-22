import Fastify from "fastify";
import { error } from "node:console";

const app = Fastify({ logger: true });

app.get("/api/v1/health", async () => ({
  status: "ok",
}));

app.listen({ port: 3001 }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
