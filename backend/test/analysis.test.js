import test from "node:test";
import assert from "node:assert/strict";
import { analyzeResumeText } from "../src/analysis.js";

test("matches resume skills against skills in the job description", () => {
  const result = analyzeResumeText(
    "Built web apps with JavaScript, React, and Node.js.",
    "Looking for JavaScript, React, SQL, and Python.",
  );

  assert.deepEqual(result, {
    score: 50,
    foundSkills: ["JavaScript", "React"],
    missingSkills: ["Python", "SQL"],
    usedJobDescription: true,
    fellBackToList: false,
  });
});

test("uses the built-in skills when a job description has no recognized skills", () => {
  const result = analyzeResumeText("Python and Git", "Seeking a team player");

  assert.equal(result.score, 17);
  assert.deepEqual(result.foundSkills, ["Python", "Git"]);
  assert.equal(result.missingSkills.length, 10);
  assert.equal(result.usedJobDescription, true);
  assert.equal(result.fellBackToList, true);
});

test("falls back to built-in skills if the job description has no recognized skills", () => {
  const result = analyzeResumeText("Java and SQL", "Excellent communication skills");

  assert.deepEqual(result.foundSkills, ["Java", "SQL"]);
  assert.equal(result.usedJobDescription, true);
  assert.equal(result.fellBackToList, true);
});

test("matches Java without mistaking JavaScript for it", () => {
  const result = analyzeResumeText(
    "JavaScript engineer",
    "The role requires Java.",
  );

  assert.equal(result.score, 0);
  assert.deepEqual(result.foundSkills, []);
  assert.deepEqual(result.missingSkills, ["Java"]);
});
