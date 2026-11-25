// Reference data for India: the 28 states and 8 union territories (after the 2020 merger of Dadra & Nagar Haveli with Daman & Diu).
export const INDIA_REGIONS = [
  ['Andhra Pradesh', 'AP', 'state'], ['Arunachal Pradesh', 'AR', 'state'], ['Assam', 'AS', 'state'], ['Bihar', 'BR', 'state'], ['Chhattisgarh', 'CG', 'state'],
  ['Goa', 'GA', 'state'], ['Gujarat', 'GJ', 'state'], ['Haryana', 'HR', 'state'], ['Himachal Pradesh', 'HP', 'state'], ['Jharkhand', 'JH', 'state'],
  ['Karnataka', 'KA', 'state'], ['Kerala', 'KL', 'state'], ['Madhya Pradesh', 'MP', 'state'], ['Maharashtra', 'MH', 'state'], ['Manipur', 'MN', 'state'],
  ['Meghalaya', 'ML', 'state'], ['Mizoram', 'MZ', 'state'], ['Nagaland', 'NL', 'state'], ['Odisha', 'OD', 'state'], ['Punjab', 'PB', 'state'],
  ['Rajasthan', 'RJ', 'state'], ['Sikkim', 'SK', 'state'], ['Tamil Nadu', 'TN', 'state'], ['Telangana', 'TS', 'state'], ['Tripura', 'TR', 'state'],
  ['Uttar Pradesh', 'UP', 'state'], ['Uttarakhand', 'UK', 'state'], ['West Bengal', 'WB', 'state'],
  ['Andaman and Nicobar Islands', 'AN', 'ut'], ['Chandigarh', 'CH', 'ut'], ['Dadra and Nagar Haveli and Daman and Diu', 'DN', 'ut'], ['Delhi', 'DL', 'ut'],
  ['Jammu and Kashmir', 'JK', 'ut'], ['Ladakh', 'LA', 'ut'], ['Lakshadweep', 'LD', 'ut'], ['Puducherry', 'PY', 'ut'],
].map(([name, code, type]) => ({ name, code, type }));

const ALIASES = { 'nct of delhi': 'Delhi', 'new delhi': 'Delhi', 'national capital territory of delhi': 'Delhi', orissa: 'Odisha', pondicherry: 'Puducherry', uttaranchal: 'Uttarakhand',
  'jammu & kashmir': 'Jammu and Kashmir', 'andaman & nicobar islands': 'Andaman and Nicobar Islands', 'andaman and nicobar': 'Andaman and Nicobar Islands',
  'dadra and nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu', 'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu', 'dadra & nagar haveli and daman & diu': 'Dadra and Nagar Haveli and Daman and Diu' };
const BY_NAME = new Map(INDIA_REGIONS.map((r) => [r.name.toLowerCase(), r.name]));
/** Canonical Indian state/UT name for a free-text value, or null. */
export const canonicalState = (v) => { const k = String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' '); return BY_NAME.get(k) || ALIASES[k] || null; };

export const REMOTE_REGIONS = ['india', 'worldwide', 'usa', 'uk', 'germany', 'canada', 'australia', 'europe', 'other'];
export const REGION_LABEL = { india: 'India', worldwide: 'Worldwide', usa: 'USA', uk: 'UK', germany: 'Germany', canada: 'Canada', australia: 'Australia', europe: 'Europe', other: 'Other countries' };

// Words that describe HOW someone works, never WHERE. They must not be stored as a city or state.
export const NOT_A_PLACE = /^(remote|wfh|work from home|work-from-home|anywhere|hybrid|online|virtual|pan india|all india)$/i;

export const CATEGORIES = ['Software Development', 'Data & Analytics', 'IT Support & Networking', 'Design', 'Banking & Finance', 'Sales & Marketing', 'Operations', 'Customer Support',
  'Human Resources', 'Engineering', 'Manufacturing', 'Healthcare', 'Education', 'Content & Writing', 'Other'];

// Dates and times for walk-in drives are Indian local time (IST, UTC+05:30, no DST).
export const istToday = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
/** Last second of an IST calendar day ('YYYY-MM-DD') as a UTC Date. */
export const istEndOfDay = (ymd) => new Date(`${ymd}T23:59:59+05:30`);
