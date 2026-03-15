<div align="center">
  <img src="public/icons/icon128.png" alt="CodeforcesSync Logo" width="128" />
  <h1>CodeforcesSync</h1>
  <p><strong>Automatically sync your competitive programming solutions from Codeforces to GitHub in real-time!</strong></p>
</div>

---

## 📖 Project Description

**CodeforcesSync** is a powerful Chrome Extension that seamlessly bridges your Codeforces competitive programming journey with your GitHub profile. 

Whenever you receive an "Accepted" verdict on Codeforces, this extension automatically detects the submission, extracts your source code, and directly pushes it to a chosen GitHub repository. It does this entirely in the background using the official GitHub API. 

**Smart Language Detection:** CodeforcesSync features advanced programming language detection logic. It parses exact language tags (like `GNU C++20`, `PyPy 3`, or `Java 11`) and maps them to accurate file extensions (`.cpp`, `.py`, `.java`, etc.), ensuring your GitHub repository remains perfectly organized and syntax-highlighted.

## ✨ Features

- **Automated Background Syncing**: No manual copying or committing required. If you solve it, it syncs.
- **Real-time Streak Tracking**: Gamify your daily progress with an integrated solving streak tracker right inside the visual popup!
- **Smart API Throttling**: Safely manages GitHub Secondary Rate limits and Codeforces scraping limits behind the scenes using asynchronous delays.
- **Custom Subdirectories**: Want to store submissions in a `solutions/` folder? You can configure custom nested repository paths natively from the popup.
- **Developer Debugging**: Comprehensive background logs and error tracking are piped directly into Chrome DevTools for painless monitoring.

---

## 🚀 Installation

Because CodeforcesSync manages secure Personal Access Tokens (PAT), it is distributed directly via source.

### 1. Download the Project
You can grab the source code by cloning the repository or downloading it.
* **Option A:** Open your terminal and run:
  ```bash
  git clone https://github.com/mhdnazrul/extension-testing-repo.git
  ```
* **Option B:** Click **Code -> Download ZIP** on GitHub and extract the folder to a directory of your choice.

### 2. Build the Extension
Ensure you have [Node.js](https://nodejs.org/) installed. Open a terminal inside the downloaded directory:
```bash
npm install
npm run build
```
This generates a production-ready `dist/` folder containing the compiled Chrome Extension. 

### 3. Load into Chrome
1. Open Google Chrome and navigate in the URL bar to: `chrome://extensions/`
2. Enable **Developer mode** via the toggle switch in the top-right corner.
3. Click the **"Load unpacked"** button in the top-left corner.
4. Select the `dist` folder located inside your project directory (e.g., `C:\Users\username\Desktop\CodeforcesSync\CodeforcesSync\dist`).

CodeforcesSync will successfully load! 

*(Optional: Pin the extension to your toolbar by clicking the puzzle icon and hitting the pin!)*

---

## ⚙️ Setup Instructions (GitHub Target)

The extension needs a place to store your code and the permissions to do so.

### Step 1: Create a GitHub Repository
1. Go to GitHub and click the **+ (plus)** icon in the top right corner, then **"New repository"**.
2. **Repository name**: Give it a clear name (e.g., `Codeforces-Solutions`).
3. **Visibility**: Choose **Public** (recommended) or **Private**.
4. Click **Create repository**.

### Step 2: Generate a Personal Access Token (PAT)
You must generate a secure token to allow the extension to push code. You can use either a **Classic Token** or a **Fine-grained Token**.

#### Option A: Classic Token (Easier)
1. Go to GitHub: **Settings** → **Developer Settings** → **Personal Access Tokens** → **Tokens (classic)**.
2. Click **Generate new token (classic)**. Add a note like "CodeforcesSync Ext".
3. Check the scope box for **`repo`** (Full control of private repositories).
4. Click **Generate token** and **COPY it immediately**.

#### Option B: Fine-grained Token (More Secure)
1. Go to GitHub: **Settings** → **Developer Settings** → **Personal Access Tokens** → **Fine-grained tokens**.
2. Click **Generate new token**. Add a name.
3. Under **Repository access**, choose **Only select repositories** and pick the repository you just created in Step 1.
4. Under **Permissions > Repository permissions**, assign the following:
   * **Contents**: Read & Write
   * **Commit statuses** *(optional)*: Read & Write
5. Click **Generate token** and **COPY it immediately**.

### Step 3: Configure the Extension
1. Click the CodeforcesSync icon in your Chrome toolbar.
2. Click the specific **Settings** gear icon.
3. Fill in the absolute details:
   * **GitHub Username**: `mhdnazrul`
   * **Personal Access Token**: `ghp_your_secret_token_here_...`
   * **Codeforces Handle**: `tourist`
   * **Repo Name**: `Codeforces-Solutions`
4. Click **Save**!

---

## 🕹️ Usage

Once configured, the background service takes over!

1. **Keep Codeforces Active**: You must leave a Codeforces tab permanently open in your browser while solving. The extension securely borrows your active Codeforces session cookie to silently fetch code without triggering aggressive Cloudflare Bot-Protection blockages.
2. **Solve Problems**: Submit solutions as normally as you would!
3. **Automatic Syncing**: Once receiving an **"Accepted"** verdict, CodeforcesSync intercepts the submission, processes the source code locally, and pushes it up to your linked GitHub repository.
4. **DevTools Logs**: To view real-time syncs, open `chrome://extensions`, locate CodeforcesSync, and click **"service worker"** to open Chrome DevTools. You will see precise console messages about detected languages, throttling wait times, and successful HTTP payload injections.

---

## 📁 File Structure

For users simply looking to use the extension, **the only folder that matters is the compiled `dist/` directory**.

For developers, here is a brief overview of the project architecture:
* `manifest.json`: The core settings configuration defining Manifest V3 permissions, host scopes, and target asset mappings files.
* `src/background/background.ts`: The central service-worker logic. Handles API calls, interval alarms, tab injections, and handles the logic loop.
* `src/utils/githubAPI.ts`: Manages the REST endpoint pushing to GitHub.
* `src/utils/languageMap.ts`: Our proprietary regex and array mapping utility to decipher languages (like `Clang++17 Diagnostics`) into file extensions (`.cpp`).
* `src/App.tsx`: The stunning React UI powering the interactive Popup module!
* `public/icons/`: Houses the 16x16, 48x48, and 128x128 official static icon badges.

---

## 🔖 Versioning & Releases

We follow semantic version tags. To distribute version-wise updates for this project:

1. Update the `"version"` flag explicitly inside `manifest.json` and `package.json` (e.g., to `"1.1.0"`).
2. Commit your code modifications: 
   ```bash
   git commit -am "Bump version 1.1.0: Added Python support"
   ```
3. Tag the target commit locally:
   ```bash
   git tag -a v1.1.0 -m "Release version 1.1.0"
   ```
4. Push both to the repository:
   ```bash
   git push origin main
   git push origin v1.1.0
   ```
5. On the GitHub Repo webpage, go to **Releases** → **Draft a new release**. Select your newly pushed tag. 
6. **PRO TIP:** Run `npm run build`, zip the `dist/` folder into `dist.zip`, and attach it to the GitHub Release. This allows non-developer users to bypass node installations and download the extension binary instantly!

---

## 🤝 Contributing

We heartily welcome community maintenance! Before contributing, please obey the rules:
* **Manifest V3 Standards**: Ensure all networking architectures obey standard non-persistent Service Worker lifecycle constraints.
* **Stable Polling**: Do not aggressively shorten the timeout interval in `background.ts`. Hammering Codeforces or GitHub APIs excessively causes rate-limit 429 strikes.
* **Propose First**: If you are deploying massive refactoring or feature additions, please open an **Issue** to discuss it before blindly drafting a Pull Request.
* **Code Formatting**: Ensure you run `npm run lint` and verify your Typescript interfaces match standard ESLint style guides. 

---

## 🚑 Troubleshooting / FAQ

**Q: My submission was C++, but it uploaded to GitHub as a `.c` file!**  
*A: This was a historical bug caused by greedy string checking. Ensure you pull the latest version of the repository where the algorithm explicitly checks (`C++`, `G++`, `CLANG++`) safely before processing trailing `C` targets!*

**Q: DevTools says "Blocked by Cloudflare Error"?**  
*A: Ensure you keep the actual `codeforces.com` website actively open in one of your browser tabs. Without a valid tab session, Codeforces treats the background worker as a web scraper bot!*

---

## 🎨 Design

> *Note: The CodeforcesSync application icon was uniquely designed blending the Codeforces Bar Chart aesthetic uniquely into the GitHub Octocat Commit network nodes layout for a distinctive premium feel!*

## 📄 License

This repository is available as Open Source under the **[MIT License](https://opensource.org/licenses/MIT)**. You are fully permitted to study, modify, deploy, and fork these functionalities for any personal or commercial application!
