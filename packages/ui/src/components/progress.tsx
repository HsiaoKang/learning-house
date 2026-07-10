/**
 * 进度条（Radix Progress）
 */
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "../lib/utils";

export interface ProgressBarProps {
  /** 进度百分比 0-100 */
  percent: number;
  className?: string;
}

/**
 * 进度条组件
 *
 * @param props percent 进度百分比
 */
export function ProgressBar({ percent, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <ProgressPrimitive.Root
      value={clamped}
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-secondary", className)}
    >
      <ProgressPrimitive.Indicator
        className="h-full rounded-full bg-primary transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
