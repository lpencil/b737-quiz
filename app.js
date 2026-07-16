(function () {
  const STORAGE_KEY = "b737-question-system-progress-v1";
  const bank = window.B737_QUESTION_BANK || { meta: {}, questions: [] };
  const questions = Array.isArray(bank.questions) ? bank.questions : [];
  const state = {
    view: "home",
    category: "",
    sessionTitle: "",
    sessionQuestions: [],
    index: 0,
    answered: new Map(),
    search: "",
    statusFilter: "all",
    includeConflict: true,
    random: false,
    progress: loadProgress(),
  };

  const el = {
    backButton: document.getElementById("backButton"),
    resetButton: document.getElementById("resetButton"),
    headerSubtitle: document.getElementById("headerSubtitle"),
    homeView: document.getElementById("homeView"),
    categoryView: document.getElementById("categoryView"),
    quizView: document.getElementById("quizView"),
    homeStats: document.getElementById("homeStats"),
    categorySummary: document.getElementById("categorySummary"),
    categoryGrid: document.getElementById("categoryGrid"),
    searchInput: document.getElementById("searchInput"),
    statusFilter: document.getElementById("statusFilter"),
    randomToggle: document.getElementById("randomToggle"),
    includeConflictToggle: document.getElementById("includeConflictToggle"),
    allQuestionsButton: document.getElementById("allQuestionsButton"),
    wrongBookButton: document.getElementById("wrongBookButton"),
    favoriteBookButton: document.getElementById("favoriteBookButton"),
    exportWrongButton: document.getElementById("exportWrongButton"),
    exportFavoriteButton: document.getElementById("exportFavoriteButton"),
    categoryTitle: document.getElementById("categoryTitle"),
    categoryMeta: document.getElementById("categoryMeta"),
    startCategoryButton: document.getElementById("startCategoryButton"),
    categoryQuestionList: document.getElementById("categoryQuestionList"),
    quizTitle: document.getElementById("quizTitle"),
    progressBar: document.getElementById("progressBar"),
    progressText: document.getElementById("progressText"),
    correctText: document.getElementById("correctText"),
    wrongText: document.getElementById("wrongText"),
    prevButton: document.getElementById("prevButton"),
    nextButton: document.getElementById("nextButton"),
    favoriteCurrentButton: document.getElementById("favoriteCurrentButton"),
    questionKicker: document.getElementById("questionKicker"),
    questionText: document.getElementById("questionText"),
    optionsList: document.getElementById("optionsList"),
    feedbackBox: document.getElementById("feedbackBox"),
    referenceBox: document.getElementById("referenceBox"),
  };

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { answered: {}, wrongIds: [], favoriteIds: [] };
      const parsed = JSON.parse(raw);
      return {
        answered: parsed.answered || {},
        wrongIds: Array.isArray(parsed.wrongIds) ? parsed.wrongIds : [],
        favoriteIds: Array.isArray(parsed.favoriteIds) ? parsed.favoriteIds : [],
      };
    } catch (error) {
      return { answered: {}, wrongIds: [], favoriteIds: [] };
    }
  }

  function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
  }

  function byId(id) {
    return questions.find((question) => question.id === id);
  }

  function getCategories() {
    const map = new Map();
    questions.forEach((question) => {
      const current = map.get(question.category) || [];
      current.push(question);
      map.set(question.category, current);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }

  function categoryProgress(categoryQuestions) {
    const total = categoryQuestions.length;
    const done = categoryQuestions.filter((question) => state.progress.answered[question.id]).length;
    const wrong = categoryQuestions.filter((question) => state.progress.wrongIds.includes(question.id)).length;
    const favorite = categoryQuestions.filter((question) => state.progress.favoriteIds.includes(question.id)).length;
    return { total, done, wrong, favorite };
  }

  function renderHome() {
    const stats = bank.meta && bank.meta.stats ? bank.meta.stats : {};
    const wrongCount = state.progress.wrongIds.length;
    const favoriteCount = state.progress.favoriteIds.length;
    const answeredCount = Object.keys(state.progress.answered).length;
    const conflictCount = stats.referenceStatusCounts && stats.referenceStatusCounts.conflict ? stats.referenceStatusCounts.conflict : questions.filter((question) => question.answerReference.status === "conflict").length;
    const practiceCount = questions.length - (state.includeConflict ? 0 : conflictCount);
    el.homeStats.innerHTML = [
      statTile(practiceCount, state.includeConflict ? "当前题目" : "可练题目"),
      statTile(Object.keys(stats.categoryCounts || {}).length || getCategories().length, "分类数量"),
      statTile(answeredCount, "已作答"),
      statTile(wrongCount, "错题本"),
      statTile(favoriteCount, "收藏题"),
    ].join("");

    const categories = getCategories();
    const filteredCategories = categories
      .map(([name, categoryQuestions]) => [name, filterQuestions(categoryQuestions)])
      .filter(([, filtered]) => filtered.length > 0);

    const conflictNote = state.includeConflict || state.statusFilter === "conflict" ? `包含 ${conflictCount} 道冲突标注题，按题库参考答案判题。` : `已隐藏 ${conflictCount} 道冲突标注题。`;
    el.categorySummary.textContent = `共 ${categories.length} 个分类，当前显示 ${filteredCategories.length} 个分类；${conflictNote}`;
    el.categoryGrid.innerHTML = filteredCategories
      .map(([name, categoryQuestions]) => {
        const progress = categoryProgress(categoryQuestions);
        return `
          <button class="category-card" type="button" data-category="${escapeAttr(name)}">
            <div>
              <h3>${escapeHtml(name)}</h3>
              <p>${progress.done} 题已作答，${progress.wrong} 题在错题本，${progress.favorite} 题已收藏。</p>
            </div>
            <div class="card-count">
              <span>${progress.total} 题</span>
              <span>${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%</span>
            </div>
          </button>
        `;
      })
      .join("");
  }

  function statTile(value, label) {
    return `
      <div class="stat-tile">
        <div class="stat-value">${escapeHtml(String(value))}</div>
        <div class="stat-label">${escapeHtml(label)}</div>
      </div>
    `;
  }

  function filterQuestions(list) {
    const term = state.search.trim().toLowerCase();
    return list.filter((question) => {
      if (state.statusFilter !== "all" && question.answerReference.status !== state.statusFilter) {
        return false;
      }
      if (!state.includeConflict && state.statusFilter !== "conflict" && question.answerReference.status === "conflict") {
        return false;
      }
      if (!term) return true;
      const haystack = [
        question.id,
        question.category,
        question.question,
        question.tags.join(" "),
        question.sourceFiles.join(" "),
        question.answerReference.summary,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }

  function renderCategory(category) {
    const categoryQuestions = questions.filter((question) => question.category === category);
    const filtered = filterQuestions(categoryQuestions);
    const progress = categoryProgress(filtered);
    const totalRaw = categoryQuestions.length;
    const hiddenConflicts = categoryQuestions.filter((question) => question.answerReference.status === "conflict").length;
    el.categoryTitle.textContent = category;
    el.categoryMeta.textContent = `${progress.total} 题可练，原分类 ${totalRaw} 题，已作答 ${progress.done} 题，错题 ${progress.wrong} 题，收藏 ${progress.favorite} 题${!state.includeConflict && hiddenConflicts ? `，已隐藏 ${hiddenConflicts} 道冲突标注题` : ""}。`;
    el.categoryQuestionList.innerHTML = filtered.length
      ? filtered
          .map((question) => {
            return `
              <button class="question-row" type="button" data-question-id="${escapeAttr(question.id)}">
                <div class="question-row-id">${escapeHtml(question.id)}</div>
                <div class="question-row-text">${escapeHtml(question.question)}</div>
                <div class="favorite-marker${isFavorite(question.id) ? " active" : ""}" aria-label="${isFavorite(question.id) ? "已收藏" : "未收藏"}">${isFavorite(question.id) ? "★" : "☆"}</div>
              </button>
            `;
          })
          .join("")
      : `<div class="empty-state">当前搜索条件下没有题目。</div>`;
  }

  function startSession(title, list, initialQuestionId = "") {
    const source = filterQuestions(list);
    state.sessionTitle = title;
    state.sessionQuestions = state.random && !initialQuestionId ? shuffle(source) : source.slice();
    const initialIndex = initialQuestionId ? state.sessionQuestions.findIndex((question) => question.id === initialQuestionId) : -1;
    state.index = initialIndex >= 0 ? initialIndex : 0;
    state.answered = new Map();
    switchView("quiz");
    renderQuiz();
  }

  function renderQuiz() {
    const total = state.sessionQuestions.length;
    const question = state.sessionQuestions[state.index];
    el.quizTitle.textContent = state.sessionTitle || "练习";
    el.progressText.textContent = total ? `${state.index + 1} / ${total}` : "0 / 0";
    el.progressBar.style.width = `${total ? ((state.index + 1) / total) * 100 : 0}%`;
    const results = Array.from(state.answered.values());
    el.correctText.textContent = String(results.filter((item) => item.correct).length);
    el.wrongText.textContent = String(results.filter((item) => !item.correct).length);
    el.prevButton.disabled = state.index <= 0;
    el.nextButton.disabled = state.index >= total - 1;

    if (!question) {
      el.questionKicker.textContent = "";
      el.questionText.textContent = "当前练习没有题目";
      el.optionsList.innerHTML = "";
      el.feedbackBox.className = "feedback";
      el.referenceBox.className = "reference-box";
      el.referenceBox.innerHTML = "";
      el.favoriteCurrentButton.disabled = true;
      el.favoriteCurrentButton.classList.remove("active");
      el.favoriteCurrentButton.textContent = "☆ 收藏本";
      el.favoriteCurrentButton.setAttribute("aria-pressed", "false");
      return;
    }

    const source = question.sources && question.sources[0] ? question.sources[0] : {};
    const favorite = isFavorite(question.id);
    el.favoriteCurrentButton.disabled = false;
    el.favoriteCurrentButton.classList.toggle("active", favorite);
    el.favoriteCurrentButton.textContent = favorite ? "★ 已收藏" : "☆ 收藏本";
    el.favoriteCurrentButton.setAttribute("aria-pressed", String(favorite));
    el.questionKicker.innerHTML = `
      <span>${escapeHtml(question.id)}</span>
      <span>${escapeHtml(question.category)}</span>
      <span>${escapeHtml(source.file || "")} 第 ${escapeHtml(String(source.row || ""))} 行</span>
      ${favorite ? "<span>已收藏</span>" : ""}
    `;
    el.questionText.textContent = question.question;

    const answered = state.answered.get(question.id);
    el.optionsList.innerHTML = question.options
      .map((option) => {
        let className = "option-button";
        if (answered) {
          if (option.isCorrect) className += " correct";
          if (answered.selected === option.key && !option.isCorrect) className += " incorrect";
        }
        return `
          <button class="${className}" type="button" data-option="${escapeAttr(option.key)}">
            <span class="option-key">${escapeHtml(option.key)}</span>
            <span class="option-text">${escapeHtml(option.text)}</span>
          </button>
        `;
      })
      .join("");

    if (answered) {
      showFeedback(question, answered);
    } else {
      el.feedbackBox.className = "feedback";
      el.feedbackBox.textContent = "";
      el.referenceBox.className = "reference-box";
      el.referenceBox.innerHTML = "";
    }
  }

  function answerCurrent(optionKey) {
    const question = state.sessionQuestions[state.index];
    if (!question || state.answered.has(question.id)) return;
    const selected = question.options.find((option) => option.key === optionKey);
    const correct = Boolean(selected && selected.isCorrect);
    const result = { selected: optionKey, correct };
    state.answered.set(question.id, result);
    state.progress.answered[question.id] = {
      selected: optionKey,
      correct,
      at: new Date().toISOString(),
    };
    if (correct) {
      state.progress.wrongIds = state.progress.wrongIds.filter((id) => id !== question.id);
    } else if (!state.progress.wrongIds.includes(question.id)) {
      state.progress.wrongIds.push(question.id);
    }
    saveProgress();
    renderQuiz();
  }

  function isFavorite(questionId) {
    return state.progress.favoriteIds.includes(questionId);
  }

  function toggleFavorite(questionId) {
    if (!questionId) return;
    if (isFavorite(questionId)) {
      state.progress.favoriteIds = state.progress.favoriteIds.filter((id) => id !== questionId);
    } else {
      state.progress.favoriteIds.push(questionId);
    }
    saveProgress();
  }

  function toggleCurrentFavorite() {
    const question = state.sessionQuestions[state.index];
    if (!question) return;
    toggleFavorite(question.id);
    renderQuiz();
  }

  function showFeedback(question, answered) {
    const correctAnswer = question.options.filter((option) => option.isCorrect).map((option) => `${option.key}. ${option.text}`).join("；");
    if (answered.correct) {
      el.feedbackBox.className = "feedback show correct";
      el.feedbackBox.textContent = `回答正确。正确答案：${correctAnswer}`;
    } else {
      el.feedbackBox.className = "feedback show incorrect";
      el.feedbackBox.textContent = `回答错误。正确答案：${correctAnswer}`;
    }
    if (question.category === "限制值") {
      el.referenceBox.className = "reference-box";
      el.referenceBox.innerHTML = "";
      return;
    }
    const ref = question.answerReference || {};
    // 显示答案参考说明
    const summaryText = ref.summary || "";
    if (summaryText && summaryText !== "暂未找到明确手册内容，待人工审核。") {
      el.referenceBox.className = "reference-box show";
      el.referenceBox.innerHTML = `
        <div class="reference-title">答案参考说明</div>
        <div>${escapeHtml(summaryText)}</div>
      `;
    } else {
      el.referenceBox.className = "reference-box show";
      el.referenceBox.innerHTML = `
        <div class="reference-title">答案参考说明</div>
        <div style="color: var(--muted);">暂未找到明确手册内容，待人工审核。</div>
      `;
    }
  }

  function exportWrongMarkdown() {
    const wrongQuestions = state.progress.wrongIds.map(byId).filter(Boolean);
    const lines = ["# B737 理论练习题错题本", ""];
    lines.push(`导出时间：${new Date().toLocaleString("zh-CN")}`);
    lines.push(`错题数量：${wrongQuestions.length}`);
    lines.push("");
    if (!wrongQuestions.length) {
      lines.push("当前没有错题。");
    }
    wrongQuestions.forEach((question) => {
      const record = state.progress.answered[question.id] || {};
      const source = question.sources && question.sources[0] ? question.sources[0] : {};
      lines.push(`## ${question.id}｜${question.category}`);
      lines.push("");
      lines.push(`来源：${source.file || ""} / ${source.sheet || ""} / 第 ${source.row || ""} 行`);
      lines.push(`上次选择：${record.selected || ""}`);
      lines.push("");
      lines.push(`题目：${question.question}`);
      lines.push("");
      question.options.forEach((option) => {
        const mark = option.isCorrect ? " ✓" : "";
        lines.push(`${option.key}. ${option.text}${mark}`);
      });
      lines.push("");
      lines.push(`正确答案：${question.answer.join(", ")}`);
      lines.push("");
      lines.push("答案参考说明：待后续核对手册后补充。");
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "B737理论练习题错题本.md";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportFavoriteMarkdown() {
    const favoriteQuestions = state.progress.favoriteIds.map(byId).filter(Boolean);
    const lines = ["# B737 理论练习题收藏本", ""];
    lines.push(`导出时间：${new Date().toLocaleString("zh-CN")}`);
    lines.push(`收藏数量：${favoriteQuestions.length}`);
    lines.push("");
    if (!favoriteQuestions.length) {
      lines.push("当前没有收藏题。");
    }
    favoriteQuestions.forEach((question) => {
      const source = question.sources && question.sources[0] ? question.sources[0] : {};
      const ref = question.answerReference || {};
      lines.push(`## ${question.id}｜${question.category}`);
      lines.push("");
      lines.push(`来源：${source.file || ""} / ${source.sheet || ""} / 第 ${source.row || ""} 行`);
      lines.push("");
      lines.push(`题目：${question.question}`);
      lines.push("");
      question.options.forEach((option) => {
        const mark = option.isCorrect ? " ✓" : "";
        lines.push(`${option.key}. ${option.text}${mark}`);
      });
      lines.push("");
      lines.push(`正确答案：${question.answer.join(", ")}`);
      lines.push("");
      lines.push(`答案参考说明：${ref.summary || "暂未找到明确手册内容，待人工审核。"}`);
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "B737理论练习题收藏本.md";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function switchView(view) {
    state.view = view;
    [el.homeView, el.categoryView, el.quizView].forEach((node) => node.classList.remove("active"));
    if (view === "home") {
      el.homeView.classList.add("active");
      el.headerSubtitle.textContent = "手册追溯型练习系统";
      el.backButton.disabled = true;
      renderHome();
    }
    if (view === "category") {
      el.categoryView.classList.add("active");
      el.headerSubtitle.textContent = state.category;
      el.backButton.disabled = false;
      renderCategory(state.category);
    }
    if (view === "quiz") {
      el.quizView.classList.add("active");
      el.headerSubtitle.textContent = state.sessionTitle;
      el.backButton.disabled = false;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function shuffle(list) {
    const copy = list.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[target]] = [copy[target], copy[index]];
    }
    return copy;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  el.categoryGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    switchView("category");
  });

  el.startCategoryButton.addEventListener("click", () => {
    const list = questions.filter((question) => question.category === state.category);
    startSession(state.category, list);
  });

  el.categoryQuestionList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-question-id]");
    if (!button) return;
    const list = questions.filter((question) => question.category === state.category);
    startSession(state.category, list, button.dataset.questionId);
  });

  el.allQuestionsButton.addEventListener("click", () => {
    state.category = "";
    startSession("全部题目", questions);
  });

  el.wrongBookButton.addEventListener("click", () => {
    const wrongQuestions = state.progress.wrongIds.map(byId).filter(Boolean);
    state.category = "";
    startSession("错题本", wrongQuestions);
  });

  el.favoriteBookButton.addEventListener("click", () => {
    const favoriteQuestions = state.progress.favoriteIds.map(byId).filter(Boolean);
    state.category = "";
    startSession("收藏本", favoriteQuestions);
  });

  el.exportWrongButton.addEventListener("click", exportWrongMarkdown);
  el.exportFavoriteButton.addEventListener("click", exportFavoriteMarkdown);

  el.optionsList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-option]");
    if (!button) return;
    answerCurrent(button.dataset.option);
  });

  el.prevButton.addEventListener("click", () => {
    if (state.index > 0) {
      state.index -= 1;
      renderQuiz();
    }
  });

  el.nextButton.addEventListener("click", () => {
    if (state.index < state.sessionQuestions.length - 1) {
      state.index += 1;
      renderQuiz();
    }
  });

  el.favoriteCurrentButton.addEventListener("click", toggleCurrentFavorite);

  el.backButton.addEventListener("click", () => {
    if (state.view === "quiz" && state.category) {
      switchView("category");
    } else {
      switchView("home");
    }
  });

  el.resetButton.addEventListener("click", () => {
    const confirmed = window.confirm("确认清空本地作答进度、错题本和收藏本？");
    if (!confirmed) return;
    state.progress = { answered: {}, wrongIds: [], favoriteIds: [] };
    state.answered = new Map();
    saveProgress();
    if (state.view === "quiz") renderQuiz();
    if (state.view === "category") renderCategory(state.category);
    if (state.view === "home") renderHome();
  });

  el.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    if (state.view === "home") renderHome();
    if (state.view === "category") renderCategory(state.category);
  });

  el.statusFilter.addEventListener("change", (event) => {
    state.statusFilter = event.target.value;
    if (state.view === "home") renderHome();
    if (state.view === "category") renderCategory(state.category);
  });

  el.randomToggle.addEventListener("change", (event) => {
    state.random = event.target.checked;
  });

  el.includeConflictToggle.addEventListener("change", (event) => {
    state.includeConflict = event.target.checked;
    if (state.view === "home") renderHome();
    if (state.view === "category") renderCategory(state.category);
  });

  el.includeConflictToggle.checked = state.includeConflict;
  switchView("home");
})();
