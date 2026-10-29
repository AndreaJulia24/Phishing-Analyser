import { useMemo } from 'react';
import './AdminStats.css';

function AdminStats({ history }) {
  const stats = useMemo(() => {
    const total = history.length;
    if (total === 0) {
      return {
        total: 0,
        securityScore: 100,
        recentScans: [],
        bubbles: [],
        recentScores: []
      };
    }

    let riskSum = 0;
    let urlRisks = 0;
    let textRisks = 0;
    let phoneRisks = 0;
    let phishingCount = 0;
    let suspiciousCount = 0;
    let safeCount = 0;

    history.forEach(item => {
      const r = Number(item.risk_score || 0);
      riskSum += r;

      if (item.verdict === 'Adathalász') phishingCount++;
      else if (item.verdict === 'Gyanús') suspiciousCount++;
      else safeCount++;

      if (item.type === 'URL') urlRisks++;
      else if (item.type === 'SMS' || item.type === 'Szöveg') textRisks++;
      else if (item.type === 'Telefonszám') phoneRisks++;
    });

    const avgRisk = Math.round(riskSum / total);
    const securityScore = Math.max(5, 100 - avgRisk);

    const pPhishing = Math.round((phishingCount / total) * 100);
    const pSuspicious = Math.round((suspiciousCount / total) * 100);
    const pUrl = Math.round((urlRisks / total) * 100);
    const pText = Math.round((textRisks / total) * 100);
    const pPhone = Math.round((phoneRisks / total) * 100);
    const pSafe = Math.round((safeCount / total) * 100);

    const bubbles = [
      { id: 'b1', name: 'Kockázati arány', pct: avgRisk, trend: avgRisk > 40 ? 'up' : 'down', size: 'large', x: 50, y: 50 },
      { id: 'b2', name: 'Sürgető szöveg', pct: pText, trend: 'up', size: 'medium', x: 34, y: 20 },
      { id: 'b3', name: 'Gyors ellenőrzés', pct: Math.min(100, Math.round(pText * 0.5)), trend: 'down', size: 'small', x: 53, y: 15 },
      { id: 'b4', name: 'Biztonságos arány', pct: pSafe, trend: 'down', size: 'medium', x: 74, y: 26 },
      { id: 'b5', name: 'Gyanús minták', pct: pSuspicious, trend: 'up', size: 'medium', x: 23, y: 46 },
      { id: 'b6', name: 'Csaló telefonszám', pct: pPhone, trend: 'down', size: 'medium', x: 78, y: 50 },
      { id: 'b7', name: 'Rosszindulatú URL', pct: pUrl, trend: 'up', size: 'medium', x: 23, y: 73 },
      { id: 'b8', name: 'Domain heurisztika', pct: Math.min(100, Math.round(pUrl * 0.7)), trend: 'small', size: 'small', x: 40, y: 68 },
      { id: 'b9', name: 'Adathalász találat', pct: pPhishing, trend: 'up', size: 'large-mid', x: 58, y: 74 },
      { id: 'b10', name: 'Nemzetközi hívás', pct: Math.round(pPhone * 0.8), trend: 'down', size: 'small', x: 77, y: 73 },
      { id: 'b11', name: 'IP alapú link', pct: Math.min(100, Math.round(pUrl * 0.4)), trend: 'up', size: 'small', x: 42, y: 86 }
    ];
    const recentScores = history.slice(0, 14).map(h => Number(h.risk_score || 20));
    while (recentScores.length < 14) recentScores.push(15);

    return {
      total,
      securityScore,
      recentScans: history,
      bubbles,
      recentScores
    };
  }, [history]);

  const TOTAL_TICKS = 64;
  const litTicksCount = Math.round((stats.securityScore / 100) * TOTAL_TICKS);
  const scaleIndexes = [28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8, 6, 4, 2];

  return (
    <section className="soc-dashboard-wrapper">
      <div className="soc-dashboard-header">
        <h2 className="soc-title">Dashboard</h2>
        <span className="soc-subtitle">Kiberbiztonsági Műveleti Központ & Adathalászat Elemző</span>
      </div>

      <div className="soc-main-grid">
        {/* BAL OSZLOP: Live Now vizsgálati események */}
        <div className="soc-live-col">
          <div className="soc-col-header">
            <span className="live-badge">
              <span className="live-dot"></span> Live Now
            </span>
          </div>

          <div className="soc-campaign-list">
            {stats.recentScans.length === 0 ? (
              <div className="soc-empty-list">Még nincs beérkezett vizsgálat</div>
            ) : (
              stats.recentScans.map((item, idx) => (
                <div key={item.id || idx} className="soc-campaign-card">
                  <div className="card-top">
                    <span className="campaign-icon">
                      <i className={item.type === 'URL' ? 'bi bi-link-45deg' : item.type === 'Telefonszám' ? 'bi bi-telephone-x' : 'bi bi-chat-left-dots'}></i>
                    </span>
                    <span className="campaign-name truncate-name">
                      {item.target_data || item.userName || 'Vizsgálat'}
                    </span>
                    <i className="bi bi-chevron-down chevron"></i>
                  </div>
                  <div className="card-bottom">
                    <span className="campaign-time">{item.timestamp || 'Nemrég'}</span>
                    <span className={`simulation-tag ${item.verdict === 'Adathalász' ? 'danger' : item.verdict === 'Gyanús' ? 'warning' : 'safe'}`}>
                      <span className="sim-dot"></span> {item.risk_score} Pts • {item.verdict}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* KÖZÉPSŐ OSZLOP: 540px-es tágas Radar körív és buborékok */}
        <div className="soc-radar-col">
          <div className="radar-circle-container">
            <svg className="radar-dial-svg" viewBox="0 0 540 540">
              <circle cx="270" cy="270" r="250" className="dial-bg-ring" />
              {Array.from({ length: TOTAL_TICKS }).map((_, i) => {
                const angle = (i * 360) / TOTAL_TICKS;
                const isLit = i < litTicksCount;
                return (
                  <line
                    key={i}
                    x1="270"
                    y1="12"
                    x2="270"
                    y2="26"
                    transform={`rotate(${angle} 270 270)`}
                    className={`dial-tick ${isLit ? 'lit' : ''}`}
                  />
                );
              })}
            </svg>

            <div className="threat-bubbles-field">
              {stats.bubbles.map(node => (
                <div
                  key={node.id}
                  className={`threat-bubble ${node.size}`}
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                >
                  <div className="bubble-pct">
                    {node.pct}%
                    <span className={`trend-arrow ${node.trend}`}>
                      {node.trend === 'up' ? '↗' : '↘'}
                    </span>
                  </div>
                  <div className="bubble-name">{node.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* JOBB OSZLOP: Security Score HUD és szabályozott frekvenciavonalak */}
        <div className="soc-hud-col">
          <div className="score-hud-header">
            <div className="score-digits">
              <span className="score-main">{stats.securityScore}</span>
              <span className="score-max">/100</span>
            </div>
            <div className="score-label">Security Score</div>
          </div>

          <div className="intensity-scale">
            {scaleIndexes.map((num, idx) => {
              // Maximáljuk 100%-nál, és korlátozzuk a perjelek számát a túlcsordulás ellen
              const rawRisk = Number(stats.recentScores[idx] || 25);
              const clampedRisk = Math.min(100, Math.max(10, rawRisk));
              const hashCount = Math.min(22, Math.max(3, Math.floor(clampedRisk / 4.5)));

              return (
                <div key={num} className="scale-row">
                  <span className="scale-num">{num}</span>
                  <div className="scale-track">
                    <div className="scale-bars" style={{ width: `${clampedRisk}%` }}>
                      {Array.from({ length: hashCount }).map((_, bIdx) => (
                        <span key={bIdx} className="scale-hash">/</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AdminStats;