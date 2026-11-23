// Haryana master data for farmer registration, geo-mapping and asset capture.
// Coordinates are approximate town/HQ centres (to roughly 1-2 km), good enough for a demo map,
// not survey-grade. Village coverage is limited to the programme's block towns; new villages
// are added through the wizard or the Master Data screen, never invented here.

export type LatLng = { lat: number; lng: number };

export interface DistrictMaster extends LatLng {
  name: string;
  programme: boolean; // one of the six districts with Producer Groups in this demo
}

// All 22 districts of Haryana, at district headquarters.
export const HARYANA_DISTRICTS: DistrictMaster[] = [
  { name: "Ambala", lat: 30.3782, lng: 76.7767, programme: true },
  { name: "Bhiwani", lat: 28.793, lng: 76.1397, programme: false },
  { name: "Charkhi Dadri", lat: 28.5921, lng: 76.2653, programme: false },
  { name: "Faridabad", lat: 28.4089, lng: 77.3178, programme: false },
  { name: "Fatehabad", lat: 29.5152, lng: 75.455, programme: false },
  { name: "Gurugram", lat: 28.4595, lng: 77.0266, programme: false },
  { name: "Hisar", lat: 29.1492, lng: 75.7217, programme: true },
  { name: "Jhajjar", lat: 28.6063, lng: 76.6565, programme: false },
  { name: "Jind", lat: 29.3162, lng: 76.3149, programme: false },
  { name: "Kaithal", lat: 29.8015, lng: 76.3998, programme: false },
  { name: "Karnal", lat: 29.6857, lng: 76.9905, programme: true },
  { name: "Kurukshetra", lat: 29.9695, lng: 76.8783, programme: true },
  { name: "Mahendragarh", lat: 28.0444, lng: 76.1083, programme: false },
  { name: "Nuh", lat: 28.1024, lng: 77.001, programme: false },
  { name: "Palwal", lat: 28.1487, lng: 77.332, programme: false },
  { name: "Panchkula", lat: 30.6942, lng: 76.8606, programme: false },
  { name: "Panipat", lat: 29.3909, lng: 76.9635, programme: true },
  { name: "Rewari", lat: 28.199, lng: 76.6194, programme: false },
  { name: "Rohtak", lat: 28.8955, lng: 76.6066, programme: false },
  { name: "Sirsa", lat: 29.5349, lng: 75.028, programme: true },
  { name: "Sonipat", lat: 28.9931, lng: 77.0151, programme: false },
  { name: "Yamunanagar", lat: 30.129, lng: 77.2674, programme: false },
];

// Development blocks of the six programme districts.
export const HARYANA_BLOCKS: Record<string, string[]> = {
  Karnal: ["Karnal", "Gharaunda", "Assandh", "Indri", "Nilokheri", "Nissing", "Kunjpura", "Munak"],
  Kurukshetra: ["Thanesar", "Pehowa", "Shahabad", "Ladwa", "Babain", "Ismailabad", "Pipli"],
  Sirsa: ["Sirsa", "Ellenabad", "Dabwali", "Rania", "Baragudha", "Nathusari Chopta", "Odhan"],
  Ambala: ["Ambala-I", "Ambala-II", "Barara", "Naraingarh", "Saha", "Shahzadpur"],
  Hisar: ["Hisar-I", "Hisar-II", "Barwala", "Hansi-I", "Hansi-II", "Adampur", "Agroha", "Narnaund", "Uklana"],
  Panipat: ["Panipat", "Samalkha", "Israna", "Madlauda", "Bapoli", "Sanoli Khurd"],
};

export interface VillageMaster extends LatLng {
  name: string;
  block: string;
  district: string;
}

// Villages/towns already used by the seeded farmers, with approximate coordinates.
export const HARYANA_VILLAGES: VillageMaster[] = [
  { name: "Nissing", block: "Nissing", district: "Karnal", lat: 29.785, lng: 76.79 },
  { name: "Gharaunda", block: "Gharaunda", district: "Karnal", lat: 29.537, lng: 76.971 },
  { name: "Assandh", block: "Assandh", district: "Karnal", lat: 29.521, lng: 76.604 },
  { name: "Pehowa", block: "Pehowa", district: "Kurukshetra", lat: 29.979, lng: 76.583 },
  { name: "Shahabad", block: "Shahabad", district: "Kurukshetra", lat: 30.168, lng: 76.87 },
  { name: "Ladwa", block: "Ladwa", district: "Kurukshetra", lat: 29.994, lng: 77.046 },
  { name: "Ellenabad", block: "Ellenabad", district: "Sirsa", lat: 29.453, lng: 74.66 },
  { name: "Dabwali", block: "Dabwali", district: "Sirsa", lat: 29.949, lng: 74.733 },
  { name: "Rania", block: "Rania", district: "Sirsa", lat: 29.528, lng: 74.836 },
  { name: "Naraingarh", block: "Naraingarh", district: "Ambala", lat: 30.477, lng: 77.128 },
  { name: "Barara", block: "Barara", district: "Ambala", lat: 30.207, lng: 77.042 },
  { name: "Shahzadpur", block: "Shahzadpur", district: "Ambala", lat: 30.452, lng: 77.016 },
  { name: "Barwala", block: "Barwala", district: "Hisar", lat: 29.367, lng: 75.909 },
  { name: "Hansi", block: "Hansi-I", district: "Hisar", lat: 29.102, lng: 75.963 },
  { name: "Adampur", block: "Adampur", district: "Hisar", lat: 29.278, lng: 75.463 },
  { name: "Samalkha", block: "Samalkha", district: "Panipat", lat: 29.236, lng: 77.016 },
  { name: "Israna", block: "Israna", district: "Panipat", lat: 29.276, lng: 76.85 },
  { name: "Madlauda", block: "Madlauda", district: "Panipat", lat: 29.395, lng: 76.783 },
];

export interface MandiMaster extends LatLng {
  name: string;
  district: string;
}

// Haryana APMC mandis handling fruit and vegetables, by town.
export const HARYANA_MANDIS: MandiMaster[] = [
  { name: "Karnal Mandi", district: "Karnal", lat: 29.69, lng: 76.985 },
  { name: "Taraori Mandi", district: "Karnal", lat: 29.8, lng: 76.92 },
  { name: "Gharaunda Mandi", district: "Karnal", lat: 29.54, lng: 76.965 },
  { name: "Assandh Mandi", district: "Karnal", lat: 29.525, lng: 76.6 },
  { name: "Thanesar Mandi", district: "Kurukshetra", lat: 29.965, lng: 76.85 },
  { name: "Pipli Mandi", district: "Kurukshetra", lat: 30.06, lng: 76.88 },
  { name: "Pehowa Mandi", district: "Kurukshetra", lat: 29.982, lng: 76.588 },
  { name: "Shahabad Mandi", district: "Kurukshetra", lat: 30.165, lng: 76.875 },
  { name: "Sirsa Mandi", district: "Sirsa", lat: 29.53, lng: 75.03 },
  { name: "Ellenabad Mandi", district: "Sirsa", lat: 29.456, lng: 74.665 },
  { name: "Mandi Dabwali", district: "Sirsa", lat: 29.95, lng: 74.735 },
  { name: "Kalanwali Mandi", district: "Sirsa", lat: 29.836, lng: 74.97 },
  { name: "Ambala City Mandi", district: "Ambala", lat: 30.36, lng: 76.8 },
  { name: "Ambala Cantt Mandi", district: "Ambala", lat: 30.335, lng: 76.84 },
  { name: "Barara Mandi", district: "Ambala", lat: 30.21, lng: 77.04 },
  { name: "Naraingarh Mandi", district: "Ambala", lat: 30.475, lng: 77.13 },
  { name: "Hisar Mandi", district: "Hisar", lat: 29.15, lng: 75.72 },
  { name: "Hansi Mandi", district: "Hisar", lat: 29.1, lng: 75.96 },
  { name: "Barwala Mandi", district: "Hisar", lat: 29.37, lng: 75.905 },
  { name: "Adampur Mandi", district: "Hisar", lat: 29.28, lng: 75.46 },
  { name: "Uklana Mandi", district: "Hisar", lat: 29.51, lng: 75.88 },
  { name: "Panipat Mandi", district: "Panipat", lat: 29.39, lng: 76.97 },
  { name: "Samalkha Mandi", district: "Panipat", lat: 29.235, lng: 77.015 },
  { name: "Israna Mandi", district: "Panipat", lat: 29.275, lng: 76.848 },
  { name: "Ganaur Mandi", district: "Sonipat", lat: 29.13, lng: 77.02 },
  { name: "Sonipat Mandi", district: "Sonipat", lat: 28.99, lng: 77.02 },
  { name: "Jagadhri Mandi", district: "Yamunanagar", lat: 30.17, lng: 77.3 },
  { name: "Rohtak Mandi", district: "Rohtak", lat: 28.9, lng: 76.6 },
  { name: "Gurugram (Khandsa) Mandi", district: "Gurugram", lat: 28.445, lng: 77.015 },
  { name: "Faridabad Mandi", district: "Faridabad", lat: 28.41, lng: 77.31 },
];

export type CropCategory = "Fruit" | "Vegetable" | "Spice" | "Flower" | "Mushroom";

export interface CropMaster {
  name: string;
  category: CropCategory;
  marketplace: boolean; // traded in the marketplace screens of this demo
}

// Haryana Fresh crop master: horticulture crops grown and marketed in Haryana.
export const HF_CROPS: CropMaster[] = [
  { name: "Kinnow", category: "Fruit", marketplace: true },
  { name: "Guava", category: "Fruit", marketplace: true },
  { name: "Mango", category: "Fruit", marketplace: true },
  { name: "Litchi", category: "Fruit", marketplace: false },
  { name: "Amla", category: "Fruit", marketplace: false },
  { name: "Ber", category: "Fruit", marketplace: false },
  { name: "Peach", category: "Fruit", marketplace: false },
  { name: "Pear", category: "Fruit", marketplace: false },
  { name: "Strawberry", category: "Fruit", marketplace: false },
  { name: "Papaya", category: "Fruit", marketplace: false },
  { name: "Tomato", category: "Vegetable", marketplace: true },
  { name: "Potato", category: "Vegetable", marketplace: true },
  { name: "Onion", category: "Vegetable", marketplace: true },
  { name: "Cauliflower", category: "Vegetable", marketplace: false },
  { name: "Cabbage", category: "Vegetable", marketplace: false },
  { name: "Peas", category: "Vegetable", marketplace: false },
  { name: "Okra (Bhindi)", category: "Vegetable", marketplace: false },
  { name: "Brinjal", category: "Vegetable", marketplace: false },
  { name: "Capsicum", category: "Vegetable", marketplace: false },
  { name: "Cucumber", category: "Vegetable", marketplace: false },
  { name: "Bottle Gourd", category: "Vegetable", marketplace: false },
  { name: "Bitter Gourd", category: "Vegetable", marketplace: false },
  { name: "Carrot", category: "Vegetable", marketplace: false },
  { name: "Radish", category: "Vegetable", marketplace: false },
  { name: "Muskmelon", category: "Vegetable", marketplace: false },
  { name: "Watermelon", category: "Vegetable", marketplace: false },
  { name: "Sweet Corn", category: "Vegetable", marketplace: false },
  { name: "Baby Corn", category: "Vegetable", marketplace: false },
  { name: "Green Chilli", category: "Spice", marketplace: false },
  { name: "Garlic", category: "Spice", marketplace: false },
  { name: "Coriander", category: "Spice", marketplace: false },
  { name: "Marigold", category: "Flower", marketplace: false },
  { name: "Gladiolus", category: "Flower", marketplace: false },
  { name: "Mushroom (Button)", category: "Mushroom", marketplace: false },
];

export const SEASONS_CAPTURE = ["Kharif", "Rabi", "Zaid", "Perennial (orchard)"];

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const PG_BENEFITS = ["Input supply", "Market linkage", "Training", "Credit facilitation", "Machinery access", "Other"];

export const MARKETING_CHANNELS = [
  "Producer Group (PG) / FPO",
  "APMC Mandi",
  "Commission agent (Arhtiya)",
  "Haryana Fresh outlet",
  "Apni Mandi (farmers' market)",
  "Retail chain / Institutional buyer",
  "Processor",
  "Direct to consumer",
  "Other",
];

export const STORAGE_SOURCES = ["No storage", "Own storage", "Cold storage (private)", "Cold storage (PG / Govt)", "Other"];

export const LOGISTICS_PROVIDERS = ["Own vehicle", "Hired transport", "PG arranged", "Buyer pickup", "Other"];

export const CULTIVATION_CHALLENGES = [
  "Low price / price fluctuation",
  "Pest and disease",
  "Labour availability",
  "Water scarcity",
  "High input cost",
  "Post-harvest losses",
  "Lack of cold storage",
  "Transport to market",
  "Access to credit",
  "Weather / climate",
  "Availability of farm machinery",
  "Other",
];

export const MACHINES = [
  "Tractor",
  "Mini tractor",
  "Power tiller",
  "Rotavator",
  "Power sprayer",
  "Mulcher",
  "Seed drill",
  "Potato planter",
  "Potato digger",
  "Drip system",
  "Sprinkler set",
  "Any Other",
];

export const INPUT_SOURCES = [
  "PG / FPO input shop",
  "Private dealer",
  "HAFED / IFFCO / Govt outlet",
  "Cooperative society",
  "Online",
  "Other",
];

export const INPUT_CHALLENGES = ["Availability", "Quality", "High price", "Distance", "Other"];

export const NON_FARM_INCOME = ["Dairy / livestock", "Wage labour", "Business", "Salaried job", "Pension", "Other"];

export const INCOME_BRACKETS = ["Below Rs 1 lakh", "Rs 1-3 lakh", "Rs 3-6 lakh", "Rs 6-10 lakh", "Above Rs 10 lakh"];

export const CREDIT_SOURCES = ["Commercial bank", "Cooperative bank / PACS", "Regional rural bank", "Microfinance / NBFC", "Commission agent", "Moneylender", "Other"];

export const LOAN_OUTCOMES = ["Never applied", "Approved", "Rejected", "Pending"];

export const LOAN_REJECTION_REASONS = ["Insufficient documents", "Low credit score", "No collateral", "Existing default", "Other"];

// Central and Haryana schemes relevant to horticulture farmers.
export const SCHEMES = [
  "Meri Fasal Mera Byora (MFMB) registration",
  "Bhavantar Bharpai Yojana",
  "Mukhya Mantri Bagwani Bima Yojana",
  "MIDH horticulture subsidy",
  "Per Drop More Crop (micro irrigation)",
  "Mera Pani Meri Virasat (crop diversification)",
  "PM-KISAN",
  "PM Fasal Bima Yojana",
  "Soil Health Card",
  "Kisan Credit Card (KCC)",
];

export const IRRIGATION_SOURCES = ["Canal", "Tube well", "Drip", "Sprinkler", "Farm pond / tank", "Rainfed"];

export const ASSET_TYPES = [
  "Integrated Pack House (Hub)",
  "Collection Centre (Spoke)",
  "Cold Storage",
  "Ripening Chamber",
  "Processing Unit",
  "Fulfilment Centre",
  "APMC Mandi",
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_OWNERS = ["Producer Group", "Department of Horticulture", "HSAMB", "Private", "Cooperative"];

export const ASSET_STATUSES = ["Operational", "Under construction", "Planned", "Non-functional"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

// Producer Group headquarters, at the town each PG is named after (or the district HQ).
export const PG_LOCATIONS: Record<string, LatLng & { town: string }> = {
  "PG-001": { town: "Karnal", lat: 29.6857, lng: 76.9905 },
  "PG-002": { town: "Sirsa", lat: 29.5349, lng: 75.028 },
  "PG-003": { town: "Kurukshetra", lat: 29.9695, lng: 76.8783 },
  "PG-004": { town: "Gharaunda", lat: 29.537, lng: 76.971 },
  "PG-005": { town: "Pehowa", lat: 29.979, lng: 76.583 },
  "PG-006": { town: "Ambala", lat: 30.3782, lng: 76.7767 },
  "PG-007": { town: "Naraingarh", lat: 30.477, lng: 77.128 },
  "PG-008": { town: "Hisar", lat: 29.1492, lng: 75.7217 },
  "PG-009": { town: "Barwala", lat: 29.367, lng: 75.909 },
  "PG-010": { town: "Panipat", lat: 29.3909, lng: 76.9635 },
};

// Rough bounding box of Haryana (with a small margin), used only to warn on suspect coordinates.
export const HARYANA_BOUNDS = { minLat: 27.6, maxLat: 31.0, minLng: 74.4, maxLng: 77.7 };
export const HARYANA_CENTER: LatLng = { lat: 29.2, lng: 76.2 };
