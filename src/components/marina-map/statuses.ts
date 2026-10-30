// Slip colors by status. One list, so the map, legend and side panel always agree.
export const STATUSES = [
  { key: "available", label: "Available", fill: "#43D395", text: "#10372A" },
  { key: "occupied", label: "Occupied", fill: "#2F7DF6", text: "#FFFFFF" },
  { key: "reserved", label: "Reserved", fill: "#FBD05B", text: "#3D3006" },
  { key: "maintenance", label: "Maintenance", fill: "#E5484D", text: "#FFFFFF" },
] as const;

// Used if a slip ever has a status this list doesn't know about.
const UNKNOWN_STATUS = { key: "unknown", label: "Unknown", fill: "#FFFFFF", text: "#2A2A2F" };

export function statusStyle(status: string) {
  return STATUSES.find((s) => s.key === status) ?? UNKNOWN_STATUS;
}
