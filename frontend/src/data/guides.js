// Career guides shown at /career-resources. Keep claims practical and verifiable: no statistics, no guarantees.
// The slugs here must match backend/routes/guides.js (a test checks this).
export const GUIDES = [
  {
    slug: 'resume-basics', title: 'Resume basics: what to put on one page', minutes: 4, tag: 'Resume',
    summary: 'A simple structure that recruiters can scan in under a minute.',
    sections: [
      { h: 'Start with a clear header', p: ['Your name, phone number, a professional email address, your city, and links to LinkedIn or GitHub if they show real work. Leave out your photo, date of birth and full home address.'] },
      { h: 'Lead with what matters most', p: ['If you are a fresher, put Education and Projects first. If you have work experience, put Experience first and keep Education short. Add a two-line summary only if it says something specific, such as the role you want and your strongest skills.'] },
      { h: 'Write achievements, not duties', p: ['“Built a job-search page in React with filters and pagination” tells a recruiter more than “Worked on frontend”. Start each bullet with a verb, say what you did, and add a number or outcome when you honestly have one.'] },
      { h: 'Keep it honest and tidy', list: ['One page for fewer than five years of experience; two pages at most after that.', 'Use one readable font and consistent dates.', 'List only skills you could discuss in an interview.', 'Save as PDF and name the file YourName-Role.pdf.'] },
    ],
  },
  {
    slug: 'ats-friendly-resume', title: 'Making your resume ATS-friendly', minutes: 4, tag: 'Resume',
    summary: 'Applicant tracking systems read text, not design. Here is how to keep yours readable.',
    sections: [
      { h: 'What an ATS actually does', p: ['An applicant tracking system stores resumes, extracts text such as your skills and job titles, and lets recruiters search and filter. Many companies review resumes manually as well, so write for both a machine and a person.'] },
      { h: 'Formatting that keeps your text readable', list: ['Use standard headings: Experience, Education, Skills, Projects.', 'Avoid text boxes, tables for layout, columns inside images, and headers or footers that hold key details.', 'Use a standard font and a simple bullet style.', 'Submit a text-based PDF or the format the employer asks for. A scanned image of a resume cannot be read.'] },
      { h: 'Match the job honestly', p: ['Read the job post and use the same wording for skills you genuinely have. If a post says “React.js” and you wrote “ReactJS”, use the spelling they use. Do not add skills you do not have; interviews will expose them.'] },
      { h: 'Check before you apply', p: ['The resume analyzer in your TechAbhi candidate account compares your resume with a specific job and suggests improvements. Treat its output as guidance, not a score that decides your chances.'] },
    ],
  },
  {
    slug: 'interview-preparation', title: 'How to prepare for a job interview', minutes: 5, tag: 'Interviews',
    summary: 'A practical preparation routine for the days before an interview.',
    sections: [
      { h: 'Learn about the company and the role', p: ['Read the job description line by line and note which requirements you meet. Visit the company website, understand what they sell or build, and prepare one or two thoughtful questions for them.'] },
      { h: 'Prepare answers you can say out loud', list: ['“Tell me about yourself”: a 60-second story covering your background, your strongest skills and why this role.', 'Two or three projects or experiences you can explain clearly, including what went wrong and what you learned.', 'Strengths and weaknesses that are true and specific.', 'Why you want this job, and why you are leaving your current one if you have one.'] },
      { h: 'Revise the fundamentals for your field', p: ['For technical roles, revise core concepts of the skills on your resume, and practise explaining them simply. Writing small programs by hand or on a whiteboard helps more than only reading answers.'] },
      { h: 'On the day', list: ['Test your internet, camera and microphone for online interviews, or plan your route and arrive early for in-person ones.', 'Carry copies of your resume and a notebook.', 'If you do not know an answer, say so and explain how you would find out.', 'Send a short thank-you message afterwards.'] },
    ],
  },
  {
    slug: 'fresher-job-search', title: 'A job-search plan for freshers', minutes: 5, tag: 'Freshers',
    summary: 'A step-by-step routine if you are applying for your first job.',
    sections: [
      { h: 'Pick a direction', p: ['Choose one or two roles to aim for, such as frontend developer or data analyst. A focused resume works better than one that tries to fit every job.'] },
      { h: 'Build proof of skill', list: ['Make two or three small but complete projects and explain them in your resume.', 'Put your code on GitHub with a short README.', 'Consider internships, open-source contributions or freelance work to show real-world practice.'] },
      { h: 'Apply with a routine', p: ['Set a weekly target, for example ten well-chosen applications. Tailor your resume to each role, track where you applied in a simple list, and follow up politely after a week or two if the employer gave a contact.'] },
      { h: 'Learn from each round', p: ['After every interview, note the questions you struggled with and revise them. Rejections are common at the start; improving one weak area at a time is what changes results.'] },
    ],
  },
  {
    slug: 'avoid-job-scams', title: 'How to spot and avoid job scams', minutes: 4, tag: 'Safety',
    summary: 'Warning signs of fake job offers, and what to do if something feels wrong.',
    sections: [
      { h: 'Warning signs', list: ['You are asked to pay a registration, training, security-deposit or “processing” fee. Genuine employers do not charge candidates to hire them.', 'The offer arrives before any interview, or the pay is far above normal for the role.', 'The recruiter only uses a personal email address or messaging app and avoids a company website or phone call.', 'You are pressured to decide or pay quickly.', 'You are asked for bank passwords, OTPs or copies of ID documents before an official offer.'] },
      { h: 'Verify before you share anything', list: ['Search for the company website and check that the job is listed on its official careers page.', 'Check that the email domain matches the company website.', 'Look for reviews or news about the company, and ask someone you trust.'] },
      { h: 'If you suspect a scam', p: ['Stop communicating, do not pay, and keep screenshots. If you lost money, report it to your bank immediately and file a complaint at the National Cyber Crime Reporting Portal (cybercrime.gov.in). You can also report a suspicious TechAbhi listing through our Contact page.'] },
    ],
  },
  {
    slug: 'skills-roadmap', title: 'Choosing which skills to learn next', minutes: 4, tag: 'Skills',
    summary: 'A simple way to decide what to learn so your time pays off.',
    sections: [
      { h: 'Let job posts guide you', p: ['Open ten job posts for the role you want and note the skills that appear again and again. Use the skills filter on TechAbhi’s job search to see which skills are listed most often right now.'] },
      { h: 'Go deep before you go wide', p: ['Learn the core of one stack well, for example JavaScript, React and a backend language with a database, before adding more tools. Depth is easier to show in projects and interviews.'] },
      { h: 'Learn by building', list: ['Pick a project slightly beyond your current ability.', 'Use official documentation as your main reference.', 'Write down what you learned and publish the project so others can see it.'] },
      { h: 'Keep a steady pace', p: ['Short daily practice beats occasional long sessions. Review your skills list every month and drop things you no longer use from your resume.'] },
    ],
  },
];
export const getGuide = (slug) => GUIDES.find((g) => g.slug === slug);
