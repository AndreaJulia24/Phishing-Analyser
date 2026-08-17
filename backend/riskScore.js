function calculateRiskScore(analysisData) {
    let riskScore = 0;
    let reasons = [];

    if (analysisData.isNewDomain === true) {
        riskScore = riskScore + 30;
        reasons.push("Domain was registered recently (< 30 days old)");
    }

    if (analysisData.isBlacklisted === true) {
        riskScore = riskScore + 50;
        reasons.push("Target domain/IP is flagged on security blacklists");
    }

    if (analysisData.isSuspiciousLocation === true) {
        riskScore = riskScore + 20;
        reasons.push("Server is hosted in a high-risk or suspicious geolocation");
    }

    // Cap the risk score at a maximum of 100
    if (riskScore > 100) {
        riskScore = 100;
    }

    // Calculate Security Score (100 is safe, 0 is fully compromised)
    let securityScore = 100 - riskScore;

    // Determine verdict
    let verdict = "SAFE";
    if (riskScore >= 50) {
        verdict = "MALICIOUS";
    } else if (riskScore >= 20) {
        verdict = "SUSPICIOUS";
    }

    return {
        riskScore: riskScore,
        securityScore: securityScore,
        verdict: verdict,
        reasons: reasons
    };
}

module.exports = { calculateRiskScore };