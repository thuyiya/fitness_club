-- Requires the pgvector/pgvector:pg17 image (infra/docker-compose.yml). Split
-- out of 0001 so the rest of the schema is not blocked on pulling that image.
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "embedding" vector(384);
--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "embedding" vector(384);
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "embedding" vector(384);
--> statement-breakpoint
-- Cosine distance: the embeddings are normalised, so direction is what matters.
-- Built before seeding; rebuild after a bulk load for a better graph.
CREATE INDEX "foods_embedding_idx" ON "foods" USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint
CREATE INDEX "meals_embedding_idx" ON "meals" USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint
CREATE INDEX "exercises_embedding_idx" ON "exercises" USING hnsw ("embedding" vector_cosine_ops);
