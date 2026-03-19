import { NextRequest, NextResponse } from "next/server";
import { ContentSuggester } from "@/lib/content-suggester";
import { BrandAnalyzer } from "@/lib/brand-analyzer";
import type { AnalyticsData, BrandProfile, NicheTrend, NicheCompetitor, ContentSuggestion } from "@/types/instagram";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { analytics, brand, trends, competitors, count } = body as {
      analytics: AnalyticsData;
      brand: BrandProfile;
      trends: NicheTrend[];
      competitors: NicheCompetitor[];
      count?: number;
    };

    if (!analytics || !brand) {
      return NextResponse.json(
        { error: "Analytics and brand data are required" },
        { status: 400 }
      );
    }

    const suggester = new ContentSuggester();
    const brandAnalyzer = new BrandAnalyzer();

    let suggestions = suggester.generateSuggestions(
      analytics,
      brand,
      trends || [],
      competitors || [],
      count || 10
    );

    // Score and align each suggestion with brand
    suggestions = suggestions.map((s) => {
      const aligned = brandAnalyzer.alignSuggestionWithBrand(s, brand);
      return {
        ...aligned,
        brandAlignmentScore: brandAnalyzer.scoreBrandAlignment(aligned, brand),
      };
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Suggestion generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
