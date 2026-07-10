/**
 * 媒体快捷键 Hook
 *
 * 空格：播放/暂停；← →：快退/快进 5 秒；↑ ↓：音量增减。
 * 输入控件聚焦或有浮窗（dialog）打开时不拦截，避免与
 * Tap Tempo 空格击打、文本输入冲突。
 */
import { useEffect, type RefObject } from "react";

/** 单次快进/快退步长（秒） */
const SEEK_STEP_SEC = 5;
/** 单次音量步长 */
const VOLUME_STEP = 0.1;

/**
 * 为媒体元素绑定全局键盘快捷键
 *
 * @param mediaRef 目标媒体元素（视频优先，无视频时可传音频）
 */
export function useMediaShortcuts(mediaRef: RefObject<HTMLVideoElement | HTMLAudioElement | null>): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const media = mediaRef.current;
      if (!media) return;
      // 关键节点：输入控件聚焦或浮窗打开时让位
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (document.querySelector("[role='dialog']")) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (media.paused) void media.play();
          else media.pause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          media.currentTime = Math.max(0, media.currentTime - SEEK_STEP_SEC);
          break;
        case "ArrowRight":
          e.preventDefault();
          media.currentTime = Math.min(media.duration || Infinity, media.currentTime + SEEK_STEP_SEC);
          break;
        case "ArrowUp":
          e.preventDefault();
          media.volume = Math.min(1, media.volume + VOLUME_STEP);
          break;
        case "ArrowDown":
          e.preventDefault();
          media.volume = Math.max(0, media.volume - VOLUME_STEP);
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mediaRef]);
}
