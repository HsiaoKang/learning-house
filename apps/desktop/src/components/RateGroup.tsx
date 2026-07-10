/**
 * 倍速档位按钮组（音频播放条使用；视频用原生控制条的倍速菜单）
 */
import { cn } from "@learning-house/ui";

/** 可选倍速档位（慢速练习是核心场景） */
export const PLAYBACK_RATES = [0.5, 0.65, 0.75, 0.85, 1, 1.25, 1.5];

interface RateGroupProps {
  /** 当前倍速 */
  value: number;
  /** 切换倍速 */
  onChange: (rate: number) => void;
}

/**
 * 倍速按钮组组件
 *
 * @param props value 当前倍速；onChange 切换回调
 */
export function RateGroup({ value, onChange }: RateGroupProps) {
  return (
    <div className="flex shrink-0 gap-0.5">
      {PLAYBACK_RATES.map((rate) => (
        <button
          key={rate}
          onClick={() => onChange(rate)}
          className={cn(
            "rounded px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
            rate === value && "bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground",
          )}
        >
          {rate}x
        </button>
      ))}
    </div>
  );
}
