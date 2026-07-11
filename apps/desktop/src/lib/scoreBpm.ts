/**
 * 曲谱 BPM 标注读取
 *
 * Guitar Pro 导出的 PDF 谱面文本层含速度标注（如「♩ = 90」），
 * 提取第一页的「= N」标记作为该曲的权威拍速——谱面是作者写下的
 * 真值，可靠性仅次于音频文件名里的显式标注，高于声学估计。
 */
import { readBinary } from "./platform";
// legacy 构建兼容较旧的 WebView 内核（与 PdfScore 同款）
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

/** 可信的 BPM 标注范围 */
const BPM_MIN = 20;
const BPM_MAX = 300;

/** 路径 -> 标注缓存（null 表示确认无标注） */
const cache = new Map<string, number | null>();

/**
 * 从曲谱 PDF 第一页提取 BPM 标注
 *
 * @param path PDF 文件绝对路径
 * @returns 标注的 BPM；无标注、解析失败或数值越界时返回 null
 */
export async function bpmFromScorePdf(path: string): Promise<number | null> {
  const cached = cache.get(path);
  if (cached !== undefined) return cached;

  let result: number | null = null;
  try {
    const bytes = await readBinary(path);
    const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
    try {
      const doc = await loadingTask.promise;
      const page = await doc.getPage(1);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item) => ("str" in item ? item.str : "")).join(" ");
      const m = /=\s*(\d{2,3})\b/.exec(text);
      if (m) {
        const value = Number(m[1]);
        if (value >= BPM_MIN && value <= BPM_MAX) result = value;
      }
    } finally {
      // 释放 worker 侧文档资源（与 PdfScore 卸载时同款清理）
      void loadingTask.destroy();
    }
  } catch {
    result = null;
  }
  cache.set(path, result);
  return result;
}
