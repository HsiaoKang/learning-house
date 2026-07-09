/**
 * 文档查看器
 *
 * 承载当前课节的文档类资源（图片 / PDF / Guitar Pro），
 * 多个文档时提供 tab 切换，按类型分发到对应渲染器。
 * 所有渲染器默认适配容器宽度并随窗口变化自动重排。
 */
import { useEffect, useState } from "react";
import { EmptyState, Tabs } from "@learning-house/ui";
import { mediaSrc, readBinary } from "../lib/platform";
import type { LessonResource } from "../types";
import { panelTitle, panelToolbar } from "../styles/layout.css";
import { scoreViewer } from "./docviewer.css";
import { ImageScore } from "./ImageScore";
import { PdfScore } from "./PdfScore";
import { AlphaTabScore } from "./AlphaTabScore";

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
  const [binary, setBinary] = useState<Uint8Array | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 课节切换时回到第一个文档
  useEffect(() => {
    setActiveIndex(0);
  }, [resources]);

  const active = resources[Math.min(activeIndex, resources.length - 1)] ?? null;

  // PDF 与 Guitar Pro 需要读取文件字节；图片直接走 asset URL
  useEffect(() => {
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
    return <EmptyState icon="music" title="本课节没有文档资源" hint="支持图片 / PDF / Guitar Pro（gp3-gpx）" />;
  }

  return (
    <div className={scoreViewer}>
      <div className={panelToolbar}>
        {resources.length > 1 ? (
          <Tabs
            items={resources.map((res) => ({ key: res.path, label: res.name }))}
            activeKey={active.path}
            onChange={(key) => setActiveIndex(resources.findIndex((r) => r.path === key))}
          />
        ) : (
          <span className={panelTitle} title={active.name}>
            {active.name}
          </span>
        )}
      </div>
      {renderBody(active, binary, loadError)}
    </div>
  );
}

/**
 * 根据文档类型分发到对应渲染器
 *
 * @param doc 文档资源
 * @param binary 已读取的文件字节（图片类型为 null）
 * @param loadError 文件读取错误信息
 */
function renderBody(doc: LessonResource, binary: Uint8Array | null, loadError: string | null) {
  if (loadError) {
    return <EmptyState title={`文件读取失败：${loadError}`} />;
  }
  if (doc.kind === "image") {
    return <ImageScore src={mediaSrc(doc.path)} />;
  }
  if (!binary) {
    return <EmptyState title="加载中…" />;
  }
  if (doc.kind === "pdf") {
    return <PdfScore data={binary} />;
  }
  return <AlphaTabScore data={binary} />;
}
