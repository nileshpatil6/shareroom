# ShareRoom - 4-Digit Room Code Sharing Website

ShareRoom is a Next.js web application designed for fast, frictionless text, formatted code snippet, and file sharing using a 4-digit room code. Built for Vercel free deployment with Vercel Free Blob storage and automated 10-day data erasure.

## Features

- **4-Digit Room Code Access**: Join any room instantly using a 4-digit PIN (e.g., `4821`).
- **Creator Admin Role**: The creator of a room gets an Admin badge with full control to post and delete items.
- **Text & Formatted Code Blocks**: Paste plain text or code with syntax highlighting (JS, TS, Python, HTML, CSS, JSON, SQL, Bash) and a 1-click **Copy Code** button.
- **File Sharing (Max 10 MB)**: Upload files up to 10MB per file stored on Vercel Blob.
- **10-Day Auto Erasure**: All files and shared items are automatically deleted from Vercel Blob 10 days after creation. Includes automated daily cron cleanup (`/api/cron/cleanup`).

---

## Deploying to Vercel (Free Tier)

### Step 1: Push Code to GitHub / Git Provider
```bash
git init
git add .
git commit -m "Initial commit of ShareRoom"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

### Step 2: Import into Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** -> **"Project"**.
2. Select your `shareroom` GitHub repository.
3. Keep default build command (`npm run build`) and output settings.

### Step 3: Enable Free Vercel Blob Storage
1. After importing (or from your Vercel Project page), go to the **Storage** tab.
2. Click **Create Database** -> Select **Blob** (Vercel Blob).
3. Name your store (e.g., `shareroom-blob`) and click **Create**.
4. Click **Connect to Project** and select your `shareroom` project.
5. Vercel will automatically inject the `BLOB_READ_WRITE_TOKEN` environment variable into your deployment!

### Step 4: Redeploy Project
1. In Vercel, trigger a redeploy (or push a commit).
2. Your ShareRoom site is live with free Blob storage and automated 10-day file cleanup!

---

## Local Development

Run the development server locally:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.
