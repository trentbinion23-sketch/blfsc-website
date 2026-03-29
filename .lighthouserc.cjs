const baseUrl = process.env.LHCI_BASE_URL || "http://127.0.0.1:3000";

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      url: [`${baseUrl}/`, `${baseUrl}/events`, `${baseUrl}/contact`],
    },
    assert: {
      assertions: {
        "categories:performance": [
          "warn",
          {
            minScore: 0.75,
          },
        ],
        "categories:accessibility": [
          "error",
          {
            minScore: 0.9,
          },
        ],
        "categories:best-practices": [
          "error",
          {
            minScore: 0.9,
          },
        ],
        "categories:seo": [
          "error",
          {
            minScore: 0.9,
          },
        ],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
