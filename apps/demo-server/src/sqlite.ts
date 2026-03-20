/**
 * PayStream API — Local JSON Database Client
 * 
 * Provides a portable, low-dependency registry for:
 *   - Services (dynamic endpoints configured via dashboard)
 *   - Local mock metrics
 * 
 * Replaces sqlite3 to avoid native binding issues in restricted environments.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../../data.json");

export interface ServiceRecord {
  id: string;
  method: string;
  endpoint: string;
  price: string;
  token: string;
  description: string;
  status: "active" | "paused";
  merchant: string;
  created_at?: string;
}

interface DataSchema {
  services: ServiceRecord[];
}

let dataCache: DataSchema | null = null;

async function loadData(): Promise<DataSchema> {
  if (dataCache) return dataCache;
  
  try {
    const content = await fs.readFile(dbPath, "utf-8");
    dataCache = JSON.parse(content);
    return dataCache!;
  } catch (err) {
    // Initial data if file doesn't exist
    const demoMerchant = process.env.MERCHANT_ADDRESS || "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    const initialData: DataSchema = {
      services: [
        { 
          id: "svc_default_1", 
          method: "GET", 
          endpoint: "/api/ai/generate", 
          price: "10000 µSTX", 
          token: "STX", 
          description: "AI text generation text", 
          status: "active", 
          merchant: demoMerchant,
          created_at: new Date().toISOString()
        },
        { 
          id: "svc_default_2", 
          method: "GET", 
          endpoint: "/api/content/:id", 
          price: "5000 µSTX", 
          token: "STX", 
          description: "Premium article content", 
          status: "active", 
          merchant: demoMerchant,
          created_at: new Date().toISOString()
        },
        { 
          id: "svc_default_3", 
          method: "POST", 
          endpoint: "/api/compute/submit", 
          price: "100000 µSTX", 
          token: "STX", 
          description: "GPU compute job submission", 
          status: "active", 
          merchant: demoMerchant,
          created_at: new Date().toISOString()
        },
        { 
          id: "svc_default_4", 
          method: "GET", 
          endpoint: "/api/swap/quote", 
          price: "1000 µSTX", 
          token: "STX", 
          description: "Bitflow DEX swap quote", 
          status: "active", 
          merchant: demoMerchant,
          created_at: new Date().toISOString()
        }
      ]
    };
    await saveData(initialData);
    dataCache = initialData;
    return dataCache;
  }
}

async function saveData(data: DataSchema) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), "utf-8");
  dataCache = data;
}

export async function createService(data: Omit<ServiceRecord, "id">): Promise<ServiceRecord> {
  const store = await loadData();
  const id = `svc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const newService: ServiceRecord = { 
    id, 
    ...data, 
    created_at: new Date().toISOString() 
  };
  
  store.services.push(newService);
  await saveData(store);
  return newService;
}

export async function getServices(merchant: string): Promise<ServiceRecord[]> {
  const store = await loadData();
  return store.services
    .filter(s => s.merchant === merchant)
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
}

export async function getServiceByEndpoint(endpoint: string, merchant: string): Promise<ServiceRecord | undefined> {
  const store = await loadData();
  // Simple match for demo, can be improved with regex if needed
  return store.services.find(s => s.endpoint === endpoint && s.merchant === merchant);
}

export async function updateServiceStatus(id: string, merchant: string, status: "active" | "paused"): Promise<boolean> {
  const store = await loadData();
  const index = store.services.findIndex(s => s.id === id && s.merchant === merchant);
  if (index === -1) return false;
  
  store.services[index].status = status;
  await saveData(store);
  return true;
}

export async function deleteService(id: string, merchant: string): Promise<boolean> {
  const store = await loadData();
  const initialLength = store.services.length;
  store.services = store.services.filter(s => !(s.id === id && s.merchant === merchant));
  
  if (store.services.length !== initialLength) {
    await saveData(store);
    return true;
  }
  return false;
}

// Dummy for backward compatibility with getDb if needed
export async function getDb() {
  return {
    get: async () => ({ count: (await loadData()).services.length }),
    run: async () => {},
    all: async () => (await loadData()).services,
    exec: async () => {}
  };
}
