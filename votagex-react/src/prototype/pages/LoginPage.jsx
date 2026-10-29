import { useState } from 'react';
import { lineError, lineReady, signInGoogle, signInGoogleRedirect, signInLine } from '../cloud';

// First screen when not signed in: Google, LINE (once its Worker is set up; until then "soon"), or look around with sample data.
// A pending invite (opened before signing in) shows what you're about to join.
export default function LoginPage({ onDemo, invite }) {
  const [busy, setBusy] = useState(false);
  // back from LINE without signing in: pressed cancel there, or it failed
  const [error, setError] = useState(lineError && lineError !== 'cancel' ? 'เข้าสู่ระบบด้วย LINE ไม่สำเร็จ ลองใหม่อีกครั้ง' : '');
  const google = async () => {
    setBusy(true);
    setError('');
    try {
      await signInGoogle();
    } catch (e) {
      console.warn('sign-in failed:', e?.code);
      if (e?.code === 'auth/popup-blocked') return signInGoogleRedirect(); // phones that block the popup: go the long way
      // this address isn't allowed yet: the API key's website list or Firebase's authorized domains
      if (e?.code === 'auth/unauthorized-domain' || e?.code?.startsWith('auth/requests-from-referer')) setError(`ยังเข้าสู่ระบบจาก ${location.hostname} ไม่ได้: ต้องเพิ่มโดเมนนี้ใน Firebase ก่อน`);
      else if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') setError('เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง');
      setBusy(false);
    }
  };
  return (
    <div className="pt-login">
      <div className="pt-login-hero">
        <div className="pt-login-logo">VOTAGEX</div>
        <div className="pt-login-tag">วางแผนเที่ยวกับเพื่อน หารเงินจบในแอปเดียว</div>
        {invite && <div className="pt-login-invite">เข้าสู่ระบบเพื่อเข้าร่วม “{invite}”</div>}
      </div>
      <div className="pt-login-actions">
        <button className="pt-login-btn google" disabled={busy} onClick={google}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12Z" /></svg>
          เข้าสู่ระบบด้วย Google
        </button>
        <button className="pt-login-btn line" disabled={busy || !lineReady} title={lineReady ? undefined : 'เร็วๆ นี้'} onClick={() => { setBusy(true); signInLine(); }}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.6 2 11c0 3.9 3.5 7.2 8.3 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6.1 1.5-1.6 2.2-3.3 2.2-5C22.4 6.6 17.9 3 12 3Z" /></svg>
          เข้าสู่ระบบด้วย LINE {!lineReady && <small>เร็วๆ นี้</small>}
        </button>
        {error && <div className="pt-login-error">{error}</div>}
        <button className="pt-login-demo" onClick={onDemo}>ดูตัวอย่างก่อน</button>
      </div>
    </div>
  );
}
