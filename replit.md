# Formal Findings

## Overview

Formal Findings is a location-based social networking application for men interested in formal attire, gentleman's fashion, and suit fetish. Users can discover nearby members on an interactive map, manage photo galleries, and create style-focused profiles. The application serves as both a social network and a fetish search platform for men who share these interests. The application features a dark "gentleman's lounge" aesthetic with navy and gold accents.

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
  - `users` - Authentication user records (managed by Replit Auth)
  - `sessions` - Session storage for authentication
  - `profiles` - Extended user profile data including:
    - Basic info (displayName, bio, contactInfo)
    - Location (latitude, longitude, physicalLatitude, physicalLongitude, isTraveling)
    - Age verification (birthDate, ageVerified) - users must be 21+
    - Style preferences (styleInterests, role, interestType, categories)
    - Physical description (hairColor, eyeColor, build, ethnicity, height, weight, bodyHair)
    - Health info (hivStatus, onPrep, lastStdScreening)
  - `photos` - User photo gallery with public/private visibility
  - `favorites` - User-to-user favorites relationship
  - `conversations` - Chat conversations (direct and group)
  - `conversation_participants` - Tracks members of each conversation
  - `messages` - Individual messages with sender info and read tracking
  - `events` - User-created events for formal gatherings and social meetups
  - `event_attendees` - Tracks event attendance with approval status

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

### Privacy Features
- **Location Fuzzing**: User locations are randomized within ~500 feet (~150m) using geodesic calculation
- **Photo Upload**: Direct file uploads via presigned URLs to object storage

### Legal Compliance
- **Age Verification**: Mandatory 21+ age gate with server-side validation
- **Legal Disclaimers**: Comprehensive disclaimers on age verification page including:
  - Assumption of risk acknowledgment
  - User responsibility for verifying other users
  - "As is" service disclaimer
  - Indemnification clause
  - Health information disclaimer (self-reported, not verified)

### Authentication
- **Provider**: Replit OpenID Connect (OIDC) authentication
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **Implementation**: Passport.js with custom OIDC strategy in `server/replit_integrations/auth/`

### Key Design Patterns
- **Shared Types**: Schema and route definitions in `shared/` directory enable type sharing between client and server
- **Storage Interface**: `IStorage` interface in `server/storage.ts` abstracts database operations
- **Protected Routes**: Frontend uses `ProtectedRoute` component wrapper for authenticated pages

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable

### Authentication Services
- **Replit OIDC**: OpenID Connect provider at `https://replit.com/oidc`
- **Required Environment Variables**:
  - `DATABASE_URL` - PostgreSQL connection string
  - `SESSION_SECRET` - Express session encryption key
  - `REPL_ID` - Replit deployment identifier
  - `ISSUER_URL` - OIDC issuer (defaults to Replit)

### Frontend Services
- **Google Fonts**: DM Sans and Playfair Display font families
- **Leaflet/OpenStreetMap**: Map tiles and geolocation services
- **DiceBear**: Avatar generation for demo/seed data

### Development Tools
- **Replit Plugins**: Runtime error overlay, cartographer, and dev banner for Replit environment