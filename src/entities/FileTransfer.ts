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
  completed_date?: string;
  error_message?: string;
  created_date: string;
}

const COLLECTION = "file_transfers";

export class FileTransfer {
  static async list(sort?: "-created_date"): Promise<FileTransferRecord[]> {
    const list = await localDb.get<FileTransferRecord[]>(COLLECTION, []);
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
  
  static async update(id: string, data: Partial<FileTransferRecord>): Promise<FileTransferRecord | null> {
    const list = await localDb.get<FileTransferRecord[]>(COLLECTION, []);
    const index = list.findIndex(record => record.id === id);
    
    if (index === -1) return null;
    
    // Update the record
    list[index] = {
      ...list[index],
      ...data
    };
    
    await localDb.set(COLLECTION, list);
    return list[index];
  }
  
  static async getById(id: string): Promise<FileTransferRecord | null> {
    const list = await localDb.get<FileTransferRecord[]>(COLLECTION, []);
    return list.find(record => record.id === id) || null;
  }
  
  static async delete(id: string): Promise<boolean> {
    const list = await localDb.get<FileTransferRecord[]>(COLLECTION, []);
    const newList = list.filter(record => record.id !== id);
    
    if (newList.length === list.length) return false;
    
    await localDb.set(COLLECTION, newList);
    return true;
  }
}
