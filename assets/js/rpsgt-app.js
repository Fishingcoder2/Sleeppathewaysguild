(function () {
  "use strict";

  var STORAGE_KEY = "spg-rpsgt-study-trail-v15-8";
  var main = document.getElementById("room-content");
  var nav = document.getElementById("room-nav");
  var menuButton = document.getElementById("menu-button");
  var appData = null;
  var flashcardData = null;
  var activeQuestion = null;
  var activeCardIndex = 0;
  var activeDeck = [];
  var cardBackVisible = false;
  var mockSession = null;
  var reportView = "progress";

  var progress = loadProgress();

  function defaultProgress() {
    return {
      answered: {},
      flagged: [],
      sessions: [],
      lastRoom: "home"
    };
  }

  function loadProgress() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Object.assign(defaultProgress(), saved || {});
    } catch (error) {
      return defaultProgress();
    }
  }

  function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  function element(tag, options) {
    var node = document.createElement(tag);
    var opts = options || {};
    if (opts.className) node.className = opts.className;
    if (opts.text !== undefined) node.textContent = String(opts.text);
    if (opts.html !== undefined) node.innerHTML = opts.html;
    if (opts.type) node.type = opts.type;
    if (opts.id) node.id = opts.id;
    if (opts.value !== undefined) node.value = opts.value;
    if (opts.href) node.href = opts.href;
    if (opts.placeholder) node.placeholder = opts.placeholder;
    if (opts.attributes) {
      Object.keys(opts.attributes).forEach(function (name) {
        node.setAttribute(name, opts.attributes[name]);
      });
    }
    if (opts.onClick) node.addEventListener("click", opts.onClick);
    return node;
  }

  function append(parent) {
    for (var i = 1; i < arguments.length; i += 1) {
      if (arguments[i]) parent.appendChild(arguments[i]);
    }
    return parent;
  }

  function clearMain() {
    while (main.firstChild) main.removeChild(main.firstChild);
  }

  function roomHead(kicker, title, description, action) {
    var wrap = element("div", { className: "room-head" });
    var text = element("div");
    append(text,
      element("p", { className: "room-kicker", text: kicker }),
      element("h2", { text: title }),
      element("p", { text: description })
    );
    append(wrap, text, action);
    return wrap;
  }

  function button(label, handler, variant) {
    return element("button", {
      className: "button" + (variant ? " " + variant : ""),
      text: label,
      type: "button",
      onClick: handler
    });
  }

  function coach(message) {
    var card = element("aside", { className: "coach-card" });
    var image = element("img", {
      attributes: {
        src: "assets/coach-bob/coach-bob-avatar.jpg",
        alt: "Coach Bob"
      }
    });
    var copy = element("div");
    append(copy, element("strong", { text: "Coach Bob" }), element("p", { text: message }));
    return append(card, image, copy);
  }

  function stat(label, value) {
    var card = element("div", { className: "stat-card" });
    return append(card, element("span", { text: label }), element("strong", { text: value }));
  }

  function questionBank() {
    return appData && appData.seed && Array.isArray(appData.seed.questionBank) ? appData.seed.questionBank : [];
  }

  function glossary() {
    return appData && Array.isArray(appData.glossary) ? appData.glossary : [];
  }

  function references() {
    return appData && Array.isArray(appData.publicRefs) ? appData.publicRefs : [];
  }

  function answeredRecords() {
    return Object.keys(progress.answered).map(function (id) { return progress.answered[id]; });
  }

  function metrics() {
    var records = answeredRecords();
    var correct = records.filter(function (record) { return record.correct; }).length;
    return {
      answered: records.length,
      correct: correct,
      missed: records.length - correct,
      accuracy: records.length ? Math.round(correct / records.length * 100) : 0,
      flagged: progress.flagged.length
    };
  }

  function domainName(code) {
    var domains = appData.seed.blueprintDomains || [];
    var match = domains.find(function (domain) { return domain.id === code; });
    return match ? match.fullName : code || "General";
  }

  function domainMetrics() {
    var result = {};
    questionBank().forEach(function (question) {
      if (!result[question.domain]) result[question.domain] = { answered: 0, correct: 0 };
      var record = progress.answered[question.id];
      if (record) {
        result[question.domain].answered += 1;
        if (record.correct) result[question.domain].correct += 1;
      }
    });
    return result;
  }

  function taskMetrics() {
    var result = {};
    answeredRecords().forEach(function (record) {
      var task = record.task || record.topic || "General review";
      if (!result[task]) result[task] = { answered: 0, correct: 0 };
      result[task].answered += 1;
      if (record.correct) result[task].correct += 1;
    });
    return result;
  }

  function readinessScore() {
    var m = metrics();
    var coverage = Math.min(100, Math.round(m.answered / 150 * 100));
    return Math.round((m.accuracy * .7) + (coverage * .3));
  }

  function setRoom(room, options) {
    var target = room || "home";
    progress.lastRoom = target;
    saveProgress();
    Array.prototype.forEach.call(nav.querySelectorAll("[data-room]"), function (item) {
      if (item.getAttribute("data-room") === target) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
    nav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
    clearMain();
    var renderers = {
      home: renderHome,
      practice: renderPractice,
      mock: renderMock,
      math: renderMath,
      flashcards: renderFlashcards,
      library: renderLibrary,
      reports: renderReports
    };
    (renderers[target] || renderHome)(options || {});
    main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderHome() {
    var m = metrics();
    append(main,
      roomHead("Trailhead", "Welcome back to the Study Trail", "Choose one learning task for this session. Your work stays on this device."),
      coach(nextStudyMessage()),
      append(element("div", { className: "stats" }),
        stat("Questions answered", m.answered),
        stat("Accuracy", m.accuracy + "%"),
        stat("Flagged", m.flagged),
        stat("Readiness", readinessScore() + "%")
      )
    );

    var cards = element("div", { className: "grid three" });
    addHomeCard(cards, "Practice one question", "Work one item at a time with immediate rationale.", "Start practice", function () { setRoom("practice"); });
    addHomeCard(cards, "Review flashcards", "Flip, flag, and print front/back cards for quick review.", "Open flashcards", function () { setRoom("flashcards"); });
    addHomeCard(cards, "See what to study", "Use your missed items and domain performance to choose tonight's focus.", "Open reports", function () { setRoom("reports"); });
    append(main, cards);
  }

  function addHomeCard(parent, title, copy, label, handler) {
    var card = element("article", { className: "panel" });
    append(card, element("h3", { text: title }), element("p", { text: copy }), button(label, handler));
    parent.appendChild(card);
  }

  function nextStudyMessage() {
    var m = metrics();
    if (!m.answered) return "Start with ten practice questions. Accuracy can wait; first we need a useful baseline.";
    if (m.missed) return "Your missed-item report is ready. Review the pattern, then return for a short focused practice set.";
    return "Strong start. Add another short practice set or test your pacing in the Mock Exam room.";
  }

  function selectField(labelText, id, choices) {
    var field = element("div", { className: "field" });
    var label = element("label", { text: labelText, attributes: { for: id } });
    var select = element("select", { id: id });
    choices.forEach(function (choice) {
      var option = element("option", { text: choice.label, value: choice.value });
      select.appendChild(option);
    });
    return append(field, label, select);
  }

  function renderPractice(options) {
    append(main, roomHead("Practice Room", "One question at a time", "Choose a domain, answer the item, read the rationale, then take the next step."));
    var toolbar = element("div", { className: "toolbar no-print" });
    var domainField = selectField("Domain", "practice-domain", [
      { label: "All domains", value: "all" },
      { label: "Domain 1", value: "D1" },
      { label: "Domain 2", value: "D2" },
      { label: "Domain 3", value: "D3" },
      { label: "Domain 4", value: "D4" }
    ]);
    var modeField = selectField("Question set", "practice-mode", [
      { label: "Unanswered first", value: "unanswered" },
      { label: "Missed items", value: "missed" },
      { label: "Flagged items", value: "flagged" },
      { label: "All questions", value: "all" }
    ]);
    var nextBox = element("div", { className: "field" });
    append(nextBox, element("label", { text: "Next action" }), button("Load question", function () {
      activeQuestion = choosePracticeQuestion(
        document.getElementById("practice-domain").value,
        document.getElementById("practice-mode").value
      );
      renderPracticeQuestion();
    }));
    append(toolbar, domainField, modeField, nextBox);
    append(main, toolbar, element("div", { id: "practice-stage" }));
    activeQuestion = options.question || choosePracticeQuestion("all", "unanswered");
    renderPracticeQuestion();
  }

  function choosePracticeQuestion(domain, mode) {
    var bank = questionBank().filter(function (question) {
      if (domain !== "all" && question.domain !== domain) return false;
      if (mode === "unanswered" && progress.answered[question.id]) return false;
      if (mode === "missed" && (!progress.answered[question.id] || progress.answered[question.id].correct)) return false;
      if (mode === "flagged" && progress.flagged.indexOf(String(question.id)) === -1) return false;
      return Array.isArray(question.options) && question.options.length && question.answer;
    });
    if (!bank.length && mode === "unanswered") return choosePracticeQuestion(domain, "all");
    return bank.length ? bank[Math.floor(Math.random() * bank.length)] : null;
  }

  function renderPracticeQuestion() {
    var stage = document.getElementById("practice-stage");
    while (stage.firstChild) stage.removeChild(stage.firstChild);
    if (!activeQuestion) {
      stage.appendChild(element("div", { className: "empty", text: "No questions match this set yet. Choose another domain or question set." }));
      return;
    }
    var card = element("article", { className: "question-card" });
    append(card,
      element("span", { className: "tag", text: activeQuestion.domain }),
      element("span", { className: "tag", text: activeQuestion.topic || activeQuestion.task || "Practice" }),
      element("h3", { text: activeQuestion.prompt })
    );
    var options = element("div", { className: "option-list" });
    activeQuestion.options.forEach(function (choice) {
      options.appendChild(element("button", {
        className: "option",
        text: choice,
        type: "button",
        onClick: function (event) { answerPractice(choice, event.currentTarget, options); }
      }));
    });
    var actions = element("div", { className: "actions no-print" });
    append(actions,
      button(isFlagged(activeQuestion.id) ? "Remove flag" : "Flag for review", function () {
        toggleFlag(activeQuestion.id);
        renderPracticeQuestion();
      }, "secondary"),
      button("Next question", function () {
        activeQuestion = choosePracticeQuestion(
          document.getElementById("practice-domain").value,
          document.getElementById("practice-mode").value
        );
        renderPracticeQuestion();
      }, "gold")
    );
    append(card, options, actions);
    stage.appendChild(card);
  }

  function answerPractice(choice, clicked, optionBox) {
    var correct = choice === activeQuestion.answer;
    progress.answered[activeQuestion.id] = {
      id: String(activeQuestion.id),
      domain: activeQuestion.domain || "General",
      task: activeQuestion.task || "",
      topic: activeQuestion.topic || "",
      prompt: activeQuestion.prompt,
      answer: activeQuestion.answer,
      rationale: activeQuestion.rationale || "",
      choice: choice,
      correct: correct,
      timestamp: new Date().toISOString()
    };
    saveProgress();
    Array.prototype.forEach.call(optionBox.querySelectorAll("button"), function (item) {
      item.disabled = true;
      if (item.textContent === activeQuestion.answer) item.classList.add("correct");
    });
    if (!correct) clicked.classList.add("wrong");
    var feedback = element("div", { className: "feedback" });
    append(feedback,
      element("strong", { text: correct ? "Correct." : "Review this one." }),
      element("p", { text: activeQuestion.rationale || "Correct answer: " + activeQuestion.answer })
    );
    optionBox.parentNode.insertBefore(feedback, optionBox.nextSibling);
  }

  function isFlagged(id) {
    return progress.flagged.indexOf(String(id)) !== -1;
  }

  function toggleFlag(id) {
    var key = String(id);
    var index = progress.flagged.indexOf(key);
    if (index === -1) progress.flagged.push(key);
    else progress.flagged.splice(index, 1);
    saveProgress();
  }

  function renderMock() {
    append(main, roomHead("Mock Exam Room", "Practice exam decisions", "Use a 25-question mixed set. Results feed the Mock Exam Report and your next-study guidance."));
    if (!mockSession) {
      var intro = element("div", { className: "grid two" });
      var panel = element("section", { className: "panel" });
      append(panel,
        element("h3", { text: "25-question readiness check" }),
        element("p", { text: "Questions are mixed across the four domains. Answer every item, then submit the session for a scored report." }),
        button("Start mock exam", startMock, "gold")
      );
      append(intro, panel, coach("Treat this as a pacing rehearsal. Make the best decision, flag uncertainty mentally, and keep moving."));
      main.appendChild(intro);
      return;
    }
    renderMockQuestion();
  }

  function shuffled(items) {
    var copy = items.slice();
    for (var i = copy.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  function startMock() {
    var pools = ["D1", "D2", "D3", "D4"].map(function (domain) {
      return shuffled(questionBank().filter(function (question) {
        return question.domain === domain && Array.isArray(question.options) && question.answer;
      })).slice(0, 7);
    });
    mockSession = {
      questions: shuffled([].concat.apply([], pools)).slice(0, 25),
      index: 0,
      answers: {},
      startedAt: new Date().toISOString()
    };
    setRoom("mock");
  }

  function renderMockQuestion() {
    var question = mockSession.questions[mockSession.index];
    var card = element("article", { className: "question-card" });
    append(card,
      element("p", { className: "room-kicker", text: "Question " + (mockSession.index + 1) + " of " + mockSession.questions.length }),
      element("span", { className: "tag", text: question.domain }),
      element("h3", { text: question.prompt })
    );
    var options = element("div", { className: "option-list" });
    question.options.forEach(function (choice) {
      var item = element("button", {
        className: "option",
        text: choice,
        type: "button",
        onClick: function () {
          mockSession.answers[question.id] = choice;
          renderMockQuestion();
        }
      });
      if (mockSession.answers[question.id] === choice) item.classList.add("correct");
      options.appendChild(item);
    });
    var actions = element("div", { className: "actions" });
    var previous = button("Previous", function () {
      mockSession.index = Math.max(0, mockSession.index - 1);
      setRoom("mock");
    }, "secondary");
    previous.disabled = mockSession.index === 0;
    var nextLabel = mockSession.index === mockSession.questions.length - 1 ? "Submit mock exam" : "Next";
    var next = button(nextLabel, function () {
      if (mockSession.index === mockSession.questions.length - 1) finishMock();
      else {
        mockSession.index += 1;
        setRoom("mock");
      }
    }, "gold");
    next.disabled = !mockSession.answers[question.id];
    append(actions, previous, next);
    append(card, options, actions);
    main.appendChild(card);
  }

  function finishMock() {
    var answers = mockSession.answers;
    var correct = 0;
    var domainResults = {};
    mockSession.questions.forEach(function (question) {
      var isCorrect = answers[question.id] === question.answer;
      if (isCorrect) correct += 1;
      if (!domainResults[question.domain]) domainResults[question.domain] = { total: 0, correct: 0 };
      domainResults[question.domain].total += 1;
      if (isCorrect) domainResults[question.domain].correct += 1;
      progress.answered[question.id] = {
        id: String(question.id),
        domain: question.domain,
        task: question.task || "",
        topic: question.topic || "",
        prompt: question.prompt,
        answer: question.answer,
        rationale: question.rationale || "",
        choice: answers[question.id],
        correct: isCorrect,
        timestamp: new Date().toISOString()
      };
    });
    progress.sessions.push({
      date: new Date().toISOString(),
      total: mockSession.questions.length,
      correct: correct,
      score: Math.round(correct / mockSession.questions.length * 100),
      domains: domainResults
    });
    mockSession = null;
    saveProgress();
    reportView = "mock";
    setRoom("reports");
  }

  function numberField(labelText, id) {
    var field = element("div", { className: "field" });
    append(field,
      element("label", { text: labelText, attributes: { for: id } }),
      element("input", { id: id, type: "number", attributes: { step: "any", min: "0", inputmode: "decimal" } })
    );
    return field;
  }

  function renderMath() {
    append(main,
      roomHead("Math Coach", "Sleep-tech calculations without guesswork", "Use the named calculator for the task in front of you. No free-form expression evaluator is used."),
      coach("Write the units first. Then ask whether the denominator is hours, minutes, total sleep time, or recording time.")
    );
    var grid = element("div", { className: "math-grid" });
    addRateCalculator(grid, "AHI", "Apneas + hypopneas per hour of sleep", "Events", "Hours of sleep", "events/hour");
    addRateCalculator(grid, "RDI", "Apneas + hypopneas + RERAs per hour of sleep", "Events", "Hours of sleep", "events/hour");
    addRateCalculator(grid, "PLMI", "Periodic limb movements per hour of sleep", "PLMs", "Hours of sleep", "movements/hour");
    addRateCalculator(grid, "Apnea Index", "Apneas per hour of sleep", "Apneas", "Hours of sleep", "events/hour");
    addPercentCalculator(grid, "Sleep Efficiency", "Total sleep time divided by time in bed", "Total sleep time (min)", "Time in bed (min)");
    addPercentCalculator(grid, "Oxygen Time Percent", "Time at threshold divided by total sleep time", "Minutes at threshold", "Total sleep time (min)");
    addMinutesCalculator(grid);
    addFrequencyCalculator(grid);
    addOhmCalculator(grid);
    addSignalNotes(grid);
    main.appendChild(grid);
  }

  function calculatorShell(title, formula) {
    var card = element("section", { className: "calculator" });
    append(card, element("h3", { text: title }), element("p", { className: "formula", text: formula }));
    return card;
  }

  function addRateCalculator(parent, title, formula, numeratorLabel, denominatorLabel, unit) {
    var key = "calc-" + title.toLowerCase().replace(/[^a-z]+/g, "-");
    var card = calculatorShell(title, formula);
    var fields = element("div", { className: "calculator-fields" });
    append(fields, numberField(numeratorLabel, key + "-a"), numberField(denominatorLabel, key + "-b"));
    var result = element("div", { className: "result", text: "Enter values to calculate." });
    append(card, fields, button("Calculate", function () {
      var a = readNumber(key + "-a");
      var b = readNumber(key + "-b");
      result.textContent = validDivision(a, b) ? (a / b).toFixed(2) + " " + unit : "Use non-negative values and a denominator above zero.";
    }, "small"), result);
    parent.appendChild(card);
  }

  function addPercentCalculator(parent, title, formula, numeratorLabel, denominatorLabel) {
    var key = "calc-" + title.toLowerCase().replace(/[^a-z]+/g, "-");
    var card = calculatorShell(title, formula);
    var fields = element("div", { className: "calculator-fields" });
    append(fields, numberField(numeratorLabel, key + "-a"), numberField(denominatorLabel, key + "-b"));
    var result = element("div", { className: "result", text: "Enter values to calculate." });
    append(card, fields, button("Calculate", function () {
      var a = readNumber(key + "-a");
      var b = readNumber(key + "-b");
      result.textContent = validDivision(a, b) ? (a / b * 100).toFixed(1) + "%" : "Use non-negative values and a denominator above zero.";
    }, "small"), result);
    parent.appendChild(card);
  }

  function addMinutesCalculator(parent) {
    var card = calculatorShell("Minutes to Hours", "minutes ÷ 60");
    var fields = element("div", { className: "calculator-fields" });
    append(fields, numberField("Minutes", "minutes-value"));
    var result = element("div", { className: "result", text: "Enter minutes to calculate." });
    append(card, fields, button("Convert", function () {
      var value = readNumber("minutes-value");
      if (!Number.isFinite(value) || value < 0) result.textContent = "Enter a non-negative minute value.";
      else result.textContent = Math.floor(value / 60) + " hr " + Math.round(value % 60) + " min (" + (value / 60).toFixed(2) + " hr)";
    }, "small"), result);
    parent.appendChild(card);
  }

  function addFrequencyCalculator(parent) {
    var card = calculatorShell("Frequency / Timebase", "frequency (Hz) = cycles ÷ seconds");
    var fields = element("div", { className: "calculator-fields" });
    append(fields, numberField("Cycles", "frequency-cycles"), numberField("Seconds", "frequency-seconds"));
    var result = element("div", { className: "result", text: "Enter cycles and seconds." });
    append(card, fields, button("Calculate", function () {
      var cycles = readNumber("frequency-cycles");
      var seconds = readNumber("frequency-seconds");
      result.textContent = validDivision(cycles, seconds) ? (cycles / seconds).toFixed(2) + " Hz" : "Seconds must be above zero.";
    }, "small"), result);
    parent.appendChild(card);
  }

  function addOhmCalculator(parent) {
    var card = calculatorShell("Ohm's Law", "V = I × R");
    var fields = element("div", { className: "calculator-fields" });
    var modeField = selectField("Solve for", "ohm-mode", [
      { label: "Voltage (V)", value: "v" },
      { label: "Current (I)", value: "i" },
      { label: "Resistance (R)", value: "r" }
    ]);
    append(fields, modeField, numberField("Value A", "ohm-a"), numberField("Value B", "ohm-b"));
    var result = element("div", { className: "result", text: "Choose the unknown and enter the other two values." });
    append(card, fields, button("Calculate", function () {
      var mode = document.getElementById("ohm-mode").value;
      var a = readNumber("ohm-a");
      var b = readNumber("ohm-b");
      if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) {
        result.textContent = "Enter two non-negative values.";
      } else if (mode === "v") {
        result.textContent = (a * b).toFixed(3) + " V";
      } else if (validDivision(a, b)) {
        result.textContent = (a / b).toFixed(3) + (mode === "i" ? " A" : " Ω");
      } else {
        result.textContent = "The divisor must be above zero.";
      }
    }, "small"), result);
    parent.appendChild(card);
  }

  function addSignalNotes(parent) {
    var card = calculatorShell("Signal & Power Reminders", "Keep units and channel labels exact");
    var list = element("ul");
    ["Sensitivity is commonly expressed in µV/mm.", "Signal amplitude may be documented in µV.", "Line-frequency interference may appear at 60 Hz or 50/60 Hz.", "Common labels include SpO2, TcCO2 / PtcCO2, M1 / M2, and C3 / M2."].forEach(function (text) {
      list.appendChild(element("li", { text: text }));
    });
    append(card, list);
    parent.appendChild(card);
  }

  function readNumber(id) {
    return Number(document.getElementById(id).value);
  }

  function validDivision(a, b) {
    return Number.isFinite(a) && Number.isFinite(b) && a >= 0 && b > 0;
  }

  function buildDeck(kind) {
    var all = flashcardData.cards || [];
    if (kind === "flagged") return all.filter(function (card) { return isFlagged(card.id); });
    if (kind === "missed") return all.filter(function (card) {
      return progress.answered[card.id] && !progress.answered[card.id].correct;
    });
    if (kind === "exam") {
      var weakest = weakestDomain();
      return shuffled(all.filter(function (card) { return card.domain === weakest; })).slice(0, 30);
    }
    return all;
  }

  function weakestDomain() {
    var domains = domainMetrics();
    var keys = ["D1", "D2", "D3", "D4"];
    keys.sort(function (a, b) {
      var aScore = domains[a] && domains[a].answered ? domains[a].correct / domains[a].answered : 0;
      var bScore = domains[b] && domains[b].answered ? domains[b].correct / domains[b].answered : 0;
      return aScore - bScore;
    });
    return keys[0];
  }

  function renderFlashcards() {
    append(main, roomHead("Flashcard Room", "Front, back, then decide", "Use quick phone review or print matched card numbers for front/back study."));
    var toolbar = element("div", { className: "toolbar no-print" });
    var deckField = selectField("Deck", "flashcard-deck", [
      { label: "Full stable deck", value: "all" },
      { label: "Flagged cards", value: "flagged" },
      { label: "Missed-question cards", value: "missed" },
      { label: "Exam-day review", value: "exam" }
    ]);
    deckField.querySelector("select").value = activeDeck.kind || "all";
    deckField.querySelector("select").addEventListener("change", function (event) {
      activeDeck = buildDeck(event.target.value);
      activeDeck.kind = event.target.value;
      activeCardIndex = 0;
      cardBackVisible = false;
      setRoom("flashcards");
    });
    var searchField = element("div", { className: "field" });
    var search = element("input", { type: "search", id: "card-search", placeholder: "Search prompt, answer, or topic" });
    append(searchField, element("label", { text: "Find a card", attributes: { for: "card-search" } }), search);
    search.addEventListener("input", function () {
      var query = search.value.trim().toLowerCase();
      var source = buildDeck(document.getElementById("flashcard-deck").value);
      activeDeck = source.filter(function (card) {
        return [card.front, card.back, card.rationale, card.topic].join(" ").toLowerCase().indexOf(query) !== -1;
      });
      activeDeck.kind = document.getElementById("flashcard-deck").value;
      activeCardIndex = 0;
      cardBackVisible = false;
      renderFlashcardStage();
    });
    var printBox = element("div", { className: "field" });
    append(printBox, element("label", { text: "Print study set" }), button("Print this deck", function () { printCards(activeDeck); }, "secondary"));
    append(toolbar, deckField, searchField, printBox);
    main.appendChild(toolbar);
    if (!activeDeck.length) {
      activeDeck = buildDeck("all");
      activeDeck.kind = "all";
    }
    main.appendChild(element("div", { id: "flashcard-stage" }));
    renderFlashcardStage();
  }

  function renderFlashcardStage() {
    var stage = document.getElementById("flashcard-stage");
    while (stage.firstChild) stage.removeChild(stage.firstChild);
    if (!activeDeck.length) {
      stage.appendChild(element("div", { className: "empty", text: "This deck is empty. Flag questions or answer practice items to build it." }));
      return;
    }
    if (activeCardIndex >= activeDeck.length) activeCardIndex = 0;
    var card = activeDeck[activeCardIndex];
    var face = element("article", { className: "flashcard" });
    append(face,
      element("p", { className: "side-label", text: cardBackVisible ? "Back" : "Front" }),
      element("span", { className: "tag", text: "Card " + card.number + " · " + card.domain }),
      element("h3", { text: cardBackVisible ? card.back : card.front })
    );
    if (cardBackVisible && card.rationale) face.appendChild(element("p", { text: card.rationale }));
    face.addEventListener("click", function () {
      cardBackVisible = !cardBackVisible;
      renderFlashcardStage();
    });
    var actions = element("div", { className: "actions no-print" });
    append(actions,
      button("Previous", function () {
        activeCardIndex = (activeCardIndex - 1 + activeDeck.length) % activeDeck.length;
        cardBackVisible = false;
        renderFlashcardStage();
      }, "secondary"),
      button(cardBackVisible ? "Show front" : "Show back", function () {
        cardBackVisible = !cardBackVisible;
        renderFlashcardStage();
      }, "gold"),
      button("Next", function () {
        activeCardIndex = (activeCardIndex + 1) % activeDeck.length;
        cardBackVisible = false;
        renderFlashcardStage();
      }, "secondary"),
      button(isFlagged(card.id) ? "Unflag card" : "Flag card", function () {
        toggleFlag(card.id);
        renderFlashcardStage();
      }, "secondary"),
      button("Print this card", function () { printCards([card]); }, "secondary")
    );
    append(stage, face, element("p", { className: "muted", text: (activeCardIndex + 1) + " of " + activeDeck.length + " · Tap the card to flip." }), actions);
  }

  function printCards(cards) {
    if (!cards || !cards.length) return;
    var pages = [];
    cards.forEach(function (card) {
      pages.push('<section class="card"><small>Card ' + escapeHtml(card.number) + ' · FRONT</small><h1>' + escapeHtml(card.front) + '</h1></section>');
      pages.push('<section class="card"><small>Card ' + escapeHtml(card.number) + ' · BACK</small><h1>' + escapeHtml(card.back) + '</h1><p>' + escapeHtml(card.rationale || card.keyPoint || "") + '</p></section>');
    });
    printDocument("RPSGT Flashcards", pages.join(""));
  }

  function printDocument(title, body) {
    var frame = document.createElement("iframe");
    frame.className = "sr-only";
    frame.title = "Print preview";
    document.body.appendChild(frame);
    var styles = "@page{size:letter;margin:.45in}body{font-family:Arial;color:#111}.card{height:4.5in;border:2px solid #17384d;border-radius:18px;padding:.35in;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;page-break-after:always}.card small{color:#555;letter-spacing:.12em}.card h1{font-size:24px;line-height:1.35}.card p{font-size:15px;line-height:1.5}.summary{padding:.2in}.summary table{width:100%;border-collapse:collapse}.summary th,.summary td{padding:8px;border-bottom:1px solid #bbb;text-align:left}";
    frame.srcdoc = "<!doctype html><html><head><title>" + escapeHtml(title) + "</title><style>" + styles + "</style></head><body>" + body + "</body></html>";
    frame.addEventListener("load", function () {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      window.setTimeout(function () { frame.remove(); }, 1500);
    });
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderLibrary() {
    append(main, roomHead("Library", "Glossary and references", "Search one combined library, then return to the learning task that brought you here."));
    var panel = element("section", { className: "panel" });
    var controls = element("div", { className: "toolbar" });
    var typeField = selectField("Show", "library-type", [
      { label: "Glossary", value: "glossary" },
      { label: "References", value: "references" }
    ]);
    var searchField = element("div", { className: "field" });
    var input = element("input", { type: "search", id: "library-search", placeholder: "Search terms, explanations, titles, or authors" });
    append(searchField, element("label", { text: "Search", attributes: { for: "library-search" } }), input);
    append(controls, typeField, searchField);
    append(panel, controls, element("div", { id: "library-results", className: "library-list" }));
    main.appendChild(panel);
    document.getElementById("library-type").addEventListener("change", renderLibraryResults);
    input.addEventListener("input", renderLibraryResults);
    renderLibraryResults();
  }

  function renderLibraryResults() {
    var target = document.getElementById("library-results");
    var type = document.getElementById("library-type").value;
    var query = document.getElementById("library-search").value.trim().toLowerCase();
    while (target.firstChild) target.removeChild(target.firstChild);
    var items = type === "glossary" ? glossary() : references();
    var filtered = items.filter(function (item) {
      return Object.keys(item).map(function (key) {
        return typeof item[key] === "string" ? item[key] : "";
      }).join(" ").toLowerCase().indexOf(query) !== -1;
    }).slice(0, 80);
    if (!filtered.length) {
      target.appendChild(element("div", { className: "empty", text: "No matching library entries." }));
      return;
    }
    filtered.forEach(function (item) {
      var card = element("article", { className: "library-item" });
      if (type === "glossary") {
        append(card,
          element("h3", { text: item.term }),
          element("span", { className: "tag", text: item.category || "Glossary" }),
          element("p", { text: item.plain || "" }),
          item.why ? element("p", { text: "Why it matters: " + item.why }) : null
        );
      } else {
        append(card,
          element("h3", { text: item.title }),
          element("p", { text: [item.author, item.year].filter(Boolean).join(" · ") })
        );
      }
      target.appendChild(card);
    });
  }

  function renderReports() {
    append(main, roomHead("Reports Room", "Turn practice into a study decision", "See what is weak, what keeps repeating, whether you are mock-ready, and what to print."));
    var tabs = element("div", { className: "report-tabs no-print" });
    [
      ["progress", "Practice Progress"],
      ["readiness", "Readiness"],
      ["mock", "Mock Exam"],
      ["missed", "Flagged / Missed"],
      ["next", "What to Study Next"],
      ["qa", "Admin QA"]
    ].forEach(function (entry) {
      var item = button(entry[1], function () {
        reportView = entry[0];
        renderReportBody();
      }, "secondary small");
      item.setAttribute("aria-pressed", reportView === entry[0] ? "true" : "false");
      item.setAttribute("data-report", entry[0]);
      tabs.appendChild(item);
    });
    append(main, tabs, element("div", { id: "report-body" }));
    renderReportBody();
  }

  function renderReportBody() {
    var target = document.getElementById("report-body");
    while (target.firstChild) target.removeChild(target.firstChild);
    Array.prototype.forEach.call(document.querySelectorAll("[data-report]"), function (item) {
      item.setAttribute("aria-pressed", item.getAttribute("data-report") === reportView ? "true" : "false");
    });
    if (reportView === "progress") renderProgressReport(target);
    else if (reportView === "readiness") renderReadinessReport(target);
    else if (reportView === "mock") renderMockReport(target);
    else if (reportView === "missed") renderMissedReport(target);
    else if (reportView === "next") renderNextReport(target);
    else renderQaReport(target);
  }

  function reportDomainRows(parent, source) {
    ["D1", "D2", "D3", "D4"].forEach(function (code) {
      var value = source[code] || { answered: 0, correct: 0 };
      var total = value.answered !== undefined ? value.answered : value.total;
      var score = total ? Math.round(value.correct / total * 100) : 0;
      var row = element("div", { className: "report-row" });
      var bar = element("div", { className: "report-bar" });
      bar.appendChild(element("span", { attributes: { style: "width:" + score + "%" } }));
      append(row, element("span", { text: code + " · " + domainName(code) }), bar, element("strong", { text: score + "%" }));
      parent.appendChild(row);
    });
  }

  function renderProgressReport(target) {
    var m = metrics();
    var panel = element("section", { className: "panel" });
    append(panel,
      element("h3", { text: "Practice Progress Report" }),
      append(element("div", { className: "stats" }),
        stat("Answered", m.answered),
        stat("Correct", m.correct),
        stat("Missed", m.missed),
        stat("Accuracy", m.accuracy + "%")
      ),
      element("h3", { text: "Domain / Task performance" })
    );
    reportDomainRows(panel, domainMetrics());
    panel.appendChild(element("h3", { text: "Task performance" }));
    var tasks = taskMetrics();
    var taskNames = Object.keys(tasks).sort(function (a, b) {
      return tasks[b].answered - tasks[a].answered;
    }).slice(0, 12);
    if (!taskNames.length) {
      panel.appendChild(element("p", { className: "muted", text: "Task performance appears after the first answered question." }));
    } else {
      taskNames.forEach(function (name) {
        var value = tasks[name];
        var score = Math.round(value.correct / value.answered * 100);
        var row = element("div", { className: "report-row" });
        var bar = element("div", { className: "report-bar" });
        bar.appendChild(element("span", { attributes: { style: "width:" + score + "%" } }));
        append(row, element("span", { text: name }), bar, element("strong", { text: score + "%" }));
        panel.appendChild(row);
      });
    }
    panel.appendChild(button("Print learner summary", printLearnerSummary, "secondary"));
    target.appendChild(panel);
  }

  function renderReadinessReport(target) {
    var score = readinessScore();
    var panel = element("section", { className: "panel" });
    var message = score >= 80 ? "Your recent accuracy and practice coverage support a full mock-exam rehearsal." :
      score >= 60 ? "You are building readiness. Strengthen the lowest domain before the next mock." :
        "Keep the sessions short and focused. Build a larger practice sample before relying on the score.";
    append(panel,
      element("h3", { text: "Readiness Report" }),
      element("p", { className: "room-kicker", text: score + "% readiness indicator" }),
      element("p", { text: message }),
      coach("Readiness is a study signal, not a guarantee. Use it to choose the next task, not to judge yourself.")
    );
    target.appendChild(panel);
  }

  function renderMockReport(target) {
    var session = progress.sessions.length ? progress.sessions[progress.sessions.length - 1] : null;
    if (!session) {
      target.appendChild(element("div", { className: "empty", text: "No completed mock exam yet. Complete a 25-question session to create this report." }));
      return;
    }
    var panel = element("section", { className: "panel" });
    append(panel,
      element("h3", { text: "Mock Exam Report" }),
      element("p", { className: "room-kicker", text: session.score + "% · " + session.correct + " of " + session.total }),
      element("p", { text: "Completed " + new Date(session.date).toLocaleString() })
    );
    var normalized = {};
    Object.keys(session.domains || {}).forEach(function (key) {
      normalized[key] = {
        total: session.domains[key].total,
        correct: session.domains[key].correct
      };
    });
    reportDomainRows(panel, normalized);
    target.appendChild(panel);
  }

  function renderMissedReport(target) {
    var missed = answeredRecords().filter(function (record) { return !record.correct; });
    var flagged = progress.flagged;
    var panel = element("section", { className: "panel" });
    append(panel,
      element("h3", { text: "Flagged / Missed Item Report" }),
      element("p", { text: missed.length + " missed items · " + flagged.length + " flagged items" }),
      button("Open missed items as flashcards", function () {
        activeDeck = buildDeck("missed");
        activeDeck.kind = "missed";
        setRoom("flashcards");
      }, "gold")
    );
    var list = element("div", { className: "missed-list" });
    missed.slice(0, 40).forEach(function (record) {
      var item = element("article", { className: "library-item" });
      append(item,
        element("span", { className: "tag", text: record.domain }),
        element("h3", { text: record.prompt }),
        element("p", { text: "Your answer: " + record.choice }),
        element("p", { text: "Correct answer: " + record.answer }),
        element("p", { text: record.rationale })
      );
      list.appendChild(item);
    });
    if (!missed.length) list.appendChild(element("div", { className: "empty", text: "No missed items have been recorded." }));
    append(panel, list);
    target.appendChild(panel);
  }

  function renderNextReport(target) {
    var domain = weakestDomain();
    var domainData = domainMetrics()[domain] || { answered: 0, correct: 0 };
    var accuracy = domainData.answered ? Math.round(domainData.correct / domainData.answered * 100) : 0;
    var panel = element("section", { className: "panel" });
    append(panel,
      element("h3", { text: "What to Study Next" }),
      element("p", { className: "room-kicker", text: domain + " · " + domainName(domain) }),
      element("p", { text: domainData.answered ? "Current accuracy in this domain is " + accuracy + "% across " + domainData.answered + " answered items." : "This domain has the least evidence so far. Start here to build a balanced baseline." }),
      coach("Tonight: review ten cards from this domain, answer ten focused questions, then stop. Consistency beats one oversized session."),
      button("Start focused practice", function () {
        setRoom("practice");
        document.getElementById("practice-domain").value = domain;
        activeQuestion = choosePracticeQuestion(domain, "unanswered");
        renderPracticeQuestion();
      }, "gold")
    );
    target.appendChild(panel);
  }

  function renderQaReport(target) {
    var qc = appData.qualityControl || appData.seed.qualityControl || {};
    var panel = element("section", { className: "panel" });
    append(panel,
      element("h3", { text: "Admin QA Dashboard" }),
      element("p", { text: "Dataset and runtime checks for the assimilated build." }),
      append(element("div", { className: "stats" }),
        stat("Questions", questionBank().length),
        stat("Flashcards", flashcardData.cards.length),
        stat("Glossary terms", glossary().length),
        stat("References", references().length)
      )
    );
    var checks = [
      ["Answers missing from options", qc.answerNotInOptionsCount || 0],
      ["Missing reference keys", qc.missingReferenceKeysCount || 0],
      ["Exact duplicate prompts", qc.exactDuplicatePromptCount || 0],
      ["Manual review recommended", qc.manualReviewRecommendedCount || 0]
    ];
    var list = element("div", { className: "library-list" });
    checks.forEach(function (check) {
      var item = element("div", { className: "library-item" });
      append(item, element("strong", { text: check[0] }), element("p", { text: String(check[1]) }));
      list.appendChild(item);
    });
    append(panel, list, element("p", { className: "muted", text: "Runtime: room isolation enabled; calculator uses named arithmetic operations; learner progress stays in local storage." }));
    target.appendChild(panel);
  }

  function printLearnerSummary() {
    var m = metrics();
    var domains = domainMetrics();
    var rows = ["D1", "D2", "D3", "D4"].map(function (code) {
      var value = domains[code] || { answered: 0, correct: 0 };
      var score = value.answered ? Math.round(value.correct / value.answered * 100) : 0;
      return "<tr><td>" + escapeHtml(code + " · " + domainName(code)) + "</td><td>" + value.answered + "</td><td>" + score + "%</td></tr>";
    }).join("");
    var body = '<section class="summary"><h1>RPSGT Learner Summary</h1><p>Printed ' + escapeHtml(new Date().toLocaleString()) + '</p><p><strong>Answered:</strong> ' + m.answered + ' &nbsp; <strong>Accuracy:</strong> ' + m.accuracy + '% &nbsp; <strong>Readiness:</strong> ' + readinessScore() + '%</p><h2>Domain performance</h2><table><thead><tr><th>Domain</th><th>Answered</th><th>Accuracy</th></tr></thead><tbody>' + rows + '</tbody></table><h2>What to study next</h2><p>' + escapeHtml(weakestDomain() + " · " + domainName(weakestDomain())) + '</p><p>Review missed items and verify rule-sensitive details against current official references.</p></section>';
    printDocument("RPSGT Learner Summary", body);
  }

  function bindNavigation() {
    nav.addEventListener("click", function (event) {
      var item = event.target.closest("[data-room]");
      if (item) setRoom(item.getAttribute("data-room"));
    });
    menuButton.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function loadData() {
    return Promise.all([
      fetch("assets/data/app-data.json").then(function (response) {
        if (!response.ok) throw new Error("Question data failed to load.");
        return response.json();
      }),
      fetch("assets/data/flashcards-stable.json").then(function (response) {
        if (!response.ok) throw new Error("Flashcard data failed to load.");
        return response.json();
      })
    ]);
  }

  function showLoadError(error) {
    clearMain();
    var panel = element("section", { className: "loading-card" });
    append(panel,
      element("h2", { text: "The Study Trail could not load its data." }),
      element("p", { text: error.message }),
      element("p", { text: "Serve this folder through Cloudflare Pages or a local web server so the assets/data files are available." })
    );
    main.appendChild(panel);
  }

  bindNavigation();
  loadData().then(function (loaded) {
    appData = loaded[0];
    flashcardData = loaded[1];
    setRoom(progress.lastRoom || "home");
  }).catch(showLoadError);
}());
