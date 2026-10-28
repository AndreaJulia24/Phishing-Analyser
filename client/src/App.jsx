import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

import encryptedIcon from './assets/icons/encrypted.png';
import analyserIcon from './assets/icons/analyser.png';
import notesIcon from './assets/icons/note.png';
import exportIcon from './assets/icons/export.png';
import binIcon from './assets/icons/bin.png';

// Firebase modulok
import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  getDoc,
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Külön bejelentkező / regisztrációs oldal komponens
import Auth from './Auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5001`;

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userFullName, setUserFullName] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('analyser');
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Hitelesítési állapot figyelése indításkor és bejelentkezéskor
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const role = userDoc.exists() ? (userDoc.data().role || 'user') : 'user';
          const fullName = userDoc.exists() && userDoc.data().fullName ? userDoc.data().fullName : (user.displayName || user.email);
          
          setCurrentUser(user);
          setUserRole(role);
          setUserFullName(fullName);
        } catch (err) {
          console.error('Hiba a szerepkör lekérésekor:', err);
          setCurrentUser(user);
          setUserRole('user');
          setUserFullName(user.displayName || user.email);
        }
      } else {
        // Kijelentkezéskor mindent lenullázunk
        setCurrentUser(null);
        setUserRole(null);
        setUserFullName('');
        setHistory([]);
        setResult(null);
        setInputText('');
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Előzmények betöltése - CSAK ADMIN JOGOSULTSÁG ESETÉN
  const fetchHistory = async () => {
    if (userRole !== 'admin') return;

    try {
      const q = query(collection(db, 'history'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setHistory(items);
    } catch (err) {
      console.error('Firestore előzmények lekérési hiba:', err);
    }
  };

  useEffect(() => {
    if (currentUser && userRole === 'admin') {
      fetchHistory();
    }
  }, [currentUser, userRole]);

  // 3. Elemzés végrehajtása
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
      // Backend API hívás
      const response = await axios.post(`${API_BASE_URL}/api/analyze`, {
        targetData: inputText
      });
      setResult(response.data);

      const now = new Date();
      const timeStr = now.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });

      // Mentés Firestore-ba a felhasználó adataival összekötve
      await addDoc(collection(db, 'history'), {
        target_data: inputText.trim(),
        type: response.data.type,
        risk_score: response.data.risk_score,
        verdict: response.data.verdict,
        timestamp: timeStr,
        userId: currentUser ? currentUser.uid : 'vendeg',
        userName: userFullName || (currentUser ? currentUser.email : 'Ismeretlen'),
        userEmail: currentUser ? currentUser.email : 'Ismeretlen',
        createdAt: serverTimestamp()
      });

      // Ha admin végezte az elemzést, frissítjük a naplót
      if (userRole === 'admin') {
        fetchHistory();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Hiba történt az elemzés során. Ellenőrizd a kapcsolatot.');
    } finally {
      setLoading(false);
    }
  };

  // 4. CSV exportálás az Admin számára
  const handleExportCSV = async () => {
    try {
      const q = query(collection(db, 'history'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(docSnap => docSnap.data());

      if (items.length === 0) {
        alert('Nincs exportálható előzmény!');
        return;
      }

      const headers = ['"Idő"', '"Típus"', '"Vizsgált tartalom"', '"Kockázati pontszám"', '"Besorolás"', '"Felhasználó"'];

      const rows = items.map(item => [
        `"${item.timestamp || ''}"`,
        `"${item.type || ''}"`,
        `"${(item.target_data || '').replace(/"/g, '""')}"`,
        `"${item.risk_score || ''}"`,
        `"${item.verdict || ''}"`,
        `"${item.userName || item.userEmail || 'Vendég'}"`
      ]);

      const csvString = [
        headers.join(','),
        ...rows.map(e => e.join(','))
      ].join('\r\n');

      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, csvString], { type: 'text/csv;charset=utf-8;' });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `phishing_history_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Hiba a CSV exportálás közben:', err);
      alert('Nem sikerült az adatok exportálása.');
    }
  };

  // 5. Előzmények törlése az Admin számára
  const handleClearAllHistory = async () => {
    if (!window.confirm('Biztosan törölni szeretnéd a teljes vizsgálati naplót?')) return;
    try {
      const deletePromises = history.map(item => deleteDoc(doc(db, 'history', item.id)));
      await Promise.all(deletePromises);
      setHistory([]);
    } catch (err) {
      console.error('Hiba a Firestore törlésekor:', err);
    }
  };

  const handleDeleteItem = async (docId) => {
    try {
      await deleteDoc(doc(db, 'history', docId));
      setHistory(prev => prev.filter(item => item.id !== docId));
    } catch (err) {
      console.error('Hiba az elem törlésekor:', err);
    }
  };

  // ======================================
  //         KIJELENTKEZÉS FUNKCIÓ
  // ======================================

  const handleLogout = async () => {
    await signOut(auth);
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

  // Betöltési képernyő a kapcsolat felállásáig
  if (authLoading) {
    return <div style={{ color: '#fff', textAlign: 'center', marginTop: '50px' }}>Betöltés...</div>;
  }

  // HA NINCS BEJELENTKEZVE: CSAK AZ AUTH OLDAL JELENIK MEG!
  if (!currentUser) {
    return (
      <Auth 
        onLoginSuccess={(user, role, fullName) => {
          setCurrentUser(user);
          setUserRole(role);
          setUserFullName(fullName);
        }} 
      />
    );
  }

  // HA BE VAN JELENTKEZVE: AZ ALKALMAZÁS FELÜLETE JELENIK MEG
  return (
    <div className="app-container">
      {/* Fejléc a belépett felhasználó adataival és kilépés gombbal */}
      <header className="header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="header-icon">
            <img src={encryptedIcon} alt="Shield Icon" className="ui-icon-header" />
          </div>
          <div>
            <h1 className="header-title">Phishing Analyser</h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="user-badge">
            <span style={{ fontWeight: '600' }}>{userFullName || currentUser.email}</span>
            <span className={`role-pill ${userRole}`}>
              {userRole === 'admin' ? 'Admin' : 'Felhasználó'}
            </span>
          </div>
          <button 
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid #30363d',
              color: '#8b949e',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Kijelentkezés
          </button>
        </div>
      </header>

      {/* Navigációs fülek: KIZÁRÓLAG ADMIN ESETÉN JELENIK MEG A NAVBAR */}
      {userRole === 'admin' && (
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
      )}

      {/* 1. TAB: Elemző (Mindkét szerepkör használhatja) */}
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

      {/* 2. TAB: Előzmények (KIZÁRÓLAG ADMIN) */}
      {activeTab === 'history' && userRole === 'admin' && (
        <section>
          <div className="history-header">
            <h3 className="history-title">Összes vizsgálat (Adminisztrátori napló)</h3>
            {history.length > 0 && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="export-btn" onClick={handleExportCSV}>
                  <img src={exportIcon} alt="Export" className="export-btn-icon" />
                  Exportálás CSV-be
                </button>
                <button className="clear-btn" onClick={handleClearAllHistory}>
                  Napló ürítése
                </button>
              </div>
            )}
          </div>

          {history.length === 0 ? (
            <div className="history-table-wrapper empty-state">
              Még nem érkezett vizsgálat a rendszerbe.
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
                    <th>Felhasználó</th>
                    <th style={{ textAlign: 'center', width: '45px' }}></th>
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
                      <td style={{ color: '#58a6ff', fontSize: '0.85rem' }}>
                        {item.userName || item.userEmail || 'Vendég'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="delete-row-btn"
                          title="Bejegyzés törlése"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <img src={binIcon} alt="Törlés" style={{ width: '16px', height: '16px', display: 'block' }} />
                        </button>
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