// Titles/summaries of the career guides, used for server-rendered <head> tags and the sitemap.
// The article text lives in frontend/src/data/guides.js; a frontend test checks the two stay identical.
export const GUIDE_META = [
  {
    "slug": "resume-basics",
    "title": "Resume basics: what to put on one page",
    "summary": "A simple structure that recruiters can scan in under a minute."
  },
  {
    "slug": "ats-friendly-resume",
    "title": "Making your resume ATS-friendly",
    "summary": "Applicant tracking systems read text, not design. Here is how to keep yours readable."
  },
  {
    "slug": "interview-preparation",
    "title": "How to prepare for a job interview",
    "summary": "A practical preparation routine for the days before an interview."
  },
  {
    "slug": "fresher-job-search",
    "title": "A job-search plan for freshers",
    "summary": "A step-by-step routine if you are applying for your first job."
  },
  {
    "slug": "avoid-job-scams",
    "title": "How to spot and avoid job scams",
    "summary": "Warning signs of fake job offers, and what to do if something feels wrong."
  },
  {
    "slug": "skills-roadmap",
    "title": "Choosing which skills to learn next",
    "summary": "A simple way to decide what to learn so your time pays off."
  }
];
export const GUIDE_SLUGS = GUIDE_META.map((g) => g.slug);
