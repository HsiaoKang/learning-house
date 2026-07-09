/**
 * 文档查看器
 *
 * 承载当前课节的文档类资源（图片 / PDF / Guitar Pro），
 * 多个文档时提供 tab 切换，提供缩放工具条，按类型分发到对应渲染器。
 *
 * @author yuchenxi
 */
import { useEffect, useState } from "react";
import { mediaSrc, readBinary } from "../lib/platform";
import type { LessonResource } from "../types";
import { ImageScore } from "./ImageScore";
import { PdfScore } from "./PdfScore";
import { AlphaTabScore } from "./AlphaTabScore";

/** 单次缩放步长 */
const ZOOM_STEP = 0.15;
/** 缩放范围 */
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 3;

interface DocViewerProps {
  /** 当前课节的文档资源列表（可为空） */
  resources: LessonResource[];
}

/**
 * 文档查看区组件
 *
 * @param props resources 文档资源列表
 */
export function DocViewer({ resources }: DocViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [binary, setBinary] = useState<Uint8Array | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 课节切换时回到第一个文档
  useEffect(() => {
    setActiveIndex(0);
  }, [resources]);

  const active = resources[Math.min(activeIndex, resources.length - 1)] ?? null;

  // PDF 与 Guitar Pro 需要读取文件字节；图片直接走 asset URL
  useEffect(() => {
    setZoom(1);
    setBinary(null);
    setLoadError(null);
    if (!active || active.kind === "image") return;
    let cancelled = false;
    readBinary(active.path)
      .then((bytes) => {
        if (!cancelled) setBinary(bytes);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  if (!active) {
    return (
      <div className="panel-empty">
        <div className="panel-empty-icon">♪</div>
        <p>本课节没有文档资源</p>
        <p className="panel-empty-hint">支持图片 / PDF / Guitar Pro（gp3-gpx）</p>
      </div>
    );
  }

  return (
    <div className="score-viewer">
      <div className="panel-toolbar">
        {resources.length > 1 ? (
          <div className="resource-tabs">
            {resources.map((res, i) => (
              <button
                key={res.path}
                className={`resource-tab ${i === activeIndex ? "active" : ""}`}
                title={res.name}
                onClick={() => setActiveIndex(i)}
              >
                {res.name}
              </button>
            ))}
          </div>
        ) : (
          <span className="panel-title" title={active.name}>
            {active.name}
          </span>
        )}
        <div className="zoom-group">
          <button className="btn btn-ghost" onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}>
            −
          </button>
          <span className="zoom-label">{Math.round(zoom * 100)}%</span>
          <button className="btn btn-ghost" onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}>
            +
          </button>
          <button className="btn btn-ghost" onClick={() => setZoom(1)}>
            适宽
          </button>
        </div>
      </div>
      {renderBody(active, zoom, binary, loadError)}
    </div>
  );
}

/**
 * 根据文档类型分发到对应渲染器
 *
 * @param doc 文档资源
 * @param zoom 缩放系数
 * @param binary 已读取的文件字节（图片类型为 null）
 * @param loadError 文件读取错误信息
 */
function renderBody(doc: LessonResource, zoom: number, binary: Uint8Array | null, loadError: string | null) {
  if (loadError) {
    return <div className="panel-empty">文件读取失败：{loadError}</div>;
  }
  if (doc.kind === "image") {
    return <ImageScore src={mediaSrc(doc.path)} zoom={zoom} />;
  }
  if (!binary) {
    return <div className="panel-empty">加载中…</div>;
  }
  if (doc.kind === "pdf") {
    return <PdfScore data={binary} zoom={zoom} />;
  }
  return <AlphaTabScore data={binary} zoom={zoom} />;
}
