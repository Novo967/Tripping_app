// app/IndexServices/MapUtils.ts

/**
 * מחשב את המרחק בין שתי נקודות גאוגרפיות באמצעות נוסחת האוורסין.
 * @param lat1 קו רוחב של נקודה 1
 * @param lon1 קו אורך של נקודה 1
 * @param lat2 קו רוחב של נקודה 2
 * @param lon2 קו אורך של נקודה 2
 * @returns המרחק בקילומטרים
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // רדיוס כדור הארץ בק"מ
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
