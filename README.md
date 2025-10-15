# Pa11y Dashboard

Pa11y Dashboard is a web interface to the [Pa11y][pa11y] accessibility reporter; allowing you to focus on _fixing_ issues rather than hunting them down.

![Version][shield-version]
[![Node.js version support][shield-node]][info-node]
[![Build status][shield-build]][info-build]
[![GPL-3.0 licensed][shield-license]][info-license]

![dashboard](https://user-images.githubusercontent.com/6110968/61603347-0bce1000-abf2-11e9-87b2-a53f91d315bb.jpg)
![results-page](https://user-images.githubusercontent.com/6110968/62183438-05851580-b30f-11e9-9bc4-b6a4823ae9e8.jpg)

# Pa11y Dashboard — Local Execution (No MongoDB)

This version of **Pa11y Dashboard** is customized to work entirely **locally**, without requiring MongoDB or the external Pa11y Webservice.  
It performs accessibility audits using **Pa11y (CLI)** directly from Node.js and stores **tasks and results** persistently in the browser’s **IndexedDB**.

---

## 🚀 Key Features

-   🧱 **No MongoDB or external services** — runs fully offline.
-   ⚙️ **Local analysis** — executes Pa11y through Node.js.
-   💾 **Browser persistence** — stores tasks and results in IndexedDB.
-   📈 **Full run history** — shows number of executions and timestamps.
-   🔁 **True persistence between restarts** — tasks and results remain saved.
-   📊 **Live graphs** — display error, warning, and notice metrics.

---

## 🧩 Prerequisites

### 🪟 Windows

1. Verify Microsoft Edge installation:

    ```cmd
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --version
    ```

    or

    ```cmd
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --version
    ```

2. Clean previous installation (optional):

    ```cmd
    rmdir /s /q node_modules
    del /q package-lock.json
    ```

3. Configure environment variables:

    ```cmd
    set "PUPPETEER_SKIP_DOWNLOAD=true"
    set "PUPPETEER_EXECUTABLE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    ```

4. Install dependencies:

    ```cmd
    npm install
    ```

5. Start the dashboard:
    ```cmd
    npm run start
    ```

> 💡 If your corporate network blocks `storage.googleapis.com`, these environment variables prevent Puppeteer from attempting to download Chromium.

---

### 🐧 Linux (Ubuntu/Debian)

1. Install Google Chrome or Chromium:

    ```bash
    sudo apt update
    sudo apt install -y chromium-browser || sudo apt install -y google-chrome-stable
    ```

2. Clean previous installation (optional):

    ```bash
    rm -rf node_modules package-lock.json
    ```

3. Configure environment variables:

    ```bash
    export PUPPETEER_SKIP_DOWNLOAD=true
    export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
    ```

4. Install dependencies:

    ```bash
    npm install
    ```

5. Start the dashboard:

    ```bash
    npm run start
    ```

6. (Optional) Make variables permanent:
    ```bash
    echo 'export PUPPETEER_SKIP_DOWNLOAD=true' >> ~/.bashrc
    echo 'export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome' >> ~/.bashrc
    source ~/.bashrc
    ```

---

## 💡 Local Execution

1. Start the server:

    ```bash
    npm run start
    ```

2. Open your browser at:

    ```
    http://localhost:4000
    ```

3. Create new tasks and run them directly.  
   The results are stored in **IndexedDB**, remaining available across browser sessions and server restarts.

---

## ⚙️ Environment Variables

| Variable                    | Description                                                                      |
| --------------------------- | -------------------------------------------------------------------------------- |
| `PUPPETEER_SKIP_DOWNLOAD`   | Prevents Puppeteer from downloading Chromium during `npm install`.               |
| `PUPPETEER_EXECUTABLE_PATH` | Defines the path to the existing browser executable (Edge, Chrome, or Chromium). |

📚 **References:**

-   [Puppeteer Troubleshooting Docs (pptr.dev)](https://pptr.dev/troubleshooting)
-   [Stack Overflow – Puppeteer Skip Download](https://stackoverflow.com/questions/51717944)

---

## 🧠 Technical Explanation

-   **Pa11y** performs audits using Puppeteer.
-   **IndexedDB** keeps all tasks and results inside the browser, ensuring full data persistence even after restarting the server.
-   When you restart the dashboard (`npm start`), all tasks, results, and charts are automatically reloaded from IndexedDB.

---

## ✅ Expected Results

-   Installation completes without errors on restricted networks.
-   Dashboard works entirely offline.
-   Tasks, runs, and results remain persistent.
-   Accessibility audits run successfully without MongoDB or external APIs.

---

## 🧰 Useful Scripts

```json
{
    "scripts": {
        "start": "node index.js",
        "audit:accessibility": "set PUPPETEER_SKIP_DOWNLOAD=true && set PUPPETEER_EXECUTABLE_PATH=\"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe\" && pa11y http://localhost:4000"
    }
}
```

---

## 🧩 Credits

Based on [Pa11y Dashboard](https://github.com/pa11y/pa11y-dashboard), customized for full local execution without MongoDB, with IndexedDB persistence and extended support for corporate proxy environments.

## License

Pa11y Dashboard is licensed under the [GNU General Public License 3.0][info-license].  
Copyright &copy; 2023, Team Pa11y and contributors

[homebrew]: https://brew.sh/
[issues]: https://github.com/pa11y/pa11y-dashboard/issues?utf8=%E2%9C%93&q=is%3Aissue
[issues-create]: https://github.com/pa11y/pa11y-dashboard/issues/new
[mongodb]: http://www.mongodb.org/
[mongodb-package]: https://www.npmjs.com/package/mongodb
[mongodb-package-compatibility]: https://docs.mongodb.com/drivers/node/current/compatibility
[node]: http://nodejs.org/
[pa11y]: https://github.com/pa11y/pa11y
[pa11y-webservice-config]: https://github.com/pa11y/webservice#configurations
[info-node]: package.json
[info-build]: https://github.com/pa11y/pa11y-dashboard/actions/workflows/tests.yml
[info-license]: LICENSE
[shield-version]: https://img.shields.io/github/package-json/v/pa11y/pa11y-dashboard.svg
[shield-node]: https://img.shields.io/node/v/pa11y/pa11y-dashboard.svg
[shield-build]: https://github.com/pa11y/pa11y-dashboard/actions/workflows/tests.yml/badge.svg
[shield-license]: https://img.shields.io/badge/license-GPL%203.0-blue.svg

---

© 2025 — Customized by Daniel 'dani-b-g' Barriga
