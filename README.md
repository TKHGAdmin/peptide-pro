# Instagram Content Calendar - AI-Powered Content Strategy

An intelligent Instagram content calendar app that scrapes your account, analyzes performance, identifies niche outliers, and generates brand-aligned content suggestions.

## Features

### 1. Account Scraping & Analysis
- Connects to Instagram Graph API to fetch your posts and profile data
- Calculates engagement rates, reach, and performance metrics for every post

### 2. Performance Intelligence
- **Why Content Outperforms**: Identifies specific factors (format, caption length, hashtags, posting time, CTAs) that make your top posts successful
- **Content Type Breakdown**: Shows which formats (Reels, Carousels, Images) perform best
- **Hashtag Analysis**: Ranks hashtags by engagement performance
- **Best Posting Times**: Data-driven optimal posting schedule

### 3. Competitor & Niche Analysis
- Scrape any public Instagram business account in your niche
- **Niche Outlier Detection**: Statistically identifies accounts outperforming the niche average (>1.5 standard deviations)
- **Trend Identification**: Tracks hashtag velocity, volume, and saturation to find emerging trends
- Compare your metrics against competitors side-by-side

### 4. Brand Identity Engine
- **Auto-extracted Brand Profile**: Tone of voice, content pillars, target audience, posting style
- **Brand Keywords & Color Palette**: Extracted from your existing content
- **Brand Alignment Scoring**: Every suggestion is scored for brand consistency
- Detects CTA style, emoji usage, hashtag strategy, and caption length preferences

### 5. AI Content Suggestions
- **Trend-based**: Capitalize on trending topics in your niche
- **Replication-based**: Create content similar to your proven top performers
- **Competitor-inspired**: Adapt winning strategies from niche outliers
- **Content Gap Analysis**: Identify underutilized high-performing formats
- Each suggestion includes: caption, hashtags, best posting time, estimated engagement, and reasoning

### 6. Content Calendar
- Visual monthly calendar with drag-and-drop scheduling
- Color-coded by content type (Reel, Carousel, Image)
- Unscheduled content sidebar for quick scheduling
- Event detail view with full caption preview

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **State Management**: Zustand
- **API**: Instagram Graph API (via Next.js API routes)

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the app auto-loads demo data.

## Connecting Your Instagram

1. Create a [Facebook Developer App](https://developers.facebook.com/)
2. Add the Instagram Graph API product
3. Connect your Instagram Business/Creator account
4. Generate a long-lived access token with permissions:
   - `instagram_basic`
   - `instagram_manage_insights`
   - `pages_show_list`
5. Enter your token in Settings

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/instagram` | POST | Fetch profile, posts, competitor data, hashtag search |
| `/api/analyze` | POST | Performance analysis, outperformance factors, trends |
| `/api/brand` | POST | Brand profile extraction, alignment scoring |
| `/api/suggestions` | POST | Generate brand-aligned content suggestions |

## Architecture

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/
│   │   ├── instagram/      # Instagram Graph API integration
│   │   ├── analyze/        # Performance analysis engine
│   │   ├── brand/          # Brand identity analysis
│   │   └── suggestions/    # Content suggestion generation
│   └── page.tsx            # Main app page
├── components/             # React components
│   ├── Dashboard.tsx       # Overview with stats & charts
│   ├── ContentCalendar.tsx # Monthly calendar view
│   ├── Analytics.tsx       # Deep performance analytics
│   ├── Competitors.tsx     # Competitor & outlier analysis
│   ├── Brand.tsx           # Brand identity dashboard
│   ├── Suggestions.tsx     # Content suggestion cards
│   └── Sidebar.tsx         # Navigation sidebar
├── lib/                    # Core business logic
│   ├── instagram-scraper.ts # Instagram API client
│   ├── analysis-engine.ts   # Performance & trend analysis
│   ├── brand-analyzer.ts    # Brand identity extraction
│   ├── content-suggester.ts # AI content suggestion engine
│   └── demo-data.ts         # Demo data for showcase
├── store/                  # Zustand state management
│   └── app-store.ts
└── types/                  # TypeScript type definitions
    └── instagram.ts
```
