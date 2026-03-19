"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { Settings, Key, Users, Bell, Database, Check } from "lucide-react";

export default function SettingsPage() {
  const { loadDemoData, profile } = useAppStore();
  const [accessToken, setAccessToken] = useState("");
  const [competitors, setCompetitors] = useState("peptide_sciences\nbiohack_master\npeptide_therapy_hub\nlongevity_labs");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-500 mt-1">
          Configure your Instagram connection and app preferences
        </p>
      </div>

      {/* Demo Data */}
      <div className="bg-gradient-to-r from-brand-50 to-purple-50 rounded-xl border border-brand-200 p-6">
        <div className="flex items-center gap-3 mb-3">
          <Database className="w-5 h-5 text-brand-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            Demo Mode
          </h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Load sample data to explore the app without connecting your Instagram account.
        </p>
        <button
          onClick={loadDemoData}
          className="px-6 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition"
        >
          {profile ? "Reload Demo Data" : "Load Demo Data"}
        </button>
        {profile && (
          <span className="ml-3 text-sm text-green-600 flex items-center gap-1 inline-flex">
            <Check className="w-4 h-4" />
            Demo data loaded
          </span>
        )}
      </div>

      {/* Instagram API Connection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            Instagram API Connection
          </h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Connect your Instagram Business or Creator account via the Graph API.
          You&apos;ll need a Facebook Developer App and a long-lived access token.
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">
              Access Token
            </label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Enter your Instagram Graph API access token"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Requires instagram_basic, instagram_manage_insights, and
              pages_show_list permissions.
            </p>
          </div>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
          >
            Connect Account
          </button>
        </div>
      </div>

      {/* Competitor Accounts */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            Competitor Accounts
          </h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Add Instagram usernames of competitors in your niche (one per line).
          These will be scraped for trend and outlier analysis.
        </p>
        <textarea
          value={competitors}
          onChange={(e) => setCompetitors(e.target.value)}
          rows={6}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm font-mono focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none resize-none"
        />
        <button
          onClick={handleSave}
          className="mt-3 px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
        >
          {saved ? "Saved!" : "Save Competitors"}
        </button>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            Preferences
          </h3>
        </div>
        <div className="space-y-3">
          {[
            {
              label: "New trend alerts",
              desc: "Get notified when trending topics emerge in your niche",
            },
            {
              label: "Posting reminders",
              desc: "Remind you before scheduled posts go live",
            },
            {
              label: "Weekly performance digest",
              desc: "Summary of your content performance each week",
            },
            {
              label: "Competitor activity alerts",
              desc: "Notify when competitors post viral content",
            },
          ].map((pref) => (
            <label
              key={pref.label}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                defaultChecked
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {pref.label}
                </p>
                <p className="text-xs text-gray-500">{pref.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
