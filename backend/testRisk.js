const {calculateRiskScore} = require('./riskScore');

const safeSiteData = {
    isNewDomain: false,
    isBlacklisted: false,
    isSuspiciousLocation: false
};

const maliciousSiteData = {
    isNewDomain: true,
    isBlacklisted: true,
    isSuspiciousLocation: true
};

const suspiciousSiteData = {
    isNewDomain: true,
    isBlacklisted: false,
    isSuspiciousLocation: true
};

console.log("Safe Site:", calculateRiskScore(safeSiteData));
console.log("Malicious Site:", calculateRiskScore(maliciousSiteData));
console.log("Suspicious Site:", calculateRiskScore(suspiciousSiteData));


console.log("------Safe Site Test------");
console.log("Safe Site:", calculateRiskScore(safeSiteData));
console.log("------Malicious Site Test------");
console.log("Malicious Site:", calculateRiskScore(maliciousSiteData));
console.log("------Suspicious Site Test------");
console.log("Suspicious Site:", calculateRiskScore(suspiciousSiteData));