// 校園恐怖推理解謎單頁遊戲。
// 純 Vanilla JS，包含：對話、探索、證物、反駁、結局、存讀檔與 Web Audio 雨聲。

const STORAGE_KEY = "campus-rollcall-save-v2";

const state = {
  dialogueIndex: 0,
  mode: "dialogue",
  currentLocation: "classroom",
  evidence: new Set(),
  selectedTestimony: null,
  solvedContradictions: new Set(),
  audioStarted: false,
  audioNodes: null,
  ending: null,
};

const evidenceData = {
  photo: {
    name: "照片",
    icon: "PHOTO",
    location: "library",
    title: "泛黃的社團合照",
    desc: "照片背面寫著「三年前，廣播社」。最右側的人臉被修正帶塗掉，但制服名牌還露出一個「祐」字。",
  },
  diary: {
    name: "日記",
    icon: "DIARY",
    location: "infirmary",
    title: "保健室借宿日記",
    desc: "日記反覆出現一句話：「只要我不回答，大家就能繼續說我不存在。」最後一頁被撕掉。",
  },
  roster: {
    name: "點名簿",
    icon: "LIST",
    location: "classroom",
    title: "三年二班舊點名簿",
    desc: "點名簿第 27 號被黑筆塗掉。透光看見原本的名字是「陳祐安」，旁邊有多人補寫的缺席記號。",
  },
  cctv: {
    name: "監視器紀錄",
    icon: "TAPE",
    location: "oldBuilding",
    title: "舊校舍走廊錄影",
    desc: "錄影時間是失蹤當天 17:42。畫面裡有三名學生把一個書包塞進廣播室置物櫃，隔天才取出。",
  },
};

const locations = [
  {
    id: "classroom",
    name: "教室",
    scene: "classroom",
    clue: "roster",
    text: "黑板還留著放學前的值日生名單。講桌抽屜卡住了，裡面壓著一本封面褪色的點名簿。",
  },
  {
    id: "library",
    name: "圖書館",
    scene: "library",
    clue: "photo",
    text: "舊校刊區沒有開燈。某本畢業紀念冊被摺角，裡面夾著一張廣播社合照。",
  },
  {
    id: "infirmary",
    name: "保健室",
    scene: "infirmary",
    clue: "diary",
    text: "保健室的窗簾被雨水映成灰藍色。床底膠箱裡，有一本沒有署名的日記。",
  },
  {
    id: "oldBuilding",
    name: "舊校舍",
    scene: "old-building",
    clue: "cctv",
    text: "舊校舍比傳聞中乾淨，乾淨得像有人定期回來整理。保全室備份碟仍能讀取。",
  },
  {
    id: "broadcastRoom",
    name: "廣播室",
    scene: "broadcast-room",
    clue: null,
    text: "麥克風紅燈沒有接電，卻在你靠近時閃了一下。控制台夾縫裡只有一張空白點名紙。",
  },
];

const dialogues = {
  opening: [
    ["林澄", "澄", "第七節下課後，雨把操場切成一格一格的灰色。廣播忽然響了，像從很遠的教室傳來。"],
    ["廣播", "播", "三年二班，放學點名。\n一號，王若晴。二號，江以辰。三號，林澄。"],
    ["林澄", "澄", "我差點回答。可班導曾說過那句都市傳說：放學後如果聽到廣播點名，千萬不要回答自己的名字。"],
    ["許眠", "眠", "你也聽到了嗎？剛剛點到三號之後，還有一個名字。可是我們班沒有那個人。"],
    ["廣播", "播", "二十七號，陳祐安。\n請回答。"],
    ["林澄", "澄", "班上明明只有二十六個人。可所有人都在同一瞬間低下頭，像是這個名字不該被聽見。"],
    ["系統", "案", "CH1 結束。你的目標不是證明鬼存在，而是找出大家為什麼假裝不記得。"],
  ],
  investigationIntro: [
    ["許眠", "眠", "CH2 初次調查。先找四樣證物：照片、日記、點名簿、監視器紀錄。它們會把同一段被塗掉的記憶拼回來。"],
  ],
  rebuttalIntro: [
    ["林澄", "澄", "證物都到齊了。現在要問的不是「誰失蹤」，而是「誰讓他只能用失蹤被記住」。"],
  ],
  finalIntro: [
    ["廣播", "播", "二十七號，陳祐安。\n請回答。"],
    ["林澄", "澄", "這一次，我知道不能替他回答。但我可以讓所有人聽見，他曾經在這裡。"],
    ["許眠", "眠", "如果公開，大家會說我們太殘忍。如果沉默，他就會再失蹤一次。"],
    ["系統", "案", "CH3 記憶的點名。選擇真相要如何被留下。"],
  ],
};

const testimonies = [
  {
    id: "t1",
    speaker: "班長 周映廷",
    text: "陳祐安不是我們班的人。點名簿上從來沒有他的名字。",
    answer: "roster",
    success: "點名簿第 27 號被塗掉，證明他曾在班上。這不是陌生人的名字，是被刪除的同學。",
  },
  {
    id: "t2",
    speaker: "廣播社學長",
    text: "三年前廣播社只有五個人，那張照片裡多出來的人是誤印。",
    answer: "photo",
    success: "照片背面寫著廣播社，且被塗掉的人仍露出名牌。所謂誤印，是事後塗改的說法。",
  },
  {
    id: "t3",
    speaker: "值日生紀錄",
    text: "失蹤當天沒有人去過舊校舍，大家都準時離校。",
    answer: "cctv",
    success: "監視器在 17:42 拍到三名學生進入舊校舍。準時離校的證詞不成立。",
  },
  {
    id: "t4",
    speaker: "匿名留言",
    text: "陳祐安只是自己不想來學校，沒有人逼他。",
    answer: "diary",
    success: "日記裡的句子顯示他被迫沉默。真正可怕的不是廣播，是所有人選擇不回答。",
  },
];

const endings = {
  public: {
    title: "結局 A：公開的點名",
    text: "你把錄音與證物交給校刊社。隔天早上，所有班級都看見陳祐安的名字。有人道歉，有人沉默，但這次沉默不再能假裝成遺忘。",
  },
  teacher: {
    title: "結局 B：被接住的真相",
    text: "你先把證物交給老師與輔導室。調查很慢，卻開始有人被保護地說出當年的事。真相沒有爆炸，它像雨後的水痕，一點一點留下形狀。",
  },
  silent: {
    title: "結局 C：沒有回答的人",
    text: "你把點名簿放回抽屜。廣播停止了，教室也安靜了。可下一年放學後，點名聲再次響起，這次多出來的名字，像是更靠近你。",
  },
};

const el = {
  sceneImage: document.querySelector("#sceneImage"),
  chapterLabel: document.querySelector("#chapterLabel"),
  locationTitle: document.querySelector("#locationTitle"),
  caseStatus: document.querySelector("#caseStatus"),
  avatarInitial: document.querySelector("#avatarInitial"),
  speakerName: document.querySelector("#speakerName"),
  dialogueText: document.querySelector("#dialogueText"),
  modeBadge: document.querySelector("#modeBadge"),
  nextBtn: document.querySelector("#nextBtn"),
  investigateBtn: document.querySelector("#investigateBtn"),
  deductionBtn: document.querySelector("#deductionBtn"),
  finalChoiceBtn: document.querySelector("#finalChoiceBtn"),
  locationGrid: document.querySelector("#locationGrid"),
  evidenceList: document.querySelector("#evidenceList"),
  evidenceDetail: document.querySelector("#evidenceDetail"),
  progressText: document.querySelector("#progressText"),
  deductionPanel: document.querySelector("#deductionPanel"),
  testimonyList: document.querySelector("#testimonyList"),
  evidenceSelect: document.querySelector("#evidenceSelect"),
  refuteBtn: document.querySelector("#refuteBtn"),
  deductionResult: document.querySelector("#deductionResult"),
  choicePanel: document.querySelector("#choicePanel"),
  audioToggle: document.querySelector("#audioToggle"),
  saveBtn: document.querySelector("#saveBtn"),
  loadBtn: document.querySelector("#loadBtn"),
  resetBtn: document.querySelector("#resetBtn"),
};

let typeTimer = null;
let activeLine = "";
let isTyping = false;

function lineToObject(line) {
  return { speaker: line[0], avatar: line[1], text: line[2] };
}

function currentDialogueList() {
  if (state.mode === "dialogue") return dialogues.opening;
  if (state.mode === "investigationIntro") return dialogues.investigationIntro;
  if (state.mode === "rebuttalIntro") return dialogues.rebuttalIntro;
  if (state.mode === "finalIntro") return dialogues.finalIntro;
  return [];
}

function typeText(text) {
  clearInterval(typeTimer);
  activeLine = text;
  isTyping = true;
  el.dialogueText.textContent = "";
  let index = 0;
  typeTimer = setInterval(() => {
    el.dialogueText.textContent += text[index] || "";
    index += 1;
    if (index >= text.length) {
      clearInterval(typeTimer);
      isTyping = false;
    }
  }, 24);
}

function setDialogue(line) {
  const data = Array.isArray(line) ? lineToObject(line) : line;
  el.speakerName.textContent = data.speaker;
  el.avatarInitial.textContent = data.avatar;
  el.dialogueText.classList.remove("glitch");
  void el.dialogueText.offsetWidth;
  if (data.speaker === "廣播") el.dialogueText.classList.add("glitch");
  typeText(data.text);
}

function advanceDialogue() {
  if (isTyping) {
    clearInterval(typeTimer);
    el.dialogueText.textContent = activeLine;
    isTyping = false;
    return;
  }

  const list = currentDialogueList();
  state.dialogueIndex += 1;

  if (state.dialogueIndex < list.length) {
    setDialogue(list[state.dialogueIndex]);
    return;
  }

  if (state.mode === "dialogue") enterInvestigationIntro();
  else if (state.mode === "investigationIntro") enterExploreMode();
  else if (state.mode === "rebuttalIntro") enterDeductionMode();
  else if (state.mode === "finalIntro") enterChoiceMode();
}

function enterInvestigationIntro() {
  state.mode = "investigationIntro";
  state.dialogueIndex = 0;
  el.chapterLabel.textContent = "CH2 初次調查";
  el.caseStatus.textContent = "搜查校園";
  el.modeBadge.textContent = "閱讀";
  setDialogue(dialogues.investigationIntro[0]);
}

function enterExploreMode() {
  state.mode = "explore";
  el.modeBadge.textContent = "探索";
  el.nextBtn.classList.add("hidden");
  el.investigateBtn.classList.remove("hidden");
  el.speakerName.textContent = "調查筆記";
  el.avatarInitial.textContent = "查";
  typeText("選擇右側地點進行探索。每個線索都在回答同一個問題：誰把陳祐安從班上抹掉？");
  renderAll();
}

function inspectLocation(id) {
  const location = locations.find((item) => item.id === id);
  if (!location) return;

  state.currentLocation = id;
  updateScene(location);
  el.speakerName.textContent = location.name;
  el.avatarInitial.textContent = "查";
  typeText(location.text);

  if (location.clue && !state.evidence.has(location.clue)) {
    state.evidence.add(location.clue);
    el.caseStatus.textContent = `取得證物：${evidenceData[location.clue].name}`;
    showEvidence(location.clue);
  } else if (location.clue) {
    el.caseStatus.textContent = "此處已搜索";
  } else {
    el.caseStatus.textContent = "空白點名紙";
  }

  renderAll();
  checkAllEvidence();
}

function updateScene(location) {
  el.sceneImage.className = `scene-image ${location.scene}`;
  el.locationTitle.textContent = location.name;
}

function renderLocations() {
  el.locationGrid.innerHTML = "";
  locations.forEach((location) => {
    const found = location.clue && state.evidence.has(location.clue);
    const button = document.createElement("button");
    button.className = `location-card ${found ? "found" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <strong class="text-cyan-100">${location.name}</strong>
        <span class="text-xs ${found ? "text-emerald-300" : "text-slate-500"}">${found ? "已取得" : "未調查"}</span>
      </div>
      <p class="mt-1 text-sm text-slate-400">${location.clue ? "可能藏有證物" : "都市傳說的源頭"}</p>
    `;
    button.addEventListener("click", () => inspectLocation(location.id));
    el.locationGrid.appendChild(button);
  });
}

function renderEvidence() {
  el.evidenceList.innerHTML = "";
  Object.entries(evidenceData).forEach(([id, item]) => {
    const owned = state.evidence.has(id);
    const button = document.createElement("button");
    button.className = `evidence-card ${owned ? "" : "empty"}`;
    button.type = "button";
    button.disabled = !owned;
    button.innerHTML = `
      <div class="text-xs text-cyan-300/70">${owned ? item.icon : "LOCKED"}</div>
      <strong class="mt-1 block">${owned ? item.name : "未取得"}</strong>
    `;
    button.addEventListener("click", () => showEvidence(id));
    el.evidenceList.appendChild(button);
  });

  el.progressText.textContent = `線索 ${state.evidence.size} / ${Object.keys(evidenceData).length}`;
  el.evidenceSelect.innerHTML = "";
  [...state.evidence].forEach((id) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = evidenceData[id].name;
    el.evidenceSelect.appendChild(option);
  });
}

function showEvidence(id) {
  const item = evidenceData[id];
  if (!item) return;
  el.evidenceDetail.innerHTML = `
    <strong class="block text-cyan-100">${item.title}</strong>
    <p class="mt-1">${item.desc}</p>
  `;
}

function checkAllEvidence() {
  if (state.evidence.size >= Object.keys(evidenceData).length && state.mode === "explore") {
    el.deductionBtn.classList.remove("hidden");
    el.caseStatus.textContent = "可以反駁";
  }
}

function prepareRebuttal() {
  state.mode = "rebuttalIntro";
  state.dialogueIndex = 0;
  el.modeBadge.textContent = "反駁";
  el.nextBtn.classList.remove("hidden");
  el.investigateBtn.classList.add("hidden");
  el.deductionBtn.classList.add("hidden");
  setDialogue(dialogues.rebuttalIntro[0]);
}

function enterDeductionMode() {
  state.mode = "deduction";
  el.nextBtn.classList.add("hidden");
  el.deductionPanel.classList.remove("hidden");
  el.caseStatus.textContent = "矛盾審理";
  renderTestimonies();
}

function renderTestimonies() {
  el.testimonyList.innerHTML = "";
  testimonies.forEach((testimony) => {
    const solved = state.solvedContradictions.has(testimony.id);
    const selected = state.selectedTestimony === testimony.id;
    const button = document.createElement("button");
    button.className = `testimony-card ${selected ? "selected" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <strong class="text-cyan-100">${testimony.speaker}</strong>
      <p class="mt-1 text-sm">${testimony.text}</p>
      <p class="mt-1 text-xs ${solved ? "text-emerald-300" : "text-slate-500"}">${solved ? "已突破" : "待反駁"}</p>
    `;
    button.addEventListener("click", () => {
      state.selectedTestimony = testimony.id;
      el.deductionResult.textContent = "已選擇證詞。提出一項能直接推翻它的證物。";
      renderTestimonies();
    });
    el.testimonyList.appendChild(button);
  });
}

function refute() {
  const testimony = testimonies.find((item) => item.id === state.selectedTestimony);
  const evidenceId = el.evidenceSelect.value;

  if (!testimony) {
    el.deductionResult.textContent = "請先選擇要反駁的證詞。";
    return;
  }

  if (testimony.answer === evidenceId) {
    state.solvedContradictions.add(testimony.id);
    el.deductionResult.textContent = testimony.success;
    el.caseStatus.textContent = `突破 ${state.solvedContradictions.size} / ${testimonies.length}`;
    renderTestimonies();
    if (state.solvedContradictions.size === testimonies.length) finishChapterTwo();
  } else {
    el.deductionResult.textContent = "這項證物還不能直接推翻該證詞。先找證詞裡最絕對、最怕被檢查的那一句。";
  }
}

function finishChapterTwo() {
  state.mode = "finalIntro";
  state.dialogueIndex = 0;
  el.chapterLabel.textContent = "CH3 記憶的點名";
  el.modeBadge.textContent = "終章";
  el.nextBtn.classList.remove("hidden");
  el.deductionPanel.classList.add("hidden");
  el.speakerName.textContent = "林澄";
  el.avatarInitial.textContent = "澄";
  el.caseStatus.textContent = "CH2 完成";
  updateScene(locations.find((item) => item.id === "broadcastRoom"));
  setDialogue(dialogues.finalIntro[0]);
}

function enterChoiceMode() {
  state.mode = "choice";
  el.nextBtn.classList.add("hidden");
  el.finalChoiceBtn.classList.add("hidden");
  el.choicePanel.classList.remove("hidden");
  el.caseStatus.textContent = "選擇結局";
  el.speakerName.textContent = "系統";
  el.avatarInitial.textContent = "終";
  typeText("請在右側做出最後選擇。每個選擇都不完美，但都會留下不同的責任。");
}

function chooseEnding(type) {
  const ending = endings[type];
  if (!ending) return;
  state.ending = type;
  state.mode = "ending";
  el.choicePanel.classList.add("hidden");
  el.sceneImage.className = "scene-image ending-scene";
  el.chapterLabel.textContent = "ENDING";
  el.locationTitle.textContent = ending.title;
  el.caseStatus.textContent = "遊戲完成";
  el.modeBadge.textContent = "結局";
  el.speakerName.textContent = ending.title;
  el.avatarInitial.textContent = "終";
  typeText(`${ending.text}\n\n閱讀理解提問：在這個故事中，真正造成恐怖感的是「鬼」，還是集體沉默？請寫下你判斷的證據。`);
}

function saveGame() {
  const payload = {
    dialogueIndex: state.dialogueIndex,
    mode: state.mode,
    currentLocation: state.currentLocation,
    evidence: [...state.evidence],
    selectedTestimony: state.selectedTestimony,
    solvedContradictions: [...state.solvedContradictions],
    ending: state.ending,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  el.caseStatus.textContent = "進度已儲存";
}

function loadGame() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    el.caseStatus.textContent = "沒有存檔";
    return;
  }

  try {
    const data = JSON.parse(raw);
    state.dialogueIndex = data.dialogueIndex || 0;
    state.mode = data.mode || "dialogue";
    state.currentLocation = data.currentLocation || "classroom";
    state.evidence = new Set(data.evidence || []);
    state.selectedTestimony = data.selectedTestimony || null;
    state.solvedContradictions = new Set(data.solvedContradictions || []);
    state.ending = data.ending || null;
    restoreView();
    el.caseStatus.textContent = "進度已讀取";
  } catch {
    el.caseStatus.textContent = "存檔損毀";
  }
}

function restoreView() {
  hideActionPanels();
  renderAll();
  const location = locations.find((item) => item.id === state.currentLocation) || locations[0];
  updateScene(location);

  if (state.mode === "dialogue" || state.mode === "investigationIntro" || state.mode === "rebuttalIntro" || state.mode === "finalIntro") {
    el.nextBtn.classList.remove("hidden");
    const list = currentDialogueList();
    setDialogue(list[Math.min(state.dialogueIndex, list.length - 1)]);
  } else if (state.mode === "explore") {
    enterExploreMode();
  } else if (state.mode === "deduction") {
    enterDeductionMode();
  } else if (state.mode === "choice") {
    enterChoiceMode();
  } else if (state.mode === "ending") {
    chooseEnding(state.ending || "teacher");
  }
}

function hideActionPanels() {
  el.nextBtn.classList.add("hidden");
  el.investigateBtn.classList.add("hidden");
  el.deductionBtn.classList.add("hidden");
  el.finalChoiceBtn.classList.add("hidden");
  el.deductionPanel.classList.add("hidden");
  el.choicePanel.classList.add("hidden");
}

function renderAll() {
  renderLocations();
  renderEvidence();
  if (state.mode === "deduction") renderTestimonies();
}

function startRainAudio() {
  if (state.audioNodes) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioContext();
  const bufferSize = 2 * ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i += 1) output[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  const hum = ctx.createOscillator();
  const humGain = ctx.createGain();

  noise.buffer = noiseBuffer;
  noise.loop = true;
  filter.type = "lowpass";
  filter.frequency.value = 900;
  gain.gain.value = 0;
  hum.frequency.value = 58;
  humGain.gain.value = 0;

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  hum.connect(humGain);
  humGain.connect(ctx.destination);
  noise.start();
  hum.start();
  state.audioNodes = { ctx, gain, humGain };
}

function toggleAudio() {
  startRainAudio();
  state.audioStarted = !state.audioStarted;
  const now = state.audioNodes.ctx.currentTime;
  state.audioNodes.gain.gain.setTargetAtTime(state.audioStarted ? 0.12 : 0, now, 0.05);
  state.audioNodes.humGain.gain.setTargetAtTime(state.audioStarted ? 0.018 : 0, now, 0.05);
  el.audioToggle.textContent = state.audioStarted ? "雨聲 ON" : "雨聲 OFF";
}

function resetGame() {
  clearInterval(typeTimer);
  state.dialogueIndex = 0;
  state.mode = "dialogue";
  state.currentLocation = "classroom";
  state.evidence = new Set();
  state.selectedTestimony = null;
  state.solvedContradictions = new Set();
  state.ending = null;

  hideActionPanels();
  el.nextBtn.classList.remove("hidden");
  el.chapterLabel.textContent = "CH1 放學後的廣播";
  el.locationTitle.textContent = "三年二班教室";
  el.caseStatus.textContent = "調查開始";
  el.modeBadge.textContent = "對話";
  el.deductionResult.textContent = "";
  el.evidenceDetail.textContent = "尚未取得證物。探索校園，找出被「大家」藏起來的記憶。";
  updateScene(locations[0]);
  renderAll();
  setDialogue(dialogues.opening[0]);
}

el.nextBtn.addEventListener("click", advanceDialogue);
el.investigateBtn.addEventListener("click", () => inspectLocation(state.currentLocation));
el.deductionBtn.addEventListener("click", prepareRebuttal);
el.refuteBtn.addEventListener("click", refute);
el.audioToggle.addEventListener("click", toggleAudio);
el.saveBtn.addEventListener("click", saveGame);
el.loadBtn.addEventListener("click", loadGame);
el.resetBtn.addEventListener("click", resetGame);
document.querySelectorAll("[data-ending]").forEach((button) => {
  button.addEventListener("click", () => chooseEnding(button.dataset.ending));
});

resetGame();
