/**
 * 节拍器核心类型定义
 */

/** 节拍器运行模式 */
export type MetronomeMode = "free" | "sync";

/** 单拍强弱等级：0 静音 / 1 弱 / 2 次强 / 3 强 */
export type BeatLevel = 0 | 1 | 2 | 3;

/** 节拍事件：调度器每打一拍都会向 UI 层广播一次 */
export interface BeatEvent {
  /** 小节内拍序号（0 开始） */
  beatInBar: number;
  /** 该拍的强弱等级 */
  level: BeatLevel;
  /** 该拍对应的 AudioContext 时间（秒） */
  time: number;
}

/** 节拍器可调参数 */
export interface MetronomeOptions {
  /** 每分钟拍数，范围 20 - 300 */
  bpm: number;
  /** 拍号分子：每小节拍数（4/4 拍即 4） */
  beatsPerBar: number;
  /** 每拍强弱型（长度应等于 beatsPerBar，缺省拍按弱拍处理） */
  beatLevels: BeatLevel[];
  /** 音量 0 - 1 */
  volume: number;
}

/**
 * 拍号对应的音乐标准强弱型
 * （2/4 强-弱；3/4 强-弱-弱；4/4 强-弱-次强-弱；6 拍 强-弱-弱-次强-弱-弱）
 *
 * @param beatsPerBar 每小节拍数
 * @returns 各拍强弱等级
 */
export function defaultBeatLevels(beatsPerBar: number): BeatLevel[] {
  switch (beatsPerBar) {
    case 2:
      return [3, 1];
    case 3:
      return [3, 1, 1];
    case 4:
      return [3, 1, 2, 1];
    case 6:
      return [3, 1, 1, 2, 1, 1];
    default:
      return Array.from({ length: beatsPerBar }, (_, i) => (i === 0 ? 3 : 1));
  }
}

/** 联动模式的时间轴对齐参数（把拍点锚定到视频时间轴上） */
export interface TimelineAlignment {
  /** 当前媒体时间（秒），即 video.currentTime */
  mediaTime: number;
  /** 媒体播放速率，即 video.playbackRate */
  playbackRate: number;
  /** 视频时间轴上第一拍出现的时刻（秒），用于对齐小节 */
  firstBeatOffset: number;
}
