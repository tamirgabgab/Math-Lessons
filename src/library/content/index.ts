/** All built-in snippets, in panel order: Linear 1, Linear 2, Calculus 1. */
import type { Snippet } from "../types";
import { LINEAR1 } from "./linear1";
import { LINEAR2 } from "./linear2";
import { INFI1 } from "./infi1";

export { LINEAR1, LINEAR2, INFI1 };

export const BUILTIN_SNIPPETS: Snippet[] = [...LINEAR1, ...LINEAR2, ...INFI1];
