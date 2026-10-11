"use strict";

/* ==========================================================================
   Shipped Resume Parser — script.js
   Vanilla JavaScript only: no backend, no AI service.

   Flow:
   1. The user picks or drops a PDF (validated, filename displayed).
   2. Clicking "Analyze Resume" extracts the PDF's text with PDF.js.
   3. The text is matched against a skill list — the skills named in the
      optional job description if one is given, otherwise the built-in list.
   4. Found skills, missing skills, and a demo match score are rendered.

   All element IDs below match index.html.
   ========================================================================== */

/* --------------------------------------------------------------------------
   PDF.js worker setup
   PDF.js parses PDFs inside a Web Worker. Point the worker at the same
   version as the main library loaded in index.html. If the CDN failed to
   load, the guard here keeps the page from crashing — analyzeResume() will
   show a friendly error instead.
   -------------------------------------------------------------------------- */
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

/* --------------------------------------------------------------------------
   Skill database
   Each skill has a display name and a case-insensitive regex. The \b word
   boundaries prevent false positives — e.g. /\bjava\b/ does NOT match inside
   "JavaScript", and /\bgit\b/ does not match inside "GitHub" or "digit".
   -------------------------------------------------------------------------- */
const SKILL_DATABASE = [
  { name: "Java",           pattern: /\bjava\b/i },
  { name: "Python",         pattern: /\bpython\b/i },
  { name: "JavaScript",     pattern: /\bjavascript\b|\bjs\b/i },
  { name: "HTML",           pattern: /\bhtml5?\b/i },
  { name: "CSS",            pattern: /\bcss3?\b/i },
  { name: "SQL",            pattern: /\bsql\b/i },
  { name: "MySQL",          pattern: /\bmysql\b/i },
  { name: "React",          pattern: /\breact(?:\.?js)?\b/i },
  { name: "Node.js",        pattern: /\bnode(?:\.?js)?\b/i },
  { name: "Git",            pattern: /\bgit\b/i },
  { name: "Data Structures", pattern: /\bdata\s+structures?\b/i },
  { name: "OOP",            pattern: /\boop\b|\bobject[-\s]oriented\b/i },
];

/* --------------------------------------------------------------------------
   DOM element handles (IDs match index.html)
   -------------------------------------------------------------------------- */
const dropZone        = document.getElementById("dropZone");
const fileInput       = document.getElementById("fileInput");
const fileNameEl      = document.getElementById("fileName");
const fileErrorEl     = document.getElementById("fileError");
const jobDescriptionEl = document.getElementById("jobDescription");
const analyzeBtn      = document.getElementById("analyzeBtn");
const loadingEl       = document.getElementById("loading");
const resultsSection  = document.getElementById("results");
const scoreCircle     = document.getElementById("scoreCircle");
const scoreValueEl    = document.getElementById("scoreValue");
const totalSkillsEl   = document.getElementById("totalSkills");
const foundSkillsEl   = document.getElementById("foundSkills");
const missingSkillsEl = document.getElementById("missingSkills");
const noFoundMsgEl    = document.getElementById("noFoundMsg");
const noMissingMsgEl  = document.getElementById("noMissingMsg");
const suggestionsEl   = document.getElementById("suggestions");

/* --------------------------------------------------------------------------
   App state
   selectedFile holds the validated File object chosen by the user.
   -------------------------------------------------------------------------- */
let selectedFile = null;

/* ==========================================================================
   File selection, validation, and reset
   ========================================================================== */

/**
 * Validate and store a newly selected file, then reset any previous results.
 * Called by both the file input and the drag-and-drop handlers.
 * @param {File|null} file
 */
function handleFileSelection(file) {
  if (!file) return; // picker was cancelled or an empty drop happened

  if (!isPdf(file)) {
    selectedFile = null;
    showFileError("Only PDF files are supported. Please choose a .pdf file.");
    fileNameEl.hidden = true;
    resetResults();
    return;
  }

  if (file.size === 0) {
    selectedFile = null;
    showFileError("This file is empty (0 bytes). Please choose a valid PDF resume.");
    fileNameEl.hidden = true;
    resetResults();
    return;
  }

  selectedFile = file;
  hideFileError();
  fileNameEl.textContent = file.name;
  fileNameEl.hidden = false;
  resetResults(); // new resume uploaded -> clear any previous analysis
}

/**
 * Check that a file is a PDF. Some browsers/OSes report an empty MIME type,
 * so the file extension is accepted as a fallback.
 * @param {File} file
 * @returns {boolean}
 */
function isPdf(file) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

/** Show a validation/read error message to the user. */
function showFileError(message) {
  fileErrorEl.textContent = message;
  fileErrorEl.hidden = false;
}

/** Hide the error message box. */
function hideFileError() {
  fileErrorEl.textContent = "";
  fileErrorEl.hidden = true;
}

/**
 * Clear the results dashboard so no stale or fake data is visible.
 * The whole section is hidden again until the next analysis completes.
 */
function resetResults() {
  resultsSection.hidden = true;
  foundSkillsEl.innerHTML = "";
  missingSkillsEl.innerHTML = "";
  suggestionsEl.innerHTML = "";
  totalSkillsEl.textContent = "0";
  scoreValueEl.textContent = "0%";
  // pathLength="100" on the SVG circle -> dashoffset 100 means 0% drawn
  scoreCircle.style.strokeDashoffset = "100";
  noFoundMsgEl.hidden = true;
  noMissingMsgEl.hidden = true;
}

/* ==========================================================================
   PDF text extraction (PDF.js, entirely in the browser)
   ========================================================================== */

/**
 * Read the File as an ArrayBuffer and extract all text with PDF.js,
 * page by page.
 * @param {File} file
 * @returns {Promise<string>} the concatenated text of every page
 */
async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    // Each item is a text fragment; joining with spaces preserves word
    // boundaries, which the skill regexes depend on.
    pageTexts.push(content.items.map((item) => item.str).join(" "));
  }

  await pdf.destroy(); // release the worker's memory for this document
  return pageTexts.join("\n");
}

/* ==========================================================================
   Skill matching
   ========================================================================== */

/**
 * Return the names of every known skill whose regex matches the text.
 * @param {string} text
 * @returns {string[]}
 */
function findSkillsInText(text) {
  return SKILL_DATABASE
    .filter((skill) => skill.pattern.test(text))
    .map((skill) => skill.name);
}

/**
 * Decide which skills are "required" for this analysis:
 * - skills mentioned in the job description, if one was pasted;
 * - the full built-in list when no job description is provided,
 *   or when the description contains none of the known skills.
 * @returns {{ required: string[], usedJobDescription: boolean, fellBackToList: boolean }}
 */
function getRequiredSkills() {
  const jdText = jobDescriptionEl.value.trim();

  if (jdText) {
    const jdSkills = findSkillsInText(jdText);
    if (jdSkills.length > 0) {
      return { required: jdSkills, usedJobDescription: true, fellBackToList: false };
    }
    return { required: allSkillNames(), usedJobDescription: true, fellBackToList: true };
  }

  return { required: allSkillNames(), usedJobDescription: false, fellBackToList: false };
}

/** All skill names, in database order. */
function allSkillNames() {
  return SKILL_DATABASE.map((skill) => skill.name);
}

/* ==========================================================================
   Analysis pipeline — runs when "Analyze Resume" is clicked
   ========================================================================== */

async function analyzeResume() {
  if (!selectedFile) {
    showFileError("Please upload a PDF resume first, then click Analyze Resume.");
    return;
  }

  if (typeof pdfjsLib === "undefined") {
    showFileError("PDF.js failed to load. Check your internet connection and reload the page.");
    return;
  }

  setAnalyzing(true);
  hideFileError();

  try {
    const resumeText = await extractTextFromPdf(selectedFile);

    // Image-only ("scanned") resumes or truly empty PDFs produce no text.
    if (!resumeText.trim()) {
      throw new Error("EMPTY_PDF");
    }

    const { required, usedJobDescription, fellBackToList } = getRequiredSkills();
    const foundSkills = findSkillsInText(resumeText).filter((name) => required.includes(name));
    const missingSkills = required.filter((name) => !foundSkills.includes(name));

    // Demo score: the percentage of required skills present in the resume.
    const score = required.length > 0
      ? Math.round((foundSkills.length / required.length) * 100)
      : 0;

    renderResults({
      score,
      foundSkills,
      missingSkills,
      usedJobDescription,
      fellBackToList,
    });
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showFileError(getFriendlyErrorMessage(error));
  } finally {
    setAnalyzing(false);
  }
}

/**
 * Turn PDF.js / app errors into messages a normal user can act on.
 * @param {Error} error
 * @returns {string}
 */
function getFriendlyErrorMessage(error) {
  if (error.message === "EMPTY_PDF") {
    return "No text could be extracted from this PDF. It may be empty, or a scanned/image-based resume — image-only PDFs are not supported in this demo.";
  }
  if (error.name === "PasswordException") {
    return "This PDF is password-protected. Please upload an unprotected copy of your resume.";
  }
  if (error.name === "InvalidPDFException") {
    return "This file could not be read as a PDF. It may be corrupted, or have a .pdf name but different contents.";
  }
  return "Sorry — the PDF could not be read. " + (error.message || "Please try a different file.");
}

/* ==========================================================================
   Rendering the results dashboard
   ========================================================================== */

/**
 * Fill in every part of the results section from real analysis output.
 * @param {{ score: number, foundSkills: string[], missingSkills: string[],
 *           usedJobDescription: boolean, fellBackToList: boolean }} result
 */
function renderResults(result) {
  // Unhide first, force a style recalculation, THEN set the target offset —
  // this is what makes the ring animate from 0 to the score on reveal.
  resultsSection.hidden = false;
  void scoreCircle.getBoundingClientRect();

  scoreValueEl.textContent = result.score + "%";
  scoreCircle.style.strokeDashoffset = String(100 - result.score);

  totalSkillsEl.textContent = String(result.foundSkills.length);

  // Green badges: skills found in the resume.
  foundSkillsEl.innerHTML = "";
  result.foundSkills.forEach((name) => foundSkillsEl.appendChild(createBadge(name)));
  noFoundMsgEl.hidden = result.foundSkills.length > 0;

  // Orange badges: required skills missing from the resume.
  missingSkillsEl.innerHTML = "";
  result.missingSkills.forEach((name) => missingSkillsEl.appendChild(createBadge(name)));
  noMissingMsgEl.hidden = result.missingSkills.length > 0;

  // Suggestions, derived from the actual result (never pre-analysis).
  suggestionsEl.innerHTML = "";
  buildSuggestions(result).forEach((tip) => suggestionsEl.appendChild(createListItem(tip)));
}

/**
 * Create one green/orange skill badge <li>.
 * @param {string} skillName
 * @returns {HTMLLIElement}
 */
function createBadge(skillName) {
  const li = document.createElement("li");
  li.textContent = skillName;
  return li;
}

/**
 * Create a suggestion <li>.
 * @param {string} text
 * @returns {HTMLLIElement}
 */
function createListItem(text) {
  const li = document.createElement("li");
  li.textContent = text;
  return li;
}

/**
 * Build the improvement suggestions from the analysis outcome.
 * Only skill names from SKILL_DATABASE are interpolated here — never raw
 * user text — so nothing untrusted is written into the DOM.
 * @param {{ foundSkills: string[], missingSkills: string[],
 *           usedJobDescription: boolean, fellBackToList: boolean }} result
 * @returns {string[]}
 */
function buildSuggestions(result) {
  const tips = [];

  if (result.fellBackToList) {
    tips.push("None of the known skills were recognized in the job description, so the built-in skill list was used instead.");
  }
  if (result.foundSkills.length === 0) {
    tips.push("Add a dedicated “Skills” section listing the technologies you have actually worked with — right now none of the target skills were detected.");
  }
  if (result.missingSkills.length > 0) {
    const topMissing = result.missingSkills.slice(0, 3).join(", ");
    const suffix = result.missingSkills.length > 3 ? ", and the other missing skills" : "";
    tips.push(`Add projects or coursework that demonstrate ${topMissing}${suffix}.`);
  }
  if (result.usedJobDescription && !result.fellBackToList) {
    tips.push("Where you genuinely have the experience, use the exact skill names from the job description — screening tools often look for exact matches.");
  } else {
    tips.push("Paste a real job description above and analyze again to compare your resume against that specific role.");
  }
  tips.push("Quantify your achievements with numbers, e.g. “reduced page load time by 40%”.");

  return tips;
}

/* ==========================================================================
   Loading & progress UI
   ========================================================================== */

/**
 * Show/hide the loading indicator and disable the analyze button while
 * an analysis is running, so it can't be triggered twice.
 * @param {boolean} isAnalyzing
 */
function setAnalyzing(isAnalyzing) {
  loadingEl.hidden = !isAnalyzing;
  analyzeBtn.disabled = isAnalyzing;
}

/* ==========================================================================
   Event wiring
   ========================================================================== */

/** Wire up all interactions. script.js is loaded with `defer`, so the DOM
 *  (and PDF.js) are ready by the time this runs. */
function init() {
  // --- Standard file picker ---
  fileInput.addEventListener("change", () => {
    handleFileSelection(fileInput.files[0] || null);
  });

  // --- Clicking anywhere in the drop zone opens the file picker,
  //     except when the click already came from the "Choose PDF File"
  //     label or the input itself (that would open the dialog twice). ---
  dropZone.addEventListener("click", (event) => {
    if (event.target.closest("label, input")) return;
    fileInput.click();
  });

  // --- Keyboard access: the zone is focusable, Enter/Space opens the picker ---
  dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });

  // --- Drag & drop ---
  dropZone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault(); // required so the browser allows a drop here
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", (event) => {
    // Ignore drags moving across child elements inside the zone.
    if (dropZone.contains(event.relatedTarget)) return;
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    const dropped = event.dataTransfer && event.dataTransfer.files[0];
    handleFileSelection(dropped || null);
  });

  // --- Analyze ---
  analyzeBtn.addEventListener("click", analyzeResume);
}

init();
