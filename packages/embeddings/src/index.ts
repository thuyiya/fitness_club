import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

/**
 * Local sentence embeddings. all-MiniLM-L6-v2 runs on CPU through ONNX in
 * ~25MB of weights, so semantic search costs nothing per query and no text
 * leaves the host --- which matters when the text is a member's food diary.
 *
 * 384 dimensions, matching the vector(384) columns in the schema. Changing the
 * model means changing those columns and re-embedding everything.
 */
export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const EMBEDDING_DIMENSIONS = 384;

let extractor: Promise<FeatureExtractionPipeline> | null = null;

/**
 * Loaded lazily and once. The first call pays the model load (a few seconds);
 * keeping it out of module scope means /health and every non-search route stay
 * fast even on a cold start.
 */
function getExtractor() {
  extractor ??= pipeline("feature-extraction", EMBEDDING_MODEL, { dtype: "fp32" });
  return extractor;
}

/** Normalised mean-pooled embedding, ready for cosine distance. */
export async function embed(text: string): Promise<number[]> {
  const [vector] = await embedBatch([text]);
  return vector!;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const extract = await getExtractor();
  const output = await extract(texts, { pooling: "mean", normalize: true });
  const data = output.data as Float32Array;
  const [rows, dims] = output.dims as [number, number];

  if (dims !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Model produced ${dims} dimensions, schema expects ${EMBEDDING_DIMENSIONS}`);
  }
  return Array.from({ length: rows }, (_, i) => Array.from(data.slice(i * dims, (i + 1) * dims)));
}

/** pgvector's text input format. */
export const toVectorLiteral = (embedding: number[]) => `[${embedding.join(",")}]`;

/**
 * What gets embedded for each row type. Kept here rather than at the call
 * sites so the seeder and the query path always describe things the same way
 * --- embedding a food as "name, group" while searching with a bare phrase
 * quietly degrades every result.
 */
export const describe = {
  food: (f: { name: string; brand?: string | null; group?: string | null; dietaryTags?: string[] }) =>
    [f.name, f.brand, f.group?.replace(/_/g, " "), ...(f.dietaryTags ?? []).map((t) => t.replace(/_/g, " "))]
      .filter(Boolean)
      .join(", "),

  meal: (m: { name: string; tags?: string[]; ingredients?: string[] }) =>
    [m.name, ...(m.tags ?? []).map((t) => t.replace(/_/g, " ")), ...(m.ingredients ?? [])]
      .filter(Boolean)
      .join(", "),

  exercise: (e: {
    name: string;
    description?: string | null;
    discipline?: string | null;
    category?: string | null;
    movementPattern?: string | null;
    muscleGroups?: string[];
    equipment?: string[];
    tags?: string[];
  }) =>
    [
      e.name,
      e.description,
      e.discipline,
      e.category,
      e.movementPattern?.replace(/_/g, " "),
      ...(e.muscleGroups ?? []).map((m) => m.replace(/_/g, " ")),
      ...(e.equipment ?? []).map((m) => m.replace(/_/g, " ")),
      ...(e.tags ?? []).map((t) => t.replace(/_/g, " ")),
    ]
      .filter(Boolean)
      .join(", "),
};
