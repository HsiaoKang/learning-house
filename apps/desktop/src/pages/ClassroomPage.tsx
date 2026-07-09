/**
 * 上课页
 *
 * 单个课程的学习界面：顶栏课节切换与完成标记，
 * 主区左视频右文档（可在设置中调换），音频播放条，底部工具栏。
 *
 * @author yuchenxi
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SplitPane } from "../components/SplitPane";
import { VideoPlayer } from "../components/VideoPlayer";
import { AudioPlayerBar } from "../components/AudioPlayerBar";
import { DocViewer } from "../components/DocViewer";
import { ToolBar } from "../components/ToolBar";
import { useMetronome } from "../hooks/useMetronome";
import {
  DEFAULT_TOOL_BY_COURSE_TYPE,
  isDocKind,
  type AppSettings,
  type Course,
  type ToolKind,
} from "../types";
import type { PlaybackPositions } from "../lib/storage";

interface ClassroomPageProps {
  course: Course;
  /** 返回课程库 */
  onBack: () => void;
  /** 课节完成状态变化（由外层持久化） */
  onLessonCompletedChange: (lessonId: string, completed: boolean) => void;
  /** 应用设置 */
  settings: AppSettings;
  /** 更新应用设置（由外层持久化） */
  onSettingsChange: (patch: Partial<AppSettings>) => void;
  /** 初始续播位置表 */
  playbackPositions: PlaybackPositions;
  /** 持久化某资源的续播位置 */
  onSavePosition: (path: string, position: number) => void;
}

/**
 * 上课页组件
 *
 * @param props 见 ClassroomPageProps 字段说明
 */
export function ClassroomPage(props: ClassroomPageProps) {
  const { course, onBack, onLessonCompletedChange, settings, onSettingsChange, playbackPositions, onSavePosition } = props;
  const [lessonIndex, setLessonIndex] = useState(0);
  const [tool, setTool] = useState<ToolKind>(DEFAULT_TOOL_BY_COURSE_TYPE[course.type]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const positionsRef = useRef<PlaybackPositions>(playbackPositions);
  const metronome = useMetronome();

  // 课程切换时重置课节与默认工具
  useEffect(() => {
    setLessonIndex(0);
    setTool(DEFAULT_TOOL_BY_COURSE_TYPE[course.type]);
  }, [course.id, course.type]);

  const lesson = course.lessons[Math.min(lessonIndex, course.lessons.length - 1)] ?? null;

  // 按区域拆分当前课节资源
  const videoResources = useMemo(() => lesson?.resources.filter((r) => r.kind === "video") ?? [], [lesson]);
  const audioResources = useMemo(() => lesson?.resources.filter((r) => r.kind === "audio") ?? [], [lesson]);
  const docResources = useMemo(() => lesson?.resources.filter((r) => isDocKind(r.kind)) ?? [], [lesson]);

  // 为视频与音频分别生成联动控制接口（只有选中的联动源会驱动节拍器）
  const videoControl = useMemo(() => metronome.bindSource("video"), [metronome.bindSource]);
  const audioControl = useMemo(() => metronome.bindSource("audio"), [metronome.bindSource]);

  /**
   * 查询资源续播位置
   */
  const getSavedPosition = useCallback((path: string) => positionsRef.current[path] ?? 0, []);

  /**
   * 保存资源续播位置（内存即时更新 + 外层持久化）
   */
  const savePosition = useCallback(
    (path: string, position: number) => {
      positionsRef.current[path] = position;
      onSavePosition(path, position);
    },
    [onSavePosition],
  );

  /**
   * 读取当前联动源媒体的播放位置（秒），无联动源时返回 null
   */
  const getMediaTime = useCallback(() => {
    if (metronome.sync.source === "video") return videoRef.current?.currentTime ?? null;
    if (metronome.sync.source === "audio") return audioRef.current?.currentTime ?? null;
    return null;
  }, [metronome.sync.source]);

  /**
   * 切换到相邻课节
   *
   * @param delta 偏移量（-1 上一节 / +1 下一节）
   */
  const stepLesson = (delta: number) => {
    setLessonIndex((i) => Math.min(course.lessons.length - 1, Math.max(0, i + delta)));
  };

  if (!lesson) {
    return (
      <div className="app-shell">
        <header className="top-bar">
          <button className="btn btn-ghost" onClick={onBack}>
            ← 返回
          </button>
          <span className="panel-title">{course.name}</span>
        </header>
        <div className="panel-empty">该课程没有课节，请在课程库重新扫描或检查文件夹内容。</div>
      </div>
    );
  }

  const videoPane = (
    <VideoPlayer
      resources={videoResources}
      videoRef={videoRef}
      engineControl={videoControl}
      getSavedPosition={getSavedPosition}
      onPositionSave={savePosition}
    />
  );
  const docPane = <DocViewer resources={docResources} />;

  return (
    <div className="app-shell">
      <header className="top-bar classroom-bar">
        <div className="classroom-left">
          <button className="btn btn-ghost" onClick={onBack} title="返回课程库">
            ←
          </button>
          <span className="course-title" title={course.name}>
            {course.name}
          </span>
        </div>

        <div className="lesson-switcher">
          <button className="btn btn-ghost" disabled={lessonIndex === 0} onClick={() => stepLesson(-1)}>
            上一节
          </button>
          <select value={lessonIndex} onChange={(e) => setLessonIndex(Number(e.target.value))}>
            {course.lessons.map((l, i) => (
              <option key={l.id} value={i}>
                {`${i + 1}. ${l.name}${l.completed ? " ✓" : ""}`}
              </option>
            ))}
          </select>
          <button
            className="btn btn-ghost"
            disabled={lessonIndex >= course.lessons.length - 1}
            onClick={() => stepLesson(1)}
          >
            下一节
          </button>
        </div>

        <div className="classroom-right">
          <label className="metro-check" title="标记本课节的学习进度">
            <input
              type="checkbox"
              checked={lesson.completed}
              onChange={(e) => onLessonCompletedChange(lesson.id, e.target.checked)}
            />
            已完成
          </label>
          <button
            className="btn btn-ghost"
            onClick={() => onSettingsChange({ swapPanes: !settings.swapPanes })}
            title="交换左右区域"
          >
            ⇄ 布局
          </button>
        </div>
      </header>

      <main className="main-area">
        <SplitPane
          left={settings.swapPanes ? docPane : videoPane}
          right={settings.swapPanes ? videoPane : docPane}
        />
      </main>

      <AudioPlayerBar resources={audioResources} audioRef={audioRef} engineControl={audioControl} />

      <ToolBar
        tool={tool}
        onToolChange={setTool}
        metronome={{
          options: metronome.options,
          updateOptions: metronome.updateOptions,
          running: metronome.running,
          toggle: metronome.toggle,
          activeBeat: metronome.activeBeat,
          sync: metronome.sync,
          setSync: metronome.setSync,
          hasVideo: videoResources.length > 0,
          hasAudio: audioResources.length > 0,
          getMediaTime,
        }}
      />
    </div>
  );
}
