# Agentrical Website

Marketing site for Agentrical, built with Hugo.

## Requirements

- Hugo Extended (v0.141+ recommended)

## Local Development

```bash
# Start dev server with live reload
hugo server --buildDrafts
```

Open `http://localhost:1313`.

## Build

```bash
# Production build
hugo --minify
```

Generated output is written to `public/`.

## Project Layout

```text
.
├── content/                    # Site pages and posts
├── data/home.yaml              # Homepage content source
├── themes/agentrical/          # Theme (layouts, styles, assets)
├── hugo.toml                   # Site config
└── public/                     # Generated static output
```

## Common Edit Points

- Homepage copy/data: `data/home.yaml`
- Main styles: `themes/agentrical/static/css/style.css`
- Homepage template: `themes/agentrical/layouts/index.html`
- Contact page template: `themes/agentrical/layouts/contact/single.html`
- Site metadata/config: `hugo.toml`

## Deployment

Deploy the `public/` directory to any static host (Netlify, Vercel, S3/CloudFront, etc.).
