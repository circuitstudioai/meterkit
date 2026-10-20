import { createMeterKit, setDefaultMeterKit } from "@meterkit/sdk";

const apiUrl = process.env.METERKIT_API_URL || "http://localhost:43123";

export const kit = createMeterKit({
  mode: "api",
  apiUrl,
});

setDefaultMeterKit(kit);
