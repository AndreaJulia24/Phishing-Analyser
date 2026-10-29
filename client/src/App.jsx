import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import './LightMode.css';
import { useTranslation } from 'react-i18next';

import encryptedIcon from './assets/icons/encrypted.png';
import analyserIcon from './assets/icons/analyser.png';
import exportIcon from './assets/icons/export.png';
import binIcon from './assets/icons/bin.png';
import sunIcon from './assets/icons/sun.png';
import moonIcon from './assets/icons/moon.png';
import userIcon from './assets/icons/user.png';

// Firebase modulok
import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  getDoc,
  setDoc,
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Külön bejelentkező / regisztrációs oldal komponens
import Auth from './Auth';
import Quiz from './Quiz.jsx';
import AdminStats from './AdminStats.jsx';

// Élesben (Vercel) a frontend és az API ugyanazon a domainen fut, ezért üres alap-URL-t használunk (relatív /api/... hívás).
// Fejlesztéskor a helyi backendet hívjuk az 5001-es porton.
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : `${window.location.protocol}//${window.location.hostname}:5001`);

function App() {
  const { t, i18n } = useTranslation();
  
  // Nyelv állapota: alapból a mentett nyelv vagy az i18n nyelve
  const [currentLang, setCurrentLang] = useState(() => {
    const saved = localStorage.getItem('i18nextLng');
    if (saved && (saved.startsWith('hu') || saved.startsWith('en') || saved.startsWith('ro'))) {
      return saved.slice(0, 2);
    }
    return (i18n.language || 'hu').slice(0, 2);
  });

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
  const [isProfileOpen, setIsProfileOpen] = useState(false); 
  const [userPhoto, setUserPhoto] = useState(null);
  const fileInputRef = useRef(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [theme, setTheme] = useState('dark');

  // 1. Hitelesítési állapot figyelése
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const isEmailAdmin = (user.email || '').toLowerCase().includes('admin');
          const role = isEmailAdmin ? 'admin' : (userDoc.exists() ? (userDoc.data().role || 'user') : 'user');
          const fullName = userDoc.exists() && userDoc.data().fullName ? userDoc.data().fullName : (user.displayName || user.email);
          const photo = userDoc.exists() && userDoc.data().photoURL ? userDoc.data().photoURL : null;
          
          setCurrentUser(user);
          setUserRole(role);
          setUserFullName(fullName);
          setUserPhoto(photo);
        } catch (err) {
          console.error('Hiba a szerepkör lekérésekor:', err);
          setCurrentUser(user);
          setUserRole('user');
          setUserFullName(user.displayName || user.email);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setUserFullName('');
        setHistory([]);
        setResult(null);
        setInputText('');
        setUserPhoto(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Valós idejű vizsgálat végrehajtása adott nyelven
  const executeAnalysis = async (text, langToUse) => {
    if (!text || !text.trim()) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/analyze`, {
        targetData: text.trim(),
        lang: langToUse
      });
      setResult(response.data);

      const now = new Date();
      const timeStr = now.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });

      await addDoc(collection(db, 'history'), {
        target_data: text.trim(),
        type: response.data.type,
        risk_score: response.data.risk_score,
        verdict: response.data.verdict,
        timestamp: timeStr,
        userId: currentUser ? currentUser.uid : 'vendeg',
        userName: userFullName || (currentUser ? currentUser.email : 'Ismeretlen'),
        userEmail: currentUser ? currentUser.email : 'Ismeretlen',
        createdAt: serverTimestamp()
      });

      fetchHistory();
    } catch (err) {
      console.error(err);
      setErrorMsg('Hiba történt az elemzés során. Ellenőrizd a kapcsolatot.');
    } finally {
      setLoading(false);
    }
  };

  // ===================== API ANALYZE VEGPONT ES A NYELVEZET KÜLDÉSE=======================
  // Form elküldésekor hívódik meg
  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setErrorMsg(t('placeholder'));
      return;
    }
    await executeAnalysis(inputText, currentLang);
  };

  // Nyelvváltás: azonnal frissíti a felületet ÉS az aktív eredménykártyát is F5 nélkül!
  const handleLanguageChange = async (langCode) => {
    await i18n.changeLanguage(langCode);
    setCurrentLang(langCode);
    localStorage.setItem('i18nextLng', langCode);

    // Ha van éppen beírt szöveg és kint lévő eredmény, azonnal újrakérjük az új nyelven!
    if (inputText && inputText.trim() && result) {
      await executeAnalysis(inputText, langCode);
    }
  };

  //==================================================================================================

  // 2. Előzmények betöltése
  const fetchHistory = async () => {
    if (!currentUser) return;

    try {
      const q = query(collection(db, 'history'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      let items = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      if (userRole !== 'admin') {
        items = items.filter(item => item.userId === currentUser.uid);
      }

      setHistory(items);
    } catch (err) {
      console.error('Firestore előzmények lekérési hiba:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchHistory();
    }
  }, [currentUser, userRole]);

  useEffect(() => {
    if (userRole && userRole !== 'admin' && activeTab === 'stats') {
      setActiveTab('analyser');
    }
  }, [userRole, activeTab]);

    // ======== SEGÉDFÜGGVÉNYEK A FORDÍTÁSHOZ ========
  const getVerdictClass = (verdict, score) => {
    const numScore = Number(score);
    if (!isNaN(numScore) && numScore > 0) {
      if (numScore > 70) return 'danger';
      if (numScore > 30) return 'warning';
      return 'safe';
    }
    const v = String(verdict || '').toLowerCase();
    if (v.includes('phishing') || v.includes('adathal')) return 'danger';
    if (v.includes('suspicious') || v.includes('gyan') || v.includes('suspect')) return 'warning';
    return 'safe';
  };

  const getVerdictText = (verdict, score) => {
    const numScore = Number(score);
    if (!isNaN(numScore) && numScore > 0) {
      if (numScore > 70) return t('verdict_phishing');
      if (numScore > 30) return t('verdict_suspicious');
      return t('verdict_safe');
    }
    const v = String(verdict || '').toLowerCase();
    if (v.includes('phishing') || v.includes('adathal')) return t('verdict_phishing');
    if (v.includes('suspicious') || v.includes('gyan') || v.includes('suspect')) return t('verdict_suspicious');
    if (v.includes('safe') || v.includes('biztons') || v.includes('sigur')) return t('verdict_safe');
    return verdict || '';
  };

  const getTypeText = (type) => {
    if (!type) return '';
    const tp = String(type).toLowerCase();
    if (tp.includes('url')) return t('type_url');
    if (tp.includes('phone') || tp.includes('telefon')) return t('type_phone');
    if (tp.includes('sms')) return t('type_sms');
    if (tp.includes('mail')) return 'E-mail';
    return t('type_text');
  };

  // 4. CSV exportálás az aktuális nyelven
  const handleExportCSV = async () => {
    try {
      if (history.length === 0) {
        alert('Nincs exportálható előzmény!');
        return;
      }

      const headers = [
        `"${t('colTime')}"`,
        `"${t('colType')}"`,
        `"${t('colTarget')}"`,
        `"${t('colScore')}"`,
        `"${t('colVerdict')}"`,
        `"${t('colUser')}"`
      ];

      const rows = history.map(item => [
        `"${item.timestamp || ''}"`,
        `"${getTypeText(item.type)}"`,
        `"${(item.target_data || '').replace(/"/g, '""')}"`,
        `"${item.risk_score || ''}"`,
        `"${getVerdictText(item.verdict)}"`,
        `"${item.userName || item.userEmail || t('guestUser')}"`
      ]);

      const csvString = [
        headers.join(','),
        ...rows.map(e => e.join(','))
      ].join('\r\n');

      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, csvString], { type: 'text/csv;charset=utf-8;' });

      const fileName = userRole === 'admin' 
        ? `phishing_all_history_${currentLang}_${new Date().toISOString().slice(0, 10)}.csv`
        : `phishing_my_scans_${currentLang}_${new Date().toISOString().slice(0, 10)}.csv`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Hiba a CSV exportálás közben:', err);
      alert('Nem sikerült az adatok exportálása.');
    }
  };

  // 5. Előzmények törlése
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

  const handleLogout = async () => {
    await signOut(auth);
  };

  // 6. Profilkép feltöltése
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

        try {
          await setDoc(doc(db, 'users', currentUser.uid), {
            photoURL: compressedBase64
          }, { merge: true });

          setUserPhoto(compressedBase64);
          setIsProfileOpen(false);
        } catch (err) {
          console.error('Hiba a profilkép mentésekor:', err);
          alert('Nem sikerült elmenteni a profilképet.');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  const getBadgeStyle = (verdict) => {
    if (!verdict) return { bg: '#dafbe1', border: '#3fb950', text: '#238636' };
    const v = String(verdict).toLowerCase();
    if (v.includes('phishing') || v.includes('adathal')) {
      return { bg: '#ffeef0', border: '#f85149', text: '#da3633' };
    }
    if (v.includes('suspicious') || v.includes('gyan') || v.includes('suspect')) {
      return { bg: '#fff8c5', border: '#d29922', text: '#9e6a03' };
    }
    return { bg: '#dafbe1', border: '#3fb950', text: '#238636' };
  };
  
  const getTypeBadgeClass = (type) => {
    if (!type) return 'type-badge text';
    const tp = String(type).toLowerCase();
    if (tp.includes('phone') || tp.includes('telefon')) return 'type-badge phone';
    if (tp.includes('url')) return 'type-badge url';
    if (tp.includes('mail')) return 'type-badge email';
    return 'type-badge text';
  };

  if (authLoading) {
    return <div style={{ color: '#fff', textAlign: 'center', marginTop: '50px' }}>Betöltés...</div>;
  }

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

  return (
    <div className="layout-wrapper">
      {/* 1. Teljes szélességű Top Bar */}
      <header className="top-bar">
        <div className="top-bar-left">
          <img src={encryptedIcon} alt="Shield Icon" className="top-bar-logo" />
          <h1 className="top-bar-title">{t('appTitle')}</h1>
        </div>

        <div className="top-bar-right">
          <button className="theme-toggle-btn" title="Váltás témára" onClick={toggleTheme}>
            {theme === 'dark' ? <img src={sunIcon} alt="Theme" className="theme-icon" /> : <img src={moonIcon} alt="Theme" className="theme-icon" />}
            <span>{theme === 'dark' ? t('themeLight') : t('themeDark')}</span>
          </button>

          {/* Nyelvválasztó, ami mostantól azonnal frissíti az aktív nyelvet */}
          <div className="lang-selector">
            <button 
              type="button"
              className={`lang-btn ${currentLang === 'hu' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('hu')}
            >
              HU
            </button>
            <span className="lang-divider">|</span>
            <button 
              type="button"
              className={`lang-btn ${currentLang === 'en' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('en')}
            >
              EN
            </button>
            <span className="lang-divider">|</span>
            <button 
              type="button"
              className={`lang-btn ${currentLang === 'ro' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('ro')}
            >
              RO
            </button>
          </div>

          <div className="profile-menu-container">
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*" 
              onChange={handlePhotoUpload} 
            />

            <button 
              className="profile-avatar-btn" 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              title="Profil menü"
            >
              <img 
                src={userPhoto || userIcon} 
                alt="Profil" 
                className="avatar-img" 
              />
            </button>

            {isProfileOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-user-info">
                  <div 
                    className="dropdown-avatar-wrapper" 
                    onClick={() => {
                      setIsPreviewOpen(true);
                      setIsProfileOpen(false);
                    }}
                    title="Kattints a nagyításhoz"
                  >
                    <img 
                      src={userPhoto || userIcon} 
                      alt="Profil nagy" 
                      className="dropdown-avatar-large" 
                    />
                  </div>
                  <div className="dropdown-name">{userFullName || currentUser.email}</div>
                  <span className={`role-pill ${userRole} dropdown-role`}>
                    {userRole === 'admin' ? 'Admin' : 'Felhasználó'}
                  </span>
                </div>

                <button 
                  className="dropdown-item" 
                  onClick={() => fileInputRef.current.click()}
                >
                  <i className="bi bi-camera" style={{ marginRight: '8px' }}></i>
                  {t('changePhoto')}
                </button>

                <button 
                  className="dropdown-item logout" 
                  onClick={() => {
                    setIsProfileOpen(false);
                    handleLogout();
                  }}
                >
                  {t('logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Középre zárt fő tartalom */}
      <main className={`content-area ${activeTab === 'stats' ? 'stats-active' : ''}`}>
        <nav className="tabs-nav">
          <button
            className={`tab-btn ${activeTab === 'analyser' ? 'active' : ''}`}
            onClick={() => setActiveTab('analyser')}
          >
            <i className="bi bi-shield-check"></i>
            {t('tabAnalyser')}
          </button>

          {userRole !== 'admin' && (
            <button
              className={`tab-btn ${activeTab === 'tips' ? 'active' : ''}`}
              onClick={() => setActiveTab('tips')}
            >
              <i className="bi bi-patch-question"></i>
              {t('tabQuiz')}
            </button>
          )}

          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => { setActiveTab('history'); fetchHistory(); }}
          >
            <i className="bi bi-clock-history"></i>
            {userRole === 'admin'
              ? `${t('tabHistoryAdmin')} (${history.length})`
              : `${t('tabHistoryUser')} (${history.length})`}
          </button>

          {userRole === 'admin' && (
            <button
              className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              <i className="bi bi-bar-chart-line"></i>
              {t('tabStats')}
            </button>
          )}
        </nav>

        {/* 1. TAB: Elemző szekció */}
        {activeTab === 'analyser' && (
          <section className="analyser-card-section">
            <div className="section-header-row">
              <h2 className="section-title">
                <img src={analyserIcon} alt="Analyser" className="ui-icon-tab" />
                {t('analyserTitle')}
              </h2>
            </div>

            <div className="quick-test-bar">
              <span className="quick-test-label">{t('quickTest')}</span>
              <button 
                type="button" 
                className="chip-btn"
                onClick={() => setInputText('http://192.168.1.100/secure-login.paypal.account-verify.banking-support.info/update-token.php?auth=expired')}
              >
                <i className="bi bi-link-45deg"></i> {t('sampleUrl')}
              </button>
              <button 
                type="button" 
                className="chip-btn"
                onClick={() => setInputText('FIGYELEM! A bankszámláját zároltuk jogosulatlan terhelés miatt. Lépjen be azonnal adategyeztetésre: http://otp-biztonsag-ellenorzes.com')}
              >
                <i className="bi bi-chat-left-dots"></i> {t('sampleSms')}
              </button>
              <button 
                type="button" 
                className="chip-btn"
                onClick={() => setInputText('+234 801 234 5678')}
              >
                <i className="bi bi-telephone-x"></i> {t('samplePhone')}
              </button>
            </div>

            <form className="analyser-form" onSubmit={handleAnalyze}>
              <div className="textarea-top-toolbar">
                <div className="textarea-actions">
                  <button 
                    type="button" 
                    className="action-icon-btn" 
                    title="Beillesztés"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        setInputText(text);
                      } catch (err) {
                        alert('A vágólap elérése nem engedélyezett vagy üres.');
                      }
                    }}
                  >
                    <i className="bi bi-clipboard"></i> {t('pasteBtn')}
                  </button>
                  {inputText && (
                    <button 
                      type="button" 
                      className="action-icon-btn clear" 
                      title="Törlés"
                      onClick={() => setInputText('')}
                    >
                      <i className="bi bi-x-lg"></i> {t('clearBtn')}
                    </button>
                  )}
                </div>
              </div>

              <textarea
                className="analyser-textarea"
                rows={4}
                placeholder={t('placeholder')}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? t('analyzing') : t('submitBtn')}
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
                      {t('verdictPrefix')}: {getVerdictText(result.verdict)}
                    </h3>
                    <div style={{ marginTop: '6px' }}>
                      <span className={getTypeBadgeClass(result.type)}>
                        {getTypeText(result.type)}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '1.35rem', fontWeight: '700', color: getBadgeStyle(result.verdict).text }}>
                    {result.risk_score} / 100 {t('pointsUnit')}
                  </span>
                </div>

                {result.breakdown && (
                  <div className="breakdown-container">
                    {result.breakdown.phone_score !== undefined && result.breakdown.phone_score > 0 && (
                      <span className="breakdown-pill">
                        {t('phoneRisk')} <strong>{result.breakdown.phone_score} {t('pointsUnit')}</strong>
                      </span>
                    )}
                    {result.breakdown.url_score !== undefined && result.breakdown.url_score > 0 && (
                      <span className="breakdown-pill">
                        {t('urlRisk')} <strong>{result.breakdown.url_score} {t('pointsUnit')}</strong>
                      </span>
                    )}
                    {result.breakdown.text_score !== undefined && result.breakdown.text_score > 0 && (
                      <span className="breakdown-pill">
                        {t('textRisk')} <strong>{result.breakdown.text_score} {t('pointsUnit')}</strong>
                      </span>
                    )}
                    {result.breakdown.sender_score !== undefined && result.breakdown.sender_score > 0 && (
                      <span className="breakdown-pill">
                        {t('senderRisk')} <strong>{result.breakdown.sender_score} {t('pointsUnit')}</strong>
                      </span>
                    )}
                  </div>
                )}

                <h4 className="xai-title">{t('xaiTitle')}</h4>
                <ul className="xai-list">
                  {result.flags.map((flag, idx) => (
                    <li key={idx}>{flag}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* 2. TAB: KVÍZ TAB (End-User) */}
        {activeTab === 'tips' && <Quiz />}

        {/* 3. TAB: ELŐZMÉNYEK TÁBLÁZAT */}
        {activeTab === 'history' && (
          <div className="history-section">
            <div className="history-header">
              <h2 className="history-title">
                {userRole === 'admin' ? t('historyTitleAdmin') : t('historyTitleUser')}
              </h2>
              <div className="history-actions">
                <button type="button" className="export-btn" onClick={handleExportCSV}>
                  <i className="bi bi-box-arrow-up"></i> {t('exportCsvBtn')}
                </button>
                {userRole === 'admin' && (
                  <button type="button" className="clear-btn" onClick={handleClearAllHistory}>
                    {t('clearLogBtn')}
                  </button>
                )}
              </div>
            </div>

            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>{t('colTime')}</th>
                    <th>{t('colType')}</th>
                    <th>{t('colTarget')}</th>
                    <th>{t('colScore')}</th>
                    <th>{t('colVerdict')}</th>
                    <th>{t('colUser')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>
                        {t('emptyHistory')}
                      </td>
                    </tr>
                  ) : (
                    history.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td>{item.timestamp || item.time || '-'}</td>
                        <td>{getTypeText(item.type)}</td>
                        <td className="truncate-target" title={item.target_data}>
                          {item.target_data}
                        </td>
                        <td><strong>{item.risk_score}</strong></td>
                        <td>
                          <span className={`status-badge ${getVerdictClass(item.verdict, item.risk_score)}`}>
                            {getVerdictText(item.verdict, item.risk_score)}
                          </span>
                        </td>
                        <td>
                          <span className="user-tag">
                            {item.userName || item.user || t('guestUser')}
                          </span>
                        </td>
                        <td>
                          {userRole === 'admin' && (
                            <button
                              type="button"
                              className="trash-btn"
                              title="Törlés"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. TAB: Statisztika szekció */}
        {activeTab === 'stats' && userRole === 'admin' && (
          <AdminStats history={history} />
        )}
      </main>

      {/* Profilkép nagyított előnézete */}
      {isPreviewOpen && (
        <div className="avatar-modal-overlay" onClick={() => setIsPreviewOpen(false)}>
          <div className="avatar-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="avatar-modal-close" 
              onClick={() => setIsPreviewOpen(false)}
              title="Bezárás"
            >
              <i className="bi bi-x-lg"></i>
            </button>
            <div className="avatar-modal-circle">
              <img 
                src={userPhoto || userIcon} 
                alt="Profil nagyítva" 
                className="avatar-modal-img" 
              />
            </div>
            <span className="avatar-modal-name">{userFullName || currentUser.email}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;