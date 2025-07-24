import { localDb } from "@/lib/localDb";

export type DeviceType = "phone" | "tablet" | "laptop" | "desktop" | "unknown";
export type Platform = "ios" | "android" | "windows" | "macos" | "linux" | "web";

export interface DeviceRecord {
  id: string;
  name: string;
  type: DeviceType;
  platform: Platform;
  is_online: boolean;
  last_seen: string;
  connection_status: "connected" | "connecting" | "disconnected" | "available";
  created_date: string;
}

const COLLECTION = "devices";

export class Device {
  static async list(sort?: "-last_seen"): Promise<DeviceRecord[]> {
    let list = await localDb.get<DeviceRecord[]>(COLLECTION, []);
    if (list.length === 0) {
      // seed
      const seedData: DeviceRecord[] = [
        {
          id: "d1",
          name: "Asaf's iPhone",
          type: "phone",
          platform: "android",
          is_online: true,
          last_seen: new Date().toISOString(),
          connection_status: "available",
          created_date: new Date().toISOString()
        },
        {
          id: "d2",
          name: "Work Laptop",
          type: "laptop",
          platform: "windows",
          is_online: true,
          last_seen: new Date().toISOString(),
          connection_status: "available",
          created_date: new Date().toISOString()
        },
        {
          id: "d3",
          name: "Home PC",
          type: "desktop",
          platform: "linux",
          is_online: false,
          last_seen: new Date().toISOString(),
          connection_status: "disconnected",
          created_date: new Date().toISOString()
        },
        {
          id: "d4",
          name: "iPad Pro",
          type: "tablet",
          platform: "ios",
          is_online: true,
          last_seen: new Date().toISOString(),
          connection_status: "disconnected",
          created_date: new Date().toISOString()
        },
        {
          id: "d5",
          name: "Android Phone",
          type: "phone",
          platform: "ios",
          is_online: true,
          last_seen: new Date().toISOString(),
          connection_status: "available",
          created_date: new Date().toISOString()
        }
      ];
      await localDb.set(COLLECTION, seedData);
      list = seedData;
    }
    if (sort === "-last_seen") {
      list.sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime());
    }
    return list;
  }
}
