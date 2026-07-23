# Sleep Pathways Guild Blog Migration

A separate `blog-migration` branch was created to stage the Blogger-to-GitHub migration without changing the live Sleep Pathways Guild website.

## Export summary

- Source: Google Takeout Blogger export
- Blog: Sleep Pathways Guild Blog
- Live posts migrated: 27
- Live pages migrated: 1
- Original Blogger URL paths preserved where available
- Amazon search tracking normalized to `spg_rpsgt-20`
- Intended custom domain: `blog.sleeppathwaysguild.com`

## Deployment safety

Do not change the current Cloudflare `blog` DNS record until the separate blog repository or GitHub Pages deployment has been created and previewed.

A separate repository is recommended because one GitHub Pages site cannot safely use both `sleeppathwaysguild.com` and `blog.sleeppathwaysguild.com` as independent custom domains from the same Pages deployment.
