/**
 * 伴奏节拍参数持久化（写入课程文件夹内的 .learninghouse/media.json）
 *
 * BPM 与首拍偏移是音频文件的属性而非课节的属性：同一份伴奏被多个
 * 课节引用时共享一份参数。识别结果自动落盘；用户手动校准的值
 * 标记 manual，作为最可信来源。键使用相对路径，随课程文件夹迁移。
 * 浏览器调试环境（无 Tauri）降级为 localStorage。
 */
import { IS_TAURI } from "./platform";
import { COURSE_DATA_DIR } from "./progress";

/** 媒体元数据文件名 */
const MEDIA_META_FILENAME = "media.json";

/** 单个音频的节拍参数 */
export interface AudioBeatMeta {
  /** BPM */
  bpm: number;
  /** 首拍偏移（秒） */
  firstBeatOffset: number;
  /** 是否来自用户手动校准（优先级高于自动识别，识别不覆盖） */
  manual?: boolean;
}

/** 媒体元数据文件结构：音频相对路径 -> 节拍参数 */
export interface CourseMediaMeta {
  audio: Record<string, AudioBeatMeta>;
}

/** 写盘防抖表：rootDir -> 定时器 */
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
/** 写盘防抖间隔（毫秒）：步进器长按连发合并为一次写盘 */
const SAVE_DEBOUNCE_MS = 800;

/**
 * 读取课程的媒体元数据
 *
 * @param rootDir 课程根文件夹绝对路径
 * @returns 元数据对象（文件不存在或损坏时返回空表）
 */
export async function loadMediaMeta(rootDir: string): Promise<CourseMediaMeta> {
  try {
    let raw: string;
    if (IS_TAURI) {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      raw = await readTextFile(`${rootDir}/${COURSE_DATA_DIR}/${MEDIA_META_FILENAME}`);
    } else {
      raw = localStorage.getItem(`lh:media:${rootDir}`) ?? "";
    }
    if (!raw) return { audio: {} };
    const data = JSON.parse(raw) as Partial<CourseMediaMeta>;
    return { audio: data.audio && typeof data.audio === "object" ? data.audio : {} };
  } catch {
    return { audio: {} };
  }
}

/**
 * 防抖保存媒体元数据到课程文件夹
 *
 * @param rootDir 课程根文件夹绝对路径
 * @param meta 元数据对象
 */
export function saveMediaMeta(rootDir: string, meta: CourseMediaMeta): void {
  const prev = saveTimers.get(rootDir);
  if (prev) clearTimeout(prev);
  saveTimers.set(
    rootDir,
    setTimeout(() => {
      saveTimers.delete(rootDir);
      void writeMediaMetaFile(rootDir, meta);
    }, SAVE_DEBOUNCE_MS),
  );
}

/**
 * 实际写盘（Tauri 写文件，浏览器写 localStorage）
 *
 * @param rootDir 课程根文件夹绝对路径
 * @param meta 元数据对象
 */
async function writeMediaMetaFile(rootDir: string, meta: CourseMediaMeta): Promise<void> {
  const json = JSON.stringify(meta, null, 2);
  try {
    if (IS_TAURI) {
      const { exists, mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
      const dataDir = `${rootDir}/${COURSE_DATA_DIR}`;
      if (!(await exists(dataDir))) {
        await mkdir(dataDir, { recursive: true });
      }
      await writeTextFile(`${dataDir}/${MEDIA_META_FILENAME}`, json);
    } else {
      localStorage.setItem(`lh:media:${rootDir}`, json);
    }
  } catch (e) {
    console.warn("媒体元数据写入失败（课程文件夹可能只读）:", e);
  }
}
