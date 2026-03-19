import { NextRequest, NextResponse } from "next/server";
import { InstagramScraper, calculateEngagementRates } from "@/lib/instagram-scraper";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, action, username, hashtag, limit } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 }
      );
    }

    const scraper = new InstagramScraper(accessToken);

    switch (action) {
      case "profile": {
        const profile = await scraper.fetchUserProfile();
        return NextResponse.json({ profile });
      }

      case "posts": {
        const profile = await scraper.fetchUserProfile();
        const rawPosts = await scraper.fetchUserPosts("me", limit || 50);
        const posts = calculateEngagementRates(rawPosts, profile.followers);
        return NextResponse.json({ posts, profile });
      }

      case "competitor": {
        if (!username) {
          return NextResponse.json(
            { error: "Username is required for competitor scraping" },
            { status: 400 }
          );
        }
        const data = await scraper.fetchCompetitorPublicData(username);
        if (!data) {
          return NextResponse.json(
            { error: `Could not fetch data for @${username}` },
            { status: 404 }
          );
        }
        const competitorPosts = calculateEngagementRates(
          data.posts,
          data.profile.followers
        );
        return NextResponse.json({
          profile: data.profile,
          posts: competitorPosts,
        });
      }

      case "hashtag": {
        if (!hashtag) {
          return NextResponse.json(
            { error: "Hashtag is required" },
            { status: 400 }
          );
        }
        const posts = await scraper.searchHashtag(hashtag, limit || 30);
        return NextResponse.json({ posts });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: profile, posts, competitor, hashtag" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Instagram API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Instagram data" },
      { status: 500 }
    );
  }
}
