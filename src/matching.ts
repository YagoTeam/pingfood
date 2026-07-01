import { detectIngredientInfo, formatAmount, normalizeIngredientName, toStandardAmount } from "../data/ingredientMaster";
import type { Ingredient, IngredientNeed, Recipe, RecipeIngredient, RecipeMatch, Unit } from "./types";

export type MatchOptions = {
  mealType?: string;
  people?: number;
  preferences?: string[];
  timeLimit?: number;
  useExpiring?: boolean;
  noShopping?: boolean;
  disliked?: string[];
};

export function allRecipeItems(recipe: Recipe) {
  return [...recipe.ingredients, ...recipe.seasonings];
}

export function matchRecipesByInventory(inventory: Ingredient[], recipes: Recipe[], options: MatchOptions = {}) {
  return recipes
    .map((recipe) => matchRecipeByInventory(recipe, inventory, options))
    .filter((match) => {
      if (options.timeLimit && options.timeLimit < 60 && match.recipe.minutes > options.timeLimit) return false;
      if (options.noShopping) return match.missing.filter((item) => item.required && item.role !== "seasoning").length <= 2;
      return true;
    })
    .sort((a, b) => b.score - a.score);
}

export function matchRecipeByInventory(recipe: Recipe, inventory: Ingredient[], options: MatchOptions = {}): RecipeMatch {
  const people = Math.max(1, options.people || recipe.servings);
  const scale = people / recipe.servings;
  const needs = allRecipeItems(recipe).map((item) => buildNeed(item, inventory, scale));
  const ownedEnough = needs.filter((need) => need.ownedAmount >= need.requiredAmount && need.requiredAmount > 0);
  const ownedPartial = needs.filter((need) => need.ownedAmount > 0 && need.ownedAmount < need.requiredAmount);
  const missing = needs.filter((need) => need.ownedAmount <= 0 && need.required);
  const optionalMissing = needs.filter((need) => need.ownedAmount <= 0 && !need.required);
  const expiringNames = inventory.filter((item) => item.expiringSoon).map((item) => normalizeIngredientName(item.name));
  const expiringHits = needs.filter((need) => expiringNames.includes(normalizeIngredientName(need.name)) && need.ownedAmount > 0);
  const hardMissing = missing.filter((need) => need.required && need.role !== "seasoning");
  const dislikedHits = (options.disliked || []).filter((bad) => allRecipeItems(recipe).some((item) => sameIngredient(item.name, bad)));

  let score = 0;
  recipe.ingredients.forEach((ingredient) => {
    const need = needs.find((item) => sameIngredient(item.name, ingredient.name));
    if (!need) return;
    const isMain = ingredient.required && ingredient.role !== "seasoning";
    if (need.ownedAmount >= need.requiredAmount) score += isMain ? 60 : 28;
    else if (need.ownedAmount > 0) score += isMain ? 18 : 8;
    else score -= isMain ? 70 : 15;
  });
  if (expiringHits.length && options.useExpiring) score += 15;
  if (options.mealType && recipe.mealTypes.includes(options.mealType)) score += 8;
  if (options.preferences?.some((pref) => recipe.tags.includes(pref) || recipe.taste.includes(pref))) score += 10;
  if (options.timeLimit && (recipe.minutes <= options.timeLimit || options.timeLimit === 60)) score += 10;
  if (dislikedHits.length) score = -999;
  if (hardMissing.length) score -= hardMissing.length * 55;

  const canCook = hardMissing.length === 0 && ownedPartial.filter((need) => need.required && need.role !== "seasoning").length === 0;
  const hasRequiredPartial = ownedPartial.some((need) => need.required && need.role !== "seasoning");
  const cap = hardMissing.length ? 45 : hasRequiredPartial ? 82 : 100;
  const normalizedScore = Math.max(0, Math.min(cap, Math.round(score)));
  const needsShopping = missing.length > 0 || ownedPartial.length > 0 || optionalMissing.length > 0;
  return {
    recipe,
    score: normalizedScore,
    percent: normalizedScore,
    canCook,
    needsShopping,
    reason: buildReason(recipe, ownedEnough, ownedPartial, hardMissing, people),
    ownedEnough,
    ownedPartial,
    missing,
    optionalMissing,
    expiringHits,
    estimatedCost: "待估算",
  };
}

export function generateShoppingSuggestion(recipe: Recipe, inventory: Ingredient[], servings = recipe.servings) {
  const match = matchRecipeByInventory(recipe, inventory, { people: servings });
  return {
    recipeName: recipe.name,
    servings,
    missingItems: [...match.ownedPartial, ...match.missing, ...match.optionalMissing].map((item) => ({
      name: item.name,
      requiredAmount: item.requiredAmount,
      ownedAmount: item.ownedAmount,
      needBuyAmount: item.needBuyAmount,
      unit: item.unit,
      suggestion: item.suggestion,
    })),
  };
}

export function searchRecipes(query: string, recipes: Recipe[]) {
  const text = query.trim();
  if (!text) return recipes;
  const normalizedQuery = normalizeIngredientName(text);
  return recipes.filter((recipe) => {
    const haystack = [
      recipe.name,
      recipe.description,
      recipe.category,
      ...recipe.tags,
      ...recipe.taste,
      ...allRecipeItems(recipe).flatMap((item) => [item.name, normalizeIngredientName(item.name)]),
    ];
    return haystack.some((value) => value.includes(text) || value.includes(normalizedQuery) || normalizedQuery.includes(value));
  });
}

function buildNeed(item: RecipeIngredient, inventory: Ingredient[], scale: number): IngredientNeed {
  const requiredAmount = item.amount * scale;
  const owned = inventory
    .filter((stock) => sameIngredient(stock.name, item.name))
    .reduce((sum, stock) => sum + toStandardAmount(stock.name, stock.quantity, stock.unit), 0);
  const requiredStandard = toStandardAmount(item.name, requiredAmount, item.unit);
  const ownedInRecipeUnit = convertStandardToUnit(item.name, owned, item.unit);
  const needBuyAmount = Math.max(0, requiredAmount - ownedInRecipeUnit);
  return {
    ...item,
    amount: requiredAmount,
    requiredAmount,
    ownedAmount: ownedInRecipeUnit,
    needBuyAmount,
    displayRequired: formatAmount(requiredAmount, item.unit),
    displayOwned: formatAmount(ownedInRecipeUnit, item.unit),
    displayNeed: formatAmount(needBuyAmount, item.unit),
    suggestion: buildShoppingText(item, needBuyAmount),
  };
}

function convertStandardToUnit(name: string, standardAmount: number, unit: Unit) {
  if (unit === "克") return standardAmount;
  const gramsPerUnit = toStandardAmount(name, 1, unit);
  return gramsPerUnit ? standardAmount / gramsPerUnit : standardAmount;
}

function buildReason(recipe: Recipe, enough: IngredientNeed[], partial: IngredientNeed[], missingRequired: IngredientNeed[], people: number) {
  if (!missingRequired.length && !partial.some((item) => item.required && item.role !== "seasoning")) {
    const names = enough.filter((item) => item.role !== "seasoning").map((item) => item.name).slice(0, 3);
    return `家里已有${names.join("和") || "关键食材"}，${people}人份基本够用，${recipe.minutes}分钟能做好。`;
  }
  if (enough.length || partial.length) {
    const ownedNames = [...enough, ...partial].filter((item) => item.role !== "seasoning").map((item) => item.name).slice(0, 3);
    const missingNames = missingRequired.map((item) => item.name).slice(0, 2);
    if (missingNames.length) return `家里有${ownedNames.join("、") || "一部分食材"}，但还缺${missingNames.join("、")}，补齐后更适合做这道菜。`;
    const partialNames = partial.filter((item) => item.role !== "seasoning").map((item) => `${item.name}还差${item.displayNeed}`).slice(0, 2);
    return `家里有${ownedNames.join("、") || "一部分食材"}，${partialNames.join("、")}，补一点就能做。`;
  }
  return `当前库存和这道菜的关键食材匹配较少，建议先补齐${missingRequired.map((item) => item.name).slice(0, 2).join("、")}。`;
}

function buildShoppingText(item: RecipeIngredient, needAmount: number) {
  if (needAmount <= 0) return "不用购买，家里够用";
  const info = detectIngredientInfo(item.name);
  if (info?.isSeasoning || item.role === "seasoning") return `如果家里没有${item.name}，可以少量购买，不是必须`;
  if (item.name === "鸡蛋") return `鸡蛋还差${formatAmount(needAmount, item.unit)}，建议买1盒鸡蛋，后面还能用`;
  if (item.name === "鸡翅") return `建议购买鸡翅约${formatAmount(needAmount, item.unit)}，约8-10个`;
  if (item.name === "青菜") return `建议买${Math.max(1, Math.ceil(needAmount))}把青菜`;
  if (item.name === "土豆") return `建议买${Math.max(1, Math.ceil(needAmount))}个中等大小土豆`;
  if (item.name === "番茄") return `建议买${Math.max(1, Math.ceil(needAmount))}个番茄`;
  if (["猪肉", "牛肉", "鸡肉"].includes(item.name)) return `建议购买${item.name}约${formatAmount(needAmount, item.unit)}`;
  if (item.name === "可乐") return "建议购买1瓶500ml可乐";
  return `建议购买${item.name}${formatAmount(needAmount, item.unit)}`;
}

function sameIngredient(a: string, b: string) {
  return normalizeIngredientName(a) === normalizeIngredientName(b);
}
