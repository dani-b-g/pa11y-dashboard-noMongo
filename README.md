# Pa11y Dashboard

Pa11y Dashboard is a web interface to the [Pa11y][pa11y] accessibility reporter; allowing you to focus on _fixing_ issues rather than hunting them down.

![Version][shield-version]
[![Node.js version support][shield-node]][info-node]
[![Build status][shield-build]][info-build]
[![GPL-3.0 licensed][shield-license]][info-license]


![dashboard](https://user-images.githubusercontent.com/6110968/61603347-0bce1000-abf2-11e9-87b2-a53f91d315bb.jpg)
![results-page](https://user-images.githubusercontent.com/6110968/62183438-05851580-b30f-11e9-9bc4-b6a4823ae9e8.jpg)

# Pa11y Dashboard — Local Execution (No MongoDB)

- [Node.js][node]: Pa11y Dashboard 5 requires a stable (even-numbered) version of Node.js of 20 or above.

This version of **Pa11y Dashboard** is customized to work entirely **locally**, without requiring MongoDB or the external Pa11y Webservice.  
It performs accessibility audits using **Pa11y (CLI)** directly from Node.js and stores **tasks and results** persistently in the browser’s **IndexedDB**.

---

## 🚀 Key Features

### Pally Dashboard and Linux/Ubuntu
- 🧱 **No MongoDB or external services** — runs fully offline.
- ⚙️ **Local analysis** — executes Pa11y through Node.js.
- 💾 **Browser persistence** — stores tasks and results in IndexedDB.
- 📈 **Full run history** — shows number of executions and timestamps.
- 🔁 **True persistence between restarts** — tasks and results remain saved.
- 📊 **Live graphs** — display error, warning, and notice metrics.
---

## 💡 Local Execution

1. Install dependencies:

## Setting up Pa11y Dashboard
    ```cmd
    npm install
    ```

2. Start the server:

    ```bash
    npm run start
    ```

3. Open your browser at:

    ```
    http://localhost:4000
    ```

3. Create new tasks and run them directly.  
   The results are stored in **IndexedDB**, remaining available across browser sessions and server restarts.

---

## ⚠️ Possible Issues with Puppeteer Installation

In some environments (such as corporate networks), Puppeteer may fail during installation when attempting to download **Chromium**.  
To prevent this, you can instruct it to use your local installation of **Google Chrome** instead.

### 🪟 Windows

1. (Optional) Clean previous installation:

    ```cmd
    rmdir /s /q node_modules
    del /q package-lock.json
    ```

2. Install dependencies:

    ```cmd
    npm install
    ```

3. Start the dashboard:

    ```cmd
    npm run start
    ```
4. Setup Environment:

	```cmd
	set "PUPPETEER_SKIP_DOWNLOAD=true"
	set "PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
	npm install
	```

### 🐧 Linux (Ubuntu/Debian)

1. (Optional) Clean previous installation:

    ```bash
    rm -rf node_modules package-lock.json
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Start the dashboard:

    ```bash
    npm run start
    ```
4. Setup Environment:

	```bash
	export PUPPETEER_SKIP_DOWNLOAD=true
	export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
	npm install
	```

To make the variables permanent:

```bash
echo 'export PUPPETEER_SKIP_DOWNLOAD=true' >> ~/.bashrc
echo 'export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome' >> ~/.bashrc
source ~/.bashrc
```

> 💡 These variables prevent Puppeteer from trying to download Chromium from `storage.googleapis.com`.


## Useful resources

- [Setting up An Accessibility Dashboard from Scratch with Pa11y on DigitalOcean](https://una.im/pa11y-dash/)
- [Monitoring Web Accessibility Compliance With Pa11y Dashboard](https://www.lullabot.com/articles/monitoring-web-accessibility-compliance-with-pa11y-dashboard)

## Troubleshooting

### Common issues

- `500` errors or `Could not connect to pa11y-webservice` messages are often related to MongoDB. Ensure that you have the [appropriate version of MongoDB](#installing-mongodb) installed, and that it's running - it doesn't always start automatically.
- Error messages saying that pa11y-webservice isn't running may be due to dependency installation problems. Try deleting your `pa11y-dashboard/node_modules` directory and running `npm install` again.

### Create a new issue

Check the [issue tracker][issues] for similar issues before creating a new one. If the problem that you're experiencing is not covered by one of the existing issues, you can [create a new issue][issues-create]. Please include your node.js and MongoDB version numbers, and your operating system, as well as any information that may be useful in debugging the issue.

## Support and migration

> [!NOTE]
> We maintain a [migration guide](MIGRATION.md) to help you migrate between major versions.

When we release a new major version we will continue to support the previous major version for 6 months. This support will be limited to fixes for critical bugs and security issues. If you're opening an issue related to this project, please mention the specific version that the issue affects.

The following table lists the major versions available and, for each previous major version, its end-of-support date, and its final minor version released.

| Major version | Last minor release | Node.js support             | Support end date |
| :------------ | :----------------- | :-------------------------- | :--------------- |
| `5`           |                    | `20`, `22`, `24`            | ✅ Current major version |
| `4`           | `4.2`              | `12`, `14`, `16`, `18`, `20`| May 2026         |
| `3`           | `3.3`              | `8`, `10`                   | May 2022         |
| `2`           | `2.4`              | `4`, `6`                    | January 2020     |
| `1`           | `1.12`             | `0.10`, `0.12`, `4`, `6`    | December 2016    |

📚 **References:**

- [Puppeteer Troubleshooting Docs (pptr.dev)](https://pptr.dev/troubleshooting)  
- [Stack Overflow – Puppeteer Skip Download](https://stackoverflow.com/questions/51717944)

---

## ⚙️ Environment Variables

| Variable                    | Description                                                                      |
| --------------------------- | -------------------------------------------------------------------------------- |
| `PUPPETEER_SKIP_DOWNLOAD`   | Prevents Puppeteer from downloading Chromium during `npm install`.               |
| `PUPPETEER_EXECUTABLE_PATH` | Defines the path to the existing Chrome or Chromium executable.                 |

---

## 🧠 Technical Explanation

- **Pa11y** performs audits using Puppeteer.  
- **IndexedDB** keeps all tasks and results inside the browser, ensuring full data persistence even after restarting the server.  
- When you restart the dashboard (`npm start`), all tasks, results, and charts are automatically reloaded from IndexedDB.

---

## ✅ Expected Results

- Installation completes without errors on restricted networks.  
- Dashboard works entirely offline.  
- Tasks, runs, and results remain persistent.  
- Accessibility audits run successfully without MongoDB or external APIs.

---

## 🧩 Credits

Based on [Pa11y Dashboard](https://github.com/pa11y/pa11y-dashboard), customized for full local execution without MongoDB, with IndexedDB persistence and extended support for corporate proxy environments.

## License

Pa11y Dashboard is licensed under the [GNU General Public License 3.0][info-license].  
Copyright &copy; 2016-2025, Team Pa11y and contributors
Copyright © 2025  
Customized by **Daniel 'dani-b-g' Barriga**

[homebrew]: https://brew.sh/  
[issues]: https://github.com/dani-b-g/pa11y-dashboard-noMongo/issues?utf8=%E2%9C%93&q=is%3Aissue  
[issues-create]: https://github.com/dani-b-g/pa11y-dashboard-noMongo/issues/new  
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
