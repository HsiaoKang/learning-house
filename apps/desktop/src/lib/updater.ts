/**
 * 应用内更新
 *
 * 基于 tauri-plugin-updater，从 GitHub Releases 的 latest.json 检查新版本，
 * 用户确认后应用内下载安装并重启。仅在 Tauri 生产构建中生效
 * （开发模式与浏览器调试环境直接跳过）。
 */
import { IS_TAURI } from "./platform";
import { showConfirm } from "./dialogs";

/** 更新检查结果（null 表示无更新或当前环境不适用） */
export interface UpdateInfo {
  /** 新版本号 */
  version: string;
  /** 触发下载安装并重启 */
  install: (onProgress: (percent: number) => void) => Promise<void>;
}

/**
 * 检查是否有新版本
 *
 * @returns 有新版本时返回版本信息与安装函数，否则返回 null
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!IS_TAURI || import.meta.env.DEV) return null;
  const { check } = await import("@tauri-apps/plugin-updater");
  const update = await check();
  if (!update) return null;

  return {
    version: update.version,
    install: async (onProgress) => {
      let total = 0;
      let received = 0;
      await update.downloadAndInstall((event) => {
        // 关键节点：把下载事件折算成百分比回调给 UI
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          received += event.data.chunkLength;
          if (total > 0) onProgress(Math.min(99, Math.round((received / total) * 100)));
        } else if (event.event === "Finished") {
          onProgress(100);
        }
      });
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    },
  };
}

/**
 * 启动时的静默更新流程：检查 -> 询问 -> 下载安装 -> 重启。
 * 检查失败（离线、GitHub 不可达）静默忽略，不打扰使用。
 *
 * @param notify 进度提示回调（接 toast），如 "正在下载更新 42%"
 */
export async function runStartupUpdateCheck(notify: (message: string) => void): Promise<void> {
  const update = await checkForUpdate().catch(() => null);
  if (!update) return;

  const ok = await showConfirm(
    `发现新版本 v${update.version}，是否现在更新？\n更新会在后台下载，完成后自动重启应用。`,
    "应用更新",
  );
  if (!ok) return;

  let lastShown = -1;
  await update
    .install((percent) => {
      // 每 10% 提示一次，避免 toast 刷屏
      const step = Math.floor(percent / 10);
      if (step > lastShown) {
        lastShown = step;
        notify(percent >= 100 ? "更新下载完成，正在重启…" : `正在下载更新 ${percent}%`);
      }
    })
    .catch(async (e: unknown) => {
      const { showMessage } = await import("./dialogs");
      await showMessage(`更新失败：${e instanceof Error ? e.message : e}`, "应用更新");
    });
}
