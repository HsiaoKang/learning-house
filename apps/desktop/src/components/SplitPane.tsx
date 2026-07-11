/**
 * 左右分割布局
 *
 * 中间分隔条可拖拽调整左右面板宽度比例。
 * 性能策略（针对 PDF 全量重画 / 乐谱整谱重排等昂贵内容）：
 * - 拖动中用 rAF 合帧直改 DOM flexBasis，零 React 重渲染
 * - 拖动期间锁定两侧内容层的像素宽度（容器裁切显示），
 *   ResizeObserver 不触发，昂贵重排只在松手后发生一次
 */
import { useCallback, useRef, useState, type ReactNode } from "react";

interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  /** 左面板初始占比（0-1） */
  initialRatio?: number;
}

/** 拖动占比范围 */
const MIN_RATIO = 0.2;
const MAX_RATIO = 0.8;

/**
 * 可拖拽分割面板组件
 *
 * @param props left/right 两侧内容；initialRatio 左侧初始占比
 */
export function SplitPane({ left, right, initialRatio = 0.55 }: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leftPaneRef = useRef<HTMLDivElement | null>(null);
  const leftInnerRef = useRef<HTMLDivElement | null>(null);
  const rightInnerRef = useRef<HTMLDivElement | null>(null);
  const [ratio, setRatio] = useState(initialRatio);
  const [dragging, setDragging] = useState(false);

  /**
   * 按下分隔条：锁定内容宽度 -> rAF 直改容器占比 -> 松手解锁并提交
   */
  const onDividerPointerDown = useCallback((e: React.PointerEvent) => {
    const container = containerRef.current;
    const leftPane = leftPaneRef.current;
    const leftInner = leftInnerRef.current;
    const rightInner = rightInnerRef.current;
    if (!container || !leftPane || !leftInner || !rightInner) return;
    const rect = container.getBoundingClientRect();
    let latest = (e.clientX - rect.left) / rect.width;
    let frame = 0;
    setDragging(true);

    // 关键节点：锁定内容层像素宽，拖动中容器变化不触发内容重排
    leftInner.style.width = `${leftInner.offsetWidth}px`;
    rightInner.style.width = `${rightInner.offsetWidth}px`;

    const apply = () => {
      frame = 0;
      leftPane.style.flexBasis = `${latest * 100}%`;
    };
    const move = (ev: PointerEvent) => {
      latest = Math.min(MAX_RATIO, Math.max(MIN_RATIO, (ev.clientX - rect.left) / rect.width));
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (frame) cancelAnimationFrame(frame);
      apply();
      // 解锁内容宽度，昂贵重排在此刻一次性发生
      leftInner.style.width = "";
      rightInner.style.width = "";
      setDragging(false);
      setRatio(latest);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    e.preventDefault();
  }, []);

  return (
    <div className="flex h-full" ref={containerRef} style={dragging ? { cursor: "col-resize" } : undefined}>
      <div
        ref={leftPaneRef}
        className="min-w-0 shrink-0 overflow-hidden"
        style={{ flexBasis: `${ratio * 100}%`, pointerEvents: dragging ? "none" : undefined }}
      >
        <div ref={leftInnerRef} className="h-full">
          {left}
        </div>
      </div>
      <div
        className="w-[5px] shrink-0 cursor-col-resize bg-border transition-colors hover:bg-primary"
        onPointerDown={onDividerPointerDown}
      />
      <div
        className="min-w-0 flex-1 overflow-hidden"
        style={{ pointerEvents: dragging ? "none" : undefined }}
      >
        <div ref={rightInnerRef} className="h-full">
          {right}
        </div>
      </div>
    </div>
  );
}
