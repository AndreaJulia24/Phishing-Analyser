require('dotenv').config();

const express = require('express');
const cors = require('cors');
const checkUrl = require('./analyser');

//adatbazissal osszekapcsolodas
const db = require('./database');

const port = process.env.PORT || 3000;
const app=express();

//middleware-ek amelyek lehetove teszik a JSON adatokat es a CORS(frontend-backend)kommunikaciot
app.use(cors());
app.use(express.json());

//Promise segedfuggveny a db.run-hoz
function runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
}

app.get('/api/check-url', async (req, res) => {
    const { url, user_id } = req.query;
    if (!url || !user_id) {
        return res.status(400).json({ error: 'Missing url or user_id parameter' });
    }
    try{
        const analysisResult = await checkUrl(url);
        //adatbazisba mentes
        const insertQuery = `INSERT INTO url_analyses (user_id, target_url, domain, ip_address, country, city, isp, latitude, longitude, security_score, risk_score, verdict, reasons)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await runQuery(insertQuery, [user_id, url, analysisResult.domain, analysisResult.ip_address, analysisResult.country, analysisResult.city, analysisResult.isp, analysisResult.latitude, analysisResult.longitude, analysisResult.security_score, analysisResult.risk_score, analysisResult.verdict, analysisResult.reasons]);
        res.json(analysisResult);
    } catch (error) {
        console.error('Error checking URL:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
