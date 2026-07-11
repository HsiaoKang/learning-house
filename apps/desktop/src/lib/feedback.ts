/**
 * 用户反馈入口
 *
 * 双通道零后端反馈：GitHub Issue（预填环境信息，可跟进讨论）
 * 与邮件（无需注册任何账号）。环境信息自动带上，用户只需描述问题。
 */
import { IS_TAURI } from "./platform";

/** 仓库 Issue 新建地址 */
const NEW_ISSUE_URL = "https://github.com/HsiaoKang/learning-house/issues/new";

/** 反馈接收邮箱 */
export const FEEDBACK_EMAIL = "hsiaokang@163.com";

/**
 * 组装环境信息（版本 + 系统）
 */
async function environmentInfo(): Promise<string> {
  return [`- 应用版本：${await appVersion()}`, `- 系统：${navigator.userAgent}`].join("\n");
}

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
    await environmentInfo(),
  ].join("\n");
  await openExternal(`${NEW_ISSUE_URL}?body=${encodeURIComponent(body)}`, NEW_ISSUE_URL);
}

/**
 * 打开系统邮件客户端撰写反馈邮件（无需 GitHub 账号），
 * 主题与正文预填环境信息
 */
export async function openFeedbackEmail(): Promise<void> {
  const subject = "Learning House 反馈";
  const body = ["（请描述你遇到的问题或建议）", "", "", "---", "环境信息：", await environmentInfo()].join("\n");
  const url = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  await openExternal(url, FEEDBACK_EMAIL);
}

/**
 * 在系统默认应用中打开外部链接，失败时弹窗提示手动方式
 *
 * @param url 目标链接（https/mailto）
 * @param fallbackHint 失败提示中展示的手动访问地址
 */
async function openExternal(url: string, fallbackHint: string): Promise<void> {
  try {
    if (IS_TAURI) {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
      return;
    }
    window.open(url, "_blank");
  } catch (e) {
    const { showMessage } = await import("./dialogs");
    await showMessage(`无法打开：${e instanceof Error ? e.message : e}\n\n可手动使用 ${fallbackHint}`, "反馈");
  }
}

/**
 * 读取应用版本号（浏览器调试环境返回 dev）
 */
async function appVersion(): Promise<string> {
  if (!IS_TAURI) return "dev";
  const { getVersion } = await import("@tauri-apps/api/app");
  return getVersion().catch(() => "unknown");
}
