import { useState } from 'react';
import { auth, db, secondaryAuth } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import encryptedIcon from './assets/icons/encrypted.png';

function Auth({ onLoginSuccess }) {
  const { t, i18n } = useTranslation();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!lastName.trim() || !firstName.trim()) {
          setErrorMsg('Kérlek add meg a vezeték- és keresztnevedet!');
          setLoading(false);
          return;
        }

        // Másodlagos Auth példánnyal hozzuk létre, hogy ne léptesse be automatikusan az aktuális klienst
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const user = userCredential.user;
        const fullName = `${lastName.trim()} ${firstName.trim()}`;

        await updateProfile(user, { displayName: fullName });

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          fullName: fullName,
          role: email.toLowerCase().includes('admin') ? 'admin' : 'user',
          createdAt: new Date().toISOString()
        });

        // Kijelentkeztetjük a másodlagos Auth példányból
        await signOut(secondaryAuth);

        // Visszaváltunk a Login űrlapra, a jelszót töröljük, és értesítést adunk
        setPassword('');
        setIsRegister(false);
        setSuccessMsg(t('authRegisterSuccess'));
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Lekérjük a Firestore-ból a tényleges szerepkört és nevet (az email-alapú admin automatikusan érvényesül)
        const isEmailAdmin = (user.email || '').toLowerCase().includes('admin');
        let role = isEmailAdmin ? 'admin' : 'user';
        let fullName = user.displayName || user.email;

        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (!isEmailAdmin && data.role) role = data.role;
            if (data.fullName) fullName = data.fullName;
          }
        } catch (docErr) {
          console.error('Hiba a felhasználói profil lekérésekor:', docErr);
        }

        if (onLoginSuccess) {
          onLoginSuccess(user, role, fullName);
        }
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setErrorMsg('Hibás e-mail cím vagy jelszó!');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('Ez az e-mail cím már regisztrálva van!');
      } else if (err.code === 'auth/weak-password') {
        setErrorMsg('A jelszónak legalább 6 karakterből kell állnia!');
      } else {
        setErrorMsg('Hiba történt a művelet során. Próbáld újra később.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Jobb felső diszkrét nyelvi választógombok a kártyán BELÜL */}
        <div className="auth-lang-selector">
          <button 
            type="button"
            className={`auth-lang-btn ${i18n.language && i18n.language.startsWith('hu') ? 'active' : ''}`}
            onClick={() => i18n.changeLanguage('hu')}
          >
            HU
          </button>
          <span className="auth-lang-divider">|</span>
          <button 
            type="button"
            className={`auth-lang-btn ${i18n.language && i18n.language.startsWith('en') ? 'active' : ''}`}
            onClick={() => i18n.changeLanguage('en')}
          >
            EN
          </button>
          <span className="auth-lang-divider">|</span>
          <button 
            type="button"
            className={`auth-lang-btn ${i18n.language && i18n.language.startsWith('ro') ? 'active' : ''}`}
            onClick={() => i18n.changeLanguage('ro')}
          >
            RO
          </button>
        </div>

        <div className="auth-header">
          <img src={encryptedIcon} alt="Shield Icon" className="auth-icon" />
          <h2 className="auth-title">Phishing Analyser</h2>
          <p className="auth-subtitle">
            {isRegister ? t('authRegisterSubtitle') : t('authLoginSubtitle')}
          </p>
        </div>

        {errorMsg && <div className="error-banner">{errorMsg}</div>}
        {successMsg && <div className="success-banner">{successMsg}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="auth-row-names">
              <div className="auth-field">
                <label className="auth-label">{t('authLastName')}</label>
                <input 
                  type="text" 
                  className="auth-input" 
                  placeholder={t('placeholderLastName')}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>

              <div className="auth-field">
                <label className="auth-label">{t('authFirstName')}</label>
                <input 
                  type="text" 
                  className="auth-input" 
                  placeholder={t('placeholderFirstName')}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">{t('authEmail')}</label>
            <input 
              type="email" 
              className="auth-input" 
              placeholder={t('placeholderEmail')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">{t('authPassword')}</label>
            <input 
              type="password" 
              className="auth-input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? '...' : (isRegister ? t('authRegisterBtn') : t('authLoginBtn'))}
          </button>
        </form>

        <div className="auth-footer">
          {isRegister ? (
            <p>
              {t('authHaveAccount')}{' '}
              <button 
                type="button" 
                className="auth-switch-btn" 
                onClick={() => { setIsRegister(false); setErrorMsg(''); setSuccessMsg(''); }}
              >
                {t('authLoginNow')}
              </button>
            </p>
          ) : (
            <p>
              {t('authNoAccount')}{' '}
              <button 
                type="button" 
                className="auth-switch-btn" 
                onClick={() => { setIsRegister(true); setErrorMsg(''); setSuccessMsg(''); }}
              >
                {t('authRegisterNow')}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;
