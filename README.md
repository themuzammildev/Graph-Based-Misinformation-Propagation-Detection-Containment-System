# 🌐 Graph-Based Misinformation Propagation Detection & Containment System

An interactive, visual simulation platform that models how rumors and fake news spread across directed social media networks, and demonstrates how to contain them with minimal account interventions using Graph Theory.

---

## 📌 Project Overview

Digital misinformation spreads rapidly across online platforms. Traditional detection tools focus only on analyzing text content using machine learning, but they fail to answer two critical questions:
1. **How does a rumor physically travel through a social network?**
2. **Which critical accounts should be quarantined to halt the cascade with the least collateral disruption?**

This project approaches misinformation as a **discrete network diffusion process**. By analyzing the structure of social connections, identifying critical "bridge" accounts, and simulating viral cascades, the platform provides explainable, visual, and mathematically sound misinformation containment.

---

## ✨ Key Features

### 1. 🔍 Claim Risk Assessment (Logic Rules)
* Evaluates incoming message claims based on key credibility signals:
  * **Source Verification Status:** Verified badges vs. anonymous/unverified accounts.
  * **Viral Share Velocity:** Fast forwarding thresholds.
  * **Independent Corroboration:** Multi-source cross-checking.
* Computes an immediate **Risk Score (0–100%)** using clear, deterministic rules.

### 2. 🗺️ Interactive Network Canvas
* Visualizes social networks as **directed graphs** with users (nodes) and follower/forwarding channels (edges).
* **Interactive Drag-and-Drop:** Move users around to explore different cluster layouts.
* **Color-Coded Statuses:** 
  * 🔵 **Blue:** Source Originator (Patient Zero)
  * 🔴 **Red:** Affected (Infected) users
  * ⚪ **Grey:** Normal (Safe / Unreached) users
  * 🟣 **Purple Rings:** Critical "Propagation Bridges"

### 3. ⚡ Multi-Model Spread Simulation
Compare three distinct models side-by-side to understand propagation:
* **Maximum Possible Reach (BFS):** Simulates the worst-case scenario where every user forwards the message 100% of the time.
* **Realistic Probabilistic Cascade (ICM):** Monte Carlo simulation running randomized trials to model real-world social sharing probabilities (e.g., 35% chance of forwarding).
* **Saturation Growth Model:** An analytical model capturing how spread naturally slows down as the rumor runs out of uninfected people.

### 4. 🛡️ Targeted Influence Containment
* Rather than banning popular users at random, the algorithm finds **Propagation Bridges** (accounts connecting two separate groups).
* Allows one-click **Account Quarantine**, instantly breaking transmission pathways and saving the remaining 50–70% of the network.

### 5. 📂 Real Dataset Ingestion & Benchmarks
* Upload custom social network datasets via **CSV** or **JSON**.
* Includes the built-in **PHEME Twitter Rumor Benchmark** (24 users, 48 directed connections) from real-world viral rumor cascades.

---

## 🛠️ Tech Stack

* **Frontend Framework:** React 19 + TypeScript
* **Build Tool:** Vite
* **Styling:** Tailwind CSS
* **Icons:** Lucide React
* **Testing & Benchmarking:** tsx + Node.js (80+ unit tests across graph algorithms)

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (version 18 or higher recommended)
* `npm` package manager

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/graph-based-misinformation-propagation-detection-and-containment-system.git
   cd graph-based-misinformation-propagation-detection-and-containment-system
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

---

## 🧪 Running Algorithm Benchmarks & Tests

The project includes standalone verification test suites for all graph and cascade algorithms:

* **Test Recurrence & Growth Models:**
  ```bash
  npx tsx scripts/test-recurrence.ts
  ```
* **Test Betweenness Centrality & Bridge Detection:**
  ```bash
  npx tsx scripts/test-betweenness.ts
  ```
* **Test Independent Cascade Simulation (Monte Carlo):**
  ```bash
  npx tsx scripts/test-icm.ts
  ```

---

## 👥 Use Cases & Educational Value

* **Academic Demonstrations:** Demonstrates practical applications of Graph Theory, Breadth-First Search (BFS), Centrality Metrics, and Stochastic Cascade Models.
* **Social Media Moderation Research:** Visualizes how targeted network interventions outperform blunt censorship.
* **Classroom / College Final Year Project:** Clean, component-based code written in TypeScript with zero black-box dependencies.

---

## 📄 License

This project is licensed under the MIT License - feel free to use and adapt for academic and educational projects!
