import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并 Tailwind 类名（clsx 组合 + tailwind-merge 去冲突）
 *
 * @param inputs 类名片段
 * @returns 合并后的 className
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
