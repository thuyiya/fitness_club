/**
 * Extracts FDA "big 9" allergens from a USDA branded ingredient statement.
 *
 * READ THIS BEFORE TRUSTING THE OUTPUT. USDA publishes no structured allergen
 * field --- only the ingredient text as printed on the package. Everything here
 * is therefore INFERENCE, and it lands in `foods.allergens_derived`, never in
 * `foods.allergens`. The distinction is the whole point: `allergens` answers
 * "the manufacturer declared this", which is what an exclusion filter needs;
 * this column answers "these words appeared in the ingredient list", which is
 * good enough to warn someone and not good enough to clear a food.
 *
 * The failure mode that matters is a FALSE NEGATIVE --- missing "casein" and
 * letting a milk-allergic member see a food as clean. So `include` leans broad,
 * and `exclude` exists only to kill the specific phrases that would otherwise
 * make the column useless through noise ("coconut milk" is not milk, "eggplant"
 * is not egg). Exclusions are stripped from the text BEFORE includes are tested,
 * so "coconut milk, whey" still yields milk --- via `whey`, as it should.
 */

export const PARSER_VERSION = "ingredient_text_parse@v1";

/**
 * Phrases removed before matching, PER ALLERGEN.
 *
 * Scoping matters and the scoping bug is instructive: "peanut butter" has to be
 * hidden from the `milk` matcher, because `butter` is a milk word --- but hiding
 * it globally also hides `peanut`, turning a jar of peanut butter into a food
 * with no allergens at all. An exclusion can only ever REMOVE an allergen, so it
 * is applied to the one matcher it protects and to nothing else.
 */
const EXCLUDE_BY_ALLERGEN = {
  milk: [
    // "milk"/"butter"/"cream" as a texture or format word for plant products.
    "coconut milk", "coconut cream", "coconut butter", "coconut oil", "coconut water",
    "almond milk", "soy milk", "soya milk", "rice milk", "oat milk", "cashew milk",
    "hemp milk", "flax milk", "pea milk", "milk thistle", "milk of magnesia",
    "cocoa butter", "shea butter", "peanut butter", "almond butter", "cashew butter",
    "sunflower butter", "seed butter", "nut butter", "apple butter", "pumpkin butter",
    "butter flavor", "butter flavour", "buttercup", "butterfly", "butternut",
    "cream of tartar", "creamer of tartar", "non dairy", "nondairy", "dairy free",
  ],
  tree_nuts: [
    "nutmeg", "nutritional yeast", "nutrient", "nutrition", "water chestnut",
    "coconut", "doughnut", "donut", "butternut", "nut free",
  ],
  peanuts: ["peanut free"],
  wheat: ["buckwheat", "wheatgrass", "wheat grass", "wheat free"],
  fish: [
    // "fish" as a substring of creatures handled by other matchers.
    "shellfish", "cuttlefish", "crayfish", "crawfish", "jellyfish", "fish free",
  ],
  eggs: ["eggplant", "egg plant", "egg free", "eggshell", "egg shell"],
  soybeans: ["soy free"],
  sesame: ["sesame free"],
  molluscs: [],
  crustacean_shellfish: [],
};

/**
 * allergen id (from seed/reference/allergens.json) -> word patterns.
 * Matched as whole words against the scrubbed, lower-cased ingredient text.
 */
export const ALLERGEN_PATTERNS = {
  milk: [
    "milk", "milkfat", "buttermilk", "butter", "cream", "creamer", "half and half",
    "cheese", "whey", "casein", "caseinate", "caseinates", "sodium caseinate",
    "calcium caseinate", "lactose", "lactalbumin", "lactoglobulin", "lactoferrin",
    "yogurt", "yoghurt", "ghee", "curd", "curds", "custard", "kefir", "quark",
    "ricotta", "mozzarella", "parmesan", "cheddar", "romano", "asiago", "provolone",
    "mascarpone", "gouda", "brie", "feta", "condensed milk", "evaporated milk",
    "dairy", "nougat", "rennet",
  ],
  eggs: [
    "egg", "eggs", "egg white", "egg whites", "egg yolk", "egg yolks", "albumin",
    "albumen", "ovalbumin", "ovoglobulin", "globulin", "livetin", "lysozyme",
    "mayonnaise", "mayo", "meringue", "surimi",
  ],
  fish: [
    "fish", "anchovy", "anchovies", "bass", "bonito", "catfish", "cod", "flounder",
    "grouper", "haddock", "hake", "halibut", "herring", "mackerel", "mahi mahi",
    "perch", "pike", "pollock", "pollack", "salmon", "sardine", "sardines", "snapper",
    "sole", "swordfish", "tilapia", "trout", "tuna", "whitefish", "caviar", "roe",
    "worcestershire", "fish oil", "fish sauce", "bonito flakes",
  ],
  crustacean_shellfish: [
    "crab", "crabmeat", "lobster", "langoustine", "prawn", "prawns", "shrimp",
    "krill", "crustacean", "crustaceans", "scampi", "crayfish", "crawfish",
  ],
  molluscs: [
    "clam", "clams", "mussel", "mussels", "oyster", "oysters", "scallop", "scallops",
    "squid", "calamari", "octopus", "snail", "escargot", "abalone", "cuttlefish", "mollusc", "mollusk",
  ],
  tree_nuts: [
    "almond", "almonds", "brazil nut", "brazil nuts", "cashew", "cashews",
    "chestnut", "chestnuts", "filbert", "filberts", "hazelnut", "hazelnuts",
    "macadamia", "pecan", "pecans", "pistachio", "pistachios", "walnut", "walnuts",
    "pine nut", "pine nuts", "pignoli", "praline", "marzipan", "gianduja",
    "tree nut", "tree nuts", "nut meal", "nut paste", "almond flour", "almond extract",
  ],
  peanuts: [
    "peanut", "peanuts", "peanut butter", "peanut oil", "peanut flour", "arachis",
    "arachis oil", "groundnut", "groundnuts", "goober", "beer nuts", "monkey nuts",
  ],
  wheat: [
    "wheat", "wheat flour", "whole wheat", "enriched flour", "bleached flour",
    "all purpose flour", "bread flour", "cake flour", "pastry flour", "white flour",
    "bulgur", "durum", "einkorn", "emmer", "farina", "farro", "graham", "graham flour",
    "kamut", "semolina", "spelt", "seitan", "couscous", "matzo", "matzoh", "matzah",
    "wheat bran", "wheat germ", "wheat starch", "wheat gluten", "vital wheat gluten",
    "wheat protein", "triticale", "freekeh", "fu",
  ],
  soybeans: [
    "soy", "soya", "soybean", "soybeans", "soy lecithin", "soy protein",
    "soy protein isolate", "soy protein concentrate", "soy flour", "soy sauce",
    "soybean oil", "edamame", "miso", "natto", "tempeh", "tofu", "tamari",
    "textured vegetable protein", "tvp", "okara", "yuba",
  ],
  sesame: [
    "sesame", "sesame seed", "sesame seeds", "sesame oil", "sesame paste", "tahini",
    "tahina", "benne", "benne seed", "gingelly", "gingelly oil", "sesamol", "sesamin", "halvah", "halva",
  ],
};

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * One allergen's exclusion strip, longest-first so "coconut milk" is consumed
 * before the shorter "coconut" can match inside it. Empty string = strip nothing.
 */
export function excludeRegex(allergen) {
  const phrases = EXCLUDE_BY_ALLERGEN[allergen] ?? [];
  if (phrases.length === 0) return "";
  return [...phrases].sort((a, b) => b.length - a.length).map(escape).join("|");
}

/**
 * Whole-word alternation for one allergen. Explicit non-letter boundaries are
 * used rather than `\y`/`[[:<:]]` so the expression means the same thing in
 * JavaScript and in Postgres, which is what lets the two passes be compared.
 */
export function includeRegex(allergen) {
  const words = [...ALLERGEN_PATTERNS[allergen]].sort((a, b) => b.length - a.length).map(escape);
  return `(^|[^a-z])(${words.join("|")})([^a-z]|$)`;
}

/** Reference implementation --- the generated SQL pass must agree with this. */
export function deriveAllergens(ingredientsText) {
  if (!ingredientsText || !ingredientsText.trim()) return [];
  const lower = ingredientsText.toLowerCase();
  const found = [];
  for (const allergen of Object.keys(ALLERGEN_PATTERNS)) {
    const ex = excludeRegex(allergen);
    const scrubbed = ex ? lower.replace(new RegExp(ex, "g"), " ") : lower;
    if (new RegExp(includeRegex(allergen)).test(scrubbed)) found.push(allergen);
  }
  return found.sort();
}

export { EXCLUDE_BY_ALLERGEN };
