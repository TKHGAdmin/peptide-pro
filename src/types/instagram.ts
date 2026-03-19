export interface InstagramPost {
  id: string;
  shortcode: string;
  caption: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL";
  mediaUrl: string;
  thumbnailUrl?: string;
  timestamp: string;
  likes: number;
  comments: number;
  shares?: number;
  saves?: number;
  reach?: number;
  impressions?: number;
  engagementRate: number;
  hashtags: string[];
  mentions: string[];
  isReel: boolean;
  videoViews?: number;
  videoDuration?: number;
}

export interface InstagramProfile {
  id: string;
  username: string;
  fullName: string;
  biography: string;
  profilePicUrl: string;
  followers: number;
  following: number;
  postsCount: number;
  isVerified: boolean;
  category?: string;
  externalUrl?: string;
}

export interface NicheCompetitor {
  profile: InstagramProfile;
  posts: InstagramPost[];
  avgEngagementRate: number;
  postingFrequency: number; // posts per week
  topContentTypes: ContentTypeBreakdown[];
  growthRate?: number;
  isOutlier: boolean;
  outlierScore: number;
}

export interface ContentTypeBreakdown {
  type: string;
  count: number;
  avgEngagement: number;
  percentage: number;
}

export interface BrandProfile {
  id: string;
  name: string;
  username: string;
  colorPalette: string[];
  toneOfVoice: string[];
  contentPillars: string[];
  targetAudience: string;
  niche: string;
  subNiches: string[];
  brandKeywords: string[];
  avoidKeywords: string[];
  postingStyle: PostingStyle;
}

export interface PostingStyle {
  preferredFormats: string[];
  captionLength: "short" | "medium" | "long";
  hashtagStrategy: "minimal" | "moderate" | "maximal";
  emojiUsage: "none" | "light" | "heavy";
  ctaStyle: string;
}

export interface ContentSuggestion {
  id: string;
  title: string;
  description: string;
  contentType: "IMAGE" | "VIDEO" | "CAROUSEL" | "REEL";
  suggestedCaption: string;
  suggestedHashtags: string[];
  bestTimeToPost: string;
  estimatedEngagement: number;
  inspirationSource: string;
  trendScore: number;
  brandAlignmentScore: number;
  contentPillar: string;
  status: "suggested" | "scheduled" | "published" | "rejected";
  scheduledDate?: string;
  scheduledTime?: string;
  reasoning: string;
}

export interface CalendarEvent {
  id: string;
  date: string;
  time: string;
  suggestion: ContentSuggestion;
  status: "draft" | "scheduled" | "published";
  notes?: string;
}

export interface PerformanceInsight {
  id: string;
  type: "trend" | "anomaly" | "opportunity" | "warning";
  title: string;
  description: string;
  metric: string;
  value: number;
  change: number;
  recommendation: string;
  relatedPosts: string[];
}

export interface NicheTrend {
  id: string;
  topic: string;
  trendScore: number;
  velocity: number; // how fast it's growing
  volume: number;
  relatedHashtags: string[];
  topPosts: InstagramPost[];
  nicheRelevance: number;
  saturation: number;
}

export interface AnalyticsData {
  totalPosts: number;
  avgEngagementRate: number;
  bestPostingTimes: { day: string; hour: number; engagement: number }[];
  topPerformingPosts: InstagramPost[];
  worstPerformingPosts: InstagramPost[];
  contentTypePerformance: ContentTypeBreakdown[];
  hashtagPerformance: { hashtag: string; avgEngagement: number; uses: number }[];
  growthMetrics: { date: string; followers: number; engagement: number }[];
  insights: PerformanceInsight[];
}
