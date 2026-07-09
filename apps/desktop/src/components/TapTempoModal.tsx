/**
 * Tap Tempo 浮窗
 *
 * 点击 TAP 后弹出的浮层：通过鼠标点击大按钮或敲击空格键打拍，
 * 实时计算并显示 BPM（取最近 8 次间隔平均，超过 2 秒未击打自动重新计数），
 * 可一键把结果应用到节拍器。
 *
 * @author yuchenxi
 */
import { useCallback, useEffect, useRef, useState } from "react";

/** 判定重新计数的静默间隔（毫秒） */
const RESET_GAP_MS = 2000;
/** 参与平均的最近击打数 */
const MAX_TAPS = 8;

interface TapTempoModalProps {
  /** 是否显示浮窗 */
  open: boolean;
  /** 关闭浮窗 */
  onClose: () => void;
  /** 应用计算出的 BPM 到节拍器 */
  onApply: (bpm: number) => void;
}

/**
 * Tap Tempo 浮窗组件
 *
 * @param props 见 TapTempoModalProps 字段说明
 */
export function TapTempoModal({ open, onClose, onApply }: TapTempoModalProps) {
  const tapsRef = useRef<number[]>([]);
  const [bpm, setBpm] = useState<number | null>(null);
  const [tapCount, setTapCount] = useState(0);
  const [flash, setFlash] = useState(false);

  /**
   * 记录一次击打并实时更新 BPM
   */
  const tap = useCallback(() => {
    const now = performance.now();
    const taps = tapsRef.current;
    if (taps.length > 0 && now - taps[taps.length - 1] > RESET_GAP_MS) {
      taps.length = 0;
    }
    taps.push(now);
    if (taps.length > MAX_TAPS) taps.shift();
    setTapCount(taps.length);
    if (taps.length >= 2) {
      const avgMs = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
      setBpm(Math.round(Math.min(300, Math.max(20, 60000 / avgMs))));
    }
    // 击打视觉反馈
    setFlash(true);
    setTimeout(() => setFlash(false), 80);
  }, []);

  /**
   * 清空击打记录重新开始
   */
  const reset = useCallback(() => {
    tapsRef.current = [];
    setBpm(null);
    setTapCount(0);
  }, []);

  // 浮窗打开期间监听空格键打拍、Esc 关闭；关闭时清空记录
  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) tap();
      } else if (e.code === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, tap, reset, onClose]);

  if (!open) return null;

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="tap-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tap-modal-header">
          <span>Tap Tempo</span>
          <button className="btn btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="tap-bpm-display">
          {bpm !== null ? (
            <>
              <span className="tap-bpm-value">{bpm}</span>
              <span className="tap-bpm-unit">BPM</span>
            </>
          ) : (
            <span className="tap-bpm-hint">连续击打测速</span>
          )}
        </div>

        <button className={`tap-pad ${flash ? "flash" : ""}`} onClick={tap}>
          点击 或 敲空格
        </button>

        <div className="tap-modal-footer">
          <span className="tap-count">{tapCount > 0 ? `已击打 ${tapCount} 次` : "\u00a0"}</span>
          <div className="tap-actions">
            <button className="btn btn-ghost" onClick={reset}>
              重来
            </button>
            <button
              className="btn btn-primary"
              disabled={bpm === null}
              onClick={() => {
                if (bpm !== null) {
                  onApply(bpm);
                  onClose();
                }
              }}
            >
              应用到节拍器
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
