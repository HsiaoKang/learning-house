/**
 * 右键菜单（Radix ContextMenu：替代 WebView 原生右键菜单）
 */
import { type ReactNode } from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { cn } from "../lib/utils";
import { Icon, type IconName } from "./icon";

/** 菜单项定义 */
export interface ContextMenuItem {
  /** 菜单项标识（onSelect 回传） */
  key: string;
  label: ReactNode;
  icon?: IconName;
  disabled?: boolean;
  /** 分隔线（true 时忽略其余字段） */
  separator?: boolean;
}

export interface ContextMenuProps {
  /** 触发右键的区域 */
  children: ReactNode;
  items: ContextMenuItem[];
  /** 菜单项选择回调 */
  onSelect: (key: string) => void;
}

/**
 * 右键菜单容器
 *
 * @param props children 触发区域；items 菜单项；onSelect 选择回调
 */
export function ContextMenu({ children, items, onSelect }: ContextMenuProps) {
  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger asChild>{children}</ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content className="z-50 min-w-40 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          {items.map((item, i) =>
            item.separator ? (
              <ContextMenuPrimitive.Separator key={`sep-${i}`} className="my-1 h-px bg-border" />
            ) : (
              <ContextMenuPrimitive.Item
                key={item.key}
                disabled={item.disabled}
                onSelect={() => onSelect(item.key)}
                className={cn(
                  "flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] outline-none",
                  "data-[highlighted]:bg-secondary data-[disabled]:pointer-events-none data-[disabled]:opacity-45",
                )}
              >
                {item.icon && (
                  <span className="text-muted-foreground">
                    <Icon name={item.icon} size="sm" />
                  </span>
                )}
                {item.label}
              </ContextMenuPrimitive.Item>
            ),
          )}
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}
