/**
 * AI 整理提示词生成
 *
 * 把课程文件夹的文件清单和课节清单(learning-house.json)的格式约定
 * 组装成一段完整提示词,用户复制后粘贴给任意 AI(ChatGPT/豆包/Kimi 等),
 * 将 AI 返回的 JSON 保存到课程根目录即可按清单导入。
 * 全程无需上传任何数据到本项目的服务器,保持 local-first。
 */
import { resourceKindOf } from "../types";
import type { DirNode } from "./heuristic";

/** 提示词中的格式说明与整理要求(与 scanner.ts 的清单解析约定一致) */
const PROMPT_HEADER = `你是课程整理助手。下面是一个课程文件夹的文件清单,请把它整理成课节清单 JSON。

要求:
1. 输出一个 JSON 对象,结构为:
   {"name": "课程名", "lessons": [{"name": "课节名", "resources": ["文件相对路径", ...]}, ...]}
2. 每个课节通常以一个主视频为核心;同一主题的多个视频(如 上/中/下、01-练习曲/02-讲解)合并为一个课节
3. 根据文件名中的编号、集数或主题,把配套资料(PDF 谱子、伴奏音频、图片)归入对应课节的 resources
4. 课节按视频编号/集数顺序排列;课节名用简洁的中文标题,可保留编号前缀
5. resources 里的路径必须逐字符与文件清单一致,不要虚构、改写或遗漏扩展名
6. 匹配不到课节的资料,统一放入名为"未分组资料"的最后一个课节
7. 只输出 JSON 本身,不要包含任何解释文字或代码块标记

文件清单(相对课程根目录):`;

/**
 * 生成课程文件夹的 AI 整理提示词
 *
 * @param tree 课程根目录树(由 scanner.readDirTree 读取)
 * @returns 完整提示词文本;文件夹内没有可识别资源时返回 null
 */
export function buildOrganizePrompt(tree: DirNode): string | null {
  const paths = flattenSupportedFiles(tree, "");
  if (paths.length === 0) return null;
  return `${PROMPT_HEADER}\n${paths.join("\n")}\n`;
}

/**
 * 展平目录树为受支持格式文件的相对路径列表(按名称自然排序)
 *
 * @param node 目录树节点
 * @param prefix 当前节点的相对路径前缀(根为空串)
 * @returns 相对路径列表
 */
function flattenSupportedFiles(node: DirNode, prefix: string): string[] {
  const paths = node.files
    .filter((f) => resourceKindOf(f) !== null)
    .sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }))
    .map((f) => (prefix ? `${prefix}/${f}` : f));
  for (const dir of [...node.dirs].sort((a, b) => a.name.localeCompare(b.name, "zh-CN", { numeric: true }))) {
    paths.push(...flattenSupportedFiles(dir, prefix ? `${prefix}/${dir.name}` : dir.name));
  }
  return paths;
}
