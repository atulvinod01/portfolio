# atulvinod.com

Personal site. Static HTML, CSS and JS, no build step.

- `index.html`: markup and content
- `style.css`: styles
- `main.js`: 3D portfolio cloud, NSE clock/countdown, project previews and case studies, scroll motion

Libraries load from CDNs: three.js, GSAP + ScrollTrigger, Lenis, Archivo from Google Fonts.

## Run locally

`main.js` is an ES module, so open the site through a local server, not by double-clicking `index.html`:

    python3 -m http.server 8000

Then visit http://localhost:8000.

## Deploy

Hosted on Vercel (project `portfolio`, team CB), domain `atulvinod.com` via Cloudflare DNS.
