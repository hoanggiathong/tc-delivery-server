import mongoose, { mongo } from "mongoose";
import { Delivery } from "../../models/delivery.model";

interface Scan {
  _id: mongo.ObjectId;
  licensePlate: string;
  fullCode: string;
  barcode: string;
  tripId: mongo.ObjectId;
  actionTime: Date;
  syncTime: Date;
  type: "load" | "unload";
  scanCount: number;
}
type Goods = Pick<Scan, "fullCode" | "barcode"> & { quantity: number };
interface State {
  items: Map<string, Goods>;
  count: number;
  through: Date | null;
  cycle: string;
  tripId: string;
}
let external: Promise<mongo.MongoClient> | undefined;
async function dataSource() {
  const uri = process.env.VEHICLE_SCAN_MONGO_URI;
  if (!uri) {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Vehicle data unavailable");
    return { db, client: mongoose.connection.getClient() };
  }
  external ??= new mongo.MongoClient(uri, {
    maxPoolSize: 6,
    serverSelectionTimeoutMS: 5000,
  })
    .connect()
    .catch((error) => {
      external = undefined;
      throw error;
    });
  const client = await external;
  return { db: client.db(), client };
}
const recent = new Map<string, State>();
export const normalizePlate = (value: unknown) =>
  String(value || "")
    .toUpperCase()
    .replace(/[\s.-]/g, "");

function emptyState(): State {
  return {
    items: new Map(),
    count: 0,
    through: null,
    cycle: "empty",
    tripId: "empty",
  };
}

function applyScan(state: State, event: Scan) {
  if (
    !event.fullCode ||
    !event.barcode ||
    !Number.isSafeInteger(event.scanCount) ||
    event.scanCount <= 0 ||
    !["load", "unload"].includes(event.type)
  ) {
    throw new Error("Invalid shipment scan");
  }
  const key = JSON.stringify([event.fullCode, event.barcode]);
  const previous = state.items.get(key)?.quantity || 0;
  const quantity =
    previous + (event.type === "load" ? event.scanCount : -event.scanCount);
  if (quantity > 0) {
    if (!state.items.size) {
      state.cycle = String(event._id);
      state.tripId = String(event.tripId);
    }
    state.items.set(key, {
      fullCode: event.fullCode,
      barcode: event.barcode,
      quantity,
    });
  } else {
    state.items.delete(key);
  }
  state.count++;
  state.through = event.actionTime;
}

export async function getCargo(plate: string) {
  if (!/^[0-9]{2}[A-Z][A-Z0-9]{4,9}$/.test(plate))
    throw new Error("Invalid vehicle plate");
  // Historic logs contain both formatted and unformatted plates.
  const pattern = new RegExp(
    "^\\s*" + plate.split("").join("[\\s.-]*") + "\\s*$",
    "i",
  );
  const { db, client } = await dataSource();
  const logs = db.collection<Scan>("shipmentlogs");
  const session = client.startSession();

  try {
    const snapshot = await session.withTransaction(
      async () => {
        const now = new Date();
        const plates = await logs.distinct(
          "licensePlate",
          { licensePlate: pattern },
          { session },
        );
        const filter: {
          licensePlate: { $in: string[] };
          actionTime: { $lte: Date; $gt?: Date };
        } = { licensePlate: { $in: plates }, actionTime: { $lte: now } };
        let state = emptyState();
        const cached = recent.get(plate);
        if (cached?.through && cached.through <= now) {
          // Stock scans are append-only. An offline scan inserted at/before the checkpoint
          // changes this count, triggering a chronological replay including the late scan.
          const before = await logs.countDocuments(
            {
              ...filter,
              actionTime: { $lte: cached.through },
            },
            { session },
          );
          if (before === cached.count) {
            state = { ...cached, items: new Map(cached.items) };
            filter.actionTime.$gt = cached.through;
          }
        }
        const events = logs
          .find(filter, {
            session,
            projection: {
              type: 1,
              scanCount: 1,
              barcode: 1,
              fullCode: 1,
              tripId: 1,
              actionTime: 1,
            },
          })
          .sort({ actionTime: 1, syncTime: 1, _id: 1 });
        try {
          for await (const event of events) applyScan(state, event);
        } finally {
          await events.close();
        }
        return { state, capturedAt: now.toISOString() };
      },
      { readConcern: { level: "snapshot" }, readPreference: "primary" },
    );
    recent.delete(plate);
    recent.set(plate, snapshot.state);
    const oldest = recent.keys().next().value;
    if (recent.size > 64 && oldest) recent.delete(oldest);
    const goods = [...snapshot.state.items.values()];
    const deliveries = goods.length
      ? await Delivery.find({
          fullCode: { $in: goods.map((item) => item.fullCode) },
        })
          .select("fullCode name")
          .lean()
      : [];
    const names = new Map(deliveries.map((item) => [item.fullCode, item.name]));
    return {
      cycle: snapshot.state.cycle,
      tripId: snapshot.state.tripId,
      capturedAt: snapshot.capturedAt,
      items: goods.map((item) => ({
        ...item,
        name: names.get(item.fullCode) || "",
      })),
    };
  } finally {
    await session.endSession();
  }
}
