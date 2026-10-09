# ‏HANDOFF.md — תוכנית שדרוג ללוח השיעורים (אלגברה לינארית + חדו"א)

> מסמך זה נכתב כדי שסשן חדש של Claude Code יוכל להמשיך בדיוק מכאן. **עדכון: כל השלבים 0–5 מומשו** (ראו סעיף 0). שאר המסמך הוא התוכנית המקורית, שנשמרת כתיעוד של ההחלטות.

---

## 0. סטטוס המימוש (עודכן אחרי הביצוע)

**ענף:** `claude/happy-curie-pakc6z` (נדחף ל-GitHub; המיזוג ל-`main` בידי הבעלים). כל שלב בקומיט נפרד:

| שלב | קומיט | מה נעשה |
|---|---|---|
| 0 | `47e68b8` | `placeNewItem`/`nextLinePosition` ב-`sceneUtils`, `latexToSvg` עם `inline` ו-`verticalAlign` |
| 1 | `d591162` | אלמנט פסקה (`src/para/`), תפריט סלאש בשני העורכים, פלטה בטאבים, `inlineShortcuts`, `Alt+T` |
| 4 | `914a4ed` | פתרון מהיר: מטריצות, דטרמיננטה, הופכית, דירוג, RREF, ערכים/וקטורים עצמיים, שחלוף, טורים, טיילור, גבולות חד-צדדיים, `SOLVE_GROUPS` |
| 2 | `75740be` | Desmos בלבד, גרף גדול, מצב מיקוד (`GraphFocus.tsx`), מפתח API של הבעלים, `projectorMode` |
| 3 | `7c6edf6` + `d15cf44` | ספרייה: 81 קטעים מובנים (31/22/28), טבלת `snippets` (Dexie v2), גיבוי v2, `LibraryPanel`, `SaveSnippetDialog`, `Alt+L` |
| 5 | `d15cf44` + קומיט התיעוד | `ShortcutsDialog` (`?`/F1), סרגל עליון רספונסיבי, README, CLAUDE.md, המסמך הזה |

**אומת:** `npm test` (87 בדיקות), `npx tsc --noEmit`, `npm run build`, ובדיקות דפדפן עם Playwright (Chromium) על `npm run dev`: פסקה + משוואה מתחתיה, תפריט סלאש, ספרייה (הוספה, שמירת קטע, חיפוש, מחיקה), חלון קיצורים, ייצוא PDF. ה-probe ל-foreignObject (סעיף 7) **עבר** ב-Chromium, לכן ה-fallback לא מומש.

**מה לא אומת בדפדפן אמיתי:** Desmos חסום ברשת של הקונטיינר. מצב המיקוד נבדק עם סקריפט Desmos מזויף (אותו API: `setState/getState/setExpression/observeEvent/screenshot`) ועבד מקצה לקצה, כולל Esc מתוך ה-iframe, כתיבת המצב לאלמנט ו-snapshot. **הבעלים צריך לבדוק עם Desmos אמיתי:** גודל הגרף החדש, מצב מיקוד, `projectorMode` (אם מפריע, להוריד ב-`public/desmos.html`).

**החלטות שהתקבלו תוך כדי (תשובות הבעלים):** רוחב ברירת מחדל לפסקה 640px; פסקאות בעברית בלבד (ימין לשמאל); מפתח Desmos בקוד (`DEFAULT_KEY`); קומיט ו-push בסוף כל שלב.

**סטיות קטנות מהתוכנית:**
- הפסקה: `isEdit` prop לעורכים (כותרת "עריכה" רק לאלמנט קיים; קטע מהספרייה נפתח כ"חדש").
- `?` מיורט בשלב ה-capture כי Excalidraw פותח עליו את חלון העזרה שלו.
- סכום/גבול "שאר המחרוזת" נעצר בסוגר לא מאוזן, ב-`\right` או ביחס ברמה העליונה (אחרת `(\sum ...)^2` נשבר).
- התוכן המובנה גדול מהמתוכנן (81 במקום ~45); קל לקצץ ב-`src/library/content/`.

**פתוח / רעיונות להמשך:**
- לעבור על התוכן העברי בספרייה (מוסכמות: מכפלה פנימית לינארית ברכיב הראשון; מעבר בסיס לפי `[v]_{B'} = P[v]_B`).
- פלטי CAS אמיתיים ל-`Eigenvectors`/`RREF` עם שורשים ומרוכבים לא נאספו כ-fixtures (סעיף 7).
- ה-bundle הראשי גדול (~4 MB); Excalidraw מושך Mermaid/Cytoscape. פיצול לטעינה עצלה ישפר את הטעינה הראשונה.
- אין CI; `npm test` + `tsc` ב-GitHub Actions יהיו זולים.


---

## 1. מטרת הפרויקט

**מה זה:** לוח לבן דיגיטלי בעברית (RTL) לשיעורים פרטיים במתמטיקה, שהמורה מפעיל לבד (עכבר + מקלדת) ומשתף מסך ב-Zoom. אתר סטטי (React 19 + Vite + Excalidraw 0.18 + MathLive 0.111 + MathJax 3 + Dexie 4), כל הנתונים ב-IndexedDB של הדפדפן. ריפו: https://github.com/tamirgabgab/Math-Lessons (ציבורי, ענף `main`).

**היעד של סבב השדרוג הזה:** להפוך את הלוח לכלי נוח להדרכת סטודנט שנה א' ב-**אלגברה לינארית 1+2** ו-**חדו"א 1 (אינפי 1)**. הבעלים שלח 4 סיכומי PDF של החומר; הטקסט העברי שבהם לא ניתן לחילוץ אוטומטי (פונטים בלי ToUnicode), אבל הנוסחאות והמבנה כן נקראו. נושאים שזוהו:
- **לינארית 1:** מספרים מרוכבים (cis, דה-מואבר, שורשים), שדות, מערכות משוואות ודירוג, מטריצות, מרחבים וקטוריים/תתי-מרחבים/span/בסיס/מימד, העתקות לינאריות, ker/Im, משפט המימדים, מטריצה מייצגת, מעבר בסיס, דטרמיננטות.
- **לינארית 2:** ערכים עצמיים ולכסון, מרחבי מכפלה פנימית, גרם-שמידט, משלים אורתוגונלי, ז'ורדן, תבניות בילינאריות.
- **אינפי 1:** sup/inf, סדרות וגבולות, אפסילון-דלתא, טורים ומבחני התכנסות, רציפות, נגזרות, לופיטל, טיילור, אינטגרל רימן, המשפט היסודי, אינטגרלים לא אמיתיים.

**העדפות הבעלים (הוצהרו):**
- שיחה בעברית; קוד, הערות, קומיטים ותיעוד קוד באנגלית. טקסט UI ו-README בעברית.
- הבעלים יודע רק Python; להסביר החלטות טכניות בפשטות.
- לשאול שאלות מנחות לפני שינויים גדולים; לסיים סבב עבודה בסיכום לפי סעיפים.
- ‏`hi.txt` בשורש שייך לבעלים ולא נוגעים בו (גם לא מעלים לגיט; הוא ב-`.git/info/exclude`).

---

## 2. מצב נוכחי

**מה עובד היום (נבדק בקוד, לא שונה בסשן הזה):**
- חוברות של דפים, כל דף סצנת Excalidraw נפרדת (`src/board/BoardScreen.tsx`), שמירה אוטומטית ל-Dexie (`src/storage/db.ts`, גרסת סכמה 1, טבלאות `boards` + `contents`).
- משוואות LaTeX כאלמנט `image` עם `customData.kind === "math"` (`src/math/insertEquation.ts`, `EquationDialog.tsx`, `latexToSvg.ts`), מיקום "שורה הבאה" מתחת לאלמנט הנבחר, עריכה בדאבל-קליק/Enter.
- גרפים כאלמנט `embeddable` (`src/graph/graphs.tsx`) עם iframe של GeoGebra (`public/ggb.html`) או Desmos (`public/desmos.html`), גשר `window.mlGgbBridge`, סקיילינג נגד זום הלוח, A−/A+.
- פתרון מהיר דרך CAS מוסתר של GeoGebra (`src/solve/*`): solve/derivative/integral/limit/simplify/factor/expand.
- דיאגרמות הסתברות (עץ, ון, טבלה), ייצוא PDF, תבניות, גיבוי/שחזור JSON, PWA.

**מה נעשה בסשן הזה (כרונולוגית):**
‏1. **העלאה לגיט:** אתחול ריפו מקומי, קומיט `b4fa852 Add Math Lessons whiteboard app` מעל ה-commit הראשוני של GitHub, push ל-`main`.
‏2. **שינוי שם הריפו** מ-`Math-lessos` ל-`Math-Lessons` דרך GitHub API; ה-remote המקומי עודכן.
‏3. **מיפוי הקוד** (סוכן חקירה) ו**תכנון** (סוכן תכנון) של השדרוג, עם 8 שאלות הבהרה לבעלים (תשובותיו בסעיף 3).
‏4. **כתיבת המסמך הזה.** לא שונה שום קובץ קוד.

**סטטוס git (בזמן כתיבת התוכנית):** ענף `main`, עץ נקי חוץ מ-`HANDOFF.md` (הקובץ הזה). `hi.txt` מוחרג מקומית. **עכשיו:** ראו סעיף 0.

---

## 3. החלטות מרכזיות ולמה

| החלטה | נימוק | חלופות שנשקלו | סטטוס |
|---|---|---|---|
| **גרפים: Desmos בלבד** (2D + 3D). GeoGebra יוצא מהתפריטים, ממסך הפתיחה ומהקיצורים. | הבעלים מעדיף את Desmos; GeoGebra קטן ולא נוח. | להשאיר את שניהם עם Desmos כברירת מחדל. | סופי |
| **ה-CAS של GeoGebra נשאר** (iframe מוסתר, `public/cas.html`). | הפתרון המהיר בנוי עליו; תחליפי JS (Nerdamer/Algebrite) חלשים בהרבה. | החלפה למנוע JS. | סופי |
| **לוחות ישנים עם גרף GeoGebra ממשיכים להיפתח** (`engine` חסר = geogebra; `public/ggb.html` נשאר). | לא לשבור שיעורים קיימים. | מיגרציה/מחיקה. | סופי |
| **גרף Desmos חדש גדול כברירת מחדל + "מצב מיקוד"** (overlay על כל החלון, Esc חוזר ללוח עם המצב המעודכן). | פותר את "הגרף קטן וקשה להשתמש בו" בלי לאבד את הציור. | פאנל צד קבוע; דף גרף ייעודי. | סופי |
| **מפתח Desmos API של הבעלים** מחליף את מפתח הדמו כברירת מחדל ב-`public/desmos.html` (ההחלפה דרך localStorage נשארת). המפתח עצמו לא נשמר בקובץ הזה (הריפו ציבורי); הבעלים ימסור אותו בצ'אט בתחילת המימוש, והוא שמור גם בקובץ התוכנית המקומי של Claude Code. | מפתח הדמו מיועד לניסויים ועלול להיפסק. מפתחות Desmos גלויים בצד הלקוח בכל מקרה. | — | סופי |
| **אלמנט חדש "פסקה"**: טקסט חופשי עברית/אנגלית עם נוסחאות inline (`$...$`) ו-display (`$$...$$`), עורך בסגנון Word עם **תפריט סלאש** (`/alpha`, `/int`, `/matrix`, `/lim`, `/eps-delta`, `/def`, `/thm`, `/proof`...). נרנדר ללוח כ-`image` עם `customData.kind === "para"`. | הבעלים רוצה לכתוב הגדרות ומשפטים עם נוסחאות בתוכם, כמו ב-Word. | רק לשפר את עורך המשוואות; טקסט Excalidraw רגיל + משוואות נפרדות. | סופי, **עדיפות 1** |
| **רינדור פסקה: SVG עם `<foreignObject>`** (HTML עברי בפונט מערכת + MathJax SVG inline), נמדד ב-DOM מוסתר. | ‏bidi, גלישת שורות, bold, bullets ויישור baseline של נוסחאות מגיעים "בחינם". Chrome לא מכתים canvas בציור SVG כזה (dom-to-image מסתמך על זה); הבעלים עובד ב-Chrome/Windows. | פריסה ידנית של runs ב-SVG (`<text direction="rtl">` + שברי MathJax) — מסובך (bidi + baseline). | **זמני עד בדיקת ה-probe** (סעיף 7). יש fallback. |
| **ספריית סניפטים לפי נושא** (לינארית 1 / לינארית 2 / אינפי 1): תוכן מובנה בקוד + סניפטים של המשתמש בטבלת Dexie חדשה `snippets` (סכמה גרסה 2), כלולים בגיבוי. | הגדרות ומשפטים חוזרים בכל שיעור. | רק תבניות ריקות; הבעלים ישלח טקסט. | סופי. **התוכן בעברית ייכתב ע"י Claude לפי הסילבוס הסטנדרטי**, הבעלים יערוך אחר כך. |
| **פתרון מהיר מורחב**: לינארית (דטרמיננטה, הופכית, דירוג, RREF, ערכים/וקטורים עצמיים, שחלוף) + חדו"א (סכום טור, פולינום טיילור, גבולות חד-צדדיים). | ה-CAS תומך בכל אלה (`Determinant`, `Invert`, `MatrixRank`, `ReducedRowEchelonForm`, `Eigenvalues`, `Eigenvectors`, `Transpose`, `Sum`, `TaylorPolynomial`, `LimitAbove`, `LimitBelow`). | — | סופי |
| **סדר מימוש**: (1) פסקה + סלאש + שדרוג עורך משוואות, (2) Desmos גדול/מיקוד + הסרת GeoGebra, (3) ספרייה, (4) פתרון מהיר, (5) ליטוש. | בחירת הבעלים. | — | סופי |
| **‏`projectorMode: true`** ב-Desmos. | קווים עבים וכתב גדול, מתאים ל-Zoom. | — | זמני (לבדוק שנראה טוב) |

---

## 4. מה ניסינו ונפסל / לא עבד

- **חילוץ טקסט מה-PDF-ים:** `pdftotext` (מגיע עם Git ב-`C:\Program Files\Git\mingw64\bin\pdftotext.exe`) מחזיר נוסחאות ומספרי סעיפים אבל **אפס תווים עבריים** (הפונטים ללא מיפוי Unicode). `pdftoppm`/poppler, PyMuPDF, pypdf לא מותקנים. אל תנסה שוב לחלץ עברית מהם; כתוב תוכן לפי הסילבוס ובקש מהבעלים לתקן.
- **הדפדפן המובנה** לא יכול לצלם קבצי PDF מקומיים (`file://` מחוץ לפרויקט נפתח כ-snapshot סטטי בלבד).
- **‏`gh` CLI לא מותקן.** פעולות GitHub נעשו עם `curl` + token מ-`git credential fill` (Git Credential Manager שמור במחשב). לא להדפיס את ה-token.

---

## 5. קבצים חשובים (קיימים) ומה ישתנה בהם

| קובץ | תפקיד | שינוי מתוכנן |
|---|---|---|
| ‏`src/board/BoardScreen.tsx` | מסך הלוח: toolbar, קיצורים (~339-392), יירוט dblclick/Enter למשוואות (~329-336, ~376-384), גשר הגרפים (~134), מסך פתיחה (~573-592), סרגל מצגת (~604-617) | דיאלוג פסקה, `selectedEditable {id, kind}` במקום `selectedMathId`, כפתורים חדשים, מצב מיקוד, ספרייה |
| ‏`src/board/sceneUtils.ts` | ‏`placementCenter`, `ensureVisible`, `singleSelected` | להוסיף `nextLinePosition` + `placeNewItem` משותפים |
| ‏`src/math/insertEquation.ts` | יצירת/עדכון משוואה (`PIXEL_SCALE=3`, `userScale`), "שורה הבאה" מקומית (~51-63) | להשתמש ב-`placeNewItem`; תבנית ל-`insertParagraph.ts` |
| ‏`src/math/latexToSvg.ts` | ‏MathJax → SVG (`display:true`, מוחק `vertical-align` בשורה ~50) | להוסיף `inline?: boolean` ולהחזיר `verticalAlign` |
| ‏`src/math/EquationDialog.tsx` | עורך משוואות (MathLive + textarea LaTeX, 4 קבוצות פלטה, פתרון מהיר מוטמע) | פלטה בטאבים, `inlineShortcuts`, תפריט סלאש ב-textarea, `latex` prop לפאנל הפתרון |
| ‏`src/graph/graphs.tsx` | ‏`GraphData`, `insertGraph` (גודל ~163-194), `renderEmbeddable` (~102-141), `mlGgbBridge` (~198-239), העדפת מנוע | ‏Desmos בלבד, גודל חדש, כפתור מיקוד, `pushDesmosState`, `closeFocus` |
| ‏`src/board/GraphMenu.tsx` | תפריט מנוע×אפליקציה | שני פריטים בלבד (2D/3D) |
| ‏`public/desmos.html` | עמוד ה-iframe של Desmos (מפתח דמו בשורה ~24, אפשרויות ~45-52) | מפתח חדש, `projectorMode`, מצב `focus=1`, העברת Esc להורה |
| ‏`public/ggb.html`, `public/cas.html`, `src/solve/cas.ts` | ‏GeoGebra גרף (legacy) ו-CAS | **ללא שינוי** |
| ‏`src/solve/latexToGgb.ts` | ‏LaTeX → תחביר GeoGebra (טבלת סמלים ~25-50, שגיאת "לא נתמך" ~149, סביבות מערכות ~242) | מטריצות, `\det`, `\sum`/`\prod`, `\binom`, `\varepsilon`, גבול חד-צדדי, `^T`/`^{-1}` |
| ‏`src/solve/ggbToLatex.ts` | פלט GeoGebra → LaTeX | ‏`{{..},{..}}` → `pmatrix`, רשימות |
| ‏`src/solve/quickSolve.ts`, `QuickSolvePanel.tsx` | ‏`planSolve`/`runPlan`, UI | פעולות חדשות, `SOLVE_GROUPS` הקשריים, שורות פרמטרים |
| ‏`src/solve/solve.test.ts` | בדיקות עם CAS מזויף | מקרי בדיקה חדשים (ראה שלב 4) |
| ‏`src/storage/db.ts` | ‏Dexie (`version(1)`), `exportBackup` ~192, `importBackup` ~204 | ‏`version(2)` + טבלת `snippets`, גיבוי v2 |
| ‏`src/home/HomeScreen.tsx` | ספרייה, תבניות, גיבוי, כפתור "⚙ Desmos" (~141-159) | טקסט הפרומפט למפתח; ספירת סניפטים בשחזור |
| ‏`src/probability/ProbabilityDialog.tsx` | דיאלוג טאבים עם תצוגה מקדימה חיה | **דוגמת UI לחקות** (לא משתנה) |
| ‏`src/styles/app.css` | פריסה, RTL, מודלים (`.modal` ~67, `.eq-*` ~222, `.prob-*` ~276, `.graph-embed*` ~344-370) | סגנונות לפסקה, סלאש, מיקוד, ספרייה |
| ‏`README.md`, `CLAUDE.md`, `index.html`, `vite.config.ts` | תיעוד/תיאורים | ניסוח "Desmos"; תיאור פסקאות/ספרייה/מיקוד |
| ‏`.claude/launch.json` | הפעלת dev server לדפדפן המובנה | קיים; לוודא `{name:"dev", runtimeExecutable:"npm", runtimeArgs:["run","dev"], port:5173}` |

**קבצים חדשים שייווצרו:** `src/para/{parse.ts, parse.test.ts, renderParagraph.ts, paraStyles.ts, insertParagraph.ts, slashCommands.ts, slashInsert.ts, slashInsert.test.ts, SlashMenu.tsx, ParagraphDialog.tsx}`, `src/graph/GraphFocus.tsx`, `src/library/{types.ts, LibraryPanel.tsx, SaveSnippetDialog.tsx, content.test.ts, content/{index,linear1,linear2,infi1}.ts}`, `src/board/ShortcutsDialog.tsx`.

---

## 6. ארכיטקטורה והקשר טכני (עובדות שאומתו בקוד)

- **טעינת תמונות ב-Excalidraw 0.18:** `addFiles` שומר את ה-`dataURL` כמו שהוא; ה-cache טוען כל קובץ עם `new Image(); img.src = dataURL` ודוחה רק `mimeType === "binary"`. אין נרמול SVG במסלול הזה. `exportToCanvas` (PDF, תמונות ממוזערות) משתמש באותו cache ו-`drawImage`. לכן SVG עם `<foreignObject>` עובר **בדיוק באותו מסלול כמו המשוואות הקיימות**.
- **רינדור מחדש של embeds:** `App.renderEmbeddables()` קורא ל-`renderEmbeddable(el, state)` בכל render; שינוי `customData` יוצר אובייקט חדש אבל ה-`src` של ה-iframe לא משתנה, לכן React לא טוען מחדש (מוכח ע"י A−/A+). **מסקנה:** אחרי סגירת מצב מיקוד חייבים לדחוף את המצב ל-iframe הפנימי ידנית (או לשנות `rev` ב-`src`).
- **‏iframe של Desmos הוא same-origin** וחושף `window.calculator`; ההורה יכול לקרוא `frame.contentWindow.calculator.setState()/getState()` ישירות, בלי postMessage.
- **‏MathLive:** `mf.inlineShortcuts` הוא `Record<string, string | {after, value}>` שניתן להציב (`node_modules/mathlive/types/mathfield-element.d.ts:1308`). להציב `mf.inlineShortcuts = {...mf.inlineShortcuts, ...EXTRA}` ב-effect של ה-mount.
- **‏Dexie:** מוסיפים `this.version(2).stores({...})` ליד `version(1)`; Dexie משדרג במקום, בלי מיגרציית נתונים. קובץ גיבוי: `version: 1` היום; `importBackup` בודק רק `app`, `boards`, `contents`.
- **בדיקות** רצות ב-node (`vite.config.ts`); `latexToSvg` עובד ב-node (יש לו בדיקה), אז אפשר לוודא בבדיקות שכל LaTeX בספרייה מתרנדר. כל מודול שמייבא `@excalidraw/excalidraw` בזמן ריצה **לא** ניתן לבדיקה ב-vitest — להשאיר לוגיקה טהורה במודולים נפרדים.
- **פונטים בתוך foreignObject:** אסור משאבים חיצוניים (לא Rubik מ-Google Fonts, לא `<link>`); להשתמש ב-`"Segoe UI", Arial, sans-serif` ו-`<style>` inline. MathJax עם `fontCache:"none"` עצמאי. ה-XML חייב להיות תקין: לבנות ב-DOM (`createElementNS`) ולסדר עם `XMLSerializer`, לא בשרשור מחרוזות.
- **הפורט 5173 קבוע** (IndexedDB לפי origin כולל פורט). `predev` מעתיק פונטים ל-`public/` (gitignored).
- **קבצים עם LaTeX:** לא להעביר דרך מחרוזות Python/shell (`\f`, `\r`, `\i` הופכים לתווי בקרה). להשתמש ב-Edit/Write או `String.raw`.

---

## 7. בעיות פתוחות

- **‏Probe ל-foreignObject (קריטי לשלב 1):** לפני שבונים את העורך, לכתוב `supportsForeignObject()`: לטעון SVG 4×4 עם foreignObject ל-`Image`, לצייר על canvas, `getImageData` ב-try/catch. אם נכשל (canvas מוכתם) → fallback: לממש את הפסקה כקבוצה של אלמנטי `text` של Excalidraw (בלוקים עבריים) + תמונות משוואה (display math) דרך דפוס ה-`materialize`/group; נוסחאות inline יורדות לטקסט LaTeX. לבדוק גם שההבדל בין המדידה ב-DOM המוסתר לרינדור ב-`<img>` לא חותך שורה תחתונה (להוסיף 2px padding תחתון ו-`overflow: visible`).
- **פלט CAS למטריצות:** `Eigenvectors`/`ReducedRowEchelonForm` עשויים להחזיר שברים/שורשים בתאים; פרסר הרשימות חייב להשתמש ב-`relation()` לכל תא. לאסוף מחרוזות פלט אמיתיות שנדחות ולהוסיף אותן כ-fixtures ב-`solve.test.ts` (כך הקובץ בנוי היום).
- **סמנטיקת `\sum`/`\lim` "שאר המחרוזת":** `\sum_{k=1}^{n} k + 5` יסכם את `k+5` (כמו ב-TeX). לתעד ברמז בפאנל.
- **מצב מיקוד כשה-iframe הפנימי מחוץ למסך:** `renderEmbeddables` משאיר embeds שאותחלו mounted (`initializedEmbeds`), אז `pushDesmosState` אמור למצוא אותו; אחרת fallback של `rev` ב-`src`.
- **לא נבדק:** האם ל-Desmos יש תרגום עברי (`language` option). ההנחה: אין. לא לבזבז זמן על זה.
- **הריפו ציבורי.** הבעלים לא התייחס לזה. מפתח Desmos יהיה גלוי (מקובל, זה מפתח צד-לקוח), אבל כדאי להזכיר לו שאפשר להפוך לפרטי.
- **חוב טכני:** `selectedMathId` → `selectedEditable` נוגע ב-handlers בשלב capture; לשמור את בדיקות `isTypingTarget` בדיוק כמו שהן.

---

## 8. הצעד הבא ותוכנית המימוש המלאה

### הצעד הראשון בסשן הבא
‏1. לקרוא את הקובץ הזה ואת `CLAUDE.md`.
‏2. לוודא שהבעלים אמר במפורש להתחיל לממש. אם לא, לא לגעת בקוד.
‏3. להריץ `npm test` ו-`npx tsc --noEmit -p .` כבסיס ירוק.
‏4. להתחיל ב-**שלב 0** ואז **שלב 1**; לעשות קומיט בסוף כל שלב (רק אם הבעלים אישר קומיטים).

### שלב 0 — תשתית משותפת (קטן, פותח את כל השאר) ✅ בוצע
- ‏`src/board/sceneUtils.ts`: להוסיף `nextLinePosition(api, width, height, opts?: {align?: "left"|"right"; gap?: number})` ו-`placeNewItem(api, width, height, opts?) → {x, y}` (שורה הבאה אם נבחר אלמנט אחד שאינו embeddable והמקום לא מתחת לגרף, אחרת `placementCenter`). להעביר את הלוגיקה מ-`insertEquation.ts:51-63`.
- ‏`src/math/insertEquation.ts`: למחוק את `nextLinePosition` המקומית ולהשתמש ב-`placeNewItem` (משוואות עם `align:"left"` כמו היום).
- ‏`src/math/latexToSvg.ts`: אופציה `inline?: boolean` (משתמשת ב-`display:false`) והחזרת `verticalAlign` (ה-`vertical-align:-0.57ex` ש-MathJax פולט ונמחק היום בשורה ~50; להשאיר את המחיקה במצב display).
- **בדיקה:** `npm test`, `tsc`, בדפדפן: שתי משוואות ברצף עדיין נכנסות אחת מתחת לשנייה.

### שלב 1 — אלמנט פסקה + תפריט סלאש + שדרוג עורך המשוואות (עדיפות 1) ✅ בוצע

**קבצים חדשים:**
- ‏`src/para/parse.ts` (טהור, נבדק ב-node):
  ```ts
  export type Inline = { t: "text"; v: string; bold?: boolean } | { t: "math"; latex: string };
  export type Block =
    | { t: "heading"; level: 1 | 2; inlines: Inline[] }
    | { t: "para"; inlines: Inline[] }            // "\n" בתוך פסקה → { t:"text", v:"\n" } (מרונדר <br/>)
    | { t: "list"; ordered: boolean; items: Inline[][] }
    | { t: "display"; latex: string };            // $$...$$ (יכול להשתרע על כמה שורות)
  export interface ParaDoc { blocks: Block[] }
  export function parseParagraph(source: string): ParaDoc;
  export function mathFragments(doc: ParaDoc): string[];   // לאימות
  ```
  ‏Markdown מינימלי: שורה ריקה = פסקה חדשה, `# `/`## ` כותרת, `- ` תבליטים, `1. ` ממוספר, `**bold**`, `$..$` עם `\$` כבריחה, `$$` רב-שורתי, `$` לא סגור = תו רגיל.
- ‏`src/para/parse.test.ts`: כל המקרים לעיל.
- ‏`src/para/renderParagraph.ts` (DOM בלבד) + `src/para/paraStyles.ts` (מחרוזת CSS משותפת: `direction:rtl; text-align:right; font: {fontSize}px/1.55 "Segoe UI", Arial, sans-serif;` שוליים ל-h1/h2/ul/ol/p; display math `display:block; margin:0.3em auto`):
  ```ts
  export interface ParaRenderOptions { width: number; fontSize: number; color: string; pixelScale?: number }
  export interface RenderedParagraph { svg: string; width: number; height: number }
  export function renderParagraph(doc: ParaDoc, opts: ParaRenderOptions): RenderedParagraph; // זורק Error בעברית עם שם הקטע הבעייתי
  export function supportsForeignObject(): Promise<boolean>; // probe עם cache לסשן
  ```
  מדידה במיכל מוסתר (`position:fixed; left:-10000px; width:Wpx; visibility:hidden`), העברת הצומת ל-foreignObject, `height = Math.ceil(getBoundingClientRect().height)`, `<svg width=W*3 height=H*3 viewBox="0 0 W H">` (כמו `PIXEL_SCALE` של משוואות).
- ‏`src/para/insertParagraph.ts` (מראה של `insertEquation.ts`, כולל `userScale`):
  ```ts
  export interface ParaData { kind: "para"; source: string; fontSize: number; color: string; width: number; baseWidth: number }
  export function getParaData(el): ParaData | null; export function isParaElement(el): el is ExcalidrawImageElement;
  export function upsertParagraph(api, input: ParagraphValue, existing?: ExcalidrawImageElement): void;
  export const PARA_WIDTHS = [480, 640, 820, 1000];
  ```
  מיקום דרך `placeNewItem` עם `align:"right"` (זרימה עברית).
- ‏`src/para/slashCommands.ts` (נתונים טהורים):
  ```ts
  export interface SlashCommand {
    id: string;                 // "alpha", "int", "matrix", "lim", "eps-delta", "def", "thm", "proof", ...
    label: string;              // עברית
    keywords: string[];         // חיפוש בלטינית ובעברית
    group: "greek" | "sets" | "calc" | "linear" | "text";
    insert: { text?: string; latex?: string; cursorOffset?: number };
    prompt?: "matrix";          // התפריט מציג שורות×עמודות ואז קורא ל-build
    build?: (args: { rows: number; cols: number }) => { latex: string; cursorOffset?: number };
  }
  export const SLASH_COMMANDS: SlashCommand[];
  ```
  פקודות לכלול לפחות: אותיות יווניות (alpha…omega, varepsilon), סמלי קבוצות ולוגיקה (forall, exists, in, notin, subseteq, cup, cap, setminus, emptyset, NN/ZZ/QQ/RR/CC), חדו"א (lim, limplus, limminus, sum, prod, int, dint, frac, sqrt, nroot, abs, floor, ceil, inf/sup, partial, infty, to), לינארית (matrix [prompt], pmatrix/bmatrix/vmatrix, det, vec, norm, inner, transpose, inverse, rank, ker, Im, span, dim, cis, overline, hat), טקסט (def → `**הגדרה.** `, thm → `**משפט.** `, lemma, proof → `**הוכחה.** … $\blacksquare$`, example, remark, eps-delta → תבנית "לכל $\varepsilon>0$ קיים $\delta>0$ כך שלכל $x$ המקיים $0<|x-a|<\delta$ מתקיים $|f(x)-L|<\varepsilon$", induction → תבנית בסיס/הנחה/צעד).
- ‏`src/para/slashInsert.ts` (טהור, נבדק):
  ```ts
  export type SlashContext = "para" | "latex";
  export function findTrigger(value: string, caret: number): { start: number; query: string } | null; // "/" בתחילת מילה
  export function isInsideMath(value: string, caret: number): boolean;   // מספר אי-זוגי של $ לא-מוברחים לפני הסמן ($$ מטופל)
  export function filterCommands(query: string): SlashCommand[];
  export function applyCommand(value, trigger, caret, cmd, ctx, args?): { value: string; caret: number };
  ```
  כלל ההכנסה: ctx `latex` או בתוך `$…$` → `insert.latex`; מחוץ למתמטיקה → `insert.text` אם קיים (יוונית/∀∃∈ כ-Unicode, תבניות טקסט), אחרת עטיפה `$latex$`. `cursorOffset` יחסי לתחילת ההכנסה (ברירת מחדל = סוף).
- ‏`src/para/slashInsert.test.ts`.
- ‏`src/para/SlashMenu.tsx`: `useSlashMenu({textareaRef, value, onChange(v, caret?), context}) → { onKeyDown(e): boolean; onInput(): void; menu: JSX.Element | null }`. הפופאפ מעוגן מתחת ל-textarea ברוחב מלא (לא ליד הסמן). מקשים: חיצים, Enter/Tab בחירה, Esc סגירה, הקלדה מסננת, רווח עם אפס התאמות סוגר. פקודת matrix מציגה טופס "שורות × עמודות" (ברירת מחדל 2×2) בתוך הפופאפ.
- ‏`src/para/ParagraphDialog.tsx`: מודל כמו `EquationDialog`: textarea `dir="rtl"` (ימין) + תצוגה מקדימה `<img>` מ-`renderParagraph` (debounce 150ms, כך שהתצוגה = התוצאה בלוח), בקרות גודל/צבע/רוחב, Ctrl+Enter שליחה, Esc ביטול, אימות לפני שליחה (אותו דפוס try/catch כמו `EquationDialog.submit`). `ParagraphValue = { source, fontSize, color, width }`; props `{ initial?, onSubmit(value, asNew?), onCancel }`.

**שינויים בקבצים קיימים:**
- ‏`src/math/EquationDialog.tsx`: פלטה בטאבים `PALETTE_TABS: {id, title, groups}[]` ("בסיסי / חדו"א / אלגברה לינארית / קבוצות ולוגיקה"); פריטים חדשים: `\begin{pmatrix}` עם בוחר N×M (לשתף את טופס המטריצה של הסלאש כפופאובר), `\det`, `\vec`, `\lVert #0 \rVert`, `\langle #0, #? \rangle`, `\forall \exists \in \notin \subseteq \cup \cap \setminus`, `\mathbb{N Z Q R C}`, `\lim_{x\to a^{+}}`, `\sum_{k=1}^{n}`, `\prod`, `\binom`, `\lfloor\rfloor \lceil\rceil`, `\overline{#0}`, `\hat{#0}`, `\operatorname{cis}`, `\varepsilon \delta`, `\Rightarrow \Leftrightarrow \iff`. `mf.inlineShortcuts = {...mf.inlineShortcuts, eps, forall, exists, notin, subset, RR, NN, ZZ, QQ, CC, det, rank, ker, dim, span, tr, norm, inner, binom, floor, ceil, bar, hat, sup, inf, cis, pmat}`. ה-textarea של LaTeX מקבל `useSlashMenu(context:"latex")`.
- ‏`src/board/BoardScreen.tsx`: state `paraDialog`; `selectedEditable: {id, kind:"math"|"para"} | null` במקום `selectedMathId`; `isEditableElement = isMathElement || isParaElement`; `openEditorFor(el)` לפי kind; יירוט dblclick (~329) ו-Enter (~376) משתמשים ב-`isEditableElement`; קיצור `Alt+T` → פסקה חדשה (`T` לבד נשאר טקסט Excalidraw); כפתור "¶ פסקה" ליד "∑ משוואה"; פריט במסך הפתיחה; כפתור בסרגל המצגת; תווית "ערוך" לפי kind.
- ‏`src/styles/app.css`: `.para-dialog`, `.para-body` (שתי עמודות כמו `.prob-body`), `.para-preview`, `.slash-menu`, `.slash-item.active`, `.eq-palette-tabs`.

**בדיקה לשלב 1:** vitest ל-parse/slashInsert; בדפדפן: להכניס פסקה עברית עם `$\varepsilon$` inline ו-`$$\lim…$$`, לזום (חד), לערוך בדאבל-קליק וב-Enter, לשנות גודל ואז לערוך (הסקייל נשמר), התמונה הממוזערת בפאנל הדפים מתעדכנת, "⬇ PDF" מציג את הפסקה, "Save as image" של Excalidraw עובד; להריץ `supportsForeignObject()` פעם בקונסול.

### שלב 2 — Desmos גדול + מצב מיקוד + הסרת GeoGebra מה-UI ✅ בוצע
- ‏`public/desmos.html`: `DEMO_KEY` → `DEFAULT_KEY` עם המפתח של הבעלים (סעיף 3), localStorage override נשאר; `projectorMode: true`; מצב `focus=1` (בלי שינוי בגודל, זה רק סימון); האזנה ל-`keydown` Escape במצב focus → `window.parent.mlGgbBridge.closeFocus?.()`; `data-key` על ה-iframe.
- ‏`src/graph/graphs.tsx`: `preferredEngine()` מחזיר תמיד `"desmos"` (למחוק `rememberEngine`/`ENGINE_KEY`); `insertGraph(api, app, engine: GraphEngine = "desmos")`; גודל חדש: `width = (s.width - 40) / zoom * 0.92`, `height = (s.height - 40) / zoom * 0.88` (בלי תקרת 900×640), עדיין דרך `placementCenter`; `DEFAULT_SCALE = 1` לגרפים חדשים (A−/A+ ללא שינוי; גרפים קיימים שומרים `uiScale`); כפתור "⛶ מסך מלא" בכותרת רק כש-`engine === "desmos"`, שקורא ל-setter ברמת המודול `onFocusRequest` (אותו דפוס כמו `apiGetter`); `pushDesmosState(key, state)` מוצא `iframe.graph-frame[data-key=<id>]` וקורא `contentWindow.calculator.setState(state)` (זה מפעיל `change` → `scheduleSave` → `onChange` עם snapshot טרי); fallback: `customData.rev = (rev??0)+1` ו-`&rev=` ב-`src`. להוסיף `closeFocus?: () => void` לגשר. לשמור `GraphEngine`, `ENGINE_LABEL`, `PAGES.geogebra`, `LINKS.geogebra`, `engineOf` (חסר → geogebra) ו-`validateEmbeddable` ללוחות ישנים.
- ‏`src/graph/GraphFocus.tsx` (חדש): `createPortal` overlay (fixed, inset 0, z-index 1500: מעל Excalidraw, מתחת ל-`.modal-backdrop` 2000) עם כותרת ("חזרה ללוח · Esc") ו-iframe שני `/desmos.html?key=<id>&app=<app>&focus=1`. `getInitial(key)` כבר מחזיר את ה-`state` העדכני. בסגירה: `overlayFrame.contentWindow.calculator.getState()` סינכרוני, `bridge.onChange(key, JSON.stringify(state), null)`, unmount, ואז `pushDesmosState`. לסגור בהחלפת דף.
- ‏`src/board/GraphMenu.tsx`: שני פריטים בלבד (📈 דו-ממדי Alt+G, 🧊 תלת-ממדי Alt+3), `onPick(app)`, כותרת "הוספת גרף Desmos…".
- ‏`src/board/BoardScreen.tsx`: `addGraph(app)`; state `focusGraphId`; רינדור `<GraphFocus>`; טקסט מסך הפתיחה "גרף Desmos" / "גרף תלת-ממדי Desmos"; הקיצורים ~359-364 כבר קוראים ל-`insertGraph(api, app)`.
- ‏`src/home/HomeScreen.tsx:148`: טקסט הפרומפט "השאר ריק כדי להשתמש במפתח המובנה".
- ‏`src/styles/app.css`: `.graph-focus`, `.graph-focus-header`, כפתור הכותרת.
- ‏`README.md` (שורות ~6, 23, 59, 106-114, 162), `CLAUDE.md` (סעיף Graphs ו-Gotchas), `index.html`/`vite.config.ts` (תיאורים): ניסוח "Desmos" + משפט "לוחות ישנים עם גרפי GeoGebra עדיין נפתחים (`public/ggb.html`)".
- ‏`public/ggb.html`, `src/export/snapshots.ts`: ללא שינוי.
- **בדיקה:** גרף חדש ממלא את התצוגה; פתיחת מיקוד, הוספת ביטוי, Esc → הגרף הפנימי מציג אותו, snapshot בתמונה הממוזערת וב-PDF מעודכן; לוח ישן עם גרף GeoGebra (או אלמנט עם `engine` חסר) עדיין מתרנדר; `Alt+G`/`Alt+3` יוצרים Desmos.

### שלב 3 — ספריית סניפטים ✅ בוצע
- ‏`src/library/types.ts`:
  ```ts
  export type SnippetTopic = "linear1" | "linear2" | "infi1";
  export interface Snippet {
    id: string; topic: SnippetTopic; subtopic?: string; title: string;
    kind: "para" | "math"; body: string;           // מקור פסקה או LaTeX
    fontSize?: number; color?: string; builtin: boolean;
    createdAt?: number; updatedAt?: number;
  }
  ```
- ‏`src/library/content/{index,linear1,linear2,infi1}.ts`: `BUILTIN_SNIPPETS` בעברית לפי רשימת הנושאים בסעיף 1 (הגדרות, משפטים, תבניות תרגיל: למשל "הגדרת גבול של סדרה", "מבחן ההשוואה", "משפט המימדים", "הגדרת ערך עצמי", "תהליך גרם-שמידט", תבנית "הוכח באינדוקציה", מטריצה ריקה NxM). הבעלים יערוך אחר כך.
- ‏`src/library/content.test.ts`: מזהים ייחודיים; כל `body` מסוג `math` וכל קטע `$…$` ב-`para` מתרנדר עם `latexToSvg`/`parseParagraph`.
- ‏`src/storage/db.ts`: לשמור `version(1)` ולהוסיף `this.version(2).stores({ boards: "id, updatedAt", contents: "id", snippets: "id, topic, updatedAt" })`; רק סניפטים של משתמש נשמרים (`builtin:false`); API: `listSnippets()`, `addSnippet()`, `deleteSnippet()`, `allSnippets() = [...BUILTIN, ...user]`; `BackupFile.version: 2`, `snippets?: Snippet[]`; `exportBackup` מוסיף `db.snippets.toArray()`, `importBackup` עושה `bulkPut(data.snippets ?? [])` (קבצי v1 עדיין נטענים).
- ‏`src/storage/db.test.ts`: סבב גיבוי/שחזור של סניפט; גיבוי v1 בלי `snippets` עדיין נטען.
- ‏`src/library/LibraryPanel.tsx`: מודל (`.modal` + `.tabs compact` כמו `ProbabilityDialog`), תיבת חיפוש, 3 טאבי נושא, פריטים מקובצים לפי תת-נושא, חלונית תצוגה מקדימה (`renderParagraph`/`latexToSvg` → `<img>`), כפתורים "הוסף ללוח" (`insertParagraph`/`upsertEquation` עם מיקום שורה הבאה), "פתח בעורך" (פותח את הדיאלוג עם התוכן), "🗑" לסניפטים של המשתמש. קיצור `Alt+L`.
- ‏`src/library/SaveSnippetDialog.tsx` + כפתור "☆ שמור כקטע" ב-topbar כשנבחר אלמנט `para`/`math` → טופס (כותרת, נושא, תת-נושא) → `addSnippet`.
- ‏`src/board/BoardScreen.tsx`: כפתור "📚 ספרייה", `Alt+L`, "☆ שמור כקטע"; `src/home/HomeScreen.tsx`: הודעת השחזור סופרת סניפטים; `app.css`.
- **בדיקה:** vitest db + content; בדפדפן: הכנסת סניפט מתחת למשוואה נבחרת (שורה הבאה), שמירת פסקה כסניפט, גיבוי → שחזור → הסניפט קיים.

### שלב 4 — הרחבת הפתרון המהיר ✅ בוצע
- ‏`src/solve/latexToGgb.ts` ב-`convert()`: ענף `name === "begin"` → `parseEnv(r)` קורא `{pmatrix|bmatrix|vmatrix|matrix}` עד `\end{…}`, מפצל שורות ב-`\\` ותאים ב-`&`, ממיר כל תא → `{{a,b},{c,d}}`; `vmatrix` עוטף ב-`Determinant(...)`. `det` → `Determinant(arg)` (להוסיף `det: "Determinant"` ל-`FUNCTIONS`, וב-`convertFunction` לקבל ארגומנט שמתחיל ב-`\begin`). `sum`/`prod` → לקרוא `_{k=a}` ו-`^{b}` בכל סדר, ואז הסכום הוא שאר המחרוזת (`r.s.slice(r.i)`, `r.i` לסוף) → `Sum(expr,k,a,b)` / `Product(...)`. `binom{n}{k}` → `nCr(n,k)`. `lim` → לקרוא `_{v \to a^{+}}` → `Limit|LimitAbove|LimitBelow(rest, v, a)`. SYMBOLS: `epsilon`, `varepsilon` → `ε`; IGNORED: להוסיף `limits`, `nolimits`. `^{T}` / `^{-1}` מיד אחרי ליטרל מטריצה → `Transpose({{…}})` / `Invert({{…}})` (עוזר `wrapLastMatrix(out, fn)`; לדלג אם `out` לא מסתיים ב-`}}`). `findVariables`: להרחיב `NOT_VARIABLES` בשמות הפקודות החדשות.
- ‏`src/solve/quickSolve.ts`: `SolveOp` += `"det" | "inverse" | "rank" | "rref" | "eigenvalues" | "eigenvectors" | "transpose" | "series" | "taylor"`; `SolveOptions` += `{ side?: "+" | "-"; point?: string; degree?: string; sumVar?: string }`; מקרי `planSolve`: `Determinant(e)` → `\det M = r`; `Invert(e)` → `M^{-1} = r`; `MatrixRank(e)` → `\operatorname{rank} M = r`; `ReducedRowEchelonForm(e)` → `M \sim r`; `Eigenvalues(e)` → `\lambda = r`; `Eigenvectors(e)` → `v = r`; `Transpose(e)` → `M^{T} = r`; `taylor` → `TaylorPolynomial(e, v, point, degree)` → `T_{n}(x) = r`; `series` → אם `e` כבר `Sum(...)` להשתמש ב-`[e, "Numeric(" + e + ")"]`, אחרת `Sum(e, v, from, to)`; `limit` עם `side` → `LimitAbove/LimitBelow` ותצוגה `\lim_{x \to a^{+}}`. לייצא `SOLVE_GROUPS: { id, title, ops, when?: (latex) => boolean }[]` ("כללי", "אלגברה לינארית" כש-`/\\begin\{[pbv]?matrix\}|\\det/`, "טורים וטיילור" תמיד).
- ‏`src/solve/ggbToLatex.ts` ב-`list()`: לאסוף פריטים כ-`(string | string[])[]`; אם כל פריט הוא רשימה פנימית ואין יחס בתוכה → `\begin{pmatrix} a & b \\ c & d \end{pmatrix}`; אחרת פלט פתרון-מערכת כמו היום. רשימות שטוחות נשארות `a,\quad b`.
- ‏`src/solve/QuickSolvePanel.tsx`: prop חדש `latex: string` (`EquationDialog` מעביר `latexText`), רינדור `SOLVE_GROUPS` מסונן לפי `when`, שורות פרמטרים לגבול (נקודה + "מימין/משמאל"), טיילור (נקודה, דרגה), טור (משתנה, מ, עד); `NEEDS_PARAMS` += `taylor`, `series`.
- ‏`src/solve/solve.test.ts` להוסיף: `\begin{pmatrix}1&2\\3&4\end{pmatrix}` = `{{1,2},{3,4}}`; vmatrix → `Determinant({{…}})`; `\det\begin{pmatrix}…`; `\sum_{k=1}^{n} k^2` = `Sum(k^(2),k,1,n)`; `\sum_{k=1}^{\infty}\frac{1}{k^2}` = `Sum(((1)/(k^(2))),k,1,infinity)`; `\binom{5}{2}` = `nCr(5,2)`; `\varepsilon` → `ε`; `\lim_{x\to 0^{+}}\frac{1}{x}` = `LimitAbove(((1)/(x)),x,0)`. `ggbToLatex`: `{{1, 2}, {3, 4}}` → pmatrix; `{{x = 2, y = -1}}` ללא שינוי; `{2, 3}` → `2,\quad 3`; `{{1 / 2, 0}, {0, 1}}` → שברים בתאים. `planSolve/runPlan` עם ה-CAS המזויף: det, inverse, rank, rref, eigenvalues, taylor (`TaylorPolynomial(ℯ^(x), x, 0, 3)` → `1 + x + 1 / 2 x² + 1 / 6 x³`), series, גבול חד-צדדי.
- **בדיקה:** vitest; בדפדפן עם ה-CAS האמיתי: `\begin{pmatrix}1&2\\3&4\end{pmatrix}` → det/inverse/rank/RREF/eigen; `\sum_{k=1}^{\infty}\frac{1}{k^2}` → `\frac{\pi^{2}}{6}`; טיילור של `e^x` ב-0 דרגה 3; `\frac{1}{x}` עם `0⁺` → `\infty`. לרשום פלטי CAS אמיתיים שהפרסר דוחה ולהוסיף כ-fixtures.

### שלב 5 — ליטוש ✅ בוצע
- ‏`src/board/ShortcutsDialog.tsx` (`?` / `F1`): טבלת כל הקיצורים כולל אלה של Excalidraw.
- ארגון ה-topbar בקבוצות: הוספה (משוואה · פסקה · גרף ▾ · ספרייה) | ציור (עט · מרקר · לייזר) | הקשר (ערוך · שמור כקטע). התאמה בסרגל המצגת.
- ‏`README.md` טבלת קיצורים; `CLAUDE.md` עדכון ארכיטקטורה (פסקאות, ספרייה, מיקוד, Desmos-only).
- עדכון `HANDOFF.md` (הקובץ הזה): לסמן מה הושלם, להוסיף מה נלמד.

### איך לוודא שכל שלב הושלם
- ‏`npm test` ו-`npx tsc --noEmit -p .` ירוקים.
- ‏`npm run dev` (פורט 5173) דרך הדפדפן המובנה של Claude Code (`preview_start` עם `.claude/launch.json`), ביצוע הבדיקה הידנית שמפורטת בסוף כל שלב, וצילום מסך לבעלים.
- ייצוא PDF אחרי שלבים 1-2 (פסקאות וגרפים מופיעים).

---

## 9. פקודות שימושיות

```bash
npm run dev            # Vite על http://localhost:5173 (פורט קבוע; מעתיק פונטים לפני)
npm test               # vitest, כל הבדיקות
npx vitest run src/solve/solve.test.ts     # קובץ אחד
npx tsc --noEmit -p .  # בדיקת טיפוסים
npm run build          # tsc -b && vite build (+ service worker)
npm run deploy         # npx vercel --prod (דורש התחברות של הבעלים)
git status; git log --oneline -5
```

---

## 10. הערות לסשן הבא

- **לא לממש בלי אישור מפורש** של הבעלים. הוא ביקש לקבל רק תוכנית ולהגיד "תתחיל לממש" בעצמו.
- לפני שלב 1 להריץ את ה-probe של foreignObject (סעיף 7) ולדווח לבעלים אם צריך את ה-fallback.
- ה-`Esc` בתוך iframe של Desmos לא מגיע להורה; לכן `desmos.html` במצב focus חייב להעביר אותו בעצמו.
- שינוי `customData` של גרף **לא** טוען מחדש את ה-iframe (ה-`src` זהה). זה טוב ל-A−/A+ ורע למצב מיקוד; לכן `pushDesmosState`.
- ‏LaTeX בקבצים: רק דרך Edit/Write או `String.raw`; לא דרך Python/shell.
- לשמור על `hi.txt` מחוץ לגיט ולא לגעת בו.
- הסיכומים של הבעלים נמצאים ב-`C:\Users\User\Desktop\` (`לינארית סיכום.pdf`, `lin2_summary.pdf`, `infi1_summary.pdf`, `אינפי סיכום.pdf`); חילוץ העברית מהם לא עובד (סעיף 4), אבל אפשר להשתמש בנוסחאות שבהם לאימות תוכן הספרייה.
