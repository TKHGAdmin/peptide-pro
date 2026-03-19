import type {
  InstagramPost,
  BrandProfile,
  ContentSuggestion,
  NicheTrend,
  NicheCompetitor,
  AnalyticsData,
} from "@/types/instagram";

/**
 * Generates content suggestions based on:
 * - User's top-performing content patterns
 * - Niche trends and competitor analysis
 * - Brand alignment requirements
 * - Optimal posting times
 */
export class ContentSuggester {
  generateSuggestions(
    analytics: AnalyticsData,
    brand: BrandProfile,
    trends: NicheTrend[],
    competitors: NicheCompetitor[],
    count: number = 10
  ): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];

    // 1. Trend-based suggestions
    for (const trend of trends.slice(0, 3)) {
      suggestions.push(this.createTrendSuggestion(trend, brand, analytics));
    }

    // 2. Outperformance-based suggestions (replicate what works)
    for (const post of analytics.topPerformingPosts.slice(0, 3)) {
      suggestions.push(this.createReplicateSuggestion(post, brand, analytics));
    }

    // 3. Competitor-inspired suggestions (from outliers)
    const outliers = competitors.filter((c) => c.isOutlier);
    for (const outlier of outliers.slice(0, 2)) {
      const topPost = outlier.posts.sort(
        (a, b) => b.engagementRate - a.engagementRate
      )[0];
      if (topPost) {
        suggestions.push(
          this.createCompetitorInspiredSuggestion(topPost, outlier, brand, analytics)
        );
      }
    }

    // 4. Content gap suggestions
    const gaps = this.identifyContentGaps(analytics, brand);
    for (const gap of gaps.slice(0, 2)) {
      suggestions.push(gap);
    }

    return suggestions
      .slice(0, count)
      .map((s, i) => ({ ...s, id: `suggestion-${i + 1}` }));
  }

  private createTrendSuggestion(
    trend: NicheTrend,
    brand: BrandProfile,
    analytics: AnalyticsData
  ): ContentSuggestion {
    const bestTime = analytics.bestPostingTimes[0];
    const topTrendPost = trend.topPosts[0];
    const contentType = this.pickBestFormat(brand, analytics);

    return {
      id: "",
      title: `Trending: ${trend.topic.replace("#", "")}`,
      description: `Capitalize on the trending topic "${trend.topic}" which has a trend score of ${trend.trendScore.toFixed(0)} and is growing ${(trend.velocity * 100).toFixed(0)}% faster than baseline.`,
      contentType,
      suggestedCaption: this.generateCaption(
        trend.topic,
        brand,
        topTrendPost?.caption || ""
      ),
      suggestedHashtags: [
        trend.topic,
        ...trend.relatedHashtags.slice(0, 8),
      ],
      bestTimeToPost: bestTime
        ? `${bestTime.day} at ${bestTime.hour}:00`
        : "Wednesday at 12:00",
      estimatedEngagement:
        analytics.avgEngagementRate * (1 + trend.velocity * 0.5),
      inspirationSource: `Trending topic with ${trend.volume} recent uses`,
      trendScore: trend.trendScore,
      brandAlignmentScore: 0,
      contentPillar: brand.contentPillars[0] || "trending",
      status: "suggested",
      reasoning: `This topic is trending in your niche with a velocity of ${(trend.velocity * 100).toFixed(0)}%. Low saturation (${trend.saturation.toFixed(0)}%) means there's room to stand out.`,
    };
  }

  private createReplicateSuggestion(
    post: InstagramPost,
    brand: BrandProfile,
    analytics: AnalyticsData
  ): ContentSuggestion {
    const bestTime = analytics.bestPostingTimes[0];

    return {
      id: "",
      title: `Replicate Success: ${post.mediaType} Style`,
      description: `Create content similar to your top-performing ${post.mediaType.toLowerCase()} post that achieved ${post.engagementRate.toFixed(2)}% engagement.`,
      contentType: post.isReel ? "REEL" : post.mediaType,
      suggestedCaption: this.remixCaption(post.caption, brand),
      suggestedHashtags: [
        ...post.hashtags.slice(0, 10),
        ...this.getBrandHashtags(brand).slice(0, 5),
      ],
      bestTimeToPost: bestTime
        ? `${bestTime.day} at ${bestTime.hour}:00`
        : "Tuesday at 11:00",
      estimatedEngagement: post.engagementRate * 0.8,
      inspirationSource: `Your top post (${post.shortcode})`,
      trendScore: 50,
      brandAlignmentScore: 0,
      contentPillar: brand.contentPillars[0] || "proven",
      status: "suggested",
      reasoning: `This mirrors the format and style of your post that got ${post.likes} likes and ${post.comments} comments. Replicating successful patterns is a proven growth strategy.`,
    };
  }

  private createCompetitorInspiredSuggestion(
    post: InstagramPost,
    competitor: NicheCompetitor,
    brand: BrandProfile,
    analytics: AnalyticsData
  ): ContentSuggestion {
    const bestTime = analytics.bestPostingTimes[0];

    return {
      id: "",
      title: `Niche Outlier Insight: @${competitor.profile.username}`,
      description: `Inspired by a viral post from @${competitor.profile.username} (outlier score: ${competitor.outlierScore.toFixed(1)}) who achieves ${competitor.avgEngagementRate.toFixed(2)}% avg engagement.`,
      contentType: post.isReel ? "REEL" : post.mediaType,
      suggestedCaption: this.adaptCompetitorCaption(post.caption, brand),
      suggestedHashtags: [
        ...post.hashtags.slice(0, 5),
        ...this.getBrandHashtags(brand).slice(0, 5),
      ],
      bestTimeToPost: bestTime
        ? `${bestTime.day} at ${bestTime.hour}:00`
        : "Thursday at 10:00",
      estimatedEngagement:
        analytics.avgEngagementRate * (1 + competitor.outlierScore * 0.2),
      inspirationSource: `@${competitor.profile.username} (niche outlier)`,
      trendScore: 60 + competitor.outlierScore * 10,
      brandAlignmentScore: 0,
      contentPillar: brand.contentPillars[0] || "competitive",
      status: "suggested",
      reasoning: `@${competitor.profile.username} consistently outperforms the niche average by ${((competitor.avgEngagementRate / analytics.avgEngagementRate - 1) * 100).toFixed(0)}%. This post format could work well adapted to your brand voice.`,
    };
  }

  private identifyContentGaps(
    analytics: AnalyticsData,
    brand: BrandProfile
  ): ContentSuggestion[] {
    const gaps: ContentSuggestion[] = [];

    // Check for underused high-performing content types
    for (const insight of analytics.insights) {
      if (insight.type === "opportunity") {
        gaps.push({
          id: "",
          title: `Content Gap: ${insight.title}`,
          description: insight.description,
          contentType: "CAROUSEL",
          suggestedCaption: `Share your expertise through a ${insight.metric} post. Your audience responds well to this format!`,
          suggestedHashtags: this.getBrandHashtags(brand),
          bestTimeToPost:
            analytics.bestPostingTimes[0]
              ? `${analytics.bestPostingTimes[0].day} at ${analytics.bestPostingTimes[0].hour}:00`
              : "Monday at 9:00",
          estimatedEngagement: insight.value,
          inspirationSource: "Content gap analysis",
          trendScore: 40,
          brandAlignmentScore: 80,
          contentPillar:
            brand.contentPillars[
              Math.floor(Math.random() * brand.contentPillars.length)
            ] || "variety",
          status: "suggested",
          reasoning: insight.recommendation,
        });
      }
    }

    // Check if any content pillar is underrepresented
    for (const pillar of brand.contentPillars) {
      gaps.push({
        id: "",
        title: `Pillar Focus: ${pillar}`,
        description: `Create content around your "${pillar}" content pillar to maintain brand consistency.`,
        contentType: this.pickBestFormat(brand, analytics),
        suggestedCaption: `Share your thoughts on ${pillar}. Your audience wants to hear from you!`,
        suggestedHashtags: [`#${pillar.replace(/\s+/g, "")}`, ...this.getBrandHashtags(brand).slice(0, 5)],
        bestTimeToPost:
          analytics.bestPostingTimes[1]
            ? `${analytics.bestPostingTimes[1].day} at ${analytics.bestPostingTimes[1].hour}:00`
            : "Friday at 14:00",
        estimatedEngagement: analytics.avgEngagementRate,
        inspirationSource: "Content pillar strategy",
        trendScore: 30,
        brandAlignmentScore: 90,
        contentPillar: pillar,
        status: "suggested",
        reasoning: `Maintaining a consistent mix of content pillars helps build authority and keeps your feed diverse.`,
      });
    }

    return gaps;
  }

  private pickBestFormat(
    brand: BrandProfile,
    analytics: AnalyticsData
  ): "IMAGE" | "VIDEO" | "CAROUSEL" | "REEL" {
    const typePerf = analytics.contentTypePerformance;
    if (typePerf.length === 0) return brand.postingStyle.preferredFormats[0] as "IMAGE" | "VIDEO" | "CAROUSEL" | "REEL" || "CAROUSEL";

    const best = typePerf.sort((a, b) => b.avgEngagement - a.avgEngagement)[0];
    if (best.type === "REEL") return "REEL";
    return best.type as "IMAGE" | "VIDEO" | "CAROUSEL";
  }

  private generateCaption(
    topic: string,
    brand: BrandProfile,
    _inspiration: string
  ): string {
    const tone = brand.toneOfVoice[0] || "informative";
    const cta =
      brand.postingStyle.ctaStyle === "question"
        ? `\n\nWhat are your thoughts on ${topic}? Drop a comment below!`
        : brand.postingStyle.ctaStyle === "engagement-prompt"
        ? `\n\nSave this for later and share with someone who needs to see this!`
        : `\n\nLink in bio for more.`;

    return `[Write a ${tone} caption about ${topic} that aligns with your brand voice]${cta}`;
  }

  private remixCaption(original: string, brand: BrandProfile): string {
    // Create a template based on the original structure
    const hasQuestion = original.includes("?");
    const emojiRegex = new RegExp("[\u{1F600}-\u{1F6FF}]", "u");
    const hasEmojis = emojiRegex.test(original);
    const lineCount = original.split("\n").length;

    let template = `[Remix this ${lineCount > 3 ? "long-form" : "short"} caption style`;
    if (hasQuestion) template += " with an engaging question";
    if (hasEmojis && brand.postingStyle.emojiUsage !== "none")
      template += " using emojis";
    template += "]";

    return template;
  }

  private adaptCompetitorCaption(
    _original: string,
    brand: BrandProfile
  ): string {
    return `[Adapt this concept to your ${brand.toneOfVoice[0] || "authentic"} brand voice. Focus on your unique perspective on this topic.]`;
  }

  private getBrandHashtags(brand: BrandProfile): string[] {
    return [
      `#${brand.username}`,
      ...brand.brandKeywords.slice(0, 5).map((kw) => `#${kw.replace(/\s+/g, "")}`),
      ...brand.subNiches.slice(0, 3).map((n) => `#${n}`),
    ];
  }
}
