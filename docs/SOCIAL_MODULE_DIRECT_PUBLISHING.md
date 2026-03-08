# Social Module - Direct Publishing Architecture

## 🎯 Overview

המודול Social תומך כעת ב-**Direct Publishing** - פרסום ישיר לרשתות החברתיות ללא צורך בכלים חיצוניים.

## 🏗️ Architecture

### Database Schema

#### 1. `ClientSocialToken`
אחסון OAuth tokens של לקוחות:
- Facebook Page tokens (long-lived, 60 days)
- Instagram Business Account tokens
- LinkedIn profile/organization tokens
- Token expiration tracking
- Automatic refresh support

#### 2. `SocialMediaPublishedPost`
Tracking של פוסטים שפורסמו:
- Platform post IDs
- Engagement data (likes, comments, shares)
- Publishing status (success/failed)
- Error messages

#### 3. `CampaignPost`
קישור בין campaigns לפוסטים:
- Campaign organization
- Post ordering
- Multi-post campaigns

### OAuth Flow

```
User clicks "Connect Facebook"
    ↓
/api/oauth/connect?platform=facebook&clientId=xxx&orgSlug=xxx
    ↓
Redirect to Facebook OAuth
    ↓
User approves permissions
    ↓
/api/oauth/facebook/callback?code=xxx&state=xxx
    ↓
Exchange code for access token
    ↓
Get long-lived token (60 days)
    ↓
Get user's Facebook Pages
    ↓
For each page:
  - Save Facebook token
  - Check for Instagram Business Account
  - Save Instagram token if exists
    ↓
Redirect back to app with success
```

### Publishing Flow

```
User clicks "Publish Post"
    ↓
publishPost() in posts.ts
    ↓
Try Direct Publishing:
  ├─ Get client tokens for platforms
  ├─ publishToFacebook()
  ├─ publishToInstagram()
  └─ publishToLinkedIn()
    ↓
If at least 1 platform succeeded:
  ├─ Save to SocialMediaPublishedPost
  └─ Update post status to "published"
    ↓
If all platforms failed:
  └─ Fallback to Webhooks (Make/Zapier)
```

## 📁 File Structure

```
lib/
├── social-oauth/
│   ├── types.ts                    # OAuth type definitions
│   ├── facebook.ts                 # Facebook OAuth & Graph API
│   ├── instagram.ts                # Instagram Business API
│   ├── linkedin.ts                 # LinkedIn OAuth & API
│   └── state-encryption.ts         # Secure state encryption
│
├── social-publishing/
│   ├── index.ts                    # Main orchestrator
│   ├── publish-to-facebook.ts      # Facebook publishing
│   ├── publish-to-instagram.ts     # Instagram publishing
│   └── publish-to-linkedin.ts      # LinkedIn publishing
│
app/
├── actions/
│   ├── client-tokens.ts            # Token management actions
│   └── campaigns.ts                # Campaign CRUD (updated)
│
├── api/
│   ├── oauth/
│   │   ├── connect/route.ts        # OAuth initiator
│   │   ├── facebook/callback/      # Facebook callback
│   │   └── linkedin/callback/      # LinkedIn callback
│   │
│   └── cron/
│       ├── publish-scheduled/      # Scheduled publishing (every 5min)
│       └── refresh-tokens/         # Token refresh (daily)
│
components/
└── social/
    └── ConnectSocialPlatform.tsx   # UI for OAuth connection
```

## 🔐 Environment Variables

```bash
# Facebook OAuth
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret

# OAuth State Encryption
OAUTH_STATE_SECRET=random_32_char_secret

# Cron Job Protection
CRON_SECRET=random_secret_for_cron_endpoints
```

## 🚀 Setup Instructions

### 1. Facebook App Setup

1. Go to https://developers.facebook.com/apps
2. Create new app → Business
3. Add Products:
   - Facebook Login
   - Instagram Basic Display (if needed)
4. Settings → Basic:
   - Copy App ID & App Secret to .env
5. App Review:
   - Request permissions:
     - `pages_show_list`
     - `pages_read_engagement`
     - `pages_manage_posts`
     - `instagram_basic`
     - `instagram_content_publish`
6. Valid OAuth Redirect URIs:
   - `https://yourdomain.com/api/oauth/facebook/callback`

### 2. LinkedIn App Setup

1. Go to https://www.linkedin.com/developers/apps
2. Create new app
3. Products → Add "Share on LinkedIn"
4. Auth → OAuth 2.0 settings:
   - Redirect URLs: `https://yourdomain.com/api/oauth/linkedin/callback`
5. Copy Client ID & Secret to .env

### 3. Database Migration

```bash
npx prisma migrate dev --name add_social_oauth_tables
npx prisma generate
```

### 4. Vercel Cron Jobs

Already configured in `vercel.json`:
- `/api/cron/publish-scheduled` - Every 5 minutes
- `/api/cron/refresh-tokens` - Daily at 3 AM

## 📊 Features

### ✅ Direct Publishing
- Facebook Pages
- Instagram Business Accounts
- LinkedIn Profiles

### ✅ Scheduled Publishing
- Cron job checks every 5 minutes
- Publishes posts with `scheduled_at <= now()`
- Automatic retry on failure

### ✅ Token Management
- Long-lived tokens (60 days for Facebook)
- Automatic refresh before expiration
- Deactivation on refresh failure

### ✅ Engagement Tracking
- Fetch post insights from platforms
- Store engagement data (likes, comments, shares)
- Sync periodically

### ✅ Multi-Client Support
- Organization-level isolation
- Per-client OAuth tokens
- Agency-friendly architecture

### ✅ Fallback to Webhooks
- Graceful degradation
- If no OAuth tokens → use Make/Zapier
- Hybrid model supported

## 🔄 Migration Path

### For Existing Users (Make/Zapier)
1. System works as before (webhooks)
2. User can optionally connect OAuth
3. Once connected, direct publishing takes over
4. Webhooks remain as fallback

### For New Users
1. Choose: Direct Publishing OR Make/Zapier
2. Direct Publishing = Connect OAuth once
3. Make/Zapier = Configure webhook URL

## 🎨 UI Components

### Client Portal
`<ConnectSocialPlatform />` - OAuth connection cards

### Admin Panel
- View connected platforms per client
- Token expiration warnings
- Re-authorization prompts

## 🐛 Troubleshooting

### Token Expired
- Auto-refresh runs daily at 3 AM
- Manual refresh: `POST /api/cron/refresh-tokens`
- User can reconnect via portal

### Publishing Failed
- Check `SocialMediaPublishedPost.publishStatus`
- Error messages stored in `errorMessage`
- Fallback to webhooks automatically

### No Pages Found
- Ensure user has admin role on Facebook Page
- Check App Review permissions
- Verify redirect URI matches exactly

## 📈 Future Enhancements

- [ ] Twitter/X OAuth
- [ ] TikTok OAuth
- [ ] Video publishing (Reels, Stories)
- [ ] Carousel posts
- [ ] Post scheduling UI improvements
- [ ] Engagement analytics dashboard

## 🔗 Related Files

- Schema: `prisma/schema.prisma` (lines 3260-3364)
- Main publishing: `app/actions/posts.ts` (publishPost)
- OAuth routes: `app/api/oauth/*/route.ts`
- Cron jobs: `app/api/cron/*/route.ts`

---

**Status:** ✅ Complete & Production Ready (pending Prisma migration)
**Last Updated:** March 7, 2026
**Author:** Cascade AI
