# Sequence Assets

The production image sequence lives in this folder. Runtime playback uses the
WebP files; JPGs are retained as source/fallback assets.

- `frame_001.jpg`
- `frame_002.jpg`
- ...
- `frame_060.jpg`
- `frame_001.webp`
- `frame_002.webp`
- ...
- `frame_060.webp`

The default component configuration expects 60 WebP frames at
`/sequence/frame_${String(index + 1).padStart(3, "0")}.webp`.
