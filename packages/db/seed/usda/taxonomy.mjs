/**
 * Maps USDA's own categories onto the 15-value `group` vocabulary in
 * seed/reference/ so that imported foods appear in the same browse UI as the
 * curated catalog.
 *
 * `foods.usda_category` always keeps USDA's string verbatim, so a wrong guess
 * here costs a browse placement and never destroys the original classification.
 * NULL is a deliberate answer: "Frozen Dinners & Entrees" is not a vegetable or
 * a grain, and forcing it into one would make the group filter lie. Roughly a
 * fifth of branded rows land on NULL by design.
 */

/** The 28 core categories (Foundation / SR Legacy), which are clean enough to map by hand. */
const CORE_CATEGORY_GROUP = {
  "Dairy and Egg Products": "dairy",
  "Spices and Herbs": "condiments",
  "Baby Foods": null,
  "Fats and Oils": "fats_oils",
  "Poultry Products": "meat_poultry",
  "Soups, Sauces, and Gravies": "condiments",
  "Sausages and Luncheon Meats": "meat_poultry",
  "Breakfast Cereals": "grains",
  "Fruits and Fruit Juices": "fruits",
  "Pork Products": "meat_poultry",
  "Vegetables and Vegetable Products": "vegetables",
  "Nut and Seed Products": "nuts_seeds",
  "Beef Products": "meat_poultry",
  Beverages: "beverages",
  "Finfish and Shellfish Products": "fish_seafood",
  "Legumes and Legume Products": "legumes",
  "Lamb, Veal, and Game Products": "meat_poultry",
  "Baked Products": "grains",
  Sweets: null,
  "Cereal Grains and Pasta": "grains",
  "Fast Foods": null,
  "Meals, Entrees, and Side Dishes": null,
  Snacks: null,
  "American Indian/Alaska Native Foods": null,
  "Restaurant Foods": null,
  "Branded Food Products Database": null,
  "Quality Control Materials": null,
  "Alcoholic Beverages": "beverages",
};

/**
 * Ordered rules for the 449 branded categories. FIRST MATCH WINS, so the list
 * runs most-specific first --- "Nut & Seed Butters" has to be claimed by
 * nuts_seeds before the generic butter rule hands it to fats_oils, and
 * "Plant Based Milk" before the milk rule hands it to dairy.
 */
const BRANDED_RULES = [
  [/nut & seed butter|nut and seed butter/i, "nuts_seeds"],
  [/plant based milk|milk substitute|non[- ]dairy/i, "beverages"],
  [/^eggs|egg substitutes/i, "eggs"],

  [/popcorn, peanuts, seeds|^nuts|nuts &|trail mix/i, "nuts_seeds"],
  [/cheese|yogurt|^milk$|^milk\b|^cream$|^cream\b|milk additives|dairy/i, "dairy"],
  [/butter & spread|vegetable & cooking oil|cooking oil|^oils|shortening|margarine/i, "fats_oils"],

  [/fish|seafood|tuna|sushi|shellfish/i, "fish_seafood"],
  [/bacon, sausage|sausages, hotdogs|pepperoni, salami|cold cuts|poultry, chicken|canned meat|^other meats|meat\/poultry|jerky/i, "meat_poultry"],

  [/canned & bottled beans|lentil|^beans|legume|tofu|hummus/i, "legumes"],
  [/^rice$|^rice\b|pasta by shape|all noodles|^cereal$|flours & corn meal|other grains & seeds|^bread$|breads & buns|bread & muffin|processed cereal|flavored rice/i, "grains"],
  [/french fries, potatoes|potato/i, "starchy_veg"],

  [/vegetable|tomatoes|pickles, olives, peppers|^salad/i, "vegetables"],
  [/fruit|^canned fruit|jam, jelly/i, "fruits"],

  [/soda|water|juice|drinks|beverage|coffee|tea|^alcohol$|beer|wine|liquor/i, "beverages"],
  [/protein powder|meal replacement|supplement|vitamin/i, "supplements"],

  [/sauce|dressing|mayonnaise|ketchup, mustard|condiment|dips & salsa|seasoning|herbs & spices|gravy|syrup|honey|marinade|vinegar|spread/i, "condiments"],

  // Bakery and confectionery deliberately fall through to NULL: a cupcake is
  // not a grain in any sense a member browsing "grains" would expect.
];

/**
 * Some USDA core categories are two groups in a trench coat. "Dairy and Egg
 * Products" holds both, and the description is the only thing that separates
 * them, so it gets a second look rather than sending every egg into dairy.
 */
const DESCRIPTION_OVERRIDES = [
  [/^eggs?\b|^egg,|egg substitute|egg white|egg yolk/i, "eggs"],
];

/**
 * @param usdaCategory  food_category.description, or branded_food_category
 * @param description   the food's own name, used only to split mixed categories
 * @param dataType      USDA data_type, which decides which rule set applies
 */
export function resolveGroup(usdaCategory, description, dataType) {
  const category = (usdaCategory ?? "").trim();

  if (dataType !== "branded_food") {
    const group = CORE_CATEGORY_GROUP[category] ?? null;
    if (group === "dairy" && description) {
      for (const [re, override] of DESCRIPTION_OVERRIDES) if (re.test(description)) return override;
    }
    return group;
  }

  if (!category) return null;
  for (const [re, group] of BRANDED_RULES) if (re.test(category)) return group;
  return null;
}

export { CORE_CATEGORY_GROUP, BRANDED_RULES };
