const SKILL_DATABASE = [
  { name: "Java", pattern: /\bjava\b/i },
  { name: "Python", pattern: /\bpython\b/i },
  { name: "JavaScript", pattern: /\bjavascript\b|\bjs\b/i },
  { name: "HTML", pattern: /\bhtml5?\b/i },
  { name: "CSS", pattern: /\bcss3?\b/i },
  { name: "SQL", pattern: /\bsql\b/i },
  { name: "MySQL", pattern: /\bmysql\b/i },
  { name: "React", pattern: /\breact(?:\.?js)?\b/i },
  { name: "Node.js", pattern: /\bnode(?:\.?js)?\b/i },
  { name: "Git", pattern: /\bgit\b/i },
  { name: "Data Structures", pattern: /\bdata\s+structures?\b/i },
  { name: "OOP", pattern: /\boop\b|\bobject[-\s]oriented\b/i },
];

function findSkillsInText(text) {
  return SKILL_DATABASE.filter(({ pattern }) => pattern.test(text)).map(
    ({ name }) => name,
  );
}

export function analyzeResumeText(resumeText, jobDescription) {
  const jobDescriptionText = jobDescription.trim();
  const jobDescriptionSkills = findSkillsInText(jobDescriptionText);
  const usedJobDescription = true;
  const fellBackToList = jobDescriptionSkills.length === 0;
  const requiredSkills =
    jobDescriptionSkills.length > 0
      ? jobDescriptionSkills
      : SKILL_DATABASE.map(({ name }) => name);
  const resumeSkills = findSkillsInText(resumeText);
  const foundSkills = resumeSkills.filter((name) => requiredSkills.includes(name));
  const missingSkills = requiredSkills.filter((name) => !foundSkills.includes(name));

  return {
    score: requiredSkills.length
      ? Math.round((foundSkills.length / requiredSkills.length) * 100)
      : 0,
    foundSkills,
    missingSkills,
    usedJobDescription,
    fellBackToList,
  };
}
