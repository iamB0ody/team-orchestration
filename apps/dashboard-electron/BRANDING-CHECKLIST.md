# Electron De-Branding Checklist

**Target:** remove every trace of default Electron branding from the packaged app. User sees "tot" everywhere. This document is the spec for **wave 5** (Electron shell + IPC) and **wave 7** (packaging via electron-builder). Every line here must be verified at the commit gate.

## Product identity

| Token | Value |
|-------|-------|
| Product name | **tot** |
| Full name | **tot — team orchestration** |
| App ID (reverse-DNS) | **`com.iamB0ody.tot`** |
| Bundle identifier (macOS) | **`com.iamB0ody.tot`** |
| AppUserModelId (Windows) | **`com.iamB0ody.tot`** |
| Repository | `github.com/iamB0ody/team-orchestration` |
| License | MIT |
| Copyright | `© 2026 Abdelrahman Ahmed` |

---

## Wave 5 — main process + runtime branding

Every item MUST be implemented + verified. Do not ship wave 5 until all 19 items pass.

### App identity

- [ ] `app.setName("tot")` called **before** any `app.getName()` use.
- [ ] `app.setAppUserModelId("com.iamB0ody.tot")` on Windows (notification grouping + taskbar icon).
- [ ] `app.setAboutPanelOptions({ applicationName, applicationVersion, version, copyright, credits, website, authors, iconPath })` — all fields populated from `package.json`. On macOS this replaces the "About Electron" menu item.

### User-data paths

- [ ] `app.setPath("userData", path.join(app.getPath("appData"), "tot"))` — default is `Electron/` which leaks branding into `~/Library/Application Support/`. Override BEFORE the app emits `ready`.
- [ ] `app.setPath("sessionData", …/tot/session)` — same reason.
- [ ] `app.setPath("logs", …/tot/logs)` — macOS `~/Library/Logs/tot/`.
- [ ] Crash reporter dir (if enabled) points at `…/tot/crashes`.

### Window

- [ ] `BrowserWindow({ title: "tot", ... })` — explicit title, never empty (renderer-set titles via `<title>` override).
- [ ] `backgroundColor: "#000000"` — no white flash before first paint (matches `--bg-0`).
- [ ] `icon: path.join(__dirname, "../icons/icon.png")` — Linux/Windows icon.
- [ ] `titleBarStyle: "hiddenInset"` (macOS) — keep traffic-light controls, drop the default title bar.
- [ ] `vibrancy` or transparent regions NOT enabled — we're opaque black by design.
- [ ] Default window dimensions: 1440×900, min 1024×680. Remember via `electron-window-state`.

### Menu bar

- [ ] Default Electron menu replaced entirely via `Menu.setApplicationMenu(Menu.buildFromTemplate([...]))`.
- [ ] App menu (first-item on macOS): "About tot", "Preferences…" (stub), separator, "Hide tot", "Hide Others", "Show All", separator, "Quit tot".
- [ ] Edit menu: Cut / Copy / Paste / Select All (standard bindings — we're a read-only app but these work for text selection).
- [ ] View menu: Reload (dev only), Toggle Fullscreen, Toggle Scanlines (writes to localStorage).
- [ ] Window menu: Minimize, Close.
- [ ] Help menu: "Learn more" (→ repo URL), "Report an issue" (→ issues URL), separator, "View License".
- [ ] NO "Electron" top-level menu. NO default "Hide Electron" / "Quit Electron" strings anywhere.

### Dock / taskbar

- [ ] macOS dock icon: `app.dock.setIcon(nativeImage.createFromPath(…/icon.png))` — reads from the icns bundle.
- [ ] macOS dock badge (future): unset for now; available via `app.dock.setBadge()` for live-mission count later.
- [ ] macOS dock menu stub: "Open Dashboard" (shows main window), "Quit tot".

### Protocol / URL handling

- [ ] `app.setAsDefaultProtocolClient("tot")` — optional, enables `tot://mission/0029` deep links later.

### Renderer-side title

- [ ] `<title>tot — team orchestration</title>` in `apps/dashboard/src/index.html` (done).
- [ ] Per-route dynamic title via `Title` service + router `title` resolvers: `"tot · workspaces"`, `"tot · <slug>"`, etc. (partial — already in `app.routes.ts`; extend when drill-down route lands).

### Dev-tools / console

- [ ] `webPreferences.devTools` = true in dev, false in production build (`process.env.NODE_ENV === "production"`).
- [ ] In production: `Menu.setApplicationMenu(...)` strips the "Toggle Developer Tools" item.

### IPC surface (scoped — not just de-branding, but relevant to this checklist)

- [ ] `contextBridge.exposeInMainWorld("api", …)` — no `ipcRenderer` leaks to renderer.
- [ ] Preload script writes a version marker: `window.api.version = "0.0.1"` so renderer knows it's running under Electron (vs dev browser).

---

## Wave 7 — electron-builder packaging

```jsonc
// apps/dashboard-electron/electron-builder.json (spec — write in wave 7)
{
  "appId": "com.iamB0ody.tot",
  "productName": "tot",
  "copyright": "© 2026 Abdelrahman Ahmed",
  "artifactName": "tot-${version}-${os}-${arch}.${ext}",

  "directories": {
    "buildResources": "icons",
    "output": "release"
  },

  "mac": {
    "category": "public.app-category.developer-tools",
    "target": [
      { "target": "dmg", "arch": ["arm64", "x64"] },
      { "target": "zip", "arch": ["arm64", "x64"] }
    ],
    "icon": "icons/mac/icon.icns",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist"
  },

  "dmg": {
    "title": "tot",
    "icon": "icons/mac/icon.icns",
    "background": "icons/mac/dmg-bg.png",
    "contents": [
      { "x": 130, "y": 220, "type": "file" },
      { "x": 410, "y": 220, "type": "link", "path": "/Applications" }
    ],
    "window": { "width": 540, "height": 380 }
  },

  "win": {
    "target": [
      { "target": "nsis", "arch": ["x64"] },
      { "target": "portable", "arch": ["x64"] }
    ],
    "icon": "icons/win/icon.ico",
    "publisherName": "Abdelrahman Ahmed"
  },

  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "installerIcon": "icons/win/icon.ico",
    "uninstallerIcon": "icons/win/icon.ico",
    "installerHeaderIcon": "icons/win/icon.ico",
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "tot"
  },

  "linux": {
    "category": "Development",
    "target": [
      { "target": "AppImage", "arch": ["x64", "arm64"] },
      { "target": "deb", "arch": ["x64", "arm64"] }
    ],
    "icon": "icons/linux",
    "maintainer": "Abdelrahman Ahmed <abdelrahman.ui@gmail.com>",
    "desktop": {
      "Name": "tot",
      "GenericName": "Team Orchestration Dashboard",
      "Comment": "Read-only multi-workspace mission dashboard",
      "Categories": "Development;IDE;"
    }
  },

  "publish": [
    { "provider": "github", "owner": "iamB0ody", "repo": "team-orchestration" }
  ]
}
```

### Icon asset pipeline

- [ ] `icons/icon.svg` — master (✅ landed this mission)
- [ ] `icons/mac/icon.icns` — generated at package time (or pre-committed)
- [ ] `icons/mac/dmg-bg.png` — custom DMG background (640×380, hacker-theme); deferred
- [ ] `icons/win/icon.ico` — multi-size ICO
- [ ] `icons/linux/16.png`, `32.png`, `64.png`, `128.png`, `256.png`, `512.png`

### Verification at wave-7 commit gate

- [ ] Packaged `.dmg` opened: window title is "tot", traffic lights visible, background applied, no "Electron" anywhere in Finder metadata.
- [ ] `mdls tot.app | grep kMDItemCFBundle` on macOS: identifier is `com.iamB0ody.tot`, display name is `tot`.
- [ ] Linux `.AppImage` launched: window icon is the λ, title is `tot`, no GTK branding leak.
- [ ] Windows `.exe` installer: icon is λ, publisher string is "Abdelrahman Ahmed", install dir defaults to `%LOCALAPPDATA%\Programs\tot\`.
- [ ] `~/Library/Application Support/` on macOS shows **`tot/`** folder, NOT `Electron/`.
- [ ] DevTools menu absent in production build.
- [ ] `app.getName()` returns `"tot"` when printed from main process.

---

## Why this document exists

Electron's defaults are a branding landmine — every app that doesn't override them ships as "Electron" in menus, the About dialog, user-data paths, window titles, crash reporter, update checks, task manager, and platform-specific registries. The user explicitly required "fully sure" de-branding; this checklist makes that verifiable.

Wave 5's commit gate references every item here. If any unchecked line remains, the commit is blocked.
