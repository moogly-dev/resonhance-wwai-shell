import { expect, test } from "vitest";
import { around, diff, pick, shape } from "./peek.mts";

test("la forme d'une réponse montre clés et longueurs, jamais le contenu", () => {
  const value = pick(JSON.stringify({ pages: [{ url: "https://a.fr", text: "x".repeat(5000) }] }));

  expect(shape(value)).toBe("{ pages: liste (1) de { url: texte (12 car.), text: texte (5000 car.) } }");
  expect(pick(JSON.stringify({ pages: [{ text: "Bonjour" }] }), "pages.0.text")).toBe("Bonjour");
});

test("les extraits autour d'un mot sont bornés et repérés par leur position", () => {
  expect(around("aaa Figure 1 bbb\nccc", "figure 1", 4)).toEqual(["@4 …aaa Figure 1 bbb…"]);
});

test("la différence ne montre que les lignes qui changent, numérotées", () => {
  expect(diff("a\nb\nc", "a\nB\nc\nd")).toEqual(["2\n  - b\n  + B", "4\n  - ∅\n  + d"]);
});
