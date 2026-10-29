import { useMemo } from 'react';
import './AdminStats.css';

function AdminStats({ history }) {
  // Statisztikai adatok dinamikus kiszámítása a history tömbből
  const stats = useMemo(() => {
    const total = history.length;
    if (total === 0) {
      return {
        total: 0,
        avgRisk: 0,
        phishingCount: 0,
        suspiciousCount: 0,
        safeCount: 0,
        typeCounts: { URL: 0, SMS: 0, Telefonszám: 0, 'E-mail': 0, 'Szöveg': 0 }
      };
    }

    let riskSum = 0;
    let phishing = 0;
    let suspicious = 0;
    let safe = 0;
    const types = { URL: 0, SMS: 0, Telefonszám: 0, 'E-mail': 0, 'Szöveg': 0 };

    history.forEach(item => {
      riskSum += Number(item.risk_score || 0);

      if (item.verdict === 'Adathalász') phishing++;
      else if (item.verdict === 'Gyanús') suspicious++;
      else safe++;

      const itemType = item.type || 'Szöveg';
      if (types[itemType] !== undefined) {
        types[itemType]++;
      } else {
        types[itemType] = 1;
      }
    });

    return {
      total,
      avgRisk: Math.round(riskSum / total),
      phishingCount: phishing,
      suspiciousCount: suspicious,
      safeCount: safe,
      typeCounts: types
    };
  }, [history]);

  if (history.length === 0) {
    return (
      <section className="admin-stats-section">
        <div className="section-header-row">
          <h2 className="section-title">
            <i className="bi bi-bar-chart-line" style={{ color: '#58a6ff', marginRight: '10px' }}></i>
            Rendszerstatisztikák és Elemzések
          </h2>
        </div>
        <div className="stats-empty-state">
          <i className="bi bi-inbox" style={{ fontSize: '2.5rem', color: '#8b949e', display: 'block', marginBottom: '10px' }}></i>
          Még nincsenek adatok a statisztikák generálásához. Végezz néhány vizsgálatot a naplózáshoz!
        </div>
      </section>
    );
  }

  return (
    <section className="admin-stats-section">
      <div className="section-header-row">
        <h2 className="section-title">
          <i className="bi bi-bar-chart-line" style={{ color: '#58a6ff', marginRight: '10px' }}></i>
          Rendszerstatisztikák és Elemzések
        </h2>
        <p className="admin-stats-subtitle">
          Áttekintés a beérkezett vizsgálatokról, kockázati besorolásokról és típusokról.
        </p>
      </div>

      {/* Fő KPI Kártyák */}
      <div className="stats-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-box total">
            <i className="bi bi-activity"></i>
          </div>
          <div>
            <span className="kpi-label">Összes vizsgálat</span>
            <div className="kpi-value">{stats.total}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box danger">
            <i className="bi bi-shield-slash"></i>
          </div>
          <div>
            <span className="kpi-label">Kiszűrt adathalászat</span>
            <div className="kpi-value danger-text">{stats.phishingCount}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box warning">
            <i className="bi bi-exclamation-triangle"></i>
          </div>
          <div>
            <span className="kpi-label">Gyanús minták</span>
            <div className="kpi-value warning-text">{stats.suspiciousCount}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box risk">
            <i className="bi bi-speedometer2"></i>
          </div>
          <div>
            <span className="kpi-label">Átlagos kockázat</span>
            <div className="kpi-value">{stats.avgRisk} / 100</div>
          </div>
        </div>
      </div>

      {/* Részletes eloszlási kártyák */}
      <div className="stats-breakdown-grid">
        {/* Besorolások aránya */}
        <div className="breakdown-card">
          <h3 className="breakdown-card-title">
            <i className="bi bi-pie-chart" style={{ marginRight: '8px' }}></i>
            Eredmények szerinti arány
          </h3>
          
          <div className="progress-bar-stacked">
            <div 
              className="progress-slice danger" 
              style={{ width: `${(stats.phishingCount / stats.total) * 100}%` }}
              title={`Adathalász: ${stats.phishingCount} db`}
            />
            <div 
              className="progress-slice warning" 
              style={{ width: `${(stats.suspiciousCount / stats.total) * 100}%` }}
              title={`Gyanús: ${stats.suspiciousCount} db`}
            />
            <div 
              className="progress-slice success" 
              style={{ width: `${(stats.safeCount / stats.total) * 100}%` }}
              title={`Biztonságos: ${stats.safeCount} db`}
            />
          </div>

          <div className="legend-list">
            <div className="legend-item">
              <span className="legend-dot danger"></span>
              <span>Adathalász ({stats.phishingCount} db - {Math.round((stats.phishingCount / stats.total) * 100)}%)</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot warning"></span>
              <span>Gyanús ({stats.suspiciousCount} db - {Math.round((stats.suspiciousCount / stats.total) * 100)}%)</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot success"></span>
              <span>Biztonságos ({stats.safeCount} db - {Math.round((stats.safeCount / stats.total) * 100)}%)</span>
            </div>
          </div>
        </div>

        {/* Elemzett kategóriák */}
        <div className="breakdown-card">
          <h3 className="breakdown-card-title">
            <i className="bi bi-funnel" style={{ marginRight: '8px' }}></i>
            Típusok szerinti megoszlás
          </h3>

          <div className="type-distribution-list">
            {Object.entries(stats.typeCounts).map(([typeKey, count]) => (
              <div key={typeKey} className="type-row">
                <span className="type-row-name">{typeKey}</span>
                <div className="type-row-track">
                  <div 
                    className="type-row-fill" 
                    style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="type-row-count">{count} db</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AdminStats;