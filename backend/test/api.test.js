import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";

test("rejects a file that is not actually a PDF without requiring MongoDB", async (t) => {
  const server = app.listen(0);
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  );
  await new Promise((resolve) => server.once("listening", resolve));

  const formData = new FormData();
  formData.append(
    "resume",
    new Blob(["not a PDF"], { type: "application/pdf" }),
    "resume.pdf",
  );
  formData.append("jobDescription", "React");

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/analyses`,
    { method: "POST", body: formData },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error:
      "This file could not be read as a PDF. Check that it is a valid, unprotected PDF.",
  });

  test("requires a non-empty job description", async (t) => {
    const server = app.listen(0);
    t.after(
      () =>
        new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    );
    await new Promise((resolve) => server.once("listening", resolve));

    const formData = new FormData();
    formData.append(
      "resume",
      new Blob(["%PDF-1.4"], { type: "application/pdf" }),
      "resume.pdf",
    );
    formData.append("jobDescription", "   ");

    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/analyses`,
      { method: "POST", body: formData },
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "A job description is required.",
    });
  });
});
