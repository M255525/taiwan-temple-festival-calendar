# CLAUDE.md — taiwan-temple-festival-calendar（台灣廟會節慶月曆）

台灣地圖系列（賞花、露營、步道、觀星）的姊妹專案，2026-11-15 建立（使用者從「還有那些軟體的方向」清單挑了「台灣廟會節慶月曆」）。3D 台灣（地形沿用賞鳥地圖），**時間軸是全年日期（2025～2029）**：拖動日期看哪裡正在遶境、放炮、放天燈、放水燈。21 個廟會依農曆換算國曆，附分日節目、2025～2029 各年日期、參加須知、資料來源、.ics、分享連結。畫面是**廟埕夜色**（黃昏天空、宣紙金箔地面、黑漆金字廟匾標題、紅紙籤詩面板、燈籠牌標籤、擲筊載入動畫；不是花布、木牌、水彩或星圖）。**不放照片**。無框架、無建置。

## 農曆（重要）
- **不用瀏覽器內建 `Intl` chinese 曆法**：它把 2027 春節算成 2/7（官方 2/6，朔在台灣時間 23:56），會差一天。
- `data.js` 的 `FC.LUNAR`＝香港天文台「公曆與農曆日期對照表」（`https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T{年}c.txt`，UTF-8 BOM）整理的每個農曆月首（`YYYYMMDD[L]月`，L＝閏月；2024-12-31 起到 2029-12-05），`FC.TERMS` 節氣。要延長年份：下載新年份 txt、解析「XX月」那幾行補進去，並改 `FC.YMAX`。
- 日期一律用日序 `n`（UTC 1970 起的天數）：`FC.lunarOf(n)`、`FC.solar(ly,m,d)`（d=-1＝那個月最後一天，不取閏月）、`FC.occ(f,Y)`（→ `{st, s, e, subs, note, next, trad, where}`）、`FC.activeOn(n)`、`FC.nextOf(f,n)`、`FC.holyOn(n)`。
- 狀態：`fixed` 農曆固定、`year` 已公告（`solar:{年:[起,迄]}`）、`approx` 日期待公告（`approx` 大約範圍，或連範圍都沒有時 `s=null`）、`pause` 今年停辦（`pause:{年:說明}`）、`off` 今年沒有（`cycle:{base,every}`，東港迎王／西港刈香丑辰未戌年）。學甲上白礁 `sat:true`＝農曆三月十一日之前的週六（2025 起），`trad` 是傳統日期。台灣燈會 `where:{年:{city,at}}` 每年換縣市，場景換年份時會搬位置。

## 資料
- `FC.FESTS` 21 個（2026-11 網搜查證，每個都有 `src` 連結）：大甲媽（2026 4/17–4/26）、白沙屯（2026 4/12–4/20）、北港迎媽祖（3/19–20）、大龍峒保生文化祭（3/14–15）、學甲上白礁、霞海城隍（5/11–13）、艋舺青山王祭（10/20–23）、雞籠中元祭（7/1–8/1，7/14 放水燈）、恆春搶孤（7/15）、頭城搶孤（七月最後一天，2026 停辦搶孤賽）、民雄大士爺（7/21–23）、新埔義民祭（7/20）、鹽水蜂炮（1/14–15）、炸寒單、平溪天燈、苗栗火旁龍（1/15–17）、台灣燈會（2026 嘉義 3/3–3/15、2027 苗栗待公告）、東港迎王與西港刈香（三年一科，2027）、開隆宮做十六歲（7/7）、內門宋江陣（約二月，待公告）。**二龍村龍舟、澎湖乞龜查不到可靠資料，沒收**。
- `FC.HOLY` 全台民俗節日（常見說法）、`ETIQUETTE`、`GLOSSARY`、`PEAKS`、`ISLANDS`（從步道地圖複製）。文字全部自寫。
- 改資料後重產手冊：`node tools/build_manual.js . tools/manual_tpl.html`（**manual.html 是產出檔**，含 21×5 年日期總表與來源）。

## 程式
- **`scene.js` 是產出檔**：改 `tools/scene_tpl.js` 後跑 `python tools/build_scene.py ../taiwan-flower-map/scene.js`（組入賞花地圖的幾何地形、標籤、排列、雲、鏡頭、點選段落；`TF` 指向 `FC`）。
- 每個廟會一座小廟（縮放 `K=1.5`；2.2 會讓台北／基隆一帶的廟互相重疊）；舉辦中：廟埕光暈（shader `uF[NF]`）、燈籠圈、類型景物（`festFx`：mazu 神轎沿 `route` 往返＋人群、parade 神轎繞廟、fire 火花／`fx:'dragon'` 炸龍、sky 天燈、lights 大燈、ghost `fx:'water'|'pole'|'table'`、wang 王船（最後一天燒王船）、rite 香煙）。進香路線點只在舉辦中或選中時顯示，是示意。
- `app.js`：日期軸是 canvas（`drawAxis`：長條＝當天在辦數、淡黃＝待公告範圍、上方金字＝農曆月份、金線＝今天）；分享 `#d=YYYY-MM-DD&f=id`；`.ics` 全天事件＋三天前提醒。測試 hook `window.__fest`（`state/setDay/selectFest/selectRegion/shiftYear/buildIcs/shareUrl/FC/scene`）；`FestScene.stats()` 有 `state`（每個廟會 live/soon/later/maybe/tbd/pause）。

## 配套
- ✅ 跑馬燈（`taiwanFestMarquee`）、manual（含完整創作者）、使用警語（底部＋首訪自動跳，`taiwanFestSeenWarning`）、⚙常用設定收合式（`taiwanFestSettings`；展開 `taiwanFestSetOpen`）、偏好 `taiwanFestPrefs`、PWA（`tools/make_icons.py` 畫燈籠；改 js 記得 `CACHE_NAME` +1）、訪客計數器 `page_id=m255525.taiwantemplefestival`、RWD（375px 無橫向捲動）。
- ❌ 序號授權
- GitHub Pages（**2026-11-15 已上線**）：`master`＋`.github/workflows/deploy-pages.yml`，https://m255525.github.io/taiwan-temple-festival-calendar/ （repo 由使用者自己 `gh repo create`，Pages 由 Claude 用 `gh api` 開啟，push 觸發的部署直接成功）。程式牆在 `REPO_META`，github-dashboard 已補。

## Port／測試
- port **8886**（`.claude/launch.json` 的 `taiwan-temple-festival-calendar`）。
- `python tools/e2e_fest.py <截圖資料夾>`（先開 8886；`FEST_BASE` 可測線上版）：首訪警語、21 座廟、4/18 大甲＋白沙屯在辦、農曆顯示、大甲 2026 已公告、雞籠中元祭 8/26 放水燈、2027 元宵四個同時在辦、東港 2027 大約／2026 沒有、學甲傳統日期、.ics、分享網址還原、日期軸點選、換年、須知與設定、375px。2026-11-15 本機全過、無 console 錯誤；上線後設 `FEST_BASE` 對線上版再跑一輪全過（線上載入較慢，`goto` 用 `wait_until='domcontentloaded'`）。
- 驗證過的換算：2027-02-06＝正月初一、2027-02-20＝元宵、2026-04-17＝三月初一、2026-08-26＝七月十四、2026-11-28＝十月二十、2025-07-25＝閏六月初一；恆春搶孤 2026 8/27、2027 8/16，北港 2026 5/5–6，鹽水 2027 2/19–20 都與公開資料一致。
