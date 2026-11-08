# Softland AI server

This is a tiny free server (a Cloudflare Worker) that lets **everyone** use Softland's AI without their own key.
Your keys are stored as secrets on Cloudflare and are never visible in the app.

It tries **Gemini** first. If Gemini fails or hits its limit, it switches to **Groq**, then **OpenRouter**.
You can set up just Gemini and add the backups later. Any provider without a key is skipped.

## 1. Get the keys (all free)

| Provider | Where | Secret name |
|---|---|---|
| Google Gemini | https://aistudio.google.com/apikey | `GEMINI_API_KEY` |
| Groq (backup 1) | https://console.groq.com/keys | `GROQ_API_KEY` |
| OpenRouter (backup 2) | https://openrouter.ai/keys | `OPENROUTER_API_KEY` |

## 2. Create the Worker

1. Go to https://dash.cloudflare.com, then **Compute (Workers)** / **Workers & Pages**, then **Create**, then **Create Worker** (start from "Hello World").
2. Name it `softland-ai` and click **Deploy**.
3. Click **Edit code**, delete everything, paste all of [`worker.js`](worker.js), and click **Deploy**.

## 3. Add the keys

In the Worker go to **Settings**, then **Variables and Secrets**, then **Add**. For each key, choose type **Secret**, use the name from the table above, paste the key, and click **Deploy**.

## 4. Check it

Open the Worker's address (like `https://softland-ai.<your-name>.workers.dev`).
You should see `{"ok":true, ... "providers":["gemini","groq","openrouter"]}`.

Then put that address in `AI_SERVER` near the top of the AI section in `index.html`, or paste it in the app under **Settings, then AI, then Softland AI server**.

## Notes

- Only the Softland site (`https://lari26-o.github.io`) can use the server. To allow other sites, add a plain-text variable `ALLOWED_ORIGINS` with a comma-separated list.
- There is a light limit of 20 requests per minute per visitor.
- To change models without editing code, add the variables `GEMINI_MODEL`, `GROQ_MODEL` or `OPENROUTER_MODEL`.
- On free tiers, providers may use prompts to improve their products.
