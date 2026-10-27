# 🛡️ Phishing Analyser

Egy hibrid, magyarázható (XAI – Explainable AI) adathalászat-detektáló és kiberbiztonsági platform, amely valós időben elemzi a gyanús webcímeket (URL), valamint szöveges üzeneteket (SMS, e-mail).

A rendszer szabályalapú, determinisztikus heurisztikákra (White-Box) és természetes nyelvfeldolgozásra épül, amely nemcsak kockázati pontszámot kalkulál, hanem tételes indoklást is nyújt az észlelt biztonsági fenyegetésekről.

---

## 🚀 Főbb funkciók

- **URL Strukturális Elemzés (Technikai modul - P1–P7):**
  - Webcím hosszának vizsgálata normalizált skálán ($P_1$)
  - Domain hossz ellenőrzése ($P_2$)
  - Többszörös és manipulatív aldomainek felderítése ($P_3$)
  - Adathalász kulcsszavak szűrése a linkben ($P_4$)
  - Közvetlen IP-cím használatának felismerése domain név helyett ($P_5$)
  - Gyanús és speciális karakterek gyakorisága ($P_6$)
  - Hiányzó SSL / HTTPS titkosítás detektálása ($P_7$)

- **Szemantikai & Pszichológiai Szövegelemzés (Üzenet modul - T1–T9):**
  - Üzenethossz kiértékelése ($T_1$)
  - Sürgető hangnem és időnyomás felismerése ($T_2$)
  - Félelemkeltő, fenyegető kifejezések azonosítása ($T_3$)
  - Hatósági és banki intézményekkel való visszaélés detektálása ($T_4$)
  - Pénzügyi és tranzakciós kulcsszavak szűrése ($T_5$)
  - Cselekvésre ösztönző minták felismerése ($T_6$)
  - Bizalmas adatok és jelszavak bekérésének észlelése ($T_7$)
  - Szokatlanul magas nagybetű-arány detektálása ($T_8$)
  - Szövegbe ágyazott hivatkozások kinyerése és mélyelemzése ($T_9$)

- **Explainable AI (XAI) & Kockázati Besorolás:**
  - $0\text{–}100$ közötti normalizált összesített kockázati pontszám (`risk_score`)
  - **Legitim** ($\le 30$ pont)
  - **Suspicious** ($31\text{–}70$ pont)
  - **Phishing** ($> 70$ pont)
  - Tételes szabálybontás és magyarázó lista a felhasználói felületen.

---

## 🏗️ Rendszerarchitektúra

A projekt háromrétegű (3-Tier) kliens-szerver modellt követ:

```text
phishing-analyser/
├── client/              # Frontend (React 18, Vite, Axios)
│   ├── src/
│   │   ├── App.jsx      # Felhasználói felület és eredmény-megjelenítés
│   │   └── App.css
        └── index.css
        └── main.jsx
    └── index.html
│   └── package.json
├── server/              # Backend (Node.js, Express REST API)
│   ├── index.js         # Phishing Analyser heurisztikai motor és végpontok
│   └── package.json
├── .gitignore           # Gyökérszintű Git kizárások
└── README.md

```
## 🛠️ Telepítés és Futtatás

### Előfeltételek
- Node.js (v18+)
- npm csomagkezelő

### 1. Backend indítása
A projekt gyökeréből nyiss egy terminált:

```bash
cd server
npm install
node index.js

```
### 2. Frontend indítása

```bash
cd client
npm install
npm run dev