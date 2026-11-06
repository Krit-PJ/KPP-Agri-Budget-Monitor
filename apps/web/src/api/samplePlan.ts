/**
 * ไฟล์ต้นฉบับจากสำนักงาน: แบบ คง.2 ปี 2570 ครั้งที่ 1 (data/plans/2570-DOAE-r1-kamphaengphet.xlsx)
 * ใช้เป็นแบบฟอร์มตัวอย่างให้ดาวน์โหลด และข้อมูลตั้งต้นของโหมดสาธิต — โหลดเมื่อต้องใช้เท่านั้น
 */
export const SAMPLE_PLAN_NAME = 'แบบฟอร์มนำเข้าแผน-คง2-ตัวอย่างปี2570.xlsx';

export async function samplePlanBytes(): Promise<Uint8Array<ArrayBuffer>> {
  const { default: b64 } = await import('../../../../data/plans/2570-DOAE-r1-kamphaengphet.xlsx?base64');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function downloadSamplePlan(): Promise<void> {
  const blob = new Blob([await samplePlanBytes()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = SAMPLE_PLAN_NAME;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
