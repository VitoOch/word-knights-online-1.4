Word Knights V7 - new deployment package

Changes: fixes shield image URLs on the server, restores compact knight-selection layout, hides setup Back button during and after matches.

Create a NEW GitHub repository and connect it as a NEW Render Blueprint/Web Service. Do not replace your old repository.

# WORD KNIGHTS — Multiplayer Release Candidate

A fast two-knight word-typing duel with direction-based sword attacks, shield blocks, interruptions, three arenas, and a first-to-two-wins tournament. It includes a genuine two-player live WebSocket room server and a separate offline-versus-AI mode.

## Open the game

- **Offline:** Open `index.html` in a desktop browser. Click Play > Play Offline. Keep the `assets` folder with `index.html` to display the four shields; the Woods background itself is embedded in the HTML.
- **Online:** Publish this project as a Node web service using the steps in `DEPLOY.md`. Two people visit the same public URL, create/join a room, then each choose a knight.
- **Start locally (optional):** Install Node 20+, run `npm start`, and visit `http://localhost:3000`.
- **Tests (optional):** `npm test`.

## Game rules

- Press **A**, **W**, **D**, or use the mouse to switch the sword angle.
- Type the displayed word correctly to strike. Mistypes rotate the word.
- Match the incoming attack direction and press **Space** to block for two seconds; guard cooldown is five seconds.
- A successful strike interrupts the opponent's unfinished word/attack.
- The first knight to win **two rounds** takes the match. Players can select Ivory Warden, Obsidian Knight, Amethyst Reaver, or Rose Sentinel.
- **Escape** pauses only in offline mode, for up to 10 seconds. Live matches are not pausable.

## Architecture

One Node.js process serves the UI and handles real-time WebSocket actions. The server validates typed letters, damage, guards, interruptions, score, and room size. There is no separate client-only multiplayer simulation. One public URL hosts both the site and websocket endpoint.

**Limits:** Rooms are in memory and have no reconnect/resume across server restarts. Use a single Render instance for this release. The public link must be deployed separately; opening the local HTML file can play offline but cannot create an internet-accessible server.

## Shields in V8
The four shield images are actual PNGs embedded directly in index.html for reliable standalone preview and online play. Individual optimized copies also live in assets/.

## V9 improvements

- Knight selection heading now stays centered at narrower screen widths and browser zoom levels.
- Reuses static opponent armor and blade gradients between animation frames to lower canvas allocation costs without reducing rendering detail.
- Avoids a redundant full-screen canvas clear before drawing the opaque cached environment.

## Audio & combat visibility (V10)
Sound is generated locally using the browser's Web Audio API. Click Play to enable. Use the small music-note icon to adjust volume or mute. No typing audio. The opponent displays the shield of its selected knight and raises it to guard.
