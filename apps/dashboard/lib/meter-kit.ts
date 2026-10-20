import { CreditLedger, createMeterKit } from "@meterkit/sdk";
import { DashboardLedgerStore, DashboardPriceCatalog } from "@/lib/store";

const store = new DashboardLedgerStore(1);
const catalog = new DashboardPriceCatalog(1);
const ledger = new CreditLedger(store);

export const meterKit = createMeterKit({
  mode: "self-hosted",
  ledger,
  catalog,
});

export { ledger, catalog };
