import assert from "node:assert/strict";
import test from "node:test";

const imagePlacementModule = await import(new URL("./imagePlacement.ts", import.meta.url).href);
const normalizeGeneratedImageShapesInSnapshot =
  "normalizeGeneratedImageShapesInSnapshot" in imagePlacementModule &&
  typeof imagePlacementModule.normalizeGeneratedImageShapesInSnapshot === "function"
    ? imagePlacementModule.normalizeGeneratedImageShapesInSnapshot
    : <TSnapshot,>(snapshot: TSnapshot) => snapshot;

test("normalizeGeneratedImageShapesInSnapshot fits legacy generated images back into their saved box", () => {
  const snapshot = {
    document: {
      store: {
        "asset:generated-1": {
          id: "asset:generated-1",
          typeName: "asset",
          type: "image",
          props: {
            w: 1024,
            h: 1536
          },
          meta: {
            localAssetId: "generated-1"
          }
        },
        "shape:image-1": {
          id: "shape:image-1",
          typeName: "shape",
          type: "image",
          x: 10,
          y: 20,
          props: {
            assetId: "asset:generated-1",
            w: 300,
            h: 300,
            crop: null
          }
        }
      }
    }
  };

  const normalized = normalizeGeneratedImageShapesInSnapshot(snapshot, new Set(["generated-1"]));
  const shape = normalized.document.store["shape:image-1"];

  assert.deepEqual(
    {
      x: shape.x,
      y: shape.y,
      w: shape.props.w,
      h: shape.props.h
    },
    {
      x: 60,
      y: 20,
      w: 200,
      h: 300
    }
  );
});

test("normalizeGeneratedImageShapesInSnapshot leaves cropped images unchanged", () => {
  const snapshot = {
    store: {
      "asset:generated-2": {
        id: "asset:generated-2",
        typeName: "asset",
        type: "image",
        props: {
          w: 1536,
          h: 1024
        },
        meta: {
          localAssetId: "generated-2"
        }
      },
      "shape:image-2": {
        id: "shape:image-2",
        typeName: "shape",
        type: "image",
        x: 40,
        y: 50,
        props: {
          assetId: "asset:generated-2",
          w: 300,
          h: 300,
          crop: {
            topLeft: { x: 0, y: 0 },
            bottomRight: { x: 1, y: 1 },
            isCircle: false
          }
        }
      }
    }
  };

  const normalized = normalizeGeneratedImageShapesInSnapshot(snapshot, new Set(["generated-2"]));

  assert.deepEqual(normalized, snapshot);
});
