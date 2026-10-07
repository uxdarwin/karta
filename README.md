# Karta

Mobile wedding invitation for Darwin & Andrea. Next.js, React, TypeScript. Maximum width: 480px.

Requires Node 20.9+ (validated with Node 24). Run `npm ci`, then `npm run dev`. For production, run `npm run build` and `npm start`. TypeScript: `npm run typecheck`.

Content is in `app/page.tsx`; RSVP preview is in `app/rsvp.tsx`. Dates, times, venues, policies, planner contact and artwork are placeholders. April 11, Sunday is displayed without assuming a year.

Frontend only, no authentication or backend. RSVP responses are not saved or sent. Replace placeholder details and connect RSVP before sharing with guests.
