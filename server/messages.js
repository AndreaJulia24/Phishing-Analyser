const MESSAGES = {
  hu: {
    // Típusok & Besorolások
    typePhone: "Telefonszám",
    typeEmail: "E-mail",
    typeUrl: "URL",
    typeText: "Szöveges üzenet",
    verdictSafe: "Biztonságos",
    verdictSuspicious: "Gyanús",
    verdictPhishing: "Adathalász",
    cleanIndicators: "Nem találtunk gyanús indikátort.",

    // URL modul (P1 - P7)
    urlLong: (len) => `Hosszú URL cím (${len} karakter)`,
    urlSubdomains: (count) => `Többszörös aldomain struktúra (${count} aldomain)`,
    urlKeywords: (count) => `Gyanús kulcsszavak az URL-ben (${count} db)`,
    urlIp: "Közvetlen IP-cím használata domain név helyett",
    urlSpecialChars: (count) => `Magas speciális karakterszám az URL-ben (${count} db)`,
    urlNoHttps: "Hiányzó HTTPS titkosítás",

    // Telefonszám modul (PH1 - PH6)
    phoneHighRiskZone: (code, country) => `PH1: Magas kockázatú körzet / VoIP zóna (${code} - ${country})`,
    phoneXaiReason: (reason) => `XAI Indoklás: ${reason}`,
    phonePremium: "PH2: Emelt díjas (prémium tarifás) előhívószám",
    phoneNoPlus: "PH3: Nemzetközi formátumjelző (+) hiánya",
    phoneLengthDiff: (len) => `PH4: Eltérés a szabványos számlenghossztól (${len} digit)`,
    phoneSyntheticPattern: (count) => `PH5: Szintetikus mintázat észlelve (${count} ismétlődés)`,
    phoneNonNumeric: (count) => `PH6: Gyanús nem-numerikus karakterek (${count} db)`,
    phoneClean: "Standard, érvényes telefonszám (tiszta adat).",

    // Szöveg modul (T1 - T9)
    textUrgent: (count) => `Sürgető hangvétel és határidőre utaló kifejezések (${count} db)`,
    textFear: (count) => `Félelemkeltő és fenyegető szavak észlelése (${count} db)`,
    textAuthority: (count) => `Hivatalos szervre vagy biztonsági csapatra való hivatkozás (${count} db)`,
    textFinancial: (count) => `Pénzügyi és fiókműveletekkel kapcsolatos felszólítás (${count} db)`,
    textCta: (count) => `Közvetlen cselekvésre ösztönző felhívás (${count} db)`,
    textPersonalInfo: (count) => `Azonosító vagy fiók-hitelesítés kérése (${count} db)`,
    textUppercase: (pct) => `Figyelemfelkeltő nagybetűhasználat (${pct}%)`,
    textEmbeddedUrls: (count) => `Beágyazott link(ek) azonosítva (${count} db)`,
    textLinkCheck: (url, flags) => `Link ellenőrzés [${url}]: ${flags}`,
    textPhoneCheck: (phone, flags) => `Beágyazott telefonszám vizsgálat [${phone}]: ${flags}`,

    // E-mail modul
    emailSenderIdentified: (sender) => `Feladó azonosítva: ${sender}`,
    emailTyposquatting: "Kritikus: Feladói e-mail cím typosquatting hamisítás (paypaI - nagy 'I' betűvel az 'l' helyett!)",
    emailSuspiciousDomain: "Gyanús domaintag a feladó címében",
    emailSubjectAnalyzed: (subject) => `Tárgy mező elemzése: "${subject}"`,
    emailUrgentSubject: "Sürgető írásjelek és formázás a tárgyban"
  },

  en: {
    // Types & Verdicts
    typePhone: "Phone number",
    typeEmail: "Email",
    typeUrl: "URL",
    typeText: "Text message",
    verdictSafe: "Safe",
    verdictSuspicious: "Suspicious",
    verdictPhishing: "Phishing",
    cleanIndicators: "No suspicious indicators detected.",

    // URL module (P1 - P7)
    urlLong: (len) => `Long URL address (${len} characters)`,
    urlSubdomains: (count) => `Multiple subdomain structure (${count} subdomains)`,
    urlKeywords: (count) => `Suspicious keywords in URL (${count} matches)`,
    urlIp: "Direct IP address used instead of domain name",
    urlSpecialChars: (count) => `High special character count in URL (${count} characters)`,
    urlNoHttps: "Missing HTTPS encryption",

    // Phone module (PH1 - PH6)
    phoneHighRiskZone: (code, country) => `PH1: High-risk caller / VoIP zone (${code} - ${country})`,
    phoneXaiReason: (reason) => `XAI Reasoning: ${reason}`,
    phonePremium: "PH2: Premium-rate / toll fraud prefix",
    phoneNoPlus: "PH3: Missing international prefix indicator (+)",
    phoneLengthDiff: (len) => `PH4: Deviation from standard telephone length (${len} digits)`,
    phoneSyntheticPattern: (count) => `PH5: Synthetic number pattern detected (${count} repetitions)`,
    phoneNonNumeric: (count) => `PH6: Suspicious non-numeric characters (${count} items)`,
    phoneClean: "Standard, verified telephone number (clean record).",

    // Text module (T1 - T9)
    textUrgent: (count) => `Urgent tone and deadline manipulation terms (${count} items)`,
    textFear: (count) => `Fear-inducing and threatening language detected (${count} items)`,
    textAuthority: (count) => `Impersonation of official authorities or security staff (${count} items)`,
    textFinancial: (count) => `Financial demands or account action directives (${count} items)`,
    textCta: (count) => `Direct call-to-action indicators (${count} items)`,
    textPersonalInfo: (count) => `Credential or personal information harvesting request (${count} items)`,
    textUppercase: (pct) => `Aggressive capital letter usage (${pct}%)`,
    textEmbeddedUrls: (count) => `Embedded link(s) detected (${count} items)`,
    textLinkCheck: (url, flags) => `Link verification [${url}]: ${flags}`,
    textPhoneCheck: (phone, flags) => `Embedded phone scan [${phone}]: ${flags}`,

    // Email module
    emailSenderIdentified: (sender) => `Sender identified: ${sender}`,
    emailTyposquatting: "Critical: Sender email typosquatting detected (paypaI - capital 'I' mimicking 'l'!)",
    emailSuspiciousDomain: "Suspicious domain keyword in sender address",
    emailSubjectAnalyzed: (subject) => `Subject line inspected: "${subject}"`,
    emailUrgentSubject: "Urgent punctuation and formatting in subject line"
  },

  ro: {
    // Tipuri & Verdicte
    typePhone: "Număr telefon",
    typeEmail: "E-mail",
    typeUrl: "URL",
    typeText: "Mesaj text",
    verdictSafe: "Sigur",
    verdictSuspicious: "Suspect",
    verdictPhishing: "Phishing",
    cleanIndicators: "Nu s-au identificat indicatori suspecți.",

    // Modul URL (P1 - P7)
    urlLong: (len) => `Adresă URL lungă (${len} caractere)`,
    urlSubdomains: (count) => `Structură de subdomenii multiple (${count} subdomenii)`,
    urlKeywords: (count) => `Cuvinte-cheie suspecte în URL (${count} potriviri)`,
    urlIp: "Adresă IP directă utilizată în locul unui nume de domeniu",
    urlSpecialChars: (count) => `Număr ridicat de caractere speciale în URL (${count} caractere)`,
    urlNoHttps: "Lipsește criptarea HTTPS securizată",

    // Modul Telefon (PH1 - PH6)
    phoneHighRiskZone: (code, country) => `PH1: Zonă cu risc ridicat / prefix VoIP (${code} - ${country})`,
    phoneXaiReason: (reason) => `Justificare XAI: ${reason}`,
    phonePremium: "PH2: Prefix cu suprataxă (tarif premium)",
    phoneNoPlus: "PH3: Lipsă indicator format internațional (+)",
    phoneLengthDiff: (len) => `PH4: Abatere de la lungimea standard a numărului (${len} cifre)`,
    phoneSyntheticPattern: (count) => `PH5: Tipar sintetic de număr detectat (${count} repetiții)`,
    phoneNonNumeric: (count) => `PH6: Caractere non-numerice suspecte (${count} elemente)`,
    phoneClean: "Număr standard, validat (date sigure).",

    // Modul Text (T1 - T9)
    textUrgent: (count) => `Ton urgent și expresii de constrângere de timp (${count} elemente)`,
    textFear: (count) => `Limbaj amenințător și inducere de panică detectate (${count} elemente)`,
    textAuthority: (count) => `Referire suspectă la autorități sau echipe de securitate (${count} elemente)`,
    textFinancial: (count) => `Instrucțiuni legate de operațiuni financiare și conturi (${count} elemente)`,
    textCta: (count) => `Îndemn direct la acțiune imediată (${count} elemente)`,
    textPersonalInfo: (count) => `Solicitare de date de identificare sau date confidențiale (${count} elemente)`,
    textUppercase: (pct) => `Utilizare excesivă a literelor mari (${pct}%)`,
    textEmbeddedUrls: (count) => `Link(uri) integrate identificate (${count} elemente)`,
    textLinkCheck: (url, flags) => `Verificare link [${url}]: ${flags}`,
    textPhoneCheck: (phone, flags) => `Scanare număr integrat [${phone}]: ${flags}`,

    // Modul E-mail
    emailSenderIdentified: (sender) => `Expeditor identificat: ${sender}`,
    emailTyposquatting: "Critic: Falsificare typosquatting a adresei expeditorului (paypaI - cu 'I' mare în loc de 'l'!)",
    emailSuspiciousDomain: "Segment de domeniu suspect în adresa expeditorului",
    emailSubjectAnalyzed: (subject) => `Analiză câmp subiect: "${subject}"`,
    emailUrgentSubject: "Punctuație urgentă și formatare agresivă în subiect"
  }
};

module.exports = MESSAGES;