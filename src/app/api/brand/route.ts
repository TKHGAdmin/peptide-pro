import { NextRequest, NextResponse } from "next/server";
import { BrandAnalyzer } from "@/lib/brand-analyzer";
import type { InstagramPost, InstagramProfile, BrandProfile, ContentSuggestion } from "@/types/instagram";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, posts, profile, brand, suggestion } = body as {
      action: string;
      posts?: InstagramPost[];
      profile?: InstagramProfile;
      brand?: BrandProfile;
      suggestion?: ContentSuggestion;
    };

    const analyzer = new BrandAnalyzer();

    switch (action) {
      case "extract": {
        if (!posts || !profile) {
          return NextResponse.json(
            { error: "Posts and profile are required" },
            { status: 400 }
          );
        }
        const brandProfile = analyzer.extractBrandProfile(profile, posts);
        return NextResponse.json({ brand: brandProfile });
      }

      case "score": {
        if (!suggestion || !brand) {
          return NextResponse.json(
            { error: "Suggestion and brand are required" },
            { status: 400 }
          );
        }
        const score = analyzer.scoreBrandAlignment(suggestion, brand);
        return NextResponse.json({ score });
      }

      case "align": {
        if (!suggestion || !brand) {
          return NextResponse.json(
            { error: "Suggestion and brand are required" },
            { status: 400 }
          );
        }
        const aligned = analyzer.alignSuggestionWithBrand(suggestion, brand);
        return NextResponse.json({ suggestion: aligned });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: extract, score, align" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Brand analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze brand" },
      { status: 500 }
    );
  }
}
