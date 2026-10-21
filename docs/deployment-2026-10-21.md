# 网页发布记录 · 2026-10-21

## 入口与架构

- GitHub 源代码：https://github.com/Wenzo-zwz/suixing-chufa
- GitHub Pages：https://wenzo-zwz.github.io/suixing-chufa/
- 云端网页备用入口：https://suixing-chufa-cloud.pastelchick11.chatgpt.site/web/
- GitHub `main` 保存源代码，`gh-pages` 保存十个静态资源。
- Sites Worker + D1 承担多人房间与抽取 API，本机关闭不影响已部署服务。

## 本次版本

- 云端源代码提交：`1f34a2a0ef3d70e72481309d450fdb573da21ca9`
- Pages 提交：`29b024525bd6c4d1ef3da530f0a5d1a294da7a4f`
- 云端发布状态：succeeded。
- GitHub Pages 构建状态：built；固定 HTTPS 地址已通过实际浏览器完整检查。GitHub 自动生成的工作流当时仍有 deploy 状态等待，未妨碍 Pages 地址实际服务。

## 验证证据

- Node 规则、接口和静态导出测试：87 项通过。
- 多人界面并发、延迟响应回归：7 项通过。
- 本地编译后的 Worker + D1：健康、跨域预检、单人抽取、并发准备、同轮唯一结果、持久化和身份拒绝检查通过。
- 公开云端网页：Edge 手机尺寸下首页资源、无横向溢出、真实拖动手势、双浏览器复制邀请和加入、共同抽取、刷新恢复通过。
- 公开 GitHub Pages：实际跨域请求、手机首页资源、飞机拖动抽取、双独立浏览器复制邀请并加入、共同结果及刷新恢复，五组检查全部通过，无页面脚本错误。
- 独立代码审查：见 `review-github-web.md`，无 P1/P2 问题。

本机 Node HTTP 请求会被托管平台的边缘防护拒绝；匿名 Edge 浏览器正常访问，生产检查通过实际浏览器执行。

## 范围

当前是网页体验版，目的地和费用等资料为示例，收藏及历史仅保存在当前浏览器。微信小程序尚未发布。

