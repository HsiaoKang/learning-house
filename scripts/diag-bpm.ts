/**
 * BPM 判别信号诊断工具
 *
 * 读取 ffmpeg 解码的 f32le 单声道 PCM，计算 RMS 包络后打印
 * 各倍频候选的判别信号（奇偶拍比、反拍比、修正结果），
 * 用真实伴奏数据校准判别阈值。
 *
 * 用法: ffmpeg -i xx.mp3 -ac 1 -ar 44100 -f f32le /tmp/xx.pcm
 *      pnpm dlx tsx scripts/diag-bpm.ts /tmp/xx.pcm <库粗估BPM>
 */
import fs from "node:fs";
import { analyzeEnvelope, beatAlignmentScore, computeOnsetEnvelope } from "../apps/desktop/src/lib/bpmDetect";

const SAMPLE_RATE = 44100;
const WIN_SEC = 0.01;

const [pcmPath, rawBpmArg, headSecArg] = process.argv.slice(2);
if (!pcmPath || !rawBpmArg) {
  console.error("用法: tsx scripts/diag-bpm.ts <pcm文件> <库粗估BPM> [仅分析前N秒]");
  process.exit(1);
}
const rawBpm = Number(rawBpmArg);
const headSec = headSecArg ? Number(headSecArg) : null;

const buf = fs.readFileSync(pcmPath);
let samples = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
if (headSec) {
  samples = samples.subarray(0, Math.min(samples.length, Math.round(headSec * SAMPLE_RATE)));
}

// 频谱通量 ODF（与线上 detectBpmFromFile 完全同一实现）
const envelope = computeOnsetEnvelope(samples, SAMPLE_RATE);
console.log(`时长 ${(envelope.length * WIN_SEC).toFixed(1)}s，ODF ${envelope.length} 格`);

/**
 * 打印某个候选 BPM 的判别信号（复制 bpmDetect.alignPhase 的口径）
 */
function inspect(bpm: number): void {
  const periodSteps = 60 / bpm / WIN_SEC;
  const phaseCount = Math.max(1, Math.floor(periodSteps * 2));
  let bestPhase = 0;
  let bestEven = -Infinity;
  for (let phase = 0; phase < phaseCount; phase++) {
    const even = mean(envelope, phase, periodSteps * 2);
    if (even > bestEven) {
      bestEven = even;
      bestPhase = phase;
    }
  }
  const even = mean(envelope, bestPhase, periodSteps * 2);
  const odd = mean(envelope, bestPhase + periodSteps, periodSteps * 2);
  const on = mean(envelope, bestPhase, periodSteps);
  const off = mean(envelope, bestPhase + periodSteps / 2, periodSteps);
  console.log(
    `BPM ${bpm}: 相位 ${(bestPhase * WIN_SEC).toFixed(2)}s | 奇/偶拍比 ${(odd / even).toFixed(3)} | 反拍/拍点比 ${(off / on).toFixed(3)}`,
  );
}

/** 拍网格能量均值（±2 格取峰） */
function mean(env: Float32Array, startStep: number, periodSteps: number): number {
  let sum = 0;
  let count = 0;
  for (let t = startStep; t < env.length; t += periodSteps) {
    const c = Math.round(t);
    let peak = 0;
    for (let i = c - 2; i <= c + 2; i++) {
      if (i >= 0 && i < env.length && env[i] > peak) peak = env[i];
    }
    sum += peak;
    count++;
  }
  return count > 0 ? sum / count : 0;
}

inspect(rawBpm / 2);
inspect(rawBpm);
inspect(rawBpm * 2);

const result = analyzeEnvelope(envelope, rawBpm);
const alignment = beatAlignmentScore(envelope, result.bpm, result.offset);
console.log(
  `analyzeEnvelope(${rawBpm}) -> BPM ${result.bpm}，首拍 ${result.offset.toFixed(2)}s，拍点对齐度 ${alignment.toFixed(3)}`,
);
