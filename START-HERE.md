# Put Many Histories on your own GitHub account

Prepared 26 October 2026. This package starts from published version 15 and
includes the complete static website, editable source, research, checks and an
automatic GitHub Pages publishing workflow. The original hosted copy has not
been changed by this export.

## What you are setting up

- **GitHub repository:** the home for your code and its change history.
- **GitHub Pages:** the public website built from that repository.
- **GitHub connection in ChatGPT/Codex:** authorized access for future coding work.

For this static atlas, GitHub plus GitHub Pages is a straightforward starting
point. A public repository can use GitHub Pages on GitHub Free. A public repository
means other people can see the code as well as the website. If you need private
source, check your GitHub plan's Pages eligibility before choosing that option.
You do not need a domain name to start. You do not need an OpenAI API key, a
database, or a paid application server for this version of the atlas.

## 1. Download and unpack

Unzip the code download. Inside is a folder named `many-histories`.
Its contents include `dist`, `scripts`, `package.json`, `package-lock.json`,
`README.md`, `.gitignore`, and `.github/workflows/pages.yml`.
Keep the whole folder; uploading only the ZIP will not create a working site.

## 2. Create your repository

1. Sign in to https://github.com or create an account.
2. Visit https://github.com/new.
3. Choose your own account as the owner.
4. Name the repository `many-histories`.
5. Choose **Public** for the free route described here.
6. Turn on **Add a README file**. Leave the license and gitignore selections
   unset for now; the package already includes a gitignore.
7. Click **Create repository**.

Your repository URL will resemble `https://github.com/YOUR-USERNAME/many-histories`.
Use your actual username wherever this guide says `YOUR-USERNAME`.

## 3. Upload using GitHub Desktop

This avoids command-line setup and preserves the hidden workflow folder.

1. Download GitHub Desktop from https://desktop.github.com and sign in with
   the same GitHub account.
2. Choose **File > Clone repository**. Select the repository you just created,
   or use its URL. Choose a local folder and click **Clone**.
3. Open the cloned folder in Finder or File Explorer. Also open the unpacked
   `many-histories` download in another window.
4. Show hidden files: on macOS, press **Command + Shift + .** in Finder.
   On Windows, enable **View > Show > Hidden items** in File Explorer.
5. Copy all contents of the unpacked folder into the cloned repository folder.
   Replace the initial README if asked. Copy the contents, not an extra outer
   `many-histories` folder. Leave the clone's existing `.git` folder alone.
6. Return to GitHub Desktop. The Changes list should include
   `.github/workflows/pages.yml`, `dist/index.html`, the `scripts` folder and
   `package.json` at the repository root.
7. Confirm the current branch is `main`. Enter a summary such as
   **Add Many Histories website**, then click **Commit to main**.
8. Click **Push origin**. Check the repository on GitHub: its main file list
   should show `dist`, `scripts` and `package.json`, not just a ZIP or an extra
   enclosing folder.

## 4. Enable hosting

1. Open the repository on GitHub and click **Settings**.
2. In the sidebar, click **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
   Do not select branch publishing or `/docs`: this package publishes `dist`
   through the included workflow.
4. Open the repository's **Actions** tab.
5. Select **Check and publish Many Histories**.
6. If its first run failed before Pages was enabled, use **Re-run all jobs**.
   Otherwise choose **Run workflow**, select `main`, and run it.
7. Wait for both the `build` and `deploy` jobs to finish successfully.
8. Return to **Settings > Pages** and use the published link GitHub displays.

For the repository name above, the usual address is:

`https://YOUR-USERNAME.github.io/many-histories/`

Keep the trailing slash. This is the link to share with readers; the GitHub
repository link is the place for working on the code. Open the website in a
private/incognito window to check that visitors can reach it without signing in.

## 5. Check the migrated site

Try Overview, Modern era, Connections and Regions. Click a continent heading,
search for a history, open its reader and use both Locate and the Wikipedia
link. Check the page on a phone as well as your computer. The package's automated
checks cover data, geometry and simulated interaction state; they do not replace
real browser/mobile checks. GitHub deployment itself must be verified after you
upload; it cannot be tested on your account before the repository exists.

## 6. Give ChatGPT/Codex access for future updates

1. In the ChatGPT/Codex surface you use, open its plugins/settings and find
   **GitHub**. Install it if needed, then connect your GitHub account.
2. Complete GitHub's authorization screen. Allow access to this repository;
   selecting only the required repository is sufficient.
3. Return to the conversation and provide your repository URL and website URL.
4. Ask to verify that the repository is accessible for coding and pushing
   changes. A public website or readable repository alone does not grant write
   access. The actual connection, account permissions and available tools must
   be checked before promising to publish an update.

If your current chat has only read access, use a **Codex Cloud** environment:
on web/desktop choose **Work in > Cloud**, create/select an environment, connect
GitHub, select this repository, and finish/publish the environment setup. Then
start a coding task in it. Account/workspace availability and labels may vary.
The repository includes `AGENTS.md` with the build and maintenance instructions.

An example request:

> Use my Many Histories GitHub repository as the source of truth. Make [change],
> run the build and checks, and open a pull request. Do not update the old Sites
> copy. Repository: [URL]. Live website: [URL].

For a pull request, review the changes and checks, then click **Merge pull
request** and confirm. A merge to `main` automatically builds and republishes
the website. If you explicitly ask for direct publication and the environment
has permission to push to `main`, that push can trigger the same deployment.
Branch rules still apply. You do not have to download and upload the website
again for each update.

## 7. Keep one main copy

After migration, treat GitHub as the source of truth. The original Sites address
is a separate deployment: changes here will not automatically appear there, or
vice versa. Tell the assistant to use the GitHub repository for future work.
Your GitHub Pages link normally stays the same across updates. A custom domain
can be added later without changing the code repository.

## If something goes wrong

| Symptom | What to check |
| --- | --- |
| No workflow in Actions | Make sure `.github/workflows/pages.yml` was copied and pushed. It is easy to miss hidden folders. |
| Root shows another `many-histories` folder | Files are nested one level too deeply. Move the package contents to the repository root. |
| Deploy says Pages not found or disabled | Select GitHub Actions in Settings > Pages, then rerun the workflow. |
| Build or checks fail | Open the failed job and copy its first relevant error into the coding chat. The deploy job is blocked when checks fail. |
| 404 at the website link | Wait for a successful deployment and use the exact Settings > Pages URL, including `/many-histories/`. |
| Repository absent in ChatGPT/Codex | Check the connected GitHub account and repository authorization. Organization repositories may need admin approval. |
| Changes do not appear | Confirm they reached `main`, check Actions succeeded, then reload without cache. An unmerged pull request does not change the public site. |

## For whoever maintains the code

Install Node.js 22+ (CI uses 24) and Python 3, then from the project root run:

```sh
npm ci
npm run build
npm run check
```

`npm run build` rebuilds sources, relationships, catalogues and charts. Saved
Wikipedia metadata is reused; newly specified articles need Wikipedia network
access. No third-party API credentials are required. The only npm dependency is
the pinned build-time Graphviz layout library. The public website needs none of
these developer tools installed on a visitor's computer.

For a local preview on macOS/Linux with Python 3, run `npm run preview` and open
http://localhost:8080/. On Windows, if `python3` is unavailable, use
`python -m http.server 8080 --directory dist` instead.

`dist/data.js` contains the base timeline data. Supplemental histories and maps
also come from the generators and specs in `scripts/`; generated files may be
overwritten by a rebuild. New regional research is in
`scripts/regional-research/`. Page structure is in `scripts/page.html`; chart
markup is generated by `scripts/build-chart.cjs`. Browser behavior and styles
are in `dist/app.js` and the CSS files under `dist/`.

Wikipedia excerpts retain contributor attribution, article links, revision data
and the CC BY-SA link. Preserve those credits and the historical sources when
editing or redistributing. No new license for the project's original code is
chosen by this export.

## Official references

- https://docs.github.com/en/desktop/overview/creating-your-first-repository-using-github-desktop
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/get-started/start-your-journey/deploying-your-website-automatically
- https://learn.chatgpt.com/docs/cloud
