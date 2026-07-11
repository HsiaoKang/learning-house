/**
 * 数字步进输入（自绘加减按钮）
 *
 * 替代原生 number input：WebKit 的内建上下箭头点击区域过小，
 * 这里提供明确的 [-] [值] [+] 一体化控件，加减按钮支持长按连发，
 * 输入框失焦/回车时统一校验提交。
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { Icon } from "./icon";

export interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** 步进量（默认 1，支持小数如 0.1） */
  step?: number;
  /** 输入框宽度类（默认 w-12） */
  inputClassName?: string;
  className?: string;
  title?: string;
  "aria-label"?: string;
}

/** 长按触发连发前的等待毫秒 */
const HOLD_DELAY_MS = 400;

/** 连发间隔毫秒 */
const HOLD_INTERVAL_MS = 60;

/**
 * 数字步进输入组件
 *
 * @param props value/onChange 受控值；min/max/step 约束与步进
 */
export function NumberStepper(props: NumberStepperProps) {
  const {
    value,
    onChange,
    min = Number.MIN_SAFE_INTEGER,
    max = Number.MAX_SAFE_INTEGER,
    step = 1,
    inputClassName = "w-12",
    className,
    title,
    "aria-label": ariaLabel,
  } = props;
  /** 输入中的草稿文本（null 表示未在编辑，显示受控值） */
  const [draft, setDraft] = useState<string | null>(null);
  /** 最新值引用：长按连发的定时器闭包从这里取值，避免拿到过期值 */
  const valueRef = useRef(value);
  const holdRef = useRef<{ delay: number; repeat: number } | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // 卸载时清理长按定时器
  useEffect(() => stopHold, []);

  /** step 的小数位数（用于修正浮点步进误差） */
  const decimals = String(step).split(".")[1]?.length ?? 0;

  /** 约束并按步进精度取整 */
  const normalize = (raw: number): number => {
    const clamped = Math.min(max, Math.max(min, raw));
    return Number(clamped.toFixed(decimals));
  };

  /** 提交一个新值（相同值跳过） */
  const commitValue = (raw: number) => {
    const next = normalize(raw);
    if (next !== valueRef.current) {
      valueRef.current = next;
      onChange(next);
    }
  };

  /** 步进一次 */
  const stepOnce = (dir: 1 | -1) => commitValue(valueRef.current + dir * step);

  /** 按下加/减：立即步进一次，按住超过阈值后连发 */
  const startHold = (dir: 1 | -1) => {
    stepOnce(dir);
    const delay = window.setTimeout(() => {
      const repeat = window.setInterval(() => stepOnce(dir), HOLD_INTERVAL_MS);
      holdRef.current = { delay, repeat };
    }, HOLD_DELAY_MS);
    holdRef.current = { delay, repeat: 0 };
  };

  /** 松开/移出时停止连发 */
  function stopHold() {
    if (!holdRef.current) return;
    window.clearTimeout(holdRef.current.delay);
    window.clearInterval(holdRef.current.repeat);
    holdRef.current = null;
  }

  /** 输入框提交（失焦/回车）：非法输入回退为当前值 */
  const commitDraft = () => {
    if (draft === null) return;
    const n = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(n)) commitValue(n);
    setDraft(null);
  };

  /** 加减按钮公共样式 */
  const buttonClass =
    "flex h-full w-7 shrink-0 cursor-pointer select-none items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-35";

  return (
    <div
      title={title}
      className={cn(
        // 仅输入框自身聚焦时显示轮廓，点击加减按钮不触发（避免常驻聚焦框）
        "inline-flex h-8 items-stretch overflow-hidden rounded-md border border-border bg-secondary/60 has-[input:focus]:outline-2 has-[input:focus]:outline-ring",
        className,
      )}
    >
      <button
        type="button"
        aria-label="减少"
        disabled={value <= min}
        onPointerDown={() => startHold(-1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        className={cn(buttonClass, "border-r border-border/60")}
      >
        <Icon name="minus" size="sm" />
      </button>
      <input
        type="text"
        inputMode="decimal"
        value={draft ?? String(value)}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitDraft();
          else if (e.key === "ArrowUp") {
            e.preventDefault();
            stepOnce(1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            stepOnce(-1);
          }
        }}
        className={cn(
          "min-w-0 border-0 bg-transparent text-center text-[13px] tabular-nums text-foreground focus:outline-none",
          inputClassName,
        )}
      />
      <button
        type="button"
        aria-label="增加"
        disabled={value >= max}
        onPointerDown={() => startHold(1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        className={cn(buttonClass, "border-l border-border/60")}
      >
        <Icon name="plus" size="sm" />
      </button>
    </div>
  );
}
