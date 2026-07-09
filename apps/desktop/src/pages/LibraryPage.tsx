/**
 * 课程库页
 *
 * 应用首页：课程卡片列表（含学习进度），支持从文件夹导入课程
 * （默认整理规则：子文件夹归纳为课节）、重新扫描、删除课程。
 *
 * @author yuchenxi
 */
import { useState } from "react";
import { COURSE_TYPE_LABELS, type Course, type CourseType } from "../types";

interface LibraryPageProps {
  courses: Course[];
  /** 进入某课程的上课页 */
  onOpenCourse: (id: string) => void;
  /** 选择文件夹导入课程（type 为课程类型） */
  onImportFolder: (type: CourseType) => void;
  /** 重新扫描课程根文件夹（保留完成状态） */
  onRescanCourse: (id: string) => void;
  /** 删除课程（仅移出课程库，不动磁盘文件） */
  onDeleteCourse: (id: string) => void;
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
 * 课程库页组件
 *
 * @param props 见 LibraryPageProps 字段说明
 */
export function LibraryPage(props: LibraryPageProps) {
  const { courses, onOpenCourse, onImportFolder, onRescanCourse, onDeleteCourse } = props;
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="library-page">
      <header className="top-bar">
        <div className="brand">
          <span className="brand-mark">📚</span>
          <span className="brand-name">Learning House</span>
        </div>
        <button className="btn btn-primary" onClick={() => setImportOpen(true)}>
          + 导入课程文件夹
        </button>
      </header>

      <main className="library-body">
        {courses.length === 0 ? (
          <div className="panel-empty library-empty">
            <div className="panel-empty-icon">📚</div>
            <p>还没有课程</p>
            <button className="btn btn-primary" onClick={() => setImportOpen(true)}>
              导入课程文件夹
            </button>
            <p className="panel-empty-hint">选择一个文件夹，其中的每个子文件夹会自动归纳为一节课</p>
          </div>
        ) : (
          <div className="course-grid">
            {courses.map((course) => {
              const { done, total } = progressOf(course);
              const percent = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={course.id} className="course-card" onClick={() => onOpenCourse(course.id)}>
                  <div className="course-card-head">
                    <span className="course-name" title={course.name}>
                      {course.name}
                    </span>
                    <span className="course-type-tag">{COURSE_TYPE_LABELS[course.type]}</span>
                  </div>
                  <div className="course-meta">
                    {total} 课节 · 已完成 {done} 节
                  </div>
                  <div className="course-progress">
                    <div className="course-progress-fill" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="course-progress-label">{percent}%</div>
                  <div className="course-card-actions" onClick={(e) => e.stopPropagation()}>
                    {course.rootDir && (
                      <button className="btn btn-ghost" onClick={() => onRescanCourse(course.id)} title="按文件夹重新扫描课节">
                        重新扫描
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-danger"
                      onClick={() => {
                        if (confirm(`确认从课程库删除「${course.name}」？磁盘文件不会被删除。`)) {
                          onDeleteCourse(course.id);
                        }
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {importOpen && (
        <div className="modal-mask" onClick={() => setImportOpen(false)}>
          <div className="import-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tap-modal-header">
              <span>导入课程</span>
              <button className="btn btn-ghost" onClick={() => setImportOpen(false)}>
                ✕
              </button>
            </div>
            <p className="import-hint">选择课程类型后挑选课程根文件夹，子文件夹将自动归纳为课节。</p>
            <div className="import-actions">
              {(Object.keys(COURSE_TYPE_LABELS) as CourseType[]).map((type) => (
                <button
                  key={type}
                  className="btn btn-primary import-type-btn"
                  onClick={() => {
                    setImportOpen(false);
                    onImportFolder(type);
                  }}
                >
                  {COURSE_TYPE_LABELS[type]}课程
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
