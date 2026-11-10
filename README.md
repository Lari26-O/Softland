# Softland 🌿

A soft landing after a hard day: a gentle planner and AI companion for students and adults. It's a calm web app for the hour after school or work: a week planner, an energy check-in, 1–3 priorities for today, an energy-aware plan for tomorrow with sleep-back timing, a gratitude journal, 15-minute creative tasters, a study/work helper, and an Overwhelm button.

## The AI: shared server with backups

Everyone uses Softland's AI ("Moss") through a small free server in [`server/`](server/), a Cloudflare Worker. It keeps the API keys secret and falls back **Gemini → Groq → OpenRouter** if one is busy or out of free quota. Setup steps are in [`server/README.md`](server/README.md).

People can still add their own Gemini key under **More → Settings → AI** (optional). If that key hits its limit, the app falls back to the shared server. With no AI connected at all, the app still works with simple built-in suggestions.

## Running it

It's one static `index.html`, with no build step.

- **Locally:** run `python3 -m http.server` inside this folder and open http://localhost:8000
- **Online:** any static host works (GitHub Pages, Netlify, Vercel). With GitHub Pages turned on for this repo, it's at `https://lari26-o.github.io/Softland/`
- **On your phone:** open the URL, then use "Add to Home Screen" to install it like an app.

## What's in it

| Screen | What it does |
|---|---|
| Land | Arrival ritual, energy and mood check-in, one calm suggestion, energy patterns over time |
| Planner | Week view, add plans with optional time and category, "Help me plan my week" spreads deadlines out by energy, gentle carry-over for unfinished plans |
| Weeklan | Sign in with your Weeklan account (read-only). Moss knows what's due, "Make my study plan" estimates how much time each assignment or test needs and schedules study sessions before the due date, and assignments show on Land, Planner, Today and the Study helper |
| Today | Brain dump → 1–3 priorities, everything else optional |
| Tomorrow | Soft plan with wake / bed / screens-off times (sleep-back), draggable blocks |
| Journal | Three good things / one lesson / let go; text, voice or photo; Moss asks follow-ups |
| Memory jar | Gratitude entries collect here; pull one out on hard days |
| Explore | 15-minute tasters that learn what you loved |
| Study / Work helper | Energy-matched methods, timers, assignment breakdown (Student vs Adult mode) |
| Too much | Stripped-down screen, breathing, one small next step, 5-4-3-2-1 grounding |
| Look-back | Weekly summary: enjoyed, drained, grateful, one gentle idea |
| Extras | Voice input and spoken replies, generated soundscapes, soft reminders, buddy/parent sharing (off by default, never shares the journal) |

Softland is not a replacement for professional care. If distress words come up, it shows crisis-line info.
