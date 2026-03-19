"use client";

import { useAppStore } from "@/store/app-store";
import {
  Palette,
  MessageSquare,
  Target,
  Columns,
  Hash,
  Shield,
} from "lucide-react";
import clsx from "clsx";

export default function Brand() {
  const { brand, analytics } = useAppStore();

  if (!brand) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Load demo data to see brand analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Brand Identity</h2>
        <p className="text-gray-500 mt-1">
          AI-extracted brand profile ensuring all suggestions align with your identity
        </p>
      </div>

      {/* Brand Header */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-800 rounded-xl p-8 text-white">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold">
            {brand.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-2xl font-bold">{brand.name}</h3>
            <p className="text-brand-200">@{brand.username}</p>
            <p className="text-sm text-brand-100 mt-1">{brand.niche}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{brand.contentPillars.length}</p>
            <p className="text-xs text-brand-200">Content Pillars</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{brand.toneOfVoice.length}</p>
            <p className="text-xs text-brand-200">Voice Traits</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{brand.subNiches.length}</p>
            <p className="text-xs text-brand-200">Sub-Niches</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{brand.brandKeywords.length}</p>
            <p className="text-xs text-brand-200">Brand Keywords</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Content Pillars */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Columns className="w-4 h-4 text-brand-600" />
            Content Pillars
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Core themes your content revolves around, extracted from post analysis
          </p>
          <div className="space-y-3">
            {brand.contentPillars.map((pillar, i) => (
              <div
                key={pillar}
                className="flex items-center gap-3 p-3 rounded-lg bg-brand-50 border border-brand-100"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
                  {i + 1}
                </div>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {pillar}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Tone of Voice */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-600" />
            Tone of Voice
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            How your brand communicates, detected from caption analysis
          </p>
          <div className="flex flex-wrap gap-2">
            {brand.toneOfVoice.map((tone) => (
              <span
                key={tone}
                className="px-4 py-2 rounded-full bg-green-50 border border-green-100 text-sm font-medium text-green-700 capitalize"
              >
                {tone}
              </span>
            ))}
          </div>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-700 mb-2">
              Posting Style
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Caption Length
                </p>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {brand.postingStyle.captionLength}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Hashtag Strategy
                </p>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {brand.postingStyle.hashtagStrategy}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Emoji Usage
                </p>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {brand.postingStyle.emojiUsage}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  CTA Style
                </p>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {brand.postingStyle.ctaStyle}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Target Audience */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-red-500" />
            Target Audience & Niche
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <p className="text-xs font-medium text-red-600 uppercase tracking-wider">
                Primary Audience
              </p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {brand.targetAudience}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Niche
              </p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {brand.niche}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Sub-Niches
              </p>
              <div className="flex flex-wrap gap-2">
                {brand.subNiches.map((niche) => (
                  <span
                    key={niche}
                    className="px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700"
                  >
                    #{niche}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Brand Keywords & Color Palette */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Palette className="w-4 h-4 text-purple-600" />
            Brand Assets
          </h3>

          <div className="space-y-6">
            {/* Color Palette */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Color Palette
              </p>
              <div className="flex gap-2">
                {brand.colorPalette.map((color) => (
                  <div key={color} className="text-center">
                    <div
                      className="w-12 h-12 rounded-lg border border-gray-200 shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                    <p className="text-[10px] text-gray-500 mt-1">{color}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Keywords */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Brand Keywords
              </p>
              <div className="flex flex-wrap gap-2">
                {brand.brandKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-xs font-medium text-purple-700"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Avoid Keywords */}
            {brand.avoidKeywords.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-red-500" />
                  Avoid Keywords
                </p>
                <div className="flex flex-wrap gap-2">
                  {brand.avoidKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-3 py-1 rounded-full bg-red-50 border border-red-100 text-xs font-medium text-red-600 line-through"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preferred Formats */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Preferred Formats (ranked)
              </p>
              <div className="flex gap-2">
                {brand.postingStyle.preferredFormats.map((fmt, i) => (
                  <span
                    key={fmt}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-xs font-medium",
                      i === 0
                        ? "bg-brand-100 text-brand-700 border border-brand-200"
                        : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {i === 0 && "1st: "}
                    {i === 1 && "2nd: "}
                    {i === 2 && "3rd: "}
                    {fmt}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
