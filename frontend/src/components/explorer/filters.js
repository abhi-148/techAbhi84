// Every filter the job pages can show. A page lists the ids it wants; the API parameter is the `param` (default: id).
const LPA = [['', 'Any'], ['300000', '₹3 LPA +'], ['500000', '₹5 LPA +'], ['800000', '₹8 LPA +'], ['1200000', '₹12 LPA +'], ['2000000', '₹20 LPA +']];
export const FILTERS = {
  state: { label: 'State / UT', type: 'state' },
  city: { label: 'City', type: 'city', help: 'Start typing. Cities come from real job listings.' },
  company: { label: 'Company', type: 'text', placeholder: 'e.g. Infosys' },
  category: { label: 'Job category', type: 'select', from: 'categories' },
  sector: { label: 'IT / Non-IT', type: 'radio', options: [['', 'Any'], ['it', 'IT'], ['semi_it', 'Semi-IT'], ['non_it', 'Non-IT']] },
  employer_type: { label: 'Employer type', type: 'multi', options: [['private', 'Private'], ['mnc', 'MNC'], ['startup', 'Startup'], ['government', 'Government (verified only)']] },
  employment_type: { label: 'Employment type', type: 'multi', options: [['full-time', 'Full-time'], ['part-time', 'Part-time'], ['internship', 'Internship'], ['contract', 'Contract'], ['freelance', 'Freelance']] },
  work_mode: { label: 'Work mode', type: 'multi', options: [['onsite', 'On-site'], ['hybrid', 'Hybrid'], ['remote', 'Remote']] },
  experience_level: { label: 'Experience', type: 'radio', options: [['', 'Any'], ['fresher', 'Fresher'], ['experienced', 'Experienced'], ['0-2', '0–2 yrs'], ['2-5', '2–5 yrs'], ['5-plus', '5+ yrs']] },
  fresher: { label: 'Fresher eligible', type: 'check', checkLabel: 'Freshers can apply', value: '1' },
  min_salary: { label: 'Minimum salary (INR / year)', type: 'select', options: LPA, help: 'Applies to listings priced in INR.' },
  education: { label: 'Education', type: 'text', placeholder: 'e.g. B.Tech, MBA' },
  skills: { label: 'Skills', type: 'text', placeholder: 'e.g. React, Node.js', help: 'Separate with commas.' },
  posted_within: { label: 'Date posted', type: 'select', options: [['', 'Any time'], ['1', 'Last 24 hours'], ['3', 'Last 3 days'], ['7', 'Last 7 days'], ['30', 'Last 30 days']] },
  remote_region: { label: 'Hiring region', type: 'multi', options: [['india', 'Remote – India'], ['worldwide', 'Remote – Worldwide'], ['usa', 'Remote – USA'], ['uk', 'Remote – UK'], ['germany', 'Remote – Germany'], ['canada', 'Remote – Canada'], ['australia', 'Remote – Australia'], ['europe', 'Remote – Europe'], ['other', 'Other countries']] },
  eligibility: { label: 'Who can apply', type: 'radio', options: [['', 'Any'], ['india', 'Indian applicants'], ['worldwide', 'Worldwide applicants']], help: '“Indian applicants” = India-based roles, or worldwide roles with no work permit needed.' },
  work_auth: { label: 'Work authorization', type: 'radio', options: [['', 'Any'], ['0', 'Not required'], ['1', 'Country permit required']] },
  timezone: { label: 'Time zone', type: 'text', placeholder: 'e.g. IST, EST overlap' },
  drive_date: { label: 'Interview date', type: 'date' },
  include_remote: { label: 'Remote jobs', type: 'check', checkLabel: 'Also show Remote – India jobs', value: 'india' },
  verified: { label: 'Trust', type: 'check', checkLabel: 'Verified by TechAbhi only', value: '1' },
  featured: { label: 'Featured', type: 'check', checkLabel: 'Featured only', value: '1' },
};
export const SORTS = {
  default: [['', 'Newest first'], ['featured', 'Featured first'], ['salary', 'Highest salary'], ['deadline', 'Closing soon']],
  walk_in: [['drive_date', 'Interview date (soonest)'], ['latest', 'Newest first'], ['featured', 'Featured first']],
};
// short labels for the active-filter chips
export function chipText(id, value, ctx = {}) {
  const f = FILTERS[id]; if (!f) return `${id}: ${value}`;
  if (f.type === 'check') return f.checkLabel;
  const pick = (v) => (f.options?.find(([k]) => k === v) || [v, v])[1];
  const text = String(value).split(',').map(pick).join(', ');
  return `${ctx.label || f.label}: ${text}`;
}
