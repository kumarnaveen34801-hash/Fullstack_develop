export function buildSuggestions(result) {
  const tips = [];

  if (result.fellBackToList) {
    tips.push(
      "None of the known skills were recognized in the job description, so the built-in skill list was used instead.",
    );
  }
  if (result.foundSkills.length === 0) {
    tips.push(
      "Add a dedicated “Skills” section listing the technologies you have actually worked with — right now none of the target skills were detected.",
    );
  }
  if (result.missingSkills.length > 0) {
    const topMissing = result.missingSkills.slice(0, 3).join(", ");
    const suffix =
      result.missingSkills.length > 3 ? ", and the other missing skills" : "";
    tips.push(`Add projects or coursework that demonstrate ${topMissing}${suffix}.`);
  }
  if (result.usedJobDescription && !result.fellBackToList) {
    tips.push(
      "Where you genuinely have the experience, use the exact skill names from the job description — screening tools often look for exact matches.",
    );
  } else if (!result.usedJobDescription) {
    tips.push(
      "Paste a real job description above and analyze again to compare your resume against that specific role.",
    );
  }
  tips.push(
    "Quantify your achievements with numbers, e.g. “reduced page load time by 40%”.",
  );

  return tips;
}
