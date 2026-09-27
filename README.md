# Jet Arena

Jetpack arena deathmatch that runs in a browser. Play solo against bots, fight
endless Survival waves, or **play with friends over a phone hotspot** — no
accounts, no internet, nothing to install.

The whole game is a **single HTML file**. The LAN server is **one Node file with
zero dependencies** — no `npm install`, anywhere.

```bash
# solo: just open it
index.html

# with friends on the same Wi-Fi / hotspot
node server.js          # or double-click play.bat on Windows
# -> prints  http://192.168.x.x:8123  — friends open that in any browser
```

## Highlights

- **Four arenas** with their own layout, hazards and look — a scrapyard, a
  foundry with a molten floor and moving platforms, a low-gravity orbital
  station with no floor and side portals, and a tight reactor with lava pits.
  Win one to unlock the next.
- **LAN multiplayer over a hotspot.** One player hosts, everyone else joins from
  a browser. Pilots keep their own name and colour.
- **Survival mode** — endless waves that grow in size and skill.
- **7 weapons** from fixed spawns, grenades, melee, power-ups, airdrops.
- **Installable** as an app (PWA) and playable offline.
- **Canvas 2D graphics** with dynamic lighting, bloom, per-arena materials and
  weather, and a quality level that tunes itself to hold 60fps.
- Works with **keyboard + mouse or touch** — on-screen dual sticks on phones.

## How the multiplayer works

Host-authoritative, relayed through the little Node server:

- The **host's browser runs the entire game world** — physics, bots, pickups.
- **Guests send only their input** (~30/s) and receive **world snapshots**
  (~20/s). They predict their own movement locally so controls feel instant,
  and interpolate everyone else between snapshots.
- The server is a **relay plus a lobby**: it assigns roles, forwards input up
  and snapshots down, and never simulates anything.
- `server.js` speaks WebSocket **by hand** — the HTTP upgrade handshake, the
  SHA-1 accept key, and frame encode/decode/masking are all implemented inline,
  which is why the project has no dependencies.

Roles are explicit (HOST / JOIN); nobody is made host behind their back, and if
the host leaves, everyone is returned to the menu rather than silently promoted.

## Project layout

```
index.html            the entire game: engine, renderer, netcode, UI
server.js             static file server + hand-rolled WebSocket relay
play.bat              Windows launcher (starts the server, opens the browser)
sw.js                 service worker, for offline play once installed
manifest.webmanifest  PWA manifest
icons/                app icons
```

## Android app (APK)

[`android/`](android) is a complete Android Studio project that wraps the game
in a full-screen WebView, with the whole game bundled inside the app — so it
runs with **no internet and no server** for solo play and Survival.

Open that folder in Android Studio → **Build → Build APK(s)** → share
`app-debug.apk` with your friends. Full steps: [android/README.md](android/README.md).

For playing together, one computer still runs `node server.js`; in the app each
player taps **SERVER**, types that computer's address, then **JOIN LAN**.

## Play solo

Double-click `index.html`. That's it.

## Pick your pilot

At the top of the menu: tap your name to rename yourself (up to 10 letters)
and tap a colour swatch. Bots always wear the colours nobody picked, so in a
fight you can tell a friend from a bot at a glance. Your pilot is remembered.

## Play with friends on a hotspot

1. **Turn on your phone's hotspot** (or any Wi-Fi) and connect your laptop to it.
2. Double-click **`play.bat`** on the laptop. Keep that window open — closing it
   stops the game server. (Or from a terminal: `node server.js`)
3. The window prints something like:

   ```
   for your friends: http://192.168.43.12:8123   (Wi-Fi)
   ```

4. **Friends connect to the same hotspot** and open that address in any browser.
5. **One person picks HOST LAN, everyone else picks JOIN LAN.** The host sees
   everyone's name appear in the lobby, picks the arena and mode, and presses
   START MATCH. Everyone drops in together.

**The host should keep the game in front:** if their phone switches apps or
their tab goes to the background, the browser pauses the game for everyone.

## Make it feel like an app

- **Fullscreen** — the `FULLSCREEN` button on the menu, or `[ ]` above the move
  stick in a match. On Android it also locks to landscape.
- **Install it** (on the laptop running the server) — open
  `http://localhost:8123`, then use the `INSTALL APP` button on the menu or the
  install icon in Chrome/Edge's address bar. It gets its own icon and window,
  and **keeps working with no server running** (solo play).
- **Friends' phones** can use *Add to Home Screen* for an icon. Browsers only
  allow a full offline install from `localhost` or `https`, so over the hotspot
  address it opens in the browser — fullscreen still works.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | `A` / `D` | left stick |
| Fly (jetpack) | hold `W` or `SPACE` | push left stick up |
| Aim | mouse | right stick |
| Fire | left click | push right stick out |
| Grenade | `G` | NADE |
| Reload | `R` | RELD |
| Melee | `F` | HIT |
| Pause | `P` / `ESC` | `II` (host / solo only) |
| Fullscreen | — | `[ ]` |
| Mute all | `M` | — |
| Music on/off | `N` | `MUSIC` on the menu |

Menu: `←` `→` pick arena, `↑` `↓` switch Deathmatch / Survival, `1` `2` `3` set
bot skill.

## Know the map — that's how you win

Nothing is random. Every weapon and power-up always spawns in the same place,
so learning the layout and timing the respawns wins more games than aim alone.

- **Power weapons** (rocket, railgun, minigun) glow **gold** and sit on the
  riskiest spots — the highest perches, over the lava, next to the void. They
  take **30s** to come back, and the game announces when one is up.
- **Snipers** sit on long sightlines, **shotguns** in cramped brawl zones
  (15s). **SMGs** wait by the low spawns (8s).
- **Health** is on the side escape routes; **shield** holds the contested centre.
- A taken item leaves a dashed outline with a **countdown**, so you can be there
  when it returns. The **minimap** marks power weapons (gold diamonds) and
  power-ups (coloured squares) — dim while respawning.
- You never lose a better gun by walking over a basic crate, and a full-ammo
  duplicate is left for later instead of wasted.
- Bots know this too: they'll detour for power weapons, so holding those spots
  is a fight.

Music is **off by default** — turn it on with the `MUSIC` button or `N`.

## Reading a fight

- **Red wedges** around you point at whoever is hitting you — in a busy
  five-way fight that's usually the difference between dying and turning round.
- **When you go down** the camera follows your killer until you respawn, and
  the banner names them and shows the health they have left.
- **First match only:** short control hints appear for a few seconds, worded
  for touch or keyboard depending on the device.

## What's in it

- **4 arenas**, each with its own music key and tempo. Win one to unlock the next.
- **Survival mode** — endless waves, 3 lives, best wave saved per arena.
- **7 weapons** from crates: pistol, SMG, shotgun, sniper, rocket, minigun and a
  piercing railgun. Plus grenades and a melee strike.
- **Power-ups** — shield, double damage, speed, infinite jet fuel.
- **Airdrops** at a 3-kill streak.
- Graphics quality adjusts itself (LOW / MEDIUM / HIGH) to hold 60fps.

## Troubleshooting

- **Page won't load** — the server isn't running. Start `play.bat` and keep its
  window open.
- **Friends can't reach the address** — they must be on the *same* hotspot/Wi-Fi.
  If it still fails, Windows Firewall is likely blocking Node: allow it on
  *private* networks when prompted, or run
  `netsh advfirewall firewall add rule name="Jet Arena" dir=in action=allow protocol=TCP localport=8123`
  from an admin terminal.
- **"Someone is already hosting"** — only one host per server; pick JOIN LAN.
- **Port already in use** — run `node server.js 9000` and share that port instead.
- **`node` is not recognised** — install Node.js from nodejs.org, or just play
  solo by opening `index.html`.

## Requirements

- A modern browser (Chrome, Edge, Firefox, Safari) for playing.
- **Node.js** only if you want LAN multiplayer.

## Licence

MIT — see [LICENSE](LICENSE).
