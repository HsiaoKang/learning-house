/**
 * 应用级提示对话框
 *
 * Tauri 2 的 WebView 不实现 window.alert/confirm（调用是空操作），
 * 统一封装 dialog 插件的原生对话框；浏览器调试环境降级为原生 alert/confirm。
 */
import { IS_TAURI } from "./platform";

/**
 * 显示错误/提示消息（阻塞至用户确认）
 *
 * @param text 消息内容
 * @param title 对话框标题
 */
export async function showMessage(text: string, title = "Learning House"): Promise<void> {
  if (IS_TAURI) {
    const { message } = await import("@tauri-apps/plugin-dialog");
    await message(text, { title });
    return;
  }
  window.alert(text);
}

/**
 * 显示确认对话框
 *
 * @param text 询问内容
 * @param title 对话框标题
 * @returns 用户是否确认
 */
export async function showConfirm(text: string, title = "Learning House"): Promise<boolean> {
  if (IS_TAURI) {
    const { ask } = await import("@tauri-apps/plugin-dialog");
    return ask(text, { title });
  }
  return window.confirm(text);
}
