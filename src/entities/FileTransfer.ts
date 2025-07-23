import { localDb } from "@/lib/localDb";

export interface FileTransferRecord {
  id: string;
  filename: string;
  file_size: number;
  file_type: string;
  file_url?: string;
  sender_device: string;
  recipient_device: string;
  transfer_status: "pending" | "transferring" | "completed" | "failed" | "cancelled";
  transfer_speed?: number;
  completion_time?: string;
  created_date: string;
}

const COLLECTION = "file_transfers";

export class FileTransfer {
  static async list(sort?: "-created_date"): Promise<FileTransferRecord[]> {
    let list = await localDb.get<FileTransferRecord[]>(COLLECTION, []);
    if (sort === "-created_date") {
      list.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
    }
    return list;
  }

  static async create(data: Omit<FileTransferRecord, "id" | "created_date">): Promise<FileTransferRecord> {
    const list = await localDb.get<FileTransferRecord[]>(COLLECTION, []);
    const record: FileTransferRecord = {
      id: crypto.randomUUID(),
      created_date: new Date().toISOString(),
      ...data
    };
    list.push(record);
    await localDb.set(COLLECTION, list);
    return record;
  }
}
