import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

import encryptedIcon from './assets/icons/encrypted.png';
import analyserIcon from './assets/icons/analyser.png';
import notesIcon from './assets/icons/note.png';
import exportIcon from './assets/icons/export.png';

const API_BASE_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5001`;

function App() {
  const [activeTab, setActiveTab] = useState('analyser');
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/history`)
      setHistory(res.data);
    } catch (err) {
      console.error('Előzmények betöltési hiba:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setErrorMsg('Kérlek adj meg egy URL-t, SMS-t vagy telefonszámot!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setResult(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/analyze`, {
        targetData: inputText
      });
      setResult(response.data);
      fetchHistory();
    } catch (err) {
      console.error(err);
      setErrorMsg('Hiba történt az elemzés során. Ellenőrizd a backend kapcsolatot.');
    } finally {
      setLoading(false);
    }
  };

// CSV Exportálás közvetlenül a backendről (UC4)
  const handleExportCSV = () => {
    window.open(`${API_BASE_URL}/api/export/csv`, '_blank');
  }; 


  const getBadgeStyle = (verdict) => {
    if (verdict === 'Adathalász') return { bg: '#ffeef0', border: '#f85149', text: '#da3633' };
    if (verdict === 'Gyanús') return { bg: '#fff8c5', border: '#d29922', text: '#9e6a03' };
    return { bg: '#dafbe1', border: '#3fb950', text: '#238636' };
  };

  const getTypeBadgeClass = (type) => {
    if (type === 'Telefonszám') return 'type-badge phone';
    if (type === 'URL') return 'type-badge url';
    if (type === 'E-mail') return 'type-badge email';
    return 'type-badge text';
  };

  return (
    <div className="app-container">
      {/* Fejléc */}
      <header className="header-section">
        <div className="header-icon">
          <img src={encryptedIcon} alt="Shield Icon" className="ui-icon-header" />
        </div>
        <div>
          <h1 className="header-title">Phishing Analyser</h1>
        </div>
      </header>

      {/* Navigation tabs*/}
      <nav className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'analyser' ? 'active' : ''}`}
          onClick={() => setActiveTab('analyser')}
        >
          <img src={analyserIcon} alt="Analyser" className="ui-icon-tab" />
          Adathalász Elemző
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => { setActiveTab('history'); fetchHistory(); }}
        >
          <img src={notesIcon} alt="History" className="ui-icon-tab" />
          Előzmények ({history.length})
        </button>
      </nav>

      {/* 1. TAB: Phishing Analyser */}
      {activeTab === 'analyser' && (
        <section>
          <form className="analyser-form" onSubmit={handleAnalyze}>
            <textarea
              className="analyser-textarea"
              rows={4}
              placeholder="Másolj be egy ellenőrizendő URL-t, SMS-t, e-mail szöveget vagy gyanús nemzetközi telefonszámot..."
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
                <div>
                  <h3 style={{ margin: 0, color: getBadgeStyle(result.verdict).text }}>
                    Besorolás: {result.verdict}
                  </h3>
                  <div style={{ marginTop: '6px' }}>
                    <span className={getTypeBadgeClass(result.type)}>
                      {result.type}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '1.35rem', fontWeight: '700', color: getBadgeStyle(result.verdict).text }}>
                  {result.risk_score} / 100 pont
                </span>
              </div>

              {/* Részletes pontszám bontás (ha elérhető) */}
              {result.breakdown && (
                <div className="breakdown-container">
                  {result.breakdown.phone_score !== undefined && result.breakdown.phone_score > 0 && (
                    <span className="breakdown-pill">
                      Telefonszám kockázat: <strong>{result.breakdown.phone_score} pont</strong>
                    </span>
                  )}
                  {result.breakdown.url_score !== undefined && result.breakdown.url_score > 0 && (
                    <span className="breakdown-pill">
                      URL kockázat: <strong>{result.breakdown.url_score} pont</strong>
                    </span>
                  )}
                  {result.breakdown.text_score !== undefined && result.breakdown.text_score > 0 && (
                    <span className="breakdown-pill">
                      Szöveges kockázat: <strong>{result.breakdown.text_score} pont</strong>
                    </span>
                  )}
                  {result.breakdown.sender_score !== undefined && result.breakdown.sender_score > 0 && (
                    <span className="breakdown-pill">
                      Feladói kockázat: <strong>{result.breakdown.sender_score} pont</strong>
                    </span>
                  )}
                </div>
              )}

              <h4 className="xai-title">XAI Magyarázat (Aktivált szabályok és indoklások):</h4>
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
          <div className="history-header">
            <h3 className="history-title">Korábbi vizsgálatok naplója</h3>
            {history.length > 0 && (
              <button className="export-btn" onClick={handleExportCSV}>
                <img src={exportIcon} alt="Export" className="export-btn-icon" />
                Exportálás CSV-be
              </button>
            )}
          </div>

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
                      <td>
                        <span className={getTypeBadgeClass(item.type)}>
                          {item.type}
                        </span>
                      </td>
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