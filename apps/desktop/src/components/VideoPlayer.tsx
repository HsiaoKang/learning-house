/**
 * 课节视频播放器（自绘控制层）
 *
 * 内核为原生 video 元素，控制层自绘（播放/进度/时间/音量/倍速/全屏），
 * 三端观感一致。多个视频 tab 切换；封面通过"静音试播 -> 确认上屏 ->
 * 暂停回位"的事件驱动流程可靠渲染；续播采用 B 站式策略：超过阈值
 * 一律恢复并提示，限时可撤销回开头。媒体事件转发给节拍器联动。
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { AnimatePresence, motion } from "motion/react";
import { ContextMenu, EmptyState, Icon, IconButton, Slider, Tabs, cn } from "@learning-house/ui";
import { IS_TAURI, mediaSrc } from "../lib/platform";
import { formatTime } from "../lib/format";
import type { MediaEngineControl } from "../hooks/useMetronome";
import type { LessonResource } from "../types";
import { RateSelect } from "./RateSelect";
import { VolumeControl } from "./VolumeControl";

/** 续播位置保存节流间隔（毫秒） */
const POSITION_SAVE_INTERVAL_MS = 3000;
/** 触发续播恢复的最小进度（秒） */
const RESUME_MIN_SEC = 3;
/** 续播提示自动消失时间（毫秒） */
const RESUME_TOAST_MS = 5000;

/** 右键菜单项 */
const VIDEO_MENU_ITEMS = [
  { key: "toggle", label: "播放 / 暂停", icon: "play" as const },
  { key: "back30", label: "后退 30 秒", icon: "back" as const },
  { key: "fwd30", label: "前进 30 秒", icon: "chevronRight" as const },
  { key: "sep", label: "", separator: true },
  { key: "mute", label: "静音 / 取消静音", icon: "volumeMute" as const },
];

interface VideoPlayerProps {
  /** 当前课节的视频资源列表（可为空） */
  resources: LessonResource[];
  /** 视频元素引用（供外层查询播放状态与快捷键控制） */
  videoRef: RefObject<HTMLVideoElement | null>;
  /** 节拍器联动控制接口（video 源） */
  engineControl: MediaEngineControl;
  /** 查询资源的续播位置（秒），无记录返回 0 */
  getSavedPosition: (path: string) => number;
  /** 播放位置变化回调（已节流），用于持久化续播 */
  onPositionSave: (path: string, position: number) => void;
}

/**
 * 视频播放区组件
 *
 * @param props 见 VideoPlayerProps 字段说明
 */
export function VideoPlayer(props: VideoPlayerProps) {
  const { resources, videoRef, engineControl, getSavedPosition, onPositionSave } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const lastSaveRef = useRef(0);

  // 自绘控制层状态
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  /** 音量变化信号（递增），驱动音量浮层的视觉反馈 */
  const [volumeFlash, setVolumeFlash] = useState(0);
  /** 续播提示（恢复到的秒数），null 表示不显示 */
  const [resumeToast, setResumeToast] = useState<number | null>(null);

  /** 封面渲染流程进行中（期间的 play/pause 事件不外发） */
  const coverHackRef = useRef(false);
  /** 取消进行中的封面渲染流程 */
  const coverCleanupRef = useRef<(() => void) | null>(null);
  /** 全屏态（Tauri 窗口全屏 + 视频容器应用内铺满） */
  const [fullscreen, setFullscreen] = useState(false);

  // 课节切换（资源列表变化）时回到第一个视频并复位控制层
  useEffect(() => {
    setActiveIndex(0);
  }, [resources]);

  const active = resources[Math.min(activeIndex, resources.length - 1)] ?? null;

  // 切换视频源：复位控制层状态，清理未完成的封面流程与续播提示
  useEffect(() => {
    coverCleanupRef.current?.();
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setRate(1);
    setResumeToast(null);
  }, [active?.path]);

  // 续播提示限时消失
  useEffect(() => {
    if (resumeToast === null) return;
    const timer = setTimeout(() => setResumeToast(null), RESUME_TOAST_MS);
    return () => clearTimeout(timer);
  }, [resumeToast]);

  // 组件卸载时终止封面流程
  useEffect(() => () => coverCleanupRef.current?.(), []);

  /**
   * 读取视频元素当前进度并执行回调（元素不存在时忽略）
   *
   * @param fn 拿到 (currentTime, playbackRate) 后的处理函数
   */
  const withVideo = (fn: (time: number, rate: number) => void) => {
    const el = videoRef.current;
    if (el) fn(el.currentTime, el.playbackRate);
  };

  /**
   * 封面渲染：静音试播，等 playing 事件确认画面上屏后暂停并回位。
   * 关键节点：WKWebView 不渲染未播放视频的画面帧，必须真实播放一瞬；
   * 事件驱动 + 超时兜底 + 可取消，杜绝"暂停丢失导致自动播放"的时序缝隙
   *
   * @param el 视频元素
   * @param target 渲染完成后停靠的位置（秒）
   */
  const renderCover = useCallback((el: HTMLVideoElement, target: number) => {
    coverHackRef.current = true;
    const wasMuted = el.muted;
    el.muted = true;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      el.pause();
      el.muted = wasMuted;
      if (Math.abs(el.currentTime - target) > 0.5) {
        el.currentTime = target;
      }
      coverHackRef.current = false;
      coverCleanupRef.current = null;
    };
    const onPlaying = () => requestAnimationFrame(finish);
    el.addEventListener("playing", onPlaying, { once: true });
    const timer = setTimeout(finish, 1500);

    coverCleanupRef.current = () => {
      finished = true;
      el.removeEventListener("playing", onPlaying);
      clearTimeout(timer);
      el.muted = wasMuted;
      coverHackRef.current = false;
      coverCleanupRef.current = null;
    };
    el.play().catch(finish);
  }, []);

  /**
   * 首帧数据就绪：按统一策略恢复续播（B 站式：达到阈值一律恢复并提示），
   * 然后走封面渲染流程
   */
  const handleLoadedData = () => {
    const el = videoRef.current;
    if (!el || !active) return;
    setDuration(el.duration || 0);
    el.playbackRate = rate;
    const saved = getSavedPosition(active.path);
    let target = 0;
    if (saved >= RESUME_MIN_SEC && saved < el.duration - 5) {
      target = saved;
      el.currentTime = saved;
      setCurrentTime(saved);
      setResumeToast(saved);
    }
    renderCover(el, target);
  };

  /**
   * 续播提示中的"从头播放"：回到开头并清除已存进度
   */
  const restartFromBeginning = () => {
    const el = videoRef.current;
    if (el) el.currentTime = 0;
    setResumeToast(null);
    if (active) onPositionSave(active.path, 0);
  };

  /**
   * 播放/暂停切换
   */
  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    coverCleanupRef.current?.();
    if (el.paused) void el.play();
    else el.pause();
  };

  /**
   * 进入/退出全屏。
   * 关键节点：WKWebView 默认禁用元素全屏 API，改用 Tauri 窗口级全屏
   * （占满整个显示器）+ 视频容器应用内铺满的组合；浏览器环境降级为元素全屏
   */
  const toggleFullscreen = useCallback(async () => {
    if (IS_TAURI) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      const next = !(await win.isFullscreen());
      await win.setFullscreen(next);
      setFullscreen(next);
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      setFullscreen(false);
    } else {
      void container.requestFullscreen();
      setFullscreen(true);
    }
  }, []);

  // 全屏时 Esc 退出
  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") void toggleFullscreen();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen, toggleFullscreen]);

  /**
   * timeupdate 驱动：刷新控制层 + 节流保存续播位置 + 节拍器对齐
   */
  const handleTimeUpdate = () => {
    withVideo(engineControl.align);
    const el = videoRef.current;
    if (!el || !active) return;
    setCurrentTime(el.currentTime);
    const now = Date.now();
    if (now - lastSaveRef.current >= POSITION_SAVE_INTERVAL_MS && !el.paused && !coverHackRef.current) {
      lastSaveRef.current = now;
      onPositionSave(active.path, el.currentTime);
    }
  };

  /**
   * 处理右键菜单动作
   *
   * @param key 菜单项标识
   */
  const handleMenu = (key: string) => {
    const el = videoRef.current;
    if (!el) return;
    if (key === "toggle") togglePlay();
    else if (key === "back30") el.currentTime = Math.max(0, el.currentTime - 30);
    else if (key === "fwd30") el.currentTime = Math.min(el.duration || Infinity, el.currentTime + 30);
    else if (key === "mute") {
      el.muted = !el.muted;
      setMuted(el.muted);
    }
  };

  if (!active) {
    return <EmptyState icon="video" title="本课节没有视频资源" />;
  }

  return (
    <div className="flex h-full flex-col">
      {resources.length > 1 && (
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-card px-2">
          <Tabs
            items={resources.map((res) => ({ key: res.path, label: res.name }))}
            activeKey={active.path}
            onChange={(key) => setActiveIndex(resources.findIndex((r) => r.path === key))}
          />
        </div>
      )}
      <ContextMenu items={VIDEO_MENU_ITEMS} onSelect={handleMenu}>
        <div
          ref={containerRef}
          className={cn(
            "group relative flex min-h-0 flex-1 flex-col bg-stage",
            fullscreen && "fixed inset-0 z-50",
          )}
        >
          <video
            key={active.path}
            ref={videoRef}
            className="min-h-0 w-full flex-1 object-contain"
            src={mediaSrc(active.path)}
            playsInline
            preload="auto"
            onClick={togglePlay}
            onDoubleClick={() => void toggleFullscreen()}
            onLoadedData={handleLoadedData}
            onDurationChange={() => setDuration(videoRef.current?.duration ?? 0)}
            onVolumeChange={() => {
              const el = videoRef.current;
              if (el && !coverHackRef.current) {
                setVolume(el.volume);
                setMuted(el.muted);
                setVolumeFlash((n) => n + 1);
              }
            }}
            onPlay={() => {
              if (coverHackRef.current) return;
              setPlaying(true);
              setResumeToast(null);
              withVideo(engineControl.startSynced);
            }}
            onPause={() => {
              if (coverHackRef.current) return;
              setPlaying(false);
              engineControl.stopFromMedia();
              // 暂停时立即落一次续播位置
              const el = videoRef.current;
              if (el && active) onPositionSave(active.path, el.currentTime);
            }}
            onEnded={() => {
              setPlaying(false);
              engineControl.stopFromMedia();
            }}
            onSeeked={() => withVideo(engineControl.align)}
            onRateChange={() => {
              withVideo(engineControl.align);
              setRate(videoRef.current?.playbackRate ?? 1);
            }}
            onTimeUpdate={handleTimeUpdate}
          />

          {/* 续播提示（B 站式限时撤销） */}
          <AnimatePresence>
            {resumeToast !== null && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-black/75 px-3 py-1.5 text-xs text-white backdrop-blur"
              >
                已定位到 {formatTime(resumeToast)}
                <button className="font-semibold text-primary hover:underline" onClick={restartFromBeginning}>
                  从头播放
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 暂停态中央播放键 */}
          {!playing && (
            <button
              onClick={togglePlay}
              aria-label="播放"
              className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-transform hover:scale-110"
            >
              <Icon name="play" size="lg" />
            </button>
          )}

          {/* 自绘控制栏：暂停常显，播放中 hover 显示 */}
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 flex items-center gap-2.5 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 text-white transition-opacity",
              playing && "opacity-0 group-hover:opacity-100",
            )}
          >
            <IconButton
              name={playing ? "pause" : "play"}
              label={playing ? "暂停" : "播放"}
              size="sm"
              className="text-white hover:bg-white/15 hover:text-white"
              onClick={togglePlay}
            />
            <span className="shrink-0 text-xs tabular-nums text-white/85">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <Slider
              className="w-auto min-w-24 flex-1"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={(t) => {
                const el = videoRef.current;
                if (el) el.currentTime = t;
                setCurrentTime(t);
              }}
              aria-label="播放进度"
            />
            <RateSelect onDark value={rate} onChange={(r) => videoRef.current && (videoRef.current.playbackRate = r)} />
            <VolumeControl
              onDark
              volume={volume}
              muted={muted}
              flashSignal={volumeFlash}
              onVolumeChange={(v) => {
                const el = videoRef.current;
                if (el) {
                  el.volume = v;
                  el.muted = v === 0;
                }
              }}
              onToggleMute={() => {
                const el = videoRef.current;
                if (el) el.muted = !el.muted;
              }}
            />
            <IconButton
              name="fullscreen"
              label={fullscreen ? "退出全屏" : "全屏"}
              size="sm"
              className="text-white hover:bg-white/15 hover:text-white"
              onClick={() => void toggleFullscreen()}
            />
          </div>
        </div>
      </ContextMenu>
    </div>
  );
}
