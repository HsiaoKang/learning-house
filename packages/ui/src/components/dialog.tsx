/**
 * 浮窗（Radix Dialog + motion 过渡）
 */
import { type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "../lib/utils";
import { IconButton } from "./button";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** 面板宽度类（如 "w-[360px]"），默认 340px */
  widthClassName?: string;
}

/**
 * 浮窗组件（受控）
 *
 * @param props open/onClose 受控开关；title 标题；widthClassName 宽度类
 */
export function Modal({ open, onClose, title, children, widthClassName = "w-[340px]" }: ModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/55 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] -translate-x-1/2 -translate-y-1/2 flex-col gap-3.5 overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-2xl",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            widthClassName,
          )}
        >
          <div className="flex items-center justify-between text-sm font-semibold">
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <IconButton name="close" label="关闭" size="sm" />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
