import type {
  InstagramPost,
  AnalyticsData,
  ContentTypeBreakdown,
  PerformanceInsight,
  NicheTrend,
  NicheCompetitor,
  InstagramProfile,
} from "@/types/instagram";

/**
 * Analyzes Instagram post performance to identify what's working,
 * why certain content outperforms, and what to create next.
 */
export class AnalysisEngine {
  /**
   * Full analytics breakdown of a user's posts
   */
  analyzeUserPosts(
    posts: InstagramPost[],
    profile: InstagramProfile
  ): AnalyticsData {
    const sorted = [...posts].sort(
      (a, b) => b.engagementRate - a.engagementRate
    );

    return {
      totalPosts: posts.length,
      avgEngagementRate: this.average(posts.map((p) => p.engagementRate)),
      bestPostingTimes: this.findBestPostingTimes(posts),
      topPerformingPosts: sorted.slice(0, 5),
      worstPerformingPosts: sorted.slice(-5).reverse(),
      contentTypePerformance: this.analyzeContentTypes(posts),
      hashtagPerformance: this.analyzeHashtags(posts),
      growthMetrics: this.calculateGrowthMetrics(posts),
      insights: this.generateInsights(posts, profile),
    };
  }

  /**
   * Identify why top posts outperform others
   */
  identifyOutperformanceFactors(
    posts: InstagramPost[]
  ): {
    factor: string;
    impact: number;
    description: string;
    examples: string[];
  }[] {
    const avgEngagement = this.average(posts.map((p) => p.engagementRate));
    const topPosts = posts.filter((p) => p.engagementRate > avgEngagement * 1.5);
    const bottomPosts = posts.filter(
      (p) => p.engagementRate < avgEngagement * 0.5
    );

    const factors: {
      factor: string;
      impact: number;
      description: string;
      examples: string[];
    }[] = [];

    // Factor: Content Type
    const typePerf = this.analyzeContentTypes(posts);
    const bestType = typePerf.sort(
      (a, b) => b.avgEngagement - a.avgEngagement
    )[0];
    if (bestType) {
      factors.push({
        factor: "Content Format",
        impact: bestType.avgEngagement / avgEngagement,
        description: `${bestType.type} posts get ${((bestType.avgEngagement / avgEngagement - 1) * 100).toFixed(0)}% more engagement than average`,
        examples: topPosts
          .filter((p) => p.mediaType === bestType.type)
          .slice(0, 3)
          .map((p) => p.shortcode),
      });
    }

    // Factor: Caption Length
    const topAvgLength =
      topPosts.length > 0
        ? this.average(topPosts.map((p) => p.caption.length))
        : 0;
    const bottomAvgLength =
      bottomPosts.length > 0
        ? this.average(bottomPosts.map((p) => p.caption.length))
        : 0;
    if (topAvgLength > 0) {
      factors.push({
        factor: "Caption Length",
        impact: topAvgLength > bottomAvgLength ? 1.2 : 0.8,
        description:
          topAvgLength > bottomAvgLength
            ? `Longer captions (avg ${Math.round(topAvgLength)} chars) correlate with higher engagement`
            : `Shorter captions (avg ${Math.round(topAvgLength)} chars) correlate with higher engagement`,
        examples: topPosts.slice(0, 2).map((p) => p.shortcode),
      });
    }

    // Factor: Hashtag Count
    const topAvgHashtags =
      topPosts.length > 0
        ? this.average(topPosts.map((p) => p.hashtags.length))
        : 0;
    const bottomAvgHashtags =
      bottomPosts.length > 0
        ? this.average(bottomPosts.map((p) => p.hashtags.length))
        : 0;
    factors.push({
      factor: "Hashtag Strategy",
      impact: topAvgHashtags > bottomAvgHashtags ? 1.15 : 0.9,
      description: `Top posts use ~${Math.round(topAvgHashtags)} hashtags vs ~${Math.round(bottomAvgHashtags)} in low performers`,
      examples: topPosts.slice(0, 2).map((p) => p.shortcode),
    });

    // Factor: Posting Time
    const bestTimes = this.findBestPostingTimes(posts);
    if (bestTimes.length > 0) {
      const best = bestTimes[0];
      factors.push({
        factor: "Posting Time",
        impact: best.engagement / avgEngagement,
        description: `Posts on ${best.day} at ${best.hour}:00 get the highest engagement`,
        examples: topPosts.slice(0, 2).map((p) => p.shortcode),
      });
    }

    // Factor: Questions in caption
    const topWithQuestions = topPosts.filter((p) =>
      p.caption.includes("?")
    ).length;
    const bottomWithQuestions = bottomPosts.filter((p) =>
      p.caption.includes("?")
    ).length;
    const topQuestionRate =
      topPosts.length > 0 ? topWithQuestions / topPosts.length : 0;
    const bottomQuestionRate =
      bottomPosts.length > 0 ? bottomWithQuestions / bottomPosts.length : 0;
    if (topQuestionRate > bottomQuestionRate) {
      factors.push({
        factor: "Call-to-Action / Questions",
        impact: 1.25,
        description: `${(topQuestionRate * 100).toFixed(0)}% of top posts include questions vs ${(bottomQuestionRate * 100).toFixed(0)}% of low performers`,
        examples: topPosts
          .filter((p) => p.caption.includes("?"))
          .slice(0, 2)
          .map((p) => p.shortcode),
      });
    }

    return factors.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Analyze competitors and find outliers in the niche
   */
  findNicheOutliers(competitors: NicheCompetitor[]): NicheCompetitor[] {
    if (competitors.length === 0) return [];

    const avgEngagement = this.average(
      competitors.map((c) => c.avgEngagementRate)
    );
    const stdDev = this.standardDeviation(
      competitors.map((c) => c.avgEngagementRate)
    );

    return competitors
      .map((competitor) => {
        const outlierScore =
          stdDev > 0
            ? (competitor.avgEngagementRate - avgEngagement) / stdDev
            : 0;
        return {
          ...competitor,
          outlierScore,
          isOutlier: outlierScore > 1.5, // 1.5 std deviations above mean
        };
      })
      .sort((a, b) => b.outlierScore - a.outlierScore);
  }

  /**
   * Identify trending topics in the niche
   */
  identifyNicheTrends(
    competitorPosts: InstagramPost[],
    timeframeDays: number = 30
  ): NicheTrend[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - timeframeDays);

    const recentPosts = competitorPosts.filter(
      (p) => new Date(p.timestamp) > cutoff
    );
    const olderPosts = competitorPosts.filter(
      (p) => new Date(p.timestamp) <= cutoff
    );

    // Analyze hashtag trends
    const recentHashtags = this.countHashtags(recentPosts);
    const olderHashtags = this.countHashtags(olderPosts);

    const trends: NicheTrend[] = [];

    for (const [hashtag, data] of Object.entries(recentHashtags)) {
      const oldData = olderHashtags[hashtag];
      const oldAvg = oldData ? oldData.totalEngagement / oldData.count : 0;
      const velocity = oldAvg > 0 ? data.totalEngagement / data.count / oldAvg - 1 : 1;

      if (data.count >= 3 && velocity > 0.1) {
        trends.push({
          id: `trend-${hashtag}`,
          topic: hashtag,
          trendScore: Math.min(velocity * 50 + data.count * 2, 100),
          velocity,
          volume: data.count,
          relatedHashtags: this.findRelatedHashtags(hashtag, recentPosts),
          topPosts: data.topPosts.slice(0, 3),
          nicheRelevance: Math.min(data.count / recentPosts.length * 100, 100),
          saturation: this.calculateSaturation(hashtag, recentPosts),
        });
      }
    }

    return trends.sort((a, b) => b.trendScore - a.trendScore).slice(0, 20);
  }

  // --- Private helpers ---

  private findBestPostingTimes(
    posts: InstagramPost[]
  ): { day: string; hour: number; engagement: number }[] {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const timeSlots: Record<string, { total: number; count: number }> = {};

    for (const post of posts) {
      const date = new Date(post.timestamp);
      const key = `${days[date.getUTCDay()]}-${date.getUTCHours()}`;
      if (!timeSlots[key]) timeSlots[key] = { total: 0, count: 0 };
      timeSlots[key].total += post.engagementRate;
      timeSlots[key].count += 1;
    }

    return Object.entries(timeSlots)
      .map(([key, val]) => {
        const [day, hour] = key.split("-");
        return { day, hour: parseInt(hour), engagement: val.total / val.count };
      })
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 10);
  }

  private analyzeContentTypes(posts: InstagramPost[]): ContentTypeBreakdown[] {
    const types: Record<string, { count: number; totalEngagement: number }> = {};

    for (const post of posts) {
      const type = post.isReel ? "REEL" : post.mediaType;
      if (!types[type]) types[type] = { count: 0, totalEngagement: 0 };
      types[type].count += 1;
      types[type].totalEngagement += post.engagementRate;
    }

    return Object.entries(types).map(([type, data]) => ({
      type,
      count: data.count,
      avgEngagement: data.totalEngagement / data.count,
      percentage: (data.count / posts.length) * 100,
    }));
  }

  private analyzeHashtags(
    posts: InstagramPost[]
  ): { hashtag: string; avgEngagement: number; uses: number }[] {
    const hashtags: Record<string, { total: number; count: number }> = {};

    for (const post of posts) {
      for (const tag of post.hashtags) {
        if (!hashtags[tag]) hashtags[tag] = { total: 0, count: 0 };
        hashtags[tag].total += post.engagementRate;
        hashtags[tag].count += 1;
      }
    }

    return Object.entries(hashtags)
      .map(([hashtag, data]) => ({
        hashtag,
        avgEngagement: data.total / data.count,
        uses: data.count,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 30);
  }

  private calculateGrowthMetrics(
    posts: InstagramPost[]
  ): { date: string; followers: number; engagement: number }[] {
    const sorted = [...posts].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const weeklyData: Record<string, { totalEngagement: number; count: number }> = {};

    for (const post of sorted) {
      const date = new Date(post.timestamp);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toISOString().split("T")[0];

      if (!weeklyData[key]) weeklyData[key] = { totalEngagement: 0, count: 0 };
      weeklyData[key].totalEngagement += post.engagementRate;
      weeklyData[key].count += 1;
    }

    return Object.entries(weeklyData).map(([date, data]) => ({
      date,
      followers: 0, // would need historical data
      engagement: data.totalEngagement / data.count,
    }));
  }

  private generateInsights(
    posts: InstagramPost[],
    _profile: InstagramProfile
  ): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];
    const avgEngagement = this.average(posts.map((p) => p.engagementRate));
    const recentPosts = posts.slice(0, 10);
    const recentAvg = this.average(recentPosts.map((p) => p.engagementRate));

    // Trend detection
    if (recentAvg > avgEngagement * 1.2) {
      insights.push({
        id: "trend-up",
        type: "trend",
        title: "Engagement Trending Up",
        description: `Your recent posts are getting ${((recentAvg / avgEngagement - 1) * 100).toFixed(0)}% more engagement than your average.`,
        metric: "engagementRate",
        value: recentAvg,
        change: ((recentAvg / avgEngagement - 1) * 100),
        recommendation: "Keep doing what you're doing! Analyze your recent top posts to double down on what's working.",
        relatedPosts: recentPosts
          .filter((p) => p.engagementRate > avgEngagement)
          .map((p) => p.id),
      });
    } else if (recentAvg < avgEngagement * 0.8) {
      insights.push({
        id: "trend-down",
        type: "warning",
        title: "Engagement Declining",
        description: `Your recent posts are getting ${((1 - recentAvg / avgEngagement) * 100).toFixed(0)}% less engagement than your average.`,
        metric: "engagementRate",
        value: recentAvg,
        change: -((1 - recentAvg / avgEngagement) * 100),
        recommendation: "Consider trying different content formats or revisiting your top-performing content themes.",
        relatedPosts: recentPosts.map((p) => p.id),
      });
    }

    // Content type opportunity
    const typePerf = this.analyzeContentTypes(posts);
    const underusedHighPerf = typePerf.filter(
      (t) => t.avgEngagement > avgEngagement * 1.3 && t.percentage < 20
    );
    for (const type of underusedHighPerf) {
      insights.push({
        id: `opportunity-${type.type}`,
        type: "opportunity",
        title: `Underutilized ${type.type} Format`,
        description: `${type.type} posts get ${((type.avgEngagement / avgEngagement - 1) * 100).toFixed(0)}% more engagement but only make up ${type.percentage.toFixed(0)}% of your content.`,
        metric: "contentType",
        value: type.avgEngagement,
        change: type.avgEngagement / avgEngagement - 1,
        recommendation: `Increase your ${type.type} content from ${type.percentage.toFixed(0)}% to at least 30% of your posts.`,
        relatedPosts: posts
          .filter((p) => p.mediaType === type.type || (type.type === "REEL" && p.isReel))
          .slice(0, 3)
          .map((p) => p.id),
      });
    }

    return insights;
  }

  private countHashtags(
    posts: InstagramPost[]
  ): Record<
    string,
    { count: number; totalEngagement: number; topPosts: InstagramPost[] }
  > {
    const result: Record<
      string,
      { count: number; totalEngagement: number; topPosts: InstagramPost[] }
    > = {};

    for (const post of posts) {
      for (const tag of post.hashtags) {
        if (!result[tag]) result[tag] = { count: 0, totalEngagement: 0, topPosts: [] };
        result[tag].count += 1;
        result[tag].totalEngagement += post.engagementRate;
        result[tag].topPosts.push(post);
        result[tag].topPosts.sort(
          (a, b) => b.engagementRate - a.engagementRate
        );
        if (result[tag].topPosts.length > 5) result[tag].topPosts.pop();
      }
    }

    return result;
  }

  private findRelatedHashtags(
    hashtag: string,
    posts: InstagramPost[]
  ): string[] {
    const related: Record<string, number> = {};
    const postsWithTag = posts.filter((p) => p.hashtags.includes(hashtag));

    for (const post of postsWithTag) {
      for (const tag of post.hashtags) {
        if (tag !== hashtag) {
          related[tag] = (related[tag] || 0) + 1;
        }
      }
    }

    return Object.entries(related)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  }

  private calculateSaturation(hashtag: string, posts: InstagramPost[]): number {
    const withTag = posts.filter((p) => p.hashtags.includes(hashtag));
    return Math.min((withTag.length / posts.length) * 100, 100);
  }

  private average(nums: number[]): number {
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  private standardDeviation(nums: number[]): number {
    const avg = this.average(nums);
    const squareDiffs = nums.map((n) => Math.pow(n - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  }
}
