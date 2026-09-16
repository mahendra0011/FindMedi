# FindMedi

A unified healthcare consultation, hospital management, diagnostic test booking, and medicine delivery platform.

## Repository Architecture

```
FindMedi/
├── client/          # Legacy Vite + React frontend (SPA)
├── server/          # Express.js + MongoDB backend & Rust native modules (napi-rs)
└── findmedi-next/   # Next.js 16 App Router + TypeScript strict mode (.tsx) frontend
```

### Getting Started

- **Next.js Frontend**: `cd findmedi-next && npm run dev`
- **Backend API**: `cd server && npm run dev`
- **Legacy Frontend**: `cd client && npm run dev`
