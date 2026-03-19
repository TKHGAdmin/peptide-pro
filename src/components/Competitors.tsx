"use client";

import { useAppStore } from "@/store/app-store";
import {
  Crown,
  TrendingUp,
  Users,
  BarChart3,
  Zap,
  ExternalLink,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from "recharts";
import clsx from "clsx";

const COLORS = ["#4263eb", "#40c057", "#fab005", "#fa5252", "#7950f2"];

export default function Competitors() {
  const { competitors, profile, analytics, trends } = useAppStore();

  if (!competitors.length || !profile) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Load demo data to see competitor analysis</p>
      </div>
    );
  }

  const outliers = competitors.filter((c) => c.isOutlier);

  const comparisonData = [
    {
      name: `@${profile.username} (You)`,
      engagement: analytics?.avgEngagementRate || 0,
      followers: profile.followers,
      frequency: 3.5,
      isUser: true,
    },
    ...competitors.map((c) => ({
      name: `@${c.profile.username}`,
      engagement: c.avgEngagementRate,
      followers: c.profile.followers,
      frequency: c.postingFrequency,
      isUser: false,
    })),
  ];

  const scatterData = comparisonData.map((d) => ({
    x: d.followers,
    y: d.engagement,
    z: d.frequency * 100,
    name: d.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Competitor Analysis
        </h2>
        <p className="text-gray-500 mt-1">
          Analyze niche competitors, find outliers, and uncover winning strategies
        </p>
      </div>

      {/* Outlier Alert */}
      {outliers.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <Crown className="w-5 h-5 text-yellow-600" />
            <h3 className="text-sm font-semibold text-gray-900">
              Niche Outliers Detected
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            These accounts significantly outperform the niche average.
            Study their strategies for growth opportunities.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {outliers.map((outlier) => (
              <div
                key={outlier.profile.id}
                className="bg-white rounded-lg p-4 border border-yellow-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold">
                    {outlier.profile.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      @{outlier.profile.username}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(outlier.profile.followers / 1000).toFixed(1)}K
                      followers
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="text-center p-2 bg-yellow-50 rounded">
                    <p className="text-lg font-bold text-yellow-700">
                      {outlier.avgEngagementRate.toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-gray-500">Eng. Rate</p>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 rounded">
                    <p className="text-lg font-bold text-yellow-700">
                      {outlier.outlierScore.toFixed(1)}x
                    </p>
                    <p className="text-[10px] text-gray-500">Outlier</p>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 rounded">
                    <p className="text-lg font-bold text-yellow-700">
                      {outlier.growthRate?.toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-gray-500">Growth</p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Top Content Types
                  </p>
                  <div className="flex gap-1">
                    {outlier.topContentTypes.map((type) => (
                      <span
                        key={type.type}
                        className={clsx(
                          "text-[10px] px-2 py-0.5 rounded-full",
                          type.type === "REEL"
                            ? "bg-purple-100 text-purple-700"
                            : type.type === "CAROUSEL"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {type.type} ({type.percentage}%)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Chart */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Engagement Rate Comparison
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => v.split("(")[0].trim()}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="engagement" radius={[4, 4, 0, 0]}>
                {comparisonData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.isUser ? "#4263eb" : COLORS[i % COLORS.length]}
                    fillOpacity={entry.isUser ? 1 : 0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Followers vs Engagement (Bubble = Frequency)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
              <XAxis
                dataKey="x"
                name="Followers"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
              />
              <YAxis
                dataKey="y"
                name="Engagement"
                tick={{ fontSize: 11 }}
                unit="%"
              />
              <ZAxis dataKey="z" range={[50, 500]} />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === "Followers"
                    ? `${(value / 1000).toFixed(1)}K`
                    : `${value.toFixed(2)}%`
                }
              />
              <Scatter data={scatterData} fill="#4263eb">
                {scatterData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* All Competitors Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          All Niche Accounts
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 pb-3">
                  Account
                </th>
                <th className="text-right text-xs font-medium text-gray-500 pb-3">
                  Followers
                </th>
                <th className="text-right text-xs font-medium text-gray-500 pb-3">
                  Eng. Rate
                </th>
                <th className="text-right text-xs font-medium text-gray-500 pb-3">
                  Posts/Week
                </th>
                <th className="text-right text-xs font-medium text-gray-500 pb-3">
                  Growth
                </th>
                <th className="text-right text-xs font-medium text-gray-500 pb-3">
                  Outlier Score
                </th>
                <th className="text-center text-xs font-medium text-gray-500 pb-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {competitors.map((comp) => (
                <tr key={comp.profile.id} className="hover:bg-gray-50">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={clsx(
                          "w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs",
                          comp.isOutlier
                            ? "bg-gradient-to-br from-yellow-400 to-orange-500"
                            : "bg-gradient-to-br from-gray-400 to-gray-600"
                        )}
                      >
                        {comp.profile.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          @{comp.profile.username}
                        </p>
                        <p className="text-xs text-gray-500">
                          {comp.profile.fullName}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="text-right text-sm text-gray-700">
                    {(comp.profile.followers / 1000).toFixed(1)}K
                  </td>
                  <td className="text-right text-sm font-medium text-gray-900">
                    {comp.avgEngagementRate.toFixed(2)}%
                  </td>
                  <td className="text-right text-sm text-gray-700">
                    {comp.postingFrequency}
                  </td>
                  <td className="text-right">
                    <span
                      className={clsx(
                        "text-sm font-medium flex items-center justify-end gap-0.5",
                        (comp.growthRate || 0) > 0
                          ? "text-green-600"
                          : "text-red-500"
                      )}
                    >
                      {(comp.growthRate || 0) > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : null}
                      {comp.growthRate?.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-right text-sm font-medium text-gray-900">
                    {comp.outlierScore.toFixed(1)}
                  </td>
                  <td className="text-center">
                    {comp.isOutlier ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                        <Zap className="w-3 h-3" />
                        Outlier
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        Normal
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
