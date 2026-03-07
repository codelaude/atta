# Next.js Patterns

> Auto-generated pattern file for {{PROJECT_NAME}}
> Next.js version: {{FRAMEWORK_VERSION}}
> Generated: {{GENERATED_DATE}}

## Key Rules

### App Router (Next.js 13+)
- Use App Router (`app/` directory) for new projects
- Server Components by default — add `'use client'` only when needed
- Use `page.tsx` for routes, `layout.tsx` for shared layouts
- Use `loading.tsx` for loading states, `error.tsx` for error boundaries
- Colocate components, tests, and styles with routes

### Data Fetching
- Server Components: fetch directly (no hooks needed)
- Use `async` components for server-side data fetching
- Use React Server Actions for mutations
- Cache and revalidate with `fetch` options or `revalidatePath`
- Use `generateStaticParams` for static generation

### Client Components
- Add `'use client'` directive only when needed (hooks, events, browser APIs)
- Keep Client Components small — push logic to Server Components
- Use `useSearchParams`, `usePathname` for client-side URL access
- Use `next/navigation` for programmatic navigation

### Performance
- Use `next/image` for automatic image optimization
- Use `next/font` for font optimization
- Use dynamic imports (`next/dynamic`) for code splitting
- Prefer Server Components to reduce client bundle size

## Anti-Patterns

| I See | I Do | Severity |
|-------|------|----------|
| Pages Router in new projects | Use App Router | MEDIUM |
| Client-side fetch for static content | Use Server Components | HIGH |
| `'use client'` on everything | Only add when hooks/events needed | HIGH |
| Missing `next/image` for images | Use Image component for optimization | MEDIUM |

## See Also

- [Next.js Documentation](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)
