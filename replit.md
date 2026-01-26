# Formal Findings

## Overview

Formal Findings is a location-based social networking application for men interested in formal attire, gentleman's fashion, and sartorial style. Users can discover nearby members on an interactive map, manage photo galleries, and create style-focused profiles. The application serves as a social network for men who share these interests. The application features a dark "gentleman's lounge" aesthetic with navy and gold accents.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme (dark mode, serif/sans font pairing)
- **Maps**: React-Leaflet for interactive map functionality
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Design**: REST endpoints defined in `shared/routes.ts` with Zod schemas for type-safe request/response validation
- **Build**: Vite for frontend bundling, esbuild for server bundling

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit with `db:push` command for schema updates
- **Key Tables**:
  - `users` - Authentication user records with email/password login
  - `sessions` - Session storage for authentication
  - `profiles` - Extended user profile data including:
    - Basic info (displayName, bio, contactInfo)
    - Location (latitude, longitude, physicalLatitude, physicalLongitude, isTraveling)
    - Age verification (birthDate, ageVerified) - users must be 21+
    - Style preferences (styleInterests, role, interestType, categories)
    - Physical description (hairColor, eyeColor, build, ethnicity, height, weight, bodyHair)
    - Health info (hivStatus, onPrep, lastStdScreening)
    - Online status (lastActiveAt, isUnderDressed)
  - `photos` - User photo gallery with public/private visibility
  - `favorites` - User-to-user favorites relationship
  - `conversations` - Chat conversations (direct and group)
  - `conversation_participants` - Tracks members of each conversation
  - `messages` - Individual messages with sender info and read tracking
  - `events` - User-created events for formal gatherings and social meetups
  - `event_attendees` - Tracks event attendance with approval status
  - `wardrobe_items` - Virtual wardrobe items with:
    - Basic info (name, description, brand, color)
    - Category (suits, jackets, shirts, ties, shoes, watches, etc.)
    - Image URL (photos stored via object storage)
    - Favorite flag for quick access

### Virtual Wardrobe System
- **Categories**: suits, jackets, shirts, ties, pocket_squares, shoes, belts, watches, cufflinks, accessories, pants, vests, overcoats, other
- **Image Upload**: Uses presigned URL flow via object storage integration
- **CRUD Operations**: Full create, read, update, delete functionality
- **Favorites**: Users can mark items as favorites for quick access
- **Access Control**: Users can grant/revoke wardrobe viewing access to specific members (via `wardrobe_access` table)
  - Access is managed from the Profile page through a dialog
  - Users can add members from their favorites list
  - Only explicitly granted users can view another user's wardrobe

### Events System
- **Event Creation**: Users can create events with title, description, date/time, location, category
- **Categories**: drinks_only, orgy, social_dinner, pump_and_dump, bukkake, side_event, messy_meetup
- **Privacy**: Event details (location, description, attendee list) only visible to host and approved attendees
- **Attendance**: Users request to join; hosts approve/decline attendees
- **Visibility**: Events can be public (visible to all) or invite-only

### Messaging System
- **Direct Messages**: 1-on-1 private chats between users
- **Group Chats**: Multi-user conversations with custom names
- **Security**: Route-level membership verification on all message endpoints
- **Screenshot Prevention**: CSS-based deterrent (user-select: none, print media hiding)

### Who's On Feature
- **Real-time Presence**: Shows members active in the last 15 minutes
- **Activity Tracking**: Heartbeat updates every 60 seconds for logged-in users
- **Under Dressed Mode**: Users can browse invisibly without appearing online
- **API Endpoints**:
  - GET /api/whos-on - Get online users (excludes those in Under Dressed mode)
  - POST /api/activity - Update last active timestamp (heartbeat)
  - PATCH /api/under-dressed - Toggle visibility mode

### Privacy Features
- **Location Fuzzing**: User locations are randomized within ~500 feet (~150m) using geodesic calculation
- **Photo Upload**: Direct file uploads via presigned URLs to object storage
- **Under Dressed Mode**: Browse the app without appearing in the "Who's On" list

### Legal Compliance
- **Age Verification**: Mandatory 21+ age gate with server-side validation
- **Legal Disclaimers**: Comprehensive disclaimers on age verification page including:
  - Assumption of risk acknowledgment
  - User responsibility for verifying other users
  - "As is" service disclaimer
  - Indemnification clause
  - Health information disclaimer (self-reported, not verified)

### Authentication
- **Provider**: Email/Password authentication with bcrypt password hashing
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **Routes**: 
  - POST /api/auth/register - User registration
  - POST /api/auth/login - User login
  - POST /api/auth/logout - User logout
  - GET /api/auth/user - Get current user
  - POST /api/auth/forgot-password - Request password reset (email required)
  - GET /api/auth/validate-reset-token - Validate a reset token
  - POST /api/auth/reset-password - Reset password with token
- **Password Reset**: 
  - Tokens are SHA-256 hashed before storage (security best practice)
  - Tokens expire after 1 hour
  - Single-use tokens (deleted after successful reset)
- **Implementation**: Express sessions with Passport.js in `server/replit_integrations/auth/`

### Payment Processing (Stripe)
- **Provider**: Stripe payment processor
- **Integration Type**: Stripe Checkout with Customer Portal
- **Subscription Tiers**:
  - The Tailored Circle (Premium): $9.99/month or $99/year
  - The Krug Society (Platinum): $12.99/month
- **API Endpoints**:
  - GET /api/prices - List available products and prices
  - POST /api/checkout - Create Stripe Checkout session
  - POST /api/billing/portal - Create Stripe Customer Portal session
  - POST /api/stripe/webhook - Stripe webhook handler (raw body)
- **Service Files**:
  - `server/stripeClient.ts` - Stripe client initialization
  - `server/webhookHandlers.ts` - Webhook event handlers
  - `server/seed-stripe-products.ts` - Product seed script
- **Stripe Tables** (managed by stripe-replit-sync):
  - `stripe_customers` - Customer records
  - `stripe_products` - Product catalog
  - `stripe_prices` - Price definitions
  - `stripe_subscriptions` - Active subscriptions
  - `stripe_invoices` - Invoice records
  - `stripe_webhook` - Webhook configuration
- **Required Environment Variables**:
  - `STRIPE_SECRET_KEY` - Stripe secret API key (auto-configured via integration)

### Report System
- **Purpose**: Allow users to flag inappropriate behavior
- **Report Reasons**: harassment, inappropriate content, fake profile, underage, spam, threats, non-consensual, other
- **Status Tracking**: pending, reviewed, resolved, dismissed
- **API Endpoint**: POST /api/reports

### Key Design Patterns
- **Shared Types**: Schema and route definitions in `shared/` directory enable type sharing between client and server
- **Storage Interface**: `IStorage` interface in `server/storage.ts` abstracts database operations
- **Protected Routes**: Frontend uses `ProtectedRoute` component wrapper for authenticated pages

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable

### Payment Services
- **Stripe**: Payment processor for subscription billing
- **Integration**: stripe-replit-sync for webhook handling and data sync

### Authentication Services
- **Email/Password**: Local authentication with bcrypt password hashing
- **Required Environment Variables**:
  - `DATABASE_URL` - PostgreSQL connection string
  - `SESSION_SECRET` - Express session encryption key
  - `STRIPE_SECRET_KEY` - Stripe API key (auto-configured via Replit integration)

### Frontend Services
- **Google Fonts**: DM Sans and Playfair Display font families
- **Leaflet/OpenStreetMap**: Map tiles and geolocation services
- **DiceBear**: Avatar generation for demo/seed data

### Development Tools
- **Replit Plugins**: Runtime error overlay, cartographer, and dev banner for Replit environment