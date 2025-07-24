import { localDb } from "@/lib/localDb";

export interface UserRecord {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_date: string;
  settings?: Record<string, unknown>;
}

const COLLECTION = "user_me";

export class User {
  static async me(): Promise<UserRecord> {
    let user = await localDb.get<UserRecord | null>(COLLECTION, null);
    if (!user) {
      user = {
        id: "u1",
        full_name: "Swift User",
        email: "user@example.com",
        role: "User",
        created_date: new Date().toISOString(),
        settings: {}
      };
      await localDb.set(COLLECTION, user);
    }
    return user;
  }

  static async updateMyUserData(update: Partial<UserRecord>): Promise<UserRecord> {
    const user = await this.me();
    const newUser = { ...user, ...update, settings: { ...user.settings, ...update.settings } };
    await localDb.set(COLLECTION, newUser);
    return newUser;
  }
}
