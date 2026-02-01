/**
 * Tests for the classify response parsing logic from background.js.
 * Run with: node test/parse-response.test.js
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

function parseClassifyResponse(rawResponse) {
  const output = rawResponse
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .trim();

  const last0 = output.lastIndexOf("0");
  const last1 = output.lastIndexOf("1");

  if (last0 === -1 && last1 === -1) {
    throw new Error(`Unexpected classify response: "${rawResponse}"`);
  }

  return { spam: last1 > last0 };
}

describe("parseClassifyResponse", () => {
  describe("real model outputs from logs", () => {
    it("think says spam but output is 0 → ham", () => {
      const r = parseClassifyResponse(
        '<think>The message "PMZYZ8-9W2V" looks like an automated bot message with no human content. Classifying as spam.</think>\n\n0',
      );
      assert.equal(r.spam, false);
    });

    it("think says spam-like content but output is 0 → ham", () => {
      const r = parseClassifyResponse(
        "<think>The message appears to be a summary of a news article with links, which is typical of spam content.</think>\n\n0",
      );
      assert.equal(r.spam, false);
    });

    it("think says spam content, output is 1 → spam", () => {
      const r = parseClassifyResponse(
        "<think>The message appears to be a summary of a transaction link, which is typical of spam content.</think>\n\n1",
      );
      assert.equal(r.spam, true);
    });

    it("think says not spam, output is 1 → spam", () => {
      const r = parseClassifyResponse(
        '<think>The message "Er is een pakket naar je onderweg" translates to "There is a package sent to you on your way.". This message conveys a legitimate reminder about a package, which is not indicative of spam, so I will respond with 1.</think>\n\n1',
      );
      assert.equal(r.spam, true);
    });

    it("think mentions respond with 0, output is 0 → ham", () => {
      const r = parseClassifyResponse(
        "<think>The message appears to be a styled text message with no other content, which is likely spam, so I will respond with 0.</think>\n\n0",
      );
      assert.equal(r.spam, false);
    });
  });

  describe("plain outputs without think tags", () => {
    it("bare 0 → ham", () => {
      assert.equal(parseClassifyResponse("0").spam, false);
    });

    it("bare 1 → spam", () => {
      assert.equal(parseClassifyResponse("1").spam, true);
    });

    it("0 with whitespace → ham", () => {
      assert.equal(parseClassifyResponse("  0\n").spam, false);
    });

    it("1 with whitespace → spam", () => {
      assert.equal(parseClassifyResponse("\n1  ").spam, true);
    });
  });

  describe("think block contains digits but actual output differs", () => {
    it("think contains 1 but output is 0 → ham", () => {
      const r = parseClassifyResponse(
        "<think>I will respond with 1 because it looks suspicious.</think>\n\n0",
      );
      assert.equal(r.spam, false);
    });

    it("think contains 0 but output is 1 → spam", () => {
      const r = parseClassifyResponse(
        "<think>This is not spam so I would say 0 but actually it is.</think>\n\n1",
      );
      assert.equal(r.spam, true);
    });
  });

  describe("multiple think blocks", () => {
    it("two think blocks, output is 0 → ham", () => {
      const r = parseClassifyResponse(
        "<think>First thought.</think><think>Second thought with 1.</think>\n\n0",
      );
      assert.equal(r.spam, false);
    });
  });

  describe("error cases", () => {
    it("throws on empty output after stripping think", () => {
      assert.throws(() => parseClassifyResponse("<think>Some reasoning.</think>"));
    });

    it("throws on no digits", () => {
      assert.throws(() => parseClassifyResponse("ham"));
    });

    it("throws on only text no digits", () => {
      assert.throws(() => parseClassifyResponse("this is spam"));
    });
  });
});
