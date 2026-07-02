export const uploadSlots = [
  { id: "hero", label: "封面影像" },
  { id: "portrait", label: "肖像区域" },
  { id: "mark", label: "签名标识" },
  { id: "work-one", label: "作品一" },
  { id: "work-two", label: "作品二" },
  { id: "work-three", label: "作品三" }
];

const slotIdSet = new Set(uploadSlots.map((slot) => slot.id));

export function isUploadSlot(value) {
  return typeof value === "string" && slotIdSet.has(value);
}
