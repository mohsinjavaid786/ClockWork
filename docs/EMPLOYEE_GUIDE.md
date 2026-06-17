# Clockwork — Employee Guide

> This guide is for **employees** who track time using the Clockwork desktop app. No technical knowledge required.

---

## Table of Contents

- [What Clockwork does](#what-clockwork-does)
- [Installation](#installation)
- [Logging in](#logging-in)
- [Your first timer](#your-first-timer)
- [Daily workflow](#daily-workflow)
- [Screenshots and activity tracking](#screenshots-and-activity-tracking)
- [The system tray](#the-system-tray)
- [Signing out](#signing-out)
- [Getting app updates](#getting-app-updates)
- [FAQ](#faq)

---

## What Clockwork does

Clockwork is a time tracking app that runs on your computer. While you work, it:

- Records how long you spend on each task or project
- Takes a screenshot of **every connected monitor** every few minutes so your manager can see what you were working on
- Measures your keyboard and mouse activity to calculate an **activity percentage** — how active you were during each screenshot window
- Uploads everything securely to the team's server

Screenshots are captured **as-is** — no blur, no filter. This is the same model as Upwork's tracker: managers see exactly what was on screen so the time tracked can be verified. If you have two or three monitors, Clockwork captures all of them at the same moment, and each screen appears separately in the admin portal labelled `Screen 1 of 2`, `Screen 2 of 2`, etc.

> **Privacy tip:** Stop the timer before opening anything personal (banking, private messages, email). The tracker only captures while a timer is running — outside of that, nothing is recorded.

---

## Installation

Your admin will send you a link to download the installer for your operating system.

| Platform | File to download |
|---|---|
| macOS | `Clockwork-x.x.x.dmg` |
| Windows | `Clockwork Setup x.x.x.exe` |

**macOS:**
1. Open the `.dmg` file
2. Drag **Clockwork** into your **Applications** folder
3. The first time you open it, macOS shows: *"Apple could not verify Clockwork is free of malware."* This is expected — Clockwork isn't distributed through the App Store. To open it:
   - Open  → **System Settings → Privacy & Security**
   - Scroll to the bottom — next to *"Clockwork was blocked…"* click **Open Anyway**, then authenticate
   - (One-time only. After that it opens normally.)
   - **Alternative:** open **Terminal** and run `xattr -dr com.apple.quarantine /Applications/Clockwork.app`, then open Clockwork.

**Windows:**
1. Run the `.exe` installer
2. Follow the prompts — Clockwork installs to your user folder
3. Launch from the Start menu or desktop shortcut

---

## Logging in

When you open Clockwork for the first time you'll see the login screen:

```
┌────────────────────────────────┐
│ CLOCKWORK                      │
├────────────────────────────────┤
│                                │
│         Sign in                │
│   Use your Clockwork account   │
│                                │
│  ┌──────────────────────────┐  │
│  │  your@company.com        │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │  ••••••••                │  │
│  └──────────────────────────┘  │
│                                │
│  [ Sign in ]                   │
│                                │
└────────────────────────────────┘
```

1. Enter the **email address** your admin used to invite you
2. Enter the **password** your admin gave you (you should change this in your profile after first login)
3. Click **Sign in**

Once logged in, Clockwork remembers your session. On future launches you'll go straight to the tracker without logging in again — **except after an app update**, when you'll be asked to sign in once more (this is normal).

> **If sign-in fails:** check that Caps Lock is off, and that you're using the exact email address your admin registered for you. Contact your admin if the problem persists.

> **Set-password invites:** if your admin invited you without a temporary password, you'll receive an email with a **set-password link** (and links to download the app). Set your password there first, then sign in with it.

---

## Your first timer

After logging in you'll see the tracker screen:

```
┌────────────────────────────────┐
│ CLOCKWORK            Sign out  │
├────────────────────────────────┤
│          Your Name             │
│                                │
│  ┌──────────────────────────┐  │
│  │       00:00:00           │  │
│  │                          │  │
│  │        ○ Stopped         │  │
│  └──────────────────────────┘  │
│                                │
│  Project:                      │
│  ┌──────────────────────────┐  │
│  │  Select a project...  ▾  │  │
│  └──────────────────────────┘  │
│                                │
│  What are you working on?      │
│  ┌──────────────────────────┐  │
│  │                          │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │     Start tracking       │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

**To start tracking:**
1. (Optional) Pick a **project** from the dropdown — this helps your admin see where time is being spent
2. (Optional) Type a short **description** of what you're working on, e.g. *"Homepage design review"*
3. Click **Start tracking**

The timer starts counting and a green dot confirms it's running.

**To pause tracking (e.g. a short break):**
1. Click **Pause** — the timer turns amber and shows **Paused**
2. While paused, **no screenshots are taken and no activity is counted**, but your session stays open
3. Click **Resume** to continue the same session

Paused time is **not** counted toward your tracked hours, so you don't need to stop and start a new timer for breaks.

**To stop tracking:**
1. Click **Stop**
2. The timer stops **instantly** and your session is saved

Stopping is immediate — it never hangs while waiting on the network. The app stops locally right away and quietly syncs the finished session to the server in the background. Your time entry — including any screenshots taken during the session — is uploaded automatically.

---

## Daily workflow

A typical day looks like this:

```
Morning
  └─ Open Clockwork (it may already be running in your tray)
  └─ Select project + add a description
  └─ Click Start tracking
  └─ Work normally — Clockwork runs in the background

Lunch / breaks
  └─ Click Pause before stepping away
  └─ Click Resume when you return (same session continues)

Context-switching
  └─ Stop the current timer
  └─ Select the new project / description
  └─ Start a new timer

End of day
  └─ Click Stop
  └─ Clockwork minimizes to the system tray
     (your session data is already uploaded)
```

> **Tip:** Use **Pause** for breaks instead of Stop — paused time is excluded from your tracked hours and you keep the same session. Stop is for when you're done with a task entirely.

> **Important:** Only **one timer can run at a time.** If you try to start a second timer before stopping the first, you'll see a conflict error. Stop the running timer first.

---

## Screenshots and activity tracking

Every few minutes (your admin configures the interval — typically 10 minutes), Clockwork automatically:

1. **Captures every monitor you have connected** — if you have one screen, you get one image; if you have two screens, you get two images for that moment, and so on
2. **Saves each screen as a raw PNG** — no blur is applied. Managers see the actual screen content the same way Upwork's tracker does
3. **Calculates your activity percentage** — how active your keyboard and mouse were during that window
4. **Uploads the screenshots** to the team's secure server along with your activity data. Each image is tagged with which screen it came from (`Screen 1 of 2`, `Screen 2 of 2`, etc.)

### macOS permissions

On macOS, Clockwork needs two system permissions to work fully. The first time you start a timer, macOS may prompt you — or you can grant them ahead of time in **System Settings → Privacy & Security**:

- **Screen Recording** — required to capture screenshots. Without it, screenshots will be blank.
- **Accessibility** — required to count keyboard and mouse activity. Without it, your activity percentage will read 0% even while you work.

After granting either permission you may need to quit and reopen Clockwork. (Windows does not require these steps.)

### What the activity percentage means

| Level | What it signals |
|---|---|
| **70–100%** | Actively typing or using the mouse most of the minute |
| **40–69%** | Moderate activity — pauses are normal |
| **0–39%** | Low activity — possibly reading, thinking, or briefly stepped away |

A low activity percentage for one screenshot doesn't mean you weren't working. It simply reflects keyboard/mouse input, not thinking or reading.

### What your manager can see

- The **raw screenshot** from every monitor you had connected at the moment of capture
- The **time** the screenshot was taken
- Your **activity percentage** for that 10-minute window
- Per-minute keyboard and mouse event counts for each window
- Which screen each image came from (`Screen 1 of 2`, etc.)

### What your manager cannot see

- Anything that was on your screens **before you started the timer** or **after you stopped it**
- Specific keystrokes (Clockwork counts events, it does not log what you type)
- Any activity when no timer is running

---

## The system tray

Clockwork lives in your system tray (bottom-right on Windows, top-right on macOS) even when the window is closed.

```
macOS menu bar:   [🕐] ← Clockwork icon
Windows tray:     [...] → [🕐]
```

**Tray icon states:**
- **Default (no dot)** — no timer is running
- **Blinking green dot** — a timer is currently running. A small green dot blinks on the tray/menu-bar icon as a quick visual confirmation that tracking is live.

**Right-click the tray icon** to get the context menu:

```
  ● Tracking…          ← current status (read-only)
  ─────────────────
  Show Clockwork        ← bring the window back
  ─────────────────
  Quit
```

**Closing the window** does **not** stop your timer or quit the app — it just hides the window. Your timer keeps running. Use the tray menu to bring the window back.

To fully quit Clockwork, use **Quit** from the tray menu. This will also stop any running timer.

---

## Signing out

To sign out of the app:

1. Click the **Sign out** button in the top-right corner of the tracker screen
   — or —
2. Open the window, then click **Sign out**

Signing out clears your stored session. The next time you open Clockwork you'll need to log in again.

> **Note:** Signing out does **not** delete any of your time data. All recorded time entries and screenshots remain on the server.

---

## Getting app updates

Clockwork checks for updates automatically every time it launches. Updates are published to **GitHub Releases**, and the app pulls them down on its own. When a new version is available:

1. The update downloads silently in the background
2. A notification appears when it's ready
3. The app installs the update on the next restart

You don't need to do anything — updates are fully automatic. If you want the latest version immediately, quit and relaunch the app.

> **After an update, you'll be asked to sign in again.** This is expected — just log in with your usual credentials and your tracker is back to normal.

> **macOS note:** the Mac build is **Apple Silicon (arm64) only**. It runs on M1/M2/M3-and-later Macs. (Intel Macs are not currently supported.)

---

## FAQ

**Q: Do I need to be connected to the internet?**
A: Yes, for the timer to start and for screenshots to upload. If you lose internet mid-session, Clockwork will retry uploads automatically when the connection returns.

**Q: Will the app slow down my computer?**
A: Clockwork is lightweight — under 50 MB of RAM. Screenshot capture (every 10 minutes) briefly spikes CPU for less than a second per connected display while images are encoded and uploaded.

**Q: What happens if I forget to start the timer?**
A: Ask your admin to log a manual time entry through the admin portal. Clockwork itself only records time while the timer is running.

**Q: What happens if the app crashes mid-session?**
A: When you relaunch, Clockwork **reconciles with the server** — the server is the source of truth. If a session is still open server-side, the app picks it back up; if it was already closed, the app clears it. So relaunching is the fix for almost any session that looks stuck. (If anything still looks off, your admin can also force-stop the entry from the portal.)

**Q: Can I see my own time data?**
A: Currently only admins can view the full dashboard. Ask your admin for a summary of your tracked time.

**Q: My screenshots show very low activity even though I was working hard. Why?**
A: Activity is measured by keyboard and mouse events only. Extended periods of reading, watching a presentation, or participating in a video call will show low input activity — that's expected and normal.

**Q: How do I change my password?**
A: Contact your admin. They can update your account credentials from the admin portal.
