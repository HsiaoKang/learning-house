/**
 * Learning House 应用根组件
 *
 * 负责视图路由（课程库 / 上课页）、课程库与设置的加载持久化、
 * 主题 class 挂载与切换。
 *
 * @author yuchenxi
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { darkThemeClass, IconButton, lightThemeClass } from "@learning-house/ui";
import { LibraryPage } from "./pages/LibraryPage";
import { ClassroomPage } from "./pages/ClassroomPage";
import { scanCourseFolder } from "./lib/scanner";
import {
  DEFAULT_SETTINGS,
  loadCourses,
  loadPlaybackPositions,
  loadSettings,
  saveCourses,
  savePlaybackPosition,
  saveSettings,
  type PlaybackPositions,
} from "./lib/storage";
import type { AppSettings, Course, CourseType } from "./types";
import { appLoading } from "./styles/layout.css";

/** 主题标识到 vanilla-extract 主题 class 的映射 */
const THEME_CLASSES: Record<AppSettings["theme"], string> = {
  dark: darkThemeClass,
  light: lightThemeClass,
};

function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const positionsRef = useRef<PlaybackPositions>({});

  // 启动时加载课程库、设置与续播位置
  useEffect(() => {
    void Promise.all([loadCourses(), loadSettings(), loadPlaybackPositions()]).then(
      ([storedCourses, storedSettings, positions]) => {
        setCourses(storedCourses);
        // 旧版本设置缺省字段用默认值补齐
        setSettings({ ...DEFAULT_SETTINGS, ...storedSettings });
        positionsRef.current = positions;
        setLoaded(true);
      },
    );
  }, []);

  // 关键节点：把当前主题 class 挂到根元素，token 变量随之切换
  useEffect(() => {
    const el = document.documentElement;
    el.classList.remove(...Object.values(THEME_CLASSES));
    el.classList.add(THEME_CLASSES[settings.theme]);
  }, [settings.theme]);

  /**
   * 更新课程库并持久化
   *
   * @param updater 基于当前课程列表计算新列表
   */
  const updateCourses = useCallback((updater: (prev: Course[]) => Course[]) => {
    setCourses((prev) => {
      const next = updater(prev);
      void saveCourses(next);
      return next;
    });
  }, []);

  /**
   * 从文件夹导入课程：弹目录选择器 -> 扫描 -> 加入课程库
   *
   * @param type 课程类型
   */
  const importFolder = useCallback(
    async (type: CourseType) => {
      const selected = await open({ directory: true, multiple: false, title: "选择课程根文件夹" });
      if (typeof selected !== "string") return;
      const course = await scanCourseFolder(selected, type);
      if (course.lessons.length === 0) {
        alert("该文件夹内没有识别到可用资源（视频/音频/图片/PDF/Guitar Pro）。");
        return;
      }
      updateCourses((prev) => [...prev, course]);
    },
    [updateCourses],
  );

  /**
   * 重新扫描课程根文件夹，保留同名课节的完成状态
   *
   * @param id 课程 id
   */
  const rescanCourse = useCallback(
    async (id: string) => {
      const target = courses.find((c) => c.id === id);
      if (!target?.rootDir) return;
      const fresh = await scanCourseFolder(target.rootDir, target.type);
      updateCourses((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          // 关键节点：按课节名继承旧的完成状态
          const completedNames = new Set(c.lessons.filter((l) => l.completed).map((l) => l.name));
          return {
            ...c,
            lessons: fresh.lessons.map((l) => ({ ...l, completed: completedNames.has(l.name) })),
          };
        }),
      );
    },
    [courses, updateCourses],
  );

  /**
   * 从课程库删除课程（不动磁盘文件）
   *
   * @param id 课程 id
   */
  const deleteCourse = useCallback(
    (id: string) => {
      updateCourses((prev) => prev.filter((c) => c.id !== id));
      if (activeCourseId === id) setActiveCourseId(null);
    },
    [updateCourses, activeCourseId],
  );

  /**
   * 更新课节完成状态
   *
   * @param courseId 课程 id
   * @param lessonId 课节 id
   * @param completed 是否完成
   */
  const setLessonCompleted = useCallback(
    (courseId: string, lessonId: string, completed: boolean) => {
      updateCourses((prev) =>
        prev.map((c) =>
          c.id === courseId
            ? { ...c, lessons: c.lessons.map((l) => (l.id === lessonId ? { ...l, completed } : l)) }
            : c,
        ),
      );
    },
    [updateCourses],
  );

  /**
   * 更新应用设置并持久化
   *
   * @param patch 设置变更
   */
  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void saveSettings(next);
      return next;
    });
  }, []);

  /**
   * 保存资源续播位置
   *
   * @param path 资源路径
   * @param position 位置（秒）
   */
  const savePosition = useCallback((path: string, position: number) => {
    positionsRef.current[path] = position;
    void savePlaybackPosition(path, position);
  }, []);

  if (!loaded) {
    return <div className={appLoading}>加载中…</div>;
  }

  // 主题切换按钮：两个页面顶栏共用
  const themeToggle = (
    <IconButton
      name={settings.theme === "dark" ? "sun" : "moon"}
      label={settings.theme === "dark" ? "切换为亮色主题" : "切换为暗色主题"}
      onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
    />
  );

  const activeCourse = courses.find((c) => c.id === activeCourseId) ?? null;

  if (activeCourse) {
    return (
      <ClassroomPage
        course={activeCourse}
        onBack={() => setActiveCourseId(null)}
        onLessonCompletedChange={(lessonId, completed) => setLessonCompleted(activeCourse.id, lessonId, completed)}
        settings={settings}
        onSettingsChange={updateSettings}
        playbackPositions={positionsRef.current}
        onSavePosition={savePosition}
        themeToggle={themeToggle}
      />
    );
  }

  return (
    <LibraryPage
      courses={courses}
      onOpenCourse={setActiveCourseId}
      onImportFolder={(type) => void importFolder(type)}
      onRescanCourse={(id) => void rescanCourse(id)}
      onDeleteCourse={deleteCourse}
      themeToggle={themeToggle}
    />
  );
}

export default App;
