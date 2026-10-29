const MESSAGES = require('./messages');

// Szükséges logikák behívása teszteléshez
// (Ha futtatod: node server/test_analyser.js)

const testCases = [
  {
    name: "1. Csaló banki SMS beágyazott HTTP linkkel (A hibás eset ellenőrzése)",
    input: "SÜRGŐS! A bankszámláját zároltuk gyanús tranzakció miatt. Lépjen be azonnal: http://otp-biztonsag-ellenorzes.com",
    lang: "hu",
    expectedVerdict: ["Gyanús", "Adathalász"],
    minScore: 30
  },
  {
    name: "2. Nemzetközi hívószám (+234 Nigéria) angol nyelven",
    input: "+234 801 234 5678",
    lang: "en",
    expectedVerdict: ["Suspicious", "Phishing"],
    minScore: 35
  },
  {
    name: "3. Tiszta, biztonságos URL román nyelven",
    input: "https://www.google.com",
    lang: "ro",
    expectedVerdict: ["Sigur"],
    maxScore: 30
  },
  {
    name: "4. Kifejezetten adathalász IP-cím gyanús paraméterekkel",
    input: "http://192.168.1.1/update-account-verify/login.php",
    lang: "en",
    expectedVerdict: ["Phishing", "Suspicious"],
    minScore: 50
  }
];

async function runTests() {
  console.log("\n=======================================================");
  console.log("   PHISHING ANALYSER -  UNIT TESZT FUTTATÁS");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    try {
      const response = await fetch("http://localhost:5001/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetData: tc.input, lang: tc.lang })
      });

      if (!response.ok) {
        throw new Error(`HTTP hiba! Státusz: ${response.status}`);
      }

      const res = await response.json();
      const score = res.risk_score;
      const verdict = res.verdict;

      let isSuccess = true;
      let errorReason = "";

      if (tc.expectedVerdict && !tc.expectedVerdict.includes(verdict)) {
        isSuccess = false;
        errorReason += `Várt besorolás: [${tc.expectedVerdict.join(', ')}], Kapott: '${verdict}'. `;
      }
      if (tc.minScore !== undefined && score < tc.minScore) {
        isSuccess = false;
        errorReason += `Pontszám túl alacsony! Várt min: ${tc.minScore}, Kapott: ${score}. `;
      }
      if (tc.maxScore !== undefined && score > tc.maxScore) {
        isSuccess = false;
        errorReason += `Pontszám túl magas! Várt max: ${tc.maxScore}, Kapott: ${score}. `;
      }

      if (isSuccess) {
        console.log(`[PASS] ${tc.name}`);
        console.log(`       -> Pont: ${score} | Besorolás: ${verdict} | XAI zászlók száma: ${res.flags.length}`);
        passed++;
      } else {
        console.error(`[FAIL] ${tc.name}`);
        console.error(`       -> Hiba: ${errorReason}`);
        console.error(`       -> Részletek:`, res);
        failed++;
      }
    } catch (err) {
      console.error(`[ERROR] ${tc.name}`);
      console.error(`        Nem sikerült a kérés: ${err.message}`);
      console.error(`        (Győződj meg róla, hogy fut a backend a http://localhost:5001 címen!)`);
      failed++;
    }
    console.log("-------------------------------------------------------");
  }

  console.log(`\nEredmény: ${passed} sikeres, ${failed} sikertelen teszt.\n`);
}

runTests();