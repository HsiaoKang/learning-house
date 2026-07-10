/**
 * 按钮（shadcn 风格：CVA variants + Tailwind）
 */
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";
import { Icon, type IconName, type IconProps } from "./icon";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground font-semibold hover:bg-primary-strong",
        solid: "bg-secondary text-secondary-foreground border border-border hover:border-muted-foreground/40",
        ghost: "text-foreground hover:bg-secondary",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      tone: {
        default: "",
        danger: "hover:text-destructive hover:border-destructive",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        md: "h-8 px-3.5",
        lg: "h-9 px-4.5 text-sm font-semibold",
      },
      active: {
        true: "bg-destructive text-white border-destructive hover:bg-destructive hover:text-white",
      },
    },
    defaultVariants: {
      variant: "solid",
      tone: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** 左侧图标 */
  icon?: IconName;
}

/**
 * 通用按钮
 *
 * @param props variant 视觉变体；tone 语气；size 尺寸；active 激活态；icon 左侧图标
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, tone, size, active, icon, children, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, tone, size, active }), className)} {...props}>
      {icon && <Icon name={icon} size={size === "sm" ? "sm" : "md"} />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 图标名 */
  name: IconName;
  size?: "sm" | "md" | "lg";
  /** 图标尺寸（默认随按钮尺寸） */
  iconSize?: IconProps["size"];
  /** 无障碍标签 */
  label: string;
}

const ICON_BUTTON_SIZES = { sm: "size-6", md: "size-[30px]", lg: "size-9" } as const;

/**
 * 纯图标按钮（关闭/返回/缩放等）
 *
 * @param props name 图标名；label 无障碍标签；size 尺寸
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, name, size = "md", iconSize, label, title, ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      title={title ?? label}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        ICON_BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      <Icon name={name} size={iconSize ?? (size === "lg" ? "lg" : "md")} />
    </button>
  ),
);
IconButton.displayName = "IconButton";
