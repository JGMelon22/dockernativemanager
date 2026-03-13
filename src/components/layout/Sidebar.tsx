"use client";

import { cn } from "@/lib/utils";
import { 
  Box, 
  Layers, 
  Database, 
  Network as NetworkIcon, 
  Terminal,
  Settings,
  Circle
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { name: "Containers", path: "/containers", icon: Box },
  { name: "Stacks", path: "/stacks", icon: Layers },
  { name: "Images", path: "/images", icon: Layers },
  { name: "Volumes", path: "/volumes", icon: Database },
  { name: "Networks", path: "/networks", icon: NetworkIcon },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <div className="w-64 border-r bg-zinc-950 text-zinc-400 flex flex-col h-screen shrink-0">
      <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Terminal className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-none">Docker Native</h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Native Manager</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-4 py-2 rounded-md transition-colors",
              location.pathname === item.path 
                ? "bg-zinc-800 text-white" 
                : "hover:bg-zinc-900 hover:text-zinc-200"
            )}
          >
            <item.icon className="w-4 h-4" />
            <span className="text-sm font-medium">{item.name}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <div className="bg-zinc-900/50 rounded-lg p-3 flex items-center gap-3">
          <Circle className="w-3 h-3 text-emerald-500 fill-emerald-500 animate-pulse" />
          <div className="flex-1 overflow-hidden">
            <p className="text-xs text-zinc-300 font-medium">Daemon Status</p>
            <p className="text-[10px] text-zinc-500 truncate">Connected: /var/run/docker.sock</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;