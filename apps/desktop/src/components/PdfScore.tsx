/**
 * PDF 谱渲染器
 *
 * 基于 pdf.js 将 PDF 所有页渲染为 canvas 连续滚动展示,
 * 按 devicePixelRatio 提升清晰度,始终适配容器宽度,
 * 容器尺寸变化(拖动分栏/窗口缩放)时自动重排。
 */
import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@learning-house/ui";
// legacy 构建兼容较旧的 WebView 内核（标准构建依赖过新的 JS API）
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { pdfPageCanvas, pdfPages, scoreScroll } from "./docviewer.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/** 容器尺寸变化后的重渲染防抖间隔（毫秒） */
const RESIZE_DEBOUNCE_MS = 150;

interface PdfScoreProps {
  /** PDF 文件二进制内容 */
  data: Uint8Array;
}

/**
 * PDF 谱组件:加载文档并按容器宽度渲染,宽度变化时防抖重渲染
 *
 * @param props data PDF 字节
 */
export function PdfScore({ data }: PdfScoreProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const taskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // 加载 PDF 文档（data 变化时重新加载）
  useEffect(() => {
    let cancelled = false;
    setDoc(null);
    setError(null);
    // pdf.js 会转移 buffer 所有权，传入副本避免原数据失效
    const task = pdfjsLib.getDocument({ data: data.slice() });
    taskRef.current = task;
    task.promise
      .then((loaded) => {
        if (!cancelled) setDoc(loaded);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
      void taskRef.current?.destroy();
      taskRef.current = null;
    };
  }, [data]);

  // 关键节点：监听容器尺寸变化（含首次挂载），防抖后更新宽度触发重渲染
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => setContainerWidth(el.clientWidth), RESIZE_DEBOUNCE_MS);
    });
    observer.observe(el);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  // 渲染全部页面（文档就绪或容器宽度变化时）
  useEffect(() => {
    if (!doc || containerWidth <= 0) return;
    let cancelled = false;
    void renderAllPages(doc, containerRef.current!, containerWidth, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [doc, containerWidth]);

  if (error) {
    return <EmptyState title={`PDF 加载失败：${error}`} />;
  }
  return <div className={`${scoreScroll} ${pdfPages}`} ref={containerRef} />;
}

/**
 * 把 PDF 的每一页按适宽尺寸渲染成 canvas 追加到容器中
 *
 * @param doc pdf.js 文档对象
 * @param container 目标容器（渲染前会清空）
 * @param containerWidth 容器可视宽度（px）
 * @param isCancelled 查询当前渲染任务是否已被取消
 */
async function renderAllPages(
  doc: PDFDocumentProxy,
  container: HTMLDivElement,
  containerWidth: number,
  isCancelled: () => boolean,
): Promise<void> {
  const pageWidth = Math.max(200, containerWidth - 24);
  const dpr = window.devicePixelRatio || 1;
  container.innerHTML = "";
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    if (isCancelled()) return;
    const page = await doc.getPage(pageNum);
    // 先按原始尺寸算出适配宽度的基础缩放，再叠加像素密度
    const baseViewport = page.getViewport({ scale: 1 });
    const cssScale = pageWidth / baseViewport.width;
    const viewport = page.getViewport({ scale: cssScale * dpr });

    const canvas = document.createElement("canvas");
    canvas.className = pdfPageCanvas;
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
    canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
    container.appendChild(canvas);
    await page.render({ canvas, viewport }).promise;
  }
}
