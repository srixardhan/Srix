# Srix — fast, private transfers on your network

Srix is a lightweight local-network file transfer and live "clipboard" tool. Open it on one device, open it on another device on the same Wi‑Fi (or connect remotely via a Cloudflare Tunnel link), and instantly send files or share live text between them — no account, no cloud storage.

It has two main features:

- **Send files** — upload from one device, download from any other connected device.
- **Srix text (Quick Share)** — a live, shared clipboard. Anything typed or pasted shows up instantly on every other device watching the page.

Optionally, a session can be **password protected**, which puts everyone who enters that password into their own private, isolated room (separate file list, separate Quick Share feed, separate connected-device list) — invisible to everyone in the public "Free for all" space.

---

## How it works

- A Python backend (`server.py`) runs a single HTTP + WebSocket server.
- The frontend (`index.html`, `style.css`, `script.js`) is a single-page app served by that backend.
- Everything — uploaded files, Quick Share text, and the device list — is scoped to a "room." No password = the shared public room. Entering a password hashes it into a private room ID; the server never stores the raw password.
- Private rooms auto-clean themselves: once every device using a given password has disconnected, that room's files and shared text are automatically deleted about 60 seconds later (unless someone reconnects with that password first). The public "Free for all" room is never auto-deleted.
- Only **one port** needs to be exposed to the outside world (`8080`). A small internal proxy listens on that port and forwards each connection to either the internal HTTP server or the internal WebSocket server depending on the request type, so both file transfer and Quick Share work through that single tunneled port. This is what makes it Cloudflare Tunnel / port-forward friendly.

---

## Project files

| File | Purpose |
|---|---|
| `index.html` | App markup — home screen, file transfer screen, Quick Share screen, password/device-name/share-link modals |
| `style.css` | Styling and theming (light/dark) |
| `script.js` | Frontend logic — device list, WebSocket connection, uploads/downloads, Quick Share, room/password handling |
| `server.py` | Backend server — HTTP file handling, WebSocket broadcast, room management, cleanup |
| `global_launcher.exe` | Windows launcher — starts the server **and** opens a Cloudflare Tunnel for remote/global access |
| `server.exe` | Windows build of the server for **local-network-only** use (no tunnel) |

---

## Running it — the `.exe` files

There are two Windows executables, for two different situations:

### `server.exe` — local network only

Just double-click it. It starts the server on your machine and serves the app at:

```
http://localhost:8080
```

Use this if everyone who needs access is on the **same Wi-Fi/LAN**.

### `global_launcher.exe` — local network + remote/global access

Double-click it. This does everything `server.exe` does, **plus** it spins up a Cloudflare Tunnel automatically, so:

- It starts the local server (same as above — reachable at `localhost:8080`).
- It prints/gives you a **Cloudflare Tunnel link** (a `https://….trycloudflare.com` style URL). Anyone with that link can reach your Srix session from **outside your network** too — not just people on your Wi-Fi.

Use `global_launcher.exe` when you want to share files/text with someone who is **not** on your local network.

### Connecting another device on the same Wi-Fi (without the tunnel)

If you just want another device on your **same Wi-Fi** to connect (no need for the Cloudflare link):

1. Open **Command Prompt** (`cmd`).
2. Type:
   ```
   ipconfig
   ```
3. Find the line for **IPv4 Address** — it'll look something like `192.168.x.x`.
4. Give that address to the other person in this format:
   ```
   192.168.x.x:8080
   ```
5. They open that address in their browser and land on the same Srix session as you.

> Note: only port `8080` matters here — that's the single port the server exposes/tunnels, so it's the only one you ever need to share, forward, or open in a firewall.

---

## Using the app

### Home screen
- Shows how many devices are currently connected and a live status dot.
- **Edit device name** — rename your device so others see a friendly name instead of a random ID.
- **Share link** — opens a QR code + copyable link for the exact URL you're currently using (your LAN address or your active Cloudflare Tunnel URL), so another device can join by scanning instead of typing.
- **Lock icon** — opens the password-protection modal (see below). Hidden/off by default — sessions start as "Free for all."
- **Theme toggle** — switch light/dark.

### Send files
- **Upload** — drag & drop or choose files; click **Send files**. Supports large files via chunked/resumable upload.
- **Available files** — see everything others have uploaded to the current room, select individual files or **Select all**, then **Download** or **Delete**.

### Srix text (Quick Share)
- A shared live text box. Type or paste, then **Srix it →** (or `Ctrl+Enter`) to broadcast it to every connected device instantly.
- **Clear all** wipes the shared feed for everyone in the current room.
- Up to 200 items per room, each up to 500,000 characters.

### Password-protected sessions
- Click the lock icon on the home screen → enter a password → **Protect this session**.
- Anyone who enters the **same password** lands in that same private room with you; everyone else stays in the public "Free for all" space and can't see it.
- Leaving the private room takes you back to "Free for all."
- **Auto-delete:** once every device using that password has disconnected, its files and Quick Share text are automatically deleted ~60 seconds later — unless someone reconnects with that password before then.

---

## Quick start summary

**Local network only:**
1. Run `server.exe` (or `python server.py`) on the host machine.
2. Open `http://localhost:8080` on the host.
3. Get the host's IPv4 via `ipconfig` → share `192.168.x.x:8080` with others on the same Wi-Fi.

**Remote/global access:**
1. Run `global_launcher.exe`.
2. Share the Cloudflare Tunnel link it gives you with anyone, anywhere.
3. (Local devices can still use `localhost:8080` or the `192.168.x.x:8080` method above at the same time.)
