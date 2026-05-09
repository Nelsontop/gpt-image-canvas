import assert from "node:assert/strict";
import test from "node:test";

const { fitAssetIntoPlacement } = await import(new URL("./imagePlacement.ts", import.meta.url).href);

test("fitAssetIntoPlacement keeps the full image visible inside the placeholder box", () => {
  const placement = fitAssetIntoPlacement(
    { width: 1600, height: 900 },
    { x: 120, y: 80, width: 300, height: 300 }
  );

  assert.deepEqual(placement, {
    x: 120,
    y: 145.625,
    width: 300,
    height: 168.75
  });
});
