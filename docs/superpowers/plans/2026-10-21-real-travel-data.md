# 热门目的地资料更新 Implementation Plan

> **For agentic workers:** 按 dispatching-parallel-agents 拆分独立资料区域；主代理负责契约、测试、整合和发布。

**Goal:** 将示例库替换为 36 城市、144 景点的有来源旅行资料，并发布至现有网页。

**Architecture:** 三份 JSON 原始资料，经 catalog.mjs 组装为现有 API 契约。新增字段按需渲染，旧字段保持兼容；不增加运行时抓取和付费服务。

**Tech Stack:** ES modules、JSON、Node tests、Playwright/Edge、Sites Worker/D1、GitHub Pages。

## Global Constraints

保留既有 ID、等概率、手势和多人规则；无依据预算为 null；每条记录有来源与资料日期；未经确认的实时数据不填写；不修改数据库结构。优先原始资料，保存许可归属。

### Task 1 — 有来源的资料集

Files: prototype/data/hot-cities-a.json, hot-cities-b.json, hot-cities-c.json; prototype/catalog.mjs; tests/catalog-data.test.mjs.

- [x] 主代理先增加契约检查并确认旧示例不满足：至少36城市、每城4景点、有效来源/坐标/美食及交通、没有演示消费。
- [x] 三个独立资料任务各研究12城市，写入独立 JSON 文件，逐条保留检索成功的来源；不改其他代码。
- [x] 主代理组装城市及景点，保留旧 ID，运行契约和现有规则测试；修复实际数据或兼容问题。

### Task 2 — 资料展示和旧记录

Files: prototype/render.mjs, prototype/styles.css, prototype/app.mjs, prototype/domain.mjs, prototype/server.mjs, server/cloud-api.mjs; tests/client-model.test.mjs; tests/travel-data-ui.mjs.

- [x] 检查来源链接与文字转义、未知费用处理、预算排除原因和数据范围提示。
- [x] 先增加旧快照升级测试；按 ID 将已收藏和旅程对象更新为当前资料，自填数据不覆盖。
- [x] 手机结果页展示美食说明、主要交通、季节、行程、来源与日期；提供可打开的地图和12306查询链接。
- [x] 浏览器检查长文字布局、真实城市/景点抽取、来源链接和旧收藏恢复，运行原多人回归。

### Task 3 — 发布

Files: README.md, docs/deployment-2026-10-21.md。

- [ ] 构建同一个已核验源代码版本，通过 Sites 源代码助手同步、打包、保存版本并更新原公开云端服务。
- [ ] 将源代码推送 GitHub main，静态文件更新 gh-pages，等待 Pages 构建。
- [ ] 从公开 GitHub 页面检查真实资料和独立双浏览器房间流程，记录实际覆盖数量和限制。
