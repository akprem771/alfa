// =====================================================
// 🔥 FIREBASE IMPORTS
// =====================================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getDatabase,
  ref,
  onValue,
  get,
  set,
  remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


// =====================================================
// 🔧 FIREBASE CONFIG
// =====================================================

const firebaseConfig = {
  apiKey: "AIzaSyChziW0Rvl35FHfwhds9TaU2vn44-JzQV0",
  authDomain: "allinone-a7123.firebaseapp.com",
  databaseURL: "https://allinone-a7123-default-rtdb.firebaseio.com",
  projectId: "allinone-a7123",
  storageBucket: "allinone-a7123.firebasestorage.app",
  messagingSenderId: "615348054695",
  appId: "1:615348054695:web:d3324a6ea5a846043cc982",
  measurementId: "G-80SSN9RTL1"
};

// =====================================================
// 🚀 INITIALIZE FIREBASE
// =====================================================

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


// =====================================================
// 📚 QUIZ LISTENER
// =====================================================

function listenQuizzes(callback) {
  const quizzesRef = ref(db, "quizzes");

  onValue(
    quizzesRef,
    snapshot => {
      callback(snapshot.val() || {});
    },
    error => {
      console.error("❌ Quiz Firebase Error:", error);
      callback({});
    }
  );
}


// =====================================================
// 👨🎓 STUDENT LISTENER
// =====================================================

function listenStudents(callback) {
  const studentsRef = ref(db, "students");

  onValue(
    studentsRef,
    snapshot => {
      const data = snapshot.val() || {};
      callback(data);
      console.log("✅ Students loaded from Firebase:", data);
    },
    error => {
      console.error("❌ Student Firebase Error:", error);
      callback({});
    }
  );
}


// =====================================================
// ➕ CREATE / UPDATE STUDENT (FIXED DOUBLE-SAVE LOCK)
// =====================================================

let isSavingStudent = false;

async function saveStudentToFirebase(student, oldCode = null) {
  if (isSavingStudent) {
    console.warn("⚠️ Already saving student, duplicate call prevented.");
    return false;
  }

  isSavingStudent = true;

  try {
    if (!student) {
      alert("❌ Student data नहीं मिला।");
      return false;
    }

    const newCode = String(student.code || "").trim().toUpperCase();
    const name = String(student.name || "").trim();
    const password = String(student.password || "").trim();

    if (!newCode || !name || !password) {
      alert("❌ Name, Code और Password जरूरी हैं।");
      return false;
    }

    const old = oldCode ? String(oldCode).trim().toUpperCase() : null;

    // =================================================
    // 🔍 DUPLICATE CODE CHECK USING OFFICIAL `get()`
    // =================================================
    if (old !== newCode) {
      const studentRef = ref(db, `students/${newCode}`);
      const existingSnapshot = await get(studentRef);

      if (existingSnapshot && existingSnapshot.exists()) {
        alert("❌ यह Student Code पहले से मौजूद है।");
        return false;
      }
    }

    // =================================================
    // 💾 SAVE USER TO FIREBASE
    // =================================================
    const userData = {
      code: newCode,
      name: name,
      password: password,
      isAdmin: Boolean(student.isAdmin),
      updatedAt: Date.now()
    };

    await set(ref(db, `students/${newCode}`), userData);

    // Delete old code if updated
    if (old && old !== newCode) {
      await remove(ref(db, `students/${old}`));
      console.log(`🗑️ Old Student Code deleted: ${old}`);
    }

    console.log("✅ Student saved to Firebase:", userData);
    return true;

  } catch (error) {
    console.error("❌ Student Save Error:", error);
    alert("❌ Student ID Firebase में save नहीं हो पाई।");
    return false;
  } finally {
    isSavingStudent = false;
  }
}


// =====================================================
// 🗑️ DELETE STUDENT
// =====================================================

async function deleteStudentFromFirebase(code) {
  try {
    const studentCode = String(code || "").trim().toUpperCase();

    if (!studentCode) {
      return false;
    }

    await remove(ref(db, `students/${studentCode}`));
    console.log("✅ Student deleted:", studentCode);
    return true;

  } catch (error) {
    console.error("❌ Student Delete Error:", error);
    alert("❌ Student ID delete नहीं हुई।");
    return false;
  }
}


// =====================================================
// 💾 SAVE QUIZ
// =====================================================

async function saveQuizToFirebase(quiz) {
  try {
    if (!quiz || !quiz.id) {
      alert("❌ Quiz ID missing है।");
      return false;
    }

    await set(ref(db, `quizzes/${quiz.id}`), quiz);
    console.log("✅ Quiz saved:", quiz);
    return true;

  } catch (error) {
    console.error("❌ Quiz Save Error:", error);
    alert("❌ Quiz save नहीं हो पाया।");
    return false;
  }
}


// =====================================================
// 🗑️ DELETE QUIZ
// =====================================================

async function deleteQuizFromFirebase(quizId) {
  try {
    if (!quizId) {
      return false;
    }

    await remove(ref(db, `quizzes/${quizId}`));
    await remove(ref(db, `results/${quizId}`));

    console.log("✅ Quiz और results delete हो गए।");
    return true;

  } catch (error) {
    console.error("❌ Quiz Delete Error:", error);
    alert("❌ Quiz delete नहीं हो पाया।");
    return false;
  }
}


// =====================================================
// 💾 SAVE RESULT
// =====================================================

async function saveResultToFirebase(result) {
  try {
    if (!result || !result.code || !result.quizId) {
      return false;
    }

    const code = String(result.code).trim().toUpperCase();

    await set(
      ref(db, `results/${result.quizId}/${code}`),
      {
        code: code,
        name: String(result.name || "Unknown"),
        score: Number(result.score) || 0,
        totalQuestions: Number(result.totalQuestions) || 0,
        date: Number(result.date) || Date.now(),
        quizId: String(result.quizId)
      }
    );

    console.log("✅ Result saved.");
    return true;

  } catch (error) {
    console.error("❌ Result Save Error:", error);
    return false;
  }
}


// =====================================================
// 🏆 LIVE RESULTS LISTENER
// =====================================================

let stopResultsListener = null;


// =====================================================
// 🏆 RANKING HELPER
// =====================================================

function getRankHTML(result, rank) {
  const name = escapeHTML(result.name || "Unknown");
  const scoreText = `${Number(result.score || 0)}/${Number(result.totalQuestions || 0)}`;

  if (rank === 1) {
    return `
      <div class="result-row result-first">
        <div class="rank-number">🥇</div>
        <div class="rank-info">
          <strong>${name}</strong>
          <small>🏆 1st Place</small>
        </div>
        <div class="rank-score">${scoreText}</div>
      </div>
    `;
  }

  if (rank === 2) {
    return `
      <div class="result-row result-second">
        <div class="rank-number">🥈</div>
        <div class="rank-info">
          <strong>${name}</strong>
          <small>🏆 2nd Place</small>
        </div>
        <div class="rank-score">${scoreText}</div>
      </div>
    `;
  }

  if (rank === 3) {
    return `
      <div class="result-row result-third">
        <div class="rank-number">🥉</div>
        <div class="rank-info">
          <strong>${name}</strong>
          <small>🏆 3rd Place</small>
        </div>
        <div class="rank-score">${scoreText}</div>
      </div>
    `;
  }

  return `
    <div class="result-row">
      <div class="rank-number">${rank}.</div>
      <div class="rank-info">
        <strong>${name}</strong>
      </div>
      <div class="rank-score">${scoreText}</div>
    </div>
  `;
}


// =====================================================
// 🏆 PODIUM HTML
// =====================================================

function getPodiumHTML(results) {
  if (!results || results.length === 0) return "";

  const first = results[0] || null;
  const second = results[1] || null;
  const third = results[2] || null;

  return `
    <div class="quiz-podium">
      ${second ? `
        <div class="podium-item podium-second">
          <div class="podium-trophy">🥈</div>
          <div class="podium-name">${escapeHTML(second.name || "Unknown")}</div>
          <div class="podium-score">${Number(second.score || 0)}/${Number(second.totalQuestions || 0)}</div>
          <div class="podium-block">2</div>
        </div>
      ` : ""}

      ${first ? `
        <div class="podium-item podium-first">
          <div class="podium-trophy">🏆</div>
          <div class="podium-name">${escapeHTML(first.name || "Unknown")}</div>
          <div class="podium-score">${Number(first.score || 0)}/${Number(first.totalQuestions || 0)}</div>
          <div class="podium-block">1</div>
        </div>
      ` : ""}

      ${third ? `
        <div class="podium-item podium-third">
          <div class="podium-trophy">🥉</div>
          <div class="podium-name">${escapeHTML(third.name || "Unknown")}</div>
          <div class="podium-score">${Number(third.score || 0)}/${Number(third.totalQuestions || 0)}</div>
          <div class="podium-block">3</div>
        </div>
      ` : ""}
    </div>
  `;
}


// =====================================================
// 🏆 SHOW LIVE RESULTS
// =====================================================

function showLiveResults(quizId) {
  const resultsDiv = document.getElementById("results");
  const memberCount = document.getElementById("memberCount");

  if (!resultsDiv) return;

  if (stopResultsListener) {
    stopResultsListener();
    stopResultsListener = null;
  }

  if (!quizId) {
    resultsDiv.innerHTML = `
      <h3>🏆 Live Quiz Results</h3>
      <p>Quiz select करें।</p>
    `;
    if (memberCount) memberCount.innerText = "Live Members: 0";
    return;
  }

  const resultsRef = ref(db, `results/${quizId}`);

  stopResultsListener = onValue(
    resultsRef,
    snapshot => {
      const data = snapshot.val() || {};
      const results = Object.values(data);

      results.sort((a, b) => {
        const scoreA = Number(a.score || 0);
        const scoreB = Number(b.score || 0);

        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }

        return Number(a.date || 0) - Number(b.date || 0);
      });

      let html = `<h3>🏆 Live Quiz Results</h3>`;

      if (results.length === 0) {
        html += `
          <div class="empty-result">
            <p>📭 अभी कोई result नहीं आया है।</p>
          </div>
        `;
      } else {
        html += getPodiumHTML(results.slice(0, 3));
        html += `<div class="all-results"><h4>📊 Complete Ranking</h4>`;

        results.forEach((r, index) => {
          html += getRankHTML(r, index + 1);
        });

        html += `</div>`;
      }

      resultsDiv.innerHTML = html;
      if (memberCount) memberCount.innerText = `Live Members: ${results.length}`;
    },
    error => {
      console.error("❌ Results Listener Error:", error);
    }
  );
}


// =====================================================
// 🔄 RESET RESULTS
// =====================================================

async function resetAllResults(quizId) {
  try {
    if (!quizId) {
      alert("⚠️ पहले कोई Quiz select करें।");
      return false;
    }

    await remove(ref(db, `results/${quizId}`));
    console.log("✅ Results reset हो गए।");
    return true;

  } catch (error) {
    console.error("❌ Reset Error:", error);
    alert("❌ Results reset नहीं हो सके।");
    return false;
  }
}


// =====================================================
// 🌐 GLOBAL EXPORTS
// =====================================================

window.listenQuizzes = listenQuizzes;
window.listenStudents = listenStudents;
window.saveStudentToFirebase = saveStudentToFirebase;
window.deleteStudentFromFirebase = deleteStudentFromFirebase;
window.saveQuizToFirebase = saveQuizToFirebase;
window.deleteQuizFromFirebase = deleteQuizFromFirebase;
window.saveResultToFirebase = saveResultToFirebase;
window.showLiveResults = showLiveResults;
window.resetAllResults = resetAllResults;


// =====================================================
// 🛡️ ESCAPE HTML
// =====================================================

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}