import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  FolderOpen,
  BookOpen,
  GraduationCap,
  Trophy,
  Sparkles,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { SIDEBAR_TOOLS } from "@rankstudio/shared";
import { getSidebarCollapsed, setSidebarCollapsed } from "../lib/settings";

interface SidebarProps {
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings }) => {
  const [collapsed, setCollapsed] = useState(getSidebarCollapsed);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    setSidebarCollapsed(next);
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
      isActive
        ? "bg-[#7C5CFF]/20 text-white font-medium"
        : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100"
    }`;

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-[#2A2A32] bg-[#17171B] transition-all ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="flex h-14 items-center justify-between border-b border-[#2A2A32] px-3">
        {!collapsed && (
          <div className="flex items-center gap-2 font-bold tracking-tight text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7C5CFF] text-xs font-black">
              RS
            </span>
            <span>RankStudio</span>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2.5 space-y-5">
        <div>
          {!collapsed && (
            <div className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Core
            </div>
          )}
          <div className="space-y-0.5">
            <NavLink to="/" end className={navClass}>
              <Home className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Home</span>}
            </NavLink>
            <NavLink to="/library" className={navClass}>
              <FolderOpen className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Library</span>}
            </NavLink>
            <NavLink to="/tutorial" className={navClass}>
              <BookOpen className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Tutorial</span>}
            </NavLink>
            <NavLink to="/free-course" className={navClass}>
              <GraduationCap className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Free Course</span>}
            </NavLink>
          </div>
        </div>

        <div>
          {!collapsed && (
            <div className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Tools
            </div>
          )}
          <div className="space-y-0.5">
            {SIDEBAR_TOOLS.map((tool) => {
              const to = tool.implemented
                ? "/video-ranking-new"
                : `/tools/${tool.slug}`;
              return (
                <NavLink key={tool.slug} to={to} className={navClass}>
                  {tool.implemented ? (
                    <Trophy className="h-4 w-4 shrink-0 text-[#7C5CFF]" />
                  ) : (
                    <Sparkles className="h-4 w-4 shrink-0 text-zinc-500" />
                  )}
                  {!collapsed && (
                    <span className="flex flex-1 items-center justify-between truncate">
                      <span>{tool.name}</span>
                      {!tool.implemented && (
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                          Soon
                        </span>
                      )}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="border-t border-[#2A2A32] p-2.5">
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
      </div>
    </aside>
  );
};
