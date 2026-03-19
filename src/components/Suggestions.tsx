"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import {
  Lightbulb,
  TrendingUp,
  Calendar,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  Copy,
  Hash,
} from "lucide-react";
import clsx from "clsx";

export default function Suggestions() {
  const { suggestions, updateSuggestionStatus, scheduleSuggestion } =
    useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "suggested" | "scheduled" | "rejected">("all");

  const filtered =
    filter === "all"
      ? suggestions
      : suggestions.filter((s) => s.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Content Suggestions
          </h2>
          <p className="text-gray-500 mt-1">
            AI-generated content ideas based on trends, performance, and brand alignment
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(["all", "suggested", "scheduled", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium transition",
              filter === f
                ? "bg-brand-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-1.5 text-xs opacity-70">
              (
              {f === "all"
                ? suggestions.length
                : suggestions.filter((s) => s.status === f).length}
              )
            </span>
          </button>
        ))}
      </div>

      {/* Suggestions List */}
      <div className="space-y-4">
        {filtered.map((suggestion) => {
          const isExpanded = expandedId === suggestion.id;
          return (
            <div
              key={suggestion.id}
              className={clsx(
                "bg-white rounded-xl border transition-all",
                suggestion.status === "rejected"
                  ? "border-gray-100 opacity-60"
                  : "border-gray-200"
              )}
            >
              {/* Header */}
              <div
                className="p-5 cursor-pointer"
                onClick={() =>
                  setExpandedId(isExpanded ? null : suggestion.id)
                }
              >
                <div className="flex items-start gap-4">
                  <div
                    className={clsx(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      suggestion.trendScore > 70
                        ? "bg-gradient-to-br from-orange-400 to-red-500 text-white"
                        : suggestion.brandAlignmentScore > 85
                        ? "bg-gradient-to-br from-brand-400 to-brand-600 text-white"
                        : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {suggestion.trendScore > 70 ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <Lightbulb className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {suggestion.title}
                      </h4>
                      <span
                        className={clsx(
                          "text-[10px] px-2 py-0.5 rounded-full font-medium",
                          suggestion.status === "suggested"
                            ? "bg-yellow-100 text-yellow-700"
                            : suggestion.status === "scheduled"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        )}
                      >
                        {suggestion.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {suggestion.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <span
                          className={clsx(
                            "text-xs px-1.5 py-0.5 rounded",
                            suggestion.contentType === "REEL"
                              ? "bg-purple-100 text-purple-700"
                              : suggestion.contentType === "CAROUSEL"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          )}
                        >
                          {suggestion.contentType}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <Sparkles className="w-3 h-3" />
                        {suggestion.estimatedEngagement.toFixed(1)}% est. eng
                      </span>
                      <span className="flex items-center gap-1 text-xs text-brand-600">
                        <Target className="w-3 h-3" />
                        {suggestion.brandAlignmentScore}% brand match
                      </span>
                      <span className="flex items-center gap-1 text-xs text-orange-600">
                        <TrendingUp className="w-3 h-3" />
                        Trend: {suggestion.trendScore}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {suggestion.status === "suggested" && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            scheduleSuggestion(
                              suggestion.id,
                              tomorrow.toISOString().split("T")[0],
                              suggestion.bestTimeToPost.split(" at ")[1] || "10:00"
                            );
                          }}
                          className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition"
                          title="Schedule"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateSuggestionStatus(suggestion.id, "rejected");
                          }}
                          className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Caption Preview */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Suggested Caption
                        </p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              suggestion.suggestedCaption
                            );
                          }}
                          className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                          {suggestion.suggestedCaption}
                        </p>
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="space-y-4">
                      {/* Reasoning */}
                      <div>
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          Why This Suggestion
                        </p>
                        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                          <p className="text-xs text-gray-700 leading-relaxed">
                            {suggestion.reasoning}
                          </p>
                        </div>
                      </div>

                      {/* Hashtags */}
                      <div>
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          Suggested Hashtags
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {suggestion.suggestedHashtags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Best Time & Source */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-[10px] text-gray-500 uppercase">
                            Best Time
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {suggestion.bestTimeToPost}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-[10px] text-gray-500 uppercase">
                            Inspiration
                          </p>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {suggestion.inspirationSource}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-[10px] text-gray-500 uppercase">
                            Content Pillar
                          </p>
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {suggestion.contentPillar}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-[10px] text-gray-500 uppercase">
                            Est. Engagement
                          </p>
                          <p className="text-sm font-bold text-green-600">
                            {suggestion.estimatedEngagement.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
