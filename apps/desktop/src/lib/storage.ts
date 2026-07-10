/**
 * 应用级持久化存储
 *
 * Tauri 环境使用 tauri-plugin-store（应用数据目录 JSON 文件，单例缓存），
 * 纯浏览器环境（开发调试）降级为 localStorage。
 *
 * 存储内容：课程库（结构与引用）、应用设置、本地使用计数。
 * 学习进度不在这里——它随课程文件夹存放（见 progress.ts）。
 */
import type { AppSettings, Course } from "../types";
import { IS_TAURI } from "./platform";

/** store 文件名（Tauri）/ localStorage key 前缀（浏览器） */
const STORE_FILE = "learning-house.json";
const KEY_COURSES = "courses";
const KEY_SETTINGS = "settings";
const KEY_USAGE = "usageCounters";

/** 默认设置（主题默认跟随系统外观） */
export const DEFAULT_SETTINGS: AppSettings = { swapPanes: false, theme: "system" };

/** 本地使用计数（不上报，仅用于产品决策时自查） */
export type UsageCounters = Record<string, number>;

type StoreShape = {
  [KEY_COURSES]: Course[];
  [KEY_SETTINGS]: AppSettings;
  [KEY_USAGE]: UsageCounters;
};

/** Tauri store 实例单例（避免每次读写都重新加载文件） */
let storePromise: Promise<import("@tauri-apps/plugin-store").Store> | null = null;

/**
 * 获取（惰性创建）store 单例
 */
function getStore() {
  if (!storePromise) {
    storePromise = import("@tauri-apps/plugin-store").then(({ load }) => load(STORE_FILE));
  }
  return storePromise;
}

/**
 * 读取一个存储键（内部统一入口）
 *
 * @param key 存储键名
 * @param fallback 键不存在时的默认值
 */
async function readKey<K extends keyof StoreShape>(key: K, fallback: StoreShape[K]): Promise<StoreShape[K]> {
  if (IS_TAURI) {
    const store = await getStore();
    return (await store.get<StoreShape[K]>(key)) ?? fallback;
  }
  const raw = localStorage.getItem(`lh:${key}`);
  return raw ? (JSON.parse(raw) as StoreShape[K]) : fallback;
}

/**
 * 写入一个存储键（内部统一入口）
 *
 * @param key 存储键名
 * @param value 要写入的值
 */
async function writeKey<K extends keyof StoreShape>(key: K, value: StoreShape[K]): Promise<void> {
  if (IS_TAURI) {
    const store = await getStore();
    await store.set(key, value);
    await store.save();
    return;
  }
  localStorage.setItem(`lh:${key}`, JSON.stringify(value));
}

/**
 * 读取课程库
 */
export function loadCourses(): Promise<Course[]> {
  return readKey(KEY_COURSES, []);
}

/**
 * 保存课程库（整体覆盖）
 *
 * @param courses 全量课程列表
 */
export function saveCourses(courses: Course[]): Promise<void> {
  return writeKey(KEY_COURSES, courses);
}

/**
 * 读取应用设置
 */
export function loadSettings(): Promise<AppSettings> {
  return readKey(KEY_SETTINGS, DEFAULT_SETTINGS);
}

/**
 * 保存应用设置
 *
 * @param settings 设置对象
 */
export function saveSettings(settings: AppSettings): Promise<void> {
  return writeKey(KEY_SETTINGS, settings);
}

/**
 * 本地使用计数 +1（如"下一节"按钮点击量，用于决定功能去留）
 *
 * @param counter 计数器名
 */
export async function bumpUsageCounter(counter: string): Promise<void> {
  const counters = await readKey(KEY_USAGE, {});
  counters[counter] = (counters[counter] ?? 0) + 1;
  await writeKey(KEY_USAGE, counters);
}
