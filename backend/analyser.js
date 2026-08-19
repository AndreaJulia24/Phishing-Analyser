require('dotenv').config();

const axios= require('axios');
const dns=require('dns').promises;
const {calculateRiskScore} = require('./riskScore');

async function checkUrl(rawURL) {
    try{
        console.log("\nStarted analising...\n");
        console.log("Testing URL: ", rawURL);

        //domain validation
        const url = new URL(rawURL);
        const domain = url.hostname;
        console.log("Domain: ", domain);

        //IP address with DNS lookup
        const ipAddress = await dns.lookup(domain);
        console.log("IP Address: ", ipAddress.address);

        //Ip geolocation for the detective map
        const geoResponse = await axios.get(`http://ip-api.com/json/${ipAddress.address}`);
        const geoData = geoResponse.data;
        console.log("Geolocation Data: ", geoData);

        //results
        console.log("Country: ", geoData.country || "No country information available");
        console.log("City: ", geoData.city || "No city information available");
        console.log("ISP: ", geoData.org || "No ISP information available");
        console.log("Latitude: ", geoData.lat || "No latitude information available");
        console.log("Longitude: ", geoData.lon || "No longitude information available");

        //VirusTotal API check
        let isBlacklisted = false;
        const apiKey = process.env.VIRUSTOTAL_API_KEY;
        if (!apiKey) {
            console.error("VirusTotal API key is not set in the environment variables.");
            return;
        }
        try{
            const VTurl = `https://www.virustotal.com/api/v3/domains/${domain}`;
            const VTresponse = await axios.get(VTurl, {
                headers: {
                    'x-apikey': apiKey
                }
                });

            const stats = VTresponse.data.data.attributes.last_analysis_stats;
            console.log("VirusTotal Malicious Count: ", stats.malicious);
            console.log("VirusTotal Suspicious Count: ", stats.suspicious);

            if (stats.malicious > 0 || stats.suspicious > 0) {
                isBlacklisted = true;
            }
        } catch (error) {
            console.error("Error fetching data from VirusTotal: ", error.message);
        }

        //HTTP status code
        try{
            const response = await axios.get(rawURL);
            console.log("HTTP Status Code: ", response.status);
        } catch (error) {
            console.error("Error fetching HTTP status code: ", error.message);
        }

        //risk analysis
        const analysisData = {
            isNewDomain: false, // Placeholder for actual domain age check , WHOIS API can be used for this purpose
            isBlacklisted: isBlacklisted,
            isSuspiciousLocation: false // Placeholder for actual geolocation risk check, can be implemented based on a list of high-risk countries
        };

        const riskResult = calculateRiskScore(analysisData);
        console.log("Risk Analysis Result: ", riskResult);

        console.log("----Final Risk Result----");
        console.log("Security Score: ", riskResult.securityScore);
        console.log("Risk Score: ", riskResult.riskScore);
        console.log("Verdict: ", riskResult.verdict);
        console.log("Reasons: ", riskResult.reasons.join(", "));

    } catch (error) {
        console.error("Error during URL analysis: ", error.message);
    }
}

checkUrl("https://www.instagm.com");
