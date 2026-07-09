#!/usr/bin/env node
/**
 * 成田电吉他课程清单生成脚本
 *
 * 为「成田电吉他课程」的三门子课程各生成一份 learning-house.json 课节清单,
 * 供 Learning House 应用按清单导入。只生成清单文件,不移动/修改任何原资源文件
 * (原目录是 PT 下载目录,移动文件会破坏做种)。
 *
 * 三门课的组课规则:
 * - 01 基础入门课:每个编号视频一个课节;「配套PDF资料/主题（NO.x）」按主题
 *   文本匹配到视频标题(归一化子串匹配,兜底子序列匹配)
 * - 02 中级进阶课:视频名内含课号「-M：」,同课号的视频(上/下集)合并为一个
 *   课节;「资料/M：xxx」按课号 M 精确归入对应课节
 * - 03 核心技巧课:按「第X集」分组,一集一个课节;「配套PDF资料/第X集课程资料」
 *   归入对应集
 *
 * 用法: node scripts/gen-manifest-chengtian.mjs [课程根目录]
 */
import fs from "node:fs";
import path from "node:path";

/** 应用支持的资源扩展名(与 apps/desktop/src/types.ts 保持一致) */
const SUPPORTED_EXTENSIONS = new Set([
  "mp4", "m4v", "mov", "webm",
  "mp3", "m4a", "aac", "wav", "flac", "aiff",
  "png", "jpg", "jpeg", "webp", "gif", "bmp",
  "pdf",
  "gp", "gp3", "gp4", "gp5", "gpx",
]);

/** 视频扩展名(用于筛选课节主视频) */
const VIDEO_EXTENSIONS = new Set(["mp4", "m4v", "mov", "webm"]);

/** 清单文件名(与 apps/desktop/src/lib/scanner.ts 的 MANIFEST_FILENAME 一致) */
const MANIFEST_FILENAME = "learning-house.json";

const DEFAULT_ROOT = "/Volumes/ptDownload/sl/成田电吉他课程";

/** 三门子课程的目录名、展示名与组课函数 */
const COURSES = [
  { dir: "01.基础入门课（73课）", name: "成田电吉他 · 基础入门课", build: buildBasicCourse },
  { dir: "02.中级进阶课（81课完整版）", name: "成田电吉他 · 中级进阶课", build: buildIntermediateCourse },
  { dir: "03.核心技巧课（40课完整版）", name: "成田电吉他 · 核心技巧课", build: buildCoreCourse },
];

main();

/**
 * 入口:遍历三门课,生成清单、打印报告并校验清单里的路径
 */
function main() {
  const root = process.argv[2] ?? DEFAULT_ROOT;
  if (!fs.existsSync(root)) {
    console.error(`课程根目录不存在: ${root}`);
    process.exit(1);
  }

  let hasError = false;
  for (const course of COURSES) {
    const courseDir = path.join(root, course.dir);
    if (!fs.existsSync(courseDir)) {
      console.error(`跳过:子课程目录不存在 ${courseDir}`);
      hasError = true;
      continue;
    }

    const { lessons, unmatched } = course.build(courseDir);
    const manifest = { name: course.name, lessons };
    const manifestPath = path.join(courseDir, MANIFEST_FILENAME);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

    const missing = verifyManifest(courseDir, manifest);
    printReport(course, courseDir, manifest, unmatched, missing);
    if (missing.length > 0) hasError = true;
  }
  process.exit(hasError ? 1 : 0);
}

// ---------------------------------------------------------------------------
// 课程 01:基础入门课
// ---------------------------------------------------------------------------

/**
 * 组课规则 01:根目录每个「N--xxx_标题.mp4」视频一个课节;
 * 「配套PDF资料/主题（NO.x）」文件夹按主题文本匹配附加到相应课节
 *
 * @param {string} courseDir 子课程目录绝对路径
 * @returns {{ lessons: Array, unmatched: string[] }} 课节列表与未匹配的资料路径
 */
function buildBasicCourse(courseDir) {
  const lessons = listRootVideos(courseDir)
    .map((file) => {
      const m = /^(\d+)--(.+)$/.exec(stripExt(file));
      if (!m) return null;
      const title = titleAfterUnderscore(m[2]);
      return { num: Number(m[1]), name: `${m[1]}. ${title}`, title, resources: [file] };
    })
    .filter(Boolean)
    .sort((a, b) => a.num - b.num);

  // 关键节点:资料夹名去掉「（NO.x）」与「课件」后缀得到主题,匹配视频标题
  const unmatched = [];
  const materialRoot = "配套PDF资料";
  for (const dirName of listSubDirs(path.join(courseDir, materialRoot))) {
    const topic = dirName.replace(/（NO\.\d+）$/u, "").replace(/课件$/u, "");
    const files = walkFiles(path.join(courseDir, materialRoot, dirName)).map((f) =>
      toPosix(path.join(materialRoot, dirName, f)),
    );
    const targets = matchLessonsByTopic(lessons, topic);
    if (targets.length === 0) {
      unmatched.push(...files);
      continue;
    }
    for (const lesson of targets) lesson.resources.push(...files);
  }

  appendUnmatchedLesson(lessons, unmatched);
  return { lessons: toManifestLessons(lessons), unmatched };
}

/**
 * 按主题文本匹配课节:先做归一化子串匹配,无命中再做子序列兜底
 * (例:主题「二分音符上拨练习」可命中标题「二分音符右手上拨练习」)
 *
 * @param {Array} lessons 课节列表(含 title 字段)
 * @param {string} topic 资料主题名
 * @returns {Array} 命中的课节(可能多个,如「练习曲」与「练习曲讲解」)
 */
function matchLessonsByTopic(lessons, topic) {
  const normTopic = normalizeText(topic);
  const bySubstring = lessons.filter((l) => normalizeText(l.title).includes(normTopic));
  if (bySubstring.length > 0) return bySubstring;
  return lessons.filter((l) => isSubsequence(normTopic, normalizeText(l.title)));
}

// ---------------------------------------------------------------------------
// 课程 02:中级进阶课
// ---------------------------------------------------------------------------

/**
 * 组课规则 02:视频名「N_系列-M:标题.mp4」按课号 M 分组(同课号的上/下集
 * 合并为一节),无课号的视频各自单独成节;「资料/M:xxx」按课号精确归入
 *
 * @param {string} courseDir 子课程目录绝对路径
 * @returns {{ lessons: Array, unmatched: string[] }} 课节列表与未匹配的资料路径
 */
function buildIntermediateCourse(courseDir) {
  const groups = new Map();

  for (const file of listRootVideos(courseDir)) {
    const m = /^(\d+)_(.+)$/.exec(stripExt(file));
    if (!m) continue;
    const num = Number(m[1]);
    const lessonMatch = /-(\d+)：(.+)$/.exec(m[2]);
    // 无课号的视频(前两个介绍视频)以序号单独成组
    const key = lessonMatch ? `L${lessonMatch[1]}` : `N${num}`;
    const title = lessonMatch ? lessonMatch[2] : m[2].slice(m[2].indexOf("-") + 1);
    if (!groups.has(key)) {
      groups.set(key, { num, lessonNo: lessonMatch ? Number(lessonMatch[1]) : null, titles: [], resources: [] });
    }
    const group = groups.get(key);
    group.num = Math.min(group.num, num);
    group.titles.push({ num, title });
    group.resources.push({ num, file });
  }

  const lessons = [...groups.values()]
    .sort((a, b) => a.num - b.num)
    .map((g) => ({
      num: g.num,
      lessonNo: g.lessonNo,
      name: g.lessonNo === null ? groupTitle(g) : `${g.lessonNo}：${groupTitle(g)}`,
      resources: g.resources.sort((a, b) => a.num - b.num).map((r) => r.file),
    }));

  // 关键节点:资料夹「M:xxx」按课号 M 精确匹配课节
  const unmatched = [];
  const materialRoot = "资料";
  for (const dirName of listSubDirs(path.join(courseDir, materialRoot))) {
    const m = /^(\d+)：/.exec(dirName);
    const files = walkFiles(path.join(courseDir, materialRoot, dirName)).map((f) =>
      toPosix(path.join(materialRoot, dirName, f)),
    );
    const target = m ? lessons.find((l) => l.lessonNo === Number(m[1])) : undefined;
    if (!target) {
      unmatched.push(...files);
      continue;
    }
    target.resources.push(...files);
  }

  appendUnmatchedLesson(lessons, unmatched);
  return { lessons: toManifestLessons(lessons), unmatched };
}

/**
 * 计算课节组的展示标题:多视频组(上/下集)剥离尾部「（xxx）」取公共标题,
 * 单视频组保留原标题
 *
 * @param {{ titles: Array<{num: number, title: string}> }} group 视频分组
 * @returns {string} 组标题
 */
function groupTitle(group) {
  const sorted = [...group.titles].sort((a, b) => a.num - b.num);
  if (sorted.length === 1) return sorted[0].title;
  const stripped = sorted.map((t) => t.title.replace(/（[^（）]*）$/u, ""));
  return stripped.every((s) => s === stripped[0]) ? stripped[0] : sorted[0].title;
}

// ---------------------------------------------------------------------------
// 课程 03:核心技巧课
// ---------------------------------------------------------------------------

/**
 * 组课规则 03:视频名内含「第X集/第X课」的按集分组(一集一节),
 * 无集号的视频单独成节;「配套PDF资料/第X集课程资料」归入对应集
 *
 * @param {string} courseDir 子课程目录绝对路径
 * @returns {{ lessons: Array, unmatched: string[] }} 课节列表与未匹配的资料路径
 */
function buildCoreCourse(courseDir) {
  const groups = new Map();

  for (const file of listRootVideos(courseDir)) {
    const m = /^(\d+)--(.+)$/.exec(stripExt(file));
    if (!m) continue;
    const num = Number(m[1]);
    const title = titleAfterUnderscore(m[2]);
    const episode = episodeNumberOf(title);
    const key = episode === null ? `N${num}` : `E${episode}`;
    if (!groups.has(key)) {
      groups.set(key, {
        num,
        episode,
        name: episode === null ? title : `第${chineseNumeral(episode)}集`,
        resources: [],
      });
    }
    const group = groups.get(key);
    group.num = Math.min(group.num, num);
    group.resources.push({ num, file });
  }

  const lessons = [...groups.values()]
    .sort((a, b) => a.num - b.num)
    .map((g) => ({
      episode: g.episode,
      name: g.name,
      resources: g.resources.sort((a, b) => a.num - b.num).map((r) => r.file),
    }));

  // 关键节点:资料夹「第X集课程资料」按集号归入对应课节
  const unmatched = [];
  const materialRoot = "配套PDF资料";
  for (const dirName of listSubDirs(path.join(courseDir, materialRoot))) {
    const episode = episodeNumberOf(dirName);
    const files = walkFiles(path.join(courseDir, materialRoot, dirName)).map((f) =>
      toPosix(path.join(materialRoot, dirName, f)),
    );
    const target = episode === null ? undefined : lessons.find((l) => l.episode === episode);
    if (!target) {
      unmatched.push(...files);
      continue;
    }
    target.resources.push(...files);
  }

  appendUnmatchedLesson(lessons, unmatched);
  return { lessons: toManifestLessons(lessons), unmatched };
}

/**
 * 从文本中提取「第X集/第X课」的集号(中文数字转数值)
 *
 * @param {string} text 待解析文本
 * @returns {number | null} 集号,未找到返回 null
 */
function episodeNumberOf(text) {
  const m = /第([一二三四五六七八九十]+)[集课]/u.exec(text);
  return m ? parseChineseNumeral(m[1]) : null;
}

/**
 * 解析中文数字(支持一~九十九,覆盖课程集数范围)
 *
 * @param {string} text 中文数字文本,如「十二」
 * @returns {number} 对应数值
 */
function parseChineseNumeral(text) {
  const DIGITS = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  const tenIdx = text.indexOf("十");
  if (tenIdx < 0) return DIGITS[text] ?? 0;
  const tens = tenIdx === 0 ? 1 : DIGITS[text[tenIdx - 1]] ?? 0;
  const ones = tenIdx === text.length - 1 ? 0 : DIGITS[text[tenIdx + 1]] ?? 0;
  return tens * 10 + ones;
}

/**
 * 数值转中文数字(1~99,用于课节展示名)
 *
 * @param {number} n 数值
 * @returns {string} 中文数字文本
 */
function chineseNumeral(n) {
  const DIGITS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  if (n < 10) return DIGITS[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${tens > 1 ? DIGITS[tens] : ""}十${DIGITS[ones]}`;
}

// ---------------------------------------------------------------------------
// 公共辅助
// ---------------------------------------------------------------------------

/**
 * 列出课程根目录下的一层视频文件名(自然排序)
 *
 * @param {string} courseDir 子课程目录绝对路径
 * @returns {string[]} 视频文件名列表
 */
function listRootVideos(courseDir) {
  // 保留磁盘原始文件名(不做 Unicode 规范化),保证清单路径与磁盘一致
  return fs
    .readdirSync(courseDir, { withFileTypes: true })
    .filter((e) => e.isFile() && !e.name.startsWith(".") && VIDEO_EXTENSIONS.has(extOf(e.name)))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));
}

/**
 * 列出目录下的一层子文件夹名(自然排序)
 *
 * @param {string} dir 目录绝对路径
 * @returns {string[]} 子文件夹名列表,目录不存在时返回空数组
 */
function listSubDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));
}

/**
 * 递归列出目录内所有受支持的资源文件(相对该目录的 POSIX 路径,自然排序)
 *
 * @param {string} dir 目录绝对路径
 * @returns {string[]} 相对路径列表
 */
function walkFiles(dir) {
  const result = [];
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => !e.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN", { numeric: true }));
  for (const entry of entries) {
    if (entry.isDirectory()) {
      result.push(...walkFiles(path.join(dir, entry.name)).map((f) => `${entry.name}/${f}`));
    } else if (SUPPORTED_EXTENSIONS.has(extOf(entry.name))) {
      result.push(entry.name);
    }
  }
  return result;
}

/**
 * 把内部课节结构转换为清单课节(仅保留 name 与 resources)
 *
 * @param {Array} lessons 内部课节列表
 * @returns {Array<{name: string, resources: string[]}>} 清单课节列表
 */
function toManifestLessons(lessons) {
  return lessons.map((l) => ({ name: l.name, resources: l.resources }));
}

/**
 * 把未匹配的资料文件追加为末尾的「未分组资料」课节,避免资源丢失
 *
 * @param {Array} lessons 课节列表(原地追加)
 * @param {string[]} unmatched 未匹配的资料相对路径
 */
function appendUnmatchedLesson(lessons, unmatched) {
  if (unmatched.length > 0) {
    lessons.push({ name: "未分组资料", resources: unmatched });
  }
}

/**
 * 校验清单内所有资源路径都真实存在
 *
 * @param {string} courseDir 子课程目录绝对路径
 * @param {{ lessons: Array<{resources: string[]}> }} manifest 清单对象
 * @returns {string[]} 缺失的路径列表
 */
function verifyManifest(courseDir, manifest) {
  const missing = [];
  for (const lesson of manifest.lessons) {
    for (const rel of lesson.resources) {
      if (!fs.existsSync(path.join(courseDir, rel))) missing.push(rel);
    }
  }
  return missing;
}

/**
 * 打印一门课的生成报告
 *
 * @param {{ name: string }} course 课程配置
 * @param {string} courseDir 子课程目录绝对路径
 * @param {{ lessons: Array }} manifest 生成的清单
 * @param {string[]} unmatched 未匹配的资料路径
 * @param {string[]} missing 校验出的缺失路径
 */
function printReport(course, courseDir, manifest, unmatched, missing) {
  const resourceCount = manifest.lessons.reduce((sum, l) => sum + l.resources.length, 0);
  console.log(`\n=== ${course.name} ===`);
  console.log(`目录: ${courseDir}`);
  console.log(`课节: ${manifest.lessons.length} 个,资源引用: ${resourceCount} 条`);
  if (unmatched.length > 0) {
    console.log(`未匹配资料(已归入「未分组资料」课节): ${unmatched.length} 个`);
    for (const f of unmatched) console.log(`  - ${f}`);
  } else {
    console.log("资料全部匹配到课节");
  }
  console.log(missing.length > 0 ? `路径校验失败 ${missing.length} 条: ${missing.join(", ")}` : "路径校验通过");
}

/**
 * 提取文件名的小写扩展名(不含点号)
 *
 * @param {string} name 文件名
 * @returns {string} 扩展名,无扩展名返回空串
 */
function extOf(name) {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
}

/**
 * 去掉文件名的扩展名并统一为 NFC 形式
 *
 * @param {string} name 文件名
 * @returns {string} 去扩展名后的文件名
 */
function stripExt(name) {
  const idx = name.lastIndexOf(".");
  return (idx >= 0 ? name.slice(0, idx) : name).normalize("NFC");
}

/**
 * 取「系列_标题」中下划线后的标题部分(无下划线时返回原文)
 *
 * @param {string} text 待切分文本
 * @returns {string} 标题
 */
function titleAfterUnderscore(text) {
  const idx = text.indexOf("_");
  return (idx >= 0 ? text.slice(idx + 1) : text).trim();
}

/**
 * 归一化文本用于匹配:NFC 后去掉所有非字母/数字字符(标点、空白、全半角符号)
 *
 * @param {string} text 原文本
 * @returns {string} 归一化文本
 */
function normalizeText(text) {
  return text.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * 判断 needle 是否为 haystack 的子序列(字符按序出现,可不连续)
 *
 * @param {string} needle 待查找序列
 * @param {string} haystack 目标文本
 * @returns {boolean} 是否为子序列
 */
function isSubsequence(needle, haystack) {
  let i = 0;
  for (const ch of haystack) {
    if (ch === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return needle.length === 0;
}

/**
 * 把平台相关路径分隔符统一为 POSIX 的 /
 *
 * @param {string} p 路径
 * @returns {string} POSIX 风格路径
 */
function toPosix(p) {
  return p.split(path.sep).join("/");
}
