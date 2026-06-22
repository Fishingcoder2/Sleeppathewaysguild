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
  var activeGuideIndex = 0;
  var activeLab = "waveforms";
  var activeLabIndex = 0;
  var mockSize = 25;

  var progress = loadProgress();

  function defaultProgress() {
    return {
      answered: {},
      flagged: [],
      sessions: [],
      labResults: {},
      notes: { title: "My RPSGT study notes", body: "" },
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
        src: "assets/coach-bob/coach-bob-illustrated.png",
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
      trail: renderTrail,
      practice: renderPractice,
      labs: renderLabs,
      mock: renderMock,
      math: renderMath,
      flashcards: renderFlashcards,
      notes: renderNotes,
      library: renderLibrary,
      reports: renderReports
    };
    (renderers[target] || renderHome)(options || {});
    main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderHome() {
    var m = metrics();
    var milestone = currentMilestone();
    append(main,
      roomHead("Sleep Pathways Guild home base", "Blueprint-first learning with a calmer, more professional front door", "Move from guided posts to focused practice, visual labs, flashcards, Math Coach, and reports without getting lost in one giant file."),
      append(element("section", { className: "hero-panel" }),
        append(element("div"),
          element("p", { className: "room-kicker", text: "Your current trail marker" }),
          element("h3", { text: milestone.title }),
          element("p", { text: milestone.reward }),
          append(element("div", { className: "actions" }),
            button("Continue guided trail", function () { setRoom("trail"); }, "gold"),
            button("Start focused practice", function () { setRoom("practice"); }, "secondary")
          )
        ),
        coach(nextStudyMessage())
      ),
      append(element("div", { className: "stats" }),
        stat("Questions answered", m.answered),
        stat("Accuracy", m.accuracy + "%"),
        stat("Flagged", m.flagged),
        stat("Readiness", readinessScore() + "%")
      )
    );

    append(main, append(element("section", { className: "panel guild-promise" }),
      append(element("div"),
        element("p", { className: "room-kicker", text: "Guild identity" }),
        element("h3", { text: "A learning hub, not a file archive" }),
        element("p", { text: "The rebuilt app keeps the safer multi-file structure, but the experience should still feel like the original Study Trail: guided lanes, visual tools, repair-focused reports, and Coach Bob nudges that tell the learner what to do next." })
      ),
      append(element("div", { className: "promise-grid" }),
        promiseCard("Guided pathways", "Start with a post, practice the task, then leave a trail marker in the report."),
        promiseCard("Visual study tools", "Use signal labs, flashcards, and formulas to make hard concepts easier to scan."),
        promiseCard("Repair reports", "Turn weak domains and missed items into tonight's study plan."),
        promiseCard("RPSGT focus", "Keep the app centered on RPSGT preparation and current-source awareness.")
      )
    ));

    var path = element("section", { className: "panel trail-overview" });
    append(path, element("p", { className: "room-kicker", text: "The four-part study path" }), element("h3", { text: "Know where you are going" }));
    var stages = element("div", { className: "journey-grid" });
    (appData.seed.journeyStages || []).forEach(function (stage, index) {
      var item = element("article", { className: "journey-card" });
      append(item,
        element("span", { className: "journey-number", text: index + 1 }),
        element("h3", { text: stage.title }),
        element("strong", { text: stage.subtitle }),
        element("p", { text: stage.description })
      );
      stages.appendChild(item);
    });
    append(path, stages);
    main.appendChild(path);

    var cards = element("div", { className: "grid three room-launch-grid" });
    addHomeCard(cards, "Guided Study Trail", "Work through all 12 BRPT-aligned tasks with study targets and focused practice.", "Open the trail", function () { setRoom("trail"); }, "trail-card");
    addHomeCard(cards, "Visual Skill Labs", "Interpret waveform cases, PAP response strips, filters, sensitivity, and signal clues.", "Enter skill labs", function () { setRoom("labs"); }, "lab-card");
    addHomeCard(cards, "Practice Center", "Choose a domain, task, difficulty, missed deck, or hard-question drill.", "Build a practice round", function () { setRoom("practice"); }, "practice-card");
    addHomeCard(cards, "Mock Exam Hall", "Use 25, 50, or 100-question mixed blueprint checks with a report afterward.", "Choose a mock", function () { setRoom("mock"); }, "mock-card");
    addHomeCard(cards, "Flashcard Workshop", "Review the full deck, missed questions, flagged cards, or an exam-day set.", "Review cards", function () { setRoom("flashcards"); }, "flash-card");
    addHomeCard(cards, "My Notes", "Keep your memory tricks, confusing formulas, and Coach Bob reminders in one local notebook.", "Open notes", function () { setRoom("notes"); }, "notes-card");
    addHomeCard(cards, "Guild Reports", "Find weak domains, repeated misses, readiness trends, and tonight's study plan.", "Read reports", function () { setRoom("reports"); }, "report-card");
    append(main, cards, renderBlueprintSnapshot());
  }

  function addHomeCard(parent, title, copy, label, handler, extraClass) {
    var card = element("article", { className: "panel launch-card " + (extraClass || "") });
    append(card, element("h3", { text: title }), element("p", { text: copy }), button(label, handler));
    parent.appendChild(card);
  }

  function promiseCard(title, copy) {
    return append(element("article", { className: "promise-card" }),
      element("strong", { text: title }),
      element("span", { text: copy })
    );
  }

  function currentMilestone() {
    var answered = metrics().answered;
    var milestones = appData.seed.guildMilestones || [];
    var reached = milestones[0] || { title: "First Footing", reward: "Begin the trail." };
    milestones.forEach(function (milestone) {
      if (answered >= milestone.requirement) reached = milestone;
    });
    return reached;
  }

  function renderBlueprintSnapshot() {
    var panel = element("section", { className: "panel blueprint-snapshot" });
    append(panel,
      element("p", { className: "room-kicker", text: "RPSGT blueprint map" }),
      element("h3", { text: "Four domains, twelve study tasks" }),
      element("p", { text: "The app keeps your practice tied to the exam blueprint instead of treating all questions as one pile." })
    );
    var grid = element("div", { className: "domain-grid" });
    (appData.seed.blueprintDomains || []).forEach(function (domain) {
      var card = element("article", { className: "domain-card" });
      var list = element("ul");
      domain.tasks.forEach(function (task) { list.appendChild(element("li", { text: task })); });
      append(card,
        append(element("div", { className: "domain-card-head" }),
          element("strong", { text: domain.id }),
          element("span", { text: domain.weight + "% of blueprint" })
        ),
        element("h3", { text: domain.fullName }),
        list,
        button("Study " + domain.id, function () {
          var index = (appData.taskStudyGuides || []).findIndex(function (guide) { return guide.domain === domain.id; });
          activeGuideIndex = index < 0 ? 0 : index;
          setRoom("trail");
        }, "secondary small")
      );
      grid.appendChild(card);
    });
    append(panel, grid);
    return panel;
  }

  function nextStudyMessage() {
    var m = metrics();
    if (!m.answered) return "Start with ten practice questions. Accuracy can wait; first we need a useful baseline.";
    if (m.missed) return "Your missed-item report is ready. Review the pattern, then return for a short focused practice set.";
    return "Strong start. Add another short practice set or test your pacing in the Mock Exam room.";
  }

  function renderTrail() {
    var guides = appData.taskStudyGuides || [];
    if (activeGuideIndex >= guides.length) activeGuideIndex = 0;
    append(main,
      roomHead("Guided Study Trail", "Learn the blueprint before testing it", "Move through all 12 tasks. Each stop gives you the study target, what to know, a Coach Bob cue, and a focused practice launch."),
      coach("Do not try to memorize the whole blueprint at once. Learn one task, practice that task, then leave a trail marker in your reports.")
    );
    var layout = element("div", { className: "trail-layout" });
    var rail = element("aside", { className: "trail-rail panel no-print" });
    append(rail, element("h3", { text: "Twelve task stops" }));
    guides.forEach(function (guide, index) {
      var selected = index === activeGuideIndex;
      var item = element("button", {
        className: "trail-stop" + (selected ? " active" : ""),
        type: "button",
        onClick: function () {
          activeGuideIndex = index;
          renderTrailLesson();
        }
      });
      append(item,
        element("span", { text: guide.domain }),
        append(element("div"), element("strong", { text: guide.task }), element("small", { text: guide.focus }))
      );
      rail.appendChild(item);
    });
    append(layout, rail, element("div", { id: "trail-lesson" }));
    main.appendChild(layout);
    renderTrailLesson();
  }

  function renderTrailLesson() {
    var target = document.getElementById("trail-lesson");
    if (!target) return;
    while (target.firstChild) target.removeChild(target.firstChild);
    var guide = (appData.taskStudyGuides || [])[activeGuideIndex];
    if (!guide) return;
    Array.prototype.forEach.call(document.querySelectorAll(".trail-stop"), function (item, index) {
      item.classList.toggle("active", index === activeGuideIndex);
    });
    var domain = (appData.seed.blueprintDomains || []).find(function (item) { return item.id === guide.domain; });
    var card = element("article", { className: "panel lesson-card" });
    var learnList = element("ul", { className: "lesson-list" });
    (guide.learn || []).forEach(function (point) { learnList.appendChild(element("li", { text: point })); });
    append(card,
      append(element("div", { className: "lesson-heading" }),
        append(element("div"),
          element("p", { className: "room-kicker", text: guide.domain + " task lesson" }),
          element("h2", { text: guide.task }),
          element("p", { text: domain ? domain.fullName : guide.domain })
        ),
        element("span", { className: "weight-badge", text: domain ? domain.weight + "%" : guide.domain })
      ),
      append(element("section", { className: "study-target" }),
        element("strong", { text: "Study target" }),
        element("p", { text: guide.focus })
      ),
      element("h3", { text: "What you need to learn" }),
      learnList,
      coach(trailCoachMessage(guide)),
      append(element("div", { className: "lesson-actions" }),
        button("Practice this task", function () {
          setRoom("practice", { domain: guide.domain, task: guide.task });
        }, "gold"),
        button("Open related flashcards", function () {
          activeDeck = (flashcardData.cards || []).filter(function (cardItem) {
            return cardItem.domain === guide.domain && (!cardItem.task || cardItem.task === guide.task);
          });
          activeDeck.kind = "guided";
          activeCardIndex = 0;
          setRoom("flashcards");
        }, "secondary"),
        button("Next trail stop", function () {
          activeGuideIndex = (activeGuideIndex + 1) % (appData.taskStudyGuides || []).length;
          renderTrailLesson();
        }, "secondary")
      )
    );
    target.appendChild(card);
  }

  function trailCoachMessage(guide) {
    if (guide.domain === "D2") return "Think like the technologist at the bedside: what should the signal look like, what changed, and what can you safely correct?";
    if (guide.domain === "D3") return "State the rule in plain language, then apply it to the strip or report. That keeps scoring details from turning into disconnected trivia.";
    if (guide.domain === "D4") return "Treatment questions usually ask for the safest next response, not the most dramatic response.";
    return "Start with the patient story. Clinical clues, education, safety, and communication all begin with what this patient needs tonight.";
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
    append(main,
      roomHead("Practice Center", "Build the practice round you need", "Choose a quick route or use the filters. Questions stay one at a time, but the learning path around them is much richer."),
      coach("Pick a purpose before you pick a question: learn a domain, repair misses, challenge yourself, or rehearse exam decisions.")
    );
    var routes = element("div", { className: "practice-route-grid no-print" });
    [
      ["Blueprint Mix", "Balanced practice across all four domains.", "all", "unanswered", "all"],
      ["Hard & Tricky", "Intermediate and exam-level decisions.", "all", "all", "hard"],
      ["Repair Misses", "Rework questions you previously missed.", "all", "missed", "all"],
      ["Flagged Review", "Return to questions you marked for later.", "all", "flagged", "all"]
    ].forEach(function (route) {
      var card = element("button", {
        className: "practice-route",
        type: "button",
        onClick: function () {
          document.getElementById("practice-domain").value = route[2];
          document.getElementById("practice-mode").value = route[3];
          document.getElementById("practice-difficulty").value = route[4];
          document.getElementById("practice-task").value = "all";
          activeQuestion = choosePracticeQuestion(route[2], route[3], route[4], "all");
          renderPracticeQuestion();
        }
      });
      append(card, element("strong", { text: route[0] }), element("span", { text: route[1] }));
      routes.appendChild(card);
    });
    main.appendChild(routes);

    var filterPanel = element("details", { className: "practice-filters no-print", attributes: { open: "open" } });
    filterPanel.appendChild(element("summary", { text: "Choose domain, task, difficulty, or saved deck" }));
    var toolbar = element("div", { className: "toolbar practice-toolbar" });
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
    var taskChoices = [{ label: "All tasks", value: "all" }];
    (appData.taskStudyGuides || []).forEach(function (guide) {
      taskChoices.push({ label: guide.domain + " · " + guide.task, value: guide.task });
    });
    var taskField = selectField("Blueprint task", "practice-task", taskChoices);
    var difficultyField = selectField("Difficulty", "practice-difficulty", [
      { label: "All levels", value: "all" },
      { label: "Core / foundation", value: "core" },
      { label: "Intermediate", value: "intermediate" },
      { label: "Exam / hard", value: "hard" }
    ]);
    var nextBox = element("div", { className: "field" });
    append(nextBox, element("label", { text: "Next action" }), button("Load question", function () {
      activeQuestion = choosePracticeQuestion(
        document.getElementById("practice-domain").value,
        document.getElementById("practice-mode").value,
        document.getElementById("practice-difficulty").value,
        document.getElementById("practice-task").value
      );
      renderPracticeQuestion();
    }));
    append(toolbar, domainField, taskField, difficultyField, modeField, nextBox);
    filterPanel.appendChild(toolbar);
    append(main, filterPanel, element("div", { id: "practice-stage" }));
    if (options.domain) document.getElementById("practice-domain").value = options.domain;
    if (options.task) document.getElementById("practice-task").value = options.task;
    activeQuestion = options.question || choosePracticeQuestion(options.domain || "all", "unanswered", "all", options.task || "all");
    renderPracticeQuestion();
  }

  function choosePracticeQuestion(domain, mode, difficulty, task) {
    var bank = questionBank().filter(function (question) {
      if (domain !== "all" && question.domain !== domain) return false;
      if (task && task !== "all" && question.task !== task) return false;
      var level = String(question.difficulty || "").toLowerCase();
      if (difficulty === "core" && level !== "core" && level !== "foundation") return false;
      if (difficulty === "intermediate" && level !== "intermediate") return false;
      if (difficulty === "hard" && level !== "exam" && level !== "hard" && level !== "advanced" && level !== "intermediate") return false;
      if (mode === "unanswered" && progress.answered[question.id]) return false;
      if (mode === "missed" && (!progress.answered[question.id] || progress.answered[question.id].correct)) return false;
      if (mode === "flagged" && progress.flagged.indexOf(String(question.id)) === -1) return false;
      return Array.isArray(question.options) && question.options.length && question.answer;
    });
    if (!bank.length && mode === "unanswered") return choosePracticeQuestion(domain, "all", difficulty, task);
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
      element("span", { className: "tag", text: activeQuestion.task || "Blueprint task" }),
      element("span", { className: "tag", text: activeQuestion.topic || activeQuestion.task || "Practice" }),
      element("span", { className: "tag", text: activeQuestion.difficulty || "Mixed" }),
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
          document.getElementById("practice-mode").value,
          document.getElementById("practice-difficulty").value,
          document.getElementById("practice-task").value
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

  function renderLabs() {
    append(main,
      roomHead("Sleep Tech Skill Labs", "Read the signal, explain the clue, choose the response", "These are teaching simulations from the original Study Trail: waveform recognition, PAP response, and filter/sensitivity memory."),
      coach("Use the same order every time: name the channel, describe what changed, decide whether it is physiology or artifact, then choose the safest interpretation.")
    );
    var tabs = element("div", { className: "lab-tabs no-print" });
    [
      ["waveforms", "Waveform Atlas"],
      ["pap", "PAP Simulation"],
      ["filters", "Filters & Sensitivity"]
    ].forEach(function (entry) {
      var item = button(entry[1], function () {
        activeLab = entry[0];
        activeLabIndex = 0;
        renderLabStage();
      }, "secondary");
      item.setAttribute("aria-pressed", activeLab === entry[0] ? "true" : "false");
      item.setAttribute("data-lab", entry[0]);
      tabs.appendChild(item);
    });
    append(main, tabs, element("div", { id: "lab-stage" }));
    renderLabStage();
  }

  function renderLabStage() {
    var target = document.getElementById("lab-stage");
    if (!target) return;
    while (target.firstChild) target.removeChild(target.firstChild);
    Array.prototype.forEach.call(document.querySelectorAll("[data-lab]"), function (item) {
      item.setAttribute("aria-pressed", item.getAttribute("data-lab") === activeLab ? "true" : "false");
    });
    if (activeLab === "filters") renderFilterLab(target);
    else renderSignalLab(target, activeLab === "pap" ? appData.seed.papSimulationCases : appData.seed.waveformCases, activeLab);
  }

  function renderFilterLab(target) {
    var intro = element("section", { className: "panel" });
    append(intro,
      element("h3", { text: "Filter and sensitivity memory wall" }),
      element("p", { text: "These reminders restore the original app's practical signal-acquisition coaching. Read the memory cue, then connect it to what changes on screen." })
    );
    var grid = element("div", { className: "memory-grid" });
    (appData.seed.filterMemoryCards || []).forEach(function (memory) {
      var card = element("article", { className: "memory-card" });
      append(card,
        element("span", { className: "signal-icon", text: "≈" }),
        element("h3", { text: memory.title }),
        element("p", { text: memory.memory }),
        element("blockquote", { text: memory.bob })
      );
      grid.appendChild(card);
    });
    append(intro, grid);
    target.appendChild(intro);
    var quizPanel = element("section", { className: "panel" });
    append(quizPanel, element("h3", { text: "Filter decision drill" }), element("p", { text: "Practice questions from the technical-preparation bank." }));
    var quiz = shuffled(appData.seed.filterQuizBank || []).slice(0, 5);
    quiz.forEach(function (question, index) {
      var compact = element("article", { className: "lab-quiz-card" });
      append(compact, element("strong", { text: (index + 1) + ". " + (question.prompt || question.question || question.title) }));
      var choices = element("div", { className: "option-list compact-options" });
      (question.options || []).forEach(function (choice) {
        choices.appendChild(element("button", {
          className: "option",
          text: choice,
          type: "button",
          onClick: function (event) {
            answerLabChoice(question, choice, event.currentTarget, choices, question.rationale || question.explanation || "");
          }
        }));
      });
      append(compact, choices);
      quizPanel.appendChild(compact);
    });
    target.appendChild(quizPanel);
  }

  function renderSignalLab(target, cases, kind) {
    var items = cases || [];
    if (!items.length) {
      target.appendChild(element("div", { className: "empty", text: "No cases are available in this lab." }));
      return;
    }
    if (activeLabIndex >= items.length) activeLabIndex = 0;
    var current = items[activeLabIndex];
    var layout = element("div", { className: "signal-lab-layout" });
    var viewer = element("section", { className: "panel signal-viewer" });
    append(viewer,
      append(element("div", { className: "signal-viewer-head" }),
        append(element("div"),
          element("p", { className: "room-kicker", text: (kind === "pap" ? "PAP case " : "Atlas case ") + (activeLabIndex + 1) + " of " + items.length }),
          element("h3", { text: current.title }),
          element("p", { text: current.category || current.focus || "Signal interpretation" })
        ),
        element("span", { className: "weight-badge", text: current.difficulty || current.domain || "Lab" })
      ),
      renderChannelStrip(current.channels || {}),
      append(element("div", { className: "clue-box" }),
        element("strong", { text: "What you can observe" }),
        element("p", { text: current.clue })
      ),
      element("h3", { text: kind === "pap" ? "What is the best interpretation?" : "How should this be identified?" })
    );
    var choices = element("div", { className: "option-list" });
    (current.options || []).forEach(function (choice) {
      choices.appendChild(element("button", {
        className: "option",
        text: choice,
        type: "button",
        onClick: function (event) {
          answerLabChoice(current, choice, event.currentTarget, choices, current.teaching || current.scoringPearl || current.beginner || "");
        }
      }));
    });
    var actions = element("div", { className: "actions no-print" });
    var previous = button("Previous case", function () {
      activeLabIndex = (activeLabIndex - 1 + items.length) % items.length;
      renderLabStage();
    }, "secondary");
    var next = button("Next case", function () {
      activeLabIndex = (activeLabIndex + 1) % items.length;
      renderLabStage();
    }, "gold");
    append(actions, previous, next);
    append(viewer, choices, actions);
    var rail = element("aside", { className: "panel lab-teaching-rail" });
    append(rail,
      element("h3", { text: "Coach Bob's reading order" }),
      element("ol", { html: "<li>Name each channel.</li><li>Find the change.</li><li>Compare related channels.</li><li>Choose physiology, artifact, or treatment response.</li>" }),
      append(element("div", { className: "bob-hint" }),
        element("strong", { text: "Hint" }),
        element("p", { text: current.bobHint || current.teaching || "Compare airflow, effort, signal quality, and the clinical situation before deciding." })
      ),
      element("h3", { text: "Case library" })
    );
    items.forEach(function (caseItem, index) {
      rail.appendChild(element("button", {
        className: "case-jump" + (index === activeLabIndex ? " active" : ""),
        text: (index + 1) + ". " + caseItem.title,
        type: "button",
        onClick: function () { activeLabIndex = index; renderLabStage(); }
      }));
    });
    append(layout, viewer, rail);
    target.appendChild(layout);
  }

  function renderChannelStrip(channels) {
    var shell = element("div", { className: "channel-stack", attributes: { role: "img", "aria-label": "Simulated multi-channel sleep study waveform" } });
    Object.keys(channels).forEach(function (name) {
      var row = element("div", { className: "channel-row" });
      row.appendChild(element("strong", { text: name }));
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 600 90");
      svg.setAttribute("preserveAspectRatio", "none");
      svg.setAttribute("aria-hidden", "true");
      var gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      gridLine.setAttribute("x1", "0");
      gridLine.setAttribute("x2", "600");
      gridLine.setAttribute("y1", "45");
      gridLine.setAttribute("y2", "45");
      gridLine.setAttribute("class", "signal-midline");
      svg.appendChild(gridLine);
      var values = channels[name] || [];
      var points = values.map(function (value, index) {
        var x = values.length > 1 ? index / (values.length - 1) * 600 : 0;
        var y = 82 - Math.max(0, Math.min(1, Number(value))) * 74;
        return x.toFixed(1) + "," + y.toFixed(1);
      }).join(" ");
      var line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      line.setAttribute("points", points);
      line.setAttribute("class", "signal-trace");
      svg.appendChild(line);
      append(row, svg);
      shell.appendChild(row);
    });
    return shell;
  }

  function answerLabChoice(question, choice, clicked, optionBox, teaching) {
    var correct = choice === question.answer;
    Array.prototype.forEach.call(optionBox.querySelectorAll("button"), function (item) {
      item.disabled = true;
      if (item.textContent === question.answer) item.classList.add("correct");
    });
    if (!correct) clicked.classList.add("wrong");
    var key = activeLab + "-" + String(question.id || question.title);
    progress.labResults[key] = { correct: correct, date: new Date().toISOString() };
    saveProgress();
    var feedback = element("div", { className: "feedback lab-feedback" });
    append(feedback,
      element("strong", { text: correct ? "Good read." : "Pause and compare the channels again." }),
      element("p", { text: teaching || ("Correct answer: " + question.answer) }),
      question.scoringPearl && question.scoringPearl !== teaching ? element("p", { text: "Scoring pearl: " + question.scoringPearl }) : null
    );
    optionBox.parentNode.insertBefore(feedback, optionBox.nextSibling);
  }

  function renderMock() {
    append(main, roomHead("Guild Exam Hall", "Choose the size of your readiness rehearsal", "Use a blueprint-weighted 25, 50, or 100-question mixed exam. Results feed the Mock Exam Report and your next-study guidance."));
    if (!mockSession) {
      main.appendChild(coach("A short mock checks decisions. A long mock also checks stamina. Choose the smallest exam that answers the question you have today."));
      var choices = element("div", { className: "mock-size-grid" });
      [
        [25, "Trail Check", "A focused readiness sample for an ordinary study night.", "About 25–35 minutes"],
        [50, "Half Mock", "A broader domain check with enough depth to expose patterns.", "About 50–70 minutes"],
        [100, "Guild Exam Rehearsal", "A substantial pacing and stamina session across the blueprint.", "About 100–140 minutes"]
      ].forEach(function (choice) {
        var panel = element("section", { className: "panel mock-size-card" });
        append(panel,
          element("span", { className: "mock-number", text: choice[0] }),
          element("h3", { text: choice[1] }),
          element("p", { text: choice[2] }),
          element("small", { text: choice[3] }),
          button("Start " + choice[0] + "-question mock", function () { startMock(choice[0]); }, choice[0] === 50 ? "gold" : "secondary")
        );
        choices.appendChild(panel);
      });
      append(main, choices, renderMockBlueprint());
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

  function renderMockBlueprint() {
    var panel = element("section", { className: "panel mock-blueprint" });
    append(panel, element("h3", { text: "Blueprint weighting used in mock selection" }));
    var grid = element("div", { className: "domain-grid" });
    (appData.seed.blueprintDomains || []).forEach(function (domain) {
      append(grid, append(element("div", { className: "blueprint-weight" }),
        element("strong", { text: domain.id + " · " + domain.weight + "%" }),
        element("span", { text: domain.fullName })
      ));
    });
    append(panel, grid);
    return panel;
  }

  function startMock(size) {
    mockSize = size || 25;
    var domains = appData.seed.blueprintDomains || [];
    var selected = [];
    domains.forEach(function (domain, index) {
      var count = index === domains.length - 1 ? mockSize - selected.length : Math.round(mockSize * domain.weight / 100);
      var pool = shuffled(questionBank().filter(function (question) {
        return question.domain === domain.id && Array.isArray(question.options) && question.answer;
      }));
      selected = selected.concat(pool.slice(0, count));
    });
    mockSession = {
      questions: shuffled(selected).slice(0, mockSize),
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
      roomHead("Math Coach", "Sleep-tech calculations without guesswork", "Use the named calculator, formula trail, and decision practice the clients loved from the original app."),
      coach("Write the units first. Then ask whether the denominator is hours, minutes, total sleep time, or recording time. Most math misses are denominator misses.")
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
    var formulaTrail = element("section", { className: "panel formula-trail" });
    append(formulaTrail,
      element("p", { className: "room-kicker", text: "Coach Bob's formula trail" }),
      element("h3", { text: "Know what belongs in the numerator and denominator" })
    );
    var formulaGrid = element("div", { className: "formula-grid" });
    [
      ["AHI", "Apneas + hypopneas", "Total sleep time in hours"],
      ["RDI", "Apneas + hypopneas + RERAs", "Total sleep time in hours"],
      ["PLMI", "Periodic limb movements", "Total sleep time in hours"],
      ["Sleep efficiency", "Total sleep time", "Time in bed × 100"],
      ["Oxygen time %", "Minutes at threshold", "Total sleep time × 100"],
      ["Frequency", "Cycles", "Seconds"]
    ].forEach(function (formula) {
      append(formulaGrid, append(element("article", { className: "formula-card" }),
        element("strong", { text: formula[0] }),
        element("span", { text: formula[1] }),
        element("small", { text: "÷ " + formula[2] })
      ));
    });
    append(formulaTrail, formulaGrid);
    main.appendChild(formulaTrail);
    renderMathPractice();
  }

  function renderMathPractice() {
    var candidates = questionBank().filter(function (question) {
      var text = [question.topic, question.prompt, question.reportCategory].join(" ").toLowerCase();
      return Array.isArray(question.options) && question.answer && (text.indexOf("math") !== -1 || text.indexOf("index") !== -1 || text.indexOf("efficiency") !== -1 || text.indexOf("frequency") !== -1);
    });
    var panel = element("section", { className: "panel math-practice-panel" });
    append(panel, element("h3", { text: "Calculation decision practice" }), element("p", { text: "The exam may test setup and interpretation, not just arithmetic. Try these without leaving Math Coach." }));
    shuffled(candidates).slice(0, 4).forEach(function (question, index) {
      var card = element("article", { className: "lab-quiz-card" });
      append(card,
        element("span", { className: "tag", text: question.topic || "Report math" }),
        element("strong", { text: (index + 1) + ". " + question.prompt })
      );
      var choices = element("div", { className: "option-list compact-options" });
      question.options.forEach(function (choice) {
        choices.appendChild(element("button", {
          className: "option",
          text: choice,
          type: "button",
          onClick: function (event) {
            answerLabChoice(question, choice, event.currentTarget, choices, question.rationale || "");
          }
        }));
      });
      append(card, choices);
      panel.appendChild(card);
    });
    main.appendChild(panel);
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

  function renderNotes() {
    if (!progress.notes) progress.notes = { title: "My RPSGT study notes", body: "" };
    append(main,
      roomHead("My Notes", "Keep the study trail personal", "Save memory tricks, formulas that keep slipping, and what Coach Bob would tell you to review next."),
      coach("A useful note is short and actionable: what confused you, what the correct cue is, and what you will practice next.")
    );
    var layout = element("section", { className: "notes-layout" });
    var editor = element("div", { className: "panel notes-editor" });
    var titleField = element("input", {
      id: "notes-title",
      value: progress.notes.title || "My RPSGT study notes",
      attributes: { "aria-label": "Notes title" }
    });
    var bodyField = element("textarea", {
      id: "notes-body",
      text: progress.notes.body || "",
      placeholder: "Example: AHI denominator is total sleep time in hours. If recording time is used, stop and re-read the prompt.",
      attributes: { rows: "18", "aria-label": "Study notes" }
    });
    var savedLine = element("p", { className: "notes-saved", text: "Saved locally in this browser." });
    function saveNotes() {
      progress.notes = { title: titleField.value, body: bodyField.value };
      saveProgress();
      savedLine.textContent = "Saved " + new Date().toLocaleTimeString();
    }
    titleField.addEventListener("input", saveNotes);
    bodyField.addEventListener("input", saveNotes);
    append(editor,
      element("p", { className: "room-kicker", text: "Local notebook" }),
      titleField,
      bodyField,
      append(element("div", { className: "actions" }),
        button("Insert tonight's repair plan", function () {
          var domain = weakestDomain();
          var addition = "\n\nTonight's repair plan:\n- Review 10 flashcards for " + domain + " (" + domainName(domain) + ").\n- Answer 10 focused practice questions.\n- Write the one rule or cue that caused the miss.\n";
          bodyField.value = (bodyField.value || "") + addition;
          saveNotes();
        }, "gold"),
        button("Clear notes", function () {
          titleField.value = "My RPSGT study notes";
          bodyField.value = "";
          saveNotes();
        }, "secondary")
      ),
      savedLine
    );
    var rail = element("aside", { className: "panel notes-rail" });
    append(rail,
      element("p", { className: "room-kicker", text: "Good note format" }),
      element("h3", { text: "Cue, trap, action" }),
      append(element("ul"),
        element("li", { text: "Cue: the phrase that tells you what rule or formula to use." }),
        element("li", { text: "Trap: the wrong answer pattern you almost picked." }),
        element("li", { text: "Action: the next small practice set or flashcard deck." })
      ),
      button("Open reports", function () { setRoom("reports"); }, "secondary"),
      button("Open Math Coach", function () { setRoom("math"); }, "secondary")
    );
    append(layout, editor, rail);
    main.appendChild(layout);
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
    append(main,
      roomHead("Guild Reports", "Turn practice into a study decision", "See what is weak, what keeps repeating, whether you are mock-ready, and what to print."),
      coach("Reports are the map. Do not just read the score; look for the task pattern, choose one repair action, then come back after a short practice round.")
    );
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
