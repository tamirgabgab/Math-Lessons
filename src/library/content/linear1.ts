/**
 * Built-in snippets for Linear Algebra 1 (complex numbers, fields, linear systems,
 * matrices, vector spaces, linear maps, determinants).
 *
 * Bodies are Hebrew paragraph sources (see `para/parse.ts`) or single LaTeX formulas.
 * They are written with String.raw so every backslash stays literal.
 */
import type { Snippet } from "../types";

const r = String.raw;

const para = (id: string, subtopic: string, title: string, body: string): Snippet => ({
  id,
  topic: "linear1",
  subtopic,
  title,
  kind: "para",
  body,
  builtin: true,
});

const math = (id: string, subtopic: string, title: string, body: string): Snippet => ({
  id,
  topic: "linear1",
  subtopic,
  title,
  kind: "math",
  body,
  builtin: true,
});

export const LINEAR1: Snippet[] = [
  // ----- complex numbers -----
  para(
    "linear1.complex.def",
    "מספרים מרוכבים",
    "מספר מרוכב, צמוד וערך מוחלט",
    r`**הגדרה.** מספר מרוכב הוא $z = a + bi$ עם $a, b \in \mathbb{R}$ ו-$i^2 = -1$. החלק הממשי הוא $\operatorname{Re} z = a$ והחלק המדומה הוא $\operatorname{Im} z = b$.
הצמוד: $\bar{z} = a - bi$. הערך המוחלט: $|z| = \sqrt{a^2 + b^2} = \sqrt{z \bar{z}}$.
חילוק: $\dfrac{z}{w} = \dfrac{z \bar{w}}{|w|^2}$.`,
  ),
  para(
    "linear1.complex.cis",
    "מספרים מרוכבים",
    "הצגה קוטבית (cis)",
    r`**הגדרה (הצגה קוטבית).** לכל $z \neq 0$ קיימים $r = |z| > 0$ וזווית $\theta = \arg z$ כך ש-
$$
z = r(\cos\theta + i\sin\theta) = r \operatorname{cis}\theta
$$
כפל בהצגה קוטבית: $r_1 \operatorname{cis}\theta_1 \cdot r_2 \operatorname{cis}\theta_2 = r_1 r_2 \operatorname{cis}(\theta_1 + \theta_2)$ (הרדיוסים נכפלים, הזוויות מתחברות).`,
  ),
  para(
    "linear1.complex.demoivre",
    "מספרים מרוכבים",
    "משפט דה-מואבר",
    r`**משפט (דה-מואבר).** לכל $n \in \mathbb{N}$:
$$
\left( r \operatorname{cis}\theta \right)^n = r^n \operatorname{cis}(n\theta)
$$
בפרט $(\cos\theta + i\sin\theta)^n = \cos(n\theta) + i\sin(n\theta)$.`,
  ),
  para(
    "linear1.complex.roots",
    "מספרים מרוכבים",
    "שורשים של מספר מרוכב",
    r`**משפט (שורשים).** למשוואה $w^n = z$, כאשר $z = r \operatorname{cis}\theta \neq 0$, יש בדיוק $n$ פתרונות:
$$
w_k = \sqrt[n]{r} \, \operatorname{cis}\left( \frac{\theta + 2\pi k}{n} \right), \qquad k = 0, 1, \dots, n - 1
$$
השורשים יושבים על מעגל ברדיוס $\sqrt[n]{r}$ בזוויות שוות. שורשי היחידה: $\omega_k = \operatorname{cis}\dfrac{2\pi k}{n}$.`,
  ),

  // ----- fields -----
  para(
    "linear1.field.def",
    "שדות",
    "הגדרת שדה",
    r`**הגדרה.** שדה הוא קבוצה $\mathbb{F}$ עם שתי פעולות, חיבור וכפל, כך ש:
- החיבור והכפל חילופיים וקיבוציים, והכפל מתפלג מעל החיבור.
- קיימים איברים ניטרליים $0 \neq 1$.
- לכל $a$ קיים נגדי $-a$, ולכל $a \neq 0$ קיים הופכי $a^{-1}$.
דוגמאות: $\mathbb{Q}$, $\mathbb{R}$, $\mathbb{C}$ ו-$\mathbb{Z}_p$ עבור $p$ ראשוני.`,
  ),
  para(
    "linear1.field.zp",
    "שדות",
    "השדה הסופי Z_p",
    r`**משפט.** החוג $\mathbb{Z}_n$ הוא שדה אם ורק אם $n$ ראשוני.
בשדה $\mathbb{Z}_p$ מוצאים הופכי של $a \neq 0$ מהמשפט הקטן של פרמה, $a^{p-1} \equiv 1 \pmod p$, כלומר $a^{-1} = a^{p-2}$; או על ידי ניסוי: מחפשים $b$ עם $ab \equiv 1 \pmod p$.`,
  ),

  // ----- linear systems -----
  para(
    "linear1.systems.rowops",
    "מערכות משוואות",
    "פעולות שורה אלמנטריות",
    r`**פעולות שורה אלמנטריות.**
- החלפת שתי שורות: $R_i \leftrightarrow R_j$.
- כפל שורה בסקלר $c \neq 0$: $R_i \to c R_i$.
- הוספת כפולה של שורה לשורה אחרת: $R_i \to R_i + c R_j$.
פעולות אלו אינן משנות את קבוצת הפתרונות של המערכת ואת הדרגה של המטריצה.`,
  ),
  para(
    "linear1.systems.solutions",
    "מערכות משוואות",
    "מספר הפתרונות של מערכת",
    r`**משפט.** למערכת $Ax = b$ עם $n$ נעלמים:
- אין פתרון אם ורק אם $\operatorname{rank} A < \operatorname{rank}(A \mid b)$.
- יש פתרון יחיד אם ורק אם $\operatorname{rank} A = \operatorname{rank}(A \mid b) = n$.
- יש אינסוף פתרונות אם ורק אם $\operatorname{rank} A = \operatorname{rank}(A \mid b) < n$, ואז מספר הפרמטרים החופשיים הוא $n - \operatorname{rank} A$.`,
  ),
  para(
    "linear1.systems.homogeneous",
    "מערכות משוואות",
    "מערכת הומוגנית ופתרון פרטי",
    r`**משפט.** קבוצת הפתרונות של המערכת ההומוגנית $Ax = 0$ היא תת-מרחב של $\mathbb{F}^n$ ממימד $n - \operatorname{rank} A$.
אם $x_0$ פתרון פרטי של $Ax = b$, אז קבוצת כל הפתרונות היא $x_0 + \ker A = \{ x_0 + v : Av = 0 \}$.`,
  ),
  math(
    "linear1.systems.augmented",
    "מערכות משוואות",
    "מטריצה מורחבת ריקה 3×4",
    r`\left( \begin{array}{ccc|c}   &   &   &   \\   &   &   &   \\   &   &   &   \end{array} \right)`,
  ),
  para(
    "linear1.ex.system",
    "מערכות משוואות",
    "תרגיל: פתרון מערכת",
    r`**תרגיל.** פתרו את המערכת ומצאו את כל הפתרונות:
$$
\begin{cases} x + y + z = 6 \\ x - y + 2z = 5 \\ 2x + y - z = 1 \end{cases}
$$
**פתרון.** כותבים את המטריצה המורחבת $(A \mid b)$ ומדרגים לצורה מדורגת קנונית.`,
  ),

  // ----- matrices -----
  math("linear1.matrix.empty3", "מטריצות", "מטריצה ריקה 3×3", r`\begin{pmatrix}   &   &   \\   &   &   \\   &   &   \end{pmatrix}`),
  para(
    "linear1.matrix.ops",
    "מטריצות",
    "תכונות של כפל, שחלוף והופכי",
    r`**משפט (תכונות).** עבור מטריצות בגדלים מתאימים:
- $(AB)C = A(BC)$ ו-$A(B + C) = AB + AC$, אבל בדרך כלל $AB \neq BA$.
- $(AB)^T = B^T A^T$ ו-$(A^T)^T = A$.
- אם $A, B$ הפיכות אז $AB$ הפיכה ו-$(AB)^{-1} = B^{-1} A^{-1}$. ההופכית יחידה.`,
  ),
  para(
    "linear1.matrix.invertible",
    "מטריצות",
    "תנאים שקולים להפיכות",
    r`**משפט.** עבור מטריצה ריבועית $A \in M_n(\mathbb{F})$ התנאים הבאים שקולים:
- $A$ הפיכה.
- $\det A \neq 0$.
- $\operatorname{rank} A = n$ (השורות, וגם העמודות, בלתי תלויות לינארית).
- למערכת $Ax = 0$ יש רק את הפתרון הטריוויאלי.
- $A$ שקולת שורות ל-$I_n$.`,
  ),
  para(
    "linear1.matrix.inverse",
    "מטריצות",
    "חישוב מטריצה הופכית",
    r`**שיטה (גאוס-ז'ורדן).** כותבים $(A \mid I)$ ומדרגים עד שמשמאל מתקבלת $I$; אז מימין מתקבלת $A^{-1}$:
$$
(A \mid I) \longrightarrow (I \mid A^{-1})
$$
עבור $2 \times 2$: $\begin{pmatrix} a & b \\ c & d \end{pmatrix}^{-1} = \dfrac{1}{ad - bc} \begin{pmatrix} d & -b \\ -c & a \end{pmatrix}$.`,
  ),

  // ----- vector spaces -----
  para(
    "linear1.vs.def",
    "מרחבים וקטוריים",
    "הגדרת מרחב וקטורי",
    r`**הגדרה.** מרחב וקטורי מעל שדה $\mathbb{F}$ הוא קבוצה $V$ עם חיבור $u + v$ וכפל בסקלר $c v$, כך שהחיבור חילופי וקיבוצי, קיים וקטור אפס $0$ ולכל $v$ נגדי $-v$, ומתקיים $c(u + v) = cu + cv$, $(c + d)v = cv + dv$, $(cd)v = c(dv)$ ו-$1 \cdot v = v$.
דוגמאות: $\mathbb{F}^n$, מטריצות $M_{m \times n}(\mathbb{F})$, פולינומים $\mathbb{F}[x]$, פונקציות $\mathbb{R} \to \mathbb{R}$.`,
  ),
  para(
    "linear1.vs.subspace",
    "מרחבים וקטוריים",
    "תת-מרחב",
    r`**הגדרה.** תת-קבוצה $W \subseteq V$ היא תת-מרחב אם:
1. $0 \in W$.
2. לכל $u, w \in W$ מתקיים $u + w \in W$.
3. לכל $w \in W$ ו-$c \in \mathbb{F}$ מתקיים $c w \in W$.
באופן שקול: $W \neq \emptyset$ ו-$c u + w \in W$ לכל $u, w \in W$ ולכל $c \in \mathbb{F}$.`,
  ),
  para(
    "linear1.vs.span",
    "מרחבים וקטוריים",
    "פרישה ואי-תלות לינארית",
    r`**הגדרה.** הפרישה של $v_1, \dots, v_k$ היא קבוצת כל הצירופים הלינאריים שלהם:
$$
\operatorname{span}\{ v_1, \dots, v_k \} = \{ c_1 v_1 + \dots + c_k v_k : c_i \in \mathbb{F} \}
$$
הווקטורים **בלתי תלויים לינארית** אם מ-$c_1 v_1 + \dots + c_k v_k = 0$ נובע $c_1 = \dots = c_k = 0$; אחרת הם תלויים, ואז אחד מהם הוא צירוף לינארי של האחרים.`,
  ),
  para(
    "linear1.vs.basis",
    "מרחבים וקטוריים",
    "בסיס ומימד",
    r`**הגדרה.** בסיס של $V$ הוא קבוצה בלתי תלויה לינארית שפורשת את $V$. המימד $\dim V$ הוא מספר האיברים בבסיס.
**משפט.** לכל שני בסיסים של $V$ אותו מספר איברים. אם $\dim V = n$ אז:
- כל $n$ וקטורים בלתי תלויים הם בסיס.
- כל $n$ וקטורים פורשים הם בסיס.
- כל קבוצה בלתי תלויה ניתנת להשלמה לבסיס, ומכל קבוצה פורשת אפשר לחלץ בסיס.`,
  ),
  para(
    "linear1.vs.sumdim",
    "מרחבים וקטוריים",
    "מימד הסכום וסכום ישר",
    r`**משפט (מימד הסכום).** לתתי-מרחבים $U, W \subseteq V$:
$$
\dim(U + W) = \dim U + \dim W - \dim(U \cap W)
$$
הסכום ישר, ומסמנים $U \oplus W$, אם ורק אם $U \cap W = \{ 0 \}$; אז $\dim(U \oplus W) = \dim U + \dim W$ וכל וקטור בסכום נכתב באופן יחיד כ-$u + w$.`,
  ),

  // ----- linear maps -----
  para(
    "linear1.map.def",
    "העתקות לינאריות",
    "העתקה לינארית, גרעין ותמונה",
    r`**הגדרה.** העתקה $T : V \to W$ היא לינארית אם לכל $u, v \in V$ ולכל $c \in \mathbb{F}$:
$$
T(u + v) = T(u) + T(v), \qquad T(c v) = c \, T(v)
$$
הגרעין $\ker T = \{ v \in V : T(v) = 0 \}$ הוא תת-מרחב של $V$; התמונה $\operatorname{Im} T = \{ T(v) : v \in V \}$ היא תת-מרחב של $W$.`,
  ),
  para(
    "linear1.map.ranknullity",
    "העתקות לינאריות",
    "משפט המימדים",
    r`**משפט המימדים.** אם $T : V \to W$ לינארית ו-$\dim V$ סופי, אז
$$
\dim V = \dim \ker T + \dim \operatorname{Im} T
$$
מסקנות: $T$ חד-חד-ערכית אם ורק אם $\ker T = \{ 0 \}$; אם $\dim V = \dim W$, אז $T$ חד-חד-ערכית אם ורק אם היא על.`,
  ),
  para(
    "linear1.map.repmatrix",
    "העתקות לינאריות",
    "מטריצה מייצגת",
    r`**הגדרה.** יהיו $B = (b_1, \dots, b_n)$ בסיס של $V$ ו-$C$ בסיס של $W$. המטריצה המייצגת $[T]^B_C$ היא המטריצה שעמודתה ה-$j$ היא וקטור הקואורדינטות $[T(b_j)]_C$. לכל $v \in V$:
$$
[T(v)]_C = [T]^B_C \, [v]_B
$$
הרכבה: $[S \circ T]^B_D = [S]^C_D \, [T]^B_C$. כמו כן $\operatorname{rank} T = \operatorname{rank} [T]^B_C$ ו-$\dim \ker T = n - \operatorname{rank} [T]^B_C$.`,
  ),
  para(
    "linear1.map.changebasis",
    "העתקות לינאריות",
    "מעבר בסיס ומטריצות דומות",
    r`**משפט (מעבר בסיס).** מטריצת המעבר מבסיס $B$ לבסיס $B'$ היא $P = [I]^{B}_{B'}$ (עמודותיה הן $[b_j]_{B'}$), ומתקיים $[v]_{B'} = P \, [v]_B$.
עבור אופרטור $T : V \to V$:
$$
[T]_{B'} = P \, [T]_B \, P^{-1}
$$
מטריצות המייצגות את אותו אופרטור בבסיסים שונים הן **דומות**: $A' = P A P^{-1}$. למטריצות דומות אותה דרגה, אותה דטרמיננטה ואותו פולינום אופייני.`,
  ),

  // ----- determinants -----
  math("linear1.det.2x2", "דטרמיננטות", "דטרמיננטה 2×2", r`\det \begin{pmatrix} a & b \\ c & d \end{pmatrix} = ad - bc`),
  para(
    "linear1.det.props",
    "דטרמיננטות",
    "תכונות הדטרמיננטה",
    r`**משפט (תכונות הדטרמיננטה).** עבור $A, B \in M_n(\mathbb{F})$:
- $\det(AB) = \det A \cdot \det B$, $\det(A^T) = \det A$ ו-$\det(cA) = c^n \det A$.
- החלפת שתי שורות הופכת את הסימן; כפל שורה ב-$c$ מכפיל את הדטרמיננטה ב-$c$; הוספת כפולה של שורה לשורה אחרת אינה משנה אותה.
- אם יש שורת אפסים או שתי שורות שוות, $\det A = 0$. דטרמיננטה של מטריצה משולשית היא מכפלת איברי האלכסון.
- $A$ הפיכה אם ורק אם $\det A \neq 0$, ואז $\det(A^{-1}) = \dfrac{1}{\det A}$.`,
  ),
  para(
    "linear1.det.laplace",
    "דטרמיננטות",
    "פיתוח לפלס והמטריצה המצורפת",
    r`**משפט (פיתוח לפלס).** לכל שורה $i$:
$$
\det A = \sum_{j=1}^{n} (-1)^{i+j} a_{ij} M_{ij}
$$
כאשר $M_{ij}$ הוא המינור: הדטרמיננטה של המטריצה המתקבלת ממחיקת שורה $i$ ועמודה $j$. באופן דומה מפתחים לפי עמודה.
המטריצה המצורפת: $(\operatorname{adj} A)_{ij} = (-1)^{i+j} M_{ji}$, ומתקיים $A^{-1} = \dfrac{1}{\det A} \operatorname{adj} A$.`,
  ),
  para(
    "linear1.det.cramer",
    "דטרמיננטות",
    "כלל קרמר",
    r`**משפט (כלל קרמר).** אם $A \in M_n(\mathbb{F})$ הפיכה, הפתרון היחיד של $Ax = b$ הוא
$$
x_i = \frac{\det A_i}{\det A}, \qquad i = 1, \dots, n
$$
כאשר $A_i$ מתקבלת מ-$A$ על ידי החלפת העמודה ה-$i$ בווקטור $b$.`,
  ),

  // ----- exercise templates -----
  para(
    "linear1.ex.induction",
    "תבניות תרגיל",
    "הוכחה באינדוקציה",
    r`**הוכחה באינדוקציה.** נוכיח שהטענה $P(n)$ נכונה לכל $n \ge 1$.
1. **בסיס:** עבור $n = 1$ מתקיים ...
2. **הנחת האינדוקציה:** נניח שהטענה נכונה עבור $n = k$, כלומר ...
3. **צעד האינדוקציה:** נראה שהטענה נכונה עבור $n = k + 1$: ...
לכן, לפי עקרון האינדוקציה, הטענה נכונה לכל $n \ge 1$. $\blacksquare$`,
  ),
  para(
    "linear1.ex.subspace",
    "תבניות תרגיל",
    "תרגיל: האם W תת-מרחב?",
    r`**תרגיל.** האם $W = \{ (x, y, z) \in \mathbb{R}^3 : \ldots \}$ הוא תת-מרחב של $\mathbb{R}^3$?
**פתרון.** בודקים את שלושת התנאים:
1. וקטור האפס: $0 = (0, 0, 0) \in W$ כי ...
2. סגירות לחיבור: יהיו $u, w \in W$; אז $u + w \in W$ כי ...
3. סגירות לכפל בסקלר: יהיו $w \in W$ ו-$c \in \mathbb{R}$; אז $c w \in W$ כי ...
(כדי להראות ש-$W$ אינו תת-מרחב מספיקה דוגמה נגדית אחת.)`,
  ),
  para(
    "linear1.ex.linmap",
    "תבניות תרגיל",
    "תרגיל: גרעין, תמונה ומטריצה מייצגת",
    r`**תרגיל.** נתונה ההעתקה הלינארית $T : \mathbb{R}^3 \to \mathbb{R}^2$, $T(x, y, z) = (x + y, \; y - z)$.
1. מצאו את $[T]$ ביחס לבסיסים הסטנדרטיים.
2. מצאו בסיס ל-$\ker T$ ובסיס ל-$\operatorname{Im} T$.
3. ודאו שמתקיים משפט המימדים: $\dim \ker T + \dim \operatorname{Im} T = 3$.`,
  ),
];
