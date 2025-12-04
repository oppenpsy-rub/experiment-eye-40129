# Forschungsdaten-Analyseplattform

## Projektinfo

Dies ist die Desktop-Variante der Forschungsdaten-Analyseplattform.

## How can I edit this code?

There are several ways of editing your application.

**Lovable verwenden**

Besuche das [Lovable Projekt](https://lovable.dev/projects/ac64f6cb-be52-4675-a26a-350f7afe3e26) und starte mit Prompts.

**IDE lokal verwenden**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

Voraussetzung ist Node.js & npm – [Installation mit nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Starten Sie die Tauri-Entwicklung oder Electron-Variante.
npm run tauri:dev
# oder Electron:
npm run electron:dev
```

**Dateien direkt in GitHub bearbeiten**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**GitHub Codespaces verwenden**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Verwendete Technologien

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Deployment

Simply open [Lovable](https://lovable.dev/projects/ac64f6cb-be52-4675-a26a-350f7afe3e26) and click on Share -> Publish.

## Custom Domain

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Mehr dazu: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Desktop-Alternative: Electron

Falls die Tauri-WebView unter Windows blockiert (z. B. Policies oder Runtime-Probleme), steht eine Electron-Variante bereit, die ausschließlich die gebauten, lokalen `dist`-Assets lädt und ohne Dev-Server funktioniert.

- Frontend-Assets bauen: `npm run build`
- Electron lokal starten: `npm run electron:dev`
- Windows Portable-EXE erstellen: `npm run electron:build:win`
- macOS DMG erstellen (ein Architekturziel): `npm run electron:build:mac`
- macOS Universal-Build (DMG & ZIP, x64+arm64): `npm run electron:build:mac:universal`

Hinweise:
- Für macOS-Builds ist ein macOS-System erforderlich (Code Signing optional, empfohlen für Verteilen).
- Universal-Build erfordert einen macOS-Host; auf Windows nicht möglich.
- Ohne Signierung kann Gatekeeper blockieren – App öffnen via Rechtsklick → Öffnen.
- Die Electron-App lädt `dist/index.html` direkt via `file://`, somit sind keine Netzwerkverbindungen nötig.

### macOS Universal-Build via GitHub Actions (ohne eigenen Mac)

Wenn du keinen Mac zur Verfügung hast, kannst du den Build in GitHub ausführen:

1. Stelle sicher, dass dein Repo in GitHub liegt und die Workflow-Datei vorhanden ist: `.github/workflows/macos-electron-build.yml`.
2. Öffne dein Repository in GitHub → `Actions` → Workflow "macOS Universal Electron Build".
3. Klicke auf `Run workflow`.
4. Nach Abschluss findest du die Artefakte unter dem jeweiligen Workflow-Lauf:
   - `macos-universal-dmg` (DMG)
   - `macos-universal-zip` (ZIP mit `.app`)

Verteilen:
- DMG: per Doppelklick öffnen, App ins `Programme`-Verzeichnis ziehen.
- ZIP: entpacken und `Forschungsdaten-Analyseplattform.app` direkt starten.

Hinweis zu Gatekeeper:
- Unsigned/Unnotarized Apps: Rechtsklick → Öffnen (einmalig bestätigen).
- Für breite Verteilung empfiehlt sich Signierung & Notarisierung (Apple Developer).
