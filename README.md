# 🛡️ Phishing Analyser & Cybersecurity Operations Platform

Egy teljes körű, hibrid, magyarázható (XAI – Explainable AI) adathalászat-detektáló és kiberbiztonsági platform, amely valós időben elemzi a gyanús webcímeket (URL), szöveges üzeneteket (SMS), beérkező e-maileket, valamint nemzetközi és prémium tarifás hívószámokat.

A rendszer szabályalapú, determinisztikus heurisztikákra (White-Box) és természetes nyelvfeldolgozásra épül. Nem csupán egy összesített $0\text{--}100$ közötti normalizált kockázati pontszámot (`risk_score`) kalkulál, hanem tételes, többnyelvű indoklást nyújt az aktivált biztonsági indikátorokról, mindezt valós idejű, aszinkron szinkronizációval és szerepkör-alapú jogosultságkezeléssel (RBAC).

---

## 🚀 Főbb funkciók és modulok

### 1. URL Strukturális & Technikai Elemzés ($P_1\text{--}P_7$)
- **$P_1$ – Hossz vizsgálata:** Hosszú, obfuszkált URL-címek kiszűrése normalizált skálán.
- **$P_2$ – Domain hossz:** Szokatlanul hosszú regisztrált domainek ellenőrzése.
- **$P_3$ – Aldomain halmozás:** Többszörös és manipulatív aldomain-struktúrák észlelése.
- **$P_4$ – Adathalász kulcsszavak:** Kiberbiztonsági szótár alapú vizsgálat az URL-ben (`login`, `verify`, `paypal`, `secure`, stb.).
- **$P_5$ – Közvetlen IP-cím:** Domain helyett közvetlen IPv4-cím használatának felismerése.
- **$P_6$ – Speciális karakterek:** Szokatlan karaktergyakoriság (`@`, `-`, `_`, `%`, `?`).
- **$P_7$ – Titkosítás ellenőrzése:** Hiányzó HTTPS / SSL titkosítás azonnali büntetése.

### 2. Szemantikai & Pszichológiai Szövegelemzés ($T_1\text{--}T_9$)
- **$T_1$ – Üzenethossz:** Karakter- és szóméret normalizált kiértékelése.
- **$T_2$ – Sürgető hangnem:** Időnyomásra és haladéktalan cselekvésre utaló kifejezések felismerése.
- **$T_3$ – Félelemkeltés:** Fiókfelfüggesztéssel, büntetéssel és fenyegetéssel kapcsolatos kifejezések azonosítása.
- **$T_4$ – Hatósági / Banki tekintély:** Hivatalos szervek, felügyelet vagy biztonsági csapat megszemélyesítése.
- **$T_5$ – Pénzügyi direktívák:** Számlazárolással, utalással és kártyaműveletekkel kapcsolatos felszólítások.
- **$T_6$ – Cselekvésre ösztönzés (CTA):** Közvetlen kattintásra ösztönző minták felismerése.
- **$T_7$ – Adathalászat és jelszószerzés:** Hitelesítő adatok és személyes információk bekérésének észlelése.
- **$T_8$ – Agresszív formázás:** Szokatlanul magas nagybetű-arány (CAPS LOCK) detektálása.
- **$T_9$ – Beágyazott elemek vizsgálata:** Szövegből kinyert linkek és telefonszámok mélyelemzése és súlyozott beolvasztása az összkockázatba.

### 3. Nemzetközi & Prémium Telefonszám Elemzés ($PH_1\text{--}PH_6$)
- **$PH_1$ – Magas kockázatú zónák:** Kockázatos hívószámok és VoIP zónák azonosítása külső adatbázisból (`phone_fraud.json`, pl. +234 Nigéria).
- **$PH_2$ – Prémium tarifák:** Emelt díjas előhívók (`0900`, `+40900`, `+3690`) azonnali kiszűrése (Wangiri-védelem).
- **$PH_3$ – Formátumjelzés:** Nemzetközi formátumjelző (`+`) hiányának detektálása.
- **$PH_4$ – Hossz-eltérés:** A szabványos ITU E.164 formátumtól való számlenghossz-eltérés vizsgálata.
- **$PH_5$ – Szintetikus mintázatok:** Ismétlődő számsorok és generált szekvenciák (`1234`, `0000`) felderítése.
- **$PH_6$ – Nem-numerikus anomáliák:** Gyanús karakterek és formázási trükkök azonosítása.

### 4. E-mail Fejléc & Typosquatting Elemzés
- **From fejléc elemzés:** Feladó azonosítása és legitimációjának ellenőrzése.
- **Typosquatting detektálás:** Vizuálisan hasonló, homoglif vagy karaktercserés hamisítások felismerése (pl. `paypaI` nagy `I` betűvel).
- **Tárgymező vizsgálat:** Pánikkeltő, felkiáltójeles vagy csupa nagybetűs sürgetés szűrése.
- **Kombinált kiértékelés:** A levéltörzs, a beágyazott linkek és a feladói heurisztikák súlyozott egyesítése.

### 5. Explainable AI (XAI) & Kockázati Besorolások
- Normalizált pontszám: $0\text{--}100\text{ pont}$ közötti skála részpontszám-bontással (URL, SMS/Szöveg, Telefon, Feladó).
- **Biztonságos (Safe / Sigur):** $0\text{--}30\text{ pont}$ (Zöld kártya)
- **Gyanús (Suspicious / Suspect):** $31\text{--}70\text{ pont}$ (Sárga kártya)
- **Adathalász (Phishing):** $71\text{--}100\text{ pont}$ (Piros kártya)
- Tételes, emberileg olvasható XAI szabálymagyarázatok az összes aktivált pontszámhoz.

### 6. Háromnyelvű Nemzetköziesítés (HU, EN, RO)
- Teljes UI lokalizáció `i18next` segítségével (magyar, angol, román).
- A backend heurisztikus motor külön moduláris szótárból (`messages.js`) állítja elő az XAI indoklásokat az aktív nyelven.
- **F5 nélküli valós idejű szinkronizáció:** Nyelvváltáskor a már kint lévő elemzési kártya is azonnal, élőben újraértékelődik és lefordul.
- Többnyelvű CSV naplóexport UTF-8 BOM kódolással és lefordított fejlécekkel/értékekkel.

### 7. Felhasználókezelés, Előzmények & SOC Dashboard
- **Firebase Authentication & Firestore:** Bejelentkezés, regisztráció, profilkép feltöltés és tömörítés.
- **Szerepkör-alapú hozzáférés (RBAC):**
  - **Felhasználó (User):** Elemző funkció, interaktív Kiberbiztonsági Kvíz (30 kérdés véletlenszerű keveréssel mindhárom nyelven), saját vizsgálati előzmények.
  - **Rendszergazda (Admin):** Teljes vizsgálati napló törlési joggal és globális CSV exporttal, valamint kiberbiztonsági SOC műveleti központ (Dashboard interaktív SVG radarral, Security Score mérővel és kockázati mutatókkal).
- **Reszponzív dizájn & Témák:** Sötét és világos mód támogatása, valamint kifejezetten mobil képernyőkre (Box Model padding/margin) optimalizált felület.

---

## 🏗️ Rendszerarchitektúra

```text
phishing-analyser/
├── client/                     # Frontend (React 18, Vite, i18next, Firebase SDK)
│   ├── src/
│   │   ├── assets/             # SVG és PNG ikonok, illusztrációk
│   │   ├── data/
│   │   │   └── quizData.json   # 30 db 3-nyelvű kiberbiztonsági kérdés és magyarázat
│   │   ├── AdminStats.jsx      # SOC műveleti központ és SVG radar dashboard (Admin)
│   │   ├── AdminStats.css      # SOC dashboard stílusok és reszponzivitás
│   │   ├── App.jsx             # Főalkalmazás, navigáció, állapotkezelés és elemző felület
│   │   ├── App.css             # Általános elrendezés, Box Model és reszponzív stílusok
│   │   ├── Auth.jsx            # Bejelentkező és regisztrációs felület
│   │   ├── firebase.js         # Firebase Auth és Firestore konfiguráció
│   │   ├── i18n.js             # i18next kliens oldali fordítási szótárak (HU, EN, RO)
│   │   ├── LightMode.css       # Világos téma felülírásai
│   │   ├── Quiz.jsx            # Interaktív tudatossági kvíz komponens
│   │   ├── Quiz.css            # Kvíz animációk és opció stílusok
│   │   └── main.jsx            # Belépési pont
│   ├── index.html
│   └── package.json
├── server/                     # Backend (Node.js, Express REST API)
│   ├── data/
│   │   ├── phone_fraud.json    # Kockázatos nemzetközi körzetek és csalási indoklások
│   │   └── suspicious_keywords.json # Pszichológiai és adathalász szótárak kategóriánként
│   ├── index.js                # Express API szerver és determinisztikus heurisztikai motor
│   ├── messages.js             # Többnyelvű XAI magyarázat-generátor modul (HU, EN, RO)
│   ├── test_analyser.js        # Automatizált CLI unit teszt keretrendszer
│   └── package.json
└── README.md
```

---

## 🛠️ Telepítés és Futtatás

### Előfeltételek
- **Node.js** (v18 vagy újabb ajánlott)
- **npm** csomagkezelő
- Érvényes **Firebase Projekt** (Authentication és Firestore engedélyezve)

### 1. Környezeti változók beállítása (Frontend)
Hozz létre a `client/` mappában egy `.env` fájlt az alábbi struktúrával:

```env
VITE_API_URL=http://localhost:5001
VITE_FIREBASE_API_KEY=a_te_firebase_api_kulcsod
VITE_FIREBASE_AUTH_DOMAIN=a_projekted.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=a_projekted_id
VITE_FIREBASE_STORAGE_BUCKET=a_projekted.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=sender_id
VITE_FIREBASE_APP_ID=app_id
```

### 2. Backend indítása
Nyiss egy terminált és lépj be a szerver könyvtárába:

```bash
cd server
npm install
node index.js
```
A szerver alapértelmezetten a `http://localhost:5001` címen fogadja a kéréseket.

### 3. Frontend indítása
Nyiss egy másik terminált és indítsd el a klienst:

```bash
cd client
npm install
npm run dev
```
A felhasználói felület a `http://localhost:5173` címen érhető el a böngészőben.

---

## 🧪 Automatizált Unit Tesztek

A heurisztikai motor pontosságát és a többnyelvű válaszokat egy önálló automatizált tesztelő modul ellenőrzi. 

Miközben fut a backend szerver (`node index.js`), futtasd le a tesztcsomagot:

```bash
node server/test_analyser.js
```

A teszt az alábbi forgatókönyveket vizsgálja automatikusan:
1. **Csaló banki SMS beágyazott HTTP linkkel (HU):** Ellenőrzi, hogy a beágyazott link súlyozottan megemeli-e az SMS kockázatát, elérve a gyanús/adathalász szintet.
2. **Kockázatos nemzetközi szám (+234 Nigéria) (EN):** Ellenőrzi a körzetazonosítást és az angol nyelvű XAI zászlók generálását.
3. **Tiszta, legitim URL (RO):** Ellenőrzi az alacsony pontszámot és a román nyelvű `Sigur` besorolást.
4. **Közvetlen IP-cím alapú adathalász link (EN):** Ellenőrzi a technikai URL szabályok kumulatív pontszámítását és az XAI indoklási láncot.

---

## 🔒 Biztonsági és Adatkezelési Megfontolások
- **Determinisztikus kiértékelés (White-Box):** A döntési folyamat minden lépése transzparens, ellenőrizhető és szabályokhoz kötött, kizárva a neurális hálók "feketedoboz" tévesztéseit.
- **Kliensoldali képtömörítés:** A feltöltött profilképek még a hálózati küldés előtt Canvas API segítségével optimalizálásra kerülnek a Firestore adatbázis tehermentesítése érdekében.
- **UTF-8 BOM CSV Export:** A táblázatos letöltések kompatibilisek a Microsoft Excel és egyéb irodai szoftverek speciális karakterkezelésével.