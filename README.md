# Holo

A mobile app to track a Pokémon card collection. It shows what you own, what is still missing in each set, and what your collection is worth.

> This is an unofficial app. Pokémon cards and their images belong to The Pokémon Company. Catalog data comes from [TCGdex](https://tcgdex.dev). Prices are indicative Cardmarket averages, not actual sale prices.

## Features

- Browse every set in French or English, with card previews
- Search for a card or a set straight from the home screen
- Add the copies you own, with their variant, language, condition and quantity
- Follow your progress in each set, secret cards included
- See every copy you own with its price and condition
- See the value of your collection, its estimated recent trend and the price trend of each card
- Keep a wishlist of the cards you want, which clears itself as you collect them
- Create an account with an email and password or with Google, protected by two-factor authentication

## Project structure

This is an npm workspaces monorepo with three packages.

```
mobile/   Expo app (React Native, TypeScript, Expo Router)
  src/app/        Screens, one route per file
  src/features/   Code grouped by feature (account, catalog, collection, wishlist, settings)
  src/ui/         Design system tokens and base building blocks
  src/lib/        Shared helpers for formatting, storage and data loading
server/   Serverless functions on Vercel (TypeScript)
  api/            HTTP routes, one function per file
  src/            Internal server code
shared/   Domain types and business rules, covered by tests
docs/     Architecture decision records
```

The domain vocabulary lives in [`GLOSSARY.md`](./GLOSSARY.md), written in French like the rest of the product.

## Getting started

```bash
npm install          # installs the three packages from the root
npm run mobile       # starts Expo, then scan the QR code with Expo Go
npm test             # runs the tests of every package
npm run typecheck    # type checks every package
```

### Server

Set these environment variables in the Vercel project settings, or in `server/.env.local` for local development.

| Variable | Purpose |
|---|---|
| `CRON_SECRET` | Authenticates the daily cron job |
| `MONGODB_URI` | MongoDB Atlas connection string (free tier) |
| `BETTER_AUTH_SECRET` | Signs sessions, at least 32 random characters |
| `BETTER_AUTH_URL` | Public address of the server |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign in, optional |
| `AUTH_EXTRA_ORIGINS` | Extra trusted origins for development, such as Expo Go, comma separated. Remove it before a public release |

The app needs `EXPO_PUBLIC_API_URL`, the address of the server, in `mobile/.env.local`.

## Status

Working prototype. The catalog, search, collection, wishlist, set progress, collection value and price trends all work. Accounts work through the server. The collection and the wishlist are still stored on the phone, and moving them to the server comes next.
