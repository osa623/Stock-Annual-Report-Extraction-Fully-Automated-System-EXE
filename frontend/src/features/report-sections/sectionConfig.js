/**
 * Configuration for all report section pages.
 * Each section has a key, title, description, icon reference, and mock data.
 */

export const REPORT_SECTIONS = [
  {
    key: 'chairmans-review',
    title: "Chairman's Review",
    description: 'Extract and view the Chairman\'s statement on company performance and strategic direction.',
    category: 'Leadership Reports',
  },
  {
    key: 'managing-directors-report',
    title: "Managing Director's Report",
    description: 'Extract the MD\'s detailed operational review and business outlook.',
    category: 'Leadership Reports',
  },
  {
    key: 'mda',
    title: 'Management Discussion & Analysis',
    description: 'Extract MD&A covering financial performance, market conditions, and forward-looking statements.',
    category: 'Leadership Reports',
  },
  {
    key: 'corporate-governance',
    title: 'Corporate Governance',
    description: 'Extract governance framework, board structure, and compliance disclosures.',
    category: 'Governance & Risk',
  },
  {
    key: 'risk-management',
    title: 'Risk Management',
    description: 'Extract risk assessment frameworks, mitigation strategies, and risk appetite statements.',
    category: 'Governance & Risk',
  },
  {
    key: 'audit-committee-report',
    title: 'Audit / Risk Committee Report',
    description: 'Extract audit committee findings, internal control assessments, and oversight activities.',
    category: 'Governance & Risk',
  },
  {
    key: 'remuneration-committee',
    title: 'Remuneration Committee Report',
    description: 'Extract executive compensation policies, pay structures, and incentive frameworks.',
    category: 'Governance & Risk',
  },
  {
    key: 'related-party-transactions',
    title: 'Related Party Transactions Review Committee Report',
    description: 'Extract related party transaction disclosures, review processes, and compliance notes.',
    category: 'Governance & Risk',
  },
  {
    key: 'board-of-directors',
    title: 'Board of Directors',
    description: 'Extract director profiles, qualifications, tenure, and committee memberships.',
    category: 'Company Information',
  },
  {
    key: 'auditors-report',
    title: "Independent Auditor's Report",
    description: 'Extract audit opinion, key audit matters, and going concern assessments.',
    category: 'Financial Reports',
  },
  {
    key: 'value-added',
    title: 'Statement of Value Added',
    description: 'Extract value creation and distribution data across stakeholders.',
    category: 'Financial Reports',
  },
  {
    key: 'ten-year-summary',
    title: 'Ten-Year Statistical Summary',
    description: 'Extract historical financial metrics and performance trends over the past decade.',
    category: 'Financial Reports',
  },
  {
    key: 'investor-information',
    title: 'Investor Information',
    description: 'Extract shareholder details, stock performance, dividend history, and analyst coverage.',
    category: 'Company Information',
  },
  {
    key: 'csr-sustainability',
    title: 'CSR / Sustainability',
    description: 'Extract environmental, social, and governance (ESG) initiatives and sustainability metrics.',
    category: 'Company Information',
  },
];

export const SECTION_CATEGORIES = [
  'Leadership Reports',
  'Governance & Risk',
  'Financial Reports',
  'Company Information',
];

/**
 * Generate mock extracted data for a report section
 */
export function getMockExtractedData(sectionKey) {
  const mockDataMap = {
    'chairmans-review': [
      { id: 1, field: 'Opening Statement', value: 'Dear Shareholders, it is my pleasure to present the Annual Report for the fiscal year...', page: 4 },
      { id: 2, field: 'Performance Highlights', value: 'Revenue growth of 12.3% YoY driven by market expansion...', page: 5 },
      { id: 3, field: 'Strategic Outlook', value: 'Looking ahead, the Board remains confident in our strategic direction...', page: 6 },
    ],
    'board-of-directors': [
      { id: 1, field: 'Director Name', value: 'Mr. John Smith — Chairman, Non-Executive Director', page: 12 },
      { id: 2, field: 'Director Name', value: 'Ms. Sarah Johnson — Managing Director / CEO', page: 12 },
      { id: 3, field: 'Director Name', value: 'Mr. David Lee — Independent Non-Executive Director', page: 13 },
      { id: 4, field: 'Director Name', value: 'Dr. Amara Patel — Non-Executive Director', page: 13 },
    ],
    'ten-year-summary': [
      { id: 1, field: 'Revenue (2024)', value: 'LKR 45,230 Mn', page: 120 },
      { id: 2, field: 'Revenue (2023)', value: 'LKR 40,280 Mn', page: 120 },
      { id: 3, field: 'Net Profit (2024)', value: 'LKR 6,120 Mn', page: 120 },
      { id: 4, field: 'Net Profit (2023)', value: 'LKR 5,540 Mn', page: 120 },
      { id: 5, field: 'EPS (2024)', value: 'LKR 38.20', page: 121 },
    ],
  };

  return mockDataMap[sectionKey] || [
    { id: 1, field: 'Section Title', value: 'Extracted content will appear here after processing.', page: 1 },
    { id: 2, field: 'Key Finding', value: 'Summary data extracted from the annual report PDF.', page: 2 },
    { id: 3, field: 'Details', value: 'Additional detail paragraphs and structured data.', page: 3 },
  ];
}

export function getSectionByKey(key) {
  return REPORT_SECTIONS.find(s => s.key === key) || null;
}
