# StreamFX Toolbox

Transparent overlay effects for Twitch streams, driven by URLs.

- `/` is the control panel: pick an effect, tweak it, preview it and copy its URL.
- `/overlay/<effect>?param=value` is the page to load in an OBS or Streamlabs Browser source. Its background is transparent.
- `/queue` is a Browser source that plays queued effects one after another.
- `/add/<effect>?param=value` queues an effect when the page is opened.

The app is a static export with no server, so it can be hosted on GitHub Pages.

## Run

```bash
npm run dev
```

Then open http://localhost:3000.

## Effects

| Effect      | URL                  | Example                                                  |
| ----------- | -------------------- | -------------------------------------------------------- |
| Fireworks   | `/overlay/fireworks` | `?mode=burst&count=12&interval=2&hueMin=260&hueMax=320`  |
| Confetti    | `/overlay/confetti`  | `?mode=rain&palette=gold`                                |
| Glitch      | `/overlay/glitch`    | `?text=LIVE&interval=3&intensity=7`                      |
| Matrix rain | `/overlay/matrix`    | `?color=ff3366&charset=binary`                           |
| Emoji rain  | `/overlay/emojirain` | `?emojis=💜&direction=up`                                |
| Snow        | `/overlay/snow`      | `?count=300&wind=2`                                      |
| Sacrifice   | `/overlay/sacrifice` | `?name=Bob&scene=volcano` (`cliff`, `volcano`, `ufo`, `anvil`, `lightning`, `cannon`, `trapdoor`, `shark`; random if left out) |
| Christmas lights | `/overlay/lights` | `?layout=frame&pattern=chase&colors=warm` |
| Message banner | `/overlay/message` | `?text=New%20follower!&banner=ribbon&enter=zoom&letters=wave` |

Parameters left out of the URL use their defaults. The control panel lists every parameter of the selected effect.

## Queue

1. Add a Browser source in OBS with the `/queue` URL, sized to the canvas. It shows nothing while the queue is empty.
2. Have your bot open an add URL, for example `/add/fireworks?mode=burst&count=12`. The control panel builds these URLs.

The queue is kept in the browser's localStorage. The add URL therefore has to be **opened as a page in the same browser as the `/queue` source**: for OBS, in another OBS Browser source or dock (for example a bot action that sets a Browser source's URL). A request made from somewhere else, such as a bot's server fetching the URL, does not run the page and queues nothing.

- An effect left at "run forever" plays for 10 seconds in the queue; set `duration` to change that. Single bursts end on their own after about 5 seconds.
- Queued effects not played within 10 minutes are dropped.

## Sounds

Every effect has a `sound` parameter that picks a file from `public/sounds`, and a `volume`.

- To add a sound, drop the file into `public/sounds` (wav, mp3, ogg, flac, m4a or webm; browsers cannot play AIFF). Its id is the file name in lower case with dashes, without the Freesound number and uploader prefix: `26349__streety__partypopper.flac` becomes `partypopper`.
- The list is rebuilt when `npm run dev` or `npm run build` starts. If the dev server is already running, run `npm run sounds`.
- `sound=none` turns an effect's sound off.
- Browsers only play sound after the page has been clicked; OBS browser sources always play it.

Check the licence of every file you add before publishing the site, since everything in `public/sounds` is redistributed with it.

## Deploy to GitHub Pages

`.github/workflows/deploy.yml` builds the static site and publishes it on every push to `main`. In the repository settings, set Pages > Source to "GitHub Actions". The site is then at `https://<user>.github.io/<repository>/`; the workflow sets the base path from the repository name.

## Add an effect

1. Create `effects/<id>/definition.ts` exporting an `EffectDefinition` (id, name, description and the list of params).
2. Create the client component in `effects/<id>/` that draws it. It receives the parsed `params`. For a canvas effect, `runCanvas` in `effects/canvas.ts` handles sizing, the animation loop and the `duration` fade-out.
3. Add the definition to `effects/registry.ts` and the component to `effects/components.tsx`.

The control panel builds its controls, the URL and the parameter table from the definition, so no panel changes are needed.
