# README screenshots

The images in `docs/images/` are captures of the actual HTML, CSS, and JavaScript
in this repository. Conversations, project names, devices, addresses, and results
are fictional fixtures in `scripts/readme-screenshots.mjs`.

The capture script uses a fresh browser context and intercepts all requests.
It reads only the public UI source files. It never connects to a running Harness,
reads its data directory, sends a model request, or pushes a repository.
The example success messages illustrate the interface; they are not real runs.

To regenerate from the repository root:

```sh
npm ci
npm install --no-save --package-lock=false playwright
SCREENSHOT_BROWSER=/absolute/path/to/chrome node scripts/readme-screenshots.mjs
```

On macOS the usual browser path is
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
On Windows set `SCREENSHOT_BROWSER` to your Chrome executable using your shell’s
environment-variable syntax. No browser download is required with an installed
Chrome. Playwright is only a documentation tool, not a DO runtime dependency.

The script captures desktop chat, projects, settings, phone setup, machines,
self-editing, and phone chat. It fails on browser JavaScript errors or horizontal
overflow in the phone view. Review each image after regeneration, especially
after changing UI labels or layout. Never substitute a screenshot of live user
history for these fixtures.
