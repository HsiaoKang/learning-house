/**
 * 通用格式化工具
 */

/**
 * 把秒数格式化为 m:ss / h:mm:ss 形式
 *
 * @param sec 秒数
 * @returns 格式化字符串，如 3:07、1:02:45
 */
export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
