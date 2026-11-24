import { expect, test } from "vitest";
import { around, diff, pick, shape } from "./peek.mts";

test("the shape of a response shows keys and lengths, never the content", () => {
  const value = pick(JSON.stringify({ pages: [{ url: "https://a.org", text: "x".repeat(5000) }] }));

  expect(shape(value)).toBe("{ pages: list (1) of { url: text (13 chars), text: text (5000 chars) } }");
  expect(pick(JSON.stringify({ pages: [{ text: "Hello" }] }), "pages.0.text")).toBe("Hello");
});

test("excerpts around a word are bounded and located by their position", () => {
  expect(around("aaa Figure 1 bbb\nccc", "figure 1", 4)).toEqual(["@4 …aaa Figure 1 bbb…"]);
});

test("the diff only shows the lines that change, numbered", () => {
  expect(diff("a\nb\nc", "a\nB\nc\nd")).toEqual(["2\n  - b\n  + B", "4\n  - ∅\n  + d"]);
});
