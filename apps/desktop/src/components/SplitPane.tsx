/**
 * 左右分割布局
 *
 * 中间分隔条可拖拽调整左右面板宽度比例。
 * 性能：拖动过程中直接改写 DOM 的 flexBasis（零 React 重渲染），
 * 松手时才提交 state；拖动期间屏蔽两侧面板的指针事件，
 * 避免 video/iframe 抢占指针与 hover 计算开销。
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
  const [ratio, setRatio] = useState(initialRatio);
  const [dragging, setDragging] = useState(false);

  /**
   * 按下分隔条：拖动中用 rAF 节流直改 DOM，松手提交 state
   */
  const onDividerPointerDown = useCallback((e: React.PointerEvent) => {
    const container = containerRef.current;
    const leftPane = leftPaneRef.current;
    if (!container || !leftPane) return;
    const rect = container.getBoundingClientRect();
    let latest = 0;
    let frame = 0;
    setDragging(true);

    const apply = () => {
      frame = 0;
      leftPane.style.flexBasis = `${latest * 100}%`;
    };
    const move = (ev: PointerEvent) => {
      latest = Math.min(MAX_RATIO, Math.max(MIN_RATIO, (ev.clientX - rect.left) / rect.width));
      // 关键节点：rAF 合帧，避免高频 pointermove 逐条布局
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (frame) cancelAnimationFrame(frame);
      apply();
      setDragging(false);
      setRatio(latest);
    };
    latest = (e.clientX - rect.left) / rect.width;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    e.preventDefault();
  }, []);

  return (
    <div className="flex h-full" ref={containerRef} style={dragging ? { cursor: "col-resize" } : undefined}>
      <div
        ref={leftPaneRef}
        className="min-w-0 shrink-0"
        style={{ flexBasis: `${ratio * 100}%`, pointerEvents: dragging ? "none" : undefined }}
      >
        {left}
      </div>
      <div
        className="w-[5px] shrink-0 cursor-col-resize bg-border transition-colors hover:bg-primary"
        onPointerDown={onDividerPointerDown}
      />
      <div className="min-w-0 flex-1" style={{ pointerEvents: dragging ? "none" : undefined }}>
        {right}
      </div>
    </div>
  );
}
