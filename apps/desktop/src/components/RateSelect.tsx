/**
 * 倍速下拉选择（视频控制栏与音频条共用）
 *
 * 倍速属于低频操作，收纳为 dropdown 减少控制栏占用。
 */
import { Select, cn } from "@learning-house/ui";

/** 可选倍速档位（慢速练习是核心场景） */
export const PLAYBACK_RATES = [0.5, 0.65, 0.75, 0.85, 1, 1.25, 1.5];

interface RateSelectProps {
  /** 当前倍速 */
  value: number;
  /** 切换倍速 */
  onChange: (rate: number) => void;
  /** 深色浮层变体（视频控制栏的黑色渐变上使用） */
  onDark?: boolean;
}

/**
 * 倍速下拉组件
 *
 * @param props value 当前倍速；onChange 切换回调；onDark 深色变体
 */
export function RateSelect({ value, onChange, onDark }: RateSelectProps) {
  return (
    <Select
      value={String(value)}
      onChange={(v) => onChange(Number(v))}
      options={PLAYBACK_RATES.map((r) => ({ value: String(r), label: `${r}x` }))}
      title="播放倍速"
      className={cn("h-7 px-2 text-xs", onDark && "border-white/25 bg-white/10 text-white hover:border-white/50")}
    />
  );
}
