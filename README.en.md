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

## Highlights

- **Folder in, course out** — auto-organizes common course folder layouts (lesson count always
  matches your video count); built-in AI-assisted organizing for unusual structures (paste a
  prompt to any AI, paste the JSON back — nothing gets uploaded); a full lesson manager for
  manual fine-tuning, with resources shareable across lessons
- **Study in one screen** — video on one side, score on the other (images / PDF / Guitar Pro
  tabs), backing track bar with loop & speed control, media hotkeys that follow whatever area
  you touched last
- **A metronome that reads music** — auto-detects backing track tempo (trusts tempo written in
  file names or printed on the score before falling back to audio analysis), TAP a few beats to
  snap-correct it, per-beat accent editing (strong / medium / weak / mute), calibration
  remembered per audio file
- **Data travels with the course** — progress and lesson structure live inside the course
  folder itself; auto-update built in

## Install

Grab the installer for your platform from [Releases](https://github.com/HsiaoKang/learning-house/releases/latest).

macOS builds are not notarized yet (indie project). If macOS says the app is damaged on first
launch, run once in Terminal:

```bash
xattr -cr "/Applications/Learning House.app"
```

On Windows, click "More info → Run anyway" if SmartScreen appears.

## Feedback & Contributing

Bug reports and ideas are very welcome via
[Issues](https://github.com/HsiaoKang/learning-house/issues/new/choose) and
[Discussions](https://github.com/HsiaoKang/learning-house/discussions) — or use the in-app
feedback button. Code PRs are currently **not accepted** (to keep iteration speed and licensing
flexibility); please open a Discussion first if you'd like to get involved.

## License

[AGPL-3.0](LICENSE). Derivative works — including network services built on this project —
must be released under the same license. Contact the author via Issues for commercial licensing.
