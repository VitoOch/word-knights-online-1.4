# Word Knights Online V7 — fresh publication guide

Word Knights has a built-in Node.js WebSocket server. Publish it as a **Web Service**, not as a static HTML-only site. You do **not** need to buy a domain, configure an API key, or run a separate database for this release.

## Publish with GitHub + Render (recommended)

1. **Download and unzip** the complete Word Knights release ZIP.
2. Go to https://github.com/new and create a repository, e.g. `word-knights-new` (public or private).
3. In the new empty repository, select **uploading an existing file** (or **Add file > Upload files**). Drag the **contents** of the extracted Word Knights folder into GitHub, **not the ZIP and not the outer folder**. Confirm these files are at the root of the repository: `index.html`, `server.js`, `package.json`, `render.yaml`, `assets/woods.webp`, **all four `assets/shield-*.webp` files**, and `tests/server.test.js`. Click **Commit changes**.
4. Sign into https://dashboard.render.com/ and authorize access to your GitHub repository if asked.
5. Click **New > Blueprint**, choose your repository, and keep the default `render.yaml` blueprint path. Click **Deploy Blueprint**. Review the proposed **Web Service** and available pricing. The included `render.yaml` requests a Free plan; if your account does not offer it, choose a supported plan before approving. 
6. Wait until Render shows the service **Live**, then open its assigned HTTPS URL (typically `https://<service-name>.onrender.com`). If you prefer **New > Web Service**, choose Node, use build command `npm install --omit=dev`, start command `npm start`, and health check `/health`.
7. In the published game: **PLAY > PLAY ONLINE > CREATE ROOM**. Enter your name, create a room, and share the code/invite link. Your friend opens the same public URL on another device, chooses **PLAY ONLINE > JOIN ROOM**, enters their name and the code. Both select a knight and the match begins when both are ready.
8. Before submitting to the competition, verify the public link loads in an incognito/private browser window and two different devices can enter the same room. Submit that exact Render HTTPS link.

## Offline mode

Double-click `index.html` to play against the AI, keeping the `assets` folder alongside it so the four knight shield pictures load. The Woods background is embedded in the HTML.

## Notes

- Render Free Web Services may sleep after inactivity and need time to wake. The first visit may take longer. Rooms exist **in memory**: if Render redeploys, restarts or sleeps, an ongoing match ends and the players must create a fresh room.
- **Only two live players** may join a room. A third person receives a room-full error. There are no spectator slots.
- `npm test` runs the server's room, typing, damage, and interruption checks. It is optional for publishing.
- A static Netlify ZIP upload alone cannot run this WebSocket matchmaking server; deploy the Node service to a host with long-running WebSocket support.
- Publishing requires access to your GitHub and hosting accounts. This downloaded release is **not yet a public URL**.

## Final checks for this release

- The Woods preview on the rules screen uses the same embedded artwork as the actual Woods arena.
- All title/mode/create/join back buttons are usable; the card decorations do not intercept clicks.
- Use the entire repository with the Node `server.js` (do not publish as a static site).

## V7 release notes

- The title screen and knight selection use four distinct shield images served through approved `/assets/shield-*.webp` paths.
- The setup Back button is hidden when a round starts and after round results.
- Selection cards are compact and contain one small shield each.
- `render.yaml` names the **new** service `word-knights-online-v7`, so a new Blueprint creates a separate service.
