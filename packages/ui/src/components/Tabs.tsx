/**
 * 资源 Tab 切换器（课节内同类资源横向切换）
 */
import { cn } from "../lib/utils";

export interface TabItem {
  /** 唯一键 */
  key: string;
  /** 展示文案 */
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  activeKey: string;
  /** 切换回调 */
  onChange: (key: string) => void;
  className?: string;
}

/**
 * Tab 切换组件
 *
 * @param props items 项列表；activeKey 当前项；onChange 切换回调
 */
export function Tabs({ items, activeKey, onChange, className }: TabsProps) {
  return (
    <div role="tablist" className={cn("flex min-w-0 flex-1 gap-1 overflow-x-auto", className)}>
      {items.map((item) => (
        <button
          key={item.key}
          role="tab"
          aria-selected={item.key === activeKey}
          title={item.label}
          onClick={() => onChange(item.key)}
          className={cn(
            "max-w-45 truncate rounded-[5px] border border-transparent px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
            item.key === activeKey && "border-border bg-secondary text-primary",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
