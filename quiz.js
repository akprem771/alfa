// =====================================================
// 👨🎓 STUDENTS / ADMIN (WITH CLASS ATTRIBUTE)
// =====================================================

let students = [
  
  {
    code: "ADMIN",
    password: "admin@akprem",
    name: "Akprem",
    isAdmin: true,
    userClass: "All Classes"
  }
];


// =====================================================
// 🔢 GLOBAL VARIABLES
// =====================================================

let currentStudent = null;
let quizzes = {};
let selectedQuiz = null;
let currentQuestionIndex = 0;
let score = 0;
let userResponses = []; // Track student's chosen options for Answer Key
let timer = null;
let quizEndTimer = null;
let countdownTimer = null;
let quizSubmitted = false;
let editingQuizId = null;
let questionCounter = 0;
let editingUserCode = null;
let stopResultsListener = null;

const LOGIN_SESSION_KEY = "quiz_logged_in_user";


// =====================================================
// 💾 LOGIN SESSION HELPERS
// =====================================================

function saveLoginSession(user) {
  if (!user) return;
  try {
    sessionStorage.setItem(LOGIN_SESSION_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("❌ Save Login Session Error:", error);
  }
}

function getLoginSession() {
  try {
    const saved = sessionStorage.getItem(LOGIN_SESSION_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch (error) {
    console.error("❌ Login Session Error:", error);
    sessionStorage.removeItem(LOGIN_SESSION_KEY);
    return null;
  }
}

function removeLoginSession() {
  try {
    sessionStorage.removeItem(LOGIN_SESSION_KEY);
  } catch (error) {
    console.error("❌ Remove Login Session Error:", error);
  }
}


// =====================================================
// 📅 DATE & TIME HELPERS
// =====================================================

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateTime(date, time) {
  return new Date(`${date}T${time}:00`);
}


// =====================================================
// 🔐 LOGIN ENGINE
// =====================================================

function login() {
  const codeInput = document.getElementById("code");
  const passwordInput = document.getElementById("password");

  if (!codeInput || !passwordInput) {
    console.error("❌ Login input नहीं मिला।");
    return;
  }

  let code = codeInput.value.trim().toUpperCase();
  const password = passwordInput.value.trim();

  if (!code || !password) {
    alert("⚠️ Code और Password दोनों भरें!");
    return;
  }

  const user = students.find(
    s => String(s.code).trim().toUpperCase() === code &&
         String(s.password).trim() === password
  );

  if (!user) {
    alert("❌ गलत Code या Password!");
    return;
  }

  currentStudent = {
    ...user,
    code: code
  };

  saveLoginSession(currentStudent);
  showLoggedInScreen();
}


// =====================================================
// 🖥️ SHOW LOGGED-IN SCREEN
// =====================================================

function showLoggedInScreen() {
  if (!currentStudent) return;

  const loginBox = document.getElementById("loginBox");
  const quizArea = document.getElementById("quizArea");
  const studentName = document.getElementById("studentName");
  const studentSection = document.getElementById("studentSection");
  const adminPanel = document.getElementById("adminPanel");
  const results = document.getElementById("results");

  if (loginBox) loginBox.classList.add("hidden");
  if (quizArea) quizArea.classList.remove("hidden");
  if (studentName) {
    const studentClassText = currentStudent.userClass ? ` (${currentStudent.userClass})` : "";
    studentName.innerText = `🎯 शुभकामनाएँ, ${currentStudent.name}${studentClassText}!`;
  }

  // ADMIN VIEW
  if (currentStudent.isAdmin === true) {
    if (studentSection) studentSection.classList.add("hidden");
    if (adminPanel) adminPanel.classList.remove("hidden");
    if (results) results.classList.remove("hidden");

    renderSavedQuizzes();
    renderUserManagement();
    return;
  }

  // STUDENT VIEW
  if (adminPanel) adminPanel.classList.add("hidden");
  if (studentSection) studentSection.classList.remove("hidden");

  renderStudentQuizzes();
}


// =====================================================
// 🔄 RESTORE LOGIN AFTER REFRESH
// =====================================================

function restoreLoginSession() {
  const savedUser = getLoginSession();

  if (!savedUser || !savedUser.code || !savedUser.name) {
    removeLoginSession();
    return;
  }

  currentStudent = {
    ...savedUser,
    code: String(savedUser.code).trim().toUpperCase()
  };

  showLoggedInScreen();
}


// =====================================================
// 🔥 UPDATE STUDENTS FROM FIREBASE
// =====================================================

function updateStudentsFromFirebase(firebaseStudents) {
  if (!firebaseStudents) return;

  const firebaseList = Object.values(firebaseStudents);
  if (firebaseList.length === 0) return;

  students = firebaseList
    .map(user => ({
      code: String(user.code || "").trim().toUpperCase(),
      name: String(user.name || "Student").trim(),
      password: String(user.password || "").trim(),
      userClass: String(user.userClass || "Class 6th").trim(),
      isAdmin: user.isAdmin === true
    }))
    .filter(user => user.code && user.password);

  console.log("✅ Firebase Students Loaded:", students);

  if (currentStudent) {
    const updatedUser = students.find(
      user => user.code === String(currentStudent.code).trim().toUpperCase()
    );

    if (updatedUser) {
      currentStudent = { ...updatedUser };
      saveLoginSession(currentStudent);
      showLoggedInScreen();
    }
  }

  if (currentStudent && currentStudent.isAdmin === true) {
    renderUserList();
  }
}

window.updateStudentsFromFirebase = updateStudentsFromFirebase;


// =====================================================
// 📚 RENDER STUDENT QUIZZES (SPLIT INTO LIVE / FINISHED SECTIONS)
// =====================================================

function renderStudentQuizzes() {
  const container = document.getElementById("studentQuizList");
  if (!container) return;

  const quizArray = Object.values(quizzes);

  if (quizArray.length === 0) {
    container.innerHTML = `
      <div class="empty-box">
        📭 अभी कोई Quiz उपलब्ध नहीं है।
      </div>
    `;
    return;
  }

  quizArray.sort((a, b) => String(a.date).localeCompare(String(b.date)));

  // 🟢 Live / Upcoming / Waiting / Practice quizzes में
  // 🔴 Finished / Expired quizzes अलग Section में दिखेंगे
  const liveGroup = [];
  const finishedGroup = [];

  quizArray.forEach(quiz => {
    const status = getQuizStatus(quiz);
    if (status.finished) {
      finishedGroup.push(quiz);
    } else {
      liveGroup.push(quiz);
    }
  });

  container.innerHTML = "";
  container.classList.remove("quiz-list");
  container.classList.add("quiz-sections-wrap");

  container.appendChild(buildQuizGroupSection("🟢 Live / Upcoming Quizzes", liveGroup, "live-section"));
  container.appendChild(buildQuizGroupSection("🔴 Finished Quizzes", finishedGroup, "finished-section"));

  attachStudentQuizHandlers(container);
}

function buildQuizGroupSection(titleText, quizList, sectionClass) {
  const section = document.createElement("div");
  section.className = `quiz-group-section ${sectionClass}`;

  const heading = document.createElement("h3");
  heading.className = "quiz-group-title";
  heading.innerText = `${titleText} (${quizList.length})`;
  section.appendChild(heading);

  if (quizList.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-box";
    empty.innerText = "📭 इस Section में अभी कोई Quiz नहीं है।";
    section.appendChild(empty);
    return section;
  }

  const grid = document.createElement("div");
  grid.className = "quiz-list";

  quizList.forEach(quiz => {
    grid.appendChild(buildStudentQuizCard(quiz));
  });

  section.appendChild(grid);
  return section;
}

function buildStudentQuizCard(quiz) {
  const status = getQuizStatus(quiz);
  const targetClass = quiz.targetClass || "All Classes";
  const studentClass = currentStudent ? (currentStudent.userClass || "Class 6th") : "Class 6th";

  // Class access check (Class 1st to 12th)
  const isClassMatching = (targetClass === "All Classes" || targetClass === studentClass || currentStudent?.isAdmin);

  // Check if student already completed this quiz
  const resultKey = `${currentStudent ? currentStudent.code : ''}_${quiz.id}`;
  const savedResult = localStorage.getItem(resultKey);

  const card = document.createElement("div");
  card.className = "quiz-card";

  card.innerHTML = `
    <div class="quiz-card-header">
      <h3>🧠 ${escapeHTML(quiz.title)}</h3>
      <div class="badge-group">
        <span class="status ${status.className}">
          ${status.text}
        </span>
        <span class="${isClassMatching ? 'class-badge' : 'class-badge-locked'}">
          🏫 ${escapeHTML(targetClass)}
        </span>
      </div>
    </div>

    <div class="quiz-details">
      <p>⚡ <strong>Mode:</strong> ${quiz.mode === 'practice' ? '♾️ Unlimited Practice' : '🟢 Scheduled Live'}</p>
      ${quiz.mode === 'practice' ? `
        <p>♾️ <strong>Availability:</strong> हमेशा उपलब्ध (कोई Date/Time Limit नहीं)</p>
      ` : `
        <p>📅 <strong>Date:</strong> ${escapeHTML(quiz.date)}</p>
        <p>🟢 <strong>Start:</strong> ${escapeHTML(quiz.start)}</p>
        <p>🔴 <strong>End:</strong> ${escapeHTML(quiz.end)}</p>
      `}
      <p>❓ <strong>Questions:</strong> ${Array.isArray(quiz.questions) ? quiz.questions.length : 0}</p>
      <p>⏱️ <strong>हर Question:</strong> ${Number(quiz.questionTime) || 15}s</p>
      ${!isClassMatching ? `<p style="color:#ef4444; font-weight:800;">🔒 केवल ${escapeHTML(targetClass)} के बच्चे खेल सकते हैं</p>` : ''}
    </div>

    <div class="quiz-card-actions">
      <button
        class="start-quiz-btn"
        data-id="${escapeHTML(quiz.id)}"
        ${(status.canStart && isClassMatching) ? "" : "disabled"}
      >
        ${!isClassMatching ? `🔒 Only ${escapeHTML(targetClass)}` : status.buttonText}
      </button>

      ${(status.finished || savedResult) ? `
        <button class="result-btn" data-result="${escapeHTML(quiz.id)}">
          🏆 Result
        </button>
        <button class="answer-key-btn" data-ak="${escapeHTML(quiz.id)}">
          📑 Answer Key
        </button>
      ` : ""}
    </div>
  `;

  return card;
}

function attachStudentQuizHandlers(container) {
  container.querySelectorAll(".start-quiz-btn").forEach(button => {
    button.onclick = () => startSelectedQuiz(button.dataset.id);
  });

  container.querySelectorAll(".result-btn").forEach(button => {
    button.onclick = () => {
      const id = button.dataset.result;
      selectedQuiz = quizzes[id];
      showLiveResults(id);
    };
  });

  container.querySelectorAll(".answer-key-btn").forEach(button => {
    button.onclick = () => {
      openAnswerKeyModal(button.dataset.ak);
    };
  });
}


// =====================================================
// 📊 QUIZ STATUS HELPER (WITH PRACTICE MODE SUPPORT)
// =====================================================

function getQuizStatus(quiz) {
  if (quiz.mode === "practice") {
    return {
      text: "♾️ PRACTICE UNLIMITED",
      className: "practice",
      canStart: true,
      finished: false,
      buttonText: "🔄 Practice Quiz"
    };
  }

  const today = getTodayDate();

  if (today < quiz.date) {
    return {
      text: "📅 Upcoming",
      className: "upcoming",
      canStart: false,
      finished: false,
      buttonText: "⏳ अभी शुरू नहीं हुआ"
    };
  }

  if (today > quiz.date) {
    return {
      text: "⌛ Expired",
      className: "expired",
      canStart: false,
      finished: true,
      buttonText: "⌛ Quiz समाप्त"
    };
  }

  const now = new Date();
  const start = getDateTime(quiz.date, quiz.start);
  const end = getDateTime(quiz.date, quiz.end);

  if (now < start) {
    return {
      text: "⏳ Waiting",
      className: "waiting",
      canStart: false,
      finished: false,
      buttonText: "⏳ समय का इंतजार करें"
    };
  }

  if (now >= end) {
    return {
      text: "🏁 Finished",
      className: "finished",
      canStart: false,
      finished: true,
      buttonText: "🏁 Quiz समाप्त"
    };
  }

  return {
    text: "🟢 Live",
    className: "live",
    canStart: true,
    finished: false,
    buttonText: "🚀 Start Quiz"
  };
}


// =====================================================
// 🚀 START SELECTED QUIZ
// =====================================================

function startSelectedQuiz(quizId) {
  const quiz = quizzes[quizId];

  if (!quiz) {
    alert("❌ Quiz नहीं मिला।");
    return;
  }

  if (!currentStudent) {
    alert("⚠️ पहले Login करें।");
    return;
  }

  // Class Match Check
  const targetClass = quiz.targetClass || "All Classes";
  const studentClass = currentStudent.userClass || "Class 6th";
  if (targetClass !== "All Classes" && targetClass !== studentClass && !currentStudent.isAdmin) {
    alert(`🔒 यह Quiz केवल ${targetClass} के लिए है। आपकी Class: ${studentClass}`);
    return;
  }

  selectedQuiz = quiz;
  const status = getQuizStatus(quiz);

  if (!status.canStart) {
    if (status.finished) {
      showLiveResults(quiz.id);
    } else {
      showQuizWaiting(quiz);
    }
    return;
  }

  if (quiz.mode !== "practice") {
    const key = `${currentStudent.code}_${quiz.id}`;
    const already = localStorage.getItem(key);

    if (already) {
      alert("⏳ आपने यह Live Quiz पहले ही दे दिया है। Answer Key या Live Results देखें।");
      showLiveResults(quiz.id);
      return;
    }
  }

  currentQuestionIndex = 0;
  score = 0;
  userResponses = [];
  quizSubmitted = false;

  const endTime = quiz.mode === "practice"
    ? Date.now() + (quiz.questions.length * (quiz.questionTime || 15) * 1000)
    : getDateTime(quiz.date, quiz.end).getTime();

  startQuiz(endTime);
}


// =====================================================
// ⏳ WAITING COUNTDOWN SCREEN
// =====================================================

function showQuizWaiting(quiz) {
  const quizDiv = document.getElementById("quiz");
  if (!quizDiv) return;

  quizDiv.innerHTML = `
    <div class="question-card">
      <h2>⏳ ${escapeHTML(quiz.title)}</h2>
      <p>🏫 Target Class: <strong>${escapeHTML(quiz.targetClass || "All Classes")}</strong></p>
      <p>📅 Date: <strong>${escapeHTML(quiz.date)}</strong></p>
      <p>🟢 Start: <strong>${escapeHTML(quiz.start)}</strong></p>
      <p>🔴 End: <strong>${escapeHTML(quiz.end)}</strong></p>
      <p id="quizWaitingCountdown">Loading...</p>
    </div>
  `;

  updateWaitingCountdown(quiz);
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => updateWaitingCountdown(quiz), 1000);
}

function updateWaitingCountdown(quiz) {
  const element = document.getElementById("quizWaitingCountdown");
  if (!element) return;

  const start = getDateTime(quiz.date, quiz.start).getTime();
  const diff = start - Date.now();

  if (diff <= 0) {
    clearInterval(countdownTimer);
    renderStudentQuizzes();
    return;
  }

  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  element.innerText = `⏰ शुरू होने में ${mins} मिनट ${secs} सेकंड`;
}


// =====================================================
// 🚀 QUIZ EXECUTION ENGINE
// =====================================================

function startQuiz(endTime) {
  quizSubmitted = false;
  clearTimeout(quizEndTimer);

  const remaining = endTime - Date.now();
  if (remaining <= 0) {
    autoSubmitQuiz();
    return;
  }

  quizEndTimer = setTimeout(() => autoSubmitQuiz(), remaining);
  loadQuestion();
}


// =====================================================
// 🟣 LOAD QUESTION
// =====================================================

function loadQuestion() {
  if (quizSubmitted) return;
  if (!selectedQuiz || !Array.isArray(selectedQuiz.questions)) return;

  clearInterval(timer);
  const quizDiv = document.getElementById("quiz");
  if (!quizDiv) return;

  const question = selectedQuiz.questions[currentQuestionIndex];
  if (!question) {
    submitQuiz(false);
    return;
  }

  quizDiv.innerHTML = `
    <div class="question-card">
      <div class="question-top">
        <span>Question ${currentQuestionIndex + 1} / ${selectedQuiz.questions.length}</span>
        <span>🧠 ${escapeHTML(selectedQuiz.title)} (${escapeHTML(selectedQuiz.targetClass || "All")})</span>
      </div>

      <h2>${escapeHTML(question.q)}</h2>

      ${question.figure ? `
        <div class="question-figure-box">
          <img src="${escapeHTML(question.figure)}" class="question-figure-img" alt="Question Diagram / Figure" />
        </div>
      ` : ""}

      <div class="options">
        ${question.options.map((option, index) => `
          <label class="option">
            <input type="radio" name="currentQuestion" value="${index}">
            <span>${escapeHTML(option)}</span>
          </label>
        `).join("")}
      </div>

      <p id="timer" class="question-timer">
        समय शेष: ${Number(selectedQuiz.questionTime) || 15}s
      </p>

      <button id="nextBtn" class="next-btn" type="button">
        अगला प्रश्न ➡️
      </button>
    </div>
  `;

  const nextBtn = document.getElementById("nextBtn");
  if (nextBtn) {
    nextBtn.onclick = () => nextQuestion(false);
  }

  let timeLeft = Number(selectedQuiz.questionTime) || 15;
  timer = setInterval(() => {
    if (quizSubmitted) {
      clearInterval(timer);
      return;
    }

    timeLeft--;
    const timerElement = document.getElementById("timer");
    if (timerElement) {
      timerElement.innerText = `समय शेष: ${timeLeft}s`;
    }

    if (timeLeft <= 0) {
      clearInterval(timer);
      nextQuestion(true);
    }
  }, 1000);
}


// =====================================================
// 🟣 NEXT QUESTION
// =====================================================

function nextQuestion(autoNext = false) {
  if (quizSubmitted) return;
  clearInterval(timer);

  const selected = document.querySelector('input[name="currentQuestion"]:checked');
  const currentQuestion = selectedQuiz.questions[currentQuestionIndex];

  let selectedIndex = -1;

  if (!selected) {
    if (!autoNext) {
      alert("⚠️ कोई option select करें!");
      loadQuestion();
      return;
    }
  } else {
    selectedIndex = parseInt(selected.value, 10);
  }

  const isCorrect = (selectedIndex === Number(currentQuestion.answer));
  if (isCorrect) {
    score++;
  }

  userResponses.push({
    questionIndex: currentQuestionIndex,
    questionText: currentQuestion.q,
    figure: currentQuestion.figure || "",
    options: currentQuestion.options,
    selectedAnswer: selectedIndex,
    correctAnswer: Number(currentQuestion.answer),
    isCorrect: isCorrect,
    explanation: currentQuestion.explanation || ""
  });

  currentQuestionIndex++;

  if (currentQuestionIndex < selectedQuiz.questions.length) {
    loadQuestion();
  } else {
    submitQuiz(false);
  }
}


// =====================================================
// ⛔ AUTO SUBMIT
// =====================================================

function autoSubmitQuiz() {
  if (quizSubmitted) return;
  quizSubmitted = true;

  clearInterval(timer);
  clearTimeout(quizEndTimer);

  const selected = document.querySelector('input[name="currentQuestion"]:checked');
  const currentQuestion = selectedQuiz ? selectedQuiz.questions[currentQuestionIndex] : null;

  if (currentQuestion && userResponses.length <= currentQuestionIndex) {
    let selectedIndex = selected ? parseInt(selected.value, 10) : -1;
    const isCorrect = (selectedIndex === Number(currentQuestion.answer));
    if (isCorrect) score++;

    userResponses.push({
      questionIndex: currentQuestionIndex,
      questionText: currentQuestion.q,
      figure: currentQuestion.figure || "",
      options: currentQuestion.options,
      selectedAnswer: selectedIndex,
      correctAnswer: Number(currentQuestion.answer),
      isCorrect: isCorrect,
      explanation: currentQuestion.explanation || ""
    });
  }

  submitQuiz(true);
}


// =====================================================
// 🧾 SUBMIT QUIZ
// =====================================================

async function submitQuiz(isAutoSubmit = false) {
  if (quizSubmitted && !isAutoSubmit) return;

  quizSubmitted = true;
  clearInterval(timer);
  clearTimeout(quizEndTimer);

  if (!currentStudent || !selectedQuiz) return;

  const result = {
    code: currentStudent.code,
    name: currentStudent.name,
    userClass: currentStudent.userClass || "Class 6th",
    score: score,
    totalQuestions: selectedQuiz.questions.length,
    date: Date.now(),
    quizId: selectedQuiz.id,
    responses: userResponses
  };

  const key = `${currentStudent.code}_${selectedQuiz.id}`;
  localStorage.setItem(key, JSON.stringify(result));

  if (typeof window.saveResultToFirebase === "function") {
    await window.saveResultToFirebase(result);
  }

  if (isAutoSubmit) {
    alert(`${currentStudent.name}, ⏰ Quiz का समय समाप्त हो गया।\n\nआपका score: ${score}/${selectedQuiz.questions.length}`);
  } else {
    alert(`${currentStudent.name}, आपका score है ${score}/${selectedQuiz.questions.length}`);
  }

  const quizDiv = document.getElementById("quiz");
  if (quizDiv) {
    quizDiv.innerHTML = `
      <div class="question-card">
        <h2>🎉 Quiz Submit हो गया!</h2>
        <p>आपका Score: <strong>${score} / ${selectedQuiz.questions.length}</strong></p>
        <button id="viewAkDirectBtn" type="button" class="save-btn">
          📑 View Answer Key & Review
        </button>
      </div>
    `;
    const viewAkDirectBtn = document.getElementById("viewAkDirectBtn");
    if (viewAkDirectBtn) {
      viewAkDirectBtn.onclick = () => openAnswerKeyModal(selectedQuiz.id);
    }
  }

  if (selectedQuiz.mode === "practice") {
    showLiveResults(selectedQuiz.id);
  } else {
    const end = getDateTime(selectedQuiz.date, selectedQuiz.end).getTime();
    if (Date.now() >= end) {
      showLiveResults(selectedQuiz.id);
    } else {
      showResultCountdown(end);
    }
  }
}


// =====================================================
// ⏳ RESULT COUNTDOWN
// =====================================================

function showResultCountdown(endTime) {
  const quizDiv = document.getElementById("quiz");
  if (!quizDiv) return;

  quizDiv.innerHTML = `
    <div class="question-card">
      <h2>✅ Quiz Submit हो गया</h2>
      <p>🏆 Result Quiz समाप्त होने के बाद दिखेगा।</p>
      <button id="viewAkBtn" type="button" class="save-btn" style="margin-bottom:15px;">
        📑 View Answer Key & Review
      </button>
      <p id="resultCountdown">Loading...</p>
    </div>
  `;

  const viewAkBtn = document.getElementById("viewAkBtn");
  if (viewAkBtn && selectedQuiz) {
    viewAkBtn.onclick = () => openAnswerKeyModal(selectedQuiz.id);
  }

  updateResultCountdown(endTime);
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => updateResultCountdown(endTime), 1000);
}

function updateResultCountdown(endTime) {
  const element = document.getElementById("resultCountdown");
  if (!element) return;

  const diff = endTime - Date.now();

  if (diff <= 0) {
    clearInterval(countdownTimer);
    if (selectedQuiz) showLiveResults(selectedQuiz.id);
    return;
  }

  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  element.innerText = `⏰ Result आने में ${mins} मिनट ${secs} सेकंड`;
}


// =====================================================
// 📑 DETAILED ANSWER KEY & REVIEW MODAL
// =====================================================
// यहाँ हर Option को उसकी असली स्थिति के हिसाब से रंग मिलता है:
//   ✅ सही Answer वाला Option हमेशा GREEN होता है।
//   ❌ अगर Student ने गलत Option चुना है तो वह Option RED होगा
//      (और सही वाला Option अलग से GREEN दिखेगा)।
//   🌟 अगर Student ने सही Option चुना है तो वही Option GREEN रहेगा
//      और "Your Correct Choice" भी उसी पर दिखेगा (Correct + Selected
//      दोनों एक ही Option = एक ही Green Box)।

function openAnswerKeyModal(quizId) {
  const modal = document.getElementById("answerKeyModal");
  const headerInfo = document.getElementById("answerKeyHeaderInfo");
  const content = document.getElementById("answerKeyContent");

  if (!modal || !headerInfo || !content) return;

  const quiz = quizzes[quizId] || selectedQuiz;
  if (!quiz) {
    alert("❌ Quiz details नहीं मिले।");
    return;
  }

  const resultKey = `${currentStudent ? currentStudent.code : ''}_${quiz.id}`;
  let result = null;

  try {
    const saved = localStorage.getItem(resultKey);
    if (saved) result = JSON.parse(saved);
  } catch (e) {
    console.error("Local result error:", e);
  }

  const totalQs = quiz.questions ? quiz.questions.length : 0;
  const userScore = result ? Number(result.score) : 0;
  const percentage = totalQs > 0 ? Math.round((userScore / totalQs) * 100) : 0;

  headerInfo.innerHTML = `
    <h3>📋 Answer Key & Detailed Review</h3>
    <p>👤 <strong>Student:</strong> ${escapeHTML(currentStudent ? currentStudent.name : "Student")} (${escapeHTML(currentStudent ? (currentStudent.userClass || "Class 6th") : "")})</p>
    <p>🧠 <strong>Quiz:</strong> ${escapeHTML(quiz.title)}</p>
    <div class="score-badge-big">
      📊 Score: ${userScore} / ${totalQs} (${percentage}%)
    </div>
  `;

  content.innerHTML = "";

  if (!quiz.questions || quiz.questions.length === 0) {
    content.innerHTML = "<p>कोई प्रश्न उपलब्ध नहीं हैं।</p>";
  } else {
    quiz.questions.forEach((q, qIndex) => {
      const resp = result && Array.isArray(result.responses) ? result.responses[qIndex] : null;
      const selectedOpt = resp ? resp.selectedAnswer : -1;
      const correctOpt = Number(q.answer);

      const card = document.createElement("div");
      card.className = "ak-question-card";

      let optionsHTML = "";
      q.options.forEach((optText, optIndex) => {
        let optClass = "ak-option";
        let badge = "";

        // सही Answer वाला Option हमेशा Green
        if (optIndex === correctOpt) {
          optClass += " correct";
          badge = " ✅ (Correct Answer)";
        }

        // Student ने गलत Option चुना → वह Option Red
        if (optIndex === selectedOpt && selectedOpt !== correctOpt) {
          optClass += " wrong-selected";
          badge = " ❌ (Your Answer)";
        } else if (optIndex === selectedOpt && selectedOpt === correctOpt) {
          // Student ने सही Option चुना → वही Green Option, बस Badge अलग
          badge = " 🌟 (Your Correct Choice)";
        }

        optionsHTML += `
          <div class="${optClass}">
            <span>Option ${String.fromCharCode(65 + optIndex)}: ${escapeHTML(optText)}</span>
            <span>${badge}</span>
          </div>
        `;
      });

      card.innerHTML = `
        <h4>Question ${qIndex + 1}: ${escapeHTML(q.q)}</h4>

        ${q.figure ? `
          <div class="question-figure-box">
            <img src="${escapeHTML(q.figure)}" class="question-figure-img" alt="Question Diagram" />
          </div>
        ` : ""}

        <div class="ak-options">
          ${optionsHTML}
        </div>

        ${q.explanation ? `
          <div class="explanation-box">
            💡 <strong>Explanation / Solution:</strong> ${escapeHTML(q.explanation)}
          </div>
        ` : ""}
      `;

      content.appendChild(card);
    });
  }

  modal.classList.remove("hidden");
}

function closeAnswerKeyModal() {
  const modal = document.getElementById("answerKeyModal");
  if (modal) modal.classList.add("hidden");
}


// =====================================================
// 👨💼 ADMIN - QUIZ BUILDER
// =====================================================

function addQuestion() {
  const container = document.getElementById("adminQuestions");
  if (!container) return;

  questionCounter++;
  const card = document.createElement("div");
  card.className = "admin-question";

  card.innerHTML = `
    <button type="button" class="remove-question">❌</button>
    <h4>Question ${container.children.length + 1}</h4>
    
    <input type="text" class="question-text" placeholder="Question लिखें">
    
    <label style="font-size:13px; font-weight:700; color:#475569;">🖼️ Figure / Diagram Image (URL or File Upload)</label>
    <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
      <input type="text" class="question-figure-url" placeholder="Image URL (http://...)">
      <input type="file" class="question-figure-file" accept="image/*" style="max-width:200px;">
    </div>
    <img class="admin-figure-preview hidden" src="" alt="Figure Preview" />

    <input type="text" class="option-input" placeholder="Option A">
    <input type="text" class="option-input" placeholder="Option B">
    <input type="text" class="option-input" placeholder="Option C">
    <input type="text" class="option-input" placeholder="Option D">
    
    <label>✅ Correct Answer</label>
    <select class="correct-answer">
      <option value="0">Option A</option>
      <option value="1">Option B</option>
      <option value="2">Option C</option>
      <option value="3">Option D</option>
    </select>

    <label style="font-size:13px; font-weight:700; color:#475569; margin-top:8px;">💡 Explanation / Answer Key Solution (Optional)</label>
    <textarea class="question-explanation" placeholder="हल/व्याख्या लिखें (Student Answer Key में दिखेगा)..." style="min-height:70px;"></textarea>
  `;

  const fileInput = card.querySelector(".question-figure-file");
  const urlInput = card.querySelector(".question-figure-url");
  const previewImg = card.querySelector(".admin-figure-preview");

  if (fileInput && previewImg) {
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          previewImg.src = evt.target.result;
          previewImg.classList.remove("hidden");
          urlInput.value = evt.target.result;
        };
        reader.readAsDataURL(file);
      }
    };
  }

  if (urlInput && previewImg) {
    urlInput.oninput = () => {
      if (urlInput.value.trim()) {
        previewImg.src = urlInput.value.trim();
        previewImg.classList.remove("hidden");
      } else {
        previewImg.classList.add("hidden");
      }
    };
  }

  card.querySelector(".remove-question").onclick = () => {
    card.remove();
    renumberQuestions();
  };

  container.appendChild(card);
  renumberQuestions();
}

function renumberQuestions() {
  document.querySelectorAll(".admin-question").forEach((card, index) => {
    const heading = card.querySelector("h4");
    if (heading) heading.innerText = `Question ${index + 1}`;
  });
}

function collectQuestions() {
  const questions = [];

  document.querySelectorAll(".admin-question").forEach(card => {
    const question = card.querySelector(".question-text")?.value.trim();
    const figure = card.querySelector(".question-figure-url")?.value.trim() || "";
    const options = Array.from(card.querySelectorAll(".option-input")).map(i => i.value.trim());
    const answer = parseInt(card.querySelector(".correct-answer")?.value, 10);
    const explanation = card.querySelector(".question-explanation")?.value.trim() || "";

    if (question && options.length === 4 && options.every(o => o.length > 0)) {
      questions.push({
        q: question,
        figure: figure,
        options: options,
        answer: Number.isInteger(answer) ? answer : 0,
        explanation: explanation
      });
    }
  });

  return questions;
}

// =====================================================
// ⚡ TOGGLE DATE / TIME FIELDS BASED ON QUIZ MODE
// (Practice Mode ⇒ Date/Start/End की ज़रूरत नहीं)
// =====================================================

function toggleTimingFieldsByMode(mode) {
  const dateField = document.getElementById("quizDateField");
  const startField = document.getElementById("quizStartField");
  const endField = document.getElementById("quizEndField");
  const note = document.getElementById("practiceModeNote");
  const isPractice = mode === "practice";

  [dateField, startField, endField].forEach(el => {
    if (el) el.classList.toggle("hidden", isPractice);
  });

  if (note) note.classList.toggle("hidden", !isPractice);
}

async function saveQuiz() {
  if (!currentStudent || !currentStudent.isAdmin) {
    alert("❌ केवल Admin Quiz बना सकता है।");
    return;
  }

  const title = document.getElementById("quizTitle")?.value.trim();
  const targetClass = document.getElementById("quizClass")?.value || "All Classes";
  const mode = document.getElementById("quizMode")?.value || "live";
  const isPractice = mode === "practice";

  const date = isPractice ? "" : document.getElementById("quizDate")?.value;
  const start = isPractice ? "" : document.getElementById("quizStart")?.value;
  const end = isPractice ? "" : document.getElementById("quizEnd")?.value;
  const questionTime = Number(document.getElementById("questionTime")?.value);

  if (!title) { alert("⚠️ Quiz का नाम डालें!"); return; }

  // Practice Mode में Date/Start/End जरूरी नहीं — सिर्फ Live Mode में चेक होगा
  if (!isPractice) {
    if (!date) { alert("⚠️ Quiz Date चुनें!"); return; }
    if (!start || !end) { alert("⚠️ Start और End Time दोनों चुनें!"); return; }
    if (start >= end) { alert("❌ End Time, Start Time के बाद होना चाहिए!"); return; }
  }

  const questions = collectQuestions();
  if (questions.length === 0) { alert("⚠️ कम से कम 1 पूरा Question add करें!"); return; }

  const quizId = editingQuizId || `quiz_${Date.now()}`;

  const quiz = {
    id: quizId,
    title: title,
    targetClass: targetClass,
    mode: mode,
    date: date,
    start: start,
    end: end,
    questionTime: questionTime > 0 ? questionTime : 15,
    questions: questions,
    updatedAt: Date.now()
  };

  if (typeof window.saveQuizToFirebase !== "function") {
    alert("❌ Firebase save function उपलब्ध नहीं है।");
    return;
  }

  const success = await window.saveQuizToFirebase(quiz);
  if (!success) return;

  alert(editingQuizId ? "✅ Quiz update हो गया!" : "✅ Quiz successfully create हो गया!");
  clearQuizForm();
}

function editQuiz(quizId) {
  if (!currentStudent || !currentStudent.isAdmin) return;

  const quiz = quizzes[quizId];
  if (!quiz) return;

  editingQuizId = quizId;

  const formTitle = document.getElementById("formTitle");
  if (formTitle) formTitle.innerText = "✏️ Edit Quiz";

  const titleInput = document.getElementById("quizTitle");
  const classInput = document.getElementById("quizClass");
  const modeInput = document.getElementById("quizMode");
  const dateInput = document.getElementById("quizDate");
  const startInput = document.getElementById("quizStart");
  const endInput = document.getElementById("quizEnd");
  const questionTimeInput = document.getElementById("questionTime");

  if (titleInput) titleInput.value = quiz.title || "";
  if (classInput) classInput.value = quiz.targetClass || "All Classes";
  if (modeInput) modeInput.value = quiz.mode || "live";
  if (dateInput) dateInput.value = quiz.date || "";
  if (startInput) startInput.value = quiz.start || "";
  if (endInput) endInput.value = quiz.end || "";
  if (questionTimeInput) questionTimeInput.value = quiz.questionTime || 15;

  toggleTimingFieldsByMode(quiz.mode || "live");

  const container = document.getElementById("adminQuestions");
  if (!container) return;

  container.innerHTML = "";
  questionCounter = 0;

  if (Array.isArray(quiz.questions)) {
    quiz.questions.forEach(question => {
      addQuestion();
      const card = container.lastElementChild;
      if (!card) return;

      const questionInput = card.querySelector(".question-text");
      if (questionInput) questionInput.value = question.q || "";

      const figureInput = card.querySelector(".question-figure-url");
      const previewImg = card.querySelector(".admin-figure-preview");
      if (figureInput && question.figure) {
        figureInput.value = question.figure;
        if (previewImg) {
          previewImg.src = question.figure;
          previewImg.classList.remove("hidden");
        }
      }

      const inputs = card.querySelectorAll(".option-input");
      if (Array.isArray(question.options)) {
        question.options.forEach((option, index) => {
          if (inputs[index]) inputs[index].value = option;
        });
      }

      const correct = card.querySelector(".correct-answer");
      if (correct) correct.value = question.answer ?? 0;

      const explanation = card.querySelector(".question-explanation");
      if (explanation) explanation.value = question.explanation || "";
    });
  }

  const cancel = document.getElementById("cancelEditBtn");
  if (cancel) cancel.classList.remove("hidden");
}

function cancelEdit() {
  clearQuizForm();
}

function clearQuizForm() {
  editingQuizId = null;

  const formTitle = document.getElementById("formTitle");
  if (formTitle) formTitle.innerText = "➕ Create New Quiz";

  ["quizTitle", "quizDate", "quizStart", "quizEnd"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const questionTime = document.getElementById("questionTime");
  if (questionTime) questionTime.value = "15";

  const quizClass = document.getElementById("quizClass");
  if (quizClass) quizClass.value = "All Classes";

  const quizMode = document.getElementById("quizMode");
  if (quizMode) quizMode.value = "live";

  toggleTimingFieldsByMode("live");

  const questions = document.getElementById("adminQuestions");
  if (questions) questions.innerHTML = "";

  questionCounter = 0;
  const cancel = document.getElementById("cancelEditBtn");
  if (cancel) cancel.classList.add("hidden");
}

function renderSavedQuizzes() {
  const container = document.getElementById("savedQuizList");
  if (!container) return;

  const list = Object.values(quizzes);

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-box">📭 अभी कोई Quiz save नहीं है।</div>`;
    return;
  }

  list.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  container.innerHTML = "";

  list.forEach(quiz => {
    const card = document.createElement("div");
    card.className = "saved-quiz";

    card.innerHTML = `
      <div>
        <h4>🧠 ${escapeHTML(quiz.title)} <span class="status ${quiz.mode === 'practice' ? 'practice' : 'live'}">${quiz.mode === 'practice' ? '♾️ Practice' : '🟢 Live'}</span></h4>
        <p>🏫 <strong>Class:</strong> ${escapeHTML(quiz.targetClass || "All Classes")} &nbsp; | &nbsp; ${quiz.mode === 'practice' ? '♾️ हमेशा उपलब्ध' : `📅 ${escapeHTML(quiz.date)} &nbsp; | &nbsp; 🕐 ${escapeHTML(quiz.start)}-${escapeHTML(quiz.end)}`}</p>
        <p>❓ ${Array.isArray(quiz.questions) ? quiz.questions.length : 0} Questions</p>
      </div>

      <div class="saved-actions">
        <button class="view-result-admin" data-id="${escapeHTML(quiz.id)}">🏆 Results</button>
        <button class="edit-quiz" data-id="${escapeHTML(quiz.id)}">✏️ Edit</button>
        <button class="delete-quiz" data-id="${escapeHTML(quiz.id)}">🗑️ Delete</button>
      </div>
    `;

    container.appendChild(card);
  });

  container.querySelectorAll(".view-result-admin").forEach(button => {
    button.onclick = () => {
      const id = button.dataset.id;
      selectedQuiz = quizzes[id];
      showLiveResults(id);
    };
  });

  container.querySelectorAll(".edit-quiz").forEach(button => {
    button.onclick = () => editQuiz(button.dataset.id);
  });

  container.querySelectorAll(".delete-quiz").forEach(button => {
    button.onclick = () => deleteQuiz(button.dataset.id);
  });
}

async function deleteQuiz(quizId) {
  if (!currentStudent || !currentStudent.isAdmin) return;

  const quiz = quizzes[quizId];
  if (!quiz) return;

  const confirmed = confirm(`क्या आप "${quiz.title}" को delete करना चाहते हैं?\n\nइस quiz के सभी results भी delete हो जाएंगे।`);
  if (!confirmed) return;

  if (typeof window.deleteQuizFromFirebase !== "function") {
    alert("❌ Firebase delete function नहीं मिला।");
    return;
  }

  const success = await window.deleteQuizFromFirebase(quizId);
  if (!success) return;

  if (selectedQuiz && selectedQuiz.id === quizId) {
    selectedQuiz = null;
  }

  alert("✅ Quiz delete हो गया!");
}

async function resetQuiz() {
  if (!currentStudent || !currentStudent.isAdmin) {
    alert("❌ केवल Admin Results reset कर सकता है।");
    return;
  }

  if (!selectedQuiz) {
    alert("⚠️ पहले Saved Quiz में जाकर Results button दबाएँ।");
    return;
  }

  const confirmed = confirm(`"${selectedQuiz.title}" के सभी student results delete करें?`);
  if (!confirmed) return;

  if (typeof window.resetAllResults !== "function") {
    alert("❌ Firebase reset function नहीं मिला।");
    return;
  }

  const success = await window.resetAllResults(selectedQuiz.id);
  if (!success) return;

  students.forEach(student => {
    localStorage.removeItem(`${student.code}_${selectedQuiz.id}`);
  });

  alert("✅ इस Quiz के सभी results reset हो गए!");
}


// =====================================================
// 👨🎓 STUDENT ID MANAGEMENT (CLASS 1ST TO 12TH SUPPORT)
// =====================================================

function renderUserManagement() {
  const adminPanel = document.getElementById("adminPanel");
  if (!adminPanel) return;

  let box = document.getElementById("userManagement");
  if (box) {
    box.remove();
  }

  box = document.createElement("div");
  box.id = "userManagement";
  box.className = "admin-card";

  box.innerHTML = `
    <h3>👥 Student ID Management</h3>

    <div class="user-form">
      <input id="userName" type="text" placeholder="Student Name" autocomplete="off">
      <input id="userCode" type="text" placeholder="Student Code" autocomplete="off">
      <input id="userPassword" type="text" placeholder="Student Password" autocomplete="off">
      
      <label style="font-weight:700; font-size:14px; margin-top:6px; display:block;">🏫 Student Class (Class 1st to 12th):</label>
      <select id="userClass">
        <option value="Class 1st">Class 1st</option>
        <option value="Class 2nd">Class 2nd</option>
        <option value="Class 3rd">Class 3rd</option>
        <option value="Class 4th">Class 4th</option>
        <option value="Class 5th">Class 5th</option>
        <option value="Class 6th" selected>Class 6th</option>
        <option value="Class 7th">Class 7th</option>
        <option value="Class 8th">Class 8th</option>
        <option value="Class 9th">Class 9th</option>
        <option value="Class 10th">Class 10th</option>
        <option value="Class 11th">Class 11th</option>
        <option value="Class 12th">Class 12th</option>
      </select>

      <button id="saveUserBtn" type="button" class="save-btn" style="margin-top:14px;">
        ➕ Create Student ID
      </button>

      <button id="cancelUserBtn" type="button" class="cancel-btn hidden" style="margin-top:14px;">
        ❌ Cancel
      </button>
    </div>

    <hr>
    <div id="userList">Loading...</div>
  `;

  const resetButton = document.getElementById("resetBtn");
  if (resetButton && resetButton.parentNode === adminPanel) {
    adminPanel.insertBefore(box, resetButton);
  } else {
    adminPanel.prepend(box);
  }

  const saveBtn = document.getElementById("saveUserBtn");
  if (saveBtn) saveBtn.onclick = saveUser;

  const cancelBtn = document.getElementById("cancelUserBtn");
  if (cancelBtn) cancelBtn.onclick = clearUserForm;

  renderUserList();
}


// =====================================================
// 👥 RENDER USER LIST
// =====================================================

function renderUserList() {
  const container = document.getElementById("userList");
  if (!container) return;

  if (students.length === 0) {
    container.innerHTML = "<p>कोई Student ID नहीं है।</p>";
    return;
  }

  container.innerHTML = "";

  students.forEach(user => {
    const row = document.createElement("div");
    row.className = "saved-quiz";

    row.innerHTML = `
      <div>
        <h4>👨🎓 ${escapeHTML(user.name)} <span class="class-badge">🏫 ${escapeHTML(user.userClass || "Class 6th")}</span></h4>
        <p>Code: <strong>${escapeHTML(user.code)}</strong></p>
        <p>Password: <strong>${escapeHTML(user.password)}</strong></p>
      </div>

      <div class="saved-actions">
        ${user.isAdmin ? `
          <span>👑 Admin</span>
        ` : `
          <button class="edit-user" data-code="${escapeHTML(user.code)}">✏️ Edit</button>
          <button class="delete-user" data-code="${escapeHTML(user.code)}">🗑️ Delete</button>
        `}
      </div>
    `;

    container.appendChild(row);
  });

  container.querySelectorAll(".edit-user").forEach(button => {
    button.onclick = () => editUser(button.dataset.code);
  });

  container.querySelectorAll(".delete-user").forEach(button => {
    button.onclick = () => deleteUser(button.dataset.code);
  });
}


// =====================================================
// ➕ CREATE / UPDATE USER (WITH CLASS 1ST TO 12TH)
// =====================================================

let isSavingUserUI = false;

async function saveUser() {
  if (isSavingUserUI) return;

  if (!currentStudent || !currentStudent.isAdmin) {
    alert("❌ केवल Admin Student ID manage कर सकता है।");
    return;
  }

  const nameInput = document.getElementById("userName");
  const codeInput = document.getElementById("userCode");
  const passInput = document.getElementById("userPassword");
  const classInput = document.getElementById("userClass");
  const saveBtn = document.getElementById("saveUserBtn");

  const name = nameInput?.value.trim();
  const code = codeInput?.value.trim().toUpperCase();
  const password = passInput?.value.trim();
  const uClass = classInput?.value || "Class 6th";

  if (!name || !code || !password) {
    alert("⚠️ Name, Code और Password भरें!");
    return;
  }

  if (typeof window.saveStudentToFirebase !== "function") {
    alert("❌ Firebase student save function नहीं मिला। (main.js सही से load नहीं हुई या Internet issue है)");
    return;
  }

  isSavingUserUI = true;
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerText = "Saving...";
  }

  try {
    if (editingUserCode) {
      const index = students.findIndex(
        user => String(user.code).trim().toUpperCase() === String(editingUserCode).trim().toUpperCase()
      );

      if (index === -1) {
        alert("❌ User नहीं मिला।");
        return;
      }

      const duplicate = students.some(
        (user, userIndex) => userIndex !== index && String(user.code).trim().toUpperCase() === code
      );

      if (duplicate) {
        alert("❌ यह Code पहले से मौजूद है!");
        return;
      }

      const oldCode = students[index].code;
      const updatedUser = { name: name, code: code, password: password, userClass: uClass, isAdmin: false };

      const success = await window.saveStudentToFirebase(updatedUser, oldCode);
      if (success) {
        if (currentStudent && String(currentStudent.code).trim().toUpperCase() === String(oldCode).trim().toUpperCase()) {
          currentStudent = { ...updatedUser };
          saveLoginSession(currentStudent);
        }

        alert("✅ Student ID successfully update हो गई!");
        clearUserForm();
      }
      return;
    }

    const exists = students.some(
      user => String(user.code).trim().toUpperCase() === code
    );

    if (exists) {
      alert("❌ यह Code पहले से मौजूद है!");
      return;
    }

    const newUser = { name: name, code: code, password: password, userClass: uClass, isAdmin: false };
    const success = await window.saveStudentToFirebase(newUser);

    if (success) {
      alert("✅ नया Student ID create हो गया!");
      clearUserForm();
    }

  } finally {
    isSavingUserUI = false;
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerText = editingUserCode ? "💾 Update Student ID" : "➕ Create Student ID";
    }
  }
}


// =====================================================
// ✏️ EDIT USER
// =====================================================

function editUser(code) {
  const user = students.find(
    student => String(student.code).trim().toUpperCase() === String(code).trim().toUpperCase()
  );

  if (!user) return;
  if (user.isAdmin === true) {
    alert("⚠️ Admin ID यहाँ edit नहीं की जा सकती।");
    return;
  }

  editingUserCode = user.code;

  const name = document.getElementById("userName");
  const codeInput = document.getElementById("userCode");
  const password = document.getElementById("userPassword");
  const userClass = document.getElementById("userClass");

  if (name) name.value = user.name;
  if (codeInput) codeInput.value = user.code;
  if (password) password.value = user.password;
  if (userClass) userClass.value = user.userClass || "Class 6th";

  const saveButton = document.getElementById("saveUserBtn");
  if (saveButton) saveButton.innerText = "💾 Update Student ID";

  const cancelButton = document.getElementById("cancelUserBtn");
  if (cancelButton) cancelButton.classList.remove("hidden");
}


// =====================================================
// ❌ CLEAR USER FORM
// =====================================================

function clearUserForm() {
  editingUserCode = null;

  const name = document.getElementById("userName");
  const code = document.getElementById("userCode");
  const password = document.getElementById("userPassword");

  if (name) name.value = "";
  if (code) code.value = "";
  if (password) password.value = "";

  const saveButton = document.getElementById("saveUserBtn");
  if (saveButton) saveButton.innerText = "➕ Create Student ID";

  const cancelButton = document.getElementById("cancelUserBtn");
  if (cancelButton) cancelButton.classList.add("hidden");
}


// =====================================================
// 🗑️ DELETE USER
// =====================================================

async function deleteUser(code) {
  if (!currentStudent || !currentStudent.isAdmin) return;

  const user = students.find(
    student => String(student.code).trim().toUpperCase() === String(code).trim().toUpperCase()
  );

  if (!user) return;
  if (user.isAdmin === true) {
    alert("❌ Admin ID delete नहीं की जा सकती।");
    return;
  }

  const confirmed = confirm(`क्या आप "${user.name}" की Student ID delete करना चाहते हैं?`);
  if (!confirmed) return;

  if (typeof window.deleteStudentFromFirebase !== "function") {
    alert("❌ Firebase student delete function नहीं मिला।");
    return;
  }

  const success = await window.deleteStudentFromFirebase(user.code);
  if (!success) return;

  alert("✅ Student ID delete हो गई!");
}


// =====================================================
// 🚪 LOGOUT
// =====================================================

function logout() {
  clearInterval(timer);
  clearInterval(countdownTimer);
  clearTimeout(quizEndTimer);

  timer = null;
  countdownTimer = null;
  quizEndTimer = null;

  if (stopResultsListener) {
    stopResultsListener();
    stopResultsListener = null;
  }

  removeLoginSession();

  currentStudent = null;
  selectedQuiz = null;
  quizSubmitted = false;
  currentQuestionIndex = 0;
  score = 0;
  userResponses = [];
  editingQuizId = null;
  editingUserCode = null;

  const code = document.getElementById("code");
  const password = document.getElementById("password");

  if (code) code.value = "";
  if (password) password.value = "";

  const quizArea = document.getElementById("quizArea");
  if (quizArea) quizArea.classList.add("hidden");

  const loginBox = document.getElementById("loginBox");
  if (loginBox) loginBox.classList.remove("hidden");

  const studentSection = document.getElementById("studentSection");
  if (studentSection) studentSection.classList.remove("hidden");

  const adminPanel = document.getElementById("adminPanel");
  if (adminPanel) adminPanel.classList.add("hidden");

  const quiz = document.getElementById("quiz");
  if (quiz) quiz.innerHTML = "";

  const results = document.getElementById("results");
  if (results) {
    results.innerHTML = `
      <h3>🏆 Live Quiz Results</h3>
      <p>Quiz select करने के बाद result यहाँ दिखाई देगा।</p>
    `;
  }

  const memberCount = document.getElementById("memberCount");
  if (memberCount) memberCount.innerText = "Live Members: 0";

  alert("🚪 Logout successfully हो गया।");
}


// =====================================================
// 🔗 DOM READY INITS
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  restoreLoginSession();

  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) loginBtn.onclick = login;

  const passwordInput = document.getElementById("password");
  if (passwordInput) {
    passwordInput.onkeydown = (event) => {
      if (event.key === "Enter") login();
    };
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.onclick = logout;

  const addQuestionBtn = document.getElementById("addQuestionBtn");
  if (addQuestionBtn) addQuestionBtn.onclick = addQuestion;

  const saveQuizBtn = document.getElementById("saveQuizBtn");
  if (saveQuizBtn) saveQuizBtn.onclick = saveQuiz;

  const cancelEditBtn = document.getElementById("cancelEditBtn");
  if (cancelEditBtn) cancelEditBtn.onclick = cancelEdit;

  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) resetBtn.onclick = resetQuiz;

  const closeAkBtn = document.getElementById("closeAnswerKeyBtn");
  if (closeAkBtn) closeAkBtn.onclick = closeAnswerKeyModal;

  const closeAkFooterBtn = document.getElementById("closeAnswerKeyFooterBtn");
  if (closeAkFooterBtn) closeAkFooterBtn.onclick = closeAnswerKeyModal;

  // Quiz Mode select बदलते ही Date/Time fields show/hide होंगे
  const quizModeSelect = document.getElementById("quizMode");
  if (quizModeSelect) {
    quizModeSelect.onchange = () => toggleTimingFieldsByMode(quizModeSelect.value);
    toggleTimingFieldsByMode(quizModeSelect.value);
  }

  // Firebase Quizzes Listener
  if (typeof window.listenQuizzes === "function") {
    window.listenQuizzes(data => {
      quizzes = data || {};
      if (currentStudent) {
        if (currentStudent.isAdmin) renderSavedQuizzes();
        else renderStudentQuizzes();
      }
    });
  } else {
    setTimeout(() => {
      if (typeof window.listenQuizzes === "function") {
        window.listenQuizzes(data => {
          quizzes = data || {};
          if (currentStudent) {
            if (currentStudent.isAdmin) renderSavedQuizzes();
            else renderStudentQuizzes();
          }
        });
      }
    }, 700);
  }

  // Firebase Students Listener
  if (typeof window.listenStudents === "function") {
    window.listenStudents(data => {
      updateStudentsFromFirebase(data);
    });
  } else {
    setTimeout(() => {
      if (typeof window.listenStudents === "function") {
        window.listenStudents(data => {
          updateStudentsFromFirebase(data);
        });
      }
    }, 700);
  }
});


// =====================================================
// 🛡️ ESCAPE HTML HELPER
// =====================================================

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
