# 随性出发

不知道去哪玩？让一次互动抽取，帮你和朋友决定下一站。

网页入口：<https://wenzo-zwz.github.io/suixing-chufa/>

源代码：<https://github.com/Wenzo-zwz/suixing-chufa>

这是网页版体验项目，微信小程序稍后单独适配、审核和上线。

## 可以体验什么

- 个人抽取、多人房间共同决定；快捷偏好、详细筛选、自定义候选地点。
- 纸飞机、摇签、拉弓飞镖等四种手势互动；手机权限不可用时可用触控操作。
- 目的地介绍、玩法、美食、交通和季节信息；收藏及旅程记录。
- 分享房间邀请，朋友使用自己的浏览器加入，同一轮得到同一个结果。

当前收录 60 座旅行城市、600 处代表景点，共 660 个可抽取目的地，每城至少 10 处景点，覆盖中国大陆 31 个省级地区，尚未覆盖全国所有城市。每条资料列出来源和核对日期；美食、主要机场和车站、市内交通、季节及玩法由资料整理，票价、班次、余票、开放安排和天气不接实时服务。没有可靠依据的消费数值不展示。收藏、历史和匿名身份保存在当前浏览器，清除浏览器数据后无法恢复，也不会自动跨设备同步。多人房间保存在云端数据库。

## 运行方式

GitHub Pages 托管静态页面，云端 Sites Worker 与 D1 提供候选查询、随机结果和多人房间服务。访问网站无需运行本机服务器。

云端地址：<https://suixing-chufa-cloud.pastelchick11.chatgpt.site>

每个浏览器生成匿名 ID 和私密凭据；服务端只保存凭据哈希。房间信息不会返回私密凭据。房间更新使用数据库版本校验，防止并发操作覆盖成员状态。

云端房间记录使用带版本标记的 gzip 压缩，保留完整抽取历史；旧 JSON 房间在成员通过鉴权后兼容迁移。压缩仅用于数据库存储，网页和 API 的资料结构不变。

## 资料维护

旅行资料在 `prototype/data/hot-cities-*.json`，按城市组织。每城至少十个景点，包含地点坐标、主题、美食解释、主要抵达方式、当地交通、季节、行程和提醒；景点有独立交通和游玩时长。新增资料必须记录实际访问的来源网址，核查易变信息并注明资料日期。城市与景点分别保留各自的核对日期；新增景点不会修改所属城市原有资料的日期。

旅行文字按 CC BY-SA 4.0 发布，Wikivoyage 衍生资料保留贡献者归属；具体见 [资料许可](prototype/data/LICENSE.md) 与 `docs/data-sources-*.md`。现有虚构消费区间已移除；预算筛选会排除费用未知的目的地并解释原因。旧收藏、旅程和结果按稳定 ID 更新资料，用户的完成状态和自填地点保留。

## 本地开发与检查

需要 Node.js 22.13 或更新版本。

```sh
npm ci
npm run preview
```

预览服务只用于本地开发，数据留在该进程内存中。部署后的多人房间使用 D1。

```sh
npm test
npm run test:ui
npm run test:rooms
npm run test:gestures
node tests/travel-data-ui.mjs
node tests/cloud-live.mjs https://suixing-chufa-cloud.pastelchick11.chatgpt.site
```

浏览器检查使用 Playwright 与本机 Edge。规则与接口测试使用 Node 内置测试工具。

## 更新发布

页面源文件在 `prototype/`，云端 API 在 `server/cloud-api.mjs`，数据库结构在 `db/schema.ts`。修改页面后运行：

```sh
npm run build:pages
```

将 `dist-pages/` 的内容发布到本仓库 `gh-pages` 分支，Pages 使用该分支根目录。`main` 保留完整源代码。生成的运行配置只包含公开 API 地址，不包含私密凭据。

云端由 Sites 管理；沿用 `.openai/hosting.json` 中的项目 ID，通过 Sites 的构建、源代码同步、版本保存与发布流程更新。数据库变更先生成并检查 Drizzle 迁移，禁止在请求处理时临时建表。单独更新 GitHub Pages 不会更新云端 API。

```sh
npm run db:generate
npm run build
```

生产发布必须包含构建产物及数据库迁移，并检查匿名访问、跨域请求与双浏览器房间流程。访问速度取决于网络环境和托管服务。
