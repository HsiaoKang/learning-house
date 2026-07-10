/**
 * 复选框（Radix Checkbox + 文字标签）
 */
import { forwardRef, type ComponentRef, type ReactNode } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cn } from "../lib/utils";
import { Icon } from "./icon";

export interface CheckboxProps {
  checked: boolean;
  /** 勾选状态变化回调 */
  onChange: (checked: boolean) => void;
  /** 右侧文案 */
  label?: ReactNode;
  disabled?: boolean;
  title?: string;
  className?: string;
}

/**
 * 复选框组件
 *
 * @param props checked/onChange 受控勾选；label 文案
 */
export const Checkbox = forwardRef<ComponentRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ checked, onChange, label, disabled, title, className }, ref) => (
    <label
      title={title}
      className={cn(
        "inline-flex cursor-pointer select-none items-center gap-1.5 whitespace-nowrap text-[13px]",
        disabled && "cursor-not-allowed opacity-45",
        className,
      )}
    >
      <CheckboxPrimitive.Root
        ref={ref}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(state) => onChange(state === true)}
        className="flex size-4 shrink-0 items-center justify-center rounded-sm border border-border bg-secondary transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <CheckboxPrimitive.Indicator>
          <Icon name="check" size="sm" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label}
    </label>
  ),
);
Checkbox.displayName = "Checkbox";
