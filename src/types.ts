export type Category =
  | "蔬菜类"
  | "肉类"
  | "蛋奶类"
  | "豆制品"
  | "主食类"
  | "水果类"
  | "调料类"
  | "酱料类"
  | "速食品/冷冻食品"
  | "其他";

export type Unit = "克" | "个" | "颗" | "袋" | "盒" | "瓶" | "勺" | "小勺" | "碗" | "份" | "把" | "根" | "片" | "瓣" | "听" | "块";

export type Ingredient = {
  id: string;
  name: string;
  category: Category;
  quantity: number;
  unit: Unit;
  expiringSoon: boolean;
  purchaseDate: string;
  expiryDate: string;
  note: string;
};

export type Nutrition = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sodium: number;
};

export type RecipeIngredient = {
  name: string;
  amount: number;
  unit: Unit;
  category: Category;
  required: boolean;
  role: "main" | "assistant" | "staple" | "seasoning";
};

export type Recipe = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
  taste: string[];
  difficulty: "简单" | "中等" | "稍难";
  minutes: number;
  servings: number;
  mealTypes: string[];
  tags: string[];
  ingredients: RecipeIngredient[];
  seasonings: RecipeIngredient[];
  steps: string[];
  tips: string[];
  alternatives: string[];
  nutritionPerServing: Nutrition;
};

export type IngredientNeed = RecipeIngredient & {
  requiredAmount: number;
  ownedAmount: number;
  needBuyAmount: number;
  displayRequired: string;
  displayOwned: string;
  displayNeed: string;
  suggestion: string;
};

export type RecipeMatch = {
  recipe: Recipe;
  score: number;
  percent: number;
  canCook: boolean;
  needsShopping: boolean;
  reason: string;
  ownedEnough: IngredientNeed[];
  ownedPartial: IngredientNeed[];
  missing: IngredientNeed[];
  optionalMissing: IngredientNeed[];
  expiringHits: IngredientNeed[];
  estimatedCost: string;
};

export type ShoppingItem = {
  id: string;
  name: string;
  category: Category;
  amount: string;
  checked: boolean;
};

export type WeeklyPlan = Record<string, Record<string, string[]>>;
