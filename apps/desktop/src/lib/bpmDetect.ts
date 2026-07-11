/**
 * 伴奏 BPM 自动识别
 *
 * 读取音频文件解码为 PCM，用 web-audio-beat-detector
 * （低通滤波 + 峰值间隔统计）估算 BPM 与第一拍出现时刻，
 * 供节拍器"跟随伴奏"一键卡点。结果按文件路径缓存，避免重复解码。
 */
import { readBinary } from "./platform";

/** 识别结果 */
export interface BpmDetectResult {
  /** 估算的 BPM（四舍五入到整数，范围约束到节拍器可用区间） */
  bpm: number;
  /** 第一拍出现时刻（秒，保留两位小数） */
  offset: number;
}

/** 节拍器可接受的 BPM 范围 */
const BPM_MIN = 20;
const BPM_MAX = 300;

/** 路径 -> 识别结果缓存（解码整首歌成本高，同文件只算一次） */
const cache = new Map<string, BpmDetectResult>();

/**
 * 识别音频文件的 BPM 与首拍偏移
 *
 * @param path 音频文件绝对路径
 * @returns 识别结果
 * @throws 文件读取失败、解码失败或节奏特征不明显无法估算时抛错
 */
export async function detectBpmFromFile(path: string): Promise<BpmDetectResult> {
  const cached = cache.get(path);
  if (cached) return cached;

  const bytes = await readBinary(path);
  // 关键节点：decodeAudioData 会转移（detach）传入的 buffer，拷贝一份独立内存
  const arrayBuffer = bytes.slice().buffer as ArrayBuffer;
  const ctx = new AudioContext();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const { guess } = await import("web-audio-beat-detector");
    const guessed = await guess(audioBuffer);
    const result: BpmDetectResult = {
      bpm: Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(guessed.bpm))),
      offset: Math.max(0, +guessed.offset.toFixed(2)),
    };
    cache.set(path, result);
    return result;
  } finally {
    void ctx.close();
  }
}
