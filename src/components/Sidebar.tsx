"use client";

import { useAppStore } from "@/store/app-store";
import {
  LayoutDashboard,
  Calendar,
  BarChart3,
  Users,
  Palette,
  Lightbulb,
  Settings,
  Instagram,
} from "lucide-react";
import clsx from "clsx";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "competitors", label: "Competitors", icon: Users },
  { id: "brand", label: "Brand", icon: Palette },
  { id: "suggestions", label: "Suggestions", icon: Lightbulb },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const { activeTab, setActiveTab, profile } = useAppStore();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col z-20">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
            <Instagram className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">Content Calendar</h1>
            <p className="text-xs text-gray-500">AI-Powered Strategy</p>
          </div>
        </div>
      </div>

      {/* Profile */}
      {profile && (
        <div className="p-4 mx-3 mt-4 rounded-lg bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm">
              {profile.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                @{profile.username}
              </p>
              <p className="text-xs text-gray-500">
                {(profile.followers / 1000).toFixed(1)}K followers
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 p-3 mt-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon
                className={clsx(
                  "w-5 h-5",
                  isActive ? "text-brand-600" : "text-gray-400"
                )}
              />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <div className="text-xs text-gray-400 text-center">
          Instagram Content Calendar v1.0
        </div>
      </div>
    </aside>
  );
}
