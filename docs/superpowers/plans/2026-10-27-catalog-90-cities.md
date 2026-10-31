# 90城900景资料扩充 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从60城600景扩至90城900景，优先补潮州、汕头，每城保留至少10独立景点和完整有源攻略。

**Architecture:** 原a/b/c三组及旧660条输出保持不变。新增d/e/f三组各10城100景；catalog统一组合，静态同源目录和云端API使用同一构建，个人模式继续不依赖云端。

**Tech Stack:** JSON、Node测试、GitHub Pages、Sites Worker/D1、现有gzip房间存储。

## Global Constraints

- 旧记录ID、事实与核查日期完整保留；原660条公开对象以SHA256快照检查。新资料中29城及290景核查日期2026-10-27；中断后补完的梅州及10景核查日期2026-10-31。
- 新景点说明至少40字、交通至少25字；各城至少3项美食解释、独立交通、气候季节及2—3日行程。
- 来源必须实际浏览，优先官方；Wikivoyage保留CC BY-SA4.0和贡献者归属。没有实时票价、班次、天气或虚构预算。
- 市域可含属县，远郊明确行程和接驳；不跨行政市凑数、不用同景区子设施重复计数。
- 不改变手机启动、本地筛选抽取、手势或多人规则；不新增外部依赖。发布沿用原public项目。

### Task 1: 契约和旧资料快照

**Files:** tests/fixtures/catalog-previous-660.json、tests/catalog-data.test.mjs、tests/cloud-api.test.mjs。

- [x] 保存旧660条id/kind/cityId/date及完整公开对象SHA256；读取当前catalog后用createHash('sha256').update(JSON.stringify(item)).digest('hex')验证不变。
- [x] 修改覆盖契约为cities.length>=90、spots.length>=900、每城>=10，强制潮州/汕头及本轮城市存在，运行node --test tests/catalog-data.test.mjs确认覆盖失败。
- [x] 存储容量测试使用真实encodeRoomRecord编码后的字节数；900景27轮及旧180条100轮迁移使用SQLite2MB触发器验证，保留历史与幂等断言。合法压缩fixture不再用超限原始JSON插入数据库。

### Task 2: 三组独立资料

**Files:** prototype/data/hot-cities-d/e/f.json、docs/data-sources-d/e/f.md。

- [x] D组：潮州、汕头、揭阳、汕尾、惠州、江门、佛山、中山、湛江、梅州。
- [x] E组：威海、日照、淄博、济宁、漳州、莆田、温州、湖州、金华、嘉兴。
- [x] F组：开封、安阳、张掖、天水、乐山、遵义、安顺、柳州、宜昌、襄阳。
- [x] 各组按原JSON字段完成10城100景及来源索引，检查ID/枚举/说明长度/食物对应/日期/归属和异常远距离，交独立审查。

### Task 3: 整合与验证

**Files:** prototype/catalog.mjs、prototype/data/LICENSE.md、README.md。

- [x] 增加d/e/f三组import并加入cityGuides数组，扩充资料许可文件名；README记录90城900景。
- [x] node --test tests/*.test.mjs及代表性手机资料流程通过；测量最大房间压缩体积，确认旧660对象SHA一致。
- [x] 独立审查关注潮汕归属、重复景点、动态枢纽及来源；修复确定问题。

### Task 4: 发布

**Files:** ignored outputs发布脚本、docs/deployment-2026-10-31-catalog90.md。

- [x] Sites build成功；源助手同步/打包精确同一SHA，保存部署原项目；GitHub main和gh-pages更新，确认实际构建成功。
- [ ] 公开同源目录及API均90城900景，真实抽取潮州/汕头/新景点，云端阻断仍可个人抽取；双浏览器房间/900景D1持久化仍正常。
- [x] 记录真实发布版本及验证结果，提供原网址的新更新标识，不让旧缓存继续显示60城。

2026-11-01续做：Pages已built且部署success，公开目录90城900景，潮州/汕头/新景点、两浏览器共同结果与刷新恢复均实测通过。全国900景房间POST测试端30秒超时，Worker同次返回201/433ms；完整公开检查仅8组通过，尚未验证该全国房间后续读取、抽取与恢复，公开云端阻断两组因脚本提前停止未运行。保留上一项未勾选，详见发布记录与失败日志，不宣称11/11。
