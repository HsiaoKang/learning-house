/**
 * 课程进度持久化（写入课程文件夹内的 .learninghouse/progress.json）
 *
 * 进度跟随课程文件夹走：换机器、重装应用、重新导入都不丢。
 * 键使用课节名与相对路径，保证重扫/搬迁后仍能对上。
 * 浏览器调试环境（无 Tauri）降级为 localStorage。
 */
import { IS_TAURI } from "./platform";

/** 课程文件夹内的数据目录（mac/Linux 下隐藏，Windows 可见但无害） */
export const COURSE_DATA_DIR = ".learninghouse";
/** 进度文件名 */
const PROGRESS_FILENAME = "progress.json";

/** 课程进度：完成课节名单 + 资源续播位置（相对路径 -> 秒） */
export interface CourseProgress {
  completedLessons: string[];
  playback: Record<string, number>;
}

const EMPTY: CourseProgress = { completedLessons: [], playback: {} };

/** 写盘防抖表：rootDir -> 定时器 */
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
/** 写盘防抖间隔（毫秒） */
const SAVE_DEBOUNCE_MS = 1200;

/**
 * 读取课程文件夹内的进度文件
 *
 * @param rootDir 课程根文件夹绝对路径
 * @returns 进度对象（文件不存在或损坏时返回空进度）
 */
export async function loadCourseProgress(rootDir: string): Promise<CourseProgress> {
  try {
    let raw: string;
    if (IS_TAURI) {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      raw = await readTextFile(`${rootDir}/${COURSE_DATA_DIR}/${PROGRESS_FILENAME}`);
    } else {
      raw = localStorage.getItem(`lh:progress:${rootDir}`) ?? "";
    }
    if (!raw) return { ...EMPTY, playback: {} };
    const data = JSON.parse(raw) as Partial<CourseProgress>;
    return {
      completedLessons: Array.isArray(data.completedLessons) ? data.completedLessons : [],
      playback: data.playback && typeof data.playback === "object" ? data.playback : {},
    };
  } catch {
    return { completedLessons: [], playback: {} };
  }
}

/**
 * 防抖保存课程进度到课程文件夹（频繁的续播更新合并为一次写盘）
 *
 * @param rootDir 课程根文件夹绝对路径
 * @param progress 进度对象
 */
export function saveCourseProgress(rootDir: string, progress: CourseProgress): void {
  const prev = saveTimers.get(rootDir);
  if (prev) clearTimeout(prev);
  saveTimers.set(
    rootDir,
    setTimeout(() => {
      saveTimers.delete(rootDir);
      void writeProgressFile(rootDir, progress);
    }, SAVE_DEBOUNCE_MS),
  );
}

/**
 * 实际写盘（Tauri 写文件，浏览器写 localStorage）
 *
 * @param rootDir 课程根文件夹绝对路径
 * @param progress 进度对象
 */
async function writeProgressFile(rootDir: string, progress: CourseProgress): Promise<void> {
  const json = JSON.stringify(progress, null, 2);
  try {
    if (IS_TAURI) {
      const { exists, mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
      const dataDir = `${rootDir}/${COURSE_DATA_DIR}`;
      if (!(await exists(dataDir))) {
        await mkdir(dataDir, { recursive: true });
      }
      await writeTextFile(`${dataDir}/${PROGRESS_FILENAME}`, json);
    } else {
      localStorage.setItem(`lh:progress:${rootDir}`, json);
    }
  } catch (e) {
    console.warn("进度写入失败（课程文件夹可能只读）:", e);
  }
}
