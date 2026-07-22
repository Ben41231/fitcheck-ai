# FitCheck AI 👗🔥

**Upload your fit. Get scored 1–10. Get roasted if you dare.**

FitCheck AI is a 100% client-side web app that uses Claude's vision to rate outfits, analyze
color coordination, guess your personal style, and (if you're brave) roast your fashion choices.
No backend, no server, no signup — just open the page, drop in your own Claude API key, and go.

> Photo of an outfit → rating, colors, feedback, trend notes.
> Photo of a closet → item breakdown + suggested outfit combos.

---

## ✨ Features

- **1–10 outfit rating** with color palette and trend commentary
- **Style detection** — tell it your style, or let the AI guess from the photo
- **Closet mode** — upload multiple items and get outfit combinations suggested for you
- **Roast mode 🔥** — flip a switch for savage, funny commentary instead of gentle feedback
- **Zero backend** — pure HTML/CSS/JS, deployable for free on GitHub Pages
- **Bring your own key** — your Anthropic API key lives only in your browser's `localStorage`
  and is sent directly to Anthropic's API. It never touches a server we control.

## 🚀 Try it

1. Get an API key from [console.anthropic.com](https://console.anthropic.com/settings/keys)
2. Open the [live demo](https://Ben41231.github.io/fitcheck-ai/) (or run locally, see below)
3. Paste your key, upload a photo, hit **Rate My Fit**

## 🖥️ Run locally

No build step, no dependencies. Any static file server works:

```bash
git clone https://github.com/Ben41231/fitcheck-ai.git
cd fitcheck-ai
python3 -m http.server 8000
# open http://localhost:8000
```

## 📦 Deploy your own on GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to the `main` branch, root folder
4. Your app is live at `https://Ben41231.github.io/fitcheck-ai/`

That's it — no CI, no build pipeline, no server to maintain.

## 🔐 How your API key is handled

This app calls `https://api.anthropic.com/v1/messages` directly from your browser using the
`anthropic-dangerous-direct-browser-access` header. That means:

- Your key is stored **only** in your browser's `localStorage`, on your device
- It is sent **only** to Anthropic, never to any server this project controls
- Anyone who opens the same browser/profile could read it from dev tools — don't use this on a
  shared computer with a key you care about, and use a key with reasonable spend limits

This trade-off is what makes the project entirely static and free to host — there is no backend
that could be compromised, because there is no backend.

## 🧠 How it works

1. You upload one photo (outfit mode) or several (closet mode)
2. The app sends the image(s) + your style input to Claude with a prompt asking for a strict
   JSON response: score, detected style, colors, trend notes, and (optionally) a roast
3. The JSON is parsed and rendered client-side — no server round-trip beyond the Anthropic API call

Trend awareness comes from Claude's general fashion knowledge, not a live trends feed — this is
a static app with no backend to host a trends API.

## 🛣️ Roadmap ideas

- Shareable result cards for social media
- Outfit history saved locally
- Multi-model comparison (Sonnet vs Haiku ratings side by side)
- Seasonal/occasion-aware suggestions (e.g. "rate this for a job interview")

## 🤝 Contributing

Issues and PRs welcome. Keep it dependency-free and backend-free — that's the whole point.

## 📄 License

MIT — see [LICENSE](LICENSE).
