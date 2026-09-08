# Srix — fast, private transfers on your network

Srix is a lightweight local-network file transfer and live "clipboard" tool. Open it on one device, open it on another device on the same Wi‑Fi (or connect remotely via a Cloudflare Tunnel link), and instantly send files or share live text between them — no account, no cloud storage.

It has two main features:

- **Send files** — upload from one device, download from any other connected device.
- **Srix text (Quick Share)** — a live, shared clipboard. Anything typed or pasted shows up instantly on every other device watching the page.

Optionally, a session can be **password protected**, which puts everyone who enters that password into their own private, isolated room (separate file list, separate Quick Share feed, separate connected-device list) — invisible to everyone in the public "Free for all" space.

**Everything runs on your own laptop.** There's no external server, cloud backend, or third-party storage involved — `server.py` (or `server.exe` / `global_launcher.exe`) *is* the whole app. Your laptop is the host: it serves the web page, holds the files in a folder on your own disk, and relays the Quick Share messages between devices. Other devices are just talking to your machine, either over your local Wi-Fi or, if you're using `global_launcher.exe`, through a Cloudflare Tunnel that points back to your laptop. If you close the app or shut the laptop down, the session ends — nothing keeps running anywhere else.

---

## How it works

- A Python backend (`server.py`) runs a single HTTP + WebSocket server.
- The frontend (`index.html`, `style.css`, `script.js`) is a single-page app served by that backend.
- Everything — uploaded files, Quick Share text, and the device list — is scoped to a "room." No password = the shared public room. Entering a password hashes it into a private room ID; the server never stores the raw password.
- Private rooms auto-clean themselves: once every device using a given password has disconnected, that room's files and shared text are automatically deleted about 60 seconds later (unless someone reconnects with that password first). The public "Free for all" room is never auto-deleted.
- The server is threaded (`ThreadingMixIn`), so every device's request runs on its own thread — multiple people can upload, download, and browse the file list at the same time without blocking each other.

---

## How the port system actually works

Srix doesn't run one server on one port — it runs **three** things at once, and only one of them is ever meant to be reachable from outside your machine:

- **`PUBLIC_PORT = 8080`** — the only port that listens on `0.0.0.0` (all network interfaces), meaning it's the only one reachable from your LAN or through a tunnel. This is a tiny proxy, not the real server.
- **`INTERNAL_HTTP_PORT = 8081`** — the actual file-transfer/HTTP server. Bound only to `127.0.0.1` (localhost), so it physically cannot be reached from another device — only from processes on your own machine.
- **`INTERNAL_WEBSOCKET_PORT = 8765`** — the actual Quick Share WebSocket server. Also bound only to `127.0.0.1`, same reasoning.

**Why split it up like this:** Cloudflare Tunnel (and most simple tunnels/port forwards) only expose a single local port to the outside world. Srix needs two different kinds of servers — plain HTTP for file transfer, and a WebSocket server for Quick Share's live updates. So instead of picking one, a small proxy sits in front of both on port `8080` and decides where to send each incoming connection:

1. It reads just the incoming request's headers (with a 10-second timeout, so a stalled connection can't hang it forever).
2. If the headers contain `Upgrade: websocket`, it opens a connection to the internal WebSocket server (`8765`) and pipes the raw bytes straight through.
3. Otherwise, it opens a connection to the internal HTTP server (`8081`) and pipes those bytes through instead.
4. Data is streamed both ways in 64KB chunks for the rest of the connection — the proxy isn't inspecting or modifying anything after the initial routing decision, it's just relaying.

The upshot: whichever way a device connects — `localhost:8080` on the host, `192.168.x.x:8080` on the LAN, or a `trycloudflare.com` link through `global_launcher.exe` — it's always hitting the *same* single port `8080`, and the proxy transparently routes it to the right internal service. The two internal servers themselves are never directly reachable from any other device, tunnel or not.

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

## Where your files go on disk

When someone uploads a file, the server saves it into a folder named **`received_files`**, created automatically next to the server the first time it runs. Inside that, files are further split into subfolders per room (a hashed ID for private/password rooms, so different passwords never share a folder), which is what keeps a private room's files invisible to the public space and to other private rooms.

Filenames are also sanitized on every save — the server strips any folder/path info from the name (`os.path.basename`) before writing to disk, so an upload can never be crafted to write outside the `received_files` folder (i.e. no directory-traversal via a filename like `../../something`).

---

## Large file handling — chunked, resumable, streamed

A few things in `server.py`/`script.js` specifically make Srix reliable for very large transfers (the server is built to handle files up to roughly **100GB**):

- **16MB chunks, not one giant upload.** The browser slices each file into fixed **16MB** pieces and sends them one at a time to `/upload-chunk`, instead of uploading the whole file as a single request. This matters especially over a Cloudflare Tunnel, which will kill a single request that runs too long — with small chunks, a hiccup only costs you the current 16MB piece, not the whole file.
- **Pause / Resume, on demand.** Each file in the upload queue has its own **Pause** and **Resume** buttons — you can pause an in-progress transfer and pick it back up later without restarting it.
- **Automatic resume after a real interruption** (power cut, closed tab, app/server restart, dropped Wi-Fi). Each upload is identified by a hash of the file's **name + size + last-modified time** — not a random session ID — so the server can always recognize "this is the same file, partway through." Before accepting new bytes, the server checks how many bytes for that ID already exist on disk and simply continues from that point. Re-selecting the same file and hitting send again is all that's needed to resume; nothing has to be re-sent from the start.
- **Constant, tiny memory usage regardless of file size.** On the server side, incoming chunks are streamed straight to a `.part` file on disk in small internal pieces (1MB at a time) rather than being buffered fully in memory — so a 100GB file doesn't take 100GB of RAM to receive, just a small, fixed amount no matter how large the file is.
- **In-progress uploads live separately from finished ones**, in a `partial_uploads` folder (as `.part` files) until complete, then move into `received_files` — so a half-finished transfer never shows up as a downloadable/available file.
- **Downloads are resumable too.** The download side supports HTTP `Range` requests, so if a download gets paused or interrupted, it can pick back up from the exact byte it left off at instead of restarting the whole file.

---

## Security / trust notes (what's actually built in)

- **Passwords are never stored.** When you set a session password, the server never saves the raw password anywhere — it's immediately hashed (SHA-256) into a room ID, and that hash is all that's kept in memory. Different passwords always map to different, isolated rooms; the same password always maps back to the same room.
- **Private rooms are fully isolated.** Files, Quick Share messages, and the connected-device list are all scoped per room — a private/password room's contents are invisible from "Free for all" and from every other private room, and vice versa.
- **Auto-delete for private rooms.** Once every device using a given password has disconnected, that room's files and Quick Share text are automatically deleted about 60 seconds later (unless someone reconnects with that same password first). The public room is never auto-deleted this way.
- **Only one port is ever exposed.** The real HTTP and WebSocket servers only listen on `127.0.0.1` and can't be reached from outside your machine at all — see [How the port system actually works](#how-the-port-system-actually-works) above for the full breakdown.
- **No path traversal via uploaded filenames.** Every filename passed to the server is reduced to just its base name (`os.path.basename`) before being written or deleted on disk, so a malicious filename can't be used to write or delete files outside the intended upload folder.
- **No caching of stale app code.** The server explicitly sends `Cache-Control: no-store`, `Pragma: no-cache`, and `Expires: 0` on every response, so browsers can't silently keep running an old cached copy of the app against a restarted/updated server.

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
