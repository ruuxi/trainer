# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 application called "FromYou - The Best Ai Trainer and Workflow Platform" that uses Convex for the backend and Better Auth for authentication. The project uses TypeScript, React 19, Tailwind CSS v4, and shadcn/ui components.

## Development Commands

```bash
# Start development server (Next.js on http://localhost:3000)
pnpm dev

# Build the application
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint

# Start Convex development (separate terminal)
npx convex dev
```

## Architecture

### Authentication Stack

The application uses a dual authentication system with Better Auth and Convex:

- **Better Auth** (`@convex-dev/better-auth`): Main authentication library with plugins for:
  - Email/password with email verification
  - Magic links
  - Email OTP
  - Two-factor authentication (2FA)
  - OAuth (GitHub, Google, Slack via genericOAuth)
  - Anonymous users
  - Username support

- **Auth Flow**:
  - Better Auth is integrated with Convex using the `betterAuth` component (Local Install)
  - Client-side auth: `src/lib/auth-client.ts` exports `authClient` for React components
  - Server-side auth: `src/lib/auth-server.ts` exports `getToken()` for server actions/components
  - Auth configuration: `convex/auth.ts` contains the `createAuth()` function and `authComponent`
  - HTTP routes: `convex/http.ts` registers Better Auth routes
  - Email delivery: Uses Resend via `@convex-dev/resend` (configured in `convex/email.tsx`)

- **Middleware**: `middleware.ts` uses Better Auth cookies to protect routes:
  - Unauthenticated users redirected to `/sign-in`
  - Authenticated users on auth pages redirected to `/dashboard/server`
  - Auth routes: `/sign-in`, `/sign-up`, `/verify-2fa`, `/reset-password`

### Backend (Convex)

- **Database**: Convex handles data persistence with type-safe queries/mutations
- **Schema**: Main schema in `convex/schema.ts`, Better Auth schema in `convex/betterAuth/schema.ts`
- **Path Aliases**:
  - `@/convex/*` → `./convex/*`
  - `@/*` → `./src/*`
- **Generated Files**: Convex auto-generates types in `convex/_generated/`
- **Example Pattern** (see `convex/todos.ts`):
  - Use `authComponent.getAuth(createAuth, ctx)` to get Better Auth instance in mutations/actions
  - Use `ctx.auth.getUserIdentity()` for simple authentication checks in queries
  - All database operations use Convex's type-safe API

### Frontend

- **Framework**: Next.js 16 App Router with React 19
- **Styling**: Tailwind CSS v4 with custom configuration
- **Components**: shadcn/ui components in `src/components/ui/`
- **Fonts**: Geist Sans and Geist Mono from next/font
- **Provider Setup**: `ConvexClientProvider` wraps the app with `ConvexBetterAuthProvider`
- **Route Groups**:
  - `(auth)/*` - Protected routes for authenticated users (e.g., `/settings`)
  - `(unauth)/*` - Public auth routes (e.g., `/sign-in`, `/sign-up`, `/verify-2fa`)

### Email System

- Email templates use `@react-email/components` in `convex/emails/`
- Base template: `convex/emails/components/BaseEmail.tsx`
- Types: Verify email, OTP, magic link, password reset
- Sending configured in `convex/email.tsx` using Resend

### Server-Side Better Auth Usage

To use Better Auth methods in server components/actions:

1. Create a Convex function that calls Better Auth (see pattern in `better-auth-server.md`)
2. Call the Convex function from your server code using `fetchMutation`/`fetchQuery` with `getToken()`

Example:
```typescript
// In server action
const token = await getToken();
await fetchMutation(api.someModule.someFunction, { args }, { token });
```

## Environment Variables

Required variables (see `env.example.txt`):
- `CONVEX_DEPLOYMENT` - Convex deployment name
- `NEXT_PUBLIC_CONVEX_URL` - Convex API URL
- `NEXT_PUBLIC_CONVEX_SITE_URL` - Frontend URL for Convex
- `SITE_URL` - Base URL for Better Auth

Optional OAuth credentials:
- GitHub: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Slack: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`

The project also includes R2 storage and AI API key placeholders.

## Key Technical Notes

- TypeScript strict mode enabled
- Better Auth uses Local Install pattern (component-based integration)
- Auth schema extension via Better Auth config (`user.additionalFields` in `convex/auth.ts`)
- Custom indexes can be added in `convex/betterAuth/schema.ts` (see example with `foo` field)
- MCP server configured for shadcn in `.cursor/mcp.json`
