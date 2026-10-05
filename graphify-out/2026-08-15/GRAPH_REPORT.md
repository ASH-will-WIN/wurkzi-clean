# Graph Report - .  (2026-08-15)

## Corpus Check
- 171 files · ~219,368 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 577 nodes · 898 edges · 53 communities (43 shown, 10 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 64 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Client API Layer
- Authentication APIs
- Job and Auth Requests
- Referrals and Reviews
- Mobile Dependencies
- Client Build Setup
- Server Runtime Setup
- Server Dependencies
- Payment Rewards
- Seasonal Leaderboards
- Messaging
- iOS App Delegate
- Stripe Connect
- Job Management
- Applications
- Authentication Controller
- Supabase Authentication
- Web App Manifest
- Leaderboard Client
- Reporting
- Database and Prisma
- Application Routes
- Job Routes
- Stripe Key Tests
- Database Connection Test
- Live Stripe Test
- Capacitor Configuration
- Swift Package Setup
- Performance Reporting
- Client Tailwind Setup
- Stripe Key Verification
- Server Tailwind Setup
- Workflow Test Script
- Visibility Test
- Cash Payment Test
- iOS Package Manifest
- Client PostCSS Setup
- Payment Diagnostics
- Price Test

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 27 edges
2. `Dashboard()` - 14 edges
3. `JobDetail()` - 14 edges
4. `apiClient` - 13 edges
5. `AppDelegate` - 10 edges
6. `MessageCenter()` - 9 edges
7. `scripts` - 7 edges
8. `ensureProfile()` - 7 edges
9. `ChatWindow()` - 6 edges
10. `Leaderboard()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `ImageGallery()` --references--> `react`  [EXTRACTED]
  client/src/components/ImageGallery.js → client/package.json
- `JobDetail()` --calls--> `sendMessage()`  [EXTRACTED]
  client/src/pages/JobDetail.js → client/src/api/messageApi.js
- `ChatWindow()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/components/ChatWindow.js → client/src/context/AuthContext.js
- `MessageCenter()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/components/MessageCenter.js → client/src/context/AuthContext.js
- `StartConversation()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/components/StartConversation.js → client/src/context/AuthContext.js

## Import Cycles
- None detected.

## Communities (53 total, 10 thin omitted)

### Community 0 - "Client API Layer"
Cohesion: 0.06
Nodes (38): forgotPassword(), loginUser(), registerUser(), resetPassword(), getJobs(), ALLOWED_TYPES, deleteMyAvatar(), getMyProfile() (+30 more)

### Community 1 - "Authentication APIs"
Cohesion: 0.10
Nodes (32): apiClient, acceptApplication(), createApplication(), getApplicationsForJob(), getMyApplications(), rejectApplication(), withdrawApplication(), completeJob() (+24 more)

### Community 2 - "Job and Auth Requests"
Cohesion: 0.07
Nodes (31): AUDIENCES, enroll(), getActiveLeaderboard(), { getActiveSeason }, getMyLeaderboardStatus(), { prisma }, prizes, publicEntry() (+23 more)

### Community 3 - "Referrals and Reviews"
Cohesion: 0.06
Nodes (35): axios, browser-image-compression, @capacitor/cli, @capacitor/core, @capacitor/ios, dependencies, axios, browser-image-compression (+27 more)

### Community 4 - "Mobile Dependencies"
Cohesion: 0.07
Nodes (28): browserslist, development, production, devDependencies, autoprefixer, postcss, tailwindcss, eslintConfig (+20 more)

### Community 5 - "Client Build Setup"
Cohesion: 0.07
Nodes (28): cors, dotenv, express, nodemon, dependencies, cors, dotenv, express (+20 more)

### Community 6 - "Server Runtime Setup"
Cohesion: 0.07
Nodes (27): dependencies, pg, postman, prisma, @prisma/client, stripe, twilio, devDependencies (+19 more)

### Community 7 - "Server Dependencies"
Cohesion: 0.16
Nodes (13): getConversationMessages(), getConversations(), getUnreadCount(), markConversationAsRead(), sendMessage(), connectMessageRealtime(), disconnectMessageRealtime(), ChatWindow() (+5 more)

### Community 8 - "Payment Rewards"
Cohesion: 0.14
Nodes (18): getConversationMessages(), getConversations(), { getUserPhoneNumber, sendSMS }, markConversationAsRead(), markMessageAsRead(), { prisma }, sendMessage(), auth (+10 more)

### Community 9 - "Seasonal Leaderboards"
Cohesion: 0.09
Nodes (22): allowedOrigins, app, applicationRoutes, authRoutes, connectRoutes, cors, { createClient }, express (+14 more)

### Community 10 - "Messaging"
Cohesion: 0.13
Nodes (13): Any, Bool, Capacitor, AppDelegate, NSUserActivity, UIApplication, UIApplicationDelegate, UIKit (+5 more)

### Community 11 - "iOS App Delegate"
Cohesion: 0.29
Nodes (14): AVATAR_TYPES, cleanText(), { createClient }, decodeAvatar(), deleteAvatar(), ensureProfile(), generateReferralCode(), getMyProfile() (+6 more)

### Community 13 - "Job Management"
Cohesion: 0.26
Nodes (10): getStatus(), { prisma, stripeClient }, refreshStatus(), syncAccountStatus(), handleAccountDeauthorized(), handleAccountUpdated(), handleCapabilityUpdated(), handleStripeWebhook() (+2 more)

### Community 14 - "Applications"
Cohesion: 0.24
Nodes (4): connectApi, ConnectRefresh(), ConnectReturn(), Onboarding()

### Community 15 - "Authentication Controller"
Cohesion: 0.18
Nodes (8): { prisma }, { createClient }, dotenv, {
  JobStatus,
  PaymentStatus,
  ApplicationStatus,
  DepositStatus,
}, { PrismaClient }, requiredEnvVars, sanitizedSecretKey, stripe

### Community 16 - "Supabase Authentication"
Cohesion: 0.22
Nodes (5): generateReferralCode(), { randomBytes }, registerUser(), { supabase, prisma }, supabase

### Community 17 - "Web App Manifest"
Cohesion: 0.36
Nodes (6): addJobImage(), createJob(), uploadImageToBase64(), ImageUpload(), MessageInput(), CreateJob()

### Community 19 - "Reporting"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 20 - "Database and Prisma"
Cohesion: 0.50
Nodes (6): enrollInLeaderboard(), getActiveLeaderboard(), getMyLeaderboardStatus(), AUDIENCES, formatCountdown(), Leaderboard()

### Community 21 - "Application Routes"
Cohesion: 0.29
Nodes (6): getMyReferralSummary(), { prisma }, auth, express, { getMyReferralSummary }, router

### Community 22 - "Job Routes"
Cohesion: 0.25
Nodes (5): { supabase }, authMiddleware, express, paymentController, router

### Community 23 - "Stripe Key Tests"
Cohesion: 0.40
Nodes (4): applicationController, authMiddleware, express, router

### Community 24 - "Database Connection Test"
Cohesion: 0.40
Nodes (4): authController, authMiddleware, express, router

### Community 25 - "Live Stripe Test"
Cohesion: 0.40
Nodes (4): authMiddleware, connectController, express, router

### Community 26 - "Capacitor Configuration"
Cohesion: 0.40
Nodes (4): authMiddleware, express, jobController, router

### Community 27 - "Swift Package Setup"
Cohesion: 0.40
Nodes (4): authMiddleware, express, profileController, router

### Community 28 - "Performance Reporting"
Cohesion: 0.40
Nodes (4): authMiddleware, express, reportController, router

### Community 29 - "Client Tailwind Setup"
Cohesion: 0.40
Nodes (4): authMiddleware, express, reviewController, router

### Community 31 - "Server Tailwind Setup"
Cohesion: 0.50
Nodes (3): express, router, webhookController

## Knowledge Gaps
- **195 isolated node(s):** `config`, `UIKit`, `Capacitor`, `PackageDescription`, `name` (+190 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Referrals and Reviews` to `Mobile Dependencies`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `ImageGallery()` connect `Authentication APIs` to `Referrals and Reviews`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `react` connect `Referrals and Reviews` to `Authentication APIs`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **What connects `config`, `UIKit`, `Capacitor` to the rest of the system?**
  _195 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Client API Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.05507246376811594 - nodes in this community are weakly interconnected._
- **Should `Authentication APIs` be split into smaller, more focused modules?**
  _Cohesion score 0.10040816326530612 - nodes in this community are weakly interconnected._
- **Should `Job and Auth Requests` be split into smaller, more focused modules?**
  _Cohesion score 0.07188160676532769 - nodes in this community are weakly interconnected._