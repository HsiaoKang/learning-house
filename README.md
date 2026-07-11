<div align="center">

# Learning House

**把网盘下载的课程，变成真正能上课的地方。**

[![Release](https://img.shields.io/github/v/release/HsiaoKang/learning-house)](https://github.com/HsiaoKang/learning-house/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/HsiaoKang/learning-house/total)](https://github.com/HsiaoKang/learning-house/releases)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)

</div>

买来的视频课程解压后是一堆乱糟糟的文件？Learning House 把整个文件夹一键变成结构化的课程：
视频、曲谱、伴奏自动对号入座，同一屏幕看课、看谱、跟着节拍器练习，学到哪一课一目了然。

macOS / Windows / Linux 桌面应用。**本地优先（local-first）**——你的课程和学习数据永远只在你自己的设备上。

<!-- 截图占位：课程库页（多门课程卡片带进度） -->
<!-- 截图占位：上课页（左视频右曲谱 + 底部节拍器） -->

## 核心能力

### 文件夹进，课程出
- 拖入课程文件夹自动组课：81 个编号视频 + 35 份配套资料，自动归纳成 81 节课，谱子和伴奏挂到对应课节
- 自动识别两种主流网课打包结构（平铺编号视频型 / 课时子文件夹型），课节数与视频文件数严格一致，不多不少
- 结构特殊？内置 **AI 整理**：一键生成提示词发给任意 AI（ChatGPT / 豆包 / Kimi…），贴回 JSON 即完成组课，全程零上传
- **课节管理页**：人工调整最后一米——改名、排序、增删课节，资源在课节间移动/复制（多节共用同一份曲谱伴奏），未引用文件一目了然
- 上课时发现缺谱子？**就地关联**课程内任何资料到当前课节（讲解课直接引用上一节的曲谱伴奏）

### 同屏上课
- 左视频右文档（可对调、可拖分割线），视频多集 tab 切换、倍速、断点续播
- 曲谱支持图片 / PDF / **Guitar Pro**（gp3-gpx，alphaTab 渲染五线谱+六线谱）
- 伴奏条：切换、循环、倍速、独立音量
- 空格播放暂停、方向键快进音量——快捷键跟随你最近操作的区域（视频 / 伴奏 / 节拍器）

### 会认谱的节拍器
- **BPM 自动识别**：打开"跟随伴奏"自动就位——优先读音频文件名的速度标注，其次读本课节曲谱 PDF 上的 ♩=N 标记（经声学交叉验证防错谱），最后才做声学估计（频谱通量 + 倍频修正）
- **TAP 拍击校正**：识别不准时跟着伴奏拍几下，自动吸附到精确网格（人耳定节奏层级，机器定精确数值）
- 识别与校准结果**按音频持久化**，一次校准永久生效
- 跟随伴奏自动起停对齐（含倍速缩放与首拍偏移），慢速练习节拍同步变慢
- 每拍强弱可编辑（强 / 次强 / 弱 / 静音，柱高即响度），Tap Tempo 浮窗测速

### 数据跟着课程走
- 学习进度（完成课节、播放位置）与课节结构存在课程文件夹内的 `.learninghouse/` 目录——
  换电脑、重装应用、拷给朋友，进度和整理成果都在
- 应用内自动更新（GitHub Releases 分发，minisign 签名校验）

## 下载安装

前往 [Releases](https://github.com/HsiaoKang/learning-house/releases/latest) 下载对应平台安装包：

| 平台 | 文件 | 说明 |
|---|---|---|
| macOS（Apple 芯片） | `*_aarch64.dmg` | 见下方首次打开说明 |
| macOS（Intel） | `*_x64.dmg` | 同上 |
| Windows | `*_x64-setup.exe` | SmartScreen 提示时点"仍要运行" |
| Linux | `*.AppImage` / `*.deb` | |

**macOS 首次打开**：安装包暂未进行 Apple 公证（个人项目省下每年 $99），首次打开若提示"已损坏"，在终端执行一次即可：

```bash
xattr -cr "/Applications/Learning House.app"
```

## 课程文件夹怎么组织？

多数情况下**不需要组织**——直接导入，自动识别就够了。规则优先级：

1. **课节清单**（`.learninghouse/manifest.json`）：存在时严格按清单组课，AI 整理与管理页的成果都固化于此
2. **自动识别**：平铺编号视频 + 资料文件夹 → 每个视频一节课、资料按课号/主题匹配；课时子文件夹结构 → 每个文件夹一节课
3. **默认规则**：每个子文件夹归纳为一节课

清单是一份简单的 JSON（资源路径相对课程根目录，原文件无需移动）：

```json
{
  "name": "课程名",
  "lessons": [
    { "name": "01 第一课", "resources": ["1-第一课.mp4", "资料/谱子.pdf", "资料/伴奏.mp3"] }
  ]
}
```

## 反馈

- 应用内点击顶栏**反馈按钮**（自动带上版本与系统信息）
- [提交 Issue](https://github.com/HsiaoKang/learning-house/issues/new/choose)（问题反馈 / 功能建议模板）
- [Discussions](https://github.com/HsiaoKang/learning-house/discussions) 聊想法、投票功能愿望

## 开发

技术栈：Tauri 2（Rust）+ React 19 + TypeScript + Vite，pnpm monorepo。
环境用 [mise](https://mise.jdx.dev/) 管理（node 24 / rust 1.97 / pnpm 11）。

```bash
mise install        # 安装工具链
pnpm install        # 安装依赖
pnpm dev            # 开发模式（Vite + Tauri）
pnpm build          # 构建安装包
pnpm -r typecheck   # 全仓类型检查
```

发版：提交遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)，
release-please 自动维护 Release PR，合并即打 tag 并四平台打包上传。

离线回归：`scripts/test-scan.ts`（课程整理引擎）、`scripts/test-bpm.ts`（BPM 识别）、
`scripts/diag-bpm.ts`（用真实伴奏诊断节拍识别，坏案例可直接转化为校准数据）。

## 已知限制

- 视频/音频解码依赖系统 WebView，mkv / avi 等格式暂不支持（mp4 / mov / webm / mp3 / wav / flac 等常见格式可用）
- Guitar Pro 谱为看谱渲染，不含合成音播放

## 路线图

- [ ] AB 段落循环（练习刚需）
- [ ] 直接连接网盘导入课程
- [ ] 更多练习工具：调音器、录音对比
- [ ] 区域分离为独立窗口

想要某个功能？来 [Discussions](https://github.com/HsiaoKang/learning-house/discussions) 投票或提出来。

## 协议

[AGPL-3.0](LICENSE)：自由使用、修改与分发；基于本项目的衍生作品（包括以网络服务形式提供）必须以相同协议开源。商业授权请通过 Issue 联系作者。
