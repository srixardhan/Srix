import asyncio
import hashlib
import json
import os
import re
import shutil
import sys
import uuid
import webbrowser

from datetime import datetime, timezone

from http.server import SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn, TCPServer
from urllib.parse import urlparse, unquote, parse_qs

import websockets
from websockets.asyncio.server import serve


# ==========================================
# SETTINGS
# ==========================================

# This is the ONLY port that needs to be exposed
# (e.g. through a Cloudflare Tunnel, port forward, etc).
# A small proxy listens here and forwards each connection
# to either the internal HTTP server or the internal
# WebSocket server, based on whether it's an "Upgrade:
# websocket" request. This lets both file transfer and
# Quick Share work through a single tunneled port.
PUBLIC_PORT = 8080

# Internal-only ports. These are bound to 127.0.0.1 so they
# are never reachable directly from outside this machine -
# all outside traffic must go through PUBLIC_PORT above.
INTERNAL_HTTP_PORT = 8081
INTERNAL_WEBSOCKET_PORT = 8765

# Kept for backwards compatibility with any code/log lines
# below that still refer to these names.
HTTP_PORT = INTERNAL_HTTP_PORT
WEBSOCKET_PORT = INTERNAL_WEBSOCKET_PORT


# ==========================================
# PATHS
# ==========================================

if getattr(sys, "frozen", False):
    BASE_DIR = os.path.dirname(sys.executable)
    WEB_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    WEB_DIR = BASE_DIR


UPLOAD_FOLDER = os.path.join(
    BASE_DIR,
    "received_files"
)

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)


# ==========================================
# ROOMS (PASSWORD PROTECTION)
# ==========================================
#
# The site can be entered two ways: "Free for all" (no
# password - the shared/default room) or with a password
# (a private room). Everything - uploaded files, Quick
# Share text, the connected-device list - is partitioned
# by room, so a password-protected room is only ever
# visible to devices that entered that same password.
#
# The room a request belongs to is identified by an
# "X-Srix-Room" header (HTTP) or a "room" query parameter
# on the WebSocket URL, both carrying the raw password the
# person typed (or an empty string for Free for all). The
# server never stores that password - it's just hashed
# down into a stable room id used to pick a folder / state
# bucket. Different passwords land in different, isolated
# rooms; the same password always lands back in the same
# room.

DEFAULT_ROOM = "public"


def get_room_id(raw_token):
    if not raw_token:
        return DEFAULT_ROOM

    token = raw_token.strip()

    if not token:
        return DEFAULT_ROOM

    return "room-" + hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()[:16]


def room_id_from_headers(headers):
    return get_room_id(
        headers.get("X-Srix-Room", "")
    )


def get_room_upload_folder(room_id):
    path = os.path.join(
        UPLOAD_FOLDER,
        room_id
    )

    os.makedirs(
        path,
        exist_ok=True
    )

    return path


def room_folder_path(room_id):
    """Same path as get_room_upload_folder, but never creates it -
    used when checking/deleting a room's folder."""

    return os.path.join(
        UPLOAD_FOLDER,
        room_id
    )


# ==========================================
# AUTO-DELETE EMPTY PASSWORD ROOMS
# ==========================================
#
# A password room's files (and its Quick Share text) are
# wiped once every device using that password disconnects -
# but only after a short grace period, so a page refresh or a
# brief Wi-Fi hiccup doesn't destroy files that were just sent.
# The Free for all room (DEFAULT_ROOM) is never auto-deleted.

ROOM_CLEANUP_GRACE_SECONDS = 60

room_cleanup_tasks = {}


async def room_is_empty(room_id):
    if clients_lock is None:
        return True

    async with clients_lock:
        return not any(
            info.get("room") == room_id
            for info in client_devices.values()
        )


def cancel_room_cleanup(room_id):
    task = room_cleanup_tasks.pop(
        room_id,
        None
    )

    if task and not task.done():
        task.cancel()


def schedule_room_cleanup(room_id):
    if room_id == DEFAULT_ROOM:
        return

    cancel_room_cleanup(room_id)

    room_cleanup_tasks[room_id] = asyncio.create_task(
        cleanup_room_after_delay(room_id)
    )


async def cleanup_room_after_delay(room_id):
    try:
        await asyncio.sleep(
            ROOM_CLEANUP_GRACE_SECONDS
        )

    except asyncio.CancelledError:
        return

    if not await room_is_empty(room_id):
        return

    folder = room_folder_path(room_id)

    if os.path.isdir(folder):

        shutil.rmtree(
            folder,
            ignore_errors=True
        )

        print(
            f"Room '{room_id}' emptied - "
            f"files deleted."
        )

    if quickshare_lock is not None:

        async with quickshare_lock:
            quickshare_items_by_room.pop(
                room_id,
                None
            )

    room_cleanup_tasks.pop(
        room_id,
        None
    )


# ==========================================
# QUICK SHARE STATE
# ==========================================
# Per-room buckets: each dict is keyed by room_id so one
# room's devices/items are never visible to another room.

connected_clients = set()
client_devices = {}
quickshare_items_by_room = {}

websocket_loop = None

clients_lock = None
quickshare_lock = None


# ==========================================
# QUICK SHARE ITEM LIMITS
# ==========================================

MAX_QUICKSHARE_ITEMS = 200
MAX_QUICKSHARE_TEXT_LENGTH = 500_000


# ==========================================
# FILE NAME HANDLER
# ==========================================

def get_unique_filename(filename, folder):
    filename = os.path.basename(filename)

    name, extension = os.path.splitext(filename)

    path = os.path.join(
        folder,
        filename
    )

    if not os.path.exists(path):
        return filename

    counter = 1

    while True:
        new_filename = (
            f"{name} ({counter}){extension}"
        )

        new_path = os.path.join(
            folder,
            new_filename
        )

        if not os.path.exists(new_path):
            return new_filename

        counter += 1


# ==========================================
# FILE OWNERSHIP (WHICH DEVICE SENT WHAT)
# ==========================================
#
# A small JSON sidecar living inside each room's own folder,
# mapping {filename: device_name}. It lives alongside the
# files it describes, so it's automatically wiped along with
# everything else when a password room's folder is cleaned up
# (see cleanup_room_after_delay above) - no separate lifecycle
# to manage.

FILE_META_NAME = ".srix_file_meta.json"


def get_room_meta_path(room_id):
    return os.path.join(
        get_room_upload_folder(room_id),
        FILE_META_NAME
    )


def load_file_meta(room_id):
    path = os.path.join(
        room_folder_path(room_id),
        FILE_META_NAME
    )

    if not os.path.isfile(path):
        return {}

    try:
        with open(path, "r", encoding="utf-8") as handle:
            data = json.load(handle)

        if isinstance(data, dict):
            return data

        return {}

    except Exception as error:
        print("FILE META READ ERROR:", error)
        return {}


def save_file_meta(room_id, meta):
    path = get_room_meta_path(room_id)

    try:
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(meta, handle)

    except Exception as error:
        print("FILE META WRITE ERROR:", error)


def set_file_owner(room_id, filename, device_name):
    if not device_name:
        return

    device_name = device_name.strip()[:60]

    if not device_name:
        return

    meta = load_file_meta(room_id)
    meta[filename] = device_name
    save_file_meta(room_id, meta)


def remove_file_meta(room_id, filenames):
    meta = load_file_meta(room_id)
    changed = False

    for filename in filenames:
        if filename in meta:
            del meta[filename]
            changed = True

    if changed:
        save_file_meta(room_id, meta)


# ==========================================
# RESUMABLE UPLOAD SUPPORT
# ==========================================
#
# Large files are sent as a raw binary POST body (no multipart
# parsing needed) to /upload-chunk, streamed straight to a
# ".part" file on disk in small pieces so memory use stays
# tiny no matter the file size.
#
# Resumability: each upload is identified by a hash of
# (filename, size, lastModified) - not a random session id.
# That means if the connection drops, the browser tab is
# closed, or the whole app restarts, re-selecting the SAME
# file and clicking send again will automatically pick up
# from wherever the server left off, because the server just
# checks how many bytes already exist on disk for that id.

STREAM_CHUNK_SIZE = 1024 * 1024  # 1 MB

PARTIAL_FOLDER = os.path.join(
    BASE_DIR,
    "partial_uploads"
)

os.makedirs(
    PARTIAL_FOLDER,
    exist_ok=True
)


def make_upload_id(filename, filesize, modified, room_id):
    raw = f"{room_id}:{filename}:{filesize}:{modified}"

    return hashlib.sha256(
        raw.encode("utf-8")
    ).hexdigest()[:24]


def partial_upload_path(upload_id):
    return os.path.join(
        PARTIAL_FOLDER,
        upload_id + ".part"
    )


def bytes_already_received(upload_id):
    path = partial_upload_path(upload_id)

    if os.path.isfile(path):
        return os.path.getsize(path)

    return 0


def write_chunk_streaming(rfile, content_length, filepath, offset):
    """
    Reads exactly content_length bytes from rfile in small
    pieces and writes them into filepath starting at byte
    offset. Never buffers more than STREAM_CHUNK_SIZE at once.
    """

    mode = "r+b" if os.path.isfile(filepath) else "wb"

    with open(filepath, mode) as out:

        out.seek(offset)

        remaining = content_length

        while remaining > 0:

            to_read = min(
                STREAM_CHUNK_SIZE,
                remaining
            )

            chunk = rfile.read(
                to_read
            )

            if not chunk:
                raise ValueError(
                    "Connection ended before all "
                    "chunk bytes were received"
                )

            out.write(chunk)

            remaining -= len(chunk)


def drain_body(rfile, content_length):
    """Reads and discards content_length bytes without buffering
    them all at once - used when a request has to be rejected but
    its body still needs consuming to keep the connection in sync."""

    remaining = content_length

    while remaining > 0:

        chunk = rfile.read(
            min(STREAM_CHUNK_SIZE, remaining)
        )

        if not chunk:
            break

        remaining -= len(chunk)


# ==========================================
# JSON RESPONSE HELPER
# ==========================================

def send_json(handler, status_code, data):
    response = json.dumps(
        data
    ).encode("utf-8")

    handler.send_response(
        status_code
    )

    handler.send_header(
        "Content-Type",
        "application/json; charset=utf-8"
    )

    handler.send_header(
        "Content-Length",
        str(len(response))
    )

    handler.end_headers()

    handler.wfile.write(
        response
    )


# ==========================================
# QUICK SHARE BROADCAST
# ==========================================

async def broadcast_message(message, room_id):
    if clients_lock is None:
        return

    encoded_message = json.dumps(
        message
    )

    async with clients_lock:
        clients = [
            client
            for client in connected_clients
            if client_devices.get(client, {}).get("room") == room_id
        ]

    disconnected = set()

    for client in clients:
        try:
            await client.send(
                encoded_message
            )

        except Exception:
            disconnected.add(
                client
            )

    if disconnected:
        async with clients_lock:
            connected_clients.difference_update(
                disconnected
            )

            for client in disconnected:
                client_devices.pop(
                    client,
                    None
                )


# ==========================================
# BROADCAST DEVICE LIST
# ==========================================
# Additive to the existing protocol: older
# clients that don't recognize "device_list"
# simply ignore it, so this stays backward
# compatible with the "device_count" message.
# ==========================================

async def broadcast_device_list(room_id):
    if clients_lock is None:
        return

    async with clients_lock:
        devices = [
            {
                "id": info.get("id"),
                "name": info.get("name") or "Device"
            }
            for info in client_devices.values()
            if info.get("room") == room_id
        ]

    await broadcast_message({
        "type": "device_list",
        "devices": devices
    }, room_id)


# ==========================================
# BROADCAST QUICK SHARE STATE
# ==========================================

async def broadcast_quickshare_state(room_id):
    if quickshare_lock is None:
        return

    async with quickshare_lock:
        items = list(
            quickshare_items_by_room.get(room_id, [])
        )

    await broadcast_message({
        "type": "state",
        "items": items
    }, room_id)


# ==========================================
# ADD QUICK SHARE ITEM
# ==========================================

async def add_quickshare_item(
    text,
    device_id,
    device_name,
    room_id
):
    if not isinstance(
        text,
        str
    ):
        return None

    if not text.strip():
        return None

    if len(text) > MAX_QUICKSHARE_TEXT_LENGTH:
        return None

    item = {
        "id": str(
            uuid.uuid4()
        ),
        "text": text,
        "device_id": device_id,
        "device_name": device_name,
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),
    }

    if quickshare_lock is None:
        return None

    async with quickshare_lock:
        room_items = quickshare_items_by_room.setdefault(
            room_id,
            []
        )

        room_items.insert(
            0,
            item
        )

        if len(room_items) > MAX_QUICKSHARE_ITEMS:
            del room_items[
                MAX_QUICKSHARE_ITEMS:
            ]

    await broadcast_message({
        "type": "item_added",
        "item": item
    }, room_id)

    return item


# ==========================================
# DELETE QUICK SHARE ITEM
# ==========================================

async def delete_quickshare_item(item_id, room_id):
    if not isinstance(
        item_id,
        str
    ):
        return False

    removed = False

    if quickshare_lock is None:
        return False

    async with quickshare_lock:
        room_items = quickshare_items_by_room.get(
            room_id,
            []
        )

        for index, item in enumerate(
            room_items
        ):
            if item.get("id") == item_id:
                room_items.pop(
                    index
                )

                removed = True
                break

    if removed:
        await broadcast_message({
            "type": "item_deleted",
            "id": item_id
        }, room_id)

    return removed


# ==========================================
# CLEAR ALL QUICK SHARE ITEMS
# ==========================================

async def clear_quickshare_items(room_id):
    if quickshare_lock is None:
        return

    async with quickshare_lock:
        quickshare_items_by_room[room_id] = []

    await broadcast_message({
        "type": "all_cleared"
    }, room_id)


# ==========================================
# GET QUICK SHARE STATE
# ==========================================

async def get_quickshare_state(room_id):
    if quickshare_lock is None:
        return []

    async with quickshare_lock:
        return list(
            quickshare_items_by_room.get(room_id, [])
        )


# ==========================================
# HTTP SERVER
# ==========================================

class Handler(SimpleHTTPRequestHandler):

    def __init__(
        self,
        *args,
        **kwargs
    ):
        super().__init__(
            *args,
            directory=WEB_DIR,
            **kwargs
        )

    def end_headers(self):

        # This app has no Cache-Control headers anywhere, so
        # Chromium-based browsers (Brave, Chrome, Edge...) fall
        # back to "heuristic caching" - they'll guess it's fine
        # to reuse an old cached copy of index.html/script.js/
        # style.css based on Last-Modified, even after the files
        # on disk have changed and the server has restarted.
        # That's what forces "clear cookies/site data to make it
        # work again" - the browser is silently running stale JS
        # against the current server. Telling it never to cache
        # anything from this server removes that trap entirely.

        self.send_header(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, max-age=0"
        )

        self.send_header(
            "Pragma",
            "no-cache"
        )

        self.send_header(
            "Expires",
            "0"
        )

        super().end_headers()

    # ======================================
    # GET REQUESTS
    # ======================================

    def do_GET(self):

        path = urlparse(
            self.path
        ).path

        # ==================================
        # HOME
        # ==================================

        if path == "/":
            self.path = "/index.html"
            return super().do_GET()

        # ==================================
        # FILE TRANSFER PAGE
        # (single-page app: index.html
        # handles section switching)
        # ==================================

        elif path == "/transfer":
            self.path = "/index.html"
            return super().do_GET()

        # ==================================
        # QUICK SHARE PAGE
        # (single-page app: index.html
        # handles section switching)
        # ==================================

        elif path == "/quickshare":
            self.path = "/index.html"
            return super().do_GET()

        # ==================================
        # GET FILE LIST
        # ==================================

        elif path == "/files":

            try:
                room_id = room_id_from_headers(
                    self.headers
                )

                room_folder = get_room_upload_folder(
                    room_id
                )

                file_meta = load_file_meta(
                    room_id
                )

                files = []

                for filename in os.listdir(
                    room_folder
                ):
                    # Skip the sidecar metadata file itself -
                    # it lives in the same folder as the files
                    # it describes, but isn't one of them.
                    if filename == FILE_META_NAME:
                        continue

                    filepath = os.path.join(
                        room_folder,
                        filename
                    )

                    if os.path.isfile(filepath):
                        files.append({
                            "name": filename,
                            "size": os.path.getsize(
                                filepath
                            ),
                            "sender": file_meta.get(
                                filename,
                                ""
                            )
                        })

                files.sort(
                    key=lambda x:
                    x["name"].lower()
                )

                send_json(
                    self,
                    200,
                    files
                )

                return

            except Exception as error:

                print(
                    "FILE LIST ERROR:",
                    error
                )

                send_json(
                    self,
                    500,
                    {
                        "success": False,
                        "error":
                            "Could not read files"
                    }
                )

                return

        # ==================================
        # UPLOAD STATUS (for resuming)
        # ==================================

        elif path == "/upload-status":

            try:
                query = parse_qs(
                    urlparse(self.path).query
                )

                name = query.get(
                    "name", [None]
                )[0]

                size = query.get(
                    "size", [None]
                )[0]

                modified = query.get(
                    "modified", [None]
                )[0]

                if not name or size is None or modified is None:

                    send_json(
                        self,
                        400,
                        {
                            "success": False,
                            "error":
                                "Missing name/size/modified"
                        }
                    )

                    return

                room_id = room_id_from_headers(
                    self.headers
                )

                upload_id = make_upload_id(
                    name,
                    size,
                    modified,
                    room_id
                )

                received = bytes_already_received(
                    upload_id
                )

                send_json(
                    self,
                    200,
                    {
                        "success": True,
                        "received": received
                    }
                )

                return

            except Exception as error:

                print(
                    "UPLOAD STATUS ERROR:",
                    error
                )

                send_json(
                    self,
                    500,
                    {
                        "success": False,
                        "error":
                            "Could not get upload status"
                    }
                )

                return

        # ==================================
        # DOWNLOAD FILE
        # ==================================

        elif path.startswith("/download/"):

            encoded_filename = path[
                len("/download/"):
            ]

            filename = unquote(
                encoded_filename
            )

            filename = os.path.basename(
                filename
            )

            room_id = room_id_from_headers(
                self.headers
            )

            room_folder = get_room_upload_folder(
                room_id
            )

            filepath = os.path.join(
                room_folder,
                filename
            )

            if not os.path.isfile(filepath):

                self.send_error(
                    404,
                    "File not found"
                )

                return

            try:

                file_size = os.path.getsize(
                    filepath
                )

                # ==============================
                # RANGE SUPPORT (resumable /
                # pausable downloads). A client
                # that paused and resumed, or
                # retried after a hiccup, sends
                # Range: bytes=START- so we only
                # need to serve the remainder.
                # ==============================

                range_header = self.headers.get(
                    "Range"
                )

                start = 0
                end = file_size - 1

                is_partial = False

                if range_header:

                    range_match = re.match(
                        r"bytes=(\d+)-(\d*)",
                        range_header
                    )

                    if range_match:

                        is_partial = True

                        start = int(
                            range_match.group(1)
                        )

                        if range_match.group(2):

                            end = int(
                                range_match.group(2)
                            )

                        if start >= file_size or start > end:

                            self.send_response(
                                416
                            )

                            self.send_header(
                                "Content-Range",
                                f"bytes */{file_size}"
                            )

                            self.end_headers()

                            return

                length_to_send = end - start + 1

                self.send_response(
                    206 if is_partial else 200
                )

                self.send_header(
                    "Content-Type",
                    "application/octet-stream"
                )

                self.send_header(
                    "Accept-Ranges",
                    "bytes"
                )

                self.send_header(
                    "Content-Length",
                    str(length_to_send)
                )

                if is_partial:

                    self.send_header(
                        "Content-Range",
                        f"bytes {start}-{end}/{file_size}"
                    )

                self.send_header(
                    "Content-Disposition",
                    f'attachment; filename="{filename}"'
                )

                self.end_headers()

                with open(
                    filepath,
                    "rb"
                ) as file:

                    file.seek(start)

                    remaining = length_to_send

                    while remaining > 0:

                        chunk = file.read(
                            min(1024 * 1024, remaining)
                        )

                        if not chunk:
                            break

                        try:

                            self.wfile.write(
                                chunk
                            )

                        except (
                            BrokenPipeError,
                            ConnectionResetError
                        ):

                            # Client paused/cancelled the
                            # download mid-stream - not an
                            # error, just stop sending.

                            return

                        remaining -= len(chunk)

                print(
                    f"File downloaded: {filename} "
                    f"({'partial' if is_partial else 'full'})"
                )

                return

            except Exception as error:

                print(
                    "DOWNLOAD ERROR:",
                    error
                )

                return

        # ==================================
        # QUICK SHARE API STATE
        # ==================================

        elif path == "/quickshare/state":

            try:

                if websocket_loop is None:
                    send_json(
                        self,
                        503,
                        {
                            "success": False,
                            "error":
                                "Quick Share unavailable"
                        }
                    )

                    return

                room_id = room_id_from_headers(
                    self.headers
                )

                future = (
                    asyncio.run_coroutine_threadsafe(
                        get_quickshare_state(room_id),
                        websocket_loop
                    )
                )

                state = future.result(
                    timeout=10
                )

                send_json(
                    self,
                    200,
                    {
                        "success": True,
                        "items": state
                    }
                )

                return

            except Exception as error:

                print(
                    "QUICK SHARE STATE ERROR:",
                    error
                )

                send_json(
                    self,
                    500,
                    {
                        "success": False,
                        "error":
                            "Could not get Quick Share state"
                    }
                )

                return

        # ==================================
        # NORMAL STATIC FILES
        # ==================================

        return super().do_GET()

    # ======================================
    # POST REQUESTS
    # ======================================

    def do_POST(self):

        path = urlparse(
            self.path
        ).path

        # ==================================
        # FILE UPLOAD (resumable, chunked)
        # ==================================

        if path == "/upload-chunk":

            try:

                headers = self.headers

                raw_name = headers.get("X-File-Name")
                raw_size = headers.get("X-File-Size")
                raw_modified = headers.get("X-File-Modified")
                raw_offset = headers.get("X-Chunk-Offset")
                content_length = headers.get("Content-Length")
                raw_device_name = headers.get("X-Device-Name")

                if (
                    not raw_name
                    or raw_size is None
                    or raw_modified is None
                    or raw_offset is None
                    or not content_length
                ):

                    self.send_error(
                        400,
                        "Missing upload headers"
                    )

                    return

                filename = unquote(raw_name)
                filename = os.path.basename(filename)

                try:
                    file_size = int(raw_size)
                    offset = int(raw_offset)
                    content_length = int(content_length)
                except ValueError:

                    self.send_error(
                        400,
                        "Invalid numeric header"
                    )

                    return

                if not filename or file_size < 0 or offset < 0:

                    drain_body(self.rfile, content_length)

                    self.send_error(
                        400,
                        "Invalid upload metadata"
                    )

                    return

                room_id = room_id_from_headers(
                    headers
                )

                upload_id = make_upload_id(
                    filename,
                    file_size,
                    raw_modified,
                    room_id
                )

                partial_path = partial_upload_path(
                    upload_id
                )

                current_size = bytes_already_received(
                    upload_id
                )

                # The browser must be sending bytes starting
                # exactly where the server left off. If it isn't
                # (e.g. it resumed with stale info), reject and
                # tell it the real offset to resync to.
                if offset != current_size:

                    drain_body(self.rfile, content_length)

                    send_json(
                        self,
                        409,
                        {
                            "success": False,
                            "error": "offset mismatch",
                            "expected": current_size
                        }
                    )

                    return

                write_chunk_streaming(
                    self.rfile,
                    content_length,
                    partial_path,
                    offset
                )

                new_size = offset + content_length

                if new_size >= file_size:

                    room_folder = get_room_upload_folder(
                        room_id
                    )

                    final_name = get_unique_filename(
                        filename,
                        room_folder
                    )

                    final_path = os.path.join(
                        room_folder,
                        final_name
                    )

                    os.replace(
                        partial_path,
                        final_path
                    )

                    if raw_device_name:

                        try:
                            device_name = unquote(
                                raw_device_name
                            )

                        except Exception:
                            device_name = None

                        set_file_owner(
                            room_id,
                            final_name,
                            device_name
                        )

                    print(
                        f"File received: {final_name}"
                    )

                    send_json(
                        self,
                        200,
                        {
                            "success": True,
                            "complete": True,
                            "filename": final_name
                        }
                    )

                    return

                send_json(
                    self,
                    200,
                    {
                        "success": True,
                        "complete": False,
                        "received": new_size
                    }
                )

                return

            except Exception as error:

                print(
                    "UPLOAD ERROR:",
                    error
                )

                self.send_error(
                    500,
                    "Upload failed"
                )

                return

        # ==================================
        # CANCEL AN IN-PROGRESS UPLOAD
        # ==================================

        if path == "/upload-cancel":

            try:

                headers = self.headers

                raw_name = headers.get("X-File-Name")
                raw_size = headers.get("X-File-Size")
                raw_modified = headers.get("X-File-Modified")

                content_length = headers.get(
                    "Content-Length"
                )

                if content_length:

                    drain_body(
                        self.rfile,
                        int(content_length)
                    )

                if not raw_name or raw_size is None or raw_modified is None:

                    self.send_error(
                        400,
                        "Missing upload headers"
                    )

                    return

                filename = os.path.basename(
                    unquote(raw_name)
                )

                room_id = room_id_from_headers(
                    headers
                )

                upload_id = make_upload_id(
                    filename,
                    raw_size,
                    raw_modified,
                    room_id
                )

                partial_path = partial_upload_path(
                    upload_id
                )

                if os.path.isfile(partial_path):

                    os.remove(partial_path)

                print(
                    f"Upload cancelled: {filename}"
                )

                send_json(
                    self,
                    200,
                    {"success": True}
                )

                return

            except Exception as error:

                print(
                    "CANCEL UPLOAD ERROR:",
                    error
                )

                self.send_error(
                    500,
                    "Cancel failed"
                )

                return

        # ==================================
        # QUICK SHARE POST
        # ==================================

        if path == "/quickshare":

            try:

                content_length = (
                    self.headers.get(
                        "Content-Length"
                    )
                )

                if not content_length:

                    self.send_error(
                        400,
                        "Missing request body"
                    )

                    return

                length = int(
                    content_length
                )

                data = self.rfile.read(
                    length
                )

                text = data.decode(
                    "utf-8",
                    errors="replace"
                )

                if len(text) > MAX_QUICKSHARE_TEXT_LENGTH:

                    self.send_error(
                        413,
                        "Text too large"
                    )

                    return

                if websocket_loop is None:

                    self.send_error(
                        503,
                        "Quick Share unavailable"
                    )

                    return

                room_id = room_id_from_headers(
                    self.headers
                )

                future = (
                    asyncio.run_coroutine_threadsafe(
                        add_quickshare_item(
                            text,
                            "http",
                            "HTTP",
                            room_id
                        ),
                        websocket_loop
                    )
                )

                item = future.result(
                    timeout=10
                )

                if item is None:

                    self.send_error(
                        400,
                        "Empty text"
                    )

                    return

                response = b"OK"

                self.send_response(
                    200
                )

                self.send_header(
                    "Content-Type",
                    "text/plain; charset=utf-8"
                )

                self.send_header(
                    "Content-Length",
                    str(len(response))
                )

                self.end_headers()

                self.wfile.write(
                    response
                )

                return

            except Exception as error:

                print(
                    "QUICK SHARE ERROR:",
                    error
                )

                self.send_error(
                    500,
                    "Quick Share failed"
                )

                return

        # ==================================
        # DELETE SELECTED FILES
        # ==================================

        if path == "/delete-selected":

            try:

                content_length = (
                    self.headers.get(
                        "Content-Length"
                    )
                )

                if not content_length:

                    send_json(
                        self,
                        400,
                        {
                            "success": False,
                            "error":
                                "Missing request body"
                        }
                    )

                    return

                length = int(
                    content_length
                )

                body = self.rfile.read(
                    length
                )

                data = json.loads(
                    body.decode("utf-8")
                )

                filenames = data.get(
                    "files",
                    []
                )

                if not isinstance(
                    filenames,
                    list
                ):

                    send_json(
                        self,
                        400,
                        {
                            "success": False,
                            "error":
                                "Invalid file list"
                        }
                    )

                    return

                room_id = room_id_from_headers(
                    self.headers
                )

                room_folder = get_room_upload_folder(
                    room_id
                )

                deleted = []
                failed = []

                for filename in filenames:

                    if not isinstance(
                        filename,
                        str
                    ):
                        continue

                    filename = os.path.basename(
                        filename
                    )

                    if not filename:
                        continue

                    filepath = os.path.join(
                        room_folder,
                        filename
                    )

                    if not os.path.isfile(
                        filepath
                    ):

                        failed.append(
                            filename
                        )

                        continue

                    try:

                        os.remove(
                            filepath
                        )

                        deleted.append(
                            filename
                        )

                        print(
                            f"File deleted: {filename}"
                        )

                    except Exception as error:

                        print(
                            f"DELETE ERROR "
                            f"({filename}):",
                            error
                        )

                        failed.append(
                            filename
                        )

                if deleted:
                    remove_file_meta(
                        room_id,
                        deleted
                    )

                send_json(
                    self,
                    200,
                    {
                        "success": True,
                        "deleted": deleted,
                        "failed": failed
                    }
                )

                return

            except json.JSONDecodeError:

                send_json(
                    self,
                    400,
                    {
                        "success": False,
                        "error":
                            "Invalid JSON"
                    }
                )

                return

            except Exception as error:

                print(
                    "DELETE SELECTED ERROR:",
                    error
                )

                send_json(
                    self,
                    500,
                    {
                        "success": False,
                        "error":
                            "Could not delete selected files"
                    }
                )

                return

        # ==================================
        # UNKNOWN POST
        # ==================================

        self.send_error(
            404,
            "Not found"
        )

    # ======================================
    # DELETE REQUESTS
    # ======================================

    def do_DELETE(self):

        path = urlparse(
            self.path
        ).path

        # ==================================
        # DELETE SINGLE FILE
        # ==================================

        if path.startswith("/delete/"):

            encoded_filename = path[
                len("/delete/"):
            ]

            filename = unquote(
                encoded_filename
            )

            filename = os.path.basename(
                filename
            )

            if not filename:

                send_json(
                    self,
                    400,
                    {
                        "success": False,
                        "error":
                            "Invalid filename"
                    }
                )

                return

            room_id = room_id_from_headers(
                self.headers
            )

            room_folder = get_room_upload_folder(
                room_id
            )

            filepath = os.path.join(
                room_folder,
                filename
            )

            if not os.path.isfile(
                filepath
            ):

                send_json(
                    self,
                    404,
                    {
                        "success": False,
                        "error":
                            "File not found"
                    }
                )

                return

            try:

                os.remove(
                    filepath
                )

                remove_file_meta(
                    room_id,
                    [filename]
                )

                print(
                    f"File deleted: {filename}"
                )

                send_json(
                    self,
                    200,
                    {
                        "success": True,
                        "filename": filename
                    }
                )

                return

            except Exception as error:

                print(
                    "DELETE ERROR:",
                    error
                )

                send_json(
                    self,
                    500,
                    {
                        "success": False,
                        "error":
                            "Could not delete file"
                    }
                )

                return

        # ==================================
        # UNKNOWN DELETE
        # ==================================

        send_json(
            self,
            404,
            {
                "success": False,
                "error":
                    "Not found"
            }
        )


# ==========================================
# THREADED HTTP SERVER
# ==========================================

class ThreadedHTTPServer(
    ThreadingMixIn,
    TCPServer
):

    allow_reuse_address = True
    daemon_threads = True


# ==========================================
# WEBSOCKET SERVER
# ==========================================

async def websocket_handler(websocket):

    global connected_clients

    if clients_lock is None:
        return

    # ======================================
    # DETERMINE ROOM
    # (from the "room" query param on the
    # connection URL - the raw password, or
    # empty for Free for all)
    # ======================================

    request_path = getattr(
        getattr(websocket, "request", None),
        "path",
        None
    ) or getattr(websocket, "path", "") or ""

    query = parse_qs(
        urlparse(request_path).query
    )

    room_token = unquote(
        query.get("room", [""])[0]
    )

    room_id = get_room_id(room_token)

    # ======================================
    # CREATE DEVICE ID
    # ======================================

    device_id = str(
        uuid.uuid4()
    )

    device_name = "Device"

    # ======================================
    # REGISTER CLIENT
    # ======================================

    async with clients_lock:

        connected_clients.add(
            websocket
        )

        client_devices[
            websocket
        ] = {
            "id": device_id,
            "name": device_name,
            "room": room_id
        }

        device_count = len([
            c for c in connected_clients
            if client_devices.get(c, {}).get("room") == room_id
        ])

    print(
        f"Device connected to room "
        f"'{room_id}' ({device_count} devices)"
    )

    # A device just joined this room - if a deletion was
    # pending from everyone previously leaving, call it off.
    cancel_room_cleanup(room_id)

    # ======================================
    # SEND INITIAL STATE
    # ======================================

    try:

        items = await get_quickshare_state(room_id)

        await websocket.send(
            json.dumps({
                "type": "sync",
                "items": items,
                "device_count": device_count
            })
        )

    except Exception:

        async with clients_lock:

            connected_clients.discard(
                websocket
            )

            client_devices.pop(
                websocket,
                None
            )

        return

    # ======================================
    # BROADCAST DEVICE COUNT
    # ======================================

    await broadcast_message({
        "type": "device_count",
        "count": device_count
    }, room_id)

    await broadcast_device_list(room_id)

    # ======================================
    # RECEIVE MESSAGES
    # ======================================

    try:

        async for message in websocket:

            try:

                data = json.loads(
                    message
                )

            except json.JSONDecodeError:

                continue

            if not isinstance(
                data,
                dict
            ):
                continue

            message_type = data.get(
                "type"
            )

            # ==================================
            # IDENTIFY DEVICE
            # ==================================

            if message_type == "identify":

                incoming_id = data.get(
                    "device_id"
                )

                name = data.get(
                    "device_name",
                    ""
                )

                if not isinstance(
                    incoming_id,
                    str
                ) or not incoming_id:
                    continue

                if not isinstance(
                    name,
                    str
                ):
                    name = ""

                name = name.strip()

                if not name:
                    name = "Device"

                name = name[:40]

                async with clients_lock:

                    client_info = client_devices.get(
                        websocket
                    )

                    if client_info:

                        client_info["id"] = incoming_id

                        client_info["name"] = name

                        device_id = incoming_id

                        device_name = name

                await broadcast_device_list(room_id)

            # ==================================
            # ADD TEXT ITEM
            # ==================================

            elif message_type == "add_item":

                text = data.get(
                    "text",
                    ""
                )

                if not isinstance(
                    text,
                    str
                ):
                    continue

                async with clients_lock:

                    client_info = client_devices.get(
                        websocket
                    )

                    if not client_info:
                        continue

                    device_id = client_info[
                        "id"
                    ]

                    device_name = client_info[
                        "name"
                    ]

                await add_quickshare_item(
                    text,
                    device_id,
                    device_name,
                    room_id
                )

            # ==================================
            # DELETE ITEM
            # ==================================

            elif message_type == "delete_item":

                item_id = data.get(
                    "id"
                )

                await delete_quickshare_item(
                    item_id,
                    room_id
                )

            # ==================================
            # CLEAR ALL ITEMS
            # ==================================

            elif message_type == "clear_all":

                await clear_quickshare_items(room_id)

            # ==================================
            # REQUEST STATE
            # ==================================

            elif message_type == "request-state":

                items = await get_quickshare_state(room_id)

                await websocket.send(
                    json.dumps({
                        "type": "sync",
                        "items": items
                    })
                )

    except websockets.exceptions.ConnectionClosed:

        pass

    except Exception as error:

        print(
            "WEBSOCKET ERROR:",
            error
        )

    finally:

        # ==================================
        # REMOVE CLIENT
        # ==================================

        async with clients_lock:

            connected_clients.discard(
                websocket
            )

            client_devices.pop(
                websocket,
                None
            )

            device_count = len([
                c for c in connected_clients
                if client_devices.get(c, {}).get("room") == room_id
            ])

        print(
            f"Device disconnected from room "
            f"'{room_id}' ({device_count} devices)"
        )

        if device_count == 0:
            schedule_room_cleanup(room_id)

        # ==================================
        # UPDATE DEVICE COUNT
        # ==================================

        await broadcast_message({
            "type": "device_count",
            "count": device_count
        }, room_id)

        await broadcast_device_list(room_id)


# ==========================================
# START SERVER
# ==========================================

async def main():

    global websocket_loop
    global clients_lock
    global quickshare_lock

    websocket_loop = (
        asyncio.get_running_loop()
    )

    clients_lock = asyncio.Lock()
    quickshare_lock = asyncio.Lock()

    http_server = ThreadedHTTPServer(
        ("127.0.0.1", INTERNAL_HTTP_PORT),
        Handler
    )

    print()
    print("================================")
    print("       PhoneTransfer V2")
    print("================================")
    print()

    print(
        f"Website: "
        f"http://localhost:{PUBLIC_PORT}"
    )

    print(
        f"File Transfer: "
        f"http://localhost:{PUBLIC_PORT}/transfer"
    )

    print(
        f"QuickShare: "
        f"http://localhost:{PUBLIC_PORT}/quickshare"
    )

    print(
        f"(HTTP and WebSocket both go through "
        f"port {PUBLIC_PORT} - that's the only "
        f"port you need to tunnel/forward.)"
    )

    print(
        f"Files saved to: "
        f"{os.path.abspath(UPLOAD_FOLDER)}"
    )

    print()
    print("Server is running...")
    print()

    webbrowser.open(
        f"http://localhost:{PUBLIC_PORT}"
    )

    loop = asyncio.get_running_loop()

    try:

        await loop.run_in_executor(
            None,
            http_server.serve_forever
        )

    finally:

        http_server.shutdown()
        http_server.server_close()


# ==========================================
# HTTP / WEBSOCKET PORT MULTIPLEXER
# ==========================================
#
# Cloudflare Tunnel (and most simple tunnels/port
# forwards) only expose ONE local port to the outside
# world. This app needs two internal servers (plain HTTP
# for file transfer, and a WebSocket server for Quick
# Share), so this proxy sits in front of both, listens on
# the single PUBLIC_PORT, peeks at each incoming
# connection's request headers, and forwards the raw bytes
# to whichever internal server should handle it:
#
#   - "Upgrade: websocket" present  -> internal WS server
#   - anything else                 -> internal HTTP server
#
# Neither internal server needs to know this is happening;
# they just listen on 127.0.0.1 and are never reached
# directly from outside this machine.

PROXY_HEADER_TIMEOUT = 10
PROXY_CHUNK_SIZE = 65536


async def _pipe(
    src,
    dst
):
    try:

        while True:

            chunk = await src.read(
                PROXY_CHUNK_SIZE
            )

            if not chunk:
                break

            dst.write(chunk)

            await dst.drain()

    except Exception:

        pass

    finally:

        try:
            dst.close()
        except Exception:
            pass


async def handle_proxy_connection(
    client_reader,
    client_writer
):

    try:

        try:

            header_data = await asyncio.wait_for(
                client_reader.readuntil(
                    b"\r\n\r\n"
                ),
                timeout=PROXY_HEADER_TIMEOUT
            )

        except (
            asyncio.IncompleteReadError,
            asyncio.TimeoutError,
            ConnectionError
        ):

            return

        is_websocket_upgrade = (
            b"upgrade:" in header_data.lower()
            and b"websocket" in header_data.lower()
        )

        target_port = (
            INTERNAL_WEBSOCKET_PORT
            if is_websocket_upgrade
            else INTERNAL_HTTP_PORT
        )

        try:

            remote_reader, remote_writer = (
                await asyncio.open_connection(
                    "127.0.0.1",
                    target_port
                )
            )

        except OSError as error:

            print(
                "PROXY: could not reach internal "
                f"server on port {target_port}: {error}"
            )

            return

        # Forward the header bytes we already
        # consumed while peeking.
        remote_writer.write(
            header_data
        )

        await remote_writer.drain()

        await asyncio.gather(
            _pipe(
                client_reader,
                remote_writer
            ),
            _pipe(
                remote_reader,
                client_writer
            )
        )

    finally:

        try:
            client_writer.close()
        except Exception:
            pass


async def run_proxy():

    server = await asyncio.start_server(
        handle_proxy_connection,
        "0.0.0.0",
        PUBLIC_PORT
    )

    async with server:
        await server.serve_forever()


# ==========================================
# START EVERYTHING
# ==========================================

async def start():

    async with serve(
        websocket_handler,
        "127.0.0.1",
        INTERNAL_WEBSOCKET_PORT
    ):

        await asyncio.gather(
            main(),
            run_proxy()
        )


# ==========================================
# PROGRAM ENTRY
# ==========================================

if __name__ == "__main__":

    try:

        asyncio.run(
            start()
        )

    except KeyboardInterrupt:

        print()
        print("Server stopped.")