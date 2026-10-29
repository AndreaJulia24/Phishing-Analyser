{/* trivia battle kvizbol jott otlet*/}

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import quizData from './data/quizData.json';
import './Quiz.css';

function Quiz() {
  const { t, i18n } = useTranslation();

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Kérdések véletlenszerű keverése és 10 kérdés kiválasztása a nyelvi adatbázisból
  const initQuiz = () => {
    const currentLang = (i18n.language || 'hu').substring(0, 2);
    const rawData = Array.isArray(quizData) ? quizData : (quizData[currentLang] || quizData['hu'] || []);

    const shuffled = [...rawData].sort(() => 0.10 - Math.random());
    setQuestions(shuffled.slice(0, 10));
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setScore(0);
    setIsFinished(false);
  };

  useEffect(() => {
    initQuiz();
  }, [i18n.language]);

  if (questions.length === 0) {
    return <div style={{ color: '#8b949e', textAlign: 'center', padding: '30px' }}>{t('quizLoading')}</div>;
  }

  const currentQ = questions[currentIndex];

  const handleSelect = (idx) => {
    if (selectedOption !== null) return; // Már válaszolt

    setSelectedOption(idx);
    setShowExplanation(true);

    if (idx === currentQ.correctIndex || idx === currentQ.correct) {
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
          {t('quizTitle')}
        </h2>
        <p className="quiz-subtitle">
          <strong>{t('quizBored')}</strong> 
          {' '}
          <strong>{t('quizTestYourKnowledge')}</strong>
        </p>
        <p className="quiz-subtitle">
          {t('quizSubtitleDesc')}
        </p>
      </div>

      {!isFinished ? (
        <div className="quiz-box">
          {/*kerdes sav */}
          <div className="quiz-status-bar">
            <span className="quiz-type-badge">
              <i className="bi bi-tag"></i> {currentQ.type || 'Phishing'}
            </span>
            <span className="quiz-counter">
              {t('quizQuestion')} <strong>{currentIndex + 1}</strong> / {questions.length}
            </span>
          </div>

          {/* scenario kártya */}
          {currentQ.scenario && (
            <div className="quiz-scenario-box">
              <i className="bi bi-chat-square-quote scenario-quote-icon"></i>
              <p className="scenario-text">{currentQ.scenario}</p>
            </div>
          )}

          {/* A kérdés */}
          <h3 className="quiz-question-prompt">{currentQ.question}</h3>

          {/* valaszlehetosegek */}
          <div className="quiz-options-grid">
            {currentQ.options.map((option, idx) => {
              const correctIdx = currentQ.correctIndex !== undefined ? currentQ.correctIndex : currentQ.correct;
              let btnClass = 'quiz-option-button';
              if (selectedOption !== null) {
                if (idx === correctIdx) {
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
            <div className={`quiz-feedback-banner ${selectedOption === (currentQ.correctIndex !== undefined ? currentQ.correctIndex : currentQ.correct) ? 'success' : 'danger'}`}>
              <div className="feedback-content">
                <strong>
                  {selectedOption === (currentQ.correctIndex !== undefined ? currentQ.correctIndex : currentQ.correct) ? (
                    <span><i className="bi bi-check-circle-fill"></i> {t('quizCorrect')}</span>
                  ) : (
                    <span><i className="bi bi-x-circle-fill"></i> {t('quizIncorrect')}</span>
                  )}
                </strong>
                <p>{currentQ.explanation}</p>
              </div>

              <button className="submit-btn quiz-next-btn" onClick={handleNext}>
                {currentIndex + 1 === questions.length ? t('quizViewResult') : t('quizNext')}
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

          <h3 className="result-headline">{t('quizCompleted')}</h3>
          <p className="result-score-display">
            {t('quizAchievedScore')} <strong>{score}</strong> / {questions.length} {t('pointsUnit')}
          </p>

          <div className="result-evaluation-text">
            {score === 10 && (
              <p>
                <strong>{t('quizScore10Title')}</strong> {t('quizScore10Desc')}
              </p>
            )}
            {score >= 7 && score < 10 && (
              <p>
                <strong>{t('quizScore7to9Title')}</strong> {t('quizScore7to9Desc')}
              </p>
            )}
            {score < 7 && (
              <p>
                <strong>{t('quizScoreLowTitle')}</strong> {t('quizScoreLowDesc')}
              </p>
            )}
          </div>
          <button className="submit-btn" onClick={initQuiz}>
            <i className="bi bi-arrow-counterclockwise" style={{ marginRight: '8px' }}></i>
            {t('quizRestartWithNew')}
          </button>
        </div>
      )}
    </section>
  );
}

export default Quiz;