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
  timelineSolved: false,
  readingSolved: false,
  caseLog: ["案件開始：放學後的廣播開始點名。"],
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
  seating: {
    name: "座位表",
    icon: "SEAT",
    location: "classroom",
    title: "被重畫的座位表",
    desc: "舊座位表上，靠窗最後一排原本有一個名字。新座位表把那格改成「掃具櫃」，筆跡與班長相同。",
  },
  chalk: {
    name: "黑板殘字",
    icon: "CHALK",
    location: "classroom",
    title: "黑板角落的殘字",
    desc: "黑板右下角被擦過很多次，仍看得出「不要替我回答」幾個字。這句話和日記內容互相呼應。",
  },
  checkout: {
    name: "借書卡",
    icon: "CARD",
    location: "library",
    title: "圖書館借書卡",
    desc: "陳祐安失蹤前一週借了《群眾心理學》和《校園新聞採訪》。還書欄被別人代簽。",
  },
  newspaper: {
    name: "校刊剪報",
    icon: "NEWS",
    location: "library",
    title: "被撤稿的校刊剪報",
    desc: "剪報標題是「廣播室裡的點名」。文章被紅筆寫上：不要刊，會影響班級評比。",
  },
  nurseNote: {
    name: "護理紀錄",
    icon: "NOTE",
    location: "infirmary",
    title: "護理師值班紀錄",
    desc: "失蹤當天 16:50，陳祐安曾因過度換氣到保健室。紀錄旁寫著：疑似長期遭同儕排擠。",
  },
  tornPage: {
    name: "撕下的日記頁",
    icon: "PAGE",
    location: "infirmary",
    title: "被藏起來的最後一頁",
    desc: "最後一頁寫著：如果他們今晚又把我關進廣播室，請不要相信他們說的玩笑。",
  },
  locker: {
    name: "置物櫃照片",
    icon: "LOCK",
    location: "oldBuilding",
    title: "舊校舍置物櫃照片",
    desc: "照片裡的置物櫃貼著陳祐安的姓名貼，門縫夾著一截被扯斷的書包背帶。",
  },
  scriptPaper: {
    name: "廣播稿",
    icon: "AIR",
    location: "broadcastRoom",
    title: "未播出的廣播稿",
    desc: "稿紙上寫著完整道歉詞，卻被改成放學點名。最後一句是：我們不是忘記，是一直不敢承認。",
  },
};

const locations = [
  {
    id: "classroom",
    name: "教室",
    scene: "classroom",
    clue: "roster",
    clues: ["roster", "seating", "chalk"],
    text: "黑板還留著放學前的值日生名單。講桌抽屜卡住了，裡面壓著一本封面褪色的點名簿。",
  },
  {
    id: "library",
    name: "圖書館",
    scene: "library",
    clue: "photo",
    clues: ["photo", "checkout", "newspaper"],
    text: "舊校刊區沒有開燈。某本畢業紀念冊被摺角，裡面夾著一張廣播社合照。",
  },
  {
    id: "infirmary",
    name: "保健室",
    scene: "infirmary",
    clue: "diary",
    clues: ["diary", "nurseNote", "tornPage"],
    text: "保健室的窗簾被雨水映成灰藍色。床底膠箱裡，有一本沒有署名的日記。",
  },
  {
    id: "oldBuilding",
    name: "舊校舍",
    scene: "old-building",
    clue: "cctv",
    clues: ["cctv", "locker"],
    text: "舊校舍比傳聞中乾淨，乾淨得像有人定期回來整理。保全室備份碟仍能讀取。",
  },
  {
    id: "broadcastRoom",
    name: "廣播室",
    scene: "broadcast-room",
    clue: null,
    clues: ["scriptPaper"],
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
    ["許眠", "眠", "CH2 初次調查。這次不要只找傳說本身，要找十二項證物：名單、照片、日記、紀錄、剪報、座位表、廣播稿。它們會把同一段被塗掉的記憶拼回來。"],
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
  {
    id: "t5",
    speaker: "班長 周映廷",
    text: "最後一排一直是掃具櫃，沒有任何人坐過那個位置。",
    answer: "seating",
    success: "座位表顯示靠窗最後一排原本是學生座位，後來才被改成掃具櫃。",
  },
  {
    id: "t6",
    speaker: "校刊指導老師",
    text: "校刊沒有收到過和廣播室有關的投稿，所以不存在撤稿。",
    answer: "newspaper",
    success: "校刊剪報標題與紅筆批註都存在，撤稿是被行政壓下，不是沒有投稿。",
  },
  {
    id: "t7",
    speaker: "護理師舊紀錄",
    text: "那天保健室沒有任何異常，陳祐安也沒有求助。",
    answer: "nurseNote",
    success: "護理紀錄明確寫下 16:50 的過度換氣與疑似排擠，求助曾經發生。",
  },
  {
    id: "t8",
    speaker: "廣播社學長",
    text: "那天只是排練點名，沒有任何人被關進廣播室。",
    answer: "tornPage",
    success: "撕下的日記頁預告了「又把我關進廣播室」，說明這不是第一次，也不是排練。",
  },
  {
    id: "t9",
    speaker: "保全室紀錄",
    text: "舊校舍置物櫃早就清空，不可能留下陳祐安的東西。",
    answer: "locker",
    success: "置物櫃照片裡有姓名貼與書包背帶，證明有人處理過現場，而不是自然清空。",
  },
  {
    id: "t10",
    speaker: "廣播稿批註",
    text: "點名只是機器故障，廣播室沒有留下任何人工改稿痕跡。",
    answer: "scriptPaper",
    success: "未播出的廣播稿證明有人把道歉詞改成點名。恐怖傳說是人為包裝出的沉默。",
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

const timelineEvents = [
  { id: "nurse", text: "16:50 陳祐安到保健室求助，護理紀錄寫下疑似長期排擠。" },
  { id: "diary", text: "他在日記最後一頁寫下：如果又被關進廣播室，請不要相信那是玩笑。" },
  { id: "locker", text: "三名學生把他的書包塞進舊校舍廣播室置物櫃。" },
  { id: "broadcast", text: "原本的道歉廣播稿被改成放學點名，名字被放進都市傳說裡。" },
  { id: "erase", text: "座位表、點名簿與照片陸續被塗改，班上開始假裝沒有第 27 號。" },
  { id: "rumor", text: "三年後，點名多出一個名字的傳聞變成新的集體記憶。" },
];

const timelineAnswer = ["nurse", "diary", "locker", "broadcast", "erase", "rumor"];

const readingQuestions = [
  {
    id: "theme",
    question: "故事真正的恐怖來源是什麼？",
    options: [
      ["ghost", "舊校舍裡真的有會點名的鬼"],
      ["silence", "大家明明記得，卻一起假裝不知道"],
      ["machine", "廣播器材故障造成重複播放"],
    ],
    answer: "silence",
  },
  {
    id: "method",
    question: "哪一種證物最能證明「記憶被人為改寫」？",
    options: [
      ["seating", "座位表、點名簿、照片上的塗改痕跡"],
      ["rain", "放學後一直下雨"],
      ["window", "保健室窗簾是灰藍色"],
    ],
    answer: "seating",
  },
  {
    id: "logic",
    question: "為什麼『他只是自己不想來學校』這句證詞不可靠？",
    options: [
      ["diary", "日記與護理紀錄顯示他曾求助，且被迫沉默"],
      ["name", "因為他的名字聽起來不像本校學生"],
      ["club", "因為廣播社人數太少"],
    ],
    answer: "diary",
  },
  {
    id: "responsibility",
    question: "最後選擇的核心不是找鬼，而是什麼？",
    options: [
      ["score", "提高班級評比分數"],
      ["responsibility", "決定真相如何被承擔與留下"],
      ["escape", "盡快離開舊校舍"],
    ],
    answer: "responsibility",
  },
];

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
  timelinePanel: document.querySelector("#timelinePanel"),
  timelineSlots: document.querySelector("#timelineSlots"),
  timelineCheckBtn: document.querySelector("#timelineCheckBtn"),
  timelineResult: document.querySelector("#timelineResult"),
  readingPanel: document.querySelector("#readingPanel"),
  readingQuestions: document.querySelector("#readingQuestions"),
  readingCheckBtn: document.querySelector("#readingCheckBtn"),
  readingResult: document.querySelector("#readingResult"),
  choicePanel: document.querySelector("#choicePanel"),
  objectiveStep: document.querySelector("#objectiveStep"),
  objectiveText: document.querySelector("#objectiveText"),
  caseLog: document.querySelector("#caseLog"),
  hintBtn: document.querySelector("#hintBtn"),
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
  else if (state.mode === "finalIntro") enterReadingMode();
}

function enterInvestigationIntro() {
  state.mode = "investigationIntro";
  state.dialogueIndex = 0;
  addLog("CH1 完成：廣播點到不存在於班級名單上的「陳祐安」。");
  el.chapterLabel.textContent = "CH2 初次調查";
  el.caseStatus.textContent = "搜查校園";
  el.modeBadge.textContent = "閱讀";
  setDialogue(dialogues.investigationIntro[0]);
}

function enterExploreMode() {
  state.mode = "explore";
  addLog("CH2 開始：需要在校園中找出四項證物。");
  el.modeBadge.textContent = "探索";
  el.nextBtn.classList.add("hidden");
  el.investigateBtn.classList.remove("hidden");
  el.speakerName.textContent = "調查筆記";
  el.avatarInitial.textContent = "查";
  typeText("選擇右側地點進行探索。每個地點都能重複調查，多數地點藏有不只一項證物。每個線索都在回答同一個問題：誰把陳祐安從班上抹掉？");
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

  const clue = getNextClue(location);
  if (clue) {
    state.evidence.add(clue);
    addLog(`取得證物：${evidenceData[clue].name}。`);
    el.caseStatus.textContent = `取得證物：${evidenceData[clue].name}`;
    showEvidence(clue);
  } else if (location.clues?.length) {
    el.caseStatus.textContent = "此處已搜索完畢";
  } else {
    el.caseStatus.textContent = "空白點名紙";
  }

  renderAll();
  checkAllEvidence();
}

function getNextClue(location) {
  return (location.clues || []).find((id) => !state.evidence.has(id));
}

function locationCluesComplete(location) {
  return (location.clues || []).length > 0 && location.clues.every((id) => state.evidence.has(id));
}

function updateScene(location) {
  el.sceneImage.className = `scene-image ${location.scene}`;
  el.locationTitle.textContent = location.name;
}

function renderLocations() {
  el.locationGrid.innerHTML = "";
  locations.forEach((location) => {
    const found = locationCluesComplete(location);
    const count = (location.clues || []).filter((id) => state.evidence.has(id)).length;
    const total = (location.clues || []).length;
    const button = document.createElement("button");
    button.className = `location-card ${found ? "found" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <strong class="text-cyan-100">${location.name}</strong>
        <span class="text-xs ${found ? "text-emerald-300" : "text-slate-500"}">${total ? `${count}/${total}` : "調查"}</span>
      </div>
      <p class="mt-1 text-sm text-slate-400">${found ? "本區線索已整理" : "可能藏有證物，建議重複調查"}</p>
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
    addLog("十二項證物已集齊，可以進入推理反駁。");
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
  addLog("反駁階段開始：用證物逐一擊破矛盾證詞。");
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
    addLog(`突破證詞：${testimony.speaker}。`);
    el.deductionResult.textContent = testimony.success;
    el.caseStatus.textContent = `突破 ${state.solvedContradictions.size} / ${testimonies.length}`;
    renderTestimonies();
    if (state.solvedContradictions.size === testimonies.length) finishChapterTwo();
  } else {
    el.deductionResult.textContent = "這項證物還不能直接推翻該證詞。先找證詞裡最絕對、最怕被檢查的那一句。";
  }
}

function finishChapterTwo() {
  state.mode = "timeline";
  addLog("CH2 完成：真相指向霸凌與集體沉默。");
  el.chapterLabel.textContent = "CH3 時間線重建";
  el.modeBadge.textContent = "排序";
  el.nextBtn.classList.add("hidden");
  el.deductionPanel.classList.add("hidden");
  el.timelinePanel.classList.remove("hidden");
  el.speakerName.textContent = "林澄";
  el.avatarInitial.textContent = "澄";
  el.caseStatus.textContent = "重建時間線";
  updateScene(locations.find((item) => item.id === "broadcastRoom"));
  typeText("證詞已經被突破，但真相還需要順序。請把失蹤當天到三年後的事件排成完整時間線。");
  renderTimeline();
}

function renderTimeline() {
  el.timelineSlots.innerHTML = "";
  timelineAnswer.forEach((_, index) => {
    const row = document.createElement("div");
    row.className = "timeline-row";
    const options = ['<option value="">選擇事件</option>']
      .concat(timelineEvents.map((event) => `<option value="${event.id}">${event.text}</option>`))
      .join("");
    row.innerHTML = `
      <label>第 ${index + 1} 步</label>
      <select class="timeline-select" data-index="${index}">${options}</select>
    `;
    el.timelineSlots.appendChild(row);
  });
}

function checkTimeline() {
  const selected = [...document.querySelectorAll(".timeline-select")].map((select) => select.value);
  const hasBlank = selected.some((value) => !value);
  const hasDuplicate = new Set(selected).size !== selected.length;

  if (hasBlank) {
    el.timelineResult.textContent = "還有空格沒有選。先把六個事件都放進時間線。";
    return;
  }

  if (hasDuplicate) {
    el.timelineResult.textContent = "同一個事件不能重複使用。請重新檢查。";
    return;
  }

  const correct = timelineAnswer.every((id, index) => selected[index] === id);
  if (!correct) {
    el.timelineResult.textContent = "順序還不對。提示：先看保健室紀錄，再看日記，最後才是三年後的傳聞。";
    return;
  }

  state.timelineSolved = true;
  state.mode = "finalIntro";
  state.dialogueIndex = 0;
  addLog("時間線重建完成：傳聞是被人為加工後留下的版本。");
  el.timelinePanel.classList.add("hidden");
  el.nextBtn.classList.remove("hidden");
  el.chapterLabel.textContent = "CH4 記憶的點名";
  el.modeBadge.textContent = "終章";
  el.caseStatus.textContent = "時間線完成";
  setDialogue(dialogues.finalIntro[0]);
  renderAll();
}

function renderReadingQuestions() {
  el.readingQuestions.innerHTML = "";
  readingQuestions.forEach((item, index) => {
    const block = document.createElement("div");
    block.className = "reading-question";
    const options = item.options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
    block.innerHTML = `
      <label>${index + 1}. ${item.question}</label>
      <select class="reading-select" data-id="${item.id}">
        <option value="">選擇判斷</option>
        ${options}
      </select>
    `;
    el.readingQuestions.appendChild(block);
  });
}

function enterReadingMode() {
  state.mode = "reading";
  addLog("進入閱讀理解審問：判斷故事主題與證據關係。");
  el.nextBtn.classList.add("hidden");
  el.readingPanel.classList.remove("hidden");
  el.caseStatus.textContent = "閱讀理解";
  el.modeBadge.textContent = "審問";
  el.speakerName.textContent = "系統";
  el.avatarInitial.textContent = "讀";
  typeText("最後一關，請回答四個閱讀理解問題。這會確認你不是只收集物品，而是真的讀懂了矛盾。");
  renderReadingQuestions();
  renderAll();
}

function checkReading() {
  const answers = [...document.querySelectorAll(".reading-select")];
  if (answers.some((select) => !select.value)) {
    el.readingResult.textContent = "還有題目沒有回答。";
    return;
  }

  const wrong = answers.filter((select) => {
    const question = readingQuestions.find((item) => item.id === select.dataset.id);
    return question.answer !== select.value;
  });

  if (wrong.length) {
    el.readingResult.textContent = `還有 ${wrong.length} 題判斷不穩。回到證物欄，想想「誰在逃避責任」。`;
    return;
  }

  state.readingSolved = true;
  el.readingPanel.classList.add("hidden");
  addLog("閱讀理解審問完成：玩家確認主題是集體沉默與責任。");
  enterChoiceMode();
}

function enterChoiceMode() {
  state.mode = "choice";
  addLog("CH3 開始：選擇真相要如何被留下。");
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
  addLog(`達成${ending.title}。`);
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
    timelineSolved: state.timelineSolved,
    readingSolved: state.readingSolved,
    caseLog: state.caseLog,
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
    state.timelineSolved = Boolean(data.timelineSolved);
    state.readingSolved = Boolean(data.readingSolved);
    state.caseLog = data.caseLog || ["讀取存檔：案件紀錄恢復。"];
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
  } else if (state.mode === "timeline") {
    state.mode = "timeline";
    el.timelinePanel.classList.remove("hidden");
    renderTimeline();
    renderAll();
  } else if (state.mode === "reading") {
    enterReadingMode();
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
  el.timelinePanel.classList.add("hidden");
  el.readingPanel.classList.add("hidden");
  el.choicePanel.classList.add("hidden");
}

function renderAll() {
  renderLocations();
  renderEvidence();
  renderObjective();
  renderCaseLog();
  if (state.mode === "deduction") renderTestimonies();
}

function addLog(message) {
  if (!state.caseLog.includes(message)) state.caseLog.push(message);
  renderCaseLog();
}

function renderCaseLog() {
  if (!el.caseLog) return;
  el.caseLog.innerHTML = "";
  state.caseLog.slice(-8).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    el.caseLog.appendChild(li);
  });
}

function renderObjective() {
  if (!el.objectiveText || !el.objectiveStep) return;

  const solved = state.solvedContradictions.size;
  const objectives = {
    dialogue: ["01", "閱讀開場對話，確認廣播多出的名字。"],
    investigationIntro: ["02", "進入 CH2，準備探索校園中的五個地點。"],
    explore: ["03", `收集十二項證物。目前已取得 ${state.evidence.size} / ${Object.keys(evidenceData).length}。`],
    rebuttalIntro: ["04", "整理證物，準備用物證反駁矛盾證詞。"],
    deduction: ["05", `選擇證詞並提出正確證物。目前已突破 ${solved} / ${testimonies.length}。`],
    timeline: ["06", "依照證物重建六步時間線。"],
    finalIntro: ["07", "閱讀終章對話，思考真相該如何被留下。"],
    reading: ["08", "回答閱讀理解審問，確認你讀懂核心矛盾。"],
    choice: ["09", "選擇一種處理真相的方式，達成結局。"],
    ending: ["END", "遊戲完成。可重置後嘗試其他結局。"],
  };

  const [step, text] = objectives[state.mode] || objectives.dialogue;
  el.objectiveStep.textContent = step;
  el.objectiveText.textContent = text;
}

function showHint() {
  const hints = {
    dialogue: "提示：注意廣播多出的第 27 號，這是整個案件的核心矛盾。",
    investigationIntro: "提示：下一步不是猜鬼，而是去找能證明「他曾經存在」的紀錄。",
    explore: "提示：每個有證物的地點都會標示「可能藏有證物」。教室、圖書館、保健室、舊校舍都要查。",
    rebuttalIntro: "提示：反駁時先看證詞最絕對的句子，例如「從來沒有」、「沒有人」。",
    deduction: "提示：點名簿反駁班長，照片反駁廣播社，監視器反駁值日紀錄，日記反駁匿名留言。",
    timeline: "提示：時間線從保健室求助開始，接著是日記預告、置物櫃事件、廣播稿被改、紀錄被塗改，最後才變成三年後傳聞。",
    finalIntro: "提示：最後的問題不是誰對誰錯，而是真相要用什麼方式被承擔。",
    reading: "提示：閱讀題都圍繞同一件事：不是鬼，而是集體沉默與人為改寫。",
    choice: "提示：三個結局都能完成遊戲，但它們代表不同的責任與代價。",
    ending: "提示：可以按重置重玩，選擇不同結局比較主題差異。",
  };
  el.caseStatus.textContent = "提示已顯示";
  el.speakerName.textContent = "提示";
  el.avatarInitial.textContent = "？";
  typeText(hints[state.mode] || hints.dialogue);
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
  state.timelineSolved = false;
  state.readingSolved = false;
  state.caseLog = ["案件開始：放學後的廣播開始點名。"];

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
el.timelineCheckBtn.addEventListener("click", checkTimeline);
el.readingCheckBtn.addEventListener("click", checkReading);
el.audioToggle.addEventListener("click", toggleAudio);
el.hintBtn.addEventListener("click", showHint);
el.saveBtn.addEventListener("click", saveGame);
el.loadBtn.addEventListener("click", loadGame);
el.resetBtn.addEventListener("click", resetGame);
document.querySelectorAll("[data-ending]").forEach((button) => {
  button.addEventListener("click", () => chooseEnding(button.dataset.ending));
});

resetGame();
