/**
 * 图片谱渲染器
 *
 * 默认适配容器宽度(随窗口变化自动跟随);
 * 双击在"适宽/原始尺寸"间切换,兜底超宽长条图(如指板图)看不清细节的场景,
 * 原始尺寸下超出部分由外层滚动容器承载。
 */
import { useEffect, useState } from "react";

interface ImageScoreProps {
  /** asset 协议图片 URL */
  src: string;
}

/**
 * 图片谱组件
 *
 * @param props src 图片地址
 */
export function ImageScore({ src }: ImageScoreProps) {
  const [fitWidth, setFitWidth] = useState(true);

  // 切换图片时回到适宽模式
  useEffect(() => {
    setFitWidth(true);
  }, [src]);

  return (
    <div className="min-h-0 flex-1 overflow-auto p-3">
      <img
        className="mx-auto block rounded"
        src={src}
        style={{ width: fitWidth ? "100%" : "auto", cursor: fitWidth ? "zoom-in" : "zoom-out" }}
        onDoubleClick={() => setFitWidth((f) => !f)}
        title="双击切换适宽 / 原始大小"
        alt="乐谱"
      />
    </div>
  );
}
