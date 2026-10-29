# 🛡️ Phishing Analyser & Cybersecurity Operations Platform

> 🌐 **Éles weboldal (Live Demo):** [https://phishing-analyser-mu.vercel.app](https://phishing-analyser-mu.vercel.app)

---

A comprehensive, hybrid, Explainable AI (XAI) phishing detection and cybersecurity platform designed to analyze suspicious web addresses (URLs), text messages (SMS), incoming emails, and international or premium-rate telephone numbers in real time.

The system relies on rule-based, deterministic heuristics (White-Box methodology) combined with natural language processing. In addition to computing a normalized composite risk score ($0\text{--}100$), it generates itemized, multilingual explanations detailing all activated security indicators with zero-reload UI synchronization, Role-Based Access Control (RBAC), and serverless cloud deployment.

---

## 🚀 Key Modules & Capabilities

### 1. URL Structural & Technical Heuristics ($P_1\text{--}P_7$)
* $P_1$ **– URL Length Evaluation:** Flags obfuscated, excessively long web paths on a normalized scale.
* $P_2$ **– Domain Length:** Detects atypically long registered domain names.
* $P_3$ **– Subdomain Stacking:** Identifies deep and manipulative multi-level subdomain structures.
* $P_4$ **– Phishing Keywords:** Dictionary-based matching against targeted keywords (`login`, `verify`, `paypal`, `secure`, etc.).
* $P_5$ **– Raw IPv4 Address:** Flags links targeting direct IP addresses rather than standard domain names.
* $P_6$ **– Special Character Density:** Analyzes abnormal frequencies of special characters (`@`, `-`, `_`, `%`, `?`).
* $P_7$ **– Transport Security Check:** Immediately penalizes the absence of HTTPS / SSL encryption.

### 2. Semantic & Psychological Text Analysis ($T_1\text{--}T_9$)
* $T_1$ **– Message Length:** Evaluates normalized character and token counts.
* $T_2$ **– Artificial Urgency:** Detects temporal pressure, deadlines, and demands for immediate action.
* $T_3$ **– Coercion & Fear Induction:** Flags threats of account closure, suspension, and penalties.
* $T_4$ **– Authority Impersonation:** Identifies impersonation of banks, law enforcement, and security teams.
* $T_5$ **– Financial Directives:** Scans for keywords concerning balance holds, wire transfers, and billing.
* $T_6$ **– Call-to-Action (CTA):** Detects prompts encouraging impulsive clicking or credential entry.
* $T_7$ **– Credential Harvesting:** Identifies solicitations for sensitive data, passwords, and verification codes.
* $T_8$ **– Aggressive Typography:** Calculates uppercase letter ratios (CAPS LOCK shouting).
* $T_9$ **– Embedded Threat Recursion:** Extracts embedded links and phone numbers from raw text, submitting them to dedicated sub-analyzers and weighting them into the overall threat score.

### 3. International & Toll Fraud Phone Verification ($PH_1\text{--}PH_6$)
* $PH_1$ **– High-Risk Carrier/VoIP Zones:** Cross-references incoming country codes against an external fraud database (`phone_fraud.json`, e.g., +234 Nigeria).
* $PH_2$ **– Premium-Rate Prefixes:** Blocks toll fraud and callback scam prefixes (`0900`, `+40900`, `+3690`, Wangiri protection).
* $PH_3$ **– E.164 Format Compliance:** Checks for the presence of the international dialing prefix (`+`).
* $PH_4$ **– Length Discrepancy:** Measures deviations from standard ITU telephone number lengths.
* $PH_5$ **– Synthetic Patterns:** Identifies artificially generated sequences and repetitive digit blocks (`1234`, `0000`).
* $PH_6$ **– Non-Numeric Anomalies:** Flags abnormal characters and masking techniques.

### 4. Email Header Inspection & Typosquatting Detection
* **Sender Header Inspection:** Extracts and verifies the legitimacy of the `From:` header.
* **Typosquatting Detection:** Detects deceptive visual homoglyphs and character substitutions (e.g., `paypaI` using an uppercase `I` instead of a lowercase `l`).
* **Subject Line Analysis:** Flags manipulative formatting, aggressive punctuation (`!`), and all-caps urgency.
* **Aggregated Threat Score:** Synthesizes header anomalies, body semantics, and embedded hyperlinks into a unified risk score.

### 5. Explainable AI (XAI) & Threat Classification
* **Score-First Normalization:** Scaled from $0\text{--}100\text{ points}$ with detailed category breakdowns (URL, Text, Phone, Sender).
* **Safe (Biztonságos / Sigur):** $0\text{--}30\text{ points}$ (Green indicator badge)
* **Suspicious (Gyanús / Suspect):** $31\text{--}70\text{ points}$ (Yellow indicator badge)
* **Phishing (Adathalász / Phishing):** $71\text{--}100\text{ points}$ (Red indicator badge)
* **Traceable Reasoning:** Transparent, bulleted XAI explanations detailing why each heuristic rule fired.

### 6. Trilingual Internationalization (HU, EN, RO)
* Full client-side localization managed via `i18next` with real-time UI synchronization across Hungarian, English, and Romanian.
* Dynamic backend XAI translation dictionary (`messages.js`) returning localized diagnostic findings.
* **Zero-Reload Dynamic Re-evaluation:** Switching languages dynamically re-evaluates active inspection cards and SOC dashboard feeds without page reloads.
* Localized CSV exports using UTF-8 BOM encoding for complete character fidelity in external spreadsheet tools (Microsoft Excel, LibreOffice).

### 7. User Authentication & Role-Based Access Control (RBAC)
* **Secondary Auth Registration Lifecycle:** New registrations utilize an isolated secondary Firebase Auth instance (`secondaryAuth`). Accounts are created and stored without automatically signing in the client, cleanly enforcing the strict workflow: `Register` ➔ `Redirect to Login with Success Banner` ➔ `Sign In` ➔ `Dashboard`.
* **Automatic Administrator Recognition:** Users with `admin` in their email address (e.g., `user_admin@example.com`) or designated via the Firestore `role: 'admin'` field are automatically granted Administrator privileges upon sign-in.
* **Granular Role Privileges:**
  * **End User (`role: 'user'`):** Real-time analyzer, interactive 30-question cybersecurity awareness quiz with localized randomization, personal scan history, and personal CSV export. The administrative SOC Dashboard tab is strictly hidden.
  * **Administrator (`role: 'admin'`):** Complete system audit trail with individual and bulk record deletion, global CSV export, and access to the Cyber Operations Center (SOC Dashboard).
* **Cyber Operations Center (SOC Dashboard):**
  * Interactive SVG radar dial mapping threats into categorical nodes with dynamic proportional radii.
  * Real-time Security Score gauge ($0\text{--}100$) and live intensity scale.
  * Live inspection event feed with score-first multi-lingual classification tags (`Élő nézet` / `Live Now` / `În direct`).
* **Responsive Box-Model UI:** Light/Dark theme toggle and mobile-optimized layouts with tailored touch targets, padding, and canvas-compressed profile image uploads.

---

## 🏗️ System Architecture

```text
phishing-analyser/
├── vercel.json                 # Vercel Monorepo / Multi-service orchestration configuration
├── client/                     # Frontend Application (React 19, Vite, i18next, Firebase SDK)
│   ├── src/
│   │   ├── assets/             # SVG and PNG icons, illustrations
│   │   ├── data/
│   │   │   └── quizData.json   # 30 trilingual cybersecurity questions & explanations
│   │   ├── AdminStats.jsx      # SOC operations center & SVG radar dial dashboard (Admin)
│   │   ├── AdminStats.css      # SOC dashboard layout, radar dial, and responsive breakpoints
│   │   ├── App.jsx             # Root container, routing, state sync & analyzer UI
│   │   ├── App.css             # Main stylesheet, Box Model & media queries
│   │   ├── Auth.jsx            # Authentication, registration flow & secondaryAuth handling
│   │   ├── firebase.js         # Firebase Auth, secondaryAuth & Firestore client instances
│   │   ├── i18n.js             # i18next translation resources (HU, EN, RO)
│   │   ├── LightMode.css       # Light theme style overrides
│   │   ├── Quiz.jsx            # Interactive awareness quiz engine
│   │   ├── Quiz.css            # Quiz animation and card styles
│   │   └── main.jsx            # React application entry point
│   ├── index.html
│   └── package.json
├── server/                     # Backend API (Node.js, Express REST API, Serverless export)
│   ├── data/
│   │   ├── phone_fraud.json    # High-risk dialing zones & fraud classifications
│   │   └── suspicious_keywords.json # Lexicons for psychological & financial indicators
│   ├── index.js                # Express API server & deterministic heuristic engine
│   ├── messages.js             # Multilingual XAI explanation generator (HU, EN, RO)
│   ├── test_analyser.js        # Automated CLI test suite
│   └── package.json
└── README.md
```

---

## ☁️ Cloud Deployment Architecture (Vercel Full-Stack)

The platform is designed to be deployed as a unified full-stack project on **Vercel** with zero-configuration multi-service routing:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "client": {
      "root": "client",
      "framework": "vite"
    },
    "server": {
      "root": "server",
      "framework": "express"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": { "service": "server" }
    },
    {
      "source": "/(.*)",
      "destination": { "service": "client" }
    }
  ]
}
```

* **Frontend Routing:** Incoming web traffic (`/(.*)`) is routed directly to the optimized static build of the Vite client.
* **API Routing:** REST API requests (`/api/(.*)`) are routed seamlessly to the Express service, running as serverless fluid compute with automatic port abstraction and instant response times.

---

## 🛠️ Installation & Setup (Local Development)

### Prerequisites
* **Node.js** (v18.0.0 or higher recommended)
* **npm** package manager
* An active **Firebase Project** (with Authentication and Firestore enabled)

### 1. Configure Environment Variables (Frontend)
Create a `.env` file inside the `client/` directory with the following structure:

```env
VITE_API_URL=http://localhost:5001
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

*(Note: In production deployments on Vercel, the same environment variables are configured in the Vercel Dashboard, omitting `VITE_API_URL` to allow relative origin routing).*

### 2. Start the Backend API
Open a terminal and navigate to the `server/` directory:

```bash
cd server
npm install
node index.js
```
The backend server runs locally on `http://localhost:5001`.

### 3. Start the Frontend Client
Open a second terminal and navigate to the `client/` directory:

```bash
cd client
npm install
npm run dev
```
The application will be accessible at `http://localhost:5173`.

---

## 🧪 Automated Unit Testing

The heuristic engine and its multilingual explanation outputs are validated using an automated CLI test suite.

Ensure the backend server is running (`node index.js`), then execute in a new terminal:

```bash
node server/test_analyser.js
```

The test runner validates the following scenarios:
1. **Phishing Bank SMS with Embedded HTTP Link (HU):** Verifies that the nested URL engine properly elevates text threat scores into the Suspicious/Phishing tier.
2. **High-Risk Calling Code (+234 Nigeria) (EN):** Verifies country code extraction and English XAI rule activation.
3. **Legitimate HTTPS Domain (RO):** Confirms low risk scoring with Romanian `Sigur` classification.
4. **Direct IP-Based Phishing Portal (EN):** Assesses cumulative technical URL heuristics and diagnostic reasoning chains.

---

## 🔒 Security & Implementation Standards

* **Deterministic White-Box Architecture:** Eliminates unexplainable black-box classification errors through verifiable heuristic matrices.
* **Secondary Auth Lifecycle Security:** Protects user sessions by ensuring that registration creates the Firestore profile without polluting the primary client auth session.
* **Score-First Dynamic Translation:** Eliminates display anomalies by deriving verdict classifications primarily from normalized score metrics before mapping localized language keys.
* **Client-Side Image Compression:** Profile photos are resized and compressed via the HTML5 Canvas API prior to transmission, saving Firestore storage bandwidth.
* **Standards-Compliant UTF-8 BOM CSV Exports:** Data exports are prepended with an explicit byte order mark to ensure special character fidelity in external spreadsheet applications.
