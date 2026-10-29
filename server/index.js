const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const MESSAGES = require('./messages');

const app = express();
const PORT = process.env.PORT || 5001; // A tárhelyszolgáltató (pl. Render) a PORT változóban adja meg a portot

let scanHistory = [];

app.use(cors());
app.use(express.json());

// ==========================================
// KÜLSŐ JSON ADATOK BETÖLTÉSE
// ==========================================

let HIGH_RISK_COUNTRY_CODES = [];
const phoneDataPath = path.join(__dirname, 'data', 'phone_fraud.json');
try {
    HIGH_RISK_COUNTRY_CODES = JSON.parse(fs.readFileSync(phoneDataPath, 'utf-8'));
    console.log(`[Adatbázis] Sikeresen betöltve ${HIGH_RISK_COUNTRY_CODES.length} db kockázatos országkód.`);
} catch (err) {
    console.error('[Adatbázis] Hiba a telefonszám adatbázis betöltésekor:', err.message);
}

const PREMIUM_RATE_PREFIXES = ["0900", "0903", "089", "+40900", "+3690"];

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
    console.log('[Adatbázis] Kiberbiztonsági szótárak sikeresen betöltve a suspicious_keywords.json-ból.');
} catch (err) {
    console.error('[Adatbázis] Hiba a suspicious_keywords.json betöltésekor:', err.message);
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

function isPhoneNumber(data) {
    const cleaned = data.trim().replace(/[\s\-\(\)\.]/g, '');
    const phonePattern = /^(\+?[0-9]{7,15})$/;
    return phonePattern.test(cleaned);
}

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
function evaluateUrlFeatures(url, t) {
    let flags = [];

    let raw_url_length = url.length;
    let P1 = normalize(raw_url_length, 20, 120) * 10;
    if (raw_url_length > 60) flags.push(t.urlLong(raw_url_length));

    let domain = extractDomain(url) || '';
    let P2 = normalize(domain.length, 5, 40) * 5;

    let raw_subdomain_count = countSubdomains(url);
    let P3 = normalize(raw_subdomain_count, 0, 4) * 15;
    if (raw_subdomain_count >= 2) flags.push(t.urlSubdomains(raw_subdomain_count));

    let raw_suspicious_keyword_count = countKeywords(url, DICTIONARIES.suspicious);
    let P4 = normalize(raw_suspicious_keyword_count, 0, 3) * 20;
    if (raw_suspicious_keyword_count > 0) flags.push(t.urlKeywords(raw_suspicious_keyword_count));

    let norm_ip = isIpAddress(domain) ? 1.0 : 0.0;
    let P5 = norm_ip * 25;
    if (norm_ip === 1.0) flags.push(t.urlIp);

    let raw_special_char_count = countSpecialCharacters(url);
    let P6 = normalize(raw_special_char_count, 0, 5) * 10;
    if (raw_special_char_count > 3) flags.push(t.urlSpecialChars(raw_special_char_count));

    let norm_https = hasHttps(url) ? 0.0 : 1.0;
    let P7 = norm_https * 15;
    if (norm_https === 1.0) flags.push(t.urlNoHttps);

    const score = P1 + P2 + P3 + P4 + P5 + P6 + P7;
    return { score: Number(score.toFixed(2)), flags };
}

// ==========================================
// 2. TELEFONSZÁM MODUL (PH1 - PH6)
// ==========================================
function evaluatePhoneFeatures(phoneStr, t) {
    let flags = [];
    const raw = phoneStr.trim();
    
    const normalizedPhone = raw.replace(/[\s\-\(\)\.]/g, '');
    const digitsOnly = raw.replace(/\D/g, '');

    let matchedCountry = HIGH_RISK_COUNTRY_CODES
        .sort((a, b) => b.code.length - a.code.length)
        .find(item => normalizedPhone.startsWith(item.code));

    let norm_PH1 = matchedCountry ? 1.0 : 0.0;
    let PH1 = norm_PH1 * 30;
    if (norm_PH1 === 1.0) {
        flags.push(t.phoneHighRiskZone(matchedCountry.code, matchedCountry.country));
        flags.push(t.phoneXaiReason(matchedCountry.reason));
    }

    let isPremium = PREMIUM_RATE_PREFIXES.some(prefix => normalizedPhone.startsWith(prefix) || digitsOnly.startsWith(prefix.replace(/\D/g, '')));
    let norm_PH2 = isPremium ? 1.0 : 0.0;
    let PH2 = norm_PH2 * 25;
    if (norm_PH2 === 1.0) flags.push(t.phonePremium);

    let norm_PH3 = normalizedPhone.startsWith('+') ? 0.0 : 1.0;
    let PH3 = norm_PH3 * 10;
    if (norm_PH3 === 1.0) flags.push(t.phoneNoPlus);

    let lenDiff = 0;
    if (digitsOnly.length < 9) lenDiff = 9 - digitsOnly.length;
    else if (digitsOnly.length > 12) lenDiff = digitsOnly.length - 12;
    let PH4 = normalize(lenDiff, 0, 4) * 15;
    if (lenDiff > 0) flags.push(t.phoneLengthDiff(digitsOnly.length));

    let repeatCount = countRepeatedPatterns(digitsOnly);
    let PH5 = normalize(repeatCount, 0, 3) * 10;
    if (repeatCount > 0) flags.push(t.phoneSyntheticPattern(repeatCount));

    const specialChars = (raw.match(/[^0-9+\s\-()]/g) || []).length;
    let PH6 = normalize(specialChars, 0, 3) * 10;
    if (specialChars > 0) flags.push(t.phoneNonNumeric(specialChars));

    const totalScore = PH1 + PH2 + PH3 + PH4 + PH5 + PH6;
    return {
        score: Number(Math.min(totalScore, 100).toFixed(2)),
        flags: flags.length > 0 ? flags : [t.phoneClean],
        breakdown: {
            phone_score: Number(totalScore.toFixed(2))
        }
    };
}

// ==========================================
// 3. SZÖVEG ELEMZŐ MODUL (T1 - T9)
// ==========================================
function evaluateTextFeatures(text, t) {
    let flags = [];
    let embeddedUrlScore = 0.0;

    let T1 = normalize(text.length, 50, 300) * 5;

    let urgency_count = countKeywords(text, DICTIONARIES.suspicious);
    let T2 = normalize(urgency_count, 0, 3) * 15;
    if (urgency_count > 0) flags.push(t.textUrgent(urgency_count));

    let fear_count = countKeywords(text, DICTIONARIES.fear);
    let T3 = normalize(fear_count, 0, 3) * 15;
    if (fear_count > 0) flags.push(t.textFear(fear_count));

    let authority_count = countKeywords(text, DICTIONARIES.authority);
    let T4 = normalize(authority_count, 0, 3) * 10;
    if (authority_count > 0) flags.push(t.textAuthority(authority_count));

    let financial_count = countKeywords(text, DICTIONARIES.financial);
    let T5 = normalize(financial_count, 0, 3) * 15;
    if (financial_count > 0) flags.push(t.textFinancial(financial_count));

    let call_to_action_count = countKeywords(text, ["click the link", "click here", "verify your account", "restore access"]);
    let T6 = normalize(call_to_action_count, 0, 2) * 10;
    if (call_to_action_count > 0) flags.push(t.textCta(call_to_action_count));

    let personal_info_count = countKeywords(text, DICTIONARIES.personal_info);
    let T7 = normalize(personal_info_count, 0, 3) * 20;
    if (personal_info_count > 0) flags.push(t.textPersonalInfo(personal_info_count));

    let uppercase_ratio = countUppercaseRatio(text);
    let T8 = normalize(uppercase_ratio, 0.0, 0.4) * 5;
    if (uppercase_ratio > 0.2) flags.push(t.textUppercase(Math.round(uppercase_ratio * 100)));

    // Beágyazott linkek vizsgálata
    let urls = extractURLs(text);
    let T9 = 0.0;
    if (urls.length > 0) {
        T9 = 5.0;
        flags.push(t.textEmbeddedUrls(urls.length));
        urls.forEach(u => {
            const urlEval = evaluateUrlFeatures(u, t);
            embeddedUrlScore = Math.max(embeddedUrlScore, urlEval.score);
            flags.push(t.textLinkCheck(u, urlEval.flags.join(', ')));
        });
    }

    // Beágyazott telefonszámok vizsgálata
    let embeddedPhoneScore = 0.0;
    let phones = extractPhoneNumbers(text);
    if (phones && phones.length > 0) {
        phones.forEach(p => {
            const phoneEval = evaluatePhoneFeatures(p, t);
            if (phoneEval && typeof phoneEval.score === 'number' && phoneEval.score > 0) {
                embeddedPhoneScore = Math.max(embeddedPhoneScore, phoneEval.score);
                if (Array.isArray(phoneEval.flags)) {
                    flags.push(t.textPhoneCheck(p, phoneEval.flags.join(', ')));
                }
            }
        });
    }

    let pureText = T1 + T2 + T3 + T4 + T5 + T6 + T7 + T8 + T9;
    let finalScore = pureText;
    if (embeddedUrlScore > 0) {
        finalScore = Math.max(finalScore, embeddedUrlScore) + (pureText * 0.5);
    }
    if (embeddedPhoneScore > 0) {
        finalScore = Math.max(finalScore, embeddedPhoneScore) + (pureText * 0.5);
    }
    finalScore = Math.min(100, Math.max(pureText, finalScore));

    return {
        totalScore: Number(finalScore.toFixed(2)),
        pureTextScore: Number(pureText.toFixed(2)),
        embeddedUrlScore: Number(embeddedUrlScore.toFixed(2)),
        embeddedPhoneScore: Number(embeddedPhoneScore.toFixed(2)),
        flags
    };
}

// ==========================================
// 4. E-MAIL ELEMZŐ MODUL
// ==========================================
function evaluateEmailFeatures(rawEmail, t) {
    let flags = [];
    let senderScore = 0.0;

    const fromMatch = rawEmail.match(/from:\s*([^\r\n]+)/i);
    if (fromMatch) {
        const fromHeader = fromMatch[1].trim();
        flags.push(t.emailSenderIdentified(fromHeader));

        if (fromHeader.toLowerCase().includes("paypai") || fromHeader.includes("@paypaI")) {
            senderScore += 35.0;
            flags.push(t.emailTyposquatting);
        }
        if (fromHeader.includes("verify") || fromHeader.includes("security-update")) {
            senderScore += 15.0;
            flags.push(t.emailSuspiciousDomain);
        }
    }

    const subjectMatch = rawEmail.match(/subject:\s*([^\r\n]+)/i);
    let subjectScore = 0.0;
    if (subjectMatch) {
        const subject = subjectMatch[1].trim();
        flags.push(t.emailSubjectAnalyzed(subject));
        if (subject.includes("!") || subject.toUpperCase() === subject) {
            subjectScore += 10.0;
            flags.push(t.emailUrgentSubject);
        }
    }

    const textEval = evaluateTextFeatures(rawEmail, t);
    flags.push(...textEval.flags);

    const baseTextScore = textEval.pureTextScore || 0;
    let totalScore = Math.max(
        baseTextScore + senderScore + subjectScore,
        textEval.embeddedUrlScore,
        textEval.embeddedPhoneScore
    );
    totalScore = Math.min(totalScore, 100);

    return {
        score: Number(totalScore.toFixed(2)),
        flags,
        breakdown: {
            text_score: Number(baseTextScore.toFixed(2)),
            phone_score: Number(textEval.embeddedPhoneScore.toFixed(2)),
            url_score: Number(textEval.embeddedUrlScore.toFixed(2)),
            sender_score: Number(senderScore.toFixed(2))
        }
    };
}

// ==========================================
// A FŐ ALGORITMUS
// ==========================================
function PhishingAnalyser(target_data, lang = 'hu') {
    const cleanLang = (lang && typeof lang === 'string') ? lang.toLowerCase().slice(0, 2) : 'hu';
    const selectedLang = ['hu', 'en', 'ro'].includes(cleanLang) ? cleanLang : 'hu';
    const t = MESSAGES[selectedLang];

    let risk_score = 0.0;
    let allFlags = [];
    let detectedType = '';
    let breakdown = {};

    const cleanInput = target_data.trim();

    if (isPhoneNumber(cleanInput)) {
        detectedType = t.typePhone;
        const res = evaluatePhoneFeatures(cleanInput, t);
        risk_score = res.score;
        allFlags = res.flags;
        breakdown = res.breakdown;
    } else if (isEmailFormat(cleanInput)) {
        detectedType = t.typeEmail;
        const res = evaluateEmailFeatures(cleanInput, t);
        risk_score = res.score;
        allFlags = res.flags;
        breakdown = res.breakdown;
    } else if (isURL(cleanInput)) {
        detectedType = t.typeUrl;
        const res = evaluateUrlFeatures(cleanInput, t);
        risk_score = res.score;
        allFlags = res.flags;
        breakdown = { url_score: res.score };
    } else {
        detectedType = t.typeText;
        const res = evaluateTextFeatures(cleanInput, t);
        risk_score = res.totalScore;
        allFlags = res.flags;
        breakdown = { 
            text_score: res.pureTextScore, 
            url_score: res.embeddedUrlScore, 
            phone_score: res.embeddedPhoneScore 
        };
    }

    risk_score = Math.min(risk_score, 100);

    let verdict = "";
    if (risk_score <= 30) {
        verdict = t.verdictSafe;
    } else if (risk_score <= 70) {
        verdict = t.verdictSuspicious;
    } else {
        verdict = t.verdictPhishing;
    }

    return {
        target_data: cleanInput,
        type: detectedType,
        risk_score: Number(risk_score.toFixed(2)),
        verdict,
        flags: allFlags.length > 0 ? allFlags : [t.cleanIndicators],
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

app.delete('/api/history', (_req, res) => {
    scanHistory = [];
    return res.json({ message: 'Az előzmények sikeresen törölve lettek.' });
});

app.delete('/api/history/:id', (req, res) => {
    const idToDelete = Number(req.params.id);
    scanHistory = scanHistory.filter(item => item.id !== idToDelete);
    return res.json({ message: 'A rekord sikeresen törölve lett.' });
});

app.post('/api/analyze', (req, res) => {
    try {
        const { targetData, lang } = req.body;
        console.log(`[Elemzés kérés] Nyelv érkezett: "${lang}", Cél adat: "${targetData?.slice(0, 30)}..."`);

        if (!targetData || !targetData.trim()) {
            return res.status(400).json({ error: 'Kérlek adj meg bemeneti adatot!' });
        }
        console.log(`[Elemzés] Cél adat: "${targetData.trim()}"`);
        const result = PhishingAnalyser(targetData, lang);

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
    console.log(`Backend szerver fut a http://localhost:${PORT} cimen [HU, EN, RO támogatással]`);
});