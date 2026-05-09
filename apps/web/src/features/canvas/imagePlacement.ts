export interface CanvasPlacementRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasImageSize {
  width: number;
  height: number;
}

const ASPECT_RATIO_EPSILON = 0.0001;

export function fitAssetIntoPlacement(asset: CanvasImageSize, placement: CanvasPlacementRect): CanvasPlacementRect {
  if (asset.width <= 0 || asset.height <= 0) {
    return placement;
  }

  const scale = Math.min(placement.width / asset.width, placement.height / asset.height);
  const width = asset.width * scale;
  const height = asset.height * scale;

  return {
    x: placement.x + (placement.width - width) / 2,
    y: placement.y + (placement.height - height) / 2,
    width,
    height
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeGeneratedImageShapeRecord(
  record: unknown,
  store: Record<string, unknown>,
  generatedAssetIds: ReadonlySet<string>
): unknown {
  if (!isRecord(record) || record.typeName !== "shape" || record.type !== "image" || !isRecord(record.props)) {
    return record;
  }

  if (record.props.crop !== null || !isFiniteNumber(record.x) || !isFiniteNumber(record.y)) {
    return record;
  }

  const assetId = record.props.assetId;
  if (typeof assetId !== "string") {
    return record;
  }

  const asset = store[assetId];
  if (!isRecord(asset) || asset.typeName !== "asset" || asset.type !== "image" || !isRecord(asset.props) || !isRecord(asset.meta)) {
    return record;
  }

  const localAssetId = asset.meta.localAssetId;
  if (typeof localAssetId !== "string" || !generatedAssetIds.has(localAssetId)) {
    return record;
  }

  const shapeWidth = record.props.w;
  const shapeHeight = record.props.h;
  const assetWidth = asset.props.w;
  const assetHeight = asset.props.h;
  if (
    !isFiniteNumber(shapeWidth) ||
    !isFiniteNumber(shapeHeight) ||
    !isFiniteNumber(assetWidth) ||
    !isFiniteNumber(assetHeight) ||
    shapeWidth <= 0 ||
    shapeHeight <= 0 ||
    assetWidth <= 0 ||
    assetHeight <= 0
  ) {
    return record;
  }

  const shapeAspectRatio = shapeWidth / shapeHeight;
  const assetAspectRatio = assetWidth / assetHeight;
  if (Math.abs(shapeAspectRatio - assetAspectRatio) <= ASPECT_RATIO_EPSILON) {
    return record;
  }

  const fittedPlacement = fitAssetIntoPlacement(
    {
      width: assetWidth,
      height: assetHeight
    },
    {
      x: record.x,
      y: record.y,
      width: shapeWidth,
      height: shapeHeight
    }
  );

  return {
    ...record,
    x: fittedPlacement.x,
    y: fittedPlacement.y,
    props: {
      ...record.props,
      w: fittedPlacement.width,
      h: fittedPlacement.height
    }
  };
}

function normalizeGeneratedImageShapesInStoreSnapshot<TSnapshot>(
  snapshot: TSnapshot,
  generatedAssetIds: ReadonlySet<string>
): TSnapshot {
  if (generatedAssetIds.size === 0 || !isRecord(snapshot) || !isRecord(snapshot.store)) {
    return snapshot;
  }

  let changed = false;
  const nextStore: Record<string, unknown> = {};
  for (const [id, record] of Object.entries(snapshot.store)) {
    const normalizedRecord = normalizeGeneratedImageShapeRecord(record, snapshot.store, generatedAssetIds);
    if (normalizedRecord !== record) {
      changed = true;
    }

    nextStore[id] = normalizedRecord;
  }

  return changed ? ({ ...snapshot, store: nextStore } as TSnapshot) : snapshot;
}

export function normalizeGeneratedImageShapesInSnapshot<TSnapshot>(
  snapshot: TSnapshot,
  generatedAssetIds: ReadonlySet<string>
): TSnapshot {
  if (!isRecord(snapshot)) {
    return snapshot;
  }

  if (isRecord(snapshot.document)) {
    const document = normalizeGeneratedImageShapesInStoreSnapshot(snapshot.document, generatedAssetIds);
    return document === snapshot.document ? snapshot : ({ ...snapshot, document } as TSnapshot);
  }

  return normalizeGeneratedImageShapesInStoreSnapshot(snapshot, generatedAssetIds);
}
