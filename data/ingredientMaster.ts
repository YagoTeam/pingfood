import type { Category, Unit } from "../src/types";

export type IngredientMasterItem = {
  name: string;
  aliases: string[];
  category: Category;
  defaultUnit: Unit;
  defaultAmount: number;
  gramsPerUnit: number;
  isSeasoning: boolean;
  isStaple: boolean;
};

export const ingredientMaster: IngredientMasterItem[] = [
  { name: "猪肉", aliases: ["猪里脊", "里脊肉", "猪里脊肉", "瘦肉", "肉丝", "猪颈肉", "肉末"], category: "肉类", defaultUnit: "克", defaultAmount: 300, gramsPerUnit: 1, isSeasoning: false, isStaple: false },
  { name: "牛肉", aliases: ["牛腩", "肥牛"], category: "肉类", defaultUnit: "克", defaultAmount: 300, gramsPerUnit: 1, isSeasoning: false, isStaple: false },
  { name: "鸡肉", aliases: ["鸡腿肉", "鸡胸肉", "鸡块"], category: "肉类", defaultUnit: "克", defaultAmount: 300, gramsPerUnit: 1, isSeasoning: false, isStaple: false },
  { name: "鸡翅", aliases: ["翅中", "鸡中翅"], category: "肉类", defaultUnit: "克", defaultAmount: 500, gramsPerUnit: 1, isSeasoning: false, isStaple: false },
  { name: "鸡蛋", aliases: ["蛋", "土鸡蛋"], category: "蛋奶类", defaultUnit: "个", defaultAmount: 2, gramsPerUnit: 50, isSeasoning: false, isStaple: false },
  { name: "土豆", aliases: ["马铃薯", "洋芋"], category: "蔬菜类", defaultUnit: "个", defaultAmount: 2, gramsPerUnit: 150, isSeasoning: false, isStaple: false },
  { name: "番茄", aliases: ["西红柿"], category: "蔬菜类", defaultUnit: "个", defaultAmount: 2, gramsPerUnit: 180, isSeasoning: false, isStaple: false },
  { name: "青菜", aliases: ["小青菜", "上海青", "青菜一把"], category: "蔬菜类", defaultUnit: "把", defaultAmount: 1, gramsPerUnit: 250, isSeasoning: false, isStaple: false },
  { name: "青椒", aliases: ["辣椒", "菜椒"], category: "蔬菜类", defaultUnit: "个", defaultAmount: 2, gramsPerUnit: 80, isSeasoning: false, isStaple: false },
  { name: "洋葱", aliases: ["圆葱"], category: "蔬菜类", defaultUnit: "个", defaultAmount: 1, gramsPerUnit: 180, isSeasoning: false, isStaple: false },
  { name: "胡萝卜", aliases: ["红萝卜"], category: "蔬菜类", defaultUnit: "根", defaultAmount: 1, gramsPerUnit: 150, isSeasoning: false, isStaple: false },
  { name: "豆腐", aliases: ["嫩豆腐", "老豆腐"], category: "豆制品", defaultUnit: "盒", defaultAmount: 1, gramsPerUnit: 300, isSeasoning: false, isStaple: false },
  { name: "米饭", aliases: ["饭", "剩米饭"], category: "主食类", defaultUnit: "碗", defaultAmount: 1, gramsPerUnit: 200, isSeasoning: false, isStaple: true },
  { name: "面条", aliases: ["挂面", "面"], category: "主食类", defaultUnit: "份", defaultAmount: 1, gramsPerUnit: 120, isSeasoning: false, isStaple: true },
  { name: "可乐", aliases: ["汽水"], category: "其他", defaultUnit: "瓶", defaultAmount: 1, gramsPerUnit: 300, isSeasoning: false, isStaple: false },
  { name: "火腿", aliases: ["火腿肠"], category: "肉类", defaultUnit: "根", defaultAmount: 1, gramsPerUnit: 50, isSeasoning: false, isStaple: false },
  { name: "葱", aliases: ["小葱", "香葱"], category: "调料类", defaultUnit: "把", defaultAmount: 1, gramsPerUnit: 40, isSeasoning: true, isStaple: false },
  { name: "姜", aliases: ["生姜"], category: "调料类", defaultUnit: "块", defaultAmount: 1, gramsPerUnit: 30, isSeasoning: true, isStaple: false },
  { name: "蒜", aliases: ["大蒜", "蒜瓣"], category: "调料类", defaultUnit: "瓣", defaultAmount: 3, gramsPerUnit: 5, isSeasoning: true, isStaple: false },
  { name: "盐", aliases: ["食盐"], category: "调料类", defaultUnit: "瓶", defaultAmount: 1, gramsPerUnit: 1, isSeasoning: true, isStaple: false },
  { name: "糖", aliases: ["白糖"], category: "调料类", defaultUnit: "瓶", defaultAmount: 1, gramsPerUnit: 1, isSeasoning: true, isStaple: false },
  { name: "生抽", aliases: ["酱油"], category: "调料类", defaultUnit: "瓶", defaultAmount: 1, gramsPerUnit: 1, isSeasoning: true, isStaple: false },
  { name: "老抽", aliases: [], category: "调料类", defaultUnit: "瓶", defaultAmount: 1, gramsPerUnit: 1, isSeasoning: true, isStaple: false },
  { name: "蚝油", aliases: [], category: "调料类", defaultUnit: "瓶", defaultAmount: 1, gramsPerUnit: 1, isSeasoning: true, isStaple: false },
  { name: "醋", aliases: ["米醋", "陈醋"], category: "调料类", defaultUnit: "瓶", defaultAmount: 1, gramsPerUnit: 1, isSeasoning: true, isStaple: false },
  { name: "料酒", aliases: [], category: "调料类", defaultUnit: "瓶", defaultAmount: 1, gramsPerUnit: 1, isSeasoning: true, isStaple: false },
  { name: "淀粉", aliases: ["生粉"], category: "调料类", defaultUnit: "袋", defaultAmount: 1, gramsPerUnit: 1, isSeasoning: true, isStaple: false },
  { name: "豆瓣酱", aliases: ["郫县豆瓣"], category: "酱料类", defaultUnit: "瓶", defaultAmount: 1, gramsPerUnit: 1, isSeasoning: true, isStaple: false },
];

const units: Unit[] = ["克", "个", "颗", "袋", "盒", "瓶", "勺", "小勺", "碗", "份", "把", "根", "片", "瓣", "听", "块"];

export function detectIngredientInfo(inputName: string) {
  const input = cleanName(inputName);
  if (!input) return null;
  return (
    ingredientMaster.find((item) => cleanName(item.name) === input) ||
    ingredientMaster.find((item) => item.aliases.some((alias) => cleanName(alias) === input)) ||
    ingredientMaster.find((item) => [item.name, ...item.aliases].some((name) => input.includes(cleanName(name)) || cleanName(name).includes(input))) ||
    null
  );
}

export function normalizeIngredientName(inputName: string) {
  return detectIngredientInfo(inputName)?.name || cleanName(inputName);
}

export function getGramsPerUnit(inputName: string, unit: Unit) {
  if (unit === "克") return 1;
  const info = detectIngredientInfo(inputName);
  if (info && unit === "份") return info.defaultAmount * info.gramsPerUnit;
  if (info) return info.gramsPerUnit;
  if (unit === "个" || unit === "颗") return 100;
  if (unit === "碗") return 200;
  if (unit === "把") return 250;
  return 1;
}

export function toStandardAmount(inputName: string, amount: number, unit: Unit) {
  return amount * getGramsPerUnit(inputName, unit);
}

export function formatAmount(amount: number, unit: Unit) {
  const rounded = Number.isInteger(amount) ? amount : Number(amount.toFixed(1));
  return `${rounded}${unit}`;
}

export function parseInventoryText(text: string) {
  const normalized = text
    .replace(/[，、；;\n]/g, ",")
    .replace(/\s+/g, ",")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return normalized.map((part) => {
    const match = part.match(/(半|一|二|两|三|四|五|六|七|八|九|十|\d+(?:\.\d+)?)\s*(g|克|个|颗|袋|盒|瓶|小勺|勺|碗|份|把|根|片|瓣|听|块)?/i);
    const unitText = normalizeUnit(match?.[2]);
    const amount = match ? parseAmount(match[1]) : undefined;
    const rawName = match ? part.replace(match[0], "") : part;
    const info = detectIngredientInfo(rawName || part);
    const unit = unitText || info?.defaultUnit || "份";
    return {
      name: info?.name || cleanName(rawName || part),
      amount: amount ?? info?.defaultAmount ?? 1,
      unit,
      category: info?.category || "其他",
    };
  });
}

function parseAmount(value: string) {
  const map: Record<string, number> = { 半: 0.5, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  return map[value] ?? Number(value);
}

function normalizeUnit(unit?: string): Unit | undefined {
  if (!unit) return undefined;
  if (unit.toLowerCase() === "g") return "克";
  return units.includes(unit as Unit) ? (unit as Unit) : undefined;
}

function cleanName(name: string) {
  return name.trim().replace(/\s/g, "").replace(/一把|一袋|一盒|一瓶|少许|适量/g, "");
}
