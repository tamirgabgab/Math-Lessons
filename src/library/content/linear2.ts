/**
 * Built-in snippets for Linear Algebra 2 (eigenvalues and diagonalization, inner product
 * spaces, Gram-Schmidt, orthogonal complement, Jordan form, bilinear forms).
 *
 * Bodies are Hebrew paragraph sources (see `para/parse.ts`) or single LaTeX formulas.
 * They are written with String.raw so every backslash stays literal.
 */
import type { Snippet } from "../types";

const r = String.raw;

const para = (id: string, subtopic: string, title: string, body: string): Snippet => ({
  id,
  topic: "linear2",
  subtopic,
  title,
  kind: "para",
  body,
  builtin: true,
});

const math = (id: string, subtopic: string, title: string, body: string): Snippet => ({
  id,
  topic: "linear2",
  subtopic,
  title,
  kind: "math",
  body,
  builtin: true,
});

export const LINEAR2: Snippet[] = [
  // ----- eigenvalues and diagonalization -----
  para(
    "linear2.eigen.def",
    "ערכים עצמיים ולכסון",
    "ערך עצמי, וקטור עצמי ופולינום אופייני",
    r`**הגדרה.** סקלר $\lambda \in \mathbb{F}$ הוא ערך עצמי של $A \in M_n(\mathbb{F})$ אם קיים וקטור $v \neq 0$ כך ש-$Av = \lambda v$; וקטור כזה נקרא וקטור עצמי השייך ל-$\lambda$.
הסקלר $\lambda$ הוא ערך עצמי אם ורק אם $\det(A - \lambda I) = 0$. הפולינום האופייני הוא $p_A(\lambda) = \det(A - \lambda I)$, והערכים העצמיים הם שורשיו.`,
  ),
  math(
    "linear2.eigen.charpoly2",
    "ערכים עצמיים ולכסון",
    "פולינום אופייני של מטריצה 2×2",
    r`p_A(\lambda) = \lambda^2 - \operatorname{tr}(A) \, \lambda + \det A`,
  ),
  para(
    "linear2.eigen.eigenspace",
    "ערכים עצמיים ולכסון",
    "מרחב עצמי וריבויים",
    r`**הגדרה.** המרחב העצמי של $\lambda$ הוא $V_\lambda = \ker(A - \lambda I)$: כל הווקטורים העצמיים השייכים ל-$\lambda$ יחד עם $0$.
הריבוי האלגברי של $\lambda$ הוא הריבוי שלו כשורש של $p_A$; הריבוי הגיאומטרי הוא $\dim V_\lambda = n - \operatorname{rank}(A - \lambda I)$.
**משפט.** הריבוי הגיאומטרי קטן או שווה לריבוי האלגברי, ושניהם לפחות $1$.`,
  ),
  para(
    "linear2.eigen.diag",
    "ערכים עצמיים ולכסון",
    "משפט הלכסון",
    r`**משפט (לכסון).** המטריצה $A \in M_n(\mathbb{F})$ לכסינה אם ורק אם קיים בסיס של $\mathbb{F}^n$ המורכב מווקטורים עצמיים של $A$. במקרה זה
$$
A = P D P^{-1}, \qquad D = \operatorname{diag}(\lambda_1, \dots, \lambda_n)
$$
כאשר עמודות $P$ הן הווקטורים העצמיים (באותו סדר של הערכים העצמיים ב-$D$).
תנאי שקול: $p_A$ מתפרק לגורמים לינאריים מעל $\mathbb{F}$, ולכל ערך עצמי הריבוי הגיאומטרי שווה לריבוי האלגברי. בפרט, אם ל-$A$ יש $n$ ערכים עצמיים שונים, היא לכסינה.`,
  ),
  para(
    "linear2.eigen.props",
    "ערכים עצמיים ולכסון",
    "תכונות של ערכים עצמיים",
    r`**משפט.** אם $\lambda_1, \dots, \lambda_n$ הם הערכים העצמיים של $A$ (עם ריבויים), אז:
- $\det A = \lambda_1 \cdots \lambda_n$ ו-$\operatorname{tr} A = \lambda_1 + \dots + \lambda_n$.
- הערכים העצמיים של $A^k$ הם $\lambda_i^k$, ושל $A^{-1}$ (אם הפיכה) הם $\lambda_i^{-1}$, עם אותם וקטורים עצמיים.
- וקטורים עצמיים השייכים לערכים עצמיים שונים הם בלתי תלויים לינארית.
- למטריצות דומות אותו פולינום אופייני, ולכן אותם ערכים עצמיים.`,
  ),
  para(
    "linear2.eigen.cayley",
    "ערכים עצמיים ולכסון",
    "משפט קיילי-המילטון",
    r`**משפט (קיילי-המילטון).** כל מטריצה ריבועית מאפסת את הפולינום האופייני שלה: $p_A(A) = 0$.
שימוש: אם $p_A(\lambda) = \lambda^2 - 5\lambda + 6$ אז $A^2 = 5A - 6I$, וכך מחשבים חזקות גבוהות של $A$ וגם $A^{-1} = \dfrac{1}{6}(5I - A)$.`,
  ),
  para(
    "linear2.ex.eigen",
    "ערכים עצמיים ולכסון",
    "תרגיל: מצא ערכים עצמיים ולכסן",
    r`**תרגיל.** נתונה $A = \begin{pmatrix} 4 & 1 \\ 2 & 3 \end{pmatrix}$. מצאו את הערכים העצמיים והווקטורים העצמיים וקבעו אם $A$ לכסינה.
1. פולינום אופייני: $p_A(\lambda) = \det(A - \lambda I) = \ldots$
2. ערכים עצמיים (שורשי $p_A$): $\lambda = \ldots$
3. לכל $\lambda$ פותרים $(A - \lambda I) v = 0$ ומוצאים בסיס ל-$V_\lambda$.
4. אם סכום הריבויים הגיאומטריים הוא $n$, המטריצה לכסינה: $P = \ldots$, $D = \ldots$ ו-$A = P D P^{-1}$.`,
  ),

  // ----- inner product spaces -----
  para(
    "linear2.inner.def",
    "מרחבי מכפלה פנימית",
    "הגדרת מכפלה פנימית ונורמה",
    r`**הגדרה.** מכפלה פנימית על מרחב וקטורי $V$ מעל $\mathbb{R}$ או $\mathbb{C}$ היא פונקציה $\langle u, v \rangle$ המקיימת:
- לינאריות ברכיב הראשון: $\langle a u + b w, v \rangle = a \langle u, v \rangle + b \langle w, v \rangle$.
- סימטריה הרמיטית: $\langle u, v \rangle = \overline{\langle v, u \rangle}$ (מעל $\mathbb{R}$: סימטריה רגילה).
- חיוביות: $\langle v, v \rangle \ge 0$, עם שוויון רק עבור $v = 0$.
הנורמה היא $\lVert v \rVert = \sqrt{\langle v, v \rangle}$. המכפלה הסטנדרטית ב-$\mathbb{R}^n$: $\langle u, v \rangle = \sum u_i v_i$; ב-$\mathbb{C}^n$: $\langle u, v \rangle = \sum u_i \overline{v_i}$.`,
  ),
  para(
    "linear2.inner.cauchyschwarz",
    "מרחבי מכפלה פנימית",
    "אי-שוויון קושי-שוורץ",
    r`**משפט (קושי-שוורץ).** לכל $u, v$ במרחב מכפלה פנימית:
$$
|\langle u, v \rangle| \le \lVert u \rVert \, \lVert v \rVert
$$
עם שוויון אם ורק אם $u, v$ תלויים לינארית. מסקנות: אי-שוויון המשולש $\lVert u + v \rVert \le \lVert u \rVert + \lVert v \rVert$, והזווית בין וקטורים ב-$\mathbb{R}^n$ מוגדרת על ידי $\cos\theta = \dfrac{\langle u, v \rangle}{\lVert u \rVert \, \lVert v \rVert}$.`,
  ),
  para(
    "linear2.inner.orthonormal",
    "מרחבי מכפלה פנימית",
    "אורתוגונליות ובסיס אורתונורמלי",
    r`**הגדרה.** הווקטורים $u, v$ אורתוגונליים ($u \perp v$) אם $\langle u, v \rangle = 0$. קבוצה $\{ e_1, \dots, e_k \}$ היא אורתונורמלית אם $\langle e_i, e_j \rangle = \delta_{ij}$.
**משפט.** קבוצה אורתוגונלית של וקטורים שונים מאפס היא בלתי תלויה לינארית. אם $(e_1, \dots, e_n)$ בסיס אורתונורמלי של $V$, אז לכל $v \in V$:
$$
v = \sum_{i=1}^{n} \langle v, e_i \rangle e_i, \qquad \lVert v \rVert^2 = \sum_{i=1}^{n} |\langle v, e_i \rangle|^2
$$`,
  ),
  para(
    "linear2.inner.gramschmidt",
    "מרחבי מכפלה פנימית",
    "תהליך גרם-שמידט",
    r`**תהליך גרם-שמידט.** בהינתן בסיס $v_1, \dots, v_n$ בונים בסיס אורתוגונלי $w_1, \dots, w_n$ ואז מנרמלים:
1. $w_1 = v_1$.
2. $w_k = v_k - \displaystyle\sum_{i=1}^{k-1} \frac{\langle v_k, w_i \rangle}{\langle w_i, w_i \rangle} w_i$ עבור $k = 2, \dots, n$.
3. $e_k = \dfrac{w_k}{\lVert w_k \rVert}$.
בכל שלב מתקיים $\operatorname{span}\{ w_1, \dots, w_k \} = \operatorname{span}\{ v_1, \dots, v_k \}$.`,
  ),
  para(
    "linear2.ex.gramschmidt",
    "מרחבי מכפלה פנימית",
    "תרגיל: גרם-שמידט ב-R^3",
    r`**תרגיל.** הפעילו את תהליך גרם-שמידט על הבסיס $v_1 = (1, 1, 0)$, $v_2 = (1, 0, 1)$, $v_3 = (0, 1, 1)$ של $\mathbb{R}^3$ עם המכפלה הפנימית הסטנדרטית.
1. $w_1 = v_1 = (1, 1, 0)$.
2. $w_2 = v_2 - \dfrac{\langle v_2, w_1 \rangle}{\langle w_1, w_1 \rangle} w_1 = \ldots$
3. $w_3 = v_3 - \dfrac{\langle v_3, w_1 \rangle}{\langle w_1, w_1 \rangle} w_1 - \dfrac{\langle v_3, w_2 \rangle}{\langle w_2, w_2 \rangle} w_2 = \ldots$
4. מנרמלים: $e_k = \dfrac{w_k}{\lVert w_k \rVert}$.`,
  ),
  para(
    "linear2.inner.complement",
    "מרחבי מכפלה פנימית",
    "משלים אורתוגונלי",
    r`**הגדרה.** המשלים האורתוגונלי של $W \subseteq V$ הוא $W^\perp = \{ v \in V : \langle v, w \rangle = 0 \ \forall w \in W \}$. זהו תמיד תת-מרחב, גם אם $W$ אינו.
**משפט.** אם $\dim V$ סופי, אז $V = W \oplus W^\perp$, $\dim W^\perp = \dim V - \dim W$ ו-$(W^\perp)^\perp = W$.
כדי למצוא את $W^\perp$ פותרים את המערכת ההומוגנית $\langle v, w_i \rangle = 0$ עבור בסיס $w_1, \dots, w_k$ של $W$.`,
  ),
  para(
    "linear2.inner.projection",
    "מרחבי מכפלה פנימית",
    "הטלה אורתוגונלית והקירוב הטוב ביותר",
    r`**הגדרה.** אם $w_1, \dots, w_k$ בסיס אורתוגונלי של $W$, ההטלה האורתוגונלית של $v$ על $W$ היא
$$
P_W(v) = \sum_{i=1}^{k} \frac{\langle v, w_i \rangle}{\langle w_i, w_i \rangle} w_i
$$
**משפט (הקירוב הטוב ביותר).** מתקיים $v - P_W(v) \in W^\perp$, ולכל $w \in W$: $\lVert v - P_W(v) \rVert \le \lVert v - w \rVert$, עם שוויון רק עבור $w = P_W(v)$.`,
  ),
  para(
    "linear2.inner.adjoint",
    "מרחבי מכפלה פנימית",
    "העתקה צמודה והמשפט הספקטרלי",
    r`**הגדרה.** ההעתקה הצמודה $T^*$ של $T : V \to V$ מוגדרת על ידי $\langle T u, v \rangle = \langle u, T^* v \rangle$ לכל $u, v$. בבסיס אורתונורמלי: $[T^*] = \overline{[T]}^{\, T}$.
אומרים ש-$T$ צמודה לעצמה אם $T^* = T$ (מטריצה סימטרית מעל $\mathbb{R}$, הרמיטית מעל $\mathbb{C}$), נורמלית אם $T T^* = T^* T$, ואוניטרית אם $T^* = T^{-1}$.
**המשפט הספקטרלי.** אופרטור צמוד לעצמו לכסין אורתוגונלית: קיים בסיס אורתונורמלי של וקטורים עצמיים, וכל ערכיו העצמיים ממשיים. מעל $\mathbb{C}$ זה נכון לכל אופרטור נורמלי.`,
  ),

  // ----- Jordan form -----
  para(
    "linear2.jordan.block",
    "צורת ז'ורדן",
    "בלוק ז'ורדן וצורת ז'ורדן",
    r`**הגדרה.** בלוק ז'ורדן מסדר $k$ עם ערך עצמי $\lambda$:
$$
J_k(\lambda) = \begin{pmatrix} \lambda & 1 & & \\ & \lambda & \ddots & \\ & & \ddots & 1 \\ & & & \lambda \end{pmatrix}
$$
**משפט.** אם $p_A$ מתפרק לגורמים לינאריים מעל $\mathbb{F}$ (תמיד מעל $\mathbb{C}$), אז $A$ דומה למטריצת בלוקים אלכסונית של בלוקי ז'ורדן, $J = P^{-1} A P$, והיא יחידה עד כדי סדר הבלוקים.`,
  ),
  para(
    "linear2.jordan.structure",
    "צורת ז'ורדן",
    "חישוב מבנה הבלוקים",
    r`**משפט (מבנה צורת ז'ורדן).** עבור ערך עצמי $\lambda$ של $A$:
- מספר הבלוקים של $\lambda$ הוא $\dim \ker(A - \lambda I) = n - \operatorname{rank}(A - \lambda I)$ (הריבוי הגיאומטרי).
- סכום גדלי הבלוקים של $\lambda$ הוא הריבוי האלגברי.
- מספר הבלוקים בגודל לפחות $k$ הוא $\operatorname{rank}(A - \lambda I)^{k-1} - \operatorname{rank}(A - \lambda I)^{k}$.
- גודל הבלוק הגדול ביותר הוא החזקה של $(x - \lambda)$ בפולינום המינימלי.`,
  ),
  para(
    "linear2.jordan.minpoly",
    "צורת ז'ורדן",
    "פולינום מינימלי",
    r`**הגדרה.** הפולינום המינימלי $m_A$ הוא הפולינום המתוקן מהדרגה הנמוכה ביותר המקיים $m_A(A) = 0$.
**משפט.** הפולינום $m_A$ מחלק כל פולינום שמאפס את $A$, ובפרט $m_A \mid p_A$; לשניהם אותם שורשים (הערכים העצמיים). המטריצה $A$ לכסינה אם ורק אם $m_A$ מתפרק לגורמים לינאריים **שונים** זה מזה.`,
  ),

  // ----- bilinear forms -----
  para(
    "linear2.bilinear.def",
    "תבניות בילינאריות",
    "תבנית בילינארית ומטריצה מייצגת",
    r`**הגדרה.** תבנית בילינארית על $V$ היא פונקציה $f : V \times V \to \mathbb{F}$ לינארית בכל אחד משני הרכיבים. בבסיס $B = (b_1, \dots, b_n)$ המטריצה המייצגת היא $[f]_B = \big( f(b_i, b_j) \big)$, ומתקיים
$$
f(u, v) = [u]_B^{T} \, [f]_B \, [v]_B
$$
התבנית סימטרית אם $f(u, v) = f(v, u)$ לכל $u, v$, כלומר אם $[f]_B$ סימטרית.`,
  ),
  para(
    "linear2.bilinear.congruence",
    "תבניות בילינאריות",
    "מעבר בסיס וחפיפה",
    r`**משפט (מעבר בסיס).** אם $P = [I]^{B'}_{B}$ היא מטריצת המעבר, אז $[f]_{B'} = P^{T} \, [f]_B \, P$. מטריצות $A' = P^T A P$ נקראות **חופפות**; לחופפות אותה דרגה, ומעל $\mathbb{R}$ גם אותה סיגנטורה.
כל תבנית סימטרית (מעל שדה ממציין שונה מ-$2$) ניתנת ללכסון: קיים בסיס $B$ שבו $[f]_B$ אלכסונית.`,
  ),
  para(
    "linear2.bilinear.quadratic",
    "תבניות בילינאריות",
    "תבנית ריבועית ומשפט סילבסטר",
    r`**הגדרה.** התבנית הריבועית המתאימה לתבנית סימטרית $f$ היא $q(v) = f(v, v)$. מעל $\mathbb{R}$ התבנית **חיובית לחלוטין** אם $q(v) > 0$ לכל $v \neq 0$.
**משפט (סילבסטר, חוק ההתמדה).** בכל בסיס מלכסן, מספר האיברים החיוביים $p$, השליליים $n$ והאפסים על האלכסון קבוע; הזוג $(p, n)$ הוא הסיגנטורה.
תבנית סימטרית ממשית חיובית לחלוטין אם ורק אם כל הערכים העצמיים של $[f]_B$ חיוביים, אם ורק אם כל המינורים הראשיים המובילים חיוביים.`,
  ),
  math(
    "linear2.bilinear.quadratic2",
    "תבניות בילינאריות",
    "תבנית ריבועית בשני משתנים",
    r`q(x, y) = a x^2 + 2b \, xy + c y^2 = \begin{pmatrix} x & y \end{pmatrix} \begin{pmatrix} a & b \\ b & c \end{pmatrix} \begin{pmatrix} x \\ y \end{pmatrix}`,
  ),
];
