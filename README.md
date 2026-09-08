# Srix ↔️

**Fast, private file & clipboard transfers on your own network — no account, no cloud, nothing leaves your Wi‑Fi.**

Srix turns any laptop into a tiny local web app that every other device on the same network can open in a browser. Drop a file on your phone, grab it on your laptop. Copy text on one device, watch it show up live on every other tab. No installs on the receiving devices, no sign‑up, no data ever leaving your LAN.

---

## Features

- **📁 Send files** — upload from one device, download from any other, over plain HTTP on your local network.
- **⚡ Srix text (Quick Share)** — a live, shared clipboard. Anything typed or pasted shows up instantly on every connected device via WebSockets.
- **🔒 Private rooms** — optionally password-protect a session. Devices with the same password are placed in an isolated room (files, text, and device list are never visible to other rooms). Rooms auto-delete ~60 seconds after the last device disconnects. The default "Free for all" room is never auto-deleted.
- **🔗 Share via QR code / link** — scan a QR code or copy a link to open Srix on another device instantly.
- **🌓 Light/dark theme**, custom device names, and a single-port design that plays nicely with tunnels (e.g. Cloudflare Tunnel) or simple port forwarding.

## How it works

The Python backend (`server.py`) runs three things:

1. An internal HTTP server (file upload/download, static assets) bound to `127.0.0.1`.
2. An internal WebSocket server (Quick Share live sync, device presence) bound to `127.0.0.1`.
3. A tiny async **proxy** on `0.0.0.0:8080` — the only port you actually expose — that inspects each incoming connection and forwards it to the HTTP server or the WebSocket server based on whether it's a `websocket` upgrade request. This means you only ever need to forward/tunnel **one port** to make Srix reachable outside your machine, if you choose to.

The frontend (`index.html`, `style.css`, `script.js`) is a single-page app with three views: Home, Send files, and Srix text.

## Requirements

- Python 3.10+
- The [`websockets`](https://pypi.org/project/websockets/) package

```bash
pip install -r requirements.txt
```

## Running from source

```bash
git clone https://github.com/<your-username>/srix.git
cd srix
pip install -r requirements.txt
python server.py
```

Then open the printed URL (defaults to `http://localhost:8080`) — it will also open automatically in your default browser. Other devices on the same Wi-Fi can reach it at `http://<your-computer's-LAN-IP>:8080`.

| Route | Purpose |
|---|---|
| `http://localhost:8080/` | Home screen |
| `http://localhost:8080/transfer` | File transfer view |
| `http://localhost:8080/quickshare` | Srix text (live clipboard) view |

Uploaded files are saved under `received_files/<room>/` next to `server.py` (or next to the executable, if running a packaged build).

## Prebuilt executables

Prebuilt Windows executables (`global_launcher.exe`, `server.exe`) are provided for people who just want to double-click and go, without installing Python. **These are large binaries and are best distributed as [GitHub Release](https://docs.github.com/en/repositories/releasing-projects-on-github) assets rather than committed into the repository** — see [Packaging](#packaging--distributing-executables) below for why, and for how to rebuild them yourself from source.

## Project structure

```
srix/
├── server.py           # Backend: HTTP server, WebSocket server, proxy, room logic
├── index.html           # App shell / markup
├── style.css             # Styling (light + dark theme)
├── script.js             # Frontend logic: uploads, downloads, Quick Share, rooms, QR
├── requirements.txt
├── .gitignore
├── received_files/       # Created at runtime — uploaded files land here (gitignored)
└── README.md
```

## Packaging / distributing executables

If you want to rebuild the `.exe` launcher and server yourself (e.g. with [PyInstaller](https://pyinstaller.org/)) rather than trusting a prebuilt binary:

```bash
pip install pyinstaller
pyinstaller --onefile --name server server.py
```

You'll need to make sure `index.html`, `style.css`, and `script.js` are bundled as data files (PyInstaller's `--add-data` flag) since `server.py` looks for them relative to `sys._MEIPASS` when frozen.

**Why not commit the `.exe` files to the repo directly:**
- GitHub repos are meant for source; large binaries bloat clone size and `git` history forever (binaries don't diff/compress well).
- People cloning the repo to read/modify the code have to download tens of megabytes they don't need.
- It's harder for others to verify what a committed binary actually does versus source they can read — Release assets, built via a visible CI/build step, are more trustworthy.

Instead, publish them as assets on a [GitHub Release](https://github.com/<your-username>/srix/releases) (Releases → **Draft a new release** → attach `global_launcher.exe` / `server.exe`) and link to that release from this README once it exists, or point the release build step at whatever CI workflow you use.

## Privacy & security notes

- Nothing is sent anywhere off your local network by default — there's no external server involved.
- Room passwords are never stored; the server only keeps a SHA-256 hash used to bucket devices into the same room.
- If you expose Srix to the internet (e.g. via a Cloudflare Tunnel) instead of just your LAN, anyone with the link can reach the "Free for all" room — use a password-protected room for anything sensitive, and treat the link like you would any file-sharing link.

## License

Add a license of your choice (e.g. MIT) as `LICENSE` before publishing — the repo currently has none.

## Contributing

Issues and PRs welcome. Please don't commit anything to `received_files/` or large binaries directly — see [Packaging](#packaging--distributing-executables) above.
