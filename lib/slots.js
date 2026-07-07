export const uploadSlots = [
  { id: "portrait", label: "portrait" },
  { id: "mark", label: "mark" },
  { id: "work-one", label: "work one" },
  { id: "work-two", label: "work two" },
  { id: "work-three", label: "work three" }
];

const slotIdSet = new Set(uploadSlots.map((slot) => slot.id));

export function isUploadSlot(value) {
  return typeof value === "string" && slotIdSet.has(value);
}
