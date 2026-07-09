/**
 * 课程库页
 *
 * 应用首页：课程卡片列表（含学习进度），支持从文件夹导入课程
 * （默认整理规则：子文件夹归纳为课节）、重新扫描、删除课程。
 */
import { useState } from "react";
import { BrandLogo, Button, EmptyState, IconButton, Modal, ProgressBar } from "@learning-house/ui";
import { COURSE_TYPE_LABELS, type Course, type CourseType } from "../types";
import { brand, brandName, topBar } from "../styles/layout.css";
import {
  aiPromptEntry,
  aiPromptFooter,
  aiPromptTextarea,
  courseCard,
  courseCardActions,
  courseCardHead,
  courseGrid,
  courseMeta,
  courseName,
  courseProgressLabel,
  courseTypeTag,
  importActions,
  importHint,
  importTypeBtn,
  libraryBody,
} from "./library.css";
import { appShell } from "../styles/layout.css";

interface LibraryPageProps {
  courses: Course[];
  /** 进入某课程的上课页 */
  onOpenCourse: (id: string) => void;
  /** 选择文件夹导入课程（type 为课程类型） */
  onImportFolder: (type: CourseType) => void;
  /** 选择文件夹并生成 AI 整理提示词（取消选择时返回 null） */
  onGenerateAiPrompt: () => Promise<string | null>;
  /** 重新扫描课程根文件夹（保留完成状态） */
  onRescanCourse: (id: string) => void;
  /** 删除课程（仅移出课程库，不动磁盘文件） */
  onDeleteCourse: (id: string) => void;
  /** 主题切换按钮（由 App 注入，含图标与行为） */
  themeToggle: React.ReactNode;
}

/**
 * 计算课程学习进度
 *
 * @param course 课程
 * @returns 已完成课节数与总课节数
 */
function progressOf(course: Course): { done: number; total: number } {
  const total = course.lessons.length;
  const done = course.lessons.filter((l) => l.completed).length;
  return { done, total };
}

/**
 * 复制文本到剪贴板
 *
 * @param text 待复制文本
 * @returns 是否复制成功（失败时由调用方引导手动复制）
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * 课程库页组件
 *
 * @param props 见 LibraryPageProps 字段说明
 */
export function LibraryPage(props: LibraryPageProps) {
  const { courses, onOpenCourse, onImportFolder, onGenerateAiPrompt, onRescanCourse, onDeleteCourse, themeToggle } =
    props;
  const [importOpen, setImportOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /** 选文件夹生成 AI 提示词并打开展示弹窗 */
  const openAiPrompt = async () => {
    setImportOpen(false);
    const prompt = await onGenerateAiPrompt();
    if (prompt) {
      setCopied(false);
      setAiPrompt(prompt);
    }
  };

  return (
    <div className={appShell}>
      <header className={topBar}>
        <div className={brand}>
          <BrandLogo />
          <span className={brandName}>Learning House</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {themeToggle}
          <Button variant="primary" icon="plus" onClick={() => setImportOpen(true)}>
            导入课程文件夹
          </Button>
        </div>
      </header>

      <main className={libraryBody}>
        {courses.length === 0 ? (
          <EmptyState
            icon="folderOpen"
            title="还没有课程"
            hint="选择一个文件夹，其中的每个子文件夹会自动归纳为一节课"
          >
            <Button variant="primary" onClick={() => setImportOpen(true)}>
              导入课程文件夹
            </Button>
          </EmptyState>
        ) : (
          <div className={courseGrid}>
            {courses.map((course) => {
              const { done, total } = progressOf(course);
              const percent = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={course.id} className={courseCard} onClick={() => onOpenCourse(course.id)}>
                  <div className={courseCardHead}>
                    <span className={courseName} title={course.name}>
                      {course.name}
                    </span>
                    <span className={courseTypeTag}>{COURSE_TYPE_LABELS[course.type]}</span>
                  </div>
                  <div className={courseMeta}>
                    {total} 课节 · 已完成 {done} 节
                  </div>
                  <ProgressBar percent={percent} />
                  <div className={courseProgressLabel}>{percent}%</div>
                  <div className={courseCardActions} onClick={(e) => e.stopPropagation()}>
                    {course.rootDir && (
                      <IconButton
                        name="rescan"
                        label="按文件夹重新扫描课节"
                        onClick={() => onRescanCourse(course.id)}
                      />
                    )}
                    <IconButton
                      name="trash"
                      label="删除课程"
                      onClick={() => {
                        if (confirm(`确认从课程库删除「${course.name}」？磁盘文件不会被删除。`)) {
                          onDeleteCourse(course.id);
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="导入课程" width="360px">
        <p className={importHint}>
          选择课程类型后挑选课程根文件夹。子文件夹自动归纳为课节；平铺编号视频的文件夹会按编号
          与配套资料自动组课；根文件夹内有 learning-house.json 清单时优先按清单组课。
        </p>
        <div className={importActions}>
          {(Object.keys(COURSE_TYPE_LABELS) as CourseType[]).map((type) => (
            <Button
              key={type}
              variant="primary"
              className={importTypeBtn}
              onClick={() => {
                setImportOpen(false);
                onImportFolder(type);
              }}
            >
              {COURSE_TYPE_LABELS[type]}课程
            </Button>
          ))}
        </div>
        <div className={aiPromptEntry}>
          <p className={importHint}>目录太乱、自动整理不理想？可以让任意 AI 帮你生成课节清单。</p>
          <Button variant="ghost" onClick={() => void openAiPrompt()}>
            生成 AI 整理提示词
          </Button>
        </div>
      </Modal>

      <Modal open={aiPrompt !== null} onClose={() => setAiPrompt(null)} title="AI 整理提示词" width="560px">
        <p className={importHint}>
          把下面的提示词完整发给任意 AI（ChatGPT / 豆包 / Kimi…），将它回复的 JSON 保存为课程根文件夹下的
          learning-house.json 文件，再回来导入该文件夹即可。
        </p>
        <textarea
          className={aiPromptTextarea}
          readOnly
          value={aiPrompt ?? ""}
          onFocus={(e) => e.currentTarget.select()}
        />
        <div className={aiPromptFooter}>
          <Button
            variant="primary"
            onClick={() => {
              void copyToClipboard(aiPrompt ?? "").then((ok) => {
                setCopied(ok);
                if (!ok) alert("复制失败，请点击文本框全选后手动复制。");
              });
            }}
          >
            {copied ? "已复制" : "复制提示词"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
