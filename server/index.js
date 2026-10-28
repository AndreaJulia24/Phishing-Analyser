const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5001;

let scanHistory = [];

app.use(cors());
app.use(express.json());

// ==========================================
// KULSO JSON ADATOK BETÖLTÉSE ÉS KONFIGURÁCIÓ
// ==========================================

// 1. Telefonszám prefix adatbázis betöltése
let HIGH_RISK_COUNTRY_CODES = [];
const phoneDataPath = path.join(__dirname, 'data', 'phone_fraud.json');
try {
    HIGH_RISK_COUNTRY_CODES = JSON.parse(fs.readFileSync(phoneDataPath, 'utf-8'));
    console.log(`[Adatbázis] Sikeresen betöltve ${HIGH_RISK_COUNTRY_CODES.length} db kockázatos országkód.`);
} catch (err) {
    console.error('[Adatbázis] Hiba a telefonszám adatbázis betöltésekor:', err.message);
}

const PREMIUM_RATE_PREFIXES = ["0900", "0903", "089", "+40900", "+3690"];

// 2. Kiberbiztonsági Szótárak betöltése kizárólag a JSON-ból
let DICTIONARIES = {
    suspicious: [],
    fear: [],
    authority: [],
    financial: [],
    personal_info: []
};

const dictPath = path.join(__dirname, 'data', 'suspicious_keywords.json');
try {
    DICTIONARIES = JSON.parse(fs.readFileSync(dictPath, 'utf-8'));
    console.log('[Adatbazis] Kiberbiztonsági szótárak sikeresen betöltve a suspicious_keywords.json-ból.');
} catch (err) {
    console.error('[Adatbazis] Hiba a suspicious_keywords.json betöltésekor:', err.message);
}

// ==========================================
// SEGÉDFÜGGVÉNYEK & NORMALIZÁLÁS
// ==========================================

function normalize(x, x_min, x_max) {
    if (x <= x_min) return 0.0;
    if (x >= x_max) return 1.0;
    return (x - x_min) / (x_max - x_min);
}

function isURL(data) {
    const urlPattern = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$/i;
    return urlPattern.test(data.trim());
}

function containsURL(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/gi;
    return urlPattern.test(text);
}

function extractURLs(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/gi;
    return text.match(urlPattern) || [];
}

function extractPhoneNumbers(text) {
    const phonePattern = /(\+?[0-9]{1,4}[\s\-]*(?:\([0-9]{1,4}\)[\s\-]*)?[0-9]{2,4}[\s\-]?[0-9]{2,4}[\s\-]?[0-9]{2,4})/g;
    const matches = text.match(phonePattern) || [];
    return matches.filter(p => p.replace(/\D/g, '').length >= 7);
}

function extractDomain(url) {
    const domainPattern = /^(?:https?:\/\/)?(?:www\.)?([^\/:]+)/i;
    const match = url.match(domainPattern);
    return match ? match[1] : null;
}

function countSubdomains(url) {
    const domain = extractDomain(url);
    if (!domain) return 0;
    const subdomainParts = domain.split('.');
    const count = subdomainParts.length - 2;
    return count > 0 ? count : 0;
}

function isIpAddress(domain) {
    if (!domain) return false;
    const ipPattern = /^(?:\d{1,3}\.){3}\d{1,3}$/;
    return ipPattern.test(domain);
}

function hasHttps(url) {
    return url.toLowerCase().startsWith("https://");
}

function countSpecialCharacters(url) {
    const specialCharPattern = /[!@#$%^&*(),.?":{}|<>]/g;
    const matches = url.match(specialCharPattern);
    return matches ? matches.length : 0;
}

function countUppercaseRatio(text) {
    const letters = (text.match(/[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]/g) || []).length;
    const uppercaseCount = (text.match(/[A-Z]/g) || []).length;
    return letters > 0 ? uppercaseCount / letters : 0;
}

function countKeywords(text, keywords = []) {
    if (!text || !keywords.length) return 0;
    const lowerText = text.toLowerCase();
    let count = 0;
    for (const kw of keywords) {
        if (lowerText.includes(kw.toLowerCase())) {
            count++;
        }
    }
    return count;
}

// Telefonszám felismerés
function isPhoneNumber(data) {
    const cleaned = data.trim().replace(/[\s\-\(\)\.]/g, '');
    const phonePattern = /^(\+?[0-9]{7,15})$/;
    return phonePattern.test(cleaned);
}

// E-mail formátum észlelése (From: vagy Subject: jelenléte)
function isEmailFormat(text) {
    const lower = text.toLowerCase();
    return (lower.includes("from:") || lower.includes("subject:") || lower.includes("to:"));
}

function countRepeatedPatterns(digits) {
    let repeats = 0;
    const matchSame = digits.match(/(.)\1{2,}/g);
    if (matchSame) repeats += matchSame.length;
    const sequences = ["0123", "1234", "2345", "3456", "4567", "5678", "6789"];
    for (const seq of sequences) {
        if (digits.includes(seq)) repeats++;
    }
    return repeats;
}

// ==========================================
// 1. TECHNIKAI URL MODUL (P1 - P7)
// ==========================================
function evaluateUrlFeatures(url) {
    let flags = [];

    let raw_url_length = url.length;
    let P1 = normalize(raw_url_length, 20, 120) * 10;
    if (raw_url_length > 60) flags.push(`Hosszú URL cím (${raw_url_length} karakter)`);

    let domain = extractDomain(url) || '';
    let P2 = normalize(domain.length, 5, 40) * 5;

    let raw_subdomain_count = countSubdomains(url);
    let P3 = normalize(raw_subdomain_count, 0, 4) * 15;
    if (raw_subdomain_count >= 2) flags.push(`Többszörös aldomain struktúra (${raw_subdomain_count} aldomain)`);

    let raw_suspicious_keyword_count = countKeywords(url, DICTIONARIES.suspicious);
    let P4 = normalize(raw_suspicious_keyword_count, 0, 3) * 20;
    if (raw_suspicious_keyword_count > 0) flags.push(`Gyanús kulcsszavak az URL-ben (${raw_suspicious_keyword_count} db)`);

    let norm_ip = isIpAddress(domain) ? 1.0 : 0.0;
    let P5 = norm_ip * 25;
    if (norm_ip === 1.0) flags.push('Közvetlen IP-cím használata domain név helyett');

    let raw_special_char_count = countSpecialCharacters(url);
    let P6 = normalize(raw_special_char_count, 0, 5) * 10;
    if (raw_special_char_count > 3) flags.push(`Magas speciális karakterszám az URL-ben (${raw_special_char_count} db)`);

    let norm_https = hasHttps(url) ? 0.0 : 1.0;
    let P7 = norm_https * 15;
    if (norm_https === 1.0) flags.push('Hiányzó HTTPS titkosítás');

    const score = P1 + P2 + P3 + P4 + P5 + P6 + P7;
    return { score: Number(score.toFixed(2)), flags };
}

// ==========================================
// 2. TELEFONSZAM MODUL (PH1 - PH6)
// ==========================================
// ==========================================
// 2. TELEFONSZÁM MODUL (PH1 - PH6)
// ==========================================
function evaluatePhoneFeatures(phoneStr) {
    let flags = [];
    const raw = phoneStr.trim();
    
    const normalizedPhone = raw.replace(/[\s\-\(\)\.]/g, '');
    const digitsOnly = raw.replace(/\D/g, '');

    // PH1: Wangiri / Egzotikus / Kaliforniai körzet ellenőrzése
    // A hosszabb prefixeket vizsgáljuk először, hogy a +1415 előbb találjon mint az esetleges +1
    let matchedCountry = HIGH_RISK_COUNTRY_CODES
        .sort((a, b) => b.code.length - a.code.length)
        .find(item => normalizedPhone.startsWith(item.code));

    let norm_PH1 = matchedCountry ? 1.0 : 0.0;
    let PH1 = norm_PH1 * 30;
    if (norm_PH1 === 1.0) {
        flags.push(`PH1: Magas kockázatú körzet / VoIP zóna (${matchedCountry.code} - ${matchedCountry.country})`);
        flags.push(`XAI Indoklás: ${matchedCountry.reason}`);
    }

    // PH2: Emelt díjas prefix
    let isPremium = PREMIUM_RATE_PREFIXES.some(prefix => normalizedPhone.startsWith(prefix) || digitsOnly.startsWith(prefix.replace(/\D/g, '')));
    let norm_PH2 = isPremium ? 1.0 : 0.0;
    let PH2 = norm_PH2 * 25;
    if (norm_PH2 === 1.0) flags.push('PH2: Emelt díjas (prémium tarifás) előhívószám');

    // PH3: Hiányzó + nemzetközi előtag
    let norm_PH3 = normalizedPhone.startsWith('+') ? 0.0 : 1.0;
    let PH3 = norm_PH3 * 10;
    if (norm_PH3 === 1.0) flags.push('PH3: Nemzetközi formátumjelző (+) hiánya');

    // PH4: Eltérés az optimális hossztól (9 - 12 digit)
    let lenDiff = 0;
    if (digitsOnly.length < 9) lenDiff = 9 - digitsOnly.length;
    else if (digitsOnly.length > 12) lenDiff = digitsOnly.length - 12;
    let PH4 = normalize(lenDiff, 0, 4) * 15;
    if (lenDiff > 0) flags.push(`PH4: Eltérés a szabványos számlenghossztól (${digitsOnly.length} digit)`);

    // PH5: Ismétlődő / szekvenciális minták
    let repeatCount = countRepeatedPatterns(digitsOnly);
    let PH5 = normalize(repeatCount, 0, 3) * 10;
    if (repeatCount > 0) flags.push(`PH5: Szintetikus mintázat észlelve (${repeatCount} ismétlődés)`);

    // PH6: Zavaró karakterek
    const specialChars = (raw.match(/[^0-9+\s\-()]/g) || []).length;
    let PH6 = normalize(specialChars, 0, 3) * 10;
    if (specialChars > 0) flags.push(`PH6: Gyanús nem-numerikus karakterek (${specialChars} db)`);

    const totalScore = PH1 + PH2 + PH3 + PH4 + PH5 + PH6;
    return {
        score: Number(Math.min(totalScore, 100).toFixed(2)),
        flags: flags.length > 0 ? flags : ['Standard, érvényes telefonszám (tiszta adat).'],
        breakdown: {
            phone_score: Number(totalScore.toFixed(2))
        }
    };
}

// ==========================================
// 3. STRUCTURED TEXT AND EMAIL ANALYSER (T1 - T9)
// ==========================================
function evaluateTextFeatures(text) {
    let flags = [];
    let embeddedUrlScore = 0.0;

    let T1 = normalize(text.length, 50, 300) * 5;

    let urgency_count = countKeywords(text, DICTIONARIES.suspicious);
    let T2 = normalize(urgency_count, 0, 3) * 15;
    if (urgency_count > 0) flags.push(`Sürgető hangvétel és határidőre utaló kifejezések (${urgency_count} db)`);

    let fear_count = countKeywords(text, DICTIONARIES.fear);
    let T3 = normalize(fear_count, 0, 3) * 15;
    if (fear_count > 0) flags.push(`Félelemkeltő és fenyegető szavak észlelése (${fear_count} db)`);

    let authority_count = countKeywords(text, DICTIONARIES.authority);
    let T4 = normalize(authority_count, 0, 3) * 10;
    if (authority_count > 0) flags.push(`Hivatalos szervre vagy biztonsági csapatra való hivatkozás (${authority_count} db)`);

    let financial_count = countKeywords(text, DICTIONARIES.financial);
    let T5 = normalize(financial_count, 0, 3) * 15;
    if (financial_count > 0) flags.push(`Pénzügyi és fiókműveletekkel kapcsolatos felszólítás (${financial_count} db)`);

    let call_to_action_count = countKeywords(text, ["click the link", "click here", "verify your account", "restore access"]);
    let T6 = normalize(call_to_action_count, 0, 2) * 10;
    if (call_to_action_count > 0) flags.push(`Közvetlen cselekvésre ösztönző felhívás (${call_to_action_count} db)`);

    let personal_info_count = countKeywords(text, DICTIONARIES.personal_info);
    let T7 = normalize(personal_info_count, 0, 3) * 20;
    if (personal_info_count > 0) flags.push(`Azonosító vagy fiók-hitelesítés kérése (${personal_info_count} db)`);

    let uppercase_ratio = countUppercaseRatio(text);
    let T8 = normalize(uppercase_ratio, 0.0, 0.4) * 5;
    if (uppercase_ratio > 0.2) flags.push(`Figyelemfelkeltő nagybetűhasználat (${Math.round(uppercase_ratio * 100)}%)`);

    // Beágyazott URL vizsgálat
    let urls = extractURLs(text);
    let T9 = 0.0;
    if (urls.length > 0) {
        T9 = 5.0;
        flags.push(`Beágyazott link(ek) azonosítva (${urls.length} db)`);
        urls.forEach(u => {
            const urlEval = evaluateUrlFeatures(u);
            embeddedUrlScore = Math.max(embeddedUrlScore, urlEval.score);
            flags.push(`Link ellenőrzés [${u}]: ${urlEval.flags.join(', ')}`);
        });
    }

   let embeddedPhoneScore = 0.0;
    let phones = extractPhoneNumbers(text);
    if (phones && phones.length > 0) {
        phones.forEach(p => {
            const phoneEval = evaluatePhoneFeatures(p);
            if (phoneEval && typeof phoneEval.score === 'number' && phoneEval.score > 0) {
                embeddedPhoneScore = Math.max(embeddedPhoneScore, phoneEval.score);
                if (Array.isArray(phoneEval.flags)) {
                    flags.push(`Beágyazott telefonszám vizsgálat [${p}]: ${phoneEval.flags.join(', ')}`);
                }
            }
        });
    }
    let textScore = T1 + T2 + T3 + T4 + T5 + T6 + T7 + T8 + T9;

    let finalScore = Math.max(textScore, embeddedUrlScore, embeddedPhoneScore);
    if (embeddedPhoneScore > 0 && textScore > 30) {
        finalScore = Math.min(finalScore + (embeddedPhoneScore * 0.4), 100);
    }

    return {
        textScore: Number(finalScore.toFixed(2)),
        embeddedUrlScore: Number(embeddedUrlScore.toFixed(2)),
        embeddedPhoneScore: Number(embeddedPhoneScore.toFixed(2)),
        flags
    };
}

// ==========================================
// 4. STRUCTURED EMAIL ANALYSER (From:, Subject:, Body:)
// ==========================================
function evaluateEmailFeatures(rawEmail) {
    let flags = [];
    let senderScore = 0.0;

    // Feladó kinyerése (From:)
    const fromMatch = rawEmail.match(/from:\s*([^\r\n]+)/i);
    if (fromMatch) {
        const fromHeader = fromMatch[1].trim();
        flags.push(`Feladó azonosítva: ${fromHeader}`);

        // Gyanús typosquatting vagy hamisítás vizsgálata
        if (fromHeader.toLowerCase().includes("paypai") || fromHeader.includes("@paypaI")) {
            senderScore += 35.0;
            flags.push("Kritikus: Feladói e-mail cím typosquatting hamisítás (paypaI - nagy 'I' betűvel az 'l' helyett!)");
        }
        if (fromHeader.includes("verify") || fromHeader.includes("security-update")) {
            senderScore += 15.0;
            flags.push("Gyanús domaintag a feladó címében");
        }
    }

    // Tárgy kinyerése (Subject:)
    const subjectMatch = rawEmail.match(/subject:\s*([^\r\n]+)/i);
    let subjectScore = 0.0;
    if (subjectMatch) {
        const subject = subjectMatch[1].trim();
        flags.push(`Tárgy mező elemzése: "${subject}"`);
        if (subject.includes("!") || subject.toUpperCase() === subject) {
            subjectScore += 10.0;
            flags.push("Sürgető írásjelek és formázás a tárgyban");
        }
    }

    // Szövegtörzs és linkek általános szemantikai vizsgálata
    const textEval = evaluateTextFeatures(rawEmail);
    flags.push(...textEval.flags);

    let totalScore = Math.max(textEval.textScore + senderScore + subjectScore, textEval.embeddedUrlScore, textEval.embeddedPhoneScore);
    totalScore = Math.min(totalScore, 100);

    return {
        score: Number(totalScore.toFixed(2)),
        flags,
        breakdown: {
            text_score: Number(textEval.textScore.toFixed(2)),
            phone_score: Number(textEval.embeddedPhoneScore.toFixed(2)),
            url_score: Number(textEval.embeddedUrlScore.toFixed(2)),
            sender_score: Number(senderScore.toFixed(2))
        }
    };
}

// ==========================================
// A FO ALGORITMUS (PhishingAnalyser)
// ==========================================
function PhishingAnalyser(target_data) {
    let risk_score = 0.0;
    let allFlags = [];
    let detectedType = '';
    let breakdown = {};

    const cleanInput = target_data.trim();

    if (isPhoneNumber(cleanInput)) {
        detectedType = 'Telefonszám';
        const res = evaluatePhoneFeatures(cleanInput);
        risk_score = res.score;
        allFlags = res.flags;
        breakdown = res.breakdown;
    } else if (isEmailFormat(cleanInput)) {
        detectedType = 'E-mail';
        const res = evaluateEmailFeatures(cleanInput);
        risk_score = res.score;
        allFlags = res.flags;
        breakdown = res.breakdown;
    } else if (isURL(cleanInput)) {
        detectedType = 'URL';
        const res = evaluateUrlFeatures(cleanInput);
        risk_score = res.score;
        allFlags = res.flags;
        breakdown = { url_score: res.score };
    } else {
        detectedType = 'Szöveges üzenet';
        const res = evaluateTextFeatures(cleanInput);
        risk_score = Math.max(res.textScore, res.embeddedUrlScore, res.embeddedPhoneScore);
        allFlags = res.flags;
        breakdown = { text_score: res.textScore, url_score: res.embeddedUrlScore, phone_score: res.embeddedPhoneScore };
    }

    risk_score = Math.min(risk_score, 100);

    let verdict = "";
    if (risk_score <= 30) {
        verdict = "Biztonságos";
    } else if (risk_score <= 70) {
        verdict = "Gyanús";
    } else {
        verdict = "Adathalász";
    }

    return {
        target_data: cleanInput,
        type: detectedType,
        risk_score: Number(risk_score.toFixed(2)),
        verdict,
        flags: allFlags.length > 0 ? allFlags : ['Nem találtunk gyanús indikátort.'],
        breakdown
    };
}

// REST API VÉGPONTOK
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', message: 'Phishing Analyser API szerver fut!' });
});

app.get('/api/history', (_req, res) => {
    res.json(scanHistory);
});

// teljes előzmény törlése
app.delete('/api/history', (_req, res) => {
    scanHistory = [];
    return res.json({ message: 'Az előzmények sikeresen törölve lettek.' });
});

// egyetlen elozmény rekord törlése ID alapján
app.delete('/api/history/:id', (req, res) => {
    const idToDelete = Number(req.params.id);
    scanHistory = scanHistory.filter(item => item.id !== idToDelete);
    return res.json({ message: 'A rekord sikeresen törölve lett.' });
});


// CSV export API végpont (Garantált ékezethelyes UTF-16LE formátum az Excelnek)
app.get('/api/export/csv', (_req, res) => {
    const headers = ["Idő", "Típus", "Vizsgált tartalom", "Kockázati pontszám", "Besorolás"];
    
    const rows = scanHistory.map(item => {
        const cleanContent = String(item.target_data || '')
            .replace(/[\r\n\t]+/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .replace(/"/g, '""')
            .trim();

        const time = String(item.timestamp || '').trim();
        const type = String(item.type || '').trim();
        const score = item.risk_score !== undefined ? item.risk_score : 0;
        const verdict = String(item.verdict || '').trim();

        // Szövegként formázás, hogy a telefonszám se váltson tudományos alakra
        const formattedContent = (type === 'Telefonszám') ? `="${cleanContent}"` : `"${cleanContent}"`;

        // Tabulátorral (\t) elválasztva az oszlopok nem csúsznak össze
        return `"${time}"\t"${type}"\t${formattedContent}\t"${score}"\t"${verdict}"`;
    });

    const headerRow = headers.map(h => `"${h}"`).join("\t");
    const fullText = [headerRow, ...rows].join("\r\n");

    // UTF-16LE BOM bájtok (0xFF, 0xFE) - ezt az Excel azonnal tökéletesen olvassa ékezetekkel együtt
    const bom = Buffer.from([0xFF, 0xFE]);
    const buffer = Buffer.concat([bom, Buffer.from(fullText, 'utf16le')]);

    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10);
    const formattedTime = now.toTimeString().slice(0, 5).replace(':', '-');
    const fileName = `phishing_history_${formattedDate}_${formattedTime}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-16le');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.end(buffer);
});

app.post('/api/analyze', (req, res) => {
    try {
        const { targetData } = req.body;
        if (!targetData || !targetData.trim()) {
            return res.status(400).json({ error: 'Kérlek adj meg bemeneti adatot!' });
        }

        const result = PhishingAnalyser(targetData);

        const historyItem = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }),
            target_data: targetData.trim(),
            type: result.type,
            risk_score: result.risk_score,
            verdict: result.verdict
        };
        scanHistory.unshift(historyItem);

        return res.json(result);
    } catch (err) {
        console.error('[Elemzési Hiba]', err);
        return res.status(500).json({ error: 'Hiba történt az elemzés során.', details: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Backend szerver fut a http://localhost:${PORT} cimen`);
});