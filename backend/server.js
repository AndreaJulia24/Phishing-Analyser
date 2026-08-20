const express = require('express');
const cors = require('cors');
const {checkUrl} = require('./analyser');
require('dotenv').config();

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

//promise segedfuggveny api/history endpointhoz --SELECT muvelet
function allQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }   
        });
    });
}

app.get('/api/history', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) {
        return res.status(400).json({ error: 'Missing user_id parameter' });
    }
    try {
        const history = await allQuery('SELECT * FROM url_analyses WHERE user_id = ? ORDER BY created_at DESC', [user_id]);
        
        const formattedHistory = history.map(entry => ({
            id: entry.id,
            target_url: entry.target_url,   
            domain: entry.domain,
            ip_address: entry.ip_address,
            country: entry.country,
            city: entry.city,
            isp: entry.isp,
            latitude: entry.latitude,
            longitude: entry.longitude,
            security_score: entry.security_score,
            risk_score: entry.risk_score,
            verdict: entry.verdict,
            reasons: entry.reasons ? entry.reasons.split(',') : [],
            created_at: entry.created_at
        }));
        res.json(formattedHistory);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
