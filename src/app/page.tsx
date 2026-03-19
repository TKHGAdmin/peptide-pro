"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import ContentCalendar from "@/components/ContentCalendar";
import Analytics from "@/components/Analytics";
import Competitors from "@/components/Competitors";
import Brand from "@/components/Brand";
import Suggestions from "@/components/Suggestions";
import SettingsPage from "@/components/SettingsPage";

export default function Home() {
  const { activeTab, loadDemoData, profile } = useAppStore();

  // Auto-load demo data on first visit
  useEffect(() => {
    if (!profile) {
      loadDemoData();
    }
  }, [profile, loadDemoData]);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "calendar":
        return <ContentCalendar />;
      case "analytics":
        return <Analytics />;
      case "competitors":
        return <Competitors />;
      case "brand":
        return <Brand />;
      case "suggestions":
        return <Suggestions />;
      case "settings":
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">{renderContent()}</main>
    </div>
  );
}
