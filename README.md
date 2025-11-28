<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# TrustBrowser DKG

A privacy‑preserving AI browser that reads any website, summarizes content, verifies assets on the OriginTrail DKG, and assists with page actions. Includes an image authenticity check combining DKG provenance and AI analysis.

## Quick Start

- Install dependencies: `npm install`
- Configure environment: edit `.env.local` (see below)
- Start web app: `npm run dev`
- Start Electron shell: `npm run electron:dev`

## Environment

Required keys in `.env.local`:
- `VITE_GEMINI_API_KEY` – Google Gemini API key
- `VITE_DKG_USE_PROXY=true`
- `DKG_PROXY_TARGET=https://v6-pegasus-node-02.origin-trail.network:8900`
- `VITE_DKG_HOSTNAME=https://v6-pegasus-node-02.origin-trail.network`
- `VITE_DKG_PORT=8900`
- `VITE_DKG_API_VERSION=/v1`
- `VITE_NEUROWEB_CHAIN_ID=20430`

Optional (for truth signal checks):
- `VITE_RANDOMSAMPLING_ADDRESS` – contract for proof scoring
- `VITE_CONTENT_ASSET_STORAGE_ADDRESS` – contract for fingerprints

## Features

- Agentic DOM: enable from the browser view to let the assistant click/type/navigate in the page.
- Page Summary: ask “summarize” to get 6–8 bullet points from the current page.
- DKG Search: queries the testnet node via proxy; falls back to SPARQL if needed.
- DKG Publish: prepares EIP‑712 typed data, asks wallet to sign, and creates the asset.
- Image Authenticity: click the image icon in the chat header, upload an image, and receive a provenance + AI assessment (hash, confidence, optional UAL).

## Electron Troubleshooting

- If a blank screen appears, the app auto‑retries loading and opens DevTools.
- Sites that block `<webview>` will auto‑open externally.

## Demo Flow

1. Open TrustBrowser and enable Agentic DOM.
2. Search a topic (e.g., “what is dkg”). If DKG has data, you’ll see the UAL; otherwise, use “Be the first to publish”.
3. Connect wallet and publish the AI summary as a Knowledge Asset.
4. Upload an image via the chat header to verify authenticity.

## Notes

- Keep secrets out of `.env.local` when recording demos.
- The app uses a dev proxy to avoid CORS; production should route via a backend gateway.

# CLOUD NODE SET UP ON GOOGLE CLOUD
TrustBrowser DKG Cloud Endpoint Infrastructure

Status: 🟢 Live & Operational

Network: OriginTrail DKG (NeuroWeb Testnet)

Infrastructure: Google Cloud Platform (Compute Engine) + Cloudflare Zero Trust

Process Management: PM2 Daemonized Services

📖 Overview

This document outlines the backend infrastructure for TrustBrowser, which utilizes a custom-deployed OriginTrail Decentralized Knowledge Graph (DKG) Node.

To ensure high availability and secure access without exposing raw server IPs, we implemented a Split-Process Architecture using Cloudflare Tunnels. This separates the DKG Engine (API) from the Agent Interface (UI), allowing the browser application to query and publish Knowledge Assets directly via a secure HTTPS endpoint.

🏗️ Architecture Diagram

The system is deployed on a Google Cloud VM (Ubuntu 22.04) and managed via PM2. Traffic is routed through two distinct secure tunnels.

Component

Internal Port

Public Access Strategy

Purpose

DKG Engine (The Brain)

8900

Cloudflare Tunnel 1 (API Endpoint)

Handles SDK requests (Publish/Query) from TrustBrowser.

Agent UI (The Face)

8081

Cloudflare Tunnel 2 (Dashboard)

Visual interface for node management and chat.

Process Manager

N/A

PM2 (Daemonized)

Ensures 24/7 uptime and auto-restarts.

🚀 Deployment Configuration

1. Server Specification

Provider: Google Cloud Compute Engine

Instance Type: e2-standard-2 (2 vCPU, 8GB RAM)

OS: Ubuntu 22.04 LTS

Storage: 30GB SSD

Optimization: 4GB Swap Memory configured to prevent OOM crashes during graph operations.

2. Process Management (PM2)

We utilize pm2 to keep services running in the background. The process list is saved (pm2 save) to survive server reboots.

Active Processes:

brain-tunnel: Cloudflared tunnel routing public traffic to localhost:8900 (API).

face-tunnel: Cloudflared tunnel routing public traffic to localhost:8081 (UI).

dkg-node: The core DKG application running via dkg-cli run-dev or npm run dev.

3. Security & Trust Configuration

To resolve cross-origin resource sharing (CORS) and mixed-content issues typical in cloud deployments, specific environment variables were injected into the node's runtime:

# Forces Node.js to prefer IPv4 (Fixes Google Cloud fetch errors)
NODE_OPTIONS="--dns-result-order=ipv4first"

# Binds the server to all interfaces
HOST=0.0.0.0

# Forces the DKG Node to trust Cloudflare's SSL headers
AUTH_TRUST_HOST=true
TRUST_PROXY=true
WARP_USE_HTTPS=true


🔗 Endpoints

API Endpoint (For TrustBrowser Integration)

This secure endpoint is used by the dkg.js SDK within the application to sign and publish assets.

URL: https://ping-framework-motorcycles-incl.trycloudflare.com

Method: REST / JSON-RPC

Auth: Wallet Private Key (Server-Side)

Admin Dashboard (For Judges/Demo)

URL: https://substantial-controlled-wallpapers-canvas.trycloudflare.com

Status: ✅ Online

Credentials: Provided in submission details.

💻 Integration Code Example

The TrustBrowser application connects to this cloud infrastructure using the following service pattern:

import DKG from "dkg.js";

const DkgClient = new DKG({
  environment: "testnet",
  // The custom Cloudflare endpoint we built
  endpoint: "[https://ping-framework-motorcycles-incl.trycloudflare.com](https://ping-framework-motorcycles-incl.trycloudflare.com)", 
  port: 443,
  blockchain: {
    name: "neuroweb:testnet",
    publicKey: process.env.WALLET_PUBLIC_KEY,
    privateKey: process.env.WALLET_PRIVATE_KEY,
  },
});

// Usage: Publishing a verified page to the DKG
export async function publishPage(url, title) {
    const asset = await DkgClient.asset.create({
        "@type": "WebPage",
        "name": title,
        "url": url
    }, { epochs: 5 });
    
    return asset.UAL;
}


🛠️ Maintenance Commands

If maintenance is required on the cloud instance:

Check Status: pm2 status

View Logs: pm2 logs dkg-node --lines 50

Restart Node: pm2 restart dkg-node

Update Tunnels: pm2 restart brain-tunnel (Note: This will generate a new random URL).