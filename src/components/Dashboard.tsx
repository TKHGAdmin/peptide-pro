"use client";

import { useAppStore } from "@/store/app-store";
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  MessageCircle,
  Calendar,
  Zap,
  Target,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#4263eb", "#40c057", "#fab005", "#fa5252", "#7950f2"];

export default function Dashboard() {
  const { profile, analytics, posts, calendarEvents, suggestions, trends } =
    useAppStore();

  if (!profile || !analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Load demo data to see your dashboard</p>
      </div>
    );
  }

  const upcomingEvents = calendarEvents
    .filter((e) => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">
          Overview of your Instagram performance and content strategy
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Followers"
          value={`${(profile.followers / 1000).toFixed(1)}K`}
          change={8.2}
          icon={<Eye className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          label="Avg Engagement"
          value={`${analytics.avgEngagementRate.toFixed(2)}%`}
          change={18}
          icon={<Heart className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          label="Total Posts"
          value={analytics.totalPosts.toString()}
          change={0}
          icon={<MessageCircle className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          label="Scheduled"
          value={calendarEvents.filter((e) => e.status === "scheduled").length.toString()}
          change={0}
          icon={<Calendar className="w-5 h-5" />}
          color="orange"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Engagement Over Time */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Engagement Over Time
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={analytics.growthMetrics}>
              <defs>
                <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4263eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4263eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="engagement"
                stroke="#4263eb"
                fill="url(#engGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Content Type Performance */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Content Type Performance
          </h3>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={analytics.contentTypePerformance}
                  dataKey="percentage"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {analytics.contentTypePerformance.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {analytics.contentTypePerformance.map((type, i) => (
                <div key={type.type} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: COLORS[i] }}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {type.type}
                    </p>
                    <p className="text-xs text-gray-500">
                      {type.avgEngagement.toFixed(2)}% avg eng
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Insights */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            Key Insights
          </h3>
          <div className="space-y-3">
            {analytics.insights.map((insight) => (
              <div
                key={insight.id}
                className="p-3 rounded-lg bg-gray-50 border border-gray-100"
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      insight.type === "trend"
                        ? "bg-green-500"
                        : insight.type === "opportunity"
                        ? "bg-blue-500"
                        : insight.type === "warning"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {insight.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Content */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-600" />
            Upcoming Content
          </h3>
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
              >
                <div
                  className={`w-2 h-8 rounded-full ${
                    event.status === "scheduled"
                      ? "bg-green-400"
                      : "bg-gray-300"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {event.suggestion.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(event.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    at {event.time}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    event.suggestion.contentType === "REEL"
                      ? "bg-purple-100 text-purple-700"
                      : event.suggestion.contentType === "CAROUSEL"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {event.suggestion.contentType}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Trending Topics */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-red-500" />
            Trending in Your Niche
          </h3>
          <div className="space-y-3">
            {trends.slice(0, 5).map((trend) => (
              <div
                key={trend.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {trend.topic}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">
                      Score: {trend.trendScore}
                    </span>
                    <span className="text-xs text-green-600 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" />+
                      {(trend.velocity * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full"
                      style={{ width: `${trend.saturation}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {trend.saturation}% saturated
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Best Posting Times */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Best Posting Times
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={analytics.bestPostingTimes.slice(0, 7)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => v.slice(0, 3)}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="engagement" fill="#4263eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  change,
  icon,
  color,
}: {
  label: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}
        >
          {icon}
        </div>
      </div>
      <div className="mt-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {change !== 0 && (
          <span
            className={`ml-2 text-sm font-medium ${
              change > 0 ? "text-green-600" : "text-red-500"
            }`}
          >
            {change > 0 ? (
              <TrendingUp className="w-3 h-3 inline mr-0.5" />
            ) : (
              <TrendingDown className="w-3 h-3 inline mr-0.5" />
            )}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
