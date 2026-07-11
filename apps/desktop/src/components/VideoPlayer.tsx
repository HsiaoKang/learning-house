/**
 * 课节视频播放器（自绘控制层）
 *
 * 内核为原生 video 元素，控制层自绘（播放/进度/时间/音量/倍速/全屏），
 * 三端观感一致。多个视频 tab 切换；封面通过"静音试播 -> 确认上屏 ->
 * 暂停回位"的事件驱动流程可靠渲染；续播采用 B 站式策略：超过阈值
 * 一律恢复并提示，限时可撤销回开头。
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { AnimatePresence, motion } from "motion/react";
import { ContextMenu, EmptyState, Icon, IconButton, Slider, Tabs, cn } from "@learning-house/ui";
import { IS_TAURI, mediaSrc } from "../lib/platform";
import { formatTime } from "../lib/format";
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
  const { resources, videoRef, getSavedPosition, onPositionSave } = props;
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
  /** 进入视频全屏前窗口是否已被用户全屏（退出时据此决定是否还原窗口） */
  const wasWindowFullscreenRef = useRef(false);
  /** 控制层可见性（鼠标空闲自动渐隐） */
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 鼠标悬停在控制栏上（悬停期间不自动隐藏） */
  const hoveringControlsRef = useRef(false);

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

  // 快捷键音量调整的反馈信号（自定义事件；程序性 volumechange 不触发浮层）
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onFlash = () => setVolumeFlash((n) => n + 1);
    el.addEventListener("app:volumeflash", onFlash);
    return () => el.removeEventListener("app:volumeflash", onFlash);
  }, [videoRef, active?.path]);

  // 组件卸载时终止封面流程与隐藏计时器
  useEffect(
    () => () => {
      coverCleanupRef.current?.();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    },
    [],
  );

  /**
   * 排一次控制层自动隐藏（2.5 秒空闲；悬停控制栏时顺延）
   */
  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (hoveringControlsRef.current) {
        scheduleHide();
        return;
      }
      setControlsVisible(false);
    }, 2500);
  }, []);

  /**
   * 显示控制层并重排空闲隐藏计时
   */
  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

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
   * 进入/退出视频全屏。
   * 关键节点：WKWebView 默认禁用元素全屏 API，改用 Tauri 窗口级全屏
   * （占满整个显示器）+ 视频容器应用内铺满的组合；以"视频全屏态"为准，
   * 窗口若已被用户全屏则保持不动，退出时只还原我们自己开启的窗口全屏
   */
  const toggleFullscreen = useCallback(async () => {
    const next = !fullscreen;
    if (IS_TAURI) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      if (next) {
        wasWindowFullscreenRef.current = await win.isFullscreen();
        if (!wasWindowFullscreenRef.current) {
          await win.setFullscreen(true);
        }
      } else if (!wasWindowFullscreenRef.current) {
        await win.setFullscreen(false);
      }
    } else {
      const container = containerRef.current;
      if (container) {
        if (next) void container.requestFullscreen();
        else if (document.fullscreenElement) void document.exitFullscreen();
      }
    }
    setFullscreen(next);
  }, [fullscreen]);

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
   * timeupdate 驱动：刷新控制层 + 节流保存续播位置
   */
  const handleTimeUpdate = () => {
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
          onMouseMove={showControls}
          onMouseLeave={() => {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            setControlsVisible(false);
          }}
          className={cn(
            "group relative flex min-h-0 flex-1 flex-col bg-stage",
            fullscreen && "fixed inset-0 z-50",
            !controlsVisible && "cursor-none",
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
              }
            }}
            onPlay={() => {
              if (coverHackRef.current) return;
              setPlaying(true);
              setResumeToast(null);
              showControls();
            }}
            onPause={() => {
              if (coverHackRef.current) return;
              setPlaying(false);
              showControls();
              // 暂停时立即落一次续播位置
              const el = videoRef.current;
              if (el && active) onPositionSave(active.path, el.currentTime);
            }}
            onEnded={() => {
              setPlaying(false);
            }}
            onSeeked={() => {
              // 快捷键/菜单快进退时唤起控制层，让进度变化可见
              showControls();
            }}
            onRateChange={() => {
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

          {/* 暂停态中央播放键（随控制层空闲渐隐） */}
          {!playing && (
            <button
              onClick={togglePlay}
              aria-label="播放"
              className={cn(
                "absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-[opacity,transform] duration-300 hover:scale-110",
                !controlsVisible && "pointer-events-none opacity-0",
              )}
            >
              <Icon name="play" size="lg" />
            </button>
          )}

          {/* 自绘控制栏：鼠标空闲 2.5s 渐隐，移动即现 */}
          <div
            onMouseEnter={() => (hoveringControlsRef.current = true)}
            onMouseLeave={() => (hoveringControlsRef.current = false)}
            className={cn(
              "absolute inset-x-0 bottom-0 flex items-center gap-2.5 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 text-white transition-opacity duration-300",
              !controlsVisible && "pointer-events-none opacity-0",
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
