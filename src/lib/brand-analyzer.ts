import type {
  InstagramPost,
  InstagramProfile,
  BrandProfile,
  PostingStyle,
  ContentSuggestion,
} from "@/types/instagram";

/**
 * Analyzes a user's Instagram presence to extract brand identity,
 * then uses that understanding to ensure content suggestions align with the brand.
 */
export class BrandAnalyzer {
  /**
   * Analyze posts and profile to extract brand identity
   */
  extractBrandProfile(
    profile: InstagramProfile,
    posts: InstagramPost[]
  ): BrandProfile {
    return {
      id: profile.id,
      name: profile.fullName,
      username: profile.username,
      colorPalette: [], // would need image analysis in production
      toneOfVoice: this.analyzeToneOfVoice(posts),
      contentPillars: this.identifyContentPillars(posts),
      targetAudience: this.inferTargetAudience(profile, posts),
      niche: this.identifyNiche(profile, posts),
      subNiches: this.identifySubNiches(posts),
      brandKeywords: this.extractBrandKeywords(posts),
      avoidKeywords: [],
      postingStyle: this.analyzePostingStyle(posts),
    };
  }

  /**
   * Score how well a suggestion aligns with the brand
   */
  scoreBrandAlignment(
    suggestion: ContentSuggestion,
    brand: BrandProfile
  ): number {
    let score = 0;
    let maxScore = 0;

    // Content pillar alignment
    maxScore += 30;
    if (brand.contentPillars.some((pillar) =>
      suggestion.title.toLowerCase().includes(pillar.toLowerCase()) ||
      suggestion.description.toLowerCase().includes(pillar.toLowerCase())
    )) {
      score += 30;
    } else if (suggestion.contentPillar && brand.contentPillars.includes(suggestion.contentPillar)) {
      score += 25;
    }

    // Tone alignment
    maxScore += 20;
    const captionTone = this.detectTone(suggestion.suggestedCaption);
    const toneOverlap = captionTone.filter((t) =>
      brand.toneOfVoice.includes(t)
    ).length;
    score += Math.min((toneOverlap / Math.max(brand.toneOfVoice.length, 1)) * 20, 20);

    // Format preference alignment
    maxScore += 20;
    if (brand.postingStyle.preferredFormats.includes(suggestion.contentType)) {
      score += 20;
    }

    // Caption length alignment
    maxScore += 15;
    const captionLen = suggestion.suggestedCaption.length;
    const preferredLen = brand.postingStyle.captionLength;
    if (
      (preferredLen === "short" && captionLen < 150) ||
      (preferredLen === "medium" && captionLen >= 150 && captionLen < 500) ||
      (preferredLen === "long" && captionLen >= 500)
    ) {
      score += 15;
    }

    // Keyword alignment
    maxScore += 15;
    const keywordMatches = brand.brandKeywords.filter((kw) =>
      suggestion.suggestedCaption.toLowerCase().includes(kw.toLowerCase()) ||
      suggestion.title.toLowerCase().includes(kw.toLowerCase())
    ).length;
    score += Math.min((keywordMatches / Math.max(brand.brandKeywords.length, 1)) * 15, 15);

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 50;
  }

  /**
   * Adjust a suggestion to better align with the brand
   */
  alignSuggestionWithBrand(
    suggestion: ContentSuggestion,
    brand: BrandProfile
  ): ContentSuggestion {
    let caption = suggestion.suggestedCaption;

    // Adjust caption length
    if (brand.postingStyle.captionLength === "short" && caption.length > 200) {
      const sentences = caption.split(/[.!?]+/).filter(Boolean);
      caption = sentences.slice(0, 2).join(". ") + ".";
    }

    // Add brand hashtags
    const hashtags = [...suggestion.suggestedHashtags];
    for (const keyword of brand.brandKeywords.slice(0, 3)) {
      const tag = `#${keyword.replace(/\s+/g, "")}`;
      if (!hashtags.includes(tag)) {
        hashtags.push(tag);
      }
    }

    return {
      ...suggestion,
      suggestedCaption: caption,
      suggestedHashtags: hashtags,
      brandAlignmentScore: this.scoreBrandAlignment(suggestion, brand),
      contentPillar:
        suggestion.contentPillar ||
        brand.contentPillars[0] ||
        "general",
    };
  }

  // --- Private helpers ---

  private analyzeToneOfVoice(posts: InstagramPost[]): string[] {
    const tones: Record<string, number> = {};

    for (const post of posts) {
      const detected = this.detectTone(post.caption);
      for (const tone of detected) {
        tones[tone] = (tones[tone] || 0) + 1;
      }
    }

    return Object.entries(tones)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tone]) => tone);
  }

  private detectTone(text: string): string[] {
    const tones: string[] = [];
    const lower = text.toLowerCase();

    // Educational / informative
    if (/\b(learn|tip|how to|guide|step|did you know|here's|facts?)\b/i.test(lower)) {
      tones.push("educational");
    }
    // Inspirational / motivational
    if (/\b(inspire|dream|believe|never give up|you can|motivation|mindset)\b/i.test(lower)) {
      tones.push("inspirational");
    }
    // Casual / conversational
    if (/\b(lol|haha|tbh|ngl|literally|vibe|mood|honestly)\b/i.test(lower)) {
      tones.push("casual");
    }
    // Professional / authoritative
    if (/\b(research|data|studies|according to|evidence|strategy|results)\b/i.test(lower)) {
      tones.push("professional");
    }
    // Humorous
    if (/[😂🤣😅😆]|lmao|rofl|joke|funny/i.test(lower)) {
      tones.push("humorous");
    }
    // Storytelling
    if (/\b(story|journey|when i|remember|one day|back when)\b/i.test(lower)) {
      tones.push("storytelling");
    }
    // Sales / promotional
    if (/\b(buy|shop|discount|sale|limited|offer|link in bio|dm me)\b/i.test(lower)) {
      tones.push("promotional");
    }

    return tones.length > 0 ? tones : ["neutral"];
  }

  private identifyContentPillars(posts: InstagramPost[]): string[] {
    // Extract common themes from captions
    const wordFreq: Record<string, number> = {};
    const stopWords = new Set([
      "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
      "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
      "being", "have", "has", "had", "do", "does", "did", "will", "would",
      "could", "should", "may", "might", "can", "this", "that", "these",
      "those", "i", "you", "he", "she", "it", "we", "they", "my", "your",
      "his", "her", "its", "our", "their", "me", "him", "us", "them",
      "not", "no", "so", "if", "just", "like", "get", "got", "go",
      "going", "one", "all", "more", "out", "up", "about", "what", "when",
    ]);

    for (const post of posts) {
      const words = post.caption
        .toLowerCase()
        .replace(/[^a-z\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopWords.has(w));

      for (const word of words) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }

    // Group related words into pillars
    const topWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);

    // Return top themes as content pillars
    return topWords.slice(0, 5);
  }

  private inferTargetAudience(
    profile: InstagramProfile,
    posts: InstagramPost[]
  ): string {
    const allHashtags = posts.flatMap((p) => p.hashtags);
    const bio = (profile.biography || "").toLowerCase();

    if (/entrepreneur|business|startup|ceo|founder/i.test(bio + " " + allHashtags.join(" "))) {
      return "Entrepreneurs & Business Owners";
    }
    if (/fitness|gym|workout|health|wellness/i.test(bio + " " + allHashtags.join(" "))) {
      return "Health & Fitness Enthusiasts";
    }
    if (/beauty|skincare|makeup|fashion|style/i.test(bio + " " + allHashtags.join(" "))) {
      return "Beauty & Fashion Enthusiasts";
    }
    if (/food|recipe|cooking|chef|restaurant/i.test(bio + " " + allHashtags.join(" "))) {
      return "Food & Cooking Enthusiasts";
    }
    if (/tech|developer|coding|software|ai/i.test(bio + " " + allHashtags.join(" "))) {
      return "Tech Professionals & Enthusiasts";
    }
    if (/travel|adventure|explore|wanderlust/i.test(bio + " " + allHashtags.join(" "))) {
      return "Travel & Adventure Seekers";
    }

    return "General Audience";
  }

  private identifyNiche(
    profile: InstagramProfile,
    posts: InstagramPost[]
  ): string {
    const audience = this.inferTargetAudience(profile, posts);
    const pillarMap: Record<string, string> = {
      "Entrepreneurs & Business Owners": "Business & Entrepreneurship",
      "Health & Fitness Enthusiasts": "Health & Fitness",
      "Beauty & Fashion Enthusiasts": "Beauty & Fashion",
      "Food & Cooking Enthusiasts": "Food & Cooking",
      "Tech Professionals & Enthusiasts": "Technology",
      "Travel & Adventure Seekers": "Travel & Lifestyle",
    };
    return pillarMap[audience] || profile.category || "Lifestyle";
  }

  private identifySubNiches(posts: InstagramPost[]): string[] {
    const hashtagGroups: Record<string, number> = {};
    for (const post of posts) {
      for (const tag of post.hashtags) {
        const clean = tag.replace("#", "");
        hashtagGroups[clean] = (hashtagGroups[clean] || 0) + 1;
      }
    }

    return Object.entries(hashtagGroups)
      .filter(([, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
  }

  private extractBrandKeywords(posts: InstagramPost[]): string[] {
    const freq: Record<string, number> = {};
    for (const post of posts) {
      const words = post.caption
        .toLowerCase()
        .replace(/[^a-z\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 4);
      for (const w of words) freq[w] = (freq[w] || 0) + 1;
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private analyzePostingStyle(posts: InstagramPost[]): PostingStyle {
    const formats: Record<string, number> = {};
    let totalCaptionLen = 0;
    let totalHashtags = 0;
    let emojiCount = 0;

    for (const post of posts) {
      const type = post.isReel ? "REEL" : post.mediaType;
      formats[type] = (formats[type] || 0) + 1;
      totalCaptionLen += post.caption.length;
      totalHashtags += post.hashtags.length;
      const emojiRegex = new RegExp("[\u{1F600}-\u{1F6FF}]", "gu");
      emojiCount += (post.caption.match(emojiRegex) || []).length;
    }

    const avgCaption = posts.length > 0 ? totalCaptionLen / posts.length : 0;
    const avgHashtags = posts.length > 0 ? totalHashtags / posts.length : 0;
    const avgEmojis = posts.length > 0 ? emojiCount / posts.length : 0;

    return {
      preferredFormats: Object.entries(formats)
        .sort((a, b) => b[1] - a[1])
        .map(([f]) => f),
      captionLength: avgCaption < 150 ? "short" : avgCaption < 500 ? "medium" : "long",
      hashtagStrategy: avgHashtags < 5 ? "minimal" : avgHashtags < 15 ? "moderate" : "maximal",
      emojiUsage: avgEmojis < 1 ? "none" : avgEmojis < 5 ? "light" : "heavy",
      ctaStyle: this.detectCtaStyle(posts),
    };
  }

  private detectCtaStyle(posts: InstagramPost[]): string {
    let linkInBio = 0;
    let question = 0;
    let dmMe = 0;
    let comment = 0;

    for (const post of posts) {
      const lower = post.caption.toLowerCase();
      if (lower.includes("link in bio")) linkInBio++;
      if (lower.includes("?")) question++;
      if (lower.includes("dm") || lower.includes("message")) dmMe++;
      if (/comment|drop|tag|share/i.test(lower)) comment++;
    }

    const max = Math.max(linkInBio, question, dmMe, comment);
    if (max === 0) return "none";
    if (max === linkInBio) return "link-in-bio";
    if (max === question) return "question";
    if (max === dmMe) return "direct-message";
    return "engagement-prompt";
  }
}
