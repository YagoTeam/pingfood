import {
  CalendarDays,
  Check,
  ChefHat,
  Clock3,
  Heart,
  Home,
  ListPlus,
  NotebookTabs,
  Pencil,
  Plus,
  Search,
  ShoppingBasket,
  Sparkles,
  Star,
  Trash2,
  Utensils,
} from "lucide-react";
import { useMemo, useState } from "react";
import { detectIngredientInfo, parseInventoryText } from "../data/ingredientMaster";
import { categories, commonIngredients, nutritionSamples, recipes, starterInventory, units } from "./data";
import {
  generateShoppingSuggestion,
  matchRecipeByInventory,
  matchRecipesByInventory,
  searchRecipes,
} from "./matching";
import type { Category, Ingredient, Recipe, RecipeIngredient, RecipeMatch, ShoppingItem, WeeklyPlan } from "./types";

type Page = "home" | "inventory" | "recommend" | "search" | "weekly" | "shopping";

const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const meals = ["早餐", "午餐", "晚餐"];
const preferences = ["清淡", "家常", "下饭", "减油", "高蛋白", "快手", "汤类", "辣一点"];

const blankIngredient: Omit<Ingredient, "id"> = {
  name: "",
  category: "蔬菜类",
  quantity: 1,
  unit: "份",
  expiringSoon: false,
  purchaseDate: "",
  expiryDate: "",
  note: "",
};

const createWeeklyPlan = (): WeeklyPlan =>
  Object.fromEntries(days.map((day) => [day, Object.fromEntries(meals.map((meal) => [meal, []]))]));

function useStoredState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : initialValue;
  });

  const save = (next: T | ((current: T) => T)) => {
    setValue((current) => {
      const resolved = typeof next === "function" ? (next as (current: T) => T)(current) : next;
      localStorage.setItem(key, JSON.stringify(resolved));
      return resolved;
    });
  };

  return [value, save] as const;
}

function addUnique(list: string[], item: string) {
  return list.includes(item) ? list : [...list, item];
}

function AppShell({
  page,
  setPage,
  children,
}: {
  page: Page;
  setPage: (page: Page) => void;
  children: React.ReactNode;
}) {
  const nav = [
    { id: "home" as const, label: "首页", icon: Home },
    { id: "inventory" as const, label: "库存", icon: NotebookTabs },
    { id: "recommend" as const, label: "推荐", icon: Sparkles },
    { id: "search" as const, label: "菜谱", icon: Search },
    { id: "weekly" as const, label: "周菜单", icon: CalendarDays },
    { id: "shopping" as const, label: "采购", icon: ShoppingBasket },
  ];

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="sticky top-0 z-30 border-b border-white/80 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <button className="flex items-center gap-3 text-left" onClick={() => setPage("home")}>
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blush shadow-soft">
              <ChefHat size={24} />
            </span>
            <span>
              <span className="block text-lg font-black">老婆的可爱厨房</span>
              <span className="block text-xs text-ink/60">今天吃什么呀</span>
            </span>
          </button>
          <nav className="hidden items-center gap-1 rounded-full bg-white/70 p-1 shadow-soft md:flex">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`nav-pill ${page === item.id ? "nav-pill-active" : ""}`}
                  onClick={() => setPage(item.id)}
                  title={item.label}
                >
                  <Icon size={17} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 md:pb-10">{children}</main>
      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-6 rounded-[28px] bg-white/95 p-2 shadow-soft ring-1 ring-blush/60 md:hidden">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`mobile-tab ${page === item.id ? "mobile-tab-active" : ""}`}
              onClick={() => setPage(item.id)}
              title={item.label}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export function App() {
  const [page, setPage] = useState<Page>("home");
  const [inventory, setInventory] = useStoredState<Ingredient[]>("cute-kitchen-inventory", starterInventory);
  const [favorites, setFavorites] = useStoredState<string[]>("cute-kitchen-favorites", []);
  const [cooked, setCooked] = useStoredState<string[]>("cute-kitchen-cooked", []);
  const [ratings, setRatings] = useStoredState<Record<string, number>>("cute-kitchen-ratings", {});
  const [notes, setNotes] = useStoredState<Record<string, string>>("cute-kitchen-notes", {});
  const [shopping, setShopping] = useStoredState<ShoppingItem[]>("cute-kitchen-shopping", []);
  const [weekly, setWeekly] = useStoredState<WeeklyPlan>("cute-kitchen-weekly", createWeeklyPlan());
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const selectedRecipe = selectedRecipeId ? recipes.find((recipe) => recipe.id === selectedRecipeId) : null;

  const addShoppingMissing = (recipe: Recipe) => {
    const suggestion = generateShoppingSuggestion(recipe, inventory, recipe.servings);
    setShopping((current) => [
      ...current,
      ...suggestion.missingItems.map((item) => ({
        id: crypto.randomUUID(),
        name: item.name,
        category: recipe.ingredients.find((food) => food.name === item.name)?.category || recipe.seasonings.find((food) => food.name === item.name)?.category || "其他",
        amount: item.suggestion,
        checked: false,
      })),
    ]);
    setPage("shopping");
  };

  const addRecipeToWeekly = (recipeId: string, day = "周一", meal = "晚餐") => {
    setWeekly((current) => ({
      ...current,
      [day]: {
        ...current[day],
        [meal]: addUnique(current[day][meal], recipeId),
      },
    }));
    setPage("weekly");
  };

  const shared = {
    inventory,
    setInventory,
    favorites,
    setFavorites,
    cooked,
    setCooked,
    ratings,
    setRatings,
    notes,
    setNotes,
    shopping,
    setShopping,
    weekly,
    setWeekly,
    setPage,
    setSelectedRecipeId,
    addShoppingMissing,
    addRecipeToWeekly,
  };

  return (
    <AppShell page={page} setPage={setPage}>
      {selectedRecipe ? (
        <RecipeDetail recipe={selectedRecipe} onBack={() => setSelectedRecipeId(null)} {...shared} />
      ) : (
        <>
          {page === "home" && <HomePage {...shared} />}
          {page === "inventory" && <InventoryPage {...shared} />}
          {page === "recommend" && <RecommendPage {...shared} />}
          {page === "search" && <SearchPage {...shared} />}
          {page === "weekly" && <WeeklyPage {...shared} />}
          {page === "shopping" && <ShoppingPage {...shared} />}
        </>
      )}
    </AppShell>
  );
}

type SharedProps = ReturnType<typeof makeSharedProps>;
function makeSharedProps() {
  return {} as {
    inventory: Ingredient[];
    setInventory: (next: Ingredient[] | ((current: Ingredient[]) => Ingredient[])) => void;
    favorites: string[];
    setFavorites: (next: string[] | ((current: string[]) => string[])) => void;
    cooked: string[];
    setCooked: (next: string[] | ((current: string[]) => string[])) => void;
    ratings: Record<string, number>;
    setRatings: (next: Record<string, number> | ((current: Record<string, number>) => Record<string, number>)) => void;
    notes: Record<string, string>;
    setNotes: (next: Record<string, string> | ((current: Record<string, string>) => Record<string, string>)) => void;
    shopping: ShoppingItem[];
    setShopping: (next: ShoppingItem[] | ((current: ShoppingItem[]) => ShoppingItem[])) => void;
    weekly: WeeklyPlan;
    setWeekly: (next: WeeklyPlan | ((current: WeeklyPlan) => WeeklyPlan)) => void;
    setPage: (page: Page) => void;
    setSelectedRecipeId: (id: string | null) => void;
    addShoppingMissing: (recipe: Recipe) => void;
    addRecipeToWeekly: (recipeId: string, day?: string, meal?: string) => void;
  };
}

function HomePage(props: SharedProps) {
  const expiring = props.inventory.filter((item) => item.expiringSoon);
  const recommendation = matchRecipesByInventory(props.inventory, recipes, {
    mealType: "晚餐",
    people: 2,
    preferences: ["家常"],
    useExpiring: true,
  })[0];
  const shortcuts = [
    { label: "输入剩余食材", page: "inventory" as const, icon: NotebookTabs },
    { label: "智能推荐午餐/晚餐", page: "recommend" as const, icon: Sparkles },
    { label: "搜索菜谱", page: "search" as const, icon: Search },
    { label: "我的收藏", page: "search" as const, icon: Heart },
    { label: "一周菜单", page: "weekly" as const, icon: CalendarDays },
    { label: "购物清单", page: "shopping" as const, icon: ShoppingBasket },
  ];

  return (
    <div className="space-y-6">
      <section className="hero-band">
        <div className="max-w-2xl">
          <p className="mb-2 text-sm font-bold text-roseTea">Hi，欢迎回家</p>
          <h1 className="text-3xl font-black leading-tight md:text-5xl">今天想吃点什么呀？</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-ink/70 md:text-base">
            记下冰箱里有什么，自动凑出午餐、晚餐、汤和主食，还能把缺的食材变成采购清单。
          </p>
        </div>
        <div className="hidden text-8xl md:block">🍳</div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.label} className="pretty-card flex items-center gap-4 p-4 text-left" onClick={() => props.setPage(item.page)}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint">
                <Icon size={22} />
              </span>
              <span className="font-extrabold">{item.label}</span>
            </button>
          );
        })}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        {recommendation && (
          <section>
            <SectionTitle icon={<Utensils size={20} />} title="今日推荐菜" />
            <RecipeCard
              recipe={recommendation.recipe}
              match={recommendation}
              {...props}
            />
          </section>
        )}
        <section>
          <SectionTitle icon={<Clock3 size={20} />} title="快过期提醒" />
          <div className="pretty-card space-y-3 p-4">
            {expiring.length ? (
              expiring.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-yolk/30 p-3">
                  <span>
                    <b>{item.name}</b>
                    <span className="block text-xs text-ink/60">
                      {item.quantity}
                      {item.unit}，到期：{item.expiryDate || "未填写"}
                    </span>
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-roseTea">先吃我</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink/65">暂时没有快过期食材，冰箱状态很乖。</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function InventoryPage({ inventory, setInventory }: SharedProps) {
  const [form, setForm] = useState(blankIngredient);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "全部">("全部");
  const [quickText, setQuickText] = useState("");
  const detected = detectIngredientInfo(form.name);

  const filtered = inventory.filter(
    (item) => item.name.includes(query) && (category === "全部" || item.category === category),
  );

  const submit = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      setInventory((current) => current.map((item) => (item.id === editingId ? { ...form, id: editingId } : item)));
    } else {
      setInventory((current) => [{ ...form, id: crypto.randomUUID() }, ...current]);
    }
    setForm(blankIngredient);
    setEditingId(null);
  };

  const updateName = (name: string) => {
    const info = detectIngredientInfo(name);
    setForm({
      ...form,
      name,
      category: info?.category || form.category,
      unit: info?.defaultUnit || form.unit,
      quantity: info?.defaultAmount || form.quantity,
    });
  };

  const addQuickItems = () => {
    const parsed = parseInventoryText(quickText);
    if (!parsed.length) return;
    setInventory((current) => [
      ...parsed.map((item) => ({
        id: crypto.randomUUID(),
        name: item.name,
        category: item.category,
        quantity: item.amount,
        unit: item.unit,
        expiringSoon: false,
        purchaseDate: "",
        expiryDate: "",
        note: "快速输入添加",
      })),
      ...current,
    ]);
    setQuickText("");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[.92fr_1.08fr]">
      <section className="pretty-card p-4">
        <SectionTitle icon={<Plus size={20} />} title={editingId ? "编辑食材" : "新增食材"} />
        <div className="grid gap-3">
          <Input label="食材名称" value={form.name} onChange={updateName} placeholder="例如：猪肉 / 鸡蛋 / 土豆" />
          {form.name && (
            <div className={`rounded-2xl p-3 text-sm ${detected ? "bg-mint/70" : "bg-yolk/25"}`}>
              {detected
                ? `已识别：${detected.category}｜默认单位：${detected.defaultUnit}｜推荐数量：${detected.defaultAmount}${detected.defaultUnit}${detected.isSeasoning ? "｜基础调料" : ""}`
                : "暂未识别，可手动选择分类和单位。"}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Select label="分类" value={form.category} onChange={(category) => setForm({ ...form, category: category as Category })} options={categories} />
            <Select label="单位" value={form.unit} onChange={(unit) => setForm({ ...form, unit: unit as Ingredient["unit"] })} options={[...units]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="剩余数量" type="number" value={String(form.quantity)} onChange={(quantity) => setForm({ ...form, quantity: Number(quantity) })} />
            <label className="field">
              <span>是否快过期</span>
              <button className={`toggle ${form.expiringSoon ? "toggle-on" : ""}`} onClick={() => setForm({ ...form, expiringSoon: !form.expiringSoon })}>
                {form.expiringSoon ? "快过期" : "正常"}
              </button>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="购买日期" type="date" value={form.purchaseDate} onChange={(purchaseDate) => setForm({ ...form, purchaseDate })} />
            <Input label="过期日期" type="date" value={form.expiryDate} onChange={(expiryDate) => setForm({ ...form, expiryDate })} />
          </div>
          <Input label="备注" value={form.note} onChange={(note) => setForm({ ...form, note })} placeholder="比如：冷藏 / 已切开" />
          <button className="primary-btn" onClick={submit}>
            <Plus size={19} /> {editingId ? "保存修改" : "加入库存"}
          </button>
        </div>
        <div className="mt-5 rounded-3xl bg-white/65 p-3">
          <p className="mb-2 text-sm font-extrabold">快速输入一堆食材</p>
          <textarea
            className="input min-h-24 resize-none"
            value={quickText}
            onChange={(event) => setQuickText(event.target.value)}
            placeholder="鸡蛋2个，土豆3个，猪肉300g，青菜一把，米饭1碗"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button className="ghost-btn" onClick={addQuickItems}>
              <ListPlus size={18} /> 批量加入库存
            </button>
            {quickText && (
              <span className="text-xs text-ink/60">
                将解析 {parseInventoryText(quickText).length} 项
              </span>
            )}
          </div>
        </div>
        <div className="mt-5">
          <p className="mb-2 text-sm font-extrabold">常用食材快捷添加</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(commonIngredients).flatMap(([cat, names]) =>
              names.slice(0, 4).map((name) => (
                <button
                  key={`${cat}-${name}`}
                  className="tag-btn"
                  onClick={() =>
                    setInventory((current) => {
                      const info = detectIngredientInfo(name);
                      return [
                        {
                          ...blankIngredient,
                          id: crypto.randomUUID(),
                          name,
                          category: info?.category || (cat as Category),
                          unit: info?.defaultUnit || "份",
                          quantity: info?.defaultAmount || 1,
                        },
                        ...current,
                      ];
                    })
                  }
                >
                  {name}
                </button>
              )),
            )}
          </div>
        </div>
      </section>

      <section>
        <SectionTitle icon={<NotebookTabs size={20} />} title="家里现有食材" />
        <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_180px]">
          <Input label="搜索食材" value={query} onChange={setQuery} placeholder="输入鸡蛋、土豆、牛肉..." />
          <Select label="分类筛选" value={category} onChange={(value) => setCategory(value as Category | "全部")} options={["全部", ...categories]} />
        </div>
        <div className="mb-3 flex justify-end">
          <button className="ghost-btn" onClick={() => setInventory((current) => current.filter((item) => item.quantity > 0))}>
            <Check size={17} /> 一键清空已用完食材
          </button>
        </div>
        <div className="grid gap-3">
          {filtered.map((item) => (
            <div key={item.id} className="pretty-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-lg">{item.name}</b>
                  <span className="soft-chip">{item.category}</span>
                  {item.expiringSoon && <span className="danger-chip">快过期</span>}
                </div>
                <p className="mt-1 text-sm text-ink/65">
                  剩余 {item.quantity}
                  {item.unit} · 购买 {item.purchaseDate || "未填"} · 过期 {item.expiryDate || "未填"}
                </p>
                {item.note && <p className="mt-1 text-sm text-ink/60">{item.note}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  className="icon-btn"
                  title="编辑"
                  onClick={() => {
                    setForm(item);
                    setEditingId(item.id);
                  }}
                >
                  <Pencil size={17} />
                </button>
                <button className="icon-btn" title="删除" onClick={() => setInventory((current) => current.filter((food) => food.id !== item.id))}>
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function RecommendPage(props: SharedProps) {
  const [mealType, setMealType] = useState("晚餐");
  const [people, setPeople] = useState(2);
  const [timeLimit, setTimeLimit] = useState(30);
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>(["家常", "快手"]);
  const [fastExpiring, setFastExpiring] = useState(true);
  const [noShopping, setNoShopping] = useState(true);
  const matches = matchRecipesByInventory(props.inventory, recipes, {
    mealType,
    people,
    timeLimit,
    preferences: selectedPrefs,
    useExpiring: fastExpiring,
    noShopping,
  });
  const pickUnique = (used: Set<string>, predicate: (match: RecipeMatch) => boolean) => {
    const picked = matches.find((match) => !used.has(match.recipe.id) && match.percent >= 35 && predicate(match));
    if (picked) used.add(picked.recipe.id);
    return picked?.recipe;
  };
  const used = new Set<string>();
  const menu = {
    主菜: pickUnique(used, (match) => match.recipe.tags.includes("肉菜") || match.recipe.tags.includes("高蛋白")),
    配菜: pickUnique(used, (match) => match.recipe.tags.includes("素菜") || match.recipe.taste.includes("清淡")),
    汤: pickUnique(used, (match) => match.recipe.tags.includes("汤类")),
    主食: pickUnique(used, (match) => match.recipe.tags.includes("主食")),
  };
  const menuCount = Object.values(menu).filter(Boolean).length;

  return (
    <div className="space-y-5">
      <section className="pretty-card p-4">
        <SectionTitle icon={<Sparkles size={20} />} title="智能做饭推荐" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Select label="这一顿" value={mealType} onChange={setMealType} options={["早餐", "午餐", "晚餐", "夜宵"]} />
          <Input label="几个人吃" type="number" value={String(people)} onChange={(value) => setPeople(Number(value))} />
          <Select label="做饭时间" value={String(timeLimit)} onChange={(value) => setTimeLimit(Number(value))} options={["10", "20", "30", "60"]} />
          <label className="field">
            <span>尽量不出门买菜</span>
            <button className={`toggle ${noShopping ? "toggle-on" : ""}`} onClick={() => setNoShopping(!noShopping)}>
              {noShopping ? "开启" : "关闭"}
            </button>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {preferences.map((pref) => (
            <button
              key={pref}
              className={`tag-btn ${selectedPrefs.includes(pref) ? "tag-btn-active" : ""}`}
              onClick={() =>
                setSelectedPrefs((current) => (current.includes(pref) ? current.filter((item) => item !== pref) : [...current, pref]))
              }
            >
              {pref}
            </button>
          ))}
          <button className={`tag-btn ${fastExpiring ? "tag-btn-active" : ""}`} onClick={() => setFastExpiring(!fastExpiring)}>
            先用快过期
          </button>
        </div>
      </section>

      <section className="pretty-card p-4">
        <SectionTitle icon={<ListPlus size={20} />} title={`${people}人完整菜单`} />
        {menuCount < 3 && (
          <p className="mb-3 rounded-3xl bg-yolk/25 p-3 text-sm leading-6 text-ink/70">
            当前库存比较少，只能推荐 {Math.max(menuCount, 1)}-{Math.max(menuCount, 2)} 道菜，建议补充下方缺少食材后可以组成完整晚餐。
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(menu).map(([role, recipe]) => (
            <div key={role} className="rounded-3xl bg-white/70 p-4">
              <p className="text-xs font-bold text-roseTea">{role}</p>
              <p className="mt-1 text-lg font-black">{recipe?.name || "待补充"}</p>
              <p className="mt-1 text-sm text-ink/60">{recipe ? `${recipe.minutes}分钟 · ${recipe.difficulty}` : "可以从下方选择"}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle icon={<ChefHat size={20} />} title="推荐结果" />
        <div className="grid gap-4 lg:grid-cols-2">
          {matches.map((match) => (
            <RecipeCard key={match.recipe.id} recipe={match.recipe} match={match} {...props} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SearchPage(props: SharedProps) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    return searchRecipes(query, recipes).map((recipe) => matchRecipeByInventory(recipe, props.inventory, { mealType: "晚餐", people: 2 }));
  }, [props.inventory, query]);

  return (
    <div className="space-y-5">
      <section className="pretty-card p-4">
        <SectionTitle icon={<Search size={20} />} title="搜索菜谱" />
        <Input label="输入菜名或食材" value={query} onChange={setQuery} placeholder="番茄炒蛋 / 鸡蛋 / 土豆 / 牛肉 / 面" />
      </section>
      {props.favorites.length > 0 && (
        <section>
          <SectionTitle icon={<Heart size={20} />} title="我的收藏" />
          <div className="grid gap-4 lg:grid-cols-2">
            {recipes
              .filter((recipe) => props.favorites.includes(recipe.id))
              .map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} match={matchRecipeByInventory(recipe, props.inventory, { mealType: "晚餐", people: 2 })} {...props} />
              ))}
          </div>
        </section>
      )}
      <section>
        <SectionTitle icon={<Utensils size={20} />} title="菜谱结果" />
        {visible.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {visible.map((match) => (
              <RecipeCard key={match.recipe.id} recipe={match.recipe} match={match} {...props} />
            ))}
          </div>
        ) : (
          <div className="pretty-card p-5 text-sm leading-7 text-ink/70">
            本地菜谱暂时没有找到“{query}”。可以先把它作为自定义菜谱入口预留；当前项目没有配置 AI API，所以不会自动生成菜谱，也不会报错。
          </div>
        )}
      </section>
    </div>
  );
}

function RecipeDetail({
  recipe,
  onBack,
  inventory,
  favorites,
  setFavorites,
  cooked,
  setCooked,
  ratings,
  setRatings,
  notes,
  setNotes,
  addShoppingMissing,
  addRecipeToWeekly,
}: SharedProps & { recipe: Recipe; onBack: () => void }) {
  const match = matchRecipeByInventory(recipe, inventory, { mealType: "晚餐", people: recipe.servings });
  const total = {
    calories: recipe.nutritionPerServing.calories * recipe.servings,
    protein: recipe.nutritionPerServing.protein * recipe.servings,
    fat: recipe.nutritionPerServing.fat * recipe.servings,
    carbs: recipe.nutritionPerServing.carbs * recipe.servings,
    fiber: recipe.nutritionPerServing.fiber * recipe.servings,
    sodium: recipe.nutritionPerServing.sodium * recipe.servings,
  };

  return (
    <div className="space-y-5">
      <button className="ghost-btn" onClick={onBack}>
        返回菜谱列表
      </button>
      <section className="detail-hero">
        <div className="text-7xl">{recipe.emoji}</div>
        <div>
          <h1 className="text-3xl font-black md:text-5xl">{recipe.name}</h1>
          <p className="mt-3 max-w-2xl text-ink/70">{recipe.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[...recipe.taste, recipe.difficulty, `${recipe.minutes}分钟`, `${recipe.servings}人份`, `匹配度 ${match.percent}%`].map((tag) => (
              <span className="soft-chip" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <div className="pretty-card p-4">
          <SectionTitle icon={<NotebookTabs size={20} />} title="配料表" />
          <IngredientGroup title="所需食材" items={recipe.ingredients} />
          <IngredientGroup title="调料" items={recipe.seasonings} />
          <div className="mt-4 rounded-3xl bg-mint/70 p-4 text-sm leading-7">
            <b>已有足够：</b>{match.ownedEnough.map((item) => `${item.name} ${item.displayOwned}`).join("、") || "暂无"}
            <br />
            <b>已有但不够：</b>{match.ownedPartial.map((item) => `${item.name}已有${item.displayOwned}，还差${item.displayNeed}`).join("、") || "暂无"}
            <br />
            <b>还需要购买：</b>{[...match.missing, ...match.optionalMissing].map((item) => item.suggestion).join("；") || "基本齐啦"}
          </div>
        </div>
        <div className="pretty-card p-4">
          <SectionTitle icon={<ChefHat size={20} />} title="做法步骤" />
          <div className="space-y-3">
            {recipe.steps.map((step, index) => (
              <div key={step} className="rounded-3xl bg-white/75 p-4">
                <b className="text-roseTea">步骤 {index + 1}</b>
                <p className="mt-1 text-sm leading-7 text-ink/75">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-3xl bg-yolk/30 p-4 text-sm leading-7">
            <b>小贴士：</b>
            {recipe.tips.join(" ")}
            <br />
            <b>可替换：</b>
            {recipe.alternatives.join(" ")}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="pretty-card p-4">
          <SectionTitle icon={<Star size={20} />} title="营养表" />
          <NutritionTable title="每份估算" nutrition={recipe.nutritionPerServing} />
          <NutritionTable title="总量估算" nutrition={total} />
          <p className="mt-3 text-xs text-ink/55">营养数据为估算值，仅供日常参考。</p>
          <div className="mt-5">
            <p className="mb-2 text-sm font-bold">示例食材营养数据</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {nutritionSamples.slice(0, 4).map((item) => (
                <div className="rounded-2xl bg-white/70 p-3 text-xs" key={item.name}>
                  <b>{item.name}</b> · {item.calories} kcal · 蛋白质 {item.protein}g · {item.unit}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="pretty-card p-4">
          <SectionTitle icon={<Heart size={20} />} title="我的记录" />
          <div className="grid gap-3 sm:grid-cols-2">
            <button className="primary-btn" onClick={() => setFavorites((current) => (current.includes(recipe.id) ? current.filter((id) => id !== recipe.id) : [...current, recipe.id]))}>
              <Heart size={18} /> {favorites.includes(recipe.id) ? "取消收藏" : "收藏菜谱"}
            </button>
            <button className="primary-btn" onClick={() => addRecipeToWeekly(recipe.id)}>
              <CalendarDays size={18} /> 加入本周菜单
            </button>
            <button className="ghost-btn" onClick={() => addShoppingMissing(recipe)}>
              <ShoppingBasket size={18} /> 生成购物清单
            </button>
            <button className="ghost-btn" onClick={() => setCooked((current) => (current.includes(recipe.id) ? current.filter((id) => id !== recipe.id) : [...current, recipe.id]))}>
              <Check size={18} /> {cooked.includes(recipe.id) ? "已做过" : "标记已做过"}
            </button>
          </div>
          <div className="mt-5">
            <p className="mb-2 text-sm font-bold">用户评分</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className={`icon-btn ${Number(ratings[recipe.id] || 0) >= star ? "bg-yolk" : ""}`}
                  onClick={() => setRatings((current) => ({ ...current, [recipe.id]: star }))}
                >
                  <Star size={17} />
                </button>
              ))}
            </div>
          </div>
          <label className="field mt-5">
            <span>用户备注</span>
            <textarea
              className="input min-h-32 resize-none"
              value={notes[recipe.id] || ""}
              onChange={(event) => setNotes((current) => ({ ...current, [recipe.id]: event.target.value }))}
              placeholder="下次少放盐 / 老婆很喜欢 / 加点蘑菇也好吃"
            />
          </label>
        </div>
      </section>
    </div>
  );
}

function WeeklyPage({ weekly, setWeekly, addShoppingMissing }: SharedProps) {
  const autoGenerate = () => {
    const next = createWeeklyPlan();
    let cursor = 0;
    days.forEach((day) => {
      meals.forEach((meal) => {
        const available = recipes.filter((recipe) => recipe.mealTypes.includes(meal));
        next[day][meal] = [available[cursor % available.length]?.id || recipes[cursor % recipes.length].id];
        cursor += 1;
      });
    });
    setWeekly(next);
  };

  return (
    <div className="space-y-5">
      <section className="pretty-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <SectionTitle icon={<CalendarDays size={20} />} title="一周菜单" />
        <div className="flex flex-wrap gap-2">
          <button className="primary-btn" onClick={autoGenerate}>
            <Sparkles size={18} /> 自动生成
          </button>
          <button
            className="ghost-btn"
            onClick={() => {
              Object.values(weekly).forEach((dayPlan) =>
                Object.values(dayPlan).forEach((ids) => ids.forEach((id) => addShoppingMissing(recipes.find((recipe) => recipe.id === id)!))),
              );
            }}
          >
            <ShoppingBasket size={18} /> 生成购物清单
          </button>
        </div>
      </section>
      <div className="grid gap-4">
        {days.map((day) => (
          <section className="pretty-card p-4" key={day}>
            <h2 className="mb-3 text-xl font-black">{day}</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {meals.map((meal) => (
                <div className="rounded-3xl bg-white/70 p-3" key={meal}>
                  <p className="mb-2 text-sm font-extrabold text-roseTea">{meal}</p>
                  <select
                    className="input"
                    value={weekly[day][meal][0] || ""}
                    onChange={(event) =>
                      setWeekly((current) => ({
                        ...current,
                        [day]: { ...current[day], [meal]: event.target.value ? [event.target.value] : [] },
                      }))
                    }
                  >
                    <option value="">选择菜谱</option>
                    {recipes
                      .filter((recipe) => recipe.mealTypes.includes(meal))
                      .map((recipe) => (
                        <option key={recipe.id} value={recipe.id}>
                          {recipe.name}
                        </option>
                      ))}
                  </select>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ShoppingPage({ shopping, setShopping }: SharedProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("蔬菜类");
  const grouped = categories
    .map((cat) => ({ cat, items: shopping.filter((item) => item.category === cat) }))
    .filter((group) => group.items.length);

  return (
    <div className="space-y-5">
      <section className="pretty-card p-4">
        <SectionTitle icon={<ShoppingBasket size={20} />} title="购物清单" />
        <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <Input label="手动添加" value={name} onChange={setName} placeholder="例如：牛肉 400克" />
          <Select label="分类" value={category} onChange={(value) => setCategory(value as Category)} options={categories} />
          <button
            className="primary-btn self-end"
            onClick={() => {
              if (!name.trim()) return;
              setShopping((current) => [{ id: crypto.randomUUID(), name, category, amount: "适量", checked: false }, ...current]);
              setName("");
            }}
          >
            <Plus size={18} /> 添加
          </button>
        </div>
      </section>
      {grouped.length ? (
        grouped.map(({ cat, items }) => (
          <section className="pretty-card p-4" key={cat}>
            <h2 className="mb-3 text-xl font-black">{cat}</h2>
            <div className="space-y-2">
              {items.map((item) => (
                <div className="flex items-center justify-between gap-3 rounded-3xl bg-white/70 p-3" key={item.id}>
                  <label className="flex items-center gap-3">
                    <input
                      className="h-5 w-5 accent-roseTea"
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => setShopping((current) => current.map((row) => (row.id === item.id ? { ...row, checked: !row.checked } : row)))}
                    />
                    <span className={item.checked ? "text-ink/40 line-through" : ""}>
                      <b>{item.name}</b> <span className="text-sm text-ink/60">{item.amount}</span>
                    </span>
                  </label>
                  <button className="icon-btn" onClick={() => setShopping((current) => current.filter((row) => row.id !== item.id))}>
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))
      ) : (
        <section className="pretty-card p-6 text-center text-ink/65">购物清单空空的，先从菜谱详情或一周菜单生成吧。</section>
      )}
    </div>
  );
}

function RecipeCard({
  recipe,
  match,
  favorites,
  setFavorites,
  setSelectedRecipeId,
  addRecipeToWeekly,
}: SharedProps & {
  recipe: Recipe;
  match: RecipeMatch;
}) {
  return (
    <article className="recipe-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-blush text-4xl">{recipe.emoji}</span>
          <div>
            <h3 className="text-xl font-black">{recipe.name}</h3>
            <p className="mt-1 text-sm leading-6 text-ink/65">{recipe.description}</p>
          </div>
        </div>
        <span className="match-badge">{match.percent}%</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {[`${recipe.minutes}分钟`, recipe.difficulty, ...recipe.tags.slice(0, 3)].map((tag) => (
          <span key={tag} className="soft-chip">
            {tag}
          </span>
        ))}
      </div>
      <p className="mt-3 rounded-3xl bg-yolk/25 p-3 text-sm leading-6 text-ink/70">推荐理由：{match.reason}</p>
      <div className="mt-3 grid gap-2 text-sm">
        <p><b>已有足够：</b>{match.ownedEnough.filter((item) => item.role !== "seasoning").map((item) => `${item.name} ${item.displayOwned}`).join("、") || "暂无"}</p>
        <p><b>已有但不够：</b>{match.ownedPartial.filter((item) => item.role !== "seasoning").map((item) => `${item.name}已有${item.displayOwned}，还差${item.displayNeed}`).join("、") || "暂无"}</p>
        <p><b>完全缺少：</b>{match.missing.filter((item) => item.role !== "seasoning").map((item) => `${item.name}需要${item.displayRequired}`).join("、") || "暂无"}</p>
        <p><b>建议购买：</b>{[...match.ownedPartial, ...match.missing, ...match.optionalMissing].map((item) => item.suggestion).join("；") || "不用买菜"}</p>
        <p><b>大概花多少钱：</b>{match.estimatedCost}</p>
      </div>
      <p className="mt-2 text-sm text-ink/60">
        {recipe.minutes}分钟 · 适合{recipe.servings}人基准份 · 营养摘要：{recipe.nutritionPerServing.calories} kcal / 蛋白质 {recipe.nutritionPerServing.protein}g / 碳水 {recipe.nutritionPerServing.carbs}g
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="primary-btn" onClick={() => setSelectedRecipeId(recipe.id)}>
          <ChefHat size={18} /> 查看做法
        </button>
        <button className="ghost-btn" onClick={() => setFavorites((current) => (current.includes(recipe.id) ? current.filter((id) => id !== recipe.id) : [...current, recipe.id]))}>
          <Heart size={18} /> {favorites.includes(recipe.id) ? "已收藏" : "收藏"}
        </button>
        <button className="ghost-btn" onClick={() => addRecipeToWeekly(recipe.id, "周一", "晚餐")}>
          <CalendarDays size={18} /> 加入今晚菜单
        </button>
      </div>
    </article>
  );
}

function IngredientGroup({ title, items }: { title: string; items: RecipeIngredient[] }) {
  return (
    <div className="mt-3">
      <p className="mb-2 text-sm font-extrabold text-roseTea">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div className="flex justify-between rounded-2xl bg-white/70 px-3 py-2 text-sm" key={`${title}-${item.name}`}>
            <span>{item.name}</span>
            <span className="text-ink/60">
              {item.amount}
              {item.unit}
              {item.required ? " · 必需" : " · 可选"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NutritionTable({ title, nutrition }: { title: string; nutrition: Recipe["nutritionPerServing"] }) {
  const rows = [
    ["热量", `${Math.round(nutrition.calories)} kcal`],
    ["蛋白质", `${Math.round(nutrition.protein)} g`],
    ["脂肪", `${Math.round(nutrition.fat)} g`],
    ["碳水", `${Math.round(nutrition.carbs)} g`],
    ["膳食纤维", `${Math.round(nutrition.fiber)} g`],
    ["钠", `${Math.round(nutrition.sodium)} mg`],
  ];
  return (
    <div className="mt-3">
      <p className="mb-2 text-sm font-extrabold text-roseTea">{title}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div className="rounded-2xl bg-white/70 p-3" key={label}>
            <p className="text-xs text-ink/55">{label}</p>
            <p className="font-black">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-blush">{icon}</span>
      <h2 className="text-xl font-black">{title}</h2>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className="input" type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
