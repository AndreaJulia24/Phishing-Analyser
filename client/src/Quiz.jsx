{/* trivia battle kvizbol jott otlet*/}

import { useState, useEffect } from 'react';
import quizData from './data/quizData.json';
import './Quiz.css';

function Quiz() {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);


  // Kérdések véletlenszerű keverése és 10 kérdés kiválasztása a 30-ból
  const initQuiz = () => {
    const shuffled = [...quizData].sort(() => 0.10 - Math.random());
    setQuestions(shuffled.slice(0, 10));
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setScore(0);
    setIsFinished(false);
  };

  useEffect(() => {
    initQuiz();
  }, []);

  if (questions.length === 0) {
    return <div style={{ color: '#8b949e', textAlign: 'center', padding: '30px' }}>Kvíz betöltése...</div>;
  }

  const currentQ = questions[currentIndex];

  const handleSelect = (idx) => {
    if (selectedOption !== null) return; // Már válaszolt

    setSelectedOption(idx);
    setShowExplanation(true);

    if (idx === currentQ.correctIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setShowExplanation(false);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  return (
    <section className="quiz-card-section">
      <div className="section-header-row">
        <h2 className="section-title">
          <i className="bi bi-patch-question" style={{ color: '#58a6ff', marginRight: '10px' }}></i>
          Biztonsági és Adathalász Kvíz
        </h2>
       <p className="quiz-subtitle">
          <strong>Unatkozol?</strong> 
          <strong>Teszteld a tudásod az adathalászat és a digitális biztonság terén!</strong>
        </p>
        <p className="quiz-subtitle">
          A kvíz során a válaszaid alapján megtudhatod, mennyire vagy kész a digitális világ kockázataira.
        </p>
      </div>

      {!isFinished ? (
        <div className="quiz-box">
          {/*kerdes sav */}
          <div className="quiz-status-bar">
            <span className="quiz-type-badge">
              <i className="bi bi-tag"></i> {currentQ.type}
            </span>
            <span className="quiz-counter">
              Kérdés: <strong>{currentIndex + 1}</strong> / {questions.length}
            </span>
          </div>

          {/*  scenario kártya */}
          <div className="quiz-scenario-box">
            <i className="bi bi-chat-square-quote scenario-quote-icon"></i>
            <p className="scenario-text">{currentQ.scenario}</p>
          </div>

          {/* A kérdés */}
          <h3 className="quiz-question-prompt">{currentQ.question}</h3>

          {/* valaszlehetosegek */}
          <div className="quiz-options-grid">
            {currentQ.options.map((option, idx) => {
              let btnClass = 'quiz-option-button';
              if (selectedOption !== null) {
                if (idx === currentQ.correctIndex) {
                  btnClass += ' correct';
                } else if (selectedOption === idx) {
                  btnClass += ' wrong';
                } else {
                  btnClass += ' disabled';
                }
              }

              return (
                <button
                  key={idx}
                  className={btnClass}
                  onClick={() => handleSelect(idx)}
                  disabled={selectedOption !== null}
                >
                  <span className="quiz-letter">{String.fromCharCode(65 + idx)}</span>
                  <span className="quiz-option-text">{option}</span>
                </button>
              );
            })}
          </div>

          {/* Magyarazat és tovabb gomb */}
          {showExplanation && (
            <div className={`quiz-feedback-banner ${selectedOption === currentQ.correctIndex ? 'success' : 'danger'}`}>
              <div className="feedback-content">
                <strong>
                  {selectedOption === currentQ.correctIndex ? (
                    <span><i className="bi bi-check-circle-fill"></i> Helyes válasz!</span>
                  ) : (
                    <span><i className="bi bi-x-circle-fill"></i> Helytelen!</span>
                  )}
                </strong>
                <p>{currentQ.explanation}</p>
              </div>

              <button className="submit-btn quiz-next-btn" onClick={handleNext}>
                {currentIndex + 1 === questions.length ? 'Eredmény megtekintése' : 'Következő kérdés'}
                <i className="bi bi-arrow-right" style={{ marginLeft: '6px' }}></i>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Végeredmény kijelző */
        <div className="quiz-result-view">
          <div className="quiz-result-icon-circle">
            <i className={score >= 4 ? "bi bi-award-fill" : "bi bi-shield-exclamation"}></i>
          </div>

          <h3 className="result-headline">Kvíz befejezve!</h3>
          <p className="result-score-display">
            Elért pontszám: <strong>{score}</strong> / {questions.length} pont
          </p>

          <div className="result-evaluation-text">
            {score === 10 && (
              <p>
                <strong>🏆 Hibátlan teljesítmény!</strong> Magabiztosan átlátsz még a legagyafúrtabb csalási kísérleteken is.
              </p>
            )}
            {score >= 7 && score < 10 && (
              <p>
                <strong>👍 Jó eredmény!</strong> A legtöbb alapvető trükköt felismered, de a kifinomultabb támadásoknál érdemes figyelmesnek lenni.
              </p>
            )}
            {score < 7 && (
              <p>
                <strong>⚠️ Érdemes még gyakorolni!</strong> Az adathalászok leggyakoribb csapdái könnyen megtéveszthetnek.
              </p>
            )}
          </div>
          <button className="submit-btn" onClick={initQuiz}>
            <i className="bi bi-arrow-counterclockwise" style={{ marginRight: '8px' }}></i>
            Új kvíz indítása (Új kérdésekkel)
          </button>
        </div>
      )}
    </section>
  );
}

export default Quiz;