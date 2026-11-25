import { createHash } from "node:crypto";
import { z } from "zod";
import { getCargo, normalizePlate } from "./vehicle-cargo";

interface DriverLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}
export const normalizeDriverPhone = (value: unknown) =>
  String(value || "")
    .replace(/[\s().-]/g, "")
    .replace(/^\+?84/, "0");
const responseSchema = z.object({
  status: z.union([z.string(), z.number()]).optional(),
  result: z.array(z.record(z.string(), z.unknown())),
});
async function getRows(path: string, method: string) {
  const {
    EUP_API_URL: url,
    EUP_API_KEY: key,
    EUP_CONSUMER_ID: consumer,
  } = process.env;
  if (!url || !key || !consumer) throw new Error("Missing EUP configuration");
  const response = await fetch(url.replace(/\/+$/, "") + path, {
    method,
    redirect: "error",
    signal: AbortSignal.timeout(5000),
    headers: {
      "X-Eupfin-Api-Key": key,
      "Consumer-Id": consumer,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) throw new Error("EUP unavailable");
  const data = responseSchema.parse(await response.json());
  if (Number(data.status) === 2) throw new Error("EUP unavailable");
  return data.result;
}
function configured(name: string, fallback: number) {
  const n = Number(process.env[name] || fallback);
  if (!Number.isFinite(n) || n <= 0)
    throw new Error("Invalid proximity setting");
  return n;
}
function coordinate(value: unknown, bound: number) {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    String(value).trim() === ""
  )
    return NaN;
  const n = Number(value);
  return Math.abs(n) <= bound ? n : NaN;
}
function utcReport(value: unknown) {
  const s = String(value || "").replace(" ", "T");
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z?$/.test(s)) return NaN;
  return Date.parse(s.endsWith("Z") ? s : s + "Z");
}
async function verifyNearby(
  phone: string,
  plate: string,
  location: DriverLocation,
) {
  const [directory, live] = await Promise.all([
    getRows("/drivers", "GET"),
    getRows("/realtimeAll", "POST"),
  ]);
  const drivers = directory.filter(
    (row) => normalizeDriverPhone(row.driverTel) === phone,
  );
  const vehicles = live.filter(
    (row) => normalizePlate(row.VehicleNo) === plate,
  );
  if (drivers.length !== 1 || vehicles.length !== 1) return null;
  const vehicle = vehicles[0];
  const age = Date.now() - utcReport(vehicle.OperateDateUTC);
  const locAge = Date.now() - location?.timestamp;
  const accuracy = location?.accuracy;
  const radius = configured("VEHICLE_GPS_RADIUS_METERS", 150);
  if (
    !["0", "2", "10"].includes(String(vehicle.CarStatus)) ||
    !Number.isFinite(age) ||
    age < -5000 ||
    age > configured("VEHICLE_GPS_MAX_AGE_SECONDS", 180) * 1000 ||
    !Number.isFinite(locAge) ||
    locAge < -5000 ||
    locAge > 60000 ||
    !Number.isFinite(accuracy) ||
    accuracy <= 0 ||
    accuracy > radius
  )
    return null;
  const lat1 = coordinate(location.latitude, 90),
    lon1 = coordinate(location.longitude, 180);
  const lat2 = coordinate(vehicle.Latitude, 90),
    lon2 = coordinate(vehicle.Longitude, 180);
  if (
    ![lat1, lon1, lat2, lon2].every(Number.isFinite) ||
    (lat2 === 0 && lon2 === 0)
  )
    return null;
  const rad = Math.PI / 180;
  const h =
    Math.sin(((lat1 - lat2) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(((lon1 - lon2) * rad) / 2) ** 2;
  const distance = 12742000 * Math.asin(Math.min(1, Math.sqrt(h)));
  return distance + accuracy <= radius
    ? normalizeDriverPhone(drivers[0].driverTel)
    : null;
}

export async function getActiveVehicle(
  phone: string,
  plate: string,
  location?: DriverLocation,
) {
  const destination = location
    ? await verifyNearby(phone, plate, location)
    : phone;
  if (!destination) return null;
  const cargo = await getCargo(plate);
  return {
    licensePlate: plate,
    driverPhone: destination,
    active: true,
    assignmentId: createHash("sha256")
      .update(JSON.stringify([plate, cargo.cycle]))
      .digest("hex"),
    capturedAt: cargo.capturedAt,
    tripId: cargo.tripId,
    items: cargo.items,
  };
}
