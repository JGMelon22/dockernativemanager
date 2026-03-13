"use client";

import Sidebar from "./Sidebar";
import { X, Minus, Square } from "lucide-react";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div
      className="flex h-screen bg-zinc-950 dark border border-zinc-800 rounded-xl overflow-hidden shadow-2xl"
    >
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Full Header Drag Handle */}
        <div
          data-tauri-drag-region
          className="h-12 border-b border-zinc-900 bg-zinc-950/50 flex items-center justify-between px-4 select-none shrink-0 cursor-default"
          onDoubleClick={async () => {
            const { getCurrentWindow } = await import("@tauri-apps/api/window");
            await getCurrentWindow().toggleMaximize();
          }}
          onPointerDown={async (e) => {
            // Only drag on left click and avoid triggering on buttons
            if (e.buttons === 1 && (e.target as HTMLElement).closest('button') === null) {
              try {
                const { getCurrentWindow } = await import("@tauri-apps/api/window");
                await getCurrentWindow().startDragging();
              } catch (err) {
                console.error("Failed to start dragging", err);
              }
            }
          }}
        >
          <div className="flex items-center gap-2 pointer-events-none">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Docker Native Manager</span>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={async (e) => {
                e.stopPropagation();
                const { getCurrentWindow } = await import("@tauri-apps/api/window");
                await getCurrentWindow().minimize();
              }}
              className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-500 hover:text-zinc-200 relative z-50"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={async (e) => {
                e.stopPropagation();
                const { getCurrentWindow } = await import("@tauri-apps/api/window");
                await getCurrentWindow().toggleMaximize();
              }}
              className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-500 hover:text-zinc-200 relative z-50"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={async (e) => {
                e.stopPropagation();
                const { getCurrentWindow } = await import("@tauri-apps/api/window");
                await getCurrentWindow().close();
              }}
              className="p-1.5 hover:bg-rose-500/20 hover:text-rose-500 rounded-md transition-colors text-zinc-500 relative z-50"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;