/**
 * 滑块（Radix Slider：精准拖拽 + 键盘步进 + 跨端一致外观）
 */
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "../lib/utils";

export interface SliderProps
  extends Omit<
    ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
    "value" | "defaultValue" | "onValueChange" | "onChange"
  > {
  /** 当前值（受控） */
  value: number;
  /** 数值变化回调 */
  onChange: (value: number) => void;
}

/**
 * 单值滑块
 *
 * @param props value 当前值；onChange 变化回调；min/max/step 同 Radix
 */
export const Slider = forwardRef<ComponentRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, value, onChange, ...props }, ref) => (
    <SliderPrimitive.Root
      ref={ref}
      value={[value]}
      onValueChange={(values) => onChange(values[0] ?? value)}
      className={cn("relative flex w-35 touch-none select-none items-center py-1.5", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-3.5 rounded-full bg-primary transition-transform hover:scale-115 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1 disabled:pointer-events-none" />
    </SliderPrimitive.Root>
  ),
);
Slider.displayName = "Slider";
