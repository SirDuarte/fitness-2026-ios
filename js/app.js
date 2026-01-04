import { DB, monthKeyFromISO } from "./db.js";
import { ensureSeed, MUSCLE_GROUPS } from "./seed.js";
import { UI } from "./ui.js";
import { Charts } from "./charts.js";

const state = {
  page: "calendar",
  calendarCursor: new Date(),
  selectedISO: null,
  workoutType: "gym",
  selectedGroups: new Set(),
  currentSessionId: null, // session being edited/created
  currentSessionExercises: [], // {seId, exercise, done, orderIndex, sets[], cardio}
  insightsCursor: new Date()
};

const els = {};

async function init() {
  // cache elements
  els.topSubtitle = UI.qs("#topSubtitle");
  els.btnToday = UI.qs("#btnToday");

  // pages
  els.pages = {
    calendar: UI.qs("#page-calendar"),
    workout: UI.qs("#page-workout"),
    insights: UI.qs("#page-insights"),
    settings: UI.qs("#page-settings")
  };

  // tabs
  els.tabs = UI.qsa(".tabbar .tab");

  // calendar controls
  els.calPrev = UI.qs("#calPrev");
  els.calNext = UI.qs("#calNext");
  els.calTitle = UI.qs("#calTitle");
  els.calendarGrid = UI.qs("#calendarGrid");
  els.kpiTotal = UI.qs("#kpiTotal");
  els.kpiGym = UI.qs("#kpiGym");
  els.kpiBasket = UI.qs("#kpiBasket");
  els.kpiOther = UI.qs("#kpiOther");
  els.dayLabel = UI.qs("#dayLabel");
  els.daySessions = UI.qs("#daySessions");
  els.btnAddFromCalendar = UI.qs("#btnAddFromCalendar");

  // workout
  els.wDate = UI.qs("#wDate");
  els.wDuration = UI.qs("#wDuration");
  els.wNotes = UI.qs("#wNotes");
  els.wType = UI.qs("#wType");
  els.wGym = UI.qs("#wGym");
  els.wBasketball = UI.qs("#wBasketball");
  els.wOther = UI.qs("#wOther");
  els.wIntensity = UI.qs("#wIntensity");
  els.wOtherName = UI.qs("#wOtherName");
  els.muscleChips = UI.qs("#muscleChips");
  els.btnLoadSuggestions = UI.qs("#btnLoadSuggestions");
  els.btnAddManualExercise = UI.qs("#btnAddManualExercise");
  els.workoutExercises = UI.qs("#workoutExercises");
  els.btnSaveSession = UI.qs("#btnSaveSession");
  els.saveHint = UI.qs("#saveHint");

  // modal
  els.modal = UI.qs("#modalExercise");
  els.modalClose = UI.qs("#modalClose");
  els.modalSaveExercise = UI.qs("#modalSaveExercise");
  els.mName = UI.qs("#mName");
  els.mGroup = UI.qs("#mGroup");
  els.mKind = UI.qs("#mKind");
  els.mPrimary = UI.qs("#mPrimary");
  els.mEmphasis = UI.qs("#mEmphasis");
  els.mSecondary = UI.qs("#mSecondary");

  // insights
  els.insPrev = UI.qs("#insPrev");
  els.insNext = UI.qs("#insNext");
  els.insTitle = UI.qs("#insTitle");
  els.chartCount = UI.qs("#chartCount");
  els.chartMinutes = UI.qs("#chartMinutes");

  // settings
  els.btnExport = UI.qs("#btnExport");
  els.importFile = UI.qs("#importFile");
  els.btnReset = UI.qs("#btnReset");
  els.settingsStatus = UI.qs("#settingsStatus");

  // PWA SW
  registerSW();

  // DB + seed
  await DB.open();
  await ensureSeed();

  // UI wiring
  wireTabs();
  wireCalendar();
  wireWorkout();
  wireModal();
  wireInsights();
  wireSettings();

  // defaults
  els.wDate.value = UI.isoToday();
  state.selectedISO = UI.isoToday();

  // initial renders
  await renderCalendar();
  await renderDaySessions();
  await renderInsights();
}

function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

function wireTabs() {
  els.tabs.forEach(btn => {
    btn.addEventListener("click", async () => {
      const p = btn.dataset.page;
      await navigate(p);
    });
  });

  els.btnToday.addEventListener("click", async () => {
    const todayISO = UI.isoToday();
    state.selectedISO = todayISO;
    state.calendarCursor = new Date();
    state.insightsCursor = new Date();
    els.wDate.value = todayISO;
    await renderCalendar();
    await renderDaySessions();
    await renderInsights();
  });
}

async function navigate(page) {
  state.page = page;
  Object.keys(els.pages).forEach(k => els.pages[k].classList.toggle("hidden", k !== page));
  els.tabs.forEach(t => t.classList.toggle("active", t.dataset.page === page));

  const labels = { calendar: "Calendário", workout: "Treino", insights: "Evolução", settings: "Config" };
  els.topSubtitle.textContent = labels[page] ?? "";

  if (page === "calendar") {
    await renderCalendar();
    await renderDaySessions();
  }
  if (page === "workout") {
    // if coming from calendar day selection
    if (state.selectedISO) els.wDate.value = state.selectedISO;
    await startNewDraftSession();
    await renderWorkoutExercises();
  }
  if (page === "insights") {
    await renderInsights();
  }
}

function wireCalendar() {
  els.calPrev.addEventListener("click", async () => {
    state.calendarCursor = new Date(state.calendarCursor.getFullYear(), state.calendarCursor.getMonth() - 1, 1);
    await renderCalendar();
  });
  els.calNext.addEventListener("click", async () => {
    state.calendarCursor = new Date(state.calendarCursor.getFullYear(), state.calendarCursor.getMonth() + 1, 1);
    await renderCalendar();
  });

  els.btnAddFromCalendar.addEventListener("click", async () => {
    if (!state.selectedISO) state.selectedISO = UI.isoToday();
    els.wDate.value = state.selectedISO;
    await navigate("workout");
  });
}

async function renderCalendar() {
  const cursor = state.calendarCursor;
  els.calTitle.textContent = UI.fmtMonthTitle(cursor);

  const year = cursor.getFullYear();
  const month = cursor.getMonth(); // 0..11
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const daysInMonth = last.getDate();

  // sunday-based grid
  const startWeekday = first.getDay(); // 0..6 (0=Sun)
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  // month sessions for KPIs
  const mk = UI.monthKeyFromDate(first);
  const monthSessions = await DB.getAllByIndex("sessions", "by_month", mk);
  const gym = monthSessions.filter(s => s.type === "gym").length;
  const basket = monthSessions.filter(s => s.type === "basketball").length;
  const other = monthSessions.filter(s => s.type === "other").length;
  els.kpiTotal.textContent = String(monthSessions.length);
  els.kpiGym.textContent = String(gym);
  els.kpiBasket.textContent = String(basket);
  els.kpiOther.textContent = String(other);

  // precompute day markers map: dateISO -> set(types)
  const map = new Map();
  for (const s of monthSessions) {
    const iso = s.dateISO;
    if (!map.has(iso)) map.set(iso, new Set());
    map.get(iso).add(s.type);
  }

  els.calendarGrid.innerHTML = "";

  for (let cell = 0; cell < totalCells; cell++) {
    const dayNum = cell - startWeekday + 1;
    const inMonth = dayNum >= 1 && dayNum <= daysInMonth;

    const div = document.createElement("div");
    div.className = "day" + (inMonth ? "" : " muted");

    if (inMonth) {
      const iso = `${year}-${String(month+1).padStart(2,"0")}-${String(dayNum).padStart(2,"0")}`;
      div.dataset.iso = iso;

      const num = document.createElement("div");
      num.className = "num";
      num.textContent = String(dayNum);
      div.appendChild(num);

      const dots = document.createElement("div");
      dots.className = "dots";

      const types = map.get(iso);
      if (types) {
        for (const t of types) {
          const dot = document.createElement("div");
          dot.className = "dot " + (t === "gym" ? "gym" : t === "basketball" ? "basket" : "other");
          dots.appendChild(dot);
        }
      }
      div.appendChild(dots);

      if (state.selectedISO === iso) div.classList.add("selected");

      div.addEventListener("click", async () => {
        state.selectedISO = iso;
        await renderCalendar();
        await renderDaySessions();
      });
    }

    els.calendarGrid.appendChild(div);
  }
}

async function renderDaySessions() {
  if (!state.selectedISO) {
    els.dayLabel.textContent = "Selecione um dia.";
    els.daySessions.innerHTML = "";
    return;
  }

  els.dayLabel.textContent = UI.fmtDateLabel(state.selectedISO);

  // get sessions by date (index by_date)
  const list = await DB.getAllByIndex("sessions", "by_date", state.selectedISO);

  // show newest first
  list.sort((a,b) => (b.id ?? 0) - (a.id ?? 0));

  els.daySessions.innerHTML = "";
  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "Nenhuma atividade registrada nesse dia.";
    els.daySessions.appendChild(empty);
    return;
  }

  for (const s of list) {
    const item = document.createElement("div");
    item.className = "item";

    const title = s.type === "gym" ? "Academia" :
                  s.type === "basketball" ? "Basquete" :
                  (s.otherName || "Outra atividade");

    const metaParts = [];
    metaParts.push(`${s.durationMin || 0} min`);
    if (s.type === "basketball" && s.intensity) metaParts.push(`Intensidade: ${s.intensity}`);
    if (s.notes) metaParts.push(s.notes);

    item.innerHTML = `
      <div class="top">
        <div>
          <div class="title">${escapeHtml(title)}</div>
          <div class="meta">${escapeHtml(metaParts.join(" • "))}</div>
        </div>
        <div class="actions">
          <button class="iconbtn" data-act="edit">Editar</button>
          <button class="iconbtn" data-act="del">🗑</button>
        </div>
      </div>
    `;

    item.querySelector('[data-act="del"]').addEventListener("click", async () => {
      await deleteSessionCascade(s.id);
      await renderCalendar();
      await renderDaySessions();
    });

    item.querySelector('[data-act="edit"]').addEventListener("click", async () => {
      // load into workout page for quick edit
      await loadSessionIntoWorkout(s.id);
      await navigate("workout");
    });

    els.daySessions.appendChild(item);
  }
}

async function deleteSessionCascade(sessionId) {
  // delete sessionExercises + sets + cardio + session itself
  const ses = await DB.get("sessions", sessionId);
  if (!ses) return;

  const seList = await DB.getAllByIndex("sessionExercises", "by_session", sessionId);
  for (const se of seList) {
    // sets
    const sets = await DB.getAllByIndex("sets", "by_sessionExercise", se.id);
    for (const st of sets) await DB.del("sets", st.id);

    // cardio (unique index)
    const allCardio = await DB.getAll("cardio");
    const cd = allCardio.find(c => c.sessionExerciseId === se.id);
    if (cd) await DB.del("cardio", cd.id);

    await DB.del("sessionExercises", se.id);
  }

  await DB.del("sessions", sessionId);
}

function wireWorkout() {
  // segmented type
  UI.qsa(".seg", els.wType).forEach(btn => {
    btn.addEventListener("click", async () => {
      UI.qsa(".seg", els.wType).forEach(b => b.classList.toggle("active", b === btn));
      state.workoutType = btn.dataset.type;
      updateWorkoutTypeVisibility();
      await startNewDraftSession();
      await renderWorkoutExercises();
    });
  });

  // chips
  renderMuscleChips();

  els.btnLoadSuggestions.addEventListener("click", async () => {
    await loadSuggestionsIntoDraft();
    await renderWorkoutExercises();
  });

  els.btnAddManualExercise.addEventListener("click", () => openExerciseModal());

  els.btnSaveSession.addEventListener("click", async () => {
    await saveCurrentWorkout();
  });

  updateWorkoutTypeVisibility();
}

function updateWorkoutTypeVisibility() {
  const t = state.workoutType;
  els.wGym.classList.toggle("hidden", t !== "gym");
  els.wBasketball.classList.toggle("hidden", t !== "basketball");
  els.wOther.classList.toggle("hidden", t !== "other");
}

function renderMuscleChips() {
  els.muscleChips.innerHTML = "";
  for (const g of MUSCLE_GROUPS) {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = g;
    chip.addEventListener("click", () => {
      if (state.selectedGroups.has(g)) state.selectedGroups.delete(g);
      else state.selectedGroups.add(g);
      chip.classList.toggle("active", state.selectedGroups.has(g));
    });
    els.muscleChips.appendChild(chip);
  }

  // populate modal group select too
  els.mGroup.innerHTML = MUSCLE_GROUPS.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join("");
}

async function startNewDraftSession() {
  state.currentSessionId = null;
  state.currentSessionExercises = [];
}

async function loadSessionIntoWorkout(sessionId) {
  const s = await DB.get("sessions", sessionId);
  if (!s) return;

  // set date
  els.wDate.value = s.dateISO;
  state.selectedISO = s.dateISO;

  // set type
  state.workoutType = s.type;
  UI.qsa(".seg", els.wType).forEach(b => b.classList.toggle("active", b.dataset.type === s.type));

  // set fields
  els.wDuration.value = s.durationMin ?? 0;
  els.wNotes.value = s.notes ?? "";
  els.wIntensity.value = s.intensity ?? "Média";
  els.wOtherName.value = s.otherName ?? "";

  updateWorkoutTypeVisibility();

  state.currentSessionId = sessionId;

  // load sessionExercises
  const seList = await DB.getAllByIndex("sessionExercises", "by_session", sessionId);
  seList.sort((a,b)=> (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  const exercisesAll = await DB.getAll("exercises");
  const setsAll = await DB.getAll("sets");
  const cardioAll = await DB.getAll("cardio");

  state.currentSessionExercises = seList.map(se => {
    const ex = exercisesAll.find(e => e.id === se.exerciseId);
    const sets = setsAll.filter(x => x.sessionExerciseId === se.id).sort((a,b)=>a.setNumber-b.setNumber);
    const cardio = cardioAll.find(c => c.sessionExerciseId === se.id) || null;
    return { seId: se.id, exercise: ex, done: !!se.done, orderIndex: se.orderIndex ?? 0, sets, cardio };
  });

  await renderWorkoutExercises();
}

async function loadSuggestionsIntoDraft() {
  if (!state.selectedGroups.size) return;

  const exAll = await DB.getAll("exercises");
  let order = state.currentSessionExercises.length;

  for (const group of state.selectedGroups) {
    const list = exAll.filter(e => e.group === group).sort((a,b) => (b.builtIn?1:0) - (a.builtIn?1:0));
    for (const e of list.slice(0,5)) {
      // add draft
      state.currentSessionExercises.push({
        seId: null,
        exercise: e,
        done: true,
        orderIndex: order++,
        sets: e.kind === "strength" ? [{ setNumber:1, reps:10, weightKg:10 }] : [],
        cardio: e.kind === "cardio" ? { minutes: 20, km: 2 } : null
      });
    }
  }

  // clear selected groups UI
  state.selectedGroups.clear();
  UI.qsa(".chip", els.muscleChips).forEach(ch => ch.classList.remove("active"));
}

async function renderWorkoutExercises() {
  els.workoutExercises.innerHTML = "";

  if (state.workoutType !== "gym") {
    els.workoutExercises.innerHTML = "";
    return;
  }

  if (!state.currentSessionExercises.length) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "Ainda sem exercícios. Selecione grupos e carregue sugestões, ou adicione manualmente.";
    els.workoutExercises.appendChild(empty);
    return;
  }

  for (let idx=0; idx<state.currentSessionExercises.length; idx++) {
    const row = state.currentSessionExercises[idx];
    const ex = row.exercise;

    const item = document.createElement("div");
    item.className = "item";

    const title = ex?.name ?? "Exercício";
    const meta = ex ? `${ex.group} • ${ex.emphasis}` : "—";

    item.innerHTML = `
      <div class="top">
        <div>
          <div class="title">${escapeHtml(title)}</div>
          <div class="meta">${escapeHtml(meta)}</div>
        </div>
        <div class="actions">
          <span class="pill ${row.done ? "ok":"no"}">${row.done ? "Feito":"Não feito"}</span>
          <button class="iconbtn" data-act="toggle">✓</button>
          <button class="iconbtn" data-act="remove">🗑</button>
        </div>
      </div>
      <div class="meta" style="margin-top:10px">
        <b>Principal:</b> ${escapeHtml(ex?.primary ?? "—")} <br/>
        <b>Secundários:</b> ${escapeHtml(ex?.secondary ?? "—")}
      </div>
      <div class="exercise-grid" data-box="details"></div>
    `;

    item.querySelector('[data-act="toggle"]').addEventListener("click", async () => {
      row.done = !row.done;
      await renderWorkoutExercises();
    });

    item.querySelector('[data-act="remove"]').addEventListener("click", async () => {
      state.currentSessionExercises.splice(idx, 1);
      await renderWorkoutExercises();
    });

    const details = item.querySelector('[data-box="details"]');

    if (ex?.kind === "cardio") {
      const minutes = row.cardio?.minutes ?? 20;
      const km = row.cardio?.km ?? 2;

      details.innerHTML = `
        <div class="mini">
          <div class="label">Duração (min)</div>
          <input class="input" type="number" min="0" step="5" value="${minutes}">
        </div>
        <div class="mini">
          <div class="label">Distância (km)</div>
          <input class="input" type="number" min="0" step="0.1" value="${km}">
        </div>
      `;
      const [minInp, kmInp] = details.querySelectorAll("input");
      minInp.addEventListener("input", () => {
        row.cardio = row.cardio || {};
        row.cardio.minutes = Number(minInp.value || 0);
      });
      kmInp.addEventListener("input", () => {
        row.cardio = row.cardio || {};
        row.cardio.km = Number(kmInp.value || 0);
      });

    } else {
      // strength: allow 1-3 sets quick
      const sets = row.sets?.length ? row.sets : [{ setNumber:1, reps:10, weightKg:10 }];
      row.sets = sets;

      details.innerHTML = `
        ${sets.map((s,i)=>`
          <div class="mini">
            <div class="label">Set ${s.setNumber} • Reps</div>
            <input class="input" type="number" min="0" step="1" value="${s.reps}">
          </div>
          <div class="mini">
            <div class="label">Set ${s.setNumber} • Carga (kg)</div>
            <input class="input" type="number" min="0" step="0.5" value="${s.weightKg}">
          </div>
        `).join("")}
        <div class="mini" style="grid-column: 1 / -1">
          <button class="btn ghost" data-act="addset">+ Série</button>
          <button class="btn ghost" data-act="rmset" style="margin-left:8px">- Série</button>
        </div>
      `;

      const inputs = [...details.querySelectorAll("input")];
      for (let i=0; i<inputs.length; i+=2) {
        const repsInp = inputs[i];
        const kgInp = inputs[i+1];
        const setIndex = Math.floor(i/2);
        repsInp.addEventListener("input", () => row.sets[setIndex].reps = Number(repsInp.value||0));
        kgInp.addEventListener("input", () => row.sets[setIndex].weightKg = Number(kgInp.value||0));
      }

      details.querySelector('[data-act="addset"]').addEventListener("click", async () => {
        const next = row.sets.length + 1;
        row.sets.push({ setNumber: next, reps: 10, weightKg: 10 });
        await renderWorkoutExercises();
      });

      details.querySelector('[data-act="rmset"]').addEventListener("click", async () => {
        if (row.sets.length <= 1) return;
        row.sets.pop();
        await renderWorkoutExercises();
      });
    }

    els.workoutExercises.appendChild(item);
  }
}

function wireModal() {
  els.modalClose.addEventListener("click", closeExerciseModal);
  els.modal.addEventListener("click", (e) => {
    if (e.target === els.modal) closeExerciseModal();
  });

  els.modalSaveExercise.addEventListener("click", async () => {
    const name = els.mName.value.trim();
    const group = els.mGroup.value;
    const kind = els.mKind.value;
    const primary = els.mPrimary.value.trim() || "—";
    const emphasis = els.mEmphasis.value.trim() || "—";
    const secondary = els.mSecondary.value.trim() || "—";

    if (!name) return;

    const id = await DB.add("exercises", { name, group, kind, primary, emphasis, secondary, builtIn: false });

    // add into draft list
    const exercise = await DB.get("exercises", id);
    const order = state.currentSessionExercises.length;

    state.currentSessionExercises.push({
      seId: null,
      exercise,
      done: true,
      orderIndex: order,
      sets: kind === "strength" ? [{ setNumber:1, reps:10, weightKg:10 }] : [],
      cardio: kind === "cardio" ? { minutes: 20, km: 2 } : null
    });

    closeExerciseModal();
    await renderWorkoutExercises();
  });
}

function openExerciseModal() {
  els.mName.value = "";
  els.mKind.value = "strength";
  els.mPrimary.value = "";
  els.mEmphasis.value = "";
  els.mSecondary.value = "";
  els.modal.classList.remove("hidden");
}

function closeExerciseModal() {
  els.modal.classList.add("hidden");
}

async function saveCurrentWorkout() {
  const dateISO = els.wDate.value || UI.isoToday();
  const type = state.workoutType;
  const durationMin = Number(els.wDuration.value || 0);
  const notes = els.wNotes.value.trim() || null;
  const intensity = type === "basketball" ? els.wIntensity.value : null;
  const otherName = type === "other" ? (els.wOtherName.value.trim() || null) : null;

  const session = {
    id: state.currentSessionId ?? undefined,
    dateISO,
    monthKey: monthKeyFromISO(dateISO),
    type,
    durationMin,
    notes,
    intensity,
    otherName
  };

  // Upsert session
  let sessionId;
  if (state.currentSessionId) {
    await DB.put("sessions", session);
    sessionId = state.currentSessionId;
  } else {
    sessionId = await DB.add("sessions", session);
    state.currentSessionId = sessionId;
  }

  // If not gym, delete old exercises cascade (if editing from gym -> other, etc.)
  if (type !== "gym") {
    await deleteSessionExercisesOnly(sessionId);
    state.currentSessionExercises = [];
    UI.toast(els.saveHint, "✅ Atividade salva!");
    state.selectedISO = dateISO;
    await renderCalendar();
    await renderDaySessions();
    return;
  }

  // Gym: rewrite session exercises for simplicity:
  // 1) delete previous session exercises cascade
  await deleteSessionExercisesOnly(sessionId);

  // 2) insert from draft
  for (let i=0; i<state.currentSessionExercises.length; i++) {
    const row = state.currentSessionExercises[i];
    const ex = row.exercise;
    if (!ex?.id) continue;

    const seId = await DB.add("sessionExercises", {
      sessionId,
      exerciseId: ex.id,
      done: row.done ? 1 : 0,
      orderIndex: i
    });

    if (ex.kind === "cardio") {
      const minutes = Number(row.cardio?.minutes ?? 0);
      const km = Number(row.cardio?.km ?? 0);
      await DB.add("cardio", { sessionExerciseId: seId, minutes, km });
    } else {
      const sets = row.sets ?? [];
      for (const s of sets) {
        await DB.add("sets", {
          sessionExerciseId: seId,
          setNumber: s.setNumber,
          reps: Number(s.reps ?? 0),
          weightKg: Number(s.weightKg ?? 0)
        });
      }
    }
  }

  UI.toast(els.saveHint, "✅ Atividade salva!");
  state.selectedISO = dateISO;

  await renderCalendar();
  await renderDaySessions();
}

async function deleteSessionExercisesOnly(sessionId) {
  const seList = await DB.getAllByIndex("sessionExercises", "by_session", sessionId);
  const allSets = await DB.getAll("sets");
  const allCardio = await DB.getAll("cardio");

  for (const se of seList) {
    for (const st of allSets.filter(x => x.sessionExerciseId === se.id)) {
      await DB.del("sets", st.id);
    }
    const cd = allCardio.find(c => c.sessionExerciseId === se.id);
    if (cd) await DB.del("cardio", cd.id);

    await DB.del("sessionExercises", se.id);
  }
}

function wireInsights() {
  els.insPrev.addEventListener("click", async () => {
    state.insightsCursor = new Date(state.insightsCursor.getFullYear(), state.insightsCursor.getMonth() - 1, 1);
    await renderInsights();
  });
  els.insNext.addEventListener("click", async () => {
    state.insightsCursor = new Date(state.insightsCursor.getFullYear(), state.insightsCursor.getMonth() + 1, 1);
    await renderInsights();
  });
}

async function renderInsights() {
  const cursor = state.insightsCursor;
  els.insTitle.textContent = UI.fmtMonthTitle(cursor);

  const mk = UI.monthKeyFromDate(cursor);
  const sessions = await DB.getAllByIndex("sessions", "by_month", mk);

  const countGym = sessions.filter(s => s.type === "gym").length;
  const countBasket = sessions.filter(s => s.type === "basketball").length;
  const countOther = sessions.filter(s => s.type === "other").length;

  const minGym = sessions.filter(s => s.type === "gym").reduce((a,b)=>a+(b.durationMin||0),0);
  const minBasket = sessions.filter(s => s.type === "basketball").reduce((a,b)=>a+(b.durationMin||0),0);
  const minOther = sessions.filter(s => s.type === "other").reduce((a,b)=>a+(b.durationMin||0),0);

  Charts.bar(els.chartCount, ["Academia","Basquete","Outros"], [countGym, countBasket, countOther]);
  Charts.bar(els.chartMinutes, ["Academia","Basquete","Outros"], [minGym, minBasket, minOther]);
}

function wireSettings() {
  els.btnExport.addEventListener("click", async () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        sessions: await DB.getAll("sessions"),
        exercises: await DB.getAll("exercises"),
        sessionExercises: await DB.getAll("sessionExercises"),
        sets: await DB.getAll("sets"),
        cardio: await DB.getAll("cardio"),
        meta: await DB.getAll("meta")
      }
    };

    const filename = `fitness2026_backup_${Date.now()}.json`;
    UI.addDownload(filename, JSON.stringify(payload, null, 2));
    els.settingsStatus.textContent = "✅ Backup exportado.";
  });

  els.importFile.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);

      if (!payload?.data) throw new Error("Arquivo inválido.");

      // replace all
      await DB.clearAll();

      // reinsert
      for (const row of (payload.data.meta ?? [])) await DB.put("meta", row);
      for (const row of (payload.data.exercises ?? [])) await DB.put("exercises", row);
      for (const row of (payload.data.sessions ?? [])) await DB.put("sessions", row);
      for (const row of (payload.data.sessionExercises ?? [])) await DB.put("sessionExercises", row);
      for (const row of (payload.data.sets ?? [])) await DB.put("sets", row);
      for (const row of (payload.data.cardio ?? [])) await DB.put("cardio", row);

      els.settingsStatus.textContent = "✅ Import concluído.";
      // refresh views
      await renderCalendar();
      await renderDaySessions();
      await renderInsights();
    } catch (err) {
      els.settingsStatus.textContent = "❌ Import falhou: " + (err?.message ?? String(err));
    } finally {
      els.importFile.value = "";
    }
  });

  els.btnReset.addEventListener("click", async () => {
    const ok = confirm("Tem certeza? Isso apaga TUDO do app no seu iPhone.");
    if (!ok) return;

    await DB.clearAll();
    // seed again to keep suggestions
    await ensureSeed();
    els.settingsStatus.textContent = "✅ Dados apagados (seed restaurado).";

    await renderCalendar();
    await renderDaySessions();
    await renderInsights();
  });
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

window.addEventListener("load", init);

