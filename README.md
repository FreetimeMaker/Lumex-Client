# Lumex Client

Lumex Client is a lightweight Minecraft Java launcher/client foundation for **Windows** and **Linux**, with Linux intended to work cleanly as a **Flatpak**.

The launcher uses **Neutralinojs + HTML/CSS/JavaScript** instead of Electron or Rust. The in-game client is a separate **Fabric** mod because Minecraft itself runs on Java.

## Current v0.1 foundation

- Neutralinojs launcher shell
- Lumex Home / Play / Instances / Mods / Settings screens
- Persistent launcher settings
- Platform-aware Windows, Linux and Flatpak data paths
- Java detection
- Instance creation/selection
- Minecraft launch service abstraction
- Flatpak manifest and desktop metadata
- Fabric client module foundation
- Initial modules: FPS, Coordinates, CPS, Ping, Keystrokes, Zoom and Toggle Sprint

The launcher intentionally does **not** fake Microsoft/Minecraft authentication or version installation. The next step is to add the official Microsoft login flow plus a verified Minecraft/Fabric installer that downloads version metadata, libraries, assets and the Lumex Fabric mod before generating the launch command.

## Project structure

```text
Lumex-Client/
├── resources/
│   ├── index.html
│   ├── css/main.css
│   └── js/
│       ├── app.js
│       ├── router.js
│       ├── settings.js
│       ├── java.js
│       ├── instances.js
│       └── minecraft.js
├── client/
│   └── Fabric client mod
├── flatpak/
│   ├── com.freetime.lumexclient.yml
│   ├── com.freetime.lumexclient.desktop
│   └── com.freetime.lumexclient.metainfo.xml
└── neutralino.config.json
```

## Launcher development

Install Node.js only for the Neutralino CLI tooling, then install the CLI:

```bash
npm install -g @neutralinojs/neu
```

From the repository root:

```bash
neu update
neu run
```

`neu update` downloads the Neutralino binaries/client library configured by `neutralino.config.json`.

## Build launcher binaries

```bash
neu build
```

Neutralino places generated targets in `dist/`.

## Fabric client

The Fabric client targets Minecraft 1.21.1 / Java 21 in the initial foundation.

From `client/`:

```bash
./gradlew build
```

On Windows:

```powershell
.\gradlew.bat build
```

The built mod is written under `client/build/libs/`.

## Linux / Flatpak

The Flatpak application ID is:

```text
com.freetime.lumexclient
```

The initial manifest grants only the launcher/game permissions expected for this architecture:

- network
- IPC
- Wayland
- fallback X11
- PulseAudio
- DRI/GPU access

The Flatpak launcher data directory resolves to:

```text
~/.var/app/com.freetime.lumexclient/data/lumex-client/
```

Before producing a distributable Flatpak, build the Linux Neutralino binary and place the launcher binary where the manifest expects it under `bin/lumex-client`, or update the manifest to the final CI output path.

Example local build flow:

```bash
neu update
neu build
flatpak-builder --user --install --force-clean build-dir flatpak/com.freetime.lumexclient.yml
```

## Windows data directory

Lumex stores launcher-managed data under `%APPDATA%/LumexClient` by default.

## Linux data directory

Outside Flatpak, Lumex uses `$XDG_DATA_HOME/lumex-client` or falls back to `~/.local/share/lumex-client`.

## Planned next steps

1. Microsoft OAuth / Minecraft Services authentication
2. Official Minecraft version manifest downloader
3. Assets and library downloader with hash verification
4. Fabric Loader installation
5. Launcher-managed Java runtimes
6. Actual Minecraft launch argument generation
7. In-game Lumex menu and functional HUD rendering
8. Mod/profile management
9. Launcher and client self-update flow

## License

See [LICENSE](LICENSE).
