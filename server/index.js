const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5001;

// Middleware-ek
app.use(cors());
app.use(express.json());

// ==========================================
// A TE SAJÁT PHISHING ANALYSER ALGORITMUSOD
// ==========================================

function normalize(x, x_min, x_max) {
    if (x <= x_min) return 0.0;
    if (x >= x_max) return 1.0;
    return (x - x_min) / (x_max - x_min);
}

function isURL(data) {
    const urlPattern = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$/;
    return urlPattern.test(data);
}

function containsURL(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return urlPattern.test(text);
}

function extractURL(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlPattern);
    return match ? match[0] : null;
}

function extractDomain(url) {
    const domainPattern = /^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i;
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
    return url.startsWith("https://");
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

function countKeywords(text, keywords) {
    if (!text || !keywords) return 0;
    const lowerText = text.toLowerCase();
    let count = 0;
    for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
            count++;
        }
    }
    return count;
}

function countCallToAction(text, keywords) {
    return countKeywords(text, keywords);
}

// Szótárak
const SUSPICIOUS_KEYWORDS = ["urgent", "immediate", "act now", "limited time", "don't miss out", "verify", "surgetos", "azonnal"];
const FEAR_KEYWORDS = ["fear", "scare", "threat", "danger", "risk", "warning", "veszely", "figyelmeztetes"];
const AUTHORITY_KEYWORDS = ["official", "government", "authority", "police", "bank", "security", "rendorseg", "ugyintezes"];
const FINANCIAL_KEYWORDS = ["bank", "account", "credit", "debit", "payment", "transaction", "szamla", "fizetes", "utalas"];
const PERSONAL_INFO_KEYWORDS = ["password", "username", "social security", "personal information", "confidential", "jelszo", "felhasznalonev"];

// Technikai modul (URL heurisztikák: P1 - P7)
function evaluateUrlFeatures(url) {
    let flags = [];

    let raw_url_length = url.length;
    let normalized_url_length = normalize(raw_url_length, 20, 120);
    let P1 = normalized_url_length * 10;
    if (raw_url_length > 60) flags.push(`Hosszú URL cím (${raw_url_length} karakter)`);

    let domain = extractDomain(url) || '';
    let raw_domain_length = domain.length;
    let normalized_domain_length = normalize(raw_domain_length, 5, 40);
    let P2 = normalized_domain_length * 5;

    let raw_subdomain_count = countSubdomains(url);
    let normalized_subdomain_count = normalize(raw_subdomain_count, 0, 4);
    let P3 = normalized_subdomain_count * 15;
    if (raw_subdomain_count >= 2) flags.push(`Többszörös aldomain struktúra (${raw_subdomain_count} aldomain)`);

    let raw_suspicious_keyword_count = countKeywords(url, SUSPICIOUS_KEYWORDS);
    let normalized_suspicious_keyword_count = normalize(raw_suspicious_keyword_count, 0, 3);
    let P4 = normalized_suspicious_keyword_count * 20;
    if (raw_suspicious_keyword_count > 0) flags.push(`Gyanús kulcsszavak az URL-ben (${raw_suspicious_keyword_count} db)`);

    let normalized_ip_address = isIpAddress(domain) ? 1.0 : 0.0;
    let P5 = normalized_ip_address * 25;
    if (normalized_ip_address === 1.0) flags.push('Közvetlen IP-cím használata domain név helyett');

    let raw_special_char_count = countSpecialCharacters(url);
    let normalized_special_char_count = normalize(raw_special_char_count, 0, 5);
    let P6 = normalized_special_char_count * 10;
    if (raw_special_char_count > 3) flags.push(`Magas speciális karakterszám (${raw_special_char_count} db)`);

    let normalized_https = hasHttps(url) ? 0.0 : 1.0;
    let P7 = normalized_https * 15;
    if (normalized_https === 1.0) flags.push('Hiányzó HTTPS titkosítás (nem biztonságos HTTP protokoll)');

    const score = P1 + P2 + P3 + P4 + P5 + P6 + P7;
    return { score, flags };
}

// Fő Elemző Vezérlő (PhishingAnalyser)
function PhishingAnalyser(target_data) {
    let R_URL = 0.0;
    let R_TEXT = 0.0;
    let allFlags = [];
    let detectedType = '';

    if (isURL(target_data)) {
        detectedType = 'URL';
        const urlEval = evaluateUrlFeatures(target_data);
        R_URL = urlEval.score;
        allFlags.push(...urlEval.flags);
    } else {
        detectedType = 'Szöveges üzenet';
        let text = target_data;

        let raw_text_length = text.length;
        let normalized_text_length = normalize(raw_text_length, 50, 200);
        let T1 = normalized_text_length * 5;

        let urgency_count = countKeywords(text, SUSPICIOUS_KEYWORDS);
        let normalized_urgency_count = normalize(urgency_count, 0, 3);
        let T2 = normalized_urgency_count * 15;
        if (urgency_count > 0) allFlags.push(`Sürgető hangvétel és határidőre utaló kifejezések (${urgency_count} db)`);

        let raw_fear_count = countKeywords(text, FEAR_KEYWORDS);
        let normalized_fear_count = normalize(raw_fear_count, 0, 3);
        let T3 = normalized_fear_count * 15;
        if (raw_fear_count > 0) allFlags.push(`Félelemkeltő és fenyegető szavak észlelése (${raw_fear_count} db)`);

        let authority_count = countKeywords(text, AUTHORITY_KEYWORDS);
        let normalized_authority_count = normalize(authority_count, 0, 3);
        let T4 = normalized_authority_count * 10;
        if (authority_count > 0) allFlags.push(`Hatósági vagy hivatalos intézményre való hivatkozás (${authority_count} db)`);

        let financial_count = countKeywords(text, FINANCIAL_KEYWORDS);
        let normalized_financial_count = normalize(financial_count, 0, 3);
        let T5 = normalized_financial_count * 15;
        if (financial_count > 0) allFlags.push(`Pénzügyi és számlaműveletekkel kapcsolatos felszólítás (${financial_count} db)`);

        let call_to_action_count = countCallToAction(text, AUTHORITY_KEYWORDS);
        let normalized_call_to_action_count = normalize(call_to_action_count, 0, 2);
        let T6 = normalized_call_to_action_count * 10;

        let personal_info_count = countKeywords(text, PERSONAL_INFO_KEYWORDS);
        let normalized_personal_info_count = normalize(personal_info_count, 0, 3);
        let T7 = normalized_personal_info_count * 20;
        if (personal_info_count > 0) allFlags.push(`Bizalmas személyes adat vagy jelszó bekérése (${personal_info_count} db)`);

        let uppercase_ratio = countUppercaseRatio(text);
        let normalized_uppercase_ratio = normalize(uppercase_ratio, 0.0, 0.5);
        let T8 = normalized_uppercase_ratio * 5;
        if (uppercase_ratio > 0.25) allFlags.push(`Szokatlanul magas csupa nagybetűs arány (${Math.round(uppercase_ratio * 100)}%)`);

        let norm_url_text = 0.0;
        if (containsURL(text)) {
            norm_url_text = 1.0;
            let extracted_url = extractURL(text);
            const embeddedUrlEval = evaluateUrlFeatures(extracted_url);
            R_URL = embeddedUrlEval.score;
            allFlags.push(`Beágyazott URL detektálva: ${extracted_url}`);
            allFlags.push(...embeddedUrlEval.flags);
        }
        let T9 = norm_url_text * 5;

        R_TEXT = T1 + T2 + T3 + T4 + T5 + T6 + T7 + T8 + T9;
    }

    // Végső pontszám aggregáció (max aggregáció a jegyzeted szerint)
    let risk_score = Math.max(R_URL, R_TEXT);
    risk_score = Math.min(risk_score, 100);

    // Kategória besorolás a diagramod szerint:
    // <= 30 Legitim, 31 - 70 Suspicious, > 70 Phishing
    let verdict = "";
    if (risk_score <= 30) {
        verdict = "Legitim";
    } else if (risk_score <= 70) {
        verdict = "Suspicious";
    } else {
        verdict = "Phishing";
    }

    return {
        target_data,
        type: detectedType,
        risk_score: Number(risk_score.toFixed(2)),
        verdict: verdict,
        flags: allFlags.length > 0 ? allFlags : ['Nem találtunk gyanús indikátort (tiszta adat).'],
        breakdown: {
            url_score: Number(R_URL.toFixed(2)),
            text_score: Number(R_TEXT.toFixed(2))
        }
    };
}

// REST API Végpontok
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Phishing Analyser API szerver fut!' });
});

// A központi /api/analyze végpont a Sequence és Architecture diagramok szerint
app.post('/api/analyze', (req, res) => {
    const { targetData } = req.body;

    if (!targetData || !targetData.trim()) {
        return res.status(400).json({ error: 'Kérlek adj meg egy URL-t vagy szöveget!' });
    }

    const result = PhishingAnalyser(targetData.trim());
    return res.json(result);
});

app.listen(PORT, () => {
    console.log(`Backend szerver fut a http://localhost:${PORT} cimen`);
});