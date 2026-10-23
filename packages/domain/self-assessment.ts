export interface CompetencyLevelDefinition {
  level: number;
  title: string;
  shortDesc: string;
  behavioralAnchor: string;
}

export interface CompetencyDimensionGuide {
  key: string;
  name: string;
  weight: number;
  weightPercent: number;
  description: string;
  guidanceQuestions: string[];
}

export const COMPETENCY_LEVEL_DEFINITIONS: CompetencyLevelDefinition[] = [
  {
    level: 1,
    title: 'Novice / Beginning',
    shortDesc: 'Requires direct, continuous guidance',
    behavioralAnchor:
      'Understands basic terminology and concepts, but needs step-by-step instructions to execute routine tasks and troubleshooting.',
  },
  {
    level: 2,
    title: 'Developing',
    shortDesc: 'Executes routine tasks with supervision',
    behavioralAnchor:
      'Can perform standard day-to-day responsibilities with periodic checks; occasionally needs assistance when encountering unusual issues or constraints.',
  },
  {
    level: 3,
    title: 'Competent',
    shortDesc: 'Independent and consistent performance',
    behavioralAnchor:
      'Handles standard workplace assignments independently, adheres to engineering practices and deadlines, and resolves typical problems reliably.',
  },
  {
    level: 4,
    title: 'Proficient',
    shortDesc: 'Proactive with minimal supervision',
    behavioralAnchor:
      'Demonstrates strong technical grasp, anticipates obstacles, communicates clearly across teams, and consistently produces high-quality deliverables.',
  },
  {
    level: 5,
    title: 'Exemplary / Mastery',
    shortDesc: 'Exceeds expectations and guides others',
    behavioralAnchor:
      'Exhibits mastery of tools and domain standards, proposes architectural or workflow improvements, and provides peer guidance.',
  },
];

export const SELF_ASSESSMENT_DIMENSIONS: CompetencyDimensionGuide[] = [
  {
    key: 'technicalSkills',
    name: 'Technical skills',
    weight: 0.35,
    weightPercent: 35,
    description:
      'Application of core academic knowledge, industry software tools, programming languages, system administration, or design methodologies in host establishment projects.',
    guidanceQuestions: [
      'How confident are you using the development frameworks or technical tools required by your host company?',
      'Can you translate task specifications into functioning code, designs, or technical artifacts with minimal errors?',
    ],
  },
  {
    key: 'problemSolving',
    name: 'Problem solving',
    weight: 0.25,
    weightPercent: 25,
    description:
      'Analytical reasoning, diagnosing bugs or workflow bottlenecks, evaluating trade-offs, and implementing systematic solutions.',
    guidanceQuestions: [
      'When an unexpected issue or failure occurs, how systematically do you isolate and troubleshoot the root cause?',
      'Do you research potential solutions and verify their viability before asking for supervisor intervention?',
    ],
  },
  {
    key: 'communication',
    name: 'Communication',
    weight: 0.2,
    weightPercent: 20,
    description:
      'Clarity in written status reports, standup participation, technical documentation, and receptive active listening with team members.',
    guidanceQuestions: [
      'Do you clearly articulate your daily progress, blockers, and questions during team meetings or in written logs?',
      'Is your documentation understandable and accessible to colleagues and supervisors?',
    ],
  },
  {
    key: 'professionalism',
    name: 'Professionalism',
    weight: 0.2,
    weightPercent: 20,
    description:
      'Work ethic, punctuality, respecting company security policies and intellectual property, and receptive handling of supervisor feedback.',
    guidanceQuestions: [
      'Do you consistently meet agreed schedule commitments and respect company workplace policies?',
      'How constructively do you integrate constructive feedback and adapt your working style?',
    ],
  },
];

export const SELF_ASSESSMENT_DISCLAIMER =
  'Student Self-Perception Report: This baseline assessment represents your reflective self-appraisal at the start of your practicum placement. It is designed to help your supervisor and university coordinator gauge your learning progression and does not constitute an official university grade or host appraisal.';
