/**
 * 底部工具栏
 *
 * 上课页底部的工具容器：左端工具切换器（无冗余文案），
 * 右侧渲染当前工具面板。吉他类型课程默认带出节拍器。
 */
import { Select } from "@learning-house/ui";
import type { MetronomeOptions } from "@learning-house/metronome-core";
import type { SyncConfig } from "../hooks/useMetronome";
import type { ToolKind } from "../types";
import { MetronomeBar } from "./MetronomeBar";

/** 工具显示名 */
const TOOL_LABELS: Record<ToolKind, string> = {
  metronome: "节拍器",
  none: "无工具",
};

interface ToolBarProps {
  /** 当前激活的工具 */
  tool: ToolKind;
  /** 切换工具 */
  onToolChange: (tool: ToolKind) => void;
  /** 节拍器所需的全部状态与控制（透传给 MetronomeBar） */
  metronome: {
    options: MetronomeOptions;
    updateOptions: (patch: Partial<MetronomeOptions>) => void;
    running: boolean;
    toggle: () => void;
    activeBeat: number;
    sync: SyncConfig;
    setSync: (patch: Partial<SyncConfig>) => void;
    hasAudio: boolean;
    getMediaTime: () => number | null;
  };
}

/**
 * 工具栏组件
 *
 * @param props 见 ToolBarProps 字段说明
 */
export function ToolBar({ tool, onToolChange, metronome }: ToolBarProps) {
  return (
    <div className="flex shrink-0 items-center border-t border-border bg-card">
      <div className="flex h-14 shrink-0 items-center border-r border-border px-3.5">
        <Select
          value={tool}
          onChange={(v) => onToolChange(v as ToolKind)}
          options={(Object.keys(TOOL_LABELS) as ToolKind[]).map((kind) => ({
            value: kind,
            label: TOOL_LABELS[kind],
          }))}
          title="切换练习工具"
        />
      </div>
      <div className="min-w-0 flex-1">
        {tool === "metronome" ? (
          <MetronomeBar
            options={metronome.options}
            updateOptions={metronome.updateOptions}
            running={metronome.running}
            toggle={metronome.toggle}
            activeBeat={metronome.activeBeat}
            sync={metronome.sync}
            setSync={metronome.setSync}
            hasAudio={metronome.hasAudio}
            getMediaTime={metronome.getMediaTime}
          />
        ) : (
          <span className="block px-3.5 text-[13px] text-muted-foreground">未启用工具</span>
        )}
      </div>
    </div>
  );
}
