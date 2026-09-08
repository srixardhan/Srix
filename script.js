/* =====================================
   SUCCESS NOTIFICATION
===================================== */

const successText =
    document.getElementById("successText");

const closeSuccess =
    document.getElementById("closeSuccess");

const successMessage =
    document.getElementById("successMessage");


if (closeSuccess) {

    closeSuccess.addEventListener(
        "click",
        function() {

            successMessage.classList.remove(
                "show"
            );

        }
    );

}


/* =====================================
   THEME TOGGLE (DARK / LIGHT)
===================================== */

const THEME_STORAGE_KEY = "srixTheme";

const themeToggleButton =
    document.getElementById("themeToggleButton");

const themeToggleIcon =
    document.getElementById("themeToggleIcon");

function applyTheme(theme) {

    if (theme === "light") {

        document.documentElement.setAttribute(
            "data-theme",
            "light"
        );

        if (themeToggleIcon) {
            themeToggleIcon.textContent = "☀️";
        }

    } else {

        document.documentElement.removeAttribute(
            "data-theme"
        );

        if (themeToggleIcon) {
            themeToggleIcon.textContent = "🌙";
        }

    }

}

const savedTheme =
    localStorage.getItem(THEME_STORAGE_KEY) ||
    "dark";

applyTheme(savedTheme);

if (themeToggleButton) {

    themeToggleButton.addEventListener(
        "click",
        function () {

            const current =
                document.documentElement.getAttribute(
                    "data-theme"
                ) === "light"
                    ? "light"
                    : "dark";

            const next =
                current === "light"
                    ? "dark"
                    : "light";

            localStorage.setItem(
                THEME_STORAGE_KEY,
                next
            );

            applyTheme(next);

        }
    );

}


/* =====================================
   PASSWORD PROTECTION (OPTIONAL, HIDDEN)

   Free for all is the default the moment the page opens -
   no prompt, no modal, nothing to dismiss. A small lock icon
   on the home screen (easy to miss on purpose) lets anyone
   who wants privacy turn this session into a password-only
   room. Same password later = same private room; different
   password or no password = a completely separate space.
   The choice lives in sessionStorage, so a private room only
   lasts for that tab's visit unless the same password is
   entered again.
===================================== */

const ROOM_STORAGE_KEY = "srixRoomToken";

let srixRoomToken =
    sessionStorage.getItem(ROOM_STORAGE_KEY) || "";

function getSrixRoomToken() {
    return srixRoomToken;
}

function srixRoomHeaders(extraHeaders) {

    const headers =
        Object.assign(
            {},
            extraHeaders || {}
        );

    headers["X-Srix-Room"] = getSrixRoomToken();

    return headers;

}

const accessGateOverlay =
    document.getElementById("accessGateOverlay");

const accessGateSetupView =
    document.getElementById("accessGateSetupView");

const accessGateActiveView =
    document.getElementById("accessGateActiveView");

const accessGatePasswordInput =
    document.getElementById("accessGatePasswordInput");

const accessGateContinueButton =
    document.getElementById("accessGateContinueButton");

const accessGateCancelButton =
    document.getElementById("accessGateCancelButton");

const accessGateLeaveButton =
    document.getElementById("accessGateLeaveButton");

const privateRoomButton =
    document.getElementById("privateRoomButton");

const privateRoomIcon =
    document.getElementById("privateRoomIcon");


function updatePrivateRoomIcon() {

    if (!privateRoomIcon || !privateRoomButton) {
        return;
    }

    if (srixRoomToken) {

        privateRoomIcon.textContent = "🔒";

        privateRoomButton.title =
            "This session is password protected — click to manage";

    } else {

        privateRoomIcon.textContent = "🔓";

        privateRoomButton.title =
            "Psst — password protect this session";

    }

}


function openAccessGateOverlay() {

    if (!accessGateOverlay) {
        return;
    }

    const isProtected =
        !!srixRoomToken;

    if (accessGateSetupView) {

        accessGateSetupView.style.display =
            isProtected ? "none" : "block";

    }

    if (accessGateActiveView) {

        accessGateActiveView.style.display =
            isProtected ? "block" : "none";

    }

    if (!isProtected && accessGatePasswordInput) {
        accessGatePasswordInput.value = "";
    }

    accessGateOverlay.style.display = "flex";

    if (!isProtected) {

        setTimeout(
            function () {
                if (accessGatePasswordInput) {
                    accessGatePasswordInput.focus();
                }
            },
            50
        );

    }

}


function closeAccessGateOverlay() {

    if (!accessGateOverlay) {
        return;
    }

    accessGateOverlay.style.display = "none";

}


function protectSessionWithPassword() {

    const token =
        accessGatePasswordInput
            ? accessGatePasswordInput.value.trim()
            : "";

    if (!token) {
        if (accessGatePasswordInput) {
            accessGatePasswordInput.focus();
        }
        return;
    }

    sessionStorage.setItem(
        ROOM_STORAGE_KEY,
        token
    );

    // A fresh reload is the simplest reliable way to fully
    // reconnect (WebSocket + file list) into the new room.
    location.reload();

}


function leaveProtectedSession() {

    sessionStorage.removeItem(
        ROOM_STORAGE_KEY
    );

    location.reload();

}


if (privateRoomButton) {

    privateRoomButton.addEventListener(
        "click",
        openAccessGateOverlay
    );

}

if (accessGateContinueButton) {

    accessGateContinueButton.addEventListener(
        "click",
        protectSessionWithPassword
    );

}

if (accessGateCancelButton) {

    accessGateCancelButton.addEventListener(
        "click",
        closeAccessGateOverlay
    );

}

if (accessGateLeaveButton) {

    accessGateLeaveButton.addEventListener(
        "click",
        leaveProtectedSession
    );

}

if (accessGatePasswordInput) {

    accessGatePasswordInput.addEventListener(
        "keydown",
        function (event) {
            if (event.key === "Enter") {
                protectSessionWithPassword();
            }
        }
    );

}

updatePrivateRoomIcon();


/* =====================================
   SECTION NAVIGATION
===================================== */

const homeSection =
    document.getElementById("home");

const fileTransferSection =
    document.getElementById("fileTransferSection");

const quickShareSection =
    document.getElementById("quickShareSection");


function showHome() {

    if (homeSection) {

        homeSection.style.display =
            "flex";

    }

    if (fileTransferSection) {

        fileTransferSection.style.display =
            "none";

    }

    if (quickShareSection) {

        quickShareSection.style.display =
            "none";

    }

}


function showFileTransfer() {

    if (homeSection) {

        homeSection.style.display =
            "none";

    }

    if (fileTransferSection) {

        fileTransferSection.style.display =
            "block";

    }

    if (quickShareSection) {

        quickShareSection.style.display =
            "none";

    }

}


function showQuickShare() {

    if (homeSection) {

        homeSection.style.display =
            "none";

    }

    if (fileTransferSection) {

        fileTransferSection.style.display =
            "none";

    }

    if (quickShareSection) {

        quickShareSection.style.display =
            "block";

    }

}


/* =====================================
   HOME PAGE
===================================== */

const fileTransferButton =
    document.getElementById(
        "fileTransferButton"
    );

const quickShareButton =
    document.getElementById(
        "quickShareButton"
    );


if (fileTransferButton) {

    fileTransferButton.addEventListener(
        "click",
        function() {

            showFileTransfer();

        }
    );

}


if (quickShareButton) {

    quickShareButton.addEventListener(
        "click",
        function() {

            showQuickShare();

        }
    );

}


/* =====================================
   QUICK SHARE PAGE
===================================== */

const quickBackButton =
    document.getElementById(
        "quickBackButton"
    );

const quickText =
    document.getElementById(
        "quickText"
    );

const sendTextButton =
    document.getElementById(
        "sendTextButton"
    );

const copyTextButton =
    document.getElementById(
        "copyTextButton"
    );

const clearTextButton =
    document.getElementById(
        "clearTextButton"
    );

const quickStatus =
    document.getElementById(
        "quickStatus"
    );


if (quickBackButton) {

    quickBackButton.addEventListener(
        "click",
        function() {

            window.location.href =
                "/";

        }
    );

}


/* =====================================
   COPY TEXT
===================================== */

if (copyTextButton) {

    copyTextButton.addEventListener(
        "click",
        async function() {

            if (
                quickText.value.trim() ===
                ""
            ) {

                quickStatus.textContent =
                    "Nothing to copy.";

                return;

            }


            try {

                await navigator.clipboard.writeText(
                    quickText.value
                );

                quickStatus.textContent =
                    "✓ Copied to clipboard";

            }

            catch (error) {

                quickText.select();

                document.execCommand(
                    "copy"
                );

                quickStatus.textContent =
                    "✓ Copied to clipboard";

            }

        }
    );

}


/* =====================================
   CLEAR TEXT
===================================== */

if (clearTextButton) {

    clearTextButton.addEventListener(
        "click",
        function() {

            quickText.value =
                "";

            quickStatus.textContent =
                "Text cleared.";

            quickText.focus();

        }
    );

}


/* =====================================
   SEND TEXT
===================================== */

if (sendTextButton) {

    sendTextButton.addEventListener(
        "click",
        async function() {

            const text =
                quickText.value.trim();


            if (text === "") {

                quickStatus.textContent =
                    "Nothing to send.";

                return;

            }


            sendTextButton.disabled =
                true;

            sendTextButton.textContent =
                "Sending...";


            try {

                const response =
                    await fetch(
                        "/quickshare",
                        {
                            method:
                                "POST",

                            headers: srixRoomHeaders({
                                "Content-Type":
                                    "text/plain"
                            }),

                            body:
                                text
                        }
                    );


                if (response.ok) {

                    quickStatus.textContent =
                        "✓ Text sent successfully";

                }

                else {

                    quickStatus.textContent =
                        "⚠ Failed to send text";

                }

            }

            catch (error) {

                quickStatus.textContent =
                    "⚠ Could not connect to server";

            }


            sendTextButton.disabled =
                false;

            sendTextButton.textContent =
                "Send Text";

        }
    );

}


/* =====================================
   FILE TRANSFER ELEMENTS
===================================== */

const fileInput =
    document.getElementById("file");

const fileCount =
    document.getElementById("fileCount");

const fileList =
    document.getElementById("fileList");

const sendButton =
    document.getElementById("sendButton");

const backButton =
    document.getElementById("backButton");

const uploadModeButton =
    document.getElementById(
        "uploadModeButton"
    );

const downloadModeButton =
    document.getElementById(
        "downloadModeButton"
    );

const uploadSection =
    document.getElementById(
        "uploadSection"
    );

const downloadSection =
    document.getElementById(
        "downloadSection"
    );

const downloadFileList =
    document.getElementById(
        "downloadFileList"
    );

const downloadStatus =
    document.getElementById(
        "downloadStatus"
    );

const downloadSelectedButton =
    document.getElementById(
        "downloadSelectedButton"
    );

const deleteSelectedButton =
    document.getElementById(
        "deleteSelectedButton"
    );

const selectedFileStatus =
    document.getElementById(
        "selectedFileStatus"
    );

const selectAllButton =
    document.getElementById(
        "selectAllButton"
    );


/* =====================================
   FILE TRANSFER PAGE NAVIGATION
===================================== */

if (backButton) {

    backButton.addEventListener(
        "click",
        function() {

            showHome();

        }
    );

}


/* =====================================
   MODE SWITCHING
===================================== */

function showUpload() {

    if (!uploadSection ||
        !downloadSection) {

        return;

    }


    uploadSection.style.display =
        "block";

    downloadSection.style.display =
        "none";


    if (uploadModeButton) {

        uploadModeButton.classList.add(
            "active-mode"
        );

    }


    if (downloadModeButton) {

        downloadModeButton.classList.remove(
            "active-mode"
        );

    }

}


function showDownload() {

    if (!uploadSection ||
        !downloadSection) {

        return;

    }


    uploadSection.style.display =
        "none";

    downloadSection.style.display =
        "block";


    if (uploadModeButton) {

        uploadModeButton.classList.remove(
            "active-mode"
        );

    }


    if (downloadModeButton) {

        downloadModeButton.classList.add(
            "active-mode"
        );

    }


    loadFiles();

}


if (uploadModeButton) {

    uploadModeButton.addEventListener(
        "click",
        function() {

            showUpload();

        }
    );

}


if (downloadModeButton) {

    downloadModeButton.addEventListener(
        "click",
        function() {

            showDownload();

        }
    );

}


/* =====================================
   FILE SIZE
===================================== */

function formatSize(bytes) {

    if (bytes < 1024) {

        return bytes + " B";

    }


    if (bytes < 1024 * 1024) {

        return (
            bytes / 1024
        ).toFixed(1) + " KB";

    }


    if (
        bytes <
        1024 * 1024 * 1024
    ) {

        return (
            bytes /
            (1024 * 1024)
        ).toFixed(1) + " MB";

    }


    return (
        bytes /
        (1024 * 1024 * 1024)
    ).toFixed(2) + " GB";

}


/* =====================================
   FILE SELECTION
===================================== */

let uploadUIByIndex = {};

let downloadUIByFilename = {};


/* =====================================
   DRAG AND DROP
===================================== */

const dropzone =
    document.getElementById("dropzone");

if (dropzone && fileInput) {

    ["dragenter", "dragover"].forEach(
        function (eventName) {

            dropzone.addEventListener(
                eventName,
                function (event) {

                    event.preventDefault();
                    event.stopPropagation();

                    dropzone.classList.add(
                        "drag-over"
                    );

                }
            );

        }
    );

    ["dragleave", "dragend"].forEach(
        function (eventName) {

            dropzone.addEventListener(
                eventName,
                function (event) {

                    event.preventDefault();
                    event.stopPropagation();

                    dropzone.classList.remove(
                        "drag-over"
                    );

                }
            );

        }
    );

    dropzone.addEventListener(
        "drop",
        function (event) {

            event.preventDefault();
            event.stopPropagation();

            dropzone.classList.remove(
                "drag-over"
            );

            const droppedFiles =
                event.dataTransfer &&
                event.dataTransfer.files;

            if (
                droppedFiles &&
                droppedFiles.length > 0
            ) {

                fileInput.files =
                    droppedFiles;

                fileInput.dispatchEvent(
                    new Event("change")
                );

            }

        }
    );

    // Stop the browser from navigating to/opening a file
    // that's dropped just outside the dropzone but still
    // inside the upload screen.
    if (uploadSection) {

        ["dragover", "drop"].forEach(
            function (eventName) {

                uploadSection.addEventListener(
                    eventName,
                    function (event) {

                        event.preventDefault();

                    }
                );

            }
        );

    }

}


if (fileInput) {

    fileInput.addEventListener(
        "change",
        function() {

            if (!fileList ||
                !fileCount ||
                !sendButton) {

                return;

            }


            fileList.innerHTML =
                "";

            uploadUIByIndex = {};


            const count =
                fileInput.files.length;


            if (count === 0) {

                fileCount.textContent =
                    "";

                sendButton.style.display =
                    "none";

                return;

            }


            fileCount.textContent =
                count +
                (
                    count === 1
                        ? " file selected"
                        : " files selected"
                );


            sendButton.style.display =
                "block";


            for (
                let i = 0;
                i < fileInput.files.length;
                i++
            ) {

                const file =
                    fileInput.files[i];


                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "file-card";


                const checkbox =
                    document.createElement(
                        "input"
                    );

                checkbox.type =
                    "checkbox";

                checkbox.className =
                    "file-check";

                checkbox.checked =
                    true;


                const icon =
                    document.createElement(
                        "span"
                    );

                icon.className =
                    "file-icon";

                icon.textContent =
                    "📄";


                const info =
                    document.createElement(
                        "div"
                    );

                info.className =
                    "file-info";


                const name =
                    document.createElement(
                        "div"
                    );

                name.className =
                    "file-name";

                name.textContent =
                    file.name;


                const size =
                    document.createElement(
                        "small"
                    );

                size.className =
                    "file-size";

                size.textContent =
                    formatSize(
                        file.size
                    );


                const progressTrack =
                    document.createElement(
                        "div"
                    );

                progressTrack.className =
                    "file-progress-track";

                const progressFill =
                    document.createElement(
                        "div"
                    );

                progressFill.className =
                    "file-progress-fill";

                progressTrack.appendChild(
                    progressFill
                );


                const status =
                    document.createElement(
                        "small"
                    );

                status.className =
                    "file-status";


                const resumeBtn =
                    document.createElement(
                        "button"
                    );

                resumeBtn.type =
                    "button";

                resumeBtn.className =
                    "file-resume-btn";

                resumeBtn.textContent =
                    "Resume";

                resumeBtn.style.display =
                    "none";


                const pauseBtn =
                    document.createElement(
                        "button"
                    );

                pauseBtn.type =
                    "button";

                pauseBtn.className =
                    "file-pause-btn";

                pauseBtn.textContent =
                    "Pause";

                pauseBtn.style.display =
                    "none";


                const cancelBtn =
                    document.createElement(
                        "button"
                    );

                cancelBtn.type =
                    "button";

                cancelBtn.className =
                    "file-cancel-btn";

                cancelBtn.textContent =
                    "✕";

                cancelBtn.title =
                    "Cancel upload";

                cancelBtn.style.display =
                    "none";


                info.appendChild(
                    name
                );

                info.appendChild(
                    size
                );

                info.appendChild(
                    progressTrack
                );

                info.appendChild(
                    status
                );


                card.appendChild(
                    checkbox
                );

                card.appendChild(
                    icon
                );

                card.appendChild(
                    info
                );

                card.appendChild(
                    pauseBtn
                );

                card.appendChild(
                    resumeBtn
                );

                card.appendChild(
                    cancelBtn
                );


                fileList.appendChild(
                    card
                );


                uploadUIByIndex[i] = {
                    fillEl: progressFill,
                    statusEl: status,
                    resumeBtn: resumeBtn,
                    pauseBtn: pauseBtn,
                    cancelBtn: cancelBtn,
                    isUpload: true,
                    controller: {
                        paused: false,
                        cancelled: false,
                        xhr: null,
                        resumeResolve: null
                    }
                };

            }

        }
    );

}


/* =====================================
   RESUMABLE UPLOAD HELPERS
===================================== */

// Keeps a short rolling window of {time, bytesSent} samples on
// the controller so we can compute a live speed/ETA that reacts
// to recent conditions rather than the transfer's all-time
// average (which would be thrown off by retries/pauses earlier
// in a long transfer).
function recordProgressSample(controller, bytesSent) {

    if (!controller) {
        return;
    }

    if (!controller.speedSamples) {

        controller.speedSamples =
            [];

    }

    const now =
        Date.now();

    controller.speedSamples.push({
        t: now,
        bytes: bytesSent
    });

    const cutoff =
        now - 5000;

    while (
        controller.speedSamples.length > 1 &&
        controller.speedSamples[0].t < cutoff
    ) {

        controller.speedSamples.shift();

    }

}


function computeSpeedAndETA(controller, bytesSent, totalBytes) {

    if (!controller || !controller.speedSamples) {
        return null;
    }

    const samples =
        controller.speedSamples;

    if (samples.length < 2) {
        return null;
    }

    const first =
        samples[0];

    const last =
        samples[samples.length - 1];

    const dt =
        (last.t - first.t) / 1000;

    const dBytes =
        last.bytes - first.bytes;

    if (dt <= 0 || dBytes <= 0) {
        return null;
    }

    const speedBps =
        dBytes / dt;

    const remaining =
        totalBytes - bytesSent;

    const etaSeconds =
        speedBps > 0
            ? remaining / speedBps
            : null;

    return {
        speedBps: speedBps,
        etaSeconds: etaSeconds
    };

}


function formatSpeed(bytesPerSec) {

    if (bytesPerSec >= 1024 * 1024) {

        return (
            bytesPerSec / (1024 * 1024)
        ).toFixed(1) + " MB/s";

    }

    if (bytesPerSec >= 1024) {

        return (
            bytesPerSec / 1024
        ).toFixed(0) + " KB/s";

    }

    return bytesPerSec.toFixed(0) + " B/s";

}


function formatETA(seconds) {

    if (
        seconds == null ||
        !isFinite(seconds) ||
        seconds < 0
    ) {

        return "";

    }

    const totalSeconds =
        Math.round(seconds);

    if (totalSeconds < 1) {
        return "<1s";
    }

    const h =
        Math.floor(totalSeconds / 3600);

    const m =
        Math.floor((totalSeconds % 3600) / 60);

    const s =
        totalSeconds % 60;

    if (h > 0) {
        return h + "h " + m + "m";
    }

    if (m > 0) {
        return m + "m " + s + "s";
    }

    return s + "s";

}


// Labels where a live speed/ETA reading makes sense - anything
// else (Paused, Checking..., Cancelling..., a hiccup countdown,
// Done) shouldn't show a stale or misleading number.
const LIVE_TRANSFER_LABELS =
    ["Uploading", "Downloading"];


/* =====================================
   HOME SCREEN UPLOAD TOAST

   A small floating "Sending... 42%" indicator that lives on
   the Home screen so progress stays visible even after
   backing out of the Send Files tab mid-transfer. It tracks
   every in-flight upload's last-known sent/total bytes (fed
   by updateProgressUI below) and shows their combined
   percentage.
===================================== */

const homeUploadToast =
    document.getElementById("homeUploadToast");

const homeUploadToastText =
    document.getElementById("homeUploadToastText");

const homeUploadToastFill =
    document.getElementById("homeUploadToastFill");

const uploadToastProgress = new Map();

function refreshUploadToast() {

    if (!homeUploadToast) {
        return;
    }

    let sentTotal = 0;
    let byteTotal = 0;
    let fileCountActive = 0;

    uploadToastProgress.forEach(
        function (entry) {

            sentTotal += entry.sent;
            byteTotal += entry.total;
            fileCountActive += 1;

        }
    );

    if (fileCountActive === 0 || byteTotal === 0) {

        homeUploadToast.style.display =
            "none";

        return;

    }

    const pct =
        Math.min(
            100,
            (sentTotal / byteTotal) * 100
        );

    if (homeUploadToastText) {

        homeUploadToastText.textContent =
            "Sending " +
            fileCountActive +
            (
                fileCountActive === 1
                    ? " file… "
                    : " files… "
            ) +
            pct.toFixed(0) +
            "%";

    }

    if (homeUploadToastFill) {

        homeUploadToastFill.style.width =
            pct.toFixed(1) + "%";

    }

    homeUploadToast.style.display =
        "flex";

}

function clearUploadToast() {

    uploadToastProgress.clear();

    if (homeUploadToast) {

        homeUploadToast.style.display =
            "none";

    }

}


function updateProgressUI(ui, sent, total, label, controller) {

    if (!ui) {
        return;
    }

    if (ui.isUpload) {

        if (label === "Uploading") {

            uploadToastProgress.set(
                ui,
                { sent: sent, total: total }
            );

        } else {

            // Paused, cancelled, done, etc. - stop counting
            // this file toward the Home screen toast.
            uploadToastProgress.delete(
                ui
            );

        }

        refreshUploadToast();

    }

    const pct =
        total > 0
            ? Math.min(100, (sent / total) * 100)
            : 100;

    ui.fillEl.style.width =
        pct.toFixed(1) + "%";

    let extra =
        "";

    if (
        controller &&
        LIVE_TRANSFER_LABELS.indexOf(label) !== -1
    ) {

        recordProgressSample(
            controller,
            sent
        );

        const stats =
            computeSpeedAndETA(
                controller,
                sent,
                total
            );

        if (stats) {

            extra =
                " · " +
                formatSpeed(stats.speedBps);

            const etaText =
                formatETA(stats.etaSeconds);

            if (etaText) {

                extra +=
                    " · ETA " +
                    etaText;

            }

        }

    }

    ui.statusEl.textContent =
        label +
        " — " +
        formatSize(sent) +
        " / " +
        formatSize(total) +
        " (" +
        pct.toFixed(0) +
        "%)" +
        extra;

}


function getUploadStatus(file) {

    const url =
        "/upload-status?name=" +
        encodeURIComponent(file.name) +
        "&size=" +
        file.size +
        "&modified=" +
        file.lastModified;

    return fetch(url, {
            headers: srixRoomHeaders()
        })
        .then(function(res) {
            return res.json();
        })
        .then(function(data) {
            return data.received || 0;
        })
        .catch(function() {
            return 0;
        });

}


// Each upload request only ever carries this many bytes, not
// the whole remaining file. This matters a lot for reliability:
// a single giant multi-hundred-MB request is exactly what breaks
// on flaky WiFi or a tunnel/proxy's request timeout (Cloudflare
// Tunnel, for one, will kill a request that runs too long) - and
// if it breaks, the whole thing has to be resent. With small
// fixed-size chunks, a hiccup only costs this many bytes.
const UPLOAD_CHUNK_SIZE = 16 * 1024 * 1024; // 16 MB


function sendOneChunk(file, offset, ui) {

    return new Promise(function(resolve, reject) {

        const end =
            Math.min(
                offset + UPLOAD_CHUNK_SIZE,
                file.size
            );

        const slice =
            file.slice(offset, end);

        const xhr =
            new XMLHttpRequest();

        if (ui.controller) {

            ui.controller.xhr = xhr;

        }

        xhr.open(
            "POST",
            "/upload-chunk",
            true
        );

        xhr.setRequestHeader(
            "X-File-Name",
            encodeURIComponent(file.name)
        );

        xhr.setRequestHeader(
            "X-File-Size",
            String(file.size)
        );

        xhr.setRequestHeader(
            "X-File-Modified",
            String(file.lastModified)
        );

        xhr.setRequestHeader(
            "X-Chunk-Offset",
            String(offset)
        );

        xhr.setRequestHeader(
            "X-Srix-Room",
            getSrixRoomToken()
        );

        xhr.setRequestHeader(
            "X-Device-Name",
            encodeURIComponent(deviceDisplayName || "")
        );

        xhr.upload.onprogress = function(e) {

            if (e.lengthComputable) {

                updateProgressUI(
                    ui,
                    offset + e.loaded,
                    file.size,
                    "Uploading",
                    ui.controller
                );

            }

        };

        xhr.onload = function() {

            if (xhr.status === 200) {

                try {

                    resolve(
                        JSON.parse(
                            xhr.responseText
                        )
                    );

                } catch (parseError) {

                    reject(
                        new Error(
                            "Bad server response"
                        )
                    );

                }

            } else if (xhr.status === 409) {

                // Server has a different byte offset than
                // we thought - loop will resync and retry.
                reject(
                    new Error(
                        "offset mismatch"
                    )
                );

            } else {

                reject(
                    new Error(
                        "Upload failed (" +
                        xhr.status +
                        ")"
                    )
                );

            }

        };

        xhr.onerror = function() {

            reject(
                new Error(
                    "Network error"
                )
            );

        };

        xhr.onabort = function() {

            // We aborted this ourselves (pause or cancel) -
            // not a real network failure.
            reject(
                new Error(
                    "ABORTED"
                )
            );

        };

        xhr.send(slice);

    });

}


// Waits until the controller is un-paused (Resume clicked) or
// cancelled. Resolves either way - the caller checks
// controller.cancelled afterward to decide what to do next.
function waitForResume(controller) {

    return new Promise(function(resolve) {

        controller.resumeResolve = resolve;

    });

}


function wireUploadControls(ui, file) {

    const controller =
        ui.controller;

    ui.pauseBtn.onclick = function() {

        controller.paused =
            true;

        ui.pauseBtn.style.display =
            "none";

        ui.resumeBtn.style.display =
            "inline-block";

        updateProgressUI(
            ui,
            controller.lastKnownOffset || 0,
            file.size,
            "Paused"
        );

        if (controller.xhr) {

            controller.xhr.abort();

        }

    };

    ui.resumeBtn.onclick = function() {

        controller.paused =
            false;

        controller.speedSamples =
            [];

        ui.resumeBtn.style.display =
            "none";

        ui.pauseBtn.style.display =
            "inline-block";

        if (controller.resumeResolve) {

            const resolveFn =
                controller.resumeResolve;

            controller.resumeResolve =
                null;

            resolveFn();

        }

    };

    ui.cancelBtn.onclick = async function() {

        const confirmed =
            window.confirm(
                "Cancel this upload?\n\n" +
                file.name
            );

        if (!confirmed) {

            return;

        }

        controller.cancelled =
            true;

        if (controller.xhr) {

            controller.xhr.abort();

        }

        if (controller.resumeResolve) {

            const resolveFn =
                controller.resumeResolve;

            controller.resumeResolve =
                null;

            resolveFn();

        }

        ui.pauseBtn.style.display =
            "none";

        ui.resumeBtn.style.display =
            "none";

        ui.cancelBtn.disabled =
            true;

        updateProgressUI(
            ui,
            controller.lastKnownOffset || 0,
            file.size,
            "Cancelling..."
        );

        try {

            await fetch(
                "/upload-cancel",
                {
                    method: "POST",
                    headers: srixRoomHeaders({
                        "X-File-Name":
                            encodeURIComponent(file.name),
                        "X-File-Size":
                            String(file.size),
                        "X-File-Modified":
                            String(file.lastModified)
                    })
                }
            );

        } catch (error) {

            console.error(
                "Cancel request failed:",
                error
            );

        }

        ui.statusEl.textContent =
            "✕ Cancelled";

    };

}


async function uploadFileResumable(file, ui) {

    const maxAutoRetries = 6;

    let retryCount = 0;

    const controller =
        ui.controller;

    wireUploadControls(
        ui,
        file
    );

    updateProgressUI(
        ui,
        0,
        file.size,
        "Checking..."
    );

    let offset =
        await getUploadStatus(file);

    if (offset > file.size) {
        offset = 0;
    }

    controller.lastKnownOffset =
        offset;

    ui.pauseBtn.style.display =
        "inline-block";

    ui.cancelBtn.style.display =
        "inline-block";

    while (offset < file.size) {

        if (controller.cancelled) {

            return {
                success: false,
                cancelled: true
            };

        }

        if (controller.paused) {

            await waitForResume(
                controller
            );

            if (controller.cancelled) {

                return {
                    success: false,
                    cancelled: true
                };

            }

            // Re-sync in case the paused chunk actually
            // landed on the server before we aborted it.
            const serverOffset =
                await getUploadStatus(file);

            if (serverOffset >= offset) {
                offset = serverOffset;
            }

            retryCount = 0;

            continue;

        }

        updateProgressUI(
            ui,
            offset,
            file.size,
            "Uploading",
            controller
        );

        try {

            const result =
                await sendOneChunk(
                    file,
                    offset,
                    ui
                );

            retryCount = 0;

            if (result.complete) {

                ui.pauseBtn.style.display =
                    "none";

                ui.cancelBtn.style.display =
                    "none";

                updateProgressUI(
                    ui,
                    file.size,
                    file.size,
                    "✓ Done"
                );

                return {
                    success: true,
                    filename: result.filename
                };

            }

            // Move on to the next small chunk. Trust the
            // server's own count of what it has, in case
            // it differs slightly from our local math.
            offset =
                typeof result.received === "number"
                    ? result.received
                    : Math.min(
                        offset + UPLOAD_CHUNK_SIZE,
                        file.size
                    );

            controller.lastKnownOffset =
                offset;

            continue;

        } catch (err) {

            if (controller.cancelled) {

                return {
                    success: false,
                    cancelled: true
                };

            }

            if (err.message === "ABORTED" && controller.paused) {

                // Intentional pause, not a real failure -
                // don't burn a retry, just loop back around
                // to the pause check above.
                continue;

            }

            retryCount++;

            if (retryCount <= maxAutoRetries) {

                const delay =
                    Math.min(
                        30000,
                        1000 * Math.pow(2, retryCount)
                    );

                updateProgressUI(
                    ui,
                    offset,
                    file.size,
                    "Connection hiccup, retrying in " +
                    Math.round(delay / 1000) +
                    "s"
                );

                await new Promise(function(r) {
                    setTimeout(r, delay);
                });

                controller.speedSamples =
                    [];

                // The chunk may actually have landed on the
                // server despite the error on our end (e.g. the
                // response just didn't make it back) - resync
                // before retrying so we don't resend it twice.
                const serverOffset =
                    await getUploadStatus(file);

                if (serverOffset >= offset) {
                    offset = serverOffset;
                }

                continue;

            }

            // Auto-retries exhausted - pause and wait for
            // the user to click Resume. The server already
            // remembers how far we got, so resuming just
            // means asking it again and continuing on.
            controller.paused =
                true;

            ui.pauseBtn.style.display =
                "none";

            ui.resumeBtn.style.display =
                "inline-block";

            updateProgressUI(
                ui,
                offset,
                file.size,
                "⚠ Paused - click Resume to continue"
            );

            await waitForResume(
                controller
            );

            if (controller.cancelled) {

                return {
                    success: false,
                    cancelled: true
                };

            }

            retryCount = 0;

            const serverOffset =
                await getUploadStatus(file);

            if (serverOffset >= offset) {
                offset = serverOffset;
            }

            continue;

        }

    }

    ui.pauseBtn.style.display =
        "none";

    ui.cancelBtn.style.display =
        "none";

    updateProgressUI(
        ui,
        file.size,
        file.size,
        "✓ Done"
    );

    return { success: true };

}


/* =====================================
   RESUMABLE DOWNLOAD (pause / cancel)
===================================== */

// Direct-to-disk streaming with real pause/cancel requires the
// File System Access API (Chrome/Edge). Without it we fall back
// to a plain browser download - no in-app progress bar, but the
// browser's own download manager still offers pause/cancel.
function supportsResumableDownload() {

    return typeof window.showSaveFilePicker === "function";

}


function resetDownloadUI(ui) {

    ui.downloadBtn.dataset.active =
        "false";

    ui.downloadBtn.style.display =
        "inline-block";

    ui.pauseBtn.style.display =
        "none";

    ui.pauseBtn.textContent =
        "Pause";

    ui.cancelBtn.style.display =
        "none";

}


function wireDownloadControls(ui, fileSize) {

    const controller =
        ui.controller;

    ui.pauseBtn.onclick = function() {

        if (!controller.paused) {

            controller.paused =
                true;

            ui.pauseBtn.textContent =
                "Resume";

            updateProgressUI(
                ui,
                controller.lastKnownOffset,
                fileSize,
                "Paused"
            );

            if (controller.abortController) {

                controller.abortController.abort();

            }

        } else {

            controller.paused =
                false;

            controller.speedSamples =
                [];

            ui.pauseBtn.textContent =
                "Pause";

            if (controller.resumeResolve) {

                const resolveFn =
                    controller.resumeResolve;

                controller.resumeResolve =
                    null;

                resolveFn();

            }

        }

    };

    ui.cancelBtn.onclick = function() {

        const confirmed =
            window.confirm(
                "Cancel this download?"
            );

        if (!confirmed) {

            return;

        }

        controller.cancelled =
            true;

        if (controller.abortController) {

            controller.abortController.abort();

        }

        if (controller.resumeResolve) {

            const resolveFn =
                controller.resumeResolve;

            controller.resumeResolve =
                null;

            resolveFn();

        }

    };

}


async function downloadFileResumable(filename, fileSize, ui) {

    if (!supportsResumableDownload()) {

        window.location.href =
            "/download/" +
            encodeURIComponent(filename);

        return;

    }

    if (ui.downloadBtn.dataset.active === "true") {

        return;

    }

    let fileHandle;

    try {

        fileHandle =
            await window.showSaveFilePicker({
                suggestedName: filename
            });

    } catch (err) {

        // User closed the save dialog without picking a
        // location - not an error, just don't start.
        return;

    }

    let writable;

    try {

        writable =
            await fileHandle.createWritable();

    } catch (err) {

        ui.statusEl.textContent =
            "⚠ Could not create file on disk";

        return;

    }

    const controller =
        ui.controller;

    controller.paused = false;
    controller.cancelled = false;
    controller.abortController = null;
    controller.lastKnownOffset = 0;

    ui.downloadBtn.dataset.active =
        "true";

    ui.downloadBtn.style.display =
        "none";

    ui.pauseBtn.style.display =
        "inline-block";

    ui.pauseBtn.textContent =
        "Pause";

    ui.cancelBtn.style.display =
        "inline-block";

    ui.trackEl.style.display =
        "block";

    wireDownloadControls(
        ui,
        fileSize
    );

    const maxAutoRetries = 6;

    let retryCount = 0;

    let offset = 0;

    updateProgressUI(
        ui,
        0,
        fileSize,
        "Starting..."
    );

    while (offset < fileSize) {

        if (controller.cancelled) {

            try {
                await writable.abort();
            } catch (e) {}

            ui.statusEl.textContent =
                "✕ Cancelled";

            resetDownloadUI(ui);

            return;

        }

        if (controller.paused) {

            await waitForResume(
                controller
            );

            if (controller.cancelled) {

                try {
                    await writable.abort();
                } catch (e) {}

                ui.statusEl.textContent =
                    "✕ Cancelled";

                resetDownloadUI(ui);

                return;

            }

            retryCount = 0;

            continue;

        }

        try {

            const abortController =
                new AbortController();

            controller.abortController =
                abortController;

            const response =
                await fetch(
                    "/download/" +
                    encodeURIComponent(filename),
                    {
                        headers: srixRoomHeaders({
                            "Range": "bytes=" + offset + "-"
                        }),
                        signal: abortController.signal
                    }
                );

            if (!response.ok) {

                throw new Error(
                    "Download failed (" +
                    response.status +
                    ")"
                );

            }

            const reader =
                response.body.getReader();

            while (true) {

                const { done, value } =
                    await reader.read();

                if (done) {
                    break;
                }

                await writable.write(
                    value
                );

                offset += value.length;

                controller.lastKnownOffset =
                    offset;

                updateProgressUI(
                    ui,
                    offset,
                    fileSize,
                    "Downloading",
                    controller
                );

                if (controller.paused || controller.cancelled) {

                    abortController.abort();

                    break;

                }

            }

            retryCount = 0;

            continue;

        } catch (err) {

            if (controller.cancelled) {

                try {
                    await writable.abort();
                } catch (e) {}

                ui.statusEl.textContent =
                    "✕ Cancelled";

                resetDownloadUI(ui);

                return;

            }

            if (controller.paused) {

                // Intentional abort from pausing - not a
                // real failure. Loop back to the pause wait.
                continue;

            }

            retryCount++;

            if (retryCount <= maxAutoRetries) {

                const delay =
                    Math.min(
                        30000,
                        1000 * Math.pow(2, retryCount)
                    );

                updateProgressUI(
                    ui,
                    offset,
                    fileSize,
                    "Connection hiccup, retrying in " +
                    Math.round(delay / 1000) +
                    "s"
                );

                await new Promise(function(r) {
                    setTimeout(r, delay);
                });

                controller.speedSamples =
                    [];

                continue;

            }

            controller.paused =
                true;

            ui.pauseBtn.textContent =
                "Resume";

            updateProgressUI(
                ui,
                offset,
                fileSize,
                "⚠ Paused - click Resume to continue"
            );

            await waitForResume(
                controller
            );

            if (controller.cancelled) {

                try {
                    await writable.abort();
                } catch (e) {}

                ui.statusEl.textContent =
                    "✕ Cancelled";

                resetDownloadUI(ui);

                return;

            }

            retryCount = 0;

            continue;

        }

    }

    try {

        await writable.close();

    } catch (err) {

        ui.statusEl.textContent =
            "⚠ Could not finish writing file";

        resetDownloadUI(ui);

        return;

    }

    updateProgressUI(
        ui,
        fileSize,
        fileSize,
        "✓ Done"
    );

    resetDownloadUI(ui);

}


/* =====================================
   SEND FILES
===================================== */

if (sendButton) {

    sendButton.addEventListener(
        "click",
        async function() {

            const checkboxes =
                fileList.querySelectorAll(
                    ".file-check"
                );


            const selectedItems =
                [];


            for (
                let i = 0;
                i < checkboxes.length;
                i++
            ) {

                if (
                    checkboxes[i].checked
                ) {

                    selectedItems.push({
                        file: fileInput.files[i],
                        ui: uploadUIByIndex[i]
                    });

                }

            }


            if (
                selectedItems.length === 0
            ) {

                successText.textContent =
                    "⚠ No files selected";

                successMessage.classList.add(
                    "show"
                );

                return;

            }


            sendButton.disabled =
                true;

            sendButton.textContent =
                "Sending...";


            let successCount = 0;

            let failCount = 0;

            let cancelCount = 0;


            for (
                const item of selectedItems
            ) {

                try {

                    const result =
                        await uploadFileResumable(
                            item.file,
                            item.ui
                        );

                    if (result && result.cancelled) {

                        cancelCount++;

                    } else {

                        successCount++;

                    }

                } catch (error) {

                    console.error(
                        "File transfer error:",
                        error
                    );

                    failCount++;

                }

            }


            const extras =
                [];

            if (failCount > 0) {

                extras.push(
                    failCount + " failed"
                );

            }

            if (cancelCount > 0) {

                extras.push(
                    cancelCount + " cancelled"
                );

            }

            const extrasText =
                extras.length > 0
                    ? " (" + extras.join(", ") + ")"
                    : "";

            if (successCount > 0) {

                successText.textContent =
                    "✓ " +
                    successCount +
                    (
                        successCount === 1
                            ? " file sent successfully"
                            : " files sent successfully"
                    ) +
                    extrasText;

            } else if (cancelCount > 0 && failCount === 0) {

                successText.textContent =
                    "Upload cancelled";

            } else {

                successText.textContent =
                    "⚠ Failed to send files";

            }


            successMessage.classList.add(
                "show"
            );


            fileList
                .querySelectorAll(
                    ".file-check"
                )
                .forEach(
                    function(checkbox) {

                        checkbox.checked =
                            false;

                    }
                );


            sendButton.disabled =
                false;

            sendButton.textContent =
                "Send Files";

            clearUploadToast();

        }
    );

}


/* =====================================
   UPDATE SELECTED FILE STATUS
===================================== */

function updateSelectedStatus() {

    if (
        !downloadFileList ||
        !selectedFileStatus ||
        !downloadSelectedButton ||
        !deleteSelectedButton
    ) {

        return;

    }


    const checkboxes =
        downloadFileList.querySelectorAll(
            ".file-check"
        );


    let selectedCount =
        0;


    checkboxes.forEach(
        function(checkbox) {

            if (checkbox.checked) {

                selectedCount++;

            }

        }
    );


    selectedFileStatus.textContent =
        selectedCount +
        (
            selectedCount === 1
                ? " file selected"
                : " files selected"
        );


    downloadSelectedButton.disabled =
        selectedCount === 0;


    deleteSelectedButton.disabled =
        selectedCount === 0;


    if (
        selectAllButton &&
        checkboxes.length > 0 &&
        selectedCount === checkboxes.length
    ) {

        selectAllButton.textContent =
            "Deselect All";

    }

    else if (selectAllButton) {

        selectAllButton.textContent =
            "Select All";

    }

}


/* =====================================
   SELECT ALL / DESELECT ALL
===================================== */

if (selectAllButton) {

    selectAllButton.addEventListener(
        "click",
        function() {

            const checkboxes =
                downloadFileList.querySelectorAll(
                    ".file-check"
                );


            if (checkboxes.length === 0) {

                return;

            }


            let allSelected =
                true;


            checkboxes.forEach(
                function(checkbox) {

                    if (!checkbox.checked) {

                        allSelected =
                            false;

                    }

                }
            );


            checkboxes.forEach(
                function(checkbox) {

                    checkbox.checked =
                        !allSelected;

                }
            );


            updateSelectedStatus();

        }
    );

}


/* =====================================
   LOAD DOWNLOAD FILES
===================================== */

async function loadFiles() {

    if (
        !downloadStatus ||
        !downloadFileList ||
        !downloadSelectedButton ||
        !deleteSelectedButton ||
        !selectedFileStatus
    ) {

        return;

    }


    downloadStatus.textContent =
        "Loading files...";


    downloadFileList.innerHTML =
        "";


    downloadUIByFilename =
        {};


    downloadSelectedButton.disabled =
        true;


    deleteSelectedButton.disabled =
        true;


    if (selectAllButton) {

        selectAllButton.textContent =
            "Select All";

    }


    selectedFileStatus.textContent =
        "0 files selected";


    try {

        const response =
            await fetch(
                "/files",
                {
                    headers: srixRoomHeaders()
                }
            );


        if (!response.ok) {

            throw new Error(
                "Could not load files"
            );

        }


        const files =
            await response.json();


        if (files.length === 0) {

            downloadStatus.textContent =
                "No files available.";

            return;

        }


        downloadStatus.textContent =
            files.length +
            (
                files.length === 1
                    ? " file available"
                    : " files available"
            );


        for (
            const file of files
        ) {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "download-card";


            /* CHECKBOX */

            const checkbox =
                document.createElement(
                    "input"
                );


            checkbox.type =
                "checkbox";


            checkbox.className =
                "file-check";


            checkbox.dataset.filename =
                file.name;


            checkbox.addEventListener(
                "change",
                updateSelectedStatus
            );


            /* FILE ICON */

            const icon =
                document.createElement(
                    "span"
                );


            icon.className =
                "download-icon";


            icon.textContent =
                "📄";


            /* FILE INFO */

            const info =
                document.createElement(
                    "div"
                );


            info.className =
                "download-info";


            const name =
                document.createElement(
                    "div"
                );


            name.className =
                "download-name";


            name.textContent =
                file.name;


            const size =
                document.createElement(
                    "div"
                );


            size.className =
                "download-size";


            size.textContent =
                formatSize(
                    file.size
                );


            /* SENDER (which device uploaded this file) */

            const sender =
                document.createElement(
                    "div"
                );

            sender.className =
                "download-sender";

            if (file.sender) {

                sender.textContent =
                    "From " +
                    file.sender;

            }


            const progressTrack =
                document.createElement(
                    "div"
                );

            progressTrack.className =
                "file-progress-track";

            progressTrack.style.display =
                "none";

            const progressFill =
                document.createElement(
                    "div"
                );

            progressFill.className =
                "file-progress-fill";

            progressTrack.appendChild(
                progressFill
            );


            const status =
                document.createElement(
                    "small"
                );

            status.className =
                "file-status";


            info.appendChild(
                name
            );


            info.appendChild(
                size
            );


            if (file.sender) {

                info.appendChild(
                    sender
                );

            }


            info.appendChild(
                progressTrack
            );


            info.appendChild(
                status
            );


            const downloadUI = {
                fillEl: progressFill,
                trackEl: progressTrack,
                statusEl: status,
                controller: {
                    paused: false,
                    cancelled: false,
                    abortController: null,
                    resumeResolve: null,
                    lastKnownOffset: 0
                }
            };


            /* ACTIONS */

            const actions =
                document.createElement(
                    "div"
                );


            actions.className =
                "file-actions";


            /* DOWNLOAD BUTTON */

            const downloadButton =
                document.createElement(
                    "button"
                );


            downloadButton.className =
                "download-button";


            downloadButton.textContent =
                "Download";


            /* PAUSE BUTTON (download) */

            const downloadPauseBtn =
                document.createElement(
                    "button"
                );

            downloadPauseBtn.type =
                "button";

            downloadPauseBtn.className =
                "download-pause-btn";

            downloadPauseBtn.textContent =
                "Pause";

            downloadPauseBtn.style.display =
                "none";


            /* CANCEL BUTTON (download) */

            const downloadCancelBtn =
                document.createElement(
                    "button"
                );

            downloadCancelBtn.type =
                "button";

            downloadCancelBtn.className =
                "download-cancel-btn";

            downloadCancelBtn.textContent =
                "✕";

            downloadCancelBtn.title =
                "Cancel download";

            downloadCancelBtn.style.display =
                "none";


            downloadUI.pauseBtn =
                downloadPauseBtn;

            downloadUI.cancelBtn =
                downloadCancelBtn;

            downloadUI.downloadBtn =
                downloadButton;

            downloadUIByFilename[file.name] = {
                ui: downloadUI,
                size: file.size
            };


            downloadButton.addEventListener(
                "click",
                function() {

                    downloadFileResumable(
                        file.name,
                        file.size,
                        downloadUI
                    );

                }
            );


            /* DELETE BUTTON */

            const deleteButton =
                document.createElement(
                    "button"
                );


            deleteButton.className =
                "delete-button";


            deleteButton.textContent =
                "🗑";


            deleteButton.title =
                "Delete file";


            deleteButton.addEventListener(
                "click",
                async function() {

                    const confirmed =
                        window.confirm(
                            "Are you sure you want to delete this file?\n\n" +
                            file.name
                        );


                    if (!confirmed) {

                        return;

                    }


                    try {

                        deleteButton.disabled =
                            true;


                        const response =
                            await fetch(
                                "/delete/" +
                                encodeURIComponent(
                                    file.name
                                ),
                                {
                                    method:
                                        "DELETE",
                                    headers:
                                        srixRoomHeaders()
                                }
                            );


                        if (!response.ok) {

                            throw new Error(
                                "Delete failed"
                            );

                        }


                        successText.textContent =
                            "✓ File deleted successfully";


                        successMessage.classList.add(
                            "show"
                        );


                        await loadFiles();

                    }

                    catch (error) {

                        console.error(
                            "Delete error:",
                            error
                        );


                        successText.textContent =
                            "⚠ Failed to delete file";


                        successMessage.classList.add(
                            "show"
                        );


                        deleteButton.disabled =
                            false;

                    }

                }
            );


            actions.appendChild(
                downloadButton
            );


            actions.appendChild(
                downloadPauseBtn
            );


            actions.appendChild(
                downloadCancelBtn
            );


            actions.appendChild(
                deleteButton
            );


            card.appendChild(
                checkbox
            );


            card.appendChild(
                icon
            );


            card.appendChild(
                info
            );


            card.appendChild(
                actions
            );


            downloadFileList.appendChild(
                card
            );

        }


        updateSelectedStatus();

    }

    catch (error) {

        console.error(
            "Download list error:",
            error
        );


        downloadStatus.textContent =
            "⚠ Could not load files.";

    }

}


/* =====================================
   DOWNLOAD SELECTED
===================================== */

if (downloadSelectedButton) {

    downloadSelectedButton.addEventListener(
        "click",
        async function() {

            const checkboxes =
                downloadFileList.querySelectorAll(
                    ".file-check:checked"
                );


            if (
                checkboxes.length === 0
            ) {

                return;

            }


            const selectedFiles =
                [];


            checkboxes.forEach(
                function(checkbox) {

                    selectedFiles.push(
                        checkbox.dataset.filename
                    );

                }
            );


            downloadSelectedButton.disabled =
                true;


            if (supportsResumableDownload()) {

                // One save-location prompt per file, one after
                // another, so each card gets its own progress
                // bar plus working Pause/Cancel.
                for (
                    const filename of selectedFiles
                ) {

                    const entry =
                        downloadUIByFilename[filename];

                    if (!entry) {
                        continue;
                    }

                    await downloadFileResumable(
                        filename,
                        entry.size,
                        entry.ui
                    );

                }

                successText.textContent =
                    "✓ Downloads finished";

                successMessage.classList.add(
                    "show"
                );

                downloadSelectedButton.disabled =
                    false;

                return;

            }


            // Fallback for browsers without the File System
            // Access API - plain staggered browser downloads,
            // no in-app progress/pause/cancel.
            selectedFiles.forEach(
                function(filename, index) {

                    setTimeout(
                        function() {

                            const link =
                                document.createElement(
                                    "a"
                                );


                            link.href =
                                "/download/" +
                                encodeURIComponent(
                                    filename
                                );


                            link.download =
                                filename;


                            document.body.appendChild(
                                link
                            );


                            link.click();


                            document.body.removeChild(
                                link
                            );

                        },
                        index * 350
                    );

                }
            );


            successText.textContent =
                "✓ Downloading " +
                selectedFiles.length +
                (
                    selectedFiles.length === 1
                        ? " file"
                        : " files"
                );


            successMessage.classList.add(
                "show"
            );


            setTimeout(
                function() {

                    updateSelectedStatus();

                    downloadSelectedButton.disabled =
                        false;

                },
                selectedFiles.length * 350 + 100
            );

        }
    );

}


/* =====================================
   DELETE SELECTED
===================================== */

if (deleteSelectedButton) {

    deleteSelectedButton.addEventListener(
        "click",
        async function() {

            const checkboxes =
                downloadFileList.querySelectorAll(
                    ".file-check:checked"
                );


            if (
                checkboxes.length === 0
            ) {

                return;

            }


            const selectedFiles =
                [];


            checkboxes.forEach(
                function(checkbox) {

                    selectedFiles.push(
                        checkbox.dataset.filename
                    );

                }
            );


            const confirmation =
                window.confirm(
                    "Are you sure you want to delete " +
                    selectedFiles.length +
                    (
                        selectedFiles.length === 1
                            ? " selected file?"
                            : " selected files?"
                    ) +
                    "\n\nThis cannot be undone."
                );


            if (!confirmation) {

                return;

            }


            deleteSelectedButton.disabled =
                true;


            downloadSelectedButton.disabled =
                true;


            deleteSelectedButton.textContent =
                "Deleting...";


            let deletedCount =
                0;


            let failedCount =
                0;


            for (
                const filename of selectedFiles
            ) {

                try {

                    const response =
                        await fetch(
                            "/delete/" +
                            encodeURIComponent(
                                filename
                            ),
                            {
                                method:
                                    "DELETE",
                                headers:
                                    srixRoomHeaders()
                            }
                        );


                    if (!response.ok) {

                        throw new Error(
                            "Delete failed"
                        );

                    }


                    deletedCount++;

                }

                catch (error) {

                    console.error(
                        "Failed to delete:",
                        filename,
                        error
                    );


                    failedCount++;

                }

            }


            if (
                failedCount === 0
            ) {

                successText.textContent =
                    "✓ " +
                    deletedCount +
                    (
                        deletedCount === 1
                            ? " file deleted successfully"
                            : " files deleted successfully"
                    );

            }

            else {

                successText.textContent =
                    "⚠ " +
                    deletedCount +
                    " deleted, " +
                    failedCount +
                    " failed";

            }


            successMessage.classList.add(
                "show"
            );


            await loadFiles();


            deleteSelectedButton.textContent =
                "🗑 Delete Selected";

        }
    );

}


/* =====================================
   INITIAL UI STATE
===================================== */

if (
    uploadSection &&
    downloadSection
) {

    uploadSection.style.display =
        "none";

    downloadSection.style.display =
        "none";

}


if (uploadModeButton) {

    uploadModeButton.classList.remove(
        "active-mode"
    );

}


if (downloadModeButton) {

    downloadModeButton.classList.remove(
        "active-mode"
    );

}


/* =====================================
   QUICK SHARE (LIVE / MULTI-DEVICE)
   Ported from the standalone Quick Share
   page. Connects over WebSocket and syncs
   shared text items across devices.
===================================== */

// ============================================================
// ELEMENTS
// ============================================================

const editor =
    document.getElementById("editor");

const shareButton =
    document.getElementById("shareButton");

const homeButton =
    document.getElementById("homeButton");

const clearAllButton =
    document.getElementById("clearAllButton");

const connection =
    document.getElementById("connection");

const deviceName =
    document.getElementById("deviceName");

const deviceCount =
    document.getElementById("deviceCount");

const items =
    document.getElementById("items");

const itemsCount =
    document.getElementById("itemsCount");


// ============================================================
// SETTINGS
// ============================================================

/*
    The server now multiplexes the WebSocket connection on
    the SAME port as the regular HTTP server (see
    getWebSocketURL() below), so there is no separate
    WebSocket port to configure here anymore.
*/


// ============================================================
// STATE
// ============================================================

let socket = null;

let deviceId = null;

let deviceDisplayName = "Device";

let sharedItems = [];

let reconnectTimer = null;

let manuallyClosed = false;


// ============================================================
// DEVICE ID
// ============================================================

function getDeviceId() {

    let id =
        localStorage.getItem(
            "phoneTransferDeviceId"
        );

    if (!id) {

        if (
            window.crypto &&
            typeof crypto.randomUUID === "function"
        ) {

            id =
                "device-" +
                crypto.randomUUID();

        } else {

            id =
                "device-" +
                Date.now() +
                "-" +
                Math.random()
                    .toString(36)
                    .substring(2);

        }

        localStorage.setItem(
            "phoneTransferDeviceId",
            id
        );

    }

    return id;
}


deviceId = getDeviceId();


// ============================================================
// DEVICE NAME
// ============================================================

// Devices used to get a random name like "Computer-7889".
// Now we ask once, remember the answer in localStorage, and
// let the person rename themselves any time from the home
// screen. A random fallback still exists purely so the app
// never breaks if someone dismisses the naming prompt.

function randomFallbackName() {

    const isPhone =
        /Android|iPhone|iPad|Mobile/i.test(
            navigator.userAgent
        );

    const defaultName =
        isPhone
            ? "Phone"
            : "Computer";

    return (
        defaultName +
        "-" +
        Math.floor(
            1000 +
            Math.random() * 9000
        )
    );
}


function getSavedDeviceName() {

    return localStorage.getItem(
        "phoneTransferDeviceName"
    );
}


function setSavedDeviceName(name) {

    deviceDisplayName = name;

    localStorage.setItem(
        "phoneTransferDeviceName",
        name
    );

    if (deviceName) {

        deviceName.textContent =
            "📱 " +
            deviceDisplayName;

    }

    if (homeDeviceNameLabel) {

        homeDeviceNameLabel.textContent =
            "You are: " +
            deviceDisplayName;

    }

    if (typeof identifyDevice === "function") {

        identifyDevice();

    }
}


const deviceNameOverlay =
    document.getElementById("deviceNameOverlay");

const deviceNameInput =
    document.getElementById("deviceNameInput");

const deviceNameSaveButton =
    document.getElementById("deviceNameSaveButton");

const deviceNameSkipButton =
    document.getElementById("deviceNameSkipButton");

const editDeviceNameButton =
    document.getElementById("editDeviceNameButton");

const homeDeviceNameLabel =
    document.getElementById("homeDeviceNameLabel");


function openDeviceNameModal() {

    if (!deviceNameOverlay) {
        return;
    }

    deviceNameInput.value =
        getSavedDeviceName() || "";

    deviceNameOverlay.style.display = "flex";

    setTimeout(
        function () {
            deviceNameInput.focus();
        },
        50
    );
}


function closeDeviceNameModal() {

    if (!deviceNameOverlay) {
        return;
    }

    deviceNameOverlay.style.display = "none";
}


function confirmDeviceName() {

    const typed =
        deviceNameInput.value
            .trim()
            .slice(0, 40);

    setSavedDeviceName(
        typed || randomFallbackName()
    );

    closeDeviceNameModal();
}


if (deviceNameSaveButton) {

    deviceNameSaveButton.addEventListener(
        "click",
        confirmDeviceName
    );
}


if (deviceNameInput) {

    deviceNameInput.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Enter") {

                event.preventDefault();

                confirmDeviceName();

            }
        }
    );
}


if (deviceNameSkipButton) {

    deviceNameSkipButton.addEventListener(
        "click",
        function () {

            setSavedDeviceName(
                randomFallbackName()
            );

            closeDeviceNameModal();
        }
    );
}


if (editDeviceNameButton) {

    editDeviceNameButton.addEventListener(
        "click",
        openDeviceNameModal
    );
}


// ============================================================
// SHARE LINK / QR CODE
//
// The link shown/encoded is always window.location.origin -
// whatever address the browser actually used to load this
// page. That means it's automatically the LAN address when
// opened locally, and automatically the Cloudflare Tunnel (or
// any other tunnel/port-forward) URL when opened through that
// instead - no detection logic needed.
// ============================================================

const shareLinkButton =
    document.getElementById("shareLinkButton");

const shareLinkOverlay =
    document.getElementById("shareLinkOverlay");

const shareLinkQrImage =
    document.getElementById("shareLinkQrImage");

const shareLinkText =
    document.getElementById("shareLinkText");

const copyShareLinkButton =
    document.getElementById("copyShareLinkButton");

const closeShareLinkButton =
    document.getElementById("closeShareLinkButton");


function getShareableLink() {

    return window.location.origin;
}


function openShareLinkModal() {

    if (!shareLinkOverlay) {
        return;
    }

    const link =
        getShareableLink();

    if (shareLinkText) {

        shareLinkText.textContent =
            link;
    }

    if (shareLinkQrImage) {

        shareLinkQrImage.src =
            "https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=" +
            encodeURIComponent(link);
    }

    shareLinkOverlay.style.display =
        "flex";
}


function closeShareLinkModal() {

    if (!shareLinkOverlay) {
        return;
    }

    shareLinkOverlay.style.display =
        "none";
}


if (shareLinkButton) {

    shareLinkButton.addEventListener(
        "click",
        openShareLinkModal
    );
}


if (closeShareLinkButton) {

    closeShareLinkButton.addEventListener(
        "click",
        closeShareLinkModal
    );
}


if (shareLinkOverlay) {

    shareLinkOverlay.addEventListener(
        "click",
        function (event) {

            if (event.target === shareLinkOverlay) {
                closeShareLinkModal();
            }
        }
    );
}


if (copyShareLinkButton) {

    copyShareLinkButton.addEventListener(
        "click",
        async function () {

            try {

                await navigator.clipboard.writeText(
                    getShareableLink()
                );

                copyShareLinkButton.textContent =
                    "✓ Copied";

                setTimeout(
                    function () {

                        copyShareLinkButton.textContent =
                            "📋 Copy";
                    },
                    1200
                );

            } catch (error) {

                alert(
                    "Could not copy the link."
                );
            }
        }
    );
}


const existingDeviceName =
    getSavedDeviceName();

if (existingDeviceName) {

    deviceDisplayName = existingDeviceName;

} else {

    deviceDisplayName = randomFallbackName();

    openDeviceNameModal();
}


if (deviceName) {

    deviceName.textContent =
        "📱 " +
        deviceDisplayName;

}

if (homeDeviceNameLabel) {

    homeDeviceNameLabel.textContent =
        "You are: " +
        deviceDisplayName;

}


// ============================================================
// HOME
// ============================================================

homeButton.addEventListener(
    "click",
    function () {

        showHome();

    }
);


// ============================================================
// HOME NETWORK PANEL
// ============================================================

const homeDeviceCount =
    document.getElementById("homeDeviceCount");

const homeConnectionDot =
    document.getElementById("homeConnectionDot");

const homeDeviceList =
    document.getElementById("homeDeviceList");


// ============================================================
// CONNECTION STATUS
// ============================================================

function setConnectionStatus(
    connected
) {

    if (connected) {

        connection.textContent =
            "✓ Connected";

        connection.className =
            "connected";

        shareButton.disabled =
            false;

    } else {

        connection.textContent =
            "Connecting...";

        connection.className =
            "disconnected";

        shareButton.disabled =
            true;

    }

    if (homeConnectionDot) {

        homeConnectionDot.className =
            "pulse-dot " +
            (connected ? "live" : "offline");

    }

}


// ============================================================
// DEVICE COUNT
// ============================================================

function getRoomLabel() {
    return getSrixRoomToken()
        ? "Password protected"
        : "Free for all";
}


const homeRoomNote =
    document.getElementById("homeRoomNote");

const transferRoomNote =
    document.getElementById("transferRoomNote");

const quickRoomNote =
    document.getElementById("quickRoomNote");


function updateRoomStatusNotes() {

    const isPassword =
        !!getSrixRoomToken();

    const text =
        isPassword
            ? "🔒 Password protected — only visible to devices using this password. Files and shared text here are deleted automatically about 60 seconds after everyone using this password disconnects (unless someone reconnects with it first)."
            : "🌐 Free for all — open to any device on this network.";

    [
        homeRoomNote,
        transferRoomNote,
        quickRoomNote
    ].forEach(function(el) {

        if (!el) {
            return;
        }

        el.textContent = text;

        el.classList.toggle(
            "room-note-password",
            isPassword
        );

    });

}


function updateDeviceCount(
    count
) {

    count =
        Number(count) || 0;

    const roomLabel =
        getRoomLabel();

    const label =
        (
            count === 1
                ? "1 device connected"
                : count + " devices connected"
        ) +
        " · " +
        roomLabel;

    deviceCount.textContent = label;

    if (homeDeviceCount) {

        homeDeviceCount.textContent =
            (
                count === 0
                    ? "No other devices yet"
                    : label
            ) +
            (
                count === 0
                    ? " · " + roomLabel
                    : ""
            );

    }

}


// ============================================================
// CONNECTED DEVICES LIST (home screen)
// ============================================================

function initials(name) {

    const trimmed =
        (name || "")
            .trim();

    if (!trimmed) {
        return "?";
    }

    const parts =
        trimmed.split(/\s+/);

    if (parts.length === 1) {

        return parts[0]
            .slice(0, 2)
            .toUpperCase();

    }

    return (
        parts[0][0] +
        parts[1][0]
    ).toUpperCase();

}


function renderHomeDeviceList(devices) {

    if (!homeDeviceList) {
        return;
    }

    if (!Array.isArray(devices)) {
        devices = [];
    }

    homeDeviceList.innerHTML = "";

    if (devices.length === 0) {

        const empty =
            document.createElement("div");

        empty.className =
            "device-chip-empty";

        empty.textContent =
            "You're the only one here right now.";

        homeDeviceList.appendChild(empty);

        return;
    }

    devices.forEach(
        function (device) {

            const chip =
                document.createElement("div");

            chip.className =
                "device-chip";

            const isYou =
                device.id === deviceId;

            const avatar =
                document.createElement("div");

            avatar.className =
                "device-chip-avatar";

            avatar.textContent =
                initials(device.name);

            const label =
                document.createElement("div");

            label.className =
                "device-chip-label";

            label.textContent =
                (device.name || "Device") +
                (isYou ? " (you)" : "");

            chip.appendChild(avatar);
            chip.appendChild(label);

            homeDeviceList.appendChild(chip);

        }
    );

}


renderHomeDeviceList([]);


// ============================================================
// ITEM COUNT
// ============================================================

function updateItemCount() {

    const count =
        sharedItems.length;

    if (count === 1) {

        itemsCount.textContent =
            "1 item";

    } else {

        itemsCount.textContent =
            count +
            " items";

    }

}


// ============================================================
// RENDER ITEMS
// ============================================================

function renderItems() {

    items.innerHTML = "";

    updateItemCount();


    if (
        sharedItems.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "empty";

        empty.innerHTML =
            "Nothing shared yet.<br>" +
            "Send something above and it will appear here.";

        items.appendChild(
            empty
        );

        return;

    }


    sharedItems
        .slice()
        .reverse()
        .forEach(
            function (item) {

                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "item";


                const top =
                    document.createElement(
                        "div"
                    );

                top.className =
                    "itemTop";


                const sender =
                    document.createElement(
                        "div"
                    );

                sender.className =
                    "itemSender";

                sender.textContent =
                    "📱 " +
                    (
                        item.sender ||
                        item.device_name ||
                        "Unknown Device"
                    );


                const time =
                    document.createElement(
                        "div"
                    );

                time.className =
                    "itemTime";

                time.textContent =
                    formatTime(
                        item.timestamp
                    );


                top.appendChild(sender);

                top.appendChild(time);


                const text =
                    document.createElement(
                        "div"
                    );

                text.className =
                    "itemText";

                text.textContent =
                    item.text || "";


                const actions =
                    document.createElement(
                        "div"
                    );

                actions.className =
                    "itemActions";


                // COPY
                const copy =
                    document.createElement(
                        "button"
                    );

                copy.className =
                    "copyItemButton";

                copy.textContent =
                    "📋 Copy";


                copy.addEventListener(
                    "click",
                    async function () {

                        try {

                            await navigator.clipboard.writeText(
                                item.text || ""
                            );

                            copy.textContent =
                                "✓ Copied";

                            setTimeout(
                                function () {

                                    copy.textContent =
                                        "📋 Copy";

                                },
                                1200
                            );

                        } catch (error) {

                            alert(
                                "Could not copy this item."
                            );

                        }

                    }
                );


                // DELETE
                const remove =
                    document.createElement(
                        "button"
                    );

                remove.className =
                    "deleteButton";

                remove.textContent =
                    "🗑 Delete";


                remove.addEventListener(
                    "click",
                    function () {

                        deleteItem(
                            item.id
                        );

                    }
                );


                actions.appendChild(
                    copy
                );

                actions.appendChild(
                    remove
                );


                card.appendChild(
                    top
                );

                card.appendChild(
                    text
                );

                card.appendChild(
                    actions
                );


                items.appendChild(
                    card
                );

            }
        );

}


// ============================================================
// TIME
// ============================================================

function formatTime(
    timestamp
) {

    if (!timestamp) {
        return "";
    }

    const date =
        new Date(timestamp);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }

    return date.toLocaleTimeString(
        [],
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


// ============================================================
// WEBSOCKET URL
// ============================================================

function getWebSocketURL() {

    const protocol =
        location.protocol === "https:"
            ? "wss:"
            : "ws:";


    const hostname =
        location.hostname ||
        "localhost";

    /*
        The server multiplexes plain HTTP and the
        WebSocket connection on the SAME port (this is
        what makes Quick Share work through tunnels like
        Cloudflare Quick Tunnels, which only forward one
        local port). So we reuse the page's own origin
        port instead of a separate WEBSOCKET_PORT.
    */

    const port =
        location.port ?
            ":" + location.port :
            "";


    return (
        protocol +
        "//" +
        hostname +
        port +
        "/?room=" +
        encodeURIComponent(getSrixRoomToken())
    );

}


// ============================================================
// SEND IDENTIFICATION
// ============================================================

function identifyDevice() {

    if (
        !socket ||
        socket.readyState !== WebSocket.OPEN
    ) {
        return;
    }


    socket.send(
        JSON.stringify({

            type: "identify",

            device_id:
                deviceId,

            device_name:
                deviceDisplayName

        })
    );

}


// ============================================================
// CONNECT
// ============================================================

function connect() {

    /*
        Prevent multiple WebSocket connections.
    */

    if (
        socket &&
        (
            socket.readyState ===
                WebSocket.OPEN ||

            socket.readyState ===
                WebSocket.CONNECTING
        )
    ) {

        return;

    }


    setConnectionStatus(
        false
    );


    const wsURL =
        getWebSocketURL();


    console.log(
        "Quick Share connecting to:",
        wsURL
    );


    try {

        socket =
            new WebSocket(
                wsURL
            );

    } catch (error) {

        console.error(
            "WebSocket creation failed:",
            error
        );

        scheduleReconnect();

        return;

    }


    socket.addEventListener(
        "open",
        function () {

            console.log(
                "Quick Share WebSocket connected."
            );


            setConnectionStatus(
                true
            );


            identifyDevice();

        }
    );


    socket.addEventListener(
        "message",
        function (event) {

            let data;


            try {

                data =
                    JSON.parse(
                        event.data
                    );

            } catch (error) {

                console.error(
                    "Invalid WebSocket message:",
                    event.data
                );

                return;

            }


            console.log(
                "Quick Share message:",
                data
            );


            // ==================================================
            // FULL SYNC
            // ==================================================

            if (
                data.type ===
                "sync"
            ) {

                sharedItems =
                    Array.isArray(
                        data.items
                    )
                        ? data.items
                        : [];


                renderItems();


                if (
                    typeof data.device_count ===
                    "number"
                ) {

                    updateDeviceCount(
                        data.device_count
                    );

                }

                return;

            }


            // ==================================================
            // NEW ITEM
            // ==================================================

            if (
                data.type ===
                "item_added"
            ) {

                if (
                    data.item
                ) {

                    /*
                        Prevent duplicate items if the backend
                        sends the same item more than once.
                    */

                    const exists =
                        sharedItems.some(
                            function (item) {

                                return (
                                    item.id &&
                                    data.item.id &&
                                    item.id ===
                                        data.item.id
                                );

                            }
                        );


                    if (!exists) {

                        sharedItems.push(
                            data.item
                        );

                        renderItems();

                    }

                }

                return;

            }


            // ==================================================
            // ITEM DELETED
            // ==================================================

            if (
                data.type ===
                "item_deleted"
            ) {

                sharedItems =
                    sharedItems.filter(
                        function (item) {

                            return (
                                item.id !==
                                data.id
                            );

                        }
                    );


                renderItems();

                return;

            }


            // ==================================================
            // ALL ITEMS CLEARED
            // ==================================================

            if (
                data.type ===
                "all_cleared"
            ) {

                sharedItems = [];

                renderItems();

                return;

            }


            // ==================================================
            // DEVICE COUNT
            // ==================================================

            if (
                data.type ===
                "device_count"
            ) {

                updateDeviceCount(
                    data.count
                );

                return;

            }


            // ==================================================
            // DEVICE LIST
            // ==================================================

            if (
                data.type ===
                "device_list"
            ) {

                renderHomeDeviceList(
                    data.devices
                );

                return;

            }


            // ==================================================
            // OPTIONAL ERROR MESSAGE
            // ==================================================

            if (
                data.type ===
                "error"
            ) {

                console.error(
                    "Quick Share server error:",
                    data.message
                );

                alert(
                    data.message ||
                    "Something went wrong on the server."
                );

            }

        }
    );


    socket.addEventListener(
        "error",
        function (error) {

            console.error(
                "Quick Share WebSocket error:",
                error
            );

            setConnectionStatus(
                false
            );

        }
    );


    socket.addEventListener(
        "close",
        function (event) {

            console.log(
                "Quick Share WebSocket closed.",
                event.code,
                event.reason
            );


            setConnectionStatus(
                false
            );


            socket = null;


            if (!manuallyClosed) {

                scheduleReconnect();

            }

        }
    );

}


// ============================================================
// RECONNECT
// ============================================================

function scheduleReconnect() {

    if (reconnectTimer) {
        return;
    }


    console.log(
        "Quick Share reconnecting in 2 seconds..."
    );


    reconnectTimer =
        setTimeout(
            function () {

                reconnectTimer =
                    null;

                connect();

            },
            2000
        );

}


// ============================================================
// SHARE ITEM
// ============================================================

function shareItem() {

    const text =
        editor.value;


    if (
        text.trim() === ""
    ) {

        editor.focus();

        return;

    }


    if (
        !socket ||
        socket.readyState !==
            WebSocket.OPEN
    ) {

        alert(
            "Not connected yet — give it a second and try again."
        );

        return;

    }


    const message = {

        type:
            "add_item",

        text:
            text,

        device_id:
            deviceId,

        device_name:
            deviceDisplayName

    };


    console.log(
        "Sending Quick Share item:",
        message
    );


    try {

        socket.send(
            JSON.stringify(
                message
            )
        );


        editor.value = "";

        editor.focus();

    } catch (error) {

        console.error(
            "Failed to send item:",
            error
        );

        alert(
            "Could not send the item."
        );

    }

}


shareButton.addEventListener(
    "click",
    shareItem
);


// ============================================================
// CTRL + ENTER
// ============================================================

editor.addEventListener(
    "keydown",
    function (event) {

        if (
            event.ctrlKey &&
            event.key === "Enter"
        ) {

            event.preventDefault();

            shareItem();

        }

    }
);


// ============================================================
// DELETE ITEM
// ============================================================

function deleteItem(
    id
) {

    if (
        !socket ||
        socket.readyState !==
            WebSocket.OPEN
    ) {

        alert(
            "Not connected right now."
        );

        return;

    }


    try {

        socket.send(
            JSON.stringify({

                type:
                    "delete_item",

                id:
                    id

            })
        );

    } catch (error) {

        console.error(
            "Delete failed:",
            error
        );

    }

}


// ============================================================
// CLEAR ALL
// ============================================================

clearAllButton.addEventListener(
    "click",
    function () {

        if (
            sharedItems.length ===
            0
        ) {

            return;

        }


        if (
            !confirm(
                "Clear all shared items for everyone?"
            )
        ) {

            return;

        }


        if (
            !socket ||
            socket.readyState !==
                WebSocket.OPEN
        ) {

            alert(
                "Not connected right now."
            );

            return;

        }


        try {

            socket.send(
                JSON.stringify({

                    type:
                        "clear_all"

                })
            );

        } catch (error) {

            console.error(
                "Clear all failed:",
                error
            );

        }

    }
);


// ============================================================
// START
// ============================================================
// Free for all is the default from the moment the page loads,
// so there's no gate to wait for anymore - just start. Password
// protection (if the person turns it on via the small lock icon)
// reloads the page itself, see protectSessionWithPassword() /
// leaveProtectedSession() near the top of this file.
// ============================================================

function startSrixApp() {

    renderItems();

    updateDeviceCount(0);

    updateRoomStatusNotes();

    setConnectionStatus(false);

    connect();

}

startSrixApp();