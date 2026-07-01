# 老婆的可爱厨房

一个手机端优先、也适配电脑端的家庭菜谱规划 PWA。可以记录家里剩余食材，根据库存推荐今天吃什么，搜索菜谱详情，规划一周菜单，并生成购物清单。

## 功能

- 首页：欢迎语、快捷入口、今日推荐、快过期食材提醒
- 食材库存：新增、编辑、删除、搜索、分类筛选、快过期标记、常用食材快捷添加、清空已用完食材
- 食材识别：输入“猪肉、鸡蛋、土豆”等会自动填分类、默认单位和推荐数量
- 快速录入：支持“鸡蛋2个，土豆3个，猪肉300g，青菜一把，米饭1碗”批量解析
- 智能推荐：按餐次、人数、口味偏好、做饭时间、快过期优先、不出门买菜等条件，基于库存数量真实匹配
- 菜谱搜索：支持菜名、食材、标签和别名搜索，展示已有足够、已有但不够、完全缺少和买菜建议
- 菜谱详情：配料、步骤、营养表、收藏、加入周菜单、生成购物清单、标记已做、评分和备注
- 一周菜单：周一到周日，早餐/午餐/晚餐规划，自动生成菜单
- 购物清单：按分类展示，支持勾选、手动添加、删除
- PWA：包含 manifest、图标和 service worker，可添加到手机桌面

## 技术栈

- React + Vite + TypeScript
- Tailwind CSS
- lucide-react 图标
- 本地 JSON 示例数据 + localStorage 持久化

## 启动命令

```bash
pnpm install
pnpm dev
```

打开：

```text
http://127.0.0.1:5173/
```

生产构建：

```bash
pnpm build
pnpm preview
```

## 目录结构

```text
.
├── public/
│   ├── icons/icon.svg
│   ├── manifest.webmanifest
│   └── sw.js
├── data/
│   └── ingredientMaster.ts
├── src/
│   ├── App.tsx
│   ├── data.ts
│   ├── matching.ts
│   ├── main.tsx
│   ├── styles.css
│   └── types.ts
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── vite.config.ts
```

## 示例数据

示例菜谱和食材营养数据在 `src/data.ts`：

- 菜谱：番茄炒蛋、蒜蓉青菜、土豆炖牛肉、可乐鸡翅、麻婆豆腐、蛋炒饭、鸡蛋面、酸辣土豆丝
- 初始库存：番茄、鸡蛋、青菜、米饭、生抽
- 营养样例：鸡蛋、番茄、牛肉、土豆、豆腐、米饭

食材识别主数据在 `data/ingredientMaster.ts`，推荐、搜索和购物建议算法在 `src/matching.ts`。后续可以把这些数据拆成 JSON 文件，或接入 Supabase / Firebase 存储多用户数据。

## 部署到 Vercel

1. 将项目推到 GitHub。
2. 在 Vercel 新建项目并选择该仓库。
3. Framework Preset 选择 `Vite`。
4. Build Command 填 `pnpm build`。
5. Output Directory 填 `dist`。
6. 部署完成后用 HTTPS 访问，PWA 安装能力会正常启用。

## 部署到 Netlify

1. 将项目推到 GitHub。
2. 在 Netlify 新建站点并选择该仓库。
3. Build command 填 `pnpm build`。
4. Publish directory 填 `dist`。
5. 部署后访问站点，浏览器会注册 service worker。
