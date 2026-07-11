/**
 * 用户反馈入口
 *
 * 打开预填环境信息的 GitHub Issue 页面：用户只需描述问题，
 * 应用版本 / 系统信息已自动带上。local-first 应用的零后端反馈通道。
 */
import { IS_TAURI } from "./platform";

/** 仓库 Issue 新建地址 */
const NEW_ISSUE_URL = "https://github.com/HsiaoKang/learning-house/issues/new";

/**
 * 打开系统浏览器进入"新建 Issue"页，正文预填环境信息模板
 */
export async function openFeedbackPage(): Promise<void> {
  const body = [
    "<!-- 请描述你遇到的问题或建议，可直接附截图 -->",
    "",
    "",
    "---",
    "环境信息（自动生成）：",
    `- 应用版本：${await appVersion()}`,
    `- 系统：${navigator.userAgent}`,
  ].join("\n");
  const url = `${NEW_ISSUE_URL}?body=${encodeURIComponent(body)}`;

  if (IS_TAURI) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }
  window.open(url, "_blank");
}

/**
 * 读取应用版本号（浏览器调试环境返回 dev）
 */
async function appVersion(): Promise<string> {
  if (!IS_TAURI) return "dev";
  const { getVersion } = await import("@tauri-apps/api/app");
  return getVersion().catch(() => "unknown");
}
