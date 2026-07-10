/**
 * 空态占位
 */
import type { ReactNode } from "react";
import { Icon, type IconName } from "./icon";

export interface EmptyStateProps {
  /** 顶部图标名（大号渲染） */
  icon?: IconName;
  /** 主文案 */
  title: ReactNode;
  /** 辅助说明 */
  hint?: ReactNode;
  /** 操作区（如按钮） */
  children?: ReactNode;
}

/**
 * 空态组件
 *
 * @param props icon 图标；title 主文案；hint 辅助说明；children 操作区
 */
export function EmptyState({ icon, title, hint, children }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center text-sm text-muted-foreground">
      {icon && (
        <span className="inline-flex opacity-40">
          <Icon name={icon} size="xl" />
        </span>
      )}
      <p>{title}</p>
      {children}
      {hint && <p className="text-xs opacity-60">{hint}</p>}
    </div>
  );
}
