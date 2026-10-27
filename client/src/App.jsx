import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [serverStatus, setServerStatus] = useState('Kapcsolódás...');
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Szerver állapotának ellenőrzése
  useEffect(() => {
    axios.get('http://localhost:5001/api/health')
      .then((res) => setServerStatus(res.data.message))
      .catch(() => setServerStatus('Nem sikerült kapcsolódni a szerverhez.'));
  }, []);

  // Elemzés indítása a te saját motoroddal
  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setErrorMsg('Kérlek írj be egy szöveget vagy másolj be egy linket!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setResult(null);

    try {
      const response = await axios.post('http://localhost:5001/api/analyze', {
        targetData: inputText
      });
      setResult(response.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Hiba történt az elemzés során.');
    } finally {
      setLoading(false);
    }
  };

  // Kockázati szint színének meghatározása
  const getBadgeStyle = (verdict) => {
    if (verdict === 'Phishing') return { bg: '#ffeef0', border: '#f85149', text: '#da3633' };
    if (verdict === 'Suspicious') return { bg: '#fff8c5', border: '#d29922', text: '#9e6a03' };
    return { bg: '#dafbe1', border: '#3fb950', text: '#238636' };
  };

  return (
    <div style={{ maxWidth: '750px', margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: '0 20px' }}>
      <h2>🛡️ Phishing Analyser</h2>
      <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '20px' }}>
        Szerver: <strong>{serverStatus}</strong>
      </p>

      <form onSubmit={handleAnalyze} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <textarea
          rows={4}
          placeholder="Másolj be egy gyanús URL-t, SMS-t vagy e-mail szöveget..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '1rem',
            borderRadius: '6px',
            border: '1px solid #444',
            backgroundColor: '#1e1e1e',
            color: '#fff',
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            alignSelf: 'flex-start',
            padding: '10px 24px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            backgroundColor: '#238636',
            color: 'white',
            border: 'none',
            borderRadius: '6px'
          }}
        >
          {loading ? 'Elemzés folyamatban...' : 'Vizsgálat indítása'}
        </button>
      </form>

      {errorMsg && <p style={{ color: '#f85149', marginTop: '15px' }}>{errorMsg}</p>}

      {result && (
        <div style={{
          marginTop: '30px',
          padding: '20px',
          borderRadius: '8px',
          border: `1px solid ${getBadgeStyle(result.verdict).border}`,
          backgroundColor: getBadgeStyle(result.verdict).bg,
          color: '#24292f'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: getBadgeStyle(result.verdict).text }}>
              Besorolás: {result.verdict}
            </h3>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: getBadgeStyle(result.verdict).text }}>
              {result.risk_score} / 100 pont
            </span>
          </div>

          <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#57606a' }}>
            <strong>Észlelt típus:</strong> {result.type}
          </p>

          <h4 style={{ margin: '15px 0 5px 0' }}>XAI Magyarázat (Észlelt szabályok):</h4>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            {result.flags.map((flag, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>{flag}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;