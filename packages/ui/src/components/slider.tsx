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
      className={cn(
        "relative flex touch-none select-none items-center",
        "data-[orientation=horizontal]:w-35 data-[orientation=horizontal]:py-1.5",
        "data-[orientation=vertical]:h-24 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col data-[orientation=vertical]:px-1.5",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        className={cn(
          "relative grow overflow-hidden rounded-full bg-secondary",
          "data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full",
          "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1",
        )}
      >
        <SliderPrimitive.Range className="absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-3.5 rounded-full bg-primary transition-transform hover:scale-115 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1 disabled:pointer-events-none" />
    </SliderPrimitive.Root>
  ),
);
Slider.displayName = "Slider";
