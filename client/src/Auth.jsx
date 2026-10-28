import { useState } from 'react';
import { auth, secondaryAuth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import encryptedIcon from './assets/icons/encrypted.png';

function Auth({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!lastName.trim() || !firstName.trim()) {
          setError('Kérlek add meg a vezeték- és keresztnevedet is!');
          setLoading(false);
          return;
        }

        // 1. Felhasználó létrehozása a MÁSODLAGOS Auth-ban -> a főoldal és az App nem érzékeli, nem lép be!
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const newUser = userCred.user;
        const fullName = `${lastName.trim()} ${firstName.trim()}`;
        const assignedRole = email.toLowerCase().includes('admin') ? 'admin' : 'user';

        // 2. Mentés a Firestore-ba
        await setDoc(doc(db, 'users', newUser.uid), {
          email: newUser.email,
          fullName: fullName,
          role: assignedRole,
          createdAt: new Date().toISOString()
        });

        // 3. A másodlagos Auth-ot leállítjuk
        await signOut(secondaryAuth);

        // 4. Mezők ürítése és zöld sikerüzenet (helyben marad a regisztrációs fülön!)
        setLastName('');
        setFirstName('');
        setEmail('');
        setPassword('');
        setSuccessMsg('Sikeres regisztráció! Kérlek, kattints az alábbi "Lépj be itt" gombra a bejelentkezéshez.');
      } else {
        // Normál bejelentkezés a fő Auth példányon
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        const user = userCred.user;

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        let role = 'user';
        let fullName = user.email;

        if (userDoc.exists()) {
          const data = userDoc.data();
          role = data.role || 'user';
          if (data.fullName) {
            fullName = data.fullName;
          }
        }

        onLoginSuccess(user, role, fullName);
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Ez az e-mail cím már regisztrálva van!');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Hibás e-mail cím vagy jelszó!');
      } else if (err.code === 'auth/weak-password') {
        setError('A jelszónak legalább 6 karakterből kell állnia!');
      } else {
        setError('Hiba a hitelesítés során: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img src={encryptedIcon} alt="Shield Icon" style={{ width: '48px', height: '48px' }} />
          <h2 style={{ margin: '10px 0 4px 0', color: '#f0f6fc' }}>Phishing Analyser</h2>
          <p style={{ margin: 0, color: '#8b949e', fontSize: '0.9rem' }}>
            {isRegister ? 'Hozz létre egy új fiókot a folytatáshoz' : 'Jelentkezz be a fiókodba'}
          </p>
        </div>

        {error && <div className="error-banner" style={{ marginBottom: '16px' }}>{error}</div>}
        
        {successMsg && (
          <div style={{
            backgroundColor: '#0f2d1e',
            border: '1px solid #238636',
            color: '#3fb950',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '0.9rem',
            marginBottom: '16px',
            textAlign: 'center',
            fontWeight: '600'
          }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label style={{ color: '#8b949e', fontSize: '0.85rem' }}>Vezetéknév</label>
                <input 
                  type="text" 
                  required 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                  placeholder="Kovács"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #30363d',
                    backgroundColor: '#0d1117',
                    color: '#c9d1d9',
                    marginTop: '4px'
                  }}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label style={{ color: '#8b949e', fontSize: '0.85rem' }}>Keresztnév</label>
                <input 
                  type="text" 
                  required 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                  placeholder="Anna"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #30363d',
                    backgroundColor: '#0d1117',
                    color: '#c9d1d9',
                    marginTop: '4px'
                  }}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label style={{ color: '#8b949e', fontSize: '0.85rem' }}>E-mail cím</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="pelda@email.com"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #30363d',
                backgroundColor: '#0d1117',
                color: '#c9d1d9',
                marginTop: '4px'
              }}
            />
          </div>

          <div className="form-group" style={{ marginTop: '14px' }}>
            <label style={{ color: '#8b949e', fontSize: '0.85rem' }}>Jelszó</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #30363d',
                backgroundColor: '#0d1117',
                color: '#c9d1d9',
                marginTop: '4px'
              }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="submit-btn" 
            style={{ marginTop: '20px', width: '100%' }}
          >
            {loading ? 'Feldolgozás...' : (isRegister ? 'Regisztráció' : 'Bejelentkezés')}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem', color: '#8b949e' }}>
          {isRegister ? (
            <span>Már van fiókod? <button type="button" onClick={() => { setIsRegister(false); setError(''); setSuccessMsg(''); }} style={{ background: 'none', border: 'none', color: '#58a6ff', cursor: 'pointer', textDecoration: 'underline' }}>Lépj be itt</button></span>
          ) : (
            <span>Még nincs fiókod? <button type="button" onClick={() => { setIsRegister(true); setError(''); setSuccessMsg(''); }} style={{ background: 'none', border: 'none', color: '#58a6ff', cursor: 'pointer', textDecoration: 'underline' }}>Regisztrálj most</button></span>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;