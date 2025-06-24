# Karabiner Settings Builder

## Overview

This is a full-stack web application for building and managing Karabiner-Elements configurations. Karabiner-Elements is a powerful keyboard customization tool for macOS, and this application provides a visual interface for creating, editing, and exporting keyboard modification rules.

The application allows users to create configurations with multiple keyboard rules, import existing Karabiner JSON files, and export configurations in the proper Karabiner format.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: Connect-pg-simple for PostgreSQL session storage
- **Development**: Hot module replacement via Vite middleware

### Data Storage
- **Primary Database**: PostgreSQL via Neon Database
- **ORM**: Drizzle ORM with type-safe queries
- **Schema**: Shared schema definitions between client and server
- **Migrations**: Drizzle Kit for database schema management

## Key Components

### Database Schema
- **Configurations Table**: Stores complete Karabiner JSON configurations
- **Rules Table**: Individual keyboard modification rules with metadata
- **Relationships**: Rules belong to configurations with proper foreign key constraints

### API Endpoints
- `GET /api/configurations` - List all configurations
- `GET /api/configurations/:id` - Get specific configuration
- `POST /api/configurations` - Create new configuration
- `PUT /api/configurations/:id` - Update configuration
- `DELETE /api/configurations/:id` - Delete configuration
- `POST /api/configurations/import` - Import Karabiner JSON file
- Similar CRUD operations for rules

### Frontend Components
- **Header**: Navigation and export functionality
- **Sidebar**: Configuration management and import/export
- **Rule Card**: Individual rule display and editing
- **Rule Editor Modal**: Form for creating/editing rules
- **Validation Panel**: Real-time validation feedback

## Data Flow

1. **Configuration Management**: Users create or import Karabiner configurations
2. **Rule Creation**: Rules are created within configurations with specific key mappings
3. **Real-time Validation**: Rules are validated for conflicts and proper JSON structure
4. **Export Process**: Configurations are converted to proper Karabiner JSON format
5. **Persistence**: All data is stored in PostgreSQL with proper relationships

## External Dependencies

### Production Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-orm**: Type-safe database queries
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **express**: Web server framework
- **wouter**: Lightweight React router

### Development Dependencies
- **Vite**: Build tool and development server
- **TypeScript**: Type checking and compilation
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundler for production

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20 runtime
- **Database**: PostgreSQL 16 module
- **Development Server**: Vite dev server with HMR
- **Port Configuration**: Application runs on port 5000

### Production Build
- **Frontend**: Vite builds React app to `dist/public`
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Deployment**: Autoscale deployment target on Replit
- **Environment**: Production environment variables for database connection

### Build Process
1. Frontend assets built with Vite
2. Server code bundled with ESBuild
3. Static files served from Express in production
4. Database migrations applied via Drizzle Kit

## Changelog

```
Changelog:
- June 23, 2025. Initial setup
- June 23, 2025. Enhanced Karabiner import functionality to support full profile structure
- June 23, 2025. Added support for advanced Karabiner features: device conditions, simultaneous keys, complex modifiers
- June 23, 2025. Fixed runtime errors in RuleCard component for better stability
- June 23, 2025. Successfully tested import with complex user configuration file containing 12+ rules
- June 23, 2025. Implemented dual JSON preview system: header modal with copy/download + in-tab preview
- June 23, 2025. Fixed JSON Preview tab layout issues - now displays complete configuration with proper scrolling
- June 24, 2025. Added visual rule highlighting system with purple borders for AI recommendations and green for session edits
- June 24, 2025. Implemented comprehensive diff view showing configuration changes with categorized rule tracking
- June 24, 2025. Fixed tab layout alignment issues - all content areas now properly contained within viewport height
- June 24, 2025. Enhanced Changes tab with JSON diff view showing structured changes and rule metadata
- June 24, 2025. Implemented Git-style side-by-side diff view with before/after comparison and highlighted additions
- June 24, 2025. Added development auto-import feature to automatically load Karabiner configuration on startup
- June 24, 2025. Enhanced diff view with unified JSON format and proper indentation for better readability
- June 24, 2025. Implemented drag and drop functionality for rule reordering with visual feedback
- June 24, 2025. Created comprehensive README with project philosophy, usage instructions, and acknowledgments
- June 24, 2025. Implemented chat assistant with DOIO-specific key mapping suggestions and conversational interface
- June 24, 2025. Enhanced chat with conversation history and contextual responses for continuous messaging
- June 24, 2025. Fixed chat to actually use OpenAI API instead of basic suggestions for intelligent responses
- June 24, 2025. Made chat assistant more conversational and less prescriptive, responding naturally to user input
- June 24, 2025. Enhanced chat context with existing configuration data, device identifiers, and conflict avoidance
- June 24, 2025. Added full configuration context to chat - now sends both original and current JSON to ChatGPT for troubleshooting
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```