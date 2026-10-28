import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Ikonok beimportálása
import encryptedIcon from './assets/icons/encrypted.png';
import analyserIcon from './assets/icons/analyser.png';
import notesIcon from './assets/icons/note.png';

function App() {
  const [activeTab, setActiveTab] = useState('analyser');
  const [serverStatus, setServerStatus] = useState('Kapcsolódás...');
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchHistory = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/history');
      setHistory(res.data);
    } catch (err) {
      console.error('Előzmények betöltési hiba:', err);
    }
  };

  useEffect(() => {
    axios.get('http://localhost:5001/api/health')
      .then((res) => setServerStatus(res.data.message))
      .catch(() => setServerStatus('Nem sikerült kapcsolódni a szerverhez.'));
    fetchHistory();
  }, []);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setErrorMsg('Kérlek adj meg egy URL-t vagy szöveget!');
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
      fetchHistory();
    } catch (err) {
      console.error(err);
      setErrorMsg('Hiba történt az elemzés során.');
    } finally {
      setLoading(false);
    }
  };

  // Dinamikus inline stílusok a kockázati kategóriákhoz
  const getBadgeStyle = (verdict) => {
    if (verdict === 'Phishing') return { bg: '#ffeef0', border: '#f85149', text: '#da3633' };
    if (verdict === 'Suspicious') return { bg: '#fff8c5', border: '#d29922', text: '#9e6a03' };
    return { bg: '#dafbe1', border: '#3fb950', text: '#238636' };
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header-section">
        <div className="header-icon">
          <img src={encryptedIcon} alt="Shield Icon" className="ui-icon-header" />
        </div>
        <div>
          <h1 className="header-title">Phishing Analyser</h1>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <nav className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'analyser' ? 'active' : ''}`}
          onClick={() => setActiveTab('analyser')}
        >
          <img src={analyserIcon} alt="Analyser" className="ui-icon-tab" />
          Elemző (Dashboard)
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => { setActiveTab('history'); fetchHistory(); }}
        >
          <img src={notesIcon} alt="History" className="ui-icon-tab" />
          Előzmények ({history.length})
        </button>
      </nav>
      {/* 1. TAB: PHISHING ANALYSER */}
      {activeTab === 'analyser' && (
        <section>
          <form className="analyser-form" onSubmit={handleAnalyze}>
            <textarea
              className="analyser-textarea"
              rows={4}
              placeholder="Másolj be egy ellenőrizendő URL-t, SMS-t vagy gyanús e-mail szöveget..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Elemzés folyamatban...' : 'Vizsgálat indítása'}
            </button>
          </form>

          {errorMsg && <div className="error-banner">{errorMsg}</div>}

          {result && (
            <div
              className="result-card"
              style={{
                backgroundColor: getBadgeStyle(result.verdict).bg,
                border: `1px solid ${getBadgeStyle(result.verdict).border}`,
                color: '#24292f'
              }}
            >
              <div className="result-card-header">
                <h3 style={{ margin: 0, color: getBadgeStyle(result.verdict).text }}>
                  Besorolás: {result.verdict}
                </h3>
                <span style={{ fontSize: '1.25rem', fontWeight: '700', color: getBadgeStyle(result.verdict).text }}>
                  {result.risk_score} / 100 pont
                </span>
              </div>

              <p className="result-type-tag">
                <strong>Észlelt típus:</strong> {result.type}
              </p>

              <h4 className="xai-title">XAI Magyarázat (Aktivált szabályok):</h4>
              <ul className="xai-list">
                {result.flags.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* 2. TAB: SCAN HISTORY */}
      {activeTab === 'history' && (
        <section>
          {history.length === 0 ? (
            <div className="history-table-wrapper empty-state">
              Még nem történt vizsgálat ebben a munkamenetben.
            </div>
          ) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Idő</th>
                    <th>Típus</th>
                    <th>Vizsgált tartalom</th>
                    <th>Pontszám</th>
                    <th>Besorolás</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td style={{ color: '#8b949e', whiteSpace: 'nowrap' }}>{item.timestamp}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{item.type}</td>
                      <td className="truncate-text">{item.target_data}</td>
                      <td style={{ fontWeight: '700' }}>{item.risk_score}</td>
                      <td>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            display: 'inline-block',
                            backgroundColor: getBadgeStyle(item.verdict).bg,
                            color: getBadgeStyle(item.verdict).text,
                            border: `1px solid ${getBadgeStyle(item.verdict).border}`
                          }}
                        >
                          {item.verdict}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default App;