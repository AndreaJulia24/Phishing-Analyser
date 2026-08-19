# 🛡️ Phishing Analyser & Security Intelligence Platform
An OSINT-driven full-stack cybersecurity application designed to detect, analyze, and mitigate malicious URLs, typosquatting domains, and social engineering attacks. 
The project bridges technical threat intelligence with behavioral security awareness.

## ✨ Key Features
**OSINT Threat Investigation:** Gathers domain, DNS, and IP geolocation metadata in real time.
* **Multi-Engine Blacklist Scanning:** Integrates with VirusTotal API v3 to cross-reference global threat databases.
* **Custom Risk Scoring Engine:** Evaluates URL anomalies, high-risk TLDs, keyword spoofing, and certificate trust indicators to produce a dynamic `Risk Score` (0–100) and `Security Score`.
* **Visual Threat Intelligence:** Maps server geolocation data and displays threat vectors.
* **Gamified Phishing-IQ Training:** Interactive awareness module with real-time feedback and leaderboard tracking to educate users against social engineering attacks.

* ## 🛠️ Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** SQLite3
* **OSINT & Intelligence:** VirusTotal API v3, IP-API, Native DNS Module
* **Frontend:** React, Tailwind CSS *(In Development)*
