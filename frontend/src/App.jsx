import { useEffect, useRef, useState } from "react";
import { buildSuggestions } from "./resumeAnalysis.js";

function Results({ result }) {
  const suggestions = buildSuggestions(result);

  return (
    <section
      id="results"
      className="results-section"
      aria-labelledby="results-heading"
    >
      <h2 id="results-heading">Analysis Results</h2>
      <div className="results-grid">
        <article className="card score-card">
          <h3>Resume Match Score</h3>
          <div className="score-ring">
            <svg
              viewBox="0 0 120 120"
              width="160"
              height="160"
              role="img"
              aria-label="Resume match score"
            >
              <circle
                className="ring-track"
                cx="60"
                cy="60"
                r="52"
                pathLength="100"
              />
              <circle
                className="ring-progress"
                cx="60"
                cy="60"
                r="52"
                pathLength="100"
                style={{ strokeDashoffset: 100 - result.score }}
              />
            </svg>
            <span className="score-value">{result.score}%</span>
          </div>
          <p className="disclaimer">
            Demo estimate only — not a professional or AI-generated evaluation.
          </p>
        </article>

        <article className="card stat-card">
          <h3>Total Skills Detected</h3>
          <p className="stat-number">{result.foundSkills.length}</p>
        </article>

        <article className="card skills-card">
          <h3>Skills Found</h3>
          <ul className="badge-list found">
            {result.foundSkills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
          {result.foundSkills.length === 0 && (
            <p className="empty-message">
              No required skills were detected in your resume.
            </p>
          )}
        </article>

        <article className="card skills-card">
          <h3>Missing Skills</h3>
          <ul className="badge-list missing">
            {result.missingSkills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
          {result.missingSkills.length === 0 && (
            <p className="empty-message">
              Great news — no required skills are missing.
            </p>
          )}
        </article>

        <article className="card suggestions-card">
          <h3>Improvement Suggestions</h3>
          <ul className="suggestions-list">
            {suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (result) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  function handleFileSelection(file) {
    if (!file) return;

    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      setSelectedFile(null);
      setError("Only PDF files are supported. Please choose a .pdf file.");
      setResult(null);
      return;
    }

    if (file.size === 0) {
      setSelectedFile(null);
      setError("This file is empty (0 bytes). Please choose a valid PDF resume.");
      setResult(null);
      return;
    }

    setSelectedFile(file);
    setError("");
    setResult(null);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelection(event.dataTransfer.files[0] || null);
  }

  async function handleAnalyze() {
    if (!selectedFile) {
      setError("Please upload a PDF resume first, then click Analyze Resume.");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Please enter a job description to compare with your resume.");
      return;
    }

    setIsAnalyzing(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("resume", selectedFile);
      formData.append("jobDescription", jobDescription);

      const response = await fetch("/api/analyses", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "The resume could not be analyzed.");
      }
      setResult(data.analysis);
    } catch (analysisError) {
      setError(
        analysisError.message ||
          "Could not reach the server. Check that the backend is running.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <>
      <header className="site-header">
        <nav className="navbar" aria-label="Main navigation">
          <a className="brand" href="#top">
            Shipped<span className="brand-accent">Resume Parser</span>
          </a>
          <ul className="nav-links">
            <li>
              <a href="#upload">Upload</a>
            </li>
            <li>
              <a href="#results">Results</a>
            </li>
            <li>
              <a href="#how-it-works">How It Works</a>
            </li>
          </ul>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <h1>Analyze Your Resume</h1>
          <p className="hero-description">
            Upload your resume as a PDF and compare its skills with a target job
            description. See the skills you have, the ones missing, and your
            demo match score.
          </p>
          <a className="cta-button" href="#upload">
            Get Started
          </a>
        </section>

        <section
          id="upload"
          className="upload-section"
          aria-labelledby="upload-heading"
        >
          <h2 id="upload-heading">Upload Your Resume</h2>

          <div
            className={`drop-zone${isDragging ? " dragover" : ""}`}
            role="button"
            tabIndex={0}
            aria-label="PDF resume upload area"
            onClick={(event) => {
              if (!event.target.closest("label")) {
                fileInputRef.current?.click();
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setIsDragging(false);
              }
            }}
            onDrop={handleDrop}
          >
            <p className="drop-zone-icon" aria-hidden="true">
              📄
            </p>
            <p className="drop-zone-text">
              <strong>Drag &amp; drop</strong> your PDF here
            </p>
            <p className="drop-zone-or">or</p>
            <label className="browse-button" htmlFor="fileInput">
              Choose PDF File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              id="fileInput"
              name="resume"
              accept="application/pdf,.pdf"
              hidden
              onChange={(event) => {
                handleFileSelection(event.target.files[0] || null);
                event.target.value = "";
              }}
            />
          </div>

          {selectedFile && (
            <p className="file-name" aria-live="polite">
              {selectedFile.name}
            </p>
          )}
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <div className="job-description">
            <label htmlFor="jobDescription">
              Target Job Description <span className="optional">(required)</span>
            </label>
            <textarea
              id="jobDescription"
              name="jobDescription"
              rows="6"
              required
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the job description here. Its recognized skills will be compared with the skills found in your resume."
            />
          </div>

          <button
            type="button"
            className="analyze-button"
            disabled={isAnalyzing}
            onClick={handleAnalyze}
          >
            Analyze Resume
          </button>

          {isAnalyzing && (
            <p className="loading" role="status">
              <span className="spinner" aria-hidden="true" />
              Analyzing your resume…
            </p>
          )}
        </section>

        {result && (
          <div ref={resultsRef}>
            <Results result={result} />
          </div>
        )}

        <section
          id="how-it-works"
          className="how-section"
          aria-labelledby="how-heading"
        >
          <h2 id="how-heading">How It Works</h2>
          <div className="steps">
            <article className="card step-card">
              <h3>1. Upload</h3>
              <p>Upload your PDF resume for server-side analysis.</p>
            </article>
            <article className="card step-card">
              <h3>2. Extract</h3>
              <p>The server extracts text from your PDF and matches its skills.</p>
            </article>
            <article className="card step-card">
              <h3>3. Match</h3>
              <p>
                Detected skills are compared against the built-in list or your
                target job description.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p>
          Shipped Resume Parser — a demo project. Analysis is rule-based; no AI
          service is involved.
        </p>
      </footer>
    </>
  );
}

export default App;
