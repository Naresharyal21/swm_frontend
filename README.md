# Smart Waste Management — Frontend

**Stack:** Vite + React + JavaScript + Tailwind

## 1) Configure
```bash
npm install
cp .env.example .env
```
Edit `.env` if your backend runs on a different host/port.

## 2) Run
```bash
npm run dev
```

## Demo accounts (from your backend seed)
- admin@gmail.com / Admin1234
- supervisor@gmail.com / Supervisor1234
- crew@gmail.com / Crew1234
- citizen@gmail.com / Citizen1234

## Notes
- Some backend modules do not expose edit/delete endpoints (e.g., billing plans, vehicles, bins, reward rates). The UI shows these actions as disabled with a clear message.
- The "Forgot password" screen is included but your backend does not currently implement reset endpoints.
