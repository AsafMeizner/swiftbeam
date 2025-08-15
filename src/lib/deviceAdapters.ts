import type { DeviceData } from '@/types';

export function completeDeviceData(
    partial: Omit<DeviceData, 'type' | 'connection_status' | 'created_date'> &
        Partial<Pick<DeviceData, 'type' | 'connection_status' | 'created_date'>>
): DeviceData {
    return {
        type: (partial as any).type ?? ('device' as any),
        connection_status: (partial as any).connection_status ?? ('unknown' as any),
        created_date: (partial as any).created_date ?? new Date().toISOString(),
        ...partial,
    };
}
