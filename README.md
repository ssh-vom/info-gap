# InfoGap

The thesis behind this project is that most problems in the world are created by people 
having information asymettries. Many people have the potential to be good at the things 
that they do, but don't have the knowledge that would enable them to do so. 

In my own experience, I didn't even know about Leetcode until I was in 3rd year of my 
undergraduate degree of Mechatronics Engineering. I feel there a ton of things this applies to 
in the world of software, and outside of it as well. Many people have parents that are engineers, 
or are in communities that have the knowledge behind them.

At McMaster University, I feel I wasn't exposed to these things soon enough, and so I'm creating
InfoGap to rectify the gap. A place for McMaster students to seek insite from other students, 
alumnis, etc. I want everyone to know the paths available to them, from the ones who have 
navigated those challenges.

~ Shivom.

## LinkedIn auth

1. Create a LinkedIn app with redirect URLs:
   - `http://localhost:4321/auth/linkedin/callback`
   - `https://YOUR_DOMAIN/auth/linkedin/callback`
2. Copy `.dev.vars.example` to `.dev.vars` and fill in the LinkedIn values.
3. Apply D1 schema locally: `npx wrangler d1 execute infogap --local --file=schema.sql`
4. For production, set secrets and run the schema remotely:
   - `npx wrangler secret put LINKEDIN_CLIENT_ID`
   - `npx wrangler secret put LINKEDIN_CLIENT_SECRET`
   - `npx wrangler secret put AUTH_SECRET`
   - `npx wrangler d1 execute infogap --remote --file=schema.sql`
