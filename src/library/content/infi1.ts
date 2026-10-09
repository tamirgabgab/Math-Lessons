/**
 * Built-in snippets for Calculus 1 (sup/inf, sequences, series, limits of functions,
 * continuity, derivatives, Taylor, Riemann integral, improper integrals).
 *
 * Bodies are Hebrew paragraph sources (see `para/parse.ts`) or single LaTeX formulas.
 * They are written with String.raw so every backslash stays literal.
 */
import type { Snippet } from "../types";

const r = String.raw;

const para = (id: string, subtopic: string, title: string, body: string): Snippet => ({
  id,
  topic: "infi1",
  subtopic,
  title,
  kind: "para",
  body,
  builtin: true,
});

const math = (id: string, subtopic: string, title: string, body: string): Snippet => ({
  id,
  topic: "infi1",
  subtopic,
  title,
  kind: "math",
  body,
  builtin: true,
});

export const INFI1: Snippet[] = [
  // ----- sup / inf -----
  para(
    "infi1.sup.def",
    "חסמים",
    "חסם עליון, סופרמום ואקסיומת השלמות",
    r`**הגדרה.** מספר $M$ הוא חסם מלעיל של $A \subseteq \mathbb{R}$ אם $a \le M$ לכל $a \in A$. הסופרמום $\sup A$ הוא החסם מלעיל הקטן ביותר.
באופן שקול: $M = \sup A$ אם ורק אם $M$ חסם מלעיל ולכל $\varepsilon > 0$ קיים $a \in A$ עם $a > M - \varepsilon$.
**אקסיומת השלמות.** לכל קבוצה לא ריקה וחסומה מלעיל ב-$\mathbb{R}$ יש סופרמום. באופן דומה, לקבוצה לא ריקה וחסומה מלרע יש אינפימום $\inf A$.`,
  ),
  para(
    "infi1.sup.archimedes",
    "חסמים",
    "תכונת ארכימדס וצפיפות",
    r`**משפט (ארכימדס).** לכל $x \in \mathbb{R}$ קיים $n \in \mathbb{N}$ עם $n > x$. בפרט, לכל $\varepsilon > 0$ קיים $n$ עם $\dfrac{1}{n} < \varepsilon$.
**משפט (צפיפות).** בין כל שני מספרים ממשיים $a < b$ קיים מספר רציונלי וגם מספר אי-רציונלי.`,
  ),

  // ----- sequences -----
  para(
    "infi1.seq.limit",
    "סדרות",
    "הגדרת גבול של סדרה",
    r`**הגדרה.** הסדרה $(a_n)$ מתכנסת ל-$L$, ומסמנים $\lim_{n \to \infty} a_n = L$, אם לכל $\varepsilon > 0$ קיים $N \in \mathbb{N}$ כך שלכל $n > N$:
$$
|a_n - L| < \varepsilon
$$
הסדרה שואפת לאינסוף, $a_n \to \infty$, אם לכל $M > 0$ קיים $N$ כך שלכל $n > N$ מתקיים $a_n > M$.`,
  ),
  para(
    "infi1.seq.arithmetic",
    "סדרות",
    "אריתמטיקה של גבולות ותכונות בסיסיות",
    r`**משפט (אריתמטיקה של גבולות).** אם $a_n \to a$ ו-$b_n \to b$, אז $a_n \pm b_n \to a \pm b$, $a_n b_n \to ab$, ואם $b \neq 0$ גם $\dfrac{a_n}{b_n} \to \dfrac{a}{b}$.
**משפט.** גבול של סדרה הוא יחיד; סדרה מתכנסת היא חסומה; אם $a_n \le b_n$ לכל $n$ אז $\lim a_n \le \lim b_n$ (אי-השוויון בגבול חלש גם אם המקורי חזק).`,
  ),
  para(
    "infi1.seq.sandwich",
    "סדרות",
    "משפט הסנדוויץ'",
    r`**משפט הסנדוויץ'.** אם $a_n \le b_n \le c_n$ החל ממקום מסוים ו-$\lim a_n = \lim c_n = L$, אז $\lim b_n = L$.
שימושים: אם $|b_n| \le c_n$ ו-$c_n \to 0$ אז $b_n \to 0$; מכפלה של סדרה חסומה בסדרה השואפת לאפס שואפת לאפס.`,
  ),
  para(
    "infi1.seq.monotone",
    "סדרות",
    "סדרה מונוטונית וחסומה",
    r`**משפט (סדרה מונוטונית).** סדרה עולה וחסומה מלעיל מתכנסת, ו-$\lim a_n = \sup\{ a_n \}$. סדרה יורדת וחסומה מלרע מתכנסת ל-$\inf\{ a_n \}$. סדרה מונוטונית שאינה חסומה שואפת לאינסוף או למינוס אינסוף.
דוגמה: $a_n = \left( 1 + \dfrac{1}{n} \right)^n$ עולה וחסומה על ידי $3$, וגבולה מוגדר כ-$e$.`,
  ),
  math("infi1.seq.e", "סדרות", "הגדרת e כגבול", r`\lim_{n \to \infty} \left( 1 + \frac{1}{n} \right)^n = e`),
  para(
    "infi1.seq.cauchy",
    "סדרות",
    "בולצאנו-ויירשטראס וסדרות קושי",
    r`**משפט (בולצאנו-ויירשטראס).** לכל סדרה חסומה יש תת-סדרה מתכנסת.
**הגדרה.** הסדרה $(a_n)$ היא סדרת קושי אם לכל $\varepsilon > 0$ קיים $N$ כך שלכל $m, n > N$ מתקיים $|a_n - a_m| < \varepsilon$.
**משפט.** סדרה ממשית מתכנסת אם ורק אם היא סדרת קושי.`,
  ),
  para(
    "infi1.seq.known",
    "סדרות",
    "גבולות שימושיים של סדרות",
    r`**גבולות שימושיים.**
- $\sqrt[n]{n} \to 1$ ו-$\sqrt[n]{a} \to 1$ לכל $a > 0$.
- $q^n \to 0$ עבור $|q| < 1$; $\dfrac{a^n}{n!} \to 0$; $\dfrac{n^k}{a^n} \to 0$ עבור $a > 1$.
- $\dfrac{\sin x_n}{x_n} \to 1$ כאשר $x_n \to 0$; $\left( 1 + \dfrac{x}{n} \right)^n \to e^x$.
- אם $a_n \to L$ אז גם הממוצעים $\dfrac{a_1 + \dots + a_n}{n} \to L$ (צ'זארו).`,
  ),
  para(
    "infi1.ex.epsilon",
    "סדרות",
    "תרגיל: הוכחת גבול לפי ההגדרה",
    r`**תרגיל.** הוכיחו לפי ההגדרה ש-$\lim_{n \to \infty} \dfrac{2n + 1}{n + 3} = 2$.
**פתרון.** יהי $\varepsilon > 0$. נחשב:
$$
\left| \frac{2n + 1}{n + 3} - 2 \right| = \left| \frac{-5}{n + 3} \right| = \frac{5}{n + 3} < \frac{5}{n}
$$
נבחר $N > \dfrac{5}{\varepsilon}$; אז לכל $n > N$ מתקיים $|a_n - 2| < \dfrac{5}{n} < \dfrac{5}{N} < \varepsilon$. $\blacksquare$`,
  ),

  // ----- series -----
  para(
    "infi1.series.def",
    "טורים",
    "הגדרת טור וטורים חשובים",
    r`**הגדרה.** הטור $\sum_{n=1}^{\infty} a_n$ מתכנס אם סדרת הסכומים החלקיים $S_N = \sum_{n=1}^{N} a_n$ מתכנסת, וסכומו הוא $\lim S_N$.
**תנאי הכרחי.** אם $\sum a_n$ מתכנס אז $a_n \to 0$. ההפך אינו נכון: הטור ההרמוני $\sum \dfrac{1}{n}$ מתבדר.
**טורים חשובים.** הטור ההנדסי $\sum_{n=0}^{\infty} q^n = \dfrac{1}{1 - q}$ עבור $|q| < 1$; הטור $\sum \dfrac{1}{n^p}$ מתכנס אם ורק אם $p > 1$.`,
  ),
  para(
    "infi1.series.tests",
    "טורים",
    "מבחני התכנסות לטורים חיוביים",
    r`**מבחני התכנסות לטורים חיוביים** ($a_n \ge 0$):
- **השוואה:** אם $0 \le a_n \le b_n$ ו-$\sum b_n$ מתכנס, אז $\sum a_n$ מתכנס; אם $\sum a_n$ מתבדר, אז $\sum b_n$ מתבדר.
- **השוואה גבולית:** אם $\lim \dfrac{a_n}{b_n} = c$ עם $0 < c < \infty$, הטורים מתכנסים או מתבדרים יחד.
- **מנה (ד'אלמבר):** אם $\lim \dfrac{a_{n+1}}{a_n} = q$, הטור מתכנס כאשר $q < 1$ ומתבדר כאשר $q > 1$.
- **שורש (קושי):** אם $\lim \sqrt[n]{a_n} = q$, הטור מתכנס כאשר $q < 1$ ומתבדר כאשר $q > 1$.
- **אינטגרל:** עבור $f$ חיובית ויורדת, $\sum f(n)$ מתכנס אם ורק אם $\int_1^\infty f(x)\,dx$ מתכנס.`,
  ),
  para(
    "infi1.series.alternating",
    "טורים",
    "התכנסות בהחלט ומבחן לייבניץ",
    r`**הגדרה.** הטור $\sum a_n$ מתכנס בהחלט אם $\sum |a_n|$ מתכנס. התכנסות בהחלט גוררת התכנסות; טור שמתכנס אך לא בהחלט נקרא מתכנס בתנאי.
**משפט (לייבניץ).** אם $(b_n)$ יורדת ו-$b_n \to 0$, אז הטור המתחלף $\sum (-1)^{n} b_n$ מתכנס, והשארית מקיימת $|S - S_N| \le b_{N+1}$.`,
  ),
  para(
    "infi1.ex.series",
    "טורים",
    "תרגיל: התכנסות טור במבחן המנה",
    r`**תרגיל.** קבעו אם הטור $\sum_{n=1}^{\infty} \dfrac{n}{2^n}$ מתכנס.
**פתרון.** מתקיים $a_n = \dfrac{n}{2^n} > 0$, ולכן נשתמש במבחן המנה:
$$
\frac{a_{n+1}}{a_n} = \frac{n + 1}{2^{n+1}} \cdot \frac{2^n}{n} = \frac{n + 1}{2n} \longrightarrow \frac{1}{2} < 1
$$
לכן הטור מתכנס.`,
  ),

  // ----- limits of functions and continuity -----
  para(
    "infi1.limit.epsdelta",
    "גבולות ורציפות",
    "גבול של פונקציה (אפסילון-דלתא)",
    r`**הגדרה (גבול של פונקציה).** מתקיים $\lim_{x \to a} f(x) = L$ אם לכל $\varepsilon > 0$ קיים $\delta > 0$ כך שלכל $x$ בתחום ההגדרה:
$$
0 < |x - a| < \delta \ \Longrightarrow \ |f(x) - L| < \varepsilon
$$
גבולות חד-צדדיים: $\lim_{x \to a^+} f(x)$ ו-$\lim_{x \to a^-} f(x)$. הגבול קיים אם ורק אם שני הגבולות החד-צדדיים קיימים ושווים.`,
  ),
  para(
    "infi1.limit.heine",
    "גבולות ורציפות",
    "אפיון היינה",
    r`**משפט (היינה).** מתקיים $\lim_{x \to a} f(x) = L$ אם ורק אם לכל סדרה $x_n \to a$ עם $x_n \neq a$ מתקיים $f(x_n) \to L$.
שימוש: כדי להראות שגבול לא קיים, מוצאים שתי סדרות $x_n \to a$ ו-$y_n \to a$ שעבורן $f(x_n) \to L_1$, $f(y_n) \to L_2$ ו-$L_1 \neq L_2$.`,
  ),
  math("infi1.limit.sinx", "גבולות ורציפות", "הגבול של sin x / x", r`\lim_{x \to 0} \frac{\sin x}{x} = 1`),
  para(
    "infi1.cont.def",
    "גבולות ורציפות",
    "רציפות, ערך הביניים וויירשטראס",
    r`**הגדרה.** הפונקציה $f$ רציפה בנקודה $a$ אם $\lim_{x \to a} f(x) = f(a)$; היא רציפה בקטע אם היא רציפה בכל נקודה בו.
**משפט ערך הביניים.** אם $f$ רציפה ב-$[a, b]$ ו-$f(a) < c < f(b)$ (או להפך), קיים $x_0 \in (a, b)$ עם $f(x_0) = c$. בפרט, אם $f(a) f(b) < 0$ יש ל-$f$ שורש ב-$(a, b)$.
**משפט ויירשטראס.** פונקציה רציפה בקטע סגור $[a, b]$ חסומה ומקבלת בו מקסימום ומינימום.`,
  ),
  para(
    "infi1.cont.uniform",
    "גבולות ורציפות",
    "רציפות במידה שווה",
    r`**הגדרה.** הפונקציה $f$ רציפה במידה שווה בקבוצה $D$ אם לכל $\varepsilon > 0$ קיים $\delta > 0$ כך שלכל $x, y \in D$:
$$
|x - y| < \delta \ \Longrightarrow \ |f(x) - f(y)| < \varepsilon
$$
ההבדל מרציפות: $\delta$ תלוי רק ב-$\varepsilon$ ולא בנקודה.
**משפט (קנטור).** פונקציה רציפה בקטע סגור $[a, b]$ רציפה בו במידה שווה.`,
  ),

  // ----- derivatives -----
  para(
    "infi1.deriv.def",
    "נגזרות",
    "הגדרת הנגזרת וכללי גזירה",
    r`**הגדרה.** הפונקציה $f$ גזירה ב-$x_0$ אם קיים הגבול
$$
f'(x_0) = \lim_{h \to 0} \frac{f(x_0 + h) - f(x_0)}{h} = \lim_{x \to x_0} \frac{f(x) - f(x_0)}{x - x_0}
$$
**משפט.** גזירות בנקודה גוררת רציפות בה. ההפך אינו נכון: $|x|$ רציפה ב-$0$ אך אינה גזירה שם.
**כללי גזירה.** $(fg)' = f'g + fg'$, $\left( \dfrac{f}{g} \right)' = \dfrac{f'g - fg'}{g^2}$, $(f \circ g)'(x) = f'(g(x)) \, g'(x)$, $(f^{-1})'(y) = \dfrac{1}{f'(x)}$ כאשר $y = f(x)$.`,
  ),
  para(
    "infi1.deriv.mvt",
    "נגזרות",
    "פרמה, רול ולגראנז'",
    r`**משפט פרמה.** אם $f$ גזירה ב-$x_0$ ויש לה שם קיצון מקומי, אז $f'(x_0) = 0$.
**משפט רול.** אם $f$ רציפה ב-$[a, b]$, גזירה ב-$(a, b)$ ו-$f(a) = f(b)$, אז קיים $c \in (a, b)$ עם $f'(c) = 0$.
**משפט לגראנז' (ערך הממוצע).** אם $f$ רציפה ב-$[a, b]$ וגזירה ב-$(a, b)$, קיים $c \in (a, b)$ כך ש-
$$
f'(c) = \frac{f(b) - f(a)}{b - a}
$$
מסקנות: אם $f' = 0$ בקטע אז $f$ קבועה בו; אם $f' > 0$ אז $f$ עולה ממש.`,
  ),
  para(
    "infi1.deriv.lhopital",
    "נגזרות",
    "כלל לופיטל",
    r`**משפט (לופיטל).** אם $\lim_{x \to a} f(x) = \lim_{x \to a} g(x) = 0$ (או שניהם $\pm\infty$), הפונקציות גזירות בסביבה מנוקבת של $a$ עם $g' \neq 0$ שם, וקיים $\lim_{x \to a} \dfrac{f'(x)}{g'(x)} = L$, אז
$$
\lim_{x \to a} \frac{f(x)}{g(x)} = L
$$
הכלל תקף גם עבור $a = \pm\infty$ ולגבולות חד-צדדיים. צורות אחרות ($0 \cdot \infty$, $\infty - \infty$, $1^\infty$, $0^0$) מביאים לצורה $\dfrac{0}{0}$ או $\dfrac{\infty}{\infty}$, למשל באמצעות $f^g = e^{g \ln f}$.`,
  ),
  para(
    "infi1.deriv.taylor",
    "נגזרות",
    "משפט טיילור עם שארית לגראנז'",
    r`**משפט (טיילור).** אם $f$ גזירה $n + 1$ פעמים בסביבת $x_0$, אז לכל $x$ בסביבה
$$
f(x) = \sum_{k=0}^{n} \frac{f^{(k)}(x_0)}{k!} (x - x_0)^k + R_n(x)
$$
כאשר השארית בצורת לגראנז' היא $R_n(x) = \dfrac{f^{(n+1)}(c)}{(n+1)!} (x - x_0)^{n+1}$ עבור $c$ כלשהו בין $x_0$ ל-$x$. עבור $x_0 = 0$ הפולינום נקרא פולינום מקלורן.`,
  ),
  para(
    "infi1.deriv.maclaurin",
    "נגזרות",
    "פיתוחי מקלורן שימושיים",
    r`**פיתוחי מקלורן שימושיים** (סביב $0$):
- $e^x = 1 + x + \dfrac{x^2}{2!} + \dfrac{x^3}{3!} + \dots$
- $\sin x = x - \dfrac{x^3}{3!} + \dfrac{x^5}{5!} - \dots$ וגם $\cos x = 1 - \dfrac{x^2}{2!} + \dfrac{x^4}{4!} - \dots$
- $\ln(1 + x) = x - \dfrac{x^2}{2} + \dfrac{x^3}{3} - \dots$ עבור $|x| < 1$
- $\dfrac{1}{1 - x} = 1 + x + x^2 + x^3 + \dots$ עבור $|x| < 1$`,
  ),

  // ----- integrals -----
  para(
    "infi1.int.riemann",
    "אינטגרלים",
    "הגדרת אינטגרל רימן",
    r`**הגדרה.** עבור חלוקה $P = \{ a = x_0 < x_1 < \dots < x_n = b \}$ של $[a, b]$ מגדירים סכומי דרבו עליון ותחתון
$$
U(f, P) = \sum_{i=1}^{n} M_i \, \Delta x_i, \qquad L(f, P) = \sum_{i=1}^{n} m_i \, \Delta x_i
$$
כאשר $M_i$ ו-$m_i$ הם הסופרמום והאינפימום של $f$ ב-$[x_{i-1}, x_i]$. הפונקציה אינטגרבילית רימן אם $\inf_P U(f, P) = \sup_P L(f, P)$, והערך המשותף הוא $\int_a^b f(x)\,dx$.
**משפט.** פונקציה רציפה (או מונוטונית, או חסומה עם מספר סופי של נקודות אי-רציפות) בקטע סגור היא אינטגרבילית.`,
  ),
  para(
    "infi1.int.ftc",
    "אינטגרלים",
    "המשפט היסודי של החדו\"א",
    r`**המשפט היסודי של החדו"א.** תהי $f$ רציפה ב-$[a, b]$.
1. הפונקציה $F(x) = \int_a^x f(t)\,dt$ גזירה ב-$(a, b)$ ומתקיים $F'(x) = f(x)$.
2. (ניוטון-לייבניץ) אם $G$ היא פונקציה קדומה כלשהי של $f$, אז
$$
\int_a^b f(x)\,dx = G(b) - G(a)
$$
הכללה: $\dfrac{d}{dx} \int_{u(x)}^{v(x)} f(t)\,dt = f(v(x)) \, v'(x) - f(u(x)) \, u'(x)$.`,
  ),
  para(
    "infi1.int.techniques",
    "אינטגרלים",
    "אינטגרציה בחלקים והצבה",
    r`**אינטגרציה בחלקים.**
$$
\int u \, dv = uv - \int v \, du, \qquad \int_a^b f(x) g'(x)\,dx = \Big[ f(x) g(x) \Big]_a^b - \int_a^b f'(x) g(x)\,dx
$$
**הצבה.** אם $x = \varphi(t)$ גזירה ברציפות, אז $\int f(x)\,dx = \int f(\varphi(t)) \, \varphi'(t)\,dt$. באינטגרל מסוים משנים גם את הגבולות: $\int_a^b f(x)\,dx = \int_{\alpha}^{\beta} f(\varphi(t)) \, \varphi'(t)\,dt$ כאשר $\varphi(\alpha) = a$ ו-$\varphi(\beta) = b$.`,
  ),
  para(
    "infi1.int.improper",
    "אינטגרלים",
    "אינטגרלים לא אמיתיים",
    r`**הגדרה.** אינטגרל לא אמיתי מהסוג הראשון: $\int_a^\infty f(x)\,dx = \lim_{M \to \infty} \int_a^M f(x)\,dx$, אם הגבול קיים וסופי. מהסוג השני (פונקציה לא חסומה ליד $b$): $\int_a^b f(x)\,dx = \lim_{t \to b^-} \int_a^t f(x)\,dx$.
**משפט.** האינטגרל $\int_1^\infty \dfrac{dx}{x^p}$ מתכנס אם ורק אם $p > 1$; האינטגרל $\int_0^1 \dfrac{dx}{x^p}$ מתכנס אם ורק אם $p < 1$.
**מבחן ההשוואה.** אם $0 \le f \le g$ ו-$\int g$ מתכנס, אז $\int f$ מתכנס; אם $\lim \dfrac{f(x)}{g(x)} = c \in (0, \infty)$, שני האינטגרלים מתכנסים או מתבדרים יחד.`,
  ),
];
