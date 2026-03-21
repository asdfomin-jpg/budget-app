# AGENTS.md

## Project
Budget App

## Stack
- Next.js App Router
- React
- TypeScript
- Supabase SSR auth
- Vercel deployment

## Main Goal
Make the smallest possible production-safe change for each task.

## Core Rules
1. Do not rewrite the app.
2. Do not redesign UI unless explicitly requested.
3. Do not add new libraries unless explicitly required.
4. Do not rename env variables.
5. Do not refactor unrelated code.
6. Keep changes minimal and localized.
7. Preserve current project structure.
8. Return full code for changed files only when requested.
9. Prefer fixing root cause over adding workarounds.
10. Keep code compatible with Vercel.

## Auth Rules
1. Do not use `middleware.ts` for auth unless explicitly requested.
2. Prefer server-side auth checks in App Router pages/layouts.
3. Use:
   - `createServerSupabase()`
   - `supabase.auth.getUser()`
   - `redirect()`
4. Protect `/` and private routes server-side.
5. Redirect authenticated users away from `/login`.

## Supabase Rules
1. Reuse existing helpers if possible.
2. Keep current env variable names exactly as already used in the project.
3. Do not switch env names automatically.
4. Do not introduce a different Supabase auth pattern unless necessary.

## UI Rules
1. Keep existing styling unchanged unless a fix requires a small UI adjustment.
2. Do not rename components unless necessary.
3. Do not move components unless it improves correctness with minimal impact.

## Bug-Fix Workflow
When fixing an issue:
1. Identify exact failure source.
2. Inspect only relevant files first.
3. Make smallest safe fix.
4. Avoid broad refactors.
5. Preserve working features.
6. Mention changed files first.
7. Then return full code for changed files only.

## Output Rules for Codex
When asked to fix code:
1. First list changed files.
2. Then provide full final code for each changed file.
3. Do not return partial diffs unless explicitly requested.
4. Do not include unnecessary explanation.

## Runtime Rules
1. If Vercel or Edge runtime errors appear, prefer removing logic from middleware.
2. Keep server/client separation correct.
3. Avoid Node-only patterns in Edge/runtime-sensitive files.

## Budget App Specific Priorities
1. Do not break monthly carry-over logic.
2. Do not mix UI redesign with logic fixes.
3. Keep payment flow behavior intact unless explicitly changing it.
4. Preserve existing budgeting workflow.

## If Uncertain
If a change might affect working logic:
- keep the fix minimal
- preserve current behavior
- ask for the exact file only if absolutely necessary