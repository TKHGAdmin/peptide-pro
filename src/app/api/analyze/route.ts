import { NextRequest, NextResponse } from "next/server";
import { AnalysisEngine } from "@/lib/analysis-engine";
import type { InstagramPost, InstagramProfile, NicheCompetitor } from "@/types/instagram";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, posts, profile, competitors, timeframeDays } = body as {
      action: string;
      posts?: InstagramPost[];
      profile?: InstagramProfile;
      competitors?: NicheCompetitor[];
      timeframeDays?: number;
    };

    const engine = new AnalysisEngine();

    switch (action) {
      case "full-analysis": {
        if (!posts || !profile) {
          return NextResponse.json(
            { error: "Posts and profile are required" },
            { status: 400 }
          );
        }
        const analytics = engine.analyzeUserPosts(posts, profile);
        return NextResponse.json({ analytics });
      }

      case "outperformance": {
        if (!posts) {
          return NextResponse.json(
            { error: "Posts are required" },
            { status: 400 }
          );
        }
        const factors = engine.identifyOutperformanceFactors(posts);
        return NextResponse.json({ factors });
      }

      case "outliers": {
        if (!competitors) {
          return NextResponse.json(
            { error: "Competitors are required" },
            { status: 400 }
          );
        }
        const outliers = engine.findNicheOutliers(competitors);
        return NextResponse.json({ outliers });
      }

      case "trends": {
        if (!posts) {
          return NextResponse.json(
            { error: "Posts are required" },
            { status: 400 }
          );
        }
        const trends = engine.identifyNicheTrends(posts, timeframeDays || 30);
        return NextResponse.json({ trends });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: full-analysis, outperformance, outliers, trends" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze data" },
      { status: 500 }
    );
  }
}
