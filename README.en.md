<div align="center">

# Learning House

**Turn that folder of downloaded course files into a place where you actually take lessons.**

[![Release](https://img.shields.io/github/v/release/HsiaoKang/learning-house)](https://github.com/HsiaoKang/learning-house/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/HsiaoKang/learning-house/total)](https://github.com/HsiaoKang/learning-house/releases)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)

[中文](README.md)

</div>

Bought a video course and ended up with a messy folder of files? Learning House turns the whole
folder into a structured course: videos, sheet music and backing tracks matched to each lesson,
all in one screen — watch, read the score, practice with the metronome, and track your progress.

Desktop app for macOS / Windows / Linux. **Local-first: your courses and learning data never leave your device.**

<!-- Screenshot placeholder: library page (course cards with progress) -->
<!-- Screenshot placeholder: classroom page (video + score + metronome) -->

## What it does

### Folder in, course out
- Point it at a course folder and it organizes itself: 81 numbered videos plus dozens of
  materials become 81 lessons, with each score and backing track attached to the right one
- Recognizes the common ways downloaded courses are packaged — the lesson count always matches
  your video count, nothing missing, nothing invented
- Unusual structure? Built-in **AI-assisted organizing**: generate a prompt, paste it to any AI
  (ChatGPT, Claude, …), paste the JSON reply back — done, and nothing is ever uploaded
- **Lesson manager** for the last mile: rename, reorder, add or remove lessons, move or copy
  resources between them (several lessons can share the same score or backing track)
- Missing a score mid-lesson? **Attach any file from the course** to the current lesson on the
  spot (e.g. a review lesson referencing the previous lesson's sheet and backing track)

### Study in one screen
- Video on one side, score on the other (swappable, resizable), multi-part video tabs,
  playback speed control, resumes where you left off
- Scores: images, PDF, and Guitar Pro tabs (standard notation + tablature)
- Backing track bar: switch, loop, speed, independent volume
- Space to play/pause, arrow keys to seek and adjust volume — hotkeys follow whichever area
  you touched last (video / backing track / metronome)

### A metronome that reads music
- **Auto tempo detection**: flip on "follow backing track" and it's ready — trusts the tempo
  written in the file name first, then the ♩=N printed on the lesson's score (cross-checked
  against the audio to reject unrelated scores), and only then falls back to audio analysis
- **TAP to calibrate**: if detection is off, tap along a few beats and it snaps to the exact
  value — you decide the feel, it nails the number
- Calibration is **remembered per audio file**: fix it once, it stays fixed
- Follows the backing track: starts and stops with playback, stays aligned through seeks and
  speed changes (slow practice slows the click too), first-beat offset supported
- Per-beat accents: strong / medium / weak / mute — taller bar, louder click

### Data travels with the course
- Progress and lesson structure are stored inside the course folder itself — switch machines,
  reinstall, or share the folder, and everything comes along
- Built-in auto-update: install once, never download manually again

## Install

Grab the installer from [Releases](https://github.com/HsiaoKang/learning-house/releases/latest):

| Platform | File | Note |
|---|---|---|
| macOS (Apple Silicon) | `*_aarch64.dmg` | See first-launch note below |
| macOS (Intel) | `*_x64.dmg` | Same as above |
| Windows | `*_x64-setup.exe` | Click "More info → Run anyway" if SmartScreen appears |
| Linux | `*.AppImage` / `*.deb` | |

**First launch on macOS**: builds are not notarized yet (indie project, saving the $99/year).
If macOS reports the app as damaged, run once in Terminal:

```bash
xattr -cr "/Applications/Learning House.app"
```

## How should I organize my course folder?

Usually **you don't need to** — import and let auto-detection do the work. When you want exact
control, the app persists the lesson structure as a manifest inside the course folder
(`.learninghouse/manifest.json`); AI organizing and the lesson manager write here too, and it
migrates with the folder:

```json
{
  "name": "Course name",
  "lessons": [
    { "name": "01 First lesson", "resources": ["1-intro.mp4", "materials/score.pdf", "materials/backing.mp3"] }
  ]
}
```

## Feedback

- Hit the **feedback button** in the app's top bar (version and system info pre-filled;
  email option available, no account needed)
- [Open an Issue](https://github.com/HsiaoKang/learning-house/issues/new/choose) (bug report / feature request templates)
- [Discussions](https://github.com/HsiaoKang/learning-house/discussions) for ideas and feature voting

## Roadmap

- [ ] A/B section looping (a practice essential)
- [ ] Import courses directly from cloud drives
- [ ] More practice tools: tuner, recording comparison
- [ ] Detachable panels as separate windows

Want something? Vote or propose it in [Discussions](https://github.com/HsiaoKang/learning-house/discussions).

## Known limitations

- Media decoding relies on the system webview — mkv / avi are not supported
  (mp4 / mov / webm / mp3 / wav / flac and other common formats work)
- Guitar Pro scores are rendered for reading; no synthesized playback

## Development & contributing

**Contribution policy**: the project iterates fast; bug reports and ideas via
[Issues](https://github.com/HsiaoKang/learning-house/issues) and
[Discussions](https://github.com/HsiaoKang/learning-house/discussions) are very welcome, but
**code PRs are not accepted for now** (to keep iteration speed and licensing flexibility).
Open a Discussion first if you'd like to get involved.

Build it yourself (toolchain and tasks are both managed by [mise](https://mise.jdx.dev/)):

```bash
mise install         # toolchain
pnpm install         # dependencies
mise run dev         # dev mode (Vite + Tauri)
mise run build       # build installers
mise run typecheck   # typecheck all packages
mise tasks           # list all tasks (incl. offline regression tools)
```

Releases: commits follow [Conventional Commits](https://www.conventionalcommits.org/);
release-please maintains the release PR — merging it tags and builds installers for all four
platforms. Offline regression: `scripts/test-scan.ts` (course organizing engine),
`scripts/test-bpm.ts` (tempo detection), `scripts/diag-bpm.ts` (diagnose real backing tracks).

## License

[AGPL-3.0](LICENSE). You may use, modify and distribute freely; derivative works — including
network services built on this project — must be released under the same license. Contact the
author via Issues for commercial licensing.
