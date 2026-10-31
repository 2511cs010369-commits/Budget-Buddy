# Budget Buddy

Budget Buddy is a Java-based personal financial wellness application that helps users track income and expenses, build daily saving habits, understand spending patterns, and work toward individual or family goals. It combines financial management with saving streaks, challenges, notifications, an AI-style financial friend, and interactive family activities.

## Project objective

Traditional expense trackers mainly show where money was spent. Budget Buddy goes further by helping users understand their financial behavior, reduce unnecessary spending, save consistently, and remain motivated while working toward meaningful goals.

## Main features

- Secure account creation and sign-in without email confirmation
- PBKDF2 password hashing and private, expiring session tokens
- Income and expense tracking with category-based analysis
- Interactive home dashboard with animated charts and summaries
- Smart daily Saving Jar and saving streaks
- Personal and family saving goals
- Family money-discussion chat and small multiplayer-style games
- Challenges, achievements, rewards, and motivational notifications
- AI-style financial guidance and shopping advice
- Spending insights and mood-based spending awareness
- Responsive light and dark themes
- Supabase PostgreSQL persistence protected with Row Level Security

## Technology stack

- **Backend:** Java 21, dependency-free HTTP server, REST-style JSON APIs
- **Frontend:** HTML5, CSS3, and vanilla JavaScript
- **Database:** Supabase PostgreSQL
- **Security:** PBKDF2-HMAC-SHA256 password hashing, SHA-256 session-token hashes, server-only database key
- **Deployment:** Docker and Railway-compatible configuration
- **Version control:** Git and GitHub

## Project structure

```text
Budget-Buddy-App/
├── database/
│   └── schema.sql
├── src/main/java/com/budgetbuddy/
│   └── SimpleBudgetBuddyServer.java
├── src/main/resources/static/
│   ├── assets/
│   ├── *.html
│   ├── *.css
│   └── *.js
├── .env.example
├── Dockerfile
├── railway.toml
├── run.ps1
└── README.md
```

## Local setup

### Requirements

- Java Development Kit 21 or newer
- A Supabase project

### Database setup

1. Open the Supabase SQL Editor.
2. Run the complete [`database/schema.sql`](database/schema.sql) script.
3. Open **Project Settings → API Keys** and obtain a server-only secret key.
4. Never expose the secret key in frontend JavaScript or commit it to Git.

### Environment configuration

Copy `.env.example` to `.env` and enter your own values:

```env
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
SUPABASE_SECRET_KEY=sb_secret_REPLACE_ME
```

The `.env` file is excluded from Git and must remain private.

### Run the application

```powershell
.\run.ps1
```

Open [http://localhost:8080](http://localhost:8080), create an account with a valid email and a password containing at least eight characters, and sign in. Accounts are created immediately; no confirmation email is required.

## Database design

The relational database contains connected tables for users, sessions, categories, transactions, savings, goals, family groups, family members, and notifications. Public browser keys cannot directly access private financial records. All privileged database operations pass through the Java server.

## Deployment

The included `Dockerfile` builds and runs the Java 21 application. The `railway.toml` file configures a Railway-compatible deployment. Add `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` as private deployment environment variables.

> Vercel is suitable for a separately hosted static frontend, but the current long-running Java server requires a container-compatible service such as Railway, Render, Fly.io, or a virtual server.

## Security notes

- Passwords are never stored in plain text.
- Session tokens are randomly generated; only their SHA-256 hashes are stored.
- The Supabase secret key is read only by the Java backend.
- Row Level Security remains enabled on application tables.
- Local secrets, build output, logs, and runtime data are excluded from Git.

## Academic scope

Budget Buddy demonstrates Java networking, REST API design, relational database modeling, authentication, session management, responsive UI/UX, data visualization, and secure cloud-database integration in one complete second-year software project.

## Future enhancements

- Bank-account and UPI integration
- Real AI model integration for personalized guidance
- Password-reset workflow and optional multi-factor authentication
- Native Android application
- Production-grade real-time family chat and game synchronization
- Advanced forecasting and downloadable financial reports

## License

This project is intended for academic and educational use.
