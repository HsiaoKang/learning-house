/**
 * 悬停提示（Radix Tooltip）
 *
 * 替代原生 title 属性：WKWebView 的原生 tooltip 首次出现延迟 2-3 秒
 * 且不可配置；自绘版首次 300ms 出现，显示过后短时间内切换到其他
 * 目标立即出现（skip delay），三端表现一致。
 */
import { type ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

/** 首次悬停到出现的延迟（毫秒） */
const SHOW_DELAY_MS = 300;

/** 提示消失后多长时间内再次悬停可立即显示（毫秒） */
const SKIP_DELAY_MS = 800;

/**
 * Tooltip 全局 Provider（挂应用根部一次，skip delay 才能跨组件生效）
 *
 * disableHoverableContent：提示气泡本身不参与悬停保持。否则鼠标快速
 * 划向相邻按钮时若扫过气泡，旧提示会被"悬停"锁住不关闭，
 * 新目标的提示被互斥挡下，表现为"提示内容没有切换"。
 *
 * @param props children 应用内容
 */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={SHOW_DELAY_MS}
      skipDelayDuration={SKIP_DELAY_MS}
      disableHoverableContent
    >
      {children}
    </TooltipPrimitive.Provider>
  );
}

export interface TooltipProps {
  /** 提示内容（空值时不包裹，直接渲染 children） */
  content?: ReactNode;
  /** 触发元素 */
  children: ReactNode;
  /** 弹出方位（默认下方） */
  side?: "top" | "bottom" | "left" | "right";
}

/**
 * 悬停提示组件
 *
 * @param props content 提示内容；side 弹出方位
 */
export function Tooltip({ content, children, side = "bottom" }: TooltipProps) {
  if (!content) return <>{children}</>;
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className="z-50 max-w-72 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs leading-relaxed text-popover-foreground shadow-md data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
