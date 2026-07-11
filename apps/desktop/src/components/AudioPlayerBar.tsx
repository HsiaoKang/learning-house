/**
 * 伴奏/音频播放条
 *
 * 位于主区与工具栏之间的横向控制条，播放当前课节的音频资源，
 * 多个音频时提供下拉切换；提供进度拖动、倍速、循环与音量控制，
 * 并把媒体事件转发给节拍器实现"跟随音频"联动。
 */
import { useEffect, useState, type RefObject } from "react";
import { Checkbox, IconButton, Select, Slider } from "@learning-house/ui";
import { mediaSrc } from "../lib/platform";
import { formatTime } from "../lib/format";
import type { MediaEngineControl } from "../hooks/useMetronome";
import type { LessonResource } from "../types";
import { RateSelect } from "./RateSelect";

interface AudioPlayerBarProps {
  /** 当前课节的音频资源列表（非空时才渲染本组件） */
  resources: LessonResource[];
  /** audio 元素引用（供外层查询播放进度） */
  audioRef: RefObject<HTMLAudioElement | null>;
  /** 节拍器联动控制接口（audio 源） */
  engineControl: MediaEngineControl;
}

/**
 * 音频播放条组件
 *
 * @param props 见 AudioPlayerBarProps 字段说明
 */
export function AudioPlayerBar(props: AudioPlayerBarProps) {
  const { resources, audioRef, engineControl } = props;
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [volume, setVolume] = useState(1);

  // 课节切换时回到第一个音频
  useEffect(() => {
    setActiveIndex(0);
    setPlaying(false);
    setRate(1);
  }, [resources]);

  const active = resources[Math.min(activeIndex, resources.length - 1)] ?? null;

  /**
   * 读取音频元素当前进度并执行回调（元素不存在时忽略）
   *
   * @param fn 拿到 (currentTime, playbackRate) 后的处理函数
   */
  const withAudio = (fn: (time: number, rate: number) => void) => {
    const el = audioRef.current;
    if (el) fn(el.currentTime, el.playbackRate);
  };

  /**
   * 播放/暂停切换
   */
  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };

  /**
   * 拖动进度条跳转到指定秒数
   *
   * @param time 目标时间（秒）
   */
  const seekTo = (time: number) => {
    const el = audioRef.current;
    if (el) el.currentTime = time;
  };

  /**
   * 修改倍速并同步到 audio 元素
   *
   * @param next 目标倍速
   */
  const changeRate = (next: number) => {
    setRate(next);
    const el = audioRef.current;
    if (el) el.playbackRate = next;
  };

  /**
   * 修改音量并同步到 audio 元素
   *
   * @param next 目标音量 0-1
   */
  const changeVolume = (next: number) => {
    setVolume(next);
    const el = audioRef.current;
    if (el) el.volume = next;
  };

  if (!active) return null;

  return (
    <div className="flex h-[46px] shrink-0 items-center gap-2 overflow-x-auto border-t border-border bg-secondary/60 px-3.5">
      <audio
        key={active.path}
        ref={audioRef}
        src={mediaSrc(active.path)}
        loop={loop}
        onPlay={() => {
          setPlaying(true);
          withAudio(engineControl.startSynced);
        }}
        onPause={() => {
          setPlaying(false);
          engineControl.stopFromMedia();
        }}
        onEnded={() => {
          setPlaying(false);
          engineControl.stopFromMedia();
        }}
        onSeeked={() => withAudio(engineControl.align)}
        onRateChange={() => withAudio(engineControl.align)}
        onTimeUpdate={() => {
          setCurrentTime(audioRef.current?.currentTime ?? 0);
          withAudio(engineControl.align);
        }}
        onLoadedMetadata={() => {
          setDuration(audioRef.current?.duration ?? 0);
          if (audioRef.current) audioRef.current.playbackRate = rate;
        }}
      />

      <span className="shrink-0 rounded border border-primary px-1.5 py-px text-xs font-semibold text-primary">
        音频
      </span>
      <IconButton name={playing ? "pause" : "play"} label={playing ? "暂停" : "播放"} onClick={togglePlay} />

      {resources.length > 1 && (
        <Select
          value={String(activeIndex)}
          onChange={(v) => setActiveIndex(Number(v))}
          options={resources.map((res, i) => ({ value: String(i), label: res.name }))}
          className="max-w-45"
          title="切换音频"
        />
      )}

      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatTime(currentTime)}</span>
      <Slider
        className="w-auto min-w-30 flex-1"
        min={0}
        max={duration || 0}
        step={0.01}
        value={currentTime}
        onChange={seekTo}
        aria-label="播放进度"
      />
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatTime(duration)}</span>

      <RateSelect value={rate} onChange={changeRate} />

      <Checkbox checked={loop} onChange={setLoop} label="循环" title="播放到结尾自动从头循环" />

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-muted-foreground">音量</span>
        <Slider min={0} max={1} step={0.05} value={volume} onChange={changeVolume} className="w-[90px]" aria-label="音量" />
      </div>

      {resources.length === 1 && (
        <span className="min-w-0 max-w-50 truncate text-xs text-muted-foreground" title={active.name}>
          {active.name}
        </span>
      )}
    </div>
  );
}
