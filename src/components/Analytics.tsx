"use client";

import { useAppStore } from "@/store/app-store";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Hash,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

export default function Analytics() {
  const { analytics, posts } = useAppStore();

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Load demo data to see analytics</p>
      </div>
    );
  }

  const outperformanceFactors = [
    {
      factor: "Content Format",
      impact: 1.32,
      description:
        "REEL posts get 32% more engagement than average",
      examples: ["stu901", "def456"],
    },
    {
      factor: "Call-to-Action / Questions",
      impact: 1.25,
      description:
        "80% of top posts include questions vs 40% of low performers",
      examples: ["abc123", "ghi789"],
    },
    {
      factor: "Caption Length",
      impact: 1.2,
      description:
        "Longer captions (avg 280 chars) correlate with higher engagement",
      examples: ["pqr678", "abc123"],
    },
    {
      factor: "Hashtag Strategy",
      impact: 1.15,
      description: "Top posts use ~6 hashtags vs ~4 in low performers",
      examples: ["yza567", "abc123"],
    },
    {
      factor: "Posting Time",
      impact: 1.12,
      description:
        "Posts on Wednesday at 10:00 get the highest engagement",
      examples: ["def456"],
    },
  ];

  const radarData = outperformanceFactors.map((f) => ({
    factor: f.factor.split(" ")[0],
    impact: f.impact * 50,
    fullFactor: f.factor,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
        <p className="text-gray-500 mt-1">
          Deep dive into what makes your content perform
        </p>
      </div>

      {/* Why Content Outperforms */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Why Your Top Content Outperforms
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Factors ranked by their impact on engagement rate
        </p>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            {outperformanceFactors.map((factor, i) => (
              <div
                key={factor.factor}
                className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100"
              >
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {factor.factor}
                    </p>
                    <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" />+
                      {((factor.impact - 1) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {factor.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e9ecef" />
                <PolarAngleAxis dataKey="factor" tick={{ fontSize: 11 }} />
                <Radar
                  dataKey="impact"
                  stroke="#4263eb"
                  fill="#4263eb"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hashtag Performance */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Hash className="w-4 h-4 text-brand-600" />
            Top Hashtag Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={analytics.hashtagPerformance.slice(0, 8)}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="hashtag"
                tick={{ fontSize: 10 }}
                width={100}
              />
              <Tooltip />
              <Bar
                dataKey="avgEngagement"
                fill="#4263eb"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" />
            Engagement by Posting Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.bestPostingTimes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v.slice(0, 3)} ${analytics.bestPostingTimes.find((t) => t.day === v)?.hour || ""}h`}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="engagement" fill="#40c057" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top vs Bottom Posts Comparison */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Top vs Bottom Performing Posts
        </h3>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-3">
              Top Performers
            </p>
            <div className="space-y-2">
              {analytics.topPerformingPosts.slice(0, 5).map((post) => (
                <div
                  key={post.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-green-50/50 border border-green-100"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-green-700">
                      {post.engagementRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {post.caption.slice(0, 60)}...
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-500">
                      <span>{post.mediaType}</span>
                      <span>{post.likes} likes</span>
                      <span>{post.comments} comments</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-3">
              Underperformers
            </p>
            <div className="space-y-2">
              {analytics.worstPerformingPosts.slice(0, 5).map((post) => (
                <div
                  key={post.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-red-50/50 border border-red-100"
                >
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-red-700">
                      {post.engagementRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {post.caption.slice(0, 60)}...
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-500">
                      <span>{post.mediaType}</span>
                      <span>{post.likes} likes</span>
                      <span>{post.comments} comments</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
