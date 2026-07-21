// Why: Backend URL was duplicated in 3+ files (chat.ts, message.tsx, page.tsx, chat/page.tsx).
// Single source of truth — change here if the backend URL ever changes.
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
