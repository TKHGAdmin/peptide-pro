import type {
  InstagramPost,
  InstagramProfile,
} from "@/types/instagram";

/**
 * Instagram data fetcher using the Instagram Graph API.
 *
 * To use this in production, you need:
 * 1. A Facebook Developer App
 * 2. Instagram Business or Creator account
 * 3. A valid access token with instagram_basic, instagram_manage_insights permissions
 *
 * For competitor scraping, this uses public profile data available via
 * the Instagram Basic Display API and hashtag search endpoints.
 */

const GRAPH_API_BASE = "https://graph.instagram.com/v18.0";
const GRAPH_FB_API_BASE = "https://graph.facebook.com/v18.0";

export class InstagramScraper {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async fetchUserProfile(userId: string = "me"): Promise<InstagramProfile> {
    const url = `${GRAPH_API_BASE}/${userId}?fields=id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,account_type&access_token=${this.accessToken}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      username: data.username,
      fullName: data.name || data.username,
      biography: data.biography || "",
      profilePicUrl: data.profile_picture_url || "",
      followers: data.followers_count || 0,
      following: data.follows_count || 0,
      postsCount: data.media_count || 0,
      isVerified: false,
      category: data.account_type,
    };
  }

  async fetchUserPosts(
    userId: string = "me",
    limit: number = 50
  ): Promise<InstagramPost[]> {
    const fields =
      "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink,shortcode";
    let url = `${GRAPH_API_BASE}/${userId}/media?fields=${fields}&limit=${Math.min(limit, 100)}&access_token=${this.accessToken}`;

    const posts: InstagramPost[] = [];

    while (url && posts.length < limit) {
      const response = await fetch(url);
      if (!response.ok) break;

      const data = await response.json();
      for (const item of data.data || []) {
        posts.push(this.transformPost(item));
      }

      url = data.paging?.next || null;
    }

    return posts.slice(0, limit);
  }

  async fetchPostInsights(postId: string): Promise<Record<string, number>> {
    const url = `${GRAPH_API_BASE}/${postId}/insights?metric=engagement,impressions,reach,saved&access_token=${this.accessToken}`;

    try {
      const response = await fetch(url);
      if (!response.ok) return {};

      const data = await response.json();
      const insights: Record<string, number> = {};
      for (const metric of data.data || []) {
        insights[metric.name] = metric.values?.[0]?.value || 0;
      }
      return insights;
    } catch {
      return {};
    }
  }

  async searchHashtag(
    hashtag: string,
    limit: number = 30
  ): Promise<InstagramPost[]> {
    // First, get the hashtag ID
    const searchUrl = `${GRAPH_FB_API_BASE}/ig_hashtag_search?q=${encodeURIComponent(hashtag)}&user_id=me&access_token=${this.accessToken}`;

    try {
      const searchResponse = await fetch(searchUrl);
      if (!searchResponse.ok) return [];

      const searchData = await searchResponse.json();
      const hashtagId = searchData.data?.[0]?.id;
      if (!hashtagId) return [];

      // Then fetch top media for this hashtag
      const mediaUrl = `${GRAPH_FB_API_BASE}/${hashtagId}/top_media?user_id=me&fields=id,caption,media_type,like_count,comments_count,timestamp,permalink&limit=${limit}&access_token=${this.accessToken}`;

      const mediaResponse = await fetch(mediaUrl);
      if (!mediaResponse.ok) return [];

      const mediaData = await mediaResponse.json();
      return (mediaData.data || []).map((item: Record<string, unknown>) =>
        this.transformPost(item)
      );
    } catch {
      return [];
    }
  }

  async fetchCompetitorPublicData(
    username: string
  ): Promise<{ profile: InstagramProfile; posts: InstagramPost[] } | null> {
    // Use the business discovery API to fetch competitor data
    const url = `${GRAPH_API_BASE}/me?fields=business_discovery.fields(id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,media.limit(50){id,caption,media_type,like_count,comments_count,timestamp,media_url,permalink})&username=${username}&access_token=${this.accessToken}`;

    try {
      const response = await fetch(url);
      if (!response.ok) return null;

      const data = await response.json();
      const discovery = data.business_discovery;
      if (!discovery) return null;

      const profile: InstagramProfile = {
        id: discovery.id,
        username: discovery.username,
        fullName: discovery.name || discovery.username,
        biography: discovery.biography || "",
        profilePicUrl: discovery.profile_picture_url || "",
        followers: discovery.followers_count || 0,
        following: discovery.follows_count || 0,
        postsCount: discovery.media_count || 0,
        isVerified: false,
      };

      const posts = (discovery.media?.data || []).map(
        (item: Record<string, unknown>) => this.transformPost(item)
      );

      return { profile, posts };
    } catch {
      return null;
    }
  }

  private transformPost(item: Record<string, unknown>): InstagramPost {
    const caption = (item.caption as string) || "";
    const hashtags = caption.match(/#\w+/g) || [];
    const mentions = caption.match(/@\w+/g) || [];
    const likes = (item.like_count as number) || 0;
    const comments = (item.comments_count as number) || 0;
    const mediaType = item.media_type as string;

    return {
      id: item.id as string,
      shortcode: (item.shortcode as string) || (item.permalink as string)?.split("/p/")?.[1]?.replace("/", "") || "",
      caption,
      mediaType: this.normalizeMediaType(mediaType),
      mediaUrl: (item.media_url as string) || "",
      thumbnailUrl: (item.thumbnail_url as string) || undefined,
      timestamp: (item.timestamp as string) || new Date().toISOString(),
      likes,
      comments,
      engagementRate: 0, // calculated after we know follower count
      hashtags: hashtags.map((h) => h.toLowerCase()),
      mentions: mentions.map((m) => m.toLowerCase()),
      isReel: mediaType === "VIDEO",
      videoViews: (item.video_views as number) || undefined,
    };
  }

  private normalizeMediaType(
    type: string
  ): "IMAGE" | "VIDEO" | "CAROUSEL" {
    switch (type) {
      case "VIDEO":
        return "VIDEO";
      case "CAROUSEL_ALBUM":
        return "CAROUSEL";
      default:
        return "IMAGE";
    }
  }
}

/** Calculate engagement rate for posts given a follower count */
export function calculateEngagementRates(
  posts: InstagramPost[],
  followers: number
): InstagramPost[] {
  return posts.map((post) => ({
    ...post,
    engagementRate:
      followers > 0
        ? ((post.likes + post.comments) / followers) * 100
        : 0,
  }));
}
