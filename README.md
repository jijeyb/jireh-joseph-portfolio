# Jireh Joseph — Portfolio

Personal portfolio of Jireh Joseph Brotonel, creative technologist: visual design, AI automation, and AI assistants.

Live site: https://jireh-joseph-portfolio.vercel.app/

## About the code

Plain HTML, CSS, and JavaScript, no framework and no build step.

- `index.html` is the home page; `projects.html` is the full archive.
- `projects-data.js` holds every project shown in the Work section and archive. Edit it to add or reorder work.
- `site.css` and `site.js` hold all styles and behavior. Design rules are in `DESIGN.md`.
- `assets/` has fonts, images, and web-compressed videos.

To preview locally, run `python -m http.server` in this folder and open http://localhost:8000.

After editing `site.css`, `site.js`, or `projects-data.js`, bump the `?v=` number where they are linked in `index.html` and `projects.html` so browsers load the new version.

## Contact form

The form opens the visitor's email app until a form service is connected. To send messages directly, set `data-endpoint` on the form in `index.html` to a Formspree or Web3Forms URL.
