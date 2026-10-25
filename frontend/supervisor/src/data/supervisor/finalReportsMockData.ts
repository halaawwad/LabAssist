// Mock data for the Supervisor "Final Reports" page. Each team's graduation report is generated from a
// compact spec into pages that follow the An-Najah National University graduation report layout
// (front matter in roman numerals, then numbered chapters). Shaped so it can be replaced by API data later.
import cropBotImage from '../../assets/supervisor-progress-chassis-assembly.jpg'
import greenhouseImage from '../../assets/supervisor-project-greenhouse.png'
import irrigationImage from '../../assets/supervisor-project-irrigation.jpg'
import robotImage from '../../assets/supervisor-project-robot.png'
import wearableImage from '../../assets/supervisor-project-wearable.jpg'
import weatherImage from '../../assets/supervisor-project-weather.png'

export type FinalReportStatus = 'draft' | 'submitted' | 'revision' | 'approved'

/** Also the translation key under `sections.` in the page labels. */
export type ReportSectionId =
  | 'cover'
  | 'dedication'
  | 'acknowledgment'
  | 'disclaimer'
  | 'contents'
  | 'figures'
  | 'tables'
  | 'abbreviations'
  | 'abstract'
  | 'introduction'
  | 'background'
  | 'methodology'
  | 'results'
  | 'discussion'
  | 'conclusions'
  | 'references'

/** Also the translation key under `criteria.` in the page labels. */
export type AbetCriterionId =
  | 'problem'
  | 'objectives'
  | 'requirements'
  | 'constraints'
  | 'architecture'
  | 'implementation'
  | 'verification'
  | 'results'
  | 'discussion'
  | 'conclusions'
  | 'references'

export type ReportBlock =
  | { id: string; kind: 'heading'; text: string }
  | { id: string; kind: 'paragraph'; text: string }
  | { id: string; kind: 'list'; items: string[]; ordered?: boolean }
  | { id: string; kind: 'table'; caption: string; head: string[]; rows: string[][] }
  | { id: string; kind: 'figure'; caption: string; image: string }
  | { id: string; kind: 'entries'; entries: { label: string; page: string; level: 1 | 2 }[] }
  | { id: string; kind: 'definitions'; entries: [string, string][] }

export type ReportPage = {
  id: string
  section: ReportSectionId
  /** Printed page number: roman numerals for the front matter, arabic for chapters, empty on the cover. */
  number: string
  /** Large centered title, e.g. "DEDICATION" or "1 INTRODUCTION". */
  title?: string
  blocks: ReportBlock[]
}

export type Slide = {
  id: string
  layout: 'title' | 'bullets' | 'blocks' | 'table' | 'closing'
  title: string
  subtitle?: string
  items?: string[]
  table?: { head: string[]; rows: string[][] }
}

export type ReportStudent = { name: string; id: string }

/** One uploaded PDF version of the final report. Supervisors review it; they never change its content. */
export type ReportSubmission = {
  version: string
  fileName: string
  /** Local date and time of the upload (YYYY-MM-DDTHH:mm), or null for a working draft. */
  submittedAt: string | null
  fileSizeMb: number
  pageCount: number
  status: FinalReportStatus
  /** Date the supervisor approved this version or requested a revision (YYYY-MM-DD). */
  reviewedAt: string | null
}

/** The uploaded presentation PDF (view only, outside the approval workflow). */
export type PresentationFile = {
  fileName: string
  submittedAt: string
  fileSizeMb: number
  pageCount: number
}

export type FinalReportFeedback = {
  id: string
  text: string
  date: string
  /** Report version the feedback was written for. */
  version: string
  kind: 'comment' | 'revision' | 'approval'
}

export type FinalReportProject = {
  id: string
  name: string
  code: string
  image: string
  students: ReportStudent[]
  year: string
  pages: ReportPage[]
  slides: Slide[]
  presentationFile: PresentationFile
  /** Report page that best evidences each criterion (used to jump from the checklist). */
  criterionPages: Record<AbetCriterionId, string>
}

/** Review state of a team's final report; kept separately from the static PDF content. */
export type FinalReportReview = {
  id: string
  /** Uploaded PDF versions, oldest first. The last one is the version under review. */
  submissions: ReportSubmission[]
  /** Criteria the current PDF does not cover yet. The supervisor can override each one. */
  missing: AbetCriterionId[]
  criteria: Partial<Record<AbetCriterionId, boolean>>
  feedback: FinalReportFeedback[]
}

export const abetCriteria: AbetCriterionId[] = [
  'problem',
  'objectives',
  'requirements',
  'constraints',
  'architecture',
  'implementation',
  'verification',
  'results',
  'discussion',
  'conclusions',
  'references',
]

export const reportSectionOrder: ReportSectionId[] = [
  'cover',
  'dedication',
  'acknowledgment',
  'disclaimer',
  'contents',
  'figures',
  'tables',
  'abbreviations',
  'abstract',
  'introduction',
  'background',
  'methodology',
  'results',
  'discussion',
  'conclusions',
  'references',
]

type ProjectSpec = {
  id: string
  name: string
  code: string
  image: string
  students: ReportStudent[]
  department: string
  presentationSizeMb: number
  /** Upload of the presentation PDF (YYYY-MM-DDTHH:mm). */
  presentationAt: string
  abstract: string[]
  background: string
  problem: string
  objectives: string[]
  requirements: string[]
  constraints?: string[]
  previousWork: string[]
  architecture: string
  subsystems: string[]
  components: [string, string][]
  implementation?: string[]
  parameters?: [string, string][]
  verification?: [string, string][]
  results?: string
  discussion?: string[]
  limitations?: string[]
  conclusion?: string
  future?: string[]
  references: string[]
  abbreviations: [string, string][]
}

const inProgress = (what: string) =>
  `[Section in progress — the team will add ${what} before the final submission.]`

function buildPages(spec: ProjectSpec): ReportPage[] {
  const p = (suffix: string) => `${spec.id}-${suffix}`
  const tables = [
    `Main ${spec.name} hardware components and their functions.`,
    spec.parameters ? `Main control parameters used in the ${spec.name} experiments.` : null,
    spec.verification ? 'Verification of the main functional requirements.' : null,
  ].filter((caption): caption is string => caption !== null)
  const figures = [`Complete ${spec.name} prototype.`]

  const body: ReportPage[] = [
    {
      id: p('intro-1'),
      section: 'introduction',
      number: '1',
      title: '1   INTRODUCTION',
      blocks: [
        { id: p('h-1-1'), kind: 'heading', text: '1.1   General Background' },
        { id: p('background'), kind: 'paragraph', text: spec.background },
        { id: p('h-1-2'), kind: 'heading', text: '1.2   Problem Statement' },
        { id: p('problem'), kind: 'paragraph', text: spec.problem },
      ],
    },
    {
      id: p('intro-2'),
      section: 'introduction',
      number: '2',
      blocks: [
        { id: p('h-1-3'), kind: 'heading', text: '1.3   Project Objectives' },
        {
          id: p('objectives-lead'),
          kind: 'paragraph',
          text: `The main objective of ${spec.name} is to design and implement a working prototype that addresses the stated problem with limited human intervention. The specific objectives are:`,
        },
        { id: p('objectives'), kind: 'list', items: spec.objectives, ordered: true },
        { id: p('h-1-4'), kind: 'heading', text: '1.4   Engineering Requirements' },
        { id: p('requirements'), kind: 'list', items: spec.requirements, ordered: true },
      ],
    },
    {
      id: p('background-1'),
      section: 'background',
      number: '5',
      title: '2   THEORETICAL BACKGROUND & PREVIOUS WORK',
      blocks: [
        { id: p('h-2-1'), kind: 'heading', text: '2.1   Theoretical Background' },
        { id: p('previous-1'), kind: 'paragraph', text: spec.previousWork[0] },
        { id: p('h-2-2'), kind: 'heading', text: '2.2   Previous Work and Engineering Gap' },
        { id: p('previous-2'), kind: 'paragraph', text: spec.previousWork[1] },
      ],
    },
    {
      id: p('method-1'),
      section: 'methodology',
      number: '8',
      title: '3   METHODOLOGY & SYSTEM DESIGN',
      blocks: [
        { id: p('h-3-1'), kind: 'heading', text: '3.1   Design Constraints' },
        spec.constraints
          ? { id: p('constraints'), kind: 'list', items: spec.constraints }
          : { id: p('constraints'), kind: 'paragraph', text: inProgress('the design constraints') },
        { id: p('h-3-2'), kind: 'heading', text: '3.2   System Architecture' },
        { id: p('architecture'), kind: 'paragraph', text: spec.architecture },
        { id: p('subsystems'), kind: 'list', items: spec.subsystems },
      ],
    },
    {
      id: p('method-2'),
      section: 'methodology',
      number: '11',
      blocks: [
        { id: p('figure-1'), kind: 'figure', caption: `Figure 1: ${figures[0]}`, image: spec.image },
        { id: p('h-3-3'), kind: 'heading', text: '3.3   Hardware Summary' },
        {
          id: p('table-1'),
          kind: 'table',
          caption: `Table 1: ${tables[0]}`,
          head: ['No.', 'Component', 'Main Function'],
          rows: spec.components.map(([component, use], index) => [String(index + 1), component, use]),
        },
      ],
    },
    {
      id: p('method-3'),
      section: 'methodology',
      number: '14',
      blocks: [
        { id: p('h-3-4'), kind: 'heading', text: '3.4   Implementation' },
        ...(spec.implementation ?? [inProgress('the implementation details')]).map(
          (text, index): ReportBlock => ({ id: p(`implementation-${index + 1}`), kind: 'paragraph', text }),
        ),
      ],
    },
    {
      id: p('results-1'),
      section: 'results',
      number: '18',
      title: '4   RESULTS AND ANALYSIS',
      blocks: [
        { id: p('h-4-1'), kind: 'heading', text: '4.1   Introduction' },
        {
          id: p('results-intro'),
          kind: 'paragraph',
          text: spec.results ?? inProgress('the experimental results'),
        },
        ...(spec.parameters
          ? [
              { id: p('h-4-2'), kind: 'heading', text: '4.2   Main Control Parameters' } as ReportBlock,
              {
                id: p('table-2'),
                kind: 'table',
                caption: `Table 2: ${tables[1]}`,
                head: ['Parameter', 'Value'],
                rows: spec.parameters,
              } as ReportBlock,
            ]
          : []),
      ],
    },
    {
      id: p('results-2'),
      section: 'results',
      number: '21',
      blocks: [
        { id: p('h-4-3'), kind: 'heading', text: '4.3   Requirements Verification' },
        spec.verification
          ? {
              id: p('table-3'),
              kind: 'table',
              caption: `Table ${tables.length}: ${tables[tables.length - 1]}`,
              head: ['Requirement', 'Status'],
              rows: spec.verification,
            }
          : { id: p('verification'), kind: 'paragraph', text: inProgress('the requirements verification table') },
      ],
    },
    {
      id: p('discussion-1'),
      section: 'discussion',
      number: '24',
      title: '5   DISCUSSION',
      blocks: [
        { id: p('h-5-1'), kind: 'heading', text: '5.1   Findings and Trade-offs' },
        ...(spec.discussion ?? [inProgress('the discussion of findings and trade-offs')]).map(
          (text, index): ReportBlock => ({ id: p(`discussion-${index + 1}`), kind: 'paragraph', text }),
        ),
        { id: p('h-5-2'), kind: 'heading', text: '5.2   System Limitations' },
        spec.limitations
          ? { id: p('limitations'), kind: 'list', items: spec.limitations }
          : { id: p('limitations'), kind: 'paragraph', text: inProgress('the system limitations') },
      ],
    },
    {
      id: p('conclusions-1'),
      section: 'conclusions',
      number: '27',
      title: '6   CONCLUSIONS & RECOMMENDATIONS',
      blocks: [
        { id: p('h-6-1'), kind: 'heading', text: '6.1   Conclusion' },
        { id: p('conclusion'), kind: 'paragraph', text: spec.conclusion ?? inProgress('the conclusion') },
        { id: p('h-6-2'), kind: 'heading', text: '6.2   Future Recommendations' },
        spec.future
          ? { id: p('future'), kind: 'list', items: spec.future }
          : { id: p('future'), kind: 'paragraph', text: inProgress('the future work recommendations') },
      ],
    },
    {
      id: p('references-1'),
      section: 'references',
      number: '29',
      title: 'REFERENCES',
      blocks: [{ id: p('references'), kind: 'list', items: spec.references, ordered: true }],
    },
  ]

  const contents = body.flatMap((page) => [
    ...(page.title ? [{ label: page.title.replace(/\s+/g, ' '), page: page.number, level: 1 as const }] : []),
    ...page.blocks
      .filter((block) => block.kind === 'heading')
      .map((block) => ({ label: block.text.replace(/\s+/g, ' '), page: page.number, level: 2 as const })),
  ])
  const supervisorLine = 'Graduation project submitted in partial fulfillment of the requirements for the degree of B.Sc.'

  const front: ReportPage[] = [
    { id: p('cover'), section: 'cover', number: '', blocks: [] },
    {
      id: p('dedication'),
      section: 'dedication',
      number: 'i',
      title: 'DEDICATION',
      blocks: [
        {
          id: p('dedication-1'),
          kind: 'paragraph',
          text: 'To our parents, whose patience and encouragement carried us through every stage of this work, and to our families for their constant support.',
        },
        {
          id: p('dedication-2'),
          kind: 'paragraph',
          text: 'To our friends and colleagues who shared the long laboratory hours with us, and to everyone who believed this project could be completed.',
        },
      ],
    },
    {
      id: p('acknowledgment'),
      section: 'acknowledgment',
      number: 'ii',
      title: 'ACKNOWLEDGMENT',
      blocks: [
        {
          id: p('acknowledgment-1'),
          kind: 'paragraph',
          text: 'We would like to thank our supervisor for the guidance, constructive feedback and continuous follow-up provided throughout the development of this project.',
        },
        {
          id: p('acknowledgment-2'),
          kind: 'paragraph',
          text: `We also thank the ${spec.department} Department and the Faculty of Engineering and Information Technology for providing the laboratories and resources needed to complete this work.`,
        },
      ],
    },
    {
      id: p('disclaimer'),
      section: 'disclaimer',
      number: 'iii',
      title: 'DISCLAIMER',
      blocks: [
        {
          id: p('disclaimer-1'),
          kind: 'paragraph',
          text: `This report was prepared as part of the academic requirements for the Bachelor's degree in ${spec.department} at An-Najah National University.`,
        },
        {
          id: p('disclaimer-2'),
          kind: 'paragraph',
          text: 'The project was developed as an academic prototype using the available hardware, software, time and resources. Its performance may vary with operating and environmental conditions.',
        },
      ],
    },
    {
      id: p('contents'),
      section: 'contents',
      number: 'iv',
      title: 'TABLE OF CONTENTS',
      blocks: [{ id: p('contents-list'), kind: 'entries', entries: contents }],
    },
    {
      id: p('figures'),
      section: 'figures',
      number: 'v',
      title: 'LIST OF FIGURES',
      blocks: [
        {
          id: p('figures-list'),
          kind: 'entries',
          entries: figures.map((label, index) => ({ label: `${index + 1}   ${label}`, page: '11', level: 2 as const })),
        },
      ],
    },
    {
      id: p('tables'),
      section: 'tables',
      number: 'vi',
      title: 'LIST OF TABLES',
      blocks: [
        {
          id: p('tables-list'),
          kind: 'entries',
          entries: tables.map((label, index) => ({
            label: `${index + 1}   ${label}`,
            page: ['11', '18', '21'][index] ?? '21',
            level: 2 as const,
          })),
        },
      ],
    },
    {
      id: p('abbreviations'),
      section: 'abbreviations',
      number: 'vii',
      title: 'LIST OF ABBREVIATIONS',
      blocks: [{ id: p('abbreviations-list'), kind: 'definitions', entries: spec.abbreviations }],
    },
    {
      id: p('abstract'),
      section: 'abstract',
      number: 'viii',
      title: 'ABSTRACT',
      blocks: [
        ...spec.abstract.map(
          (text, index): ReportBlock => ({ id: p(`abstract-${index + 1}`), kind: 'paragraph', text }),
        ),
        { id: p('abstract-note'), kind: 'paragraph', text: supervisorLine },
      ],
    },
  ]

  return [...front, ...body]
}

function buildSlides(spec: ProjectSpec): Slide[] {
  const s = (suffix: string) => `${spec.id}-slide-${suffix}`
  return [
    {
      id: s('title'),
      layout: 'title',
      title: spec.name,
      subtitle: `Graduation Project · ${spec.students.map((student) => student.name).join(' · ')}`,
    },
    {
      id: s('problem'),
      layout: 'bullets',
      title: 'Problem Statement',
      items: spec.problem
        .split('. ')
        .slice(0, 3)
        .map((sentence) => (sentence.endsWith('.') ? sentence : `${sentence}.`)),
    },
    { id: s('objectives'), layout: 'bullets', title: 'Project Objectives', items: spec.objectives.slice(0, 5) },
    { id: s('architecture'), layout: 'blocks', title: 'System Architecture', items: spec.subsystems.slice(0, 6) },
    {
      id: s('hardware'),
      layout: 'table',
      title: 'Hardware Components',
      table: { head: ['Component', 'Main Function'], rows: spec.components.slice(0, 6) },
    },
    spec.verification
      ? {
          id: s('results'),
          layout: 'table',
          title: 'Results & Requirements Verification',
          table: { head: ['Requirement', 'Status'], rows: spec.verification.slice(0, 6) },
        }
      : { id: s('results'), layout: 'bullets', title: 'Results', items: ['Integrated testing is in progress.', 'Subsystem tests completed for the main hardware modules.'] },
    {
      id: s('future'),
      layout: 'bullets',
      title: 'Limitations & Future Work',
      items:
        spec.limitations || spec.future
          ? [...(spec.limitations ?? []).slice(0, 2), ...(spec.future ?? []).slice(0, 3)]
          : ['Limitations and future work will be defined after integrated testing.'],
    },
    { id: s('closing'), layout: 'closing', title: 'Thank You', subtitle: 'Questions & Discussion' },
  ]
}

const sharedReferences = [
  'Arduino, "Arduino Documentation: Hardware, Software and Programming," Arduino Documentation.',
  'Raspberry Pi Foundation, "Raspberry Pi Documentation," Raspberry Pi Documentation.',
  'Espressif Systems, "ESP8266 / ESP32 Technical Reference Manual," Espressif Documentation.',
]

const specs: ProjectSpec[] = [
  {
    id: 'cropbot',
    name: 'CropBot',
    code: 'CPE-590',
    image: cropBotImage,
    students: [
      { name: 'Noor Owaissi', id: '12217844' },
      { name: 'Hala Awwad', id: '12217669' },
    ],
    department: 'Computer Engineering',
    presentationSizeMb: 6.8,
    presentationAt: '2026-10-15T14:25',
    abstract: [
      'CropBot is a smart agricultural robot that automates plant detection and targeted pesticide spraying while reducing unnecessary pesticide use and manual intervention. The system integrates mobile robotics, computer vision, embedded control, sensing and automated liquid management.',
      'An OAK-D camera provides visual and depth information for local YOLO-based plant detection on a Raspberry Pi, while an Arduino handles low-level movement and an ESP8266 controls spraying, tank refilling and irrigation. The prototype supports indoor and outdoor operating modes under controlled conditions.',
    ],
    background:
      'Many agricultural operations still rely on manual labor, particularly repetitive tasks such as pesticide spraying. Advances in mobile robotics, computer vision and embedded systems now allow robots to perceive their environment and perform such tasks automatically, improving efficiency and reducing unnecessary human effort.',
    problem:
      'Traditional pesticide spraying applies chemicals over large areas, including areas where no target plant is present. This wastes pesticide and requires significant time and physical effort. An automated system is needed that identifies plants and activates spraying only when a target is detected, while moving safely in its environment.',
    objectives: [
      'Design a mobile robotic platform capable of controlled movement in the operating environment.',
      'Develop plant detection using the OAK-D camera and a YOLO-based model running locally.',
      'Use detection results to guide robot movement, alignment and targeted spraying.',
      'Implement obstacle detection and avoidance using ultrasonic sensing.',
      'Integrate pesticide spraying, liquid-level monitoring, automatic refilling and irrigation.',
    ],
    requirements: [
      'The robot shall perform controlled forward, backward and turning movements.',
      'The system shall detect plants using the onboard camera and AI model without cloud processing.',
      'The robot shall detect and respond to obstacles within 10 cm ± 2.5 cm.',
      'The system shall monitor the pesticide tank level and support automatic refilling.',
    ],
    constraints: [
      'Computational: real-time inference must run locally on a Raspberry Pi 4 (4 GB).',
      'Mechanical: limited chassis space and robot size reduce indoor maneuverability.',
      'Electrical: motors, pumps and controllers require separate regulated power paths.',
      'Safety: the robot must stop when an obstacle is detected; high-power loads are relay-isolated.',
    ],
    previousWork: [
      'YOLO ("You Only Look Once") is a deep-learning method for real-time object detection that returns the class, confidence and bounding box of each detected object. Depth cameras such as the OAK-D add distance information that helps a robot approach a detected target.',
      'Previous studies demonstrated YOLO-based plant detection and selective spraying with notable reductions in agrochemical use. However, many systems focus on a single function. CropBot integrates detection, distance estimation, movement, alignment and targeted spraying in one prototype.',
    ],
    architecture:
      'CropBot uses three controllers with separated responsibilities: the Raspberry Pi performs vision and AI processing, the Arduino Uno performs low-level robot control and sensor interfacing, and the ESP8266 operates the external liquid-management station. The main functional blocks are:',
    subsystems: [
      'Vision and AI subsystem',
      'Mobile movement subsystem',
      'Sensor subsystem',
      'Camera positioning subsystem',
      'Pesticide spraying subsystem',
      'Refill and irrigation station',
    ],
    components: [
      ['Raspberry Pi 4 Model B', 'AI and camera processing'],
      ['Arduino Uno', 'Low-level robot control'],
      ['ESP8266', 'External liquid-system control'],
      ['Luxonis OAK-D', 'Plant detection and depth sensing'],
      ['L298N + 4 DC motors', 'Robot movement'],
      ['HC-SR04 sensors', 'Obstacle and liquid-level detection'],
      ['MPU6050', 'Motion and orientation sensing'],
    ],
    implementation: [
      'The Raspberry Pi application acquires frames from the OAK-D camera, runs the YOLO model and sends movement commands to the Arduino over USB serial at 9600 baud. A detection must be confirmed for 5 s before the spraying sequence starts.',
      'In outdoor mode the stepper motor scans with 12° increments up to 50°, and the robot corrects its heading by 8–15°. Short movements are time based: 0.70 s for 5 cm and 1.30 s for 10 cm. The spraying pump runs for 3.3 s once alignment and approach are complete.',
    ],
    parameters: [
      ['Target approach distance', '10 cm'],
      ['Ultrasonic distance tolerance', '± 2.5 cm'],
      ['Plant confirmation time', '5 s'],
      ['Stepper search increment', '12°'],
      ['Spraying duration', '3.3 s'],
      ['Serial baud rate', '9600 baud'],
    ],
    verification: [
      ['Directional movement and turning', 'Verified'],
      ['Obstacle detection', 'Verified'],
      ['Plant detection and confirmation', 'Verified'],
      ['Selective spraying', 'Verified'],
      ['Automatic refilling', 'Verified'],
      ['Integrated operation', 'Verified'],
    ],
    results:
      'The prototype was evaluated progressively, from individual components to subsystems and finally integrated operation. Most numerical values reported here are implemented control parameters rather than independently measured performance metrics.',
    discussion: [
      'Distributing the work across three controllers kept the AI processing separate from real-time motor control and allowed the liquid station to operate independently of the robot.',
      'A rotating camera mechanism increased mechanical complexity but provided a wider observation range than a fixed camera, which was essential for outdoor plant searching.',
    ],
    limitations: [
      'Detection accuracy depends on lighting, plant appearance and background complexity.',
      'Time-based movement varies with surface traction and battery voltage.',
    ],
    conclusion:
      'CropBot demonstrates the feasibility of combining local AI, robotics, sensing and automated liquid management in one agricultural platform for selective pesticide spraying.',
    references: [
      'J. Redmon, S. Divvala, R. Girshick, and A. Farhadi, "You Only Look Once: Unified, Real-Time Object Detection," in Proc. IEEE CVPR, pp. 779–788, 2016.',
      'F. E. Nasir et al., "Precision agricultural robotic sprayer with real-time Tobacco recognition and spraying system based on deep learning," PLOS ONE, vol. 18, no. 3, 2023.',
      'X. Li et al., "Design of field real-time target spraying system based on improved YOLOv5," Frontiers in Plant Science, 2022.',
      'Luxonis, "OAK-D and DepthAI Documentation," Luxonis Documentation.',
      ...sharedReferences,
    ],
    abbreviations: [
      ['AI', 'Artificial Intelligence'],
      ['DC', 'Direct Current'],
      ['GPIO', 'General Purpose Input/Output'],
      ['OAK-D', 'OpenCV AI Kit — Depth Camera'],
      ['PWM', 'Pulse Width Modulation'],
      ['YOLO', 'You Only Look Once'],
    ],
  },
  {
    id: 'delivery-robot',
    name: 'Autonomous Delivery Robot',
    code: 'EE-402',
    image: robotImage,
    students: [
      { name: 'Lina Hasan', id: '12113021' },
      { name: 'Yazan Khalil', id: '12112876' },
      { name: 'Khaled Salameh', id: '12113390' },
    ],
    department: 'Electrical Engineering',
    presentationSizeMb: 7.4,
    presentationAt: '2026-10-20T10:10',
    abstract: [
      'This project presents an autonomous indoor delivery robot that transports small items between offices along mapped corridors. The robot combines wheel odometry, an IMU and a 2D LiDAR to localize itself and plan collision-free paths.',
      'A Raspberry Pi runs the navigation stack while an STM32 microcontroller closes the motor speed loops. The prototype completes repeated delivery routes on one floor of the engineering building.',
    ],
    background:
      'Indoor logistics in universities and hospitals still depends on people carrying documents and small parcels between rooms. Low-cost mobile robots with reliable localization can take over these repetitive trips.',
    problem:
      'Manual internal deliveries consume staff time and are difficult to schedule. Existing commercial delivery robots are expensive and closed. A low-cost robot is needed that can navigate corridors autonomously, avoid people and obstacles, and confirm each delivery.',
    objectives: [
      'Build a differential-drive platform able to carry a 3 kg payload.',
      'Implement localization using odometry, IMU and LiDAR sensor fusion.',
      'Plan and follow collision-free paths between saved delivery points.',
      'Provide a simple web interface to request and track deliveries.',
    ],
    requirements: [
      'The robot shall carry a payload of at least 3 kg.',
      'The robot shall stop within 30 cm of an unexpected obstacle.',
      'Localization error shall stay below 15 cm along a 40 m route.',
      'The battery shall support at least 2 hours of operation.',
    ],
    constraints: [
      'Cost: total hardware budget limited to 450 USD.',
      'Power: a single 24 V Li-ion pack shared by motors and electronics.',
      'Environment: narrow corridors and doors of 80 cm width.',
    ],
    previousWork: [
      'Simultaneous localization and mapping (SLAM) lets a robot build a map of an unknown space while estimating its own position. 2D LiDAR combined with wheel odometry is a common low-cost approach for indoor robots.',
      'Commercial delivery robots demonstrate reliable indoor navigation but rely on proprietary stacks. Academic prototypes often stop at navigation; this project adds delivery management and confirmation.',
    ],
    architecture:
      'The system separates high-level navigation on the Raspberry Pi from real-time motor control on the STM32. The main functional blocks are:',
    subsystems: ['Navigation computer', 'Motor control unit', 'Sensor fusion', 'Payload compartment', 'Web delivery interface', 'Power system'],
    components: [
      ['Raspberry Pi 4', 'Navigation and path planning'],
      ['STM32F4', 'Motor speed control'],
      ['RPLIDAR A1', '2D environment scanning'],
      ['BNO055 IMU', 'Orientation estimation'],
      ['24 V Li-ion pack', 'Power supply'],
    ],
    implementation: [
      'The map was built once with a SLAM package and stored on the robot. During delivery, an adaptive Monte Carlo localizer fuses LiDAR scans with odometry, and a global planner computes the route between saved points.',
      'The STM32 runs PID speed loops at 100 Hz using encoder feedback and receives velocity commands over UART from the Raspberry Pi.',
    ],
    parameters: [
      ['Maximum speed', '0.6 m/s'],
      ['Obstacle stop distance', '30 cm'],
      ['Control loop rate', '100 Hz'],
      ['LiDAR scan rate', '5.5 Hz'],
    ],
    results:
      'The robot was tested on a 40 m corridor route with three delivery points. Each run was repeated ten times to observe localization drift and stopping behavior.',
    discussion: [
      'Sensor fusion kept the localization stable along straight corridors, while open areas with few features increased the drift.',
    ],
    limitations: ['Glass walls and reflective surfaces reduce LiDAR reliability.', 'Elevators and doors are not handled autonomously.'],
    conclusion:
      'The prototype shows that a low-cost robot can perform repeatable indoor deliveries on a single floor with safe obstacle handling.',
    future: ['Integrate elevator control for multi-floor delivery.', 'Add a locked compartment with recipient authentication.', 'Measure battery endurance under full payload.'],
    references: [
      'S. Thrun, W. Burgard, and D. Fox, Probabilistic Robotics. MIT Press, 2005.',
      'Slamtec, "RPLIDAR A1 Datasheet," Slamtec Documentation.',
      ...sharedReferences.slice(0, 2),
    ],
    abbreviations: [
      ['IMU', 'Inertial Measurement Unit'],
      ['LiDAR', 'Light Detection and Ranging'],
      ['PID', 'Proportional–Integral–Derivative'],
      ['SLAM', 'Simultaneous Localization and Mapping'],
    ],
  },
  {
    id: 'greenhouse',
    name: 'Smart Greenhouse Monitor',
    code: 'EE-317',
    image: greenhouseImage,
    students: [
      { name: 'Ahmad Ali', id: '12110452' },
      { name: 'Rana Odeh', id: '12111187' },
    ],
    department: 'Electrical Engineering',
    presentationSizeMb: 4.2,
    presentationAt: '2026-10-18T19:40',
    abstract: [
      'The Smart Greenhouse Monitor measures temperature, humidity, soil moisture and light inside a small greenhouse and controls ventilation and irrigation automatically. Readings are published to a dashboard for remote monitoring.',
    ],
    background:
      'Greenhouse crops are sensitive to temperature and humidity changes. Small farms often adjust ventilation and irrigation manually, which leads to delayed reactions and wasted water.',
    problem:
      'Farmers cannot continuously monitor greenhouse conditions. Late reactions to heat or dry soil reduce crop quality. A monitoring system is needed that measures the climate and acts automatically within defined thresholds.',
    objectives: [
      'Measure temperature, humidity, soil moisture and light intensity.',
      'Control a ventilation fan and irrigation valve automatically.',
      'Display live readings and alerts on a web dashboard.',
    ],
    requirements: [
      'The system shall sample all sensors at least once per minute.',
      'The fan shall start when the temperature exceeds the configured limit.',
      'The dashboard shall show readings with less than 1 minute delay.',
    ],
    constraints: ['Power: the controller must run from a 12 V solar-charged battery.', 'Environment: electronics must tolerate humidity above 80%.'],
    previousWork: [
      'Wireless sensor networks and IoT platforms are widely used for environmental monitoring in agriculture, typically using low-power microcontrollers and MQTT messaging.',
      'Existing commercial controllers are costly for small farms. This project targets a low-cost, solar-powered solution.',
    ],
    architecture: 'An ESP32 reads the sensors, drives the actuators through relays and publishes readings over MQTT. The main blocks are:',
    subsystems: ['Sensor node', 'Actuator control', 'MQTT broker', 'Web dashboard', 'Solar power unit'],
    components: [
      ['ESP32', 'Sensing, control and Wi-Fi'],
      ['DHT22', 'Temperature and humidity'],
      ['Capacitive soil sensor', 'Soil moisture'],
      ['BH1750', 'Light intensity'],
      ['Relay module', 'Fan and valve switching'],
    ],
    implementation: ['The ESP32 firmware reads all sensors every 30 s and applies hysteresis thresholds before switching the fan or the valve, to avoid rapid toggling.'],
    references: ['OASIS, "MQTT Version 5.0," OASIS Standard, 2019.', ...sharedReferences.slice(2)],
    abbreviations: [
      ['IoT', 'Internet of Things'],
      ['MQTT', 'Message Queuing Telemetry Transport'],
    ],
  },
  {
    id: 'weather-station',
    name: 'Solar-Powered Weather Station',
    code: 'EE-299',
    image: weatherImage,
    students: [
      { name: 'Omar Samer', id: '12110933' },
      { name: 'Dana Farah', id: '12112045' },
    ],
    department: 'Electrical Engineering',
    presentationSizeMb: 5.9,
    presentationAt: '2026-10-08T09:35',
    abstract: [
      'This project presents a self-powered weather station that measures temperature, humidity, pressure, wind speed and rainfall, and transmits readings over LoRa to a gateway connected to the internet.',
      'A solar panel with MPPT charging keeps the station running continuously. Field tests over three weeks showed stable operation and measurements within the expected sensor tolerances.',
    ],
    background:
      'Local weather data supports agriculture and planning, but official stations are sparse in rural areas. Low-cost autonomous stations can fill this gap.',
    problem:
      'Rural areas lack nearby weather stations, and commercial stations are expensive and need grid power. A low-cost station is needed that runs on solar power and transmits data over long distances.',
    objectives: [
      'Measure five weather parameters with documented accuracy.',
      'Operate autonomously on solar power with battery backup.',
      'Transmit readings over LoRa to a gateway at least 2 km away.',
      'Store and display historical data on a dashboard.',
    ],
    requirements: [
      'The station shall report readings every 10 minutes.',
      'The station shall run for 3 days without sunlight.',
      'The LoRa link shall reach a gateway at least 2 km away.',
    ],
    constraints: [
      'Power: average consumption must stay below 15 mW.',
      'Environment: enclosure rated IP65 for outdoor use.',
      'Cost: hardware budget limited to 250 USD.',
    ],
    previousWork: [
      'LoRa offers long-range, low-power communication suitable for remote sensing, at the cost of low data rates.',
      'Previous low-cost stations often rely on Wi-Fi or GSM, which limits range or increases power consumption.',
    ],
    architecture: 'A low-power microcontroller samples the sensors and sends compact packets over LoRa. The main blocks are:',
    subsystems: ['Sensor array', 'Low-power MCU', 'LoRa radio', 'Solar MPPT charger', 'Gateway and dashboard'],
    components: [
      ['STM32L0', 'Low-power sampling'],
      ['BME280', 'Temperature, humidity, pressure'],
      ['Anemometer', 'Wind speed'],
      ['Tipping-bucket gauge', 'Rainfall'],
      ['SX1276 LoRa', 'Long-range radio link'],
    ],
    implementation: [
      'The MCU sleeps between measurements and wakes on an RTC alarm every 10 minutes. Wind and rain pulses are counted by interrupts during sleep.',
    ],
    parameters: [
      ['Reporting interval', '10 min'],
      ['Average consumption', '11.8 mW'],
      ['LoRa spreading factor', 'SF10'],
      ['Battery capacity', '6 Ah'],
    ],
    verification: [
      ['Five-parameter measurement', 'Verified'],
      ['3-day autonomy without sun', 'Verified'],
      ['2 km LoRa range', 'Verified (2.6 km)'],
      ['Dashboard history', 'Verified'],
    ],
    results: 'The station operated for three weeks on the faculty roof. Readings were compared against a reference station at the university.',
    discussion: [
      'A lower spreading factor would reduce power but would shorten the link; SF10 was a balanced choice for the 2.6 km distance.',
    ],
    limitations: ['Wind direction is not measured.', 'Rain gauge accuracy drops in heavy storms.'],
    conclusion: 'The station met all requirements and provides reliable local weather data without grid power.',
    future: ['Add a wind vane for wind direction.', 'Deploy several stations as a mesh network.'],
    references: ['Semtech, "SX1276 LoRa Transceiver Datasheet," Semtech Documentation.', 'Bosch Sensortec, "BME280 Datasheet," 2018.'],
    abbreviations: [
      ['LoRa', 'Long Range'],
      ['MCU', 'Microcontroller Unit'],
      ['MPPT', 'Maximum Power Point Tracking'],
      ['RTC', 'Real-Time Clock'],
    ],
  },
  {
    id: 'wearable',
    name: 'Wearable Health Monitor',
    code: 'HW07',
    image: wearableImage,
    students: [
      { name: 'Maya Haddad', id: '12113562' },
      { name: 'Tariq Nassar', id: '12112710' },
    ],
    department: 'Computer Engineering',
    presentationSizeMb: 5.1,
    presentationAt: '2026-10-10T16:50',
    abstract: [
      'The Wearable Health Monitor is a wrist device that measures heart rate, blood oxygen saturation and skin temperature, and sends alerts to a paired phone when readings leave safe ranges.',
    ],
    background: 'Continuous monitoring helps elderly and chronic patients detect problems early, but medical devices are expensive and uncomfortable for daily use.',
    problem:
      'Patients at home are not monitored between clinic visits. Abnormal heart rate or oxygen levels may go unnoticed. A comfortable, low-cost wearable is needed that tracks vital signs and alerts caregivers.',
    objectives: [
      'Measure heart rate and SpO2 using a PPG sensor.',
      'Send readings and alerts to a phone over Bluetooth Low Energy.',
      'Achieve at least 24 hours of battery life.',
    ],
    requirements: [
      'Heart-rate error shall stay within ± 5 bpm of a reference device.',
      'The device shall alert within 10 s of an abnormal reading.',
      'The battery shall last at least 24 hours.',
    ],
    previousWork: [
      'Photoplethysmography (PPG) measures blood volume changes optically and is the basis of most wrist-worn heart-rate sensors.',
      'Commercial fitness bands are not designed for clinical alerts. This project focuses on alerting caregivers.',
    ],
    architecture: 'A Bluetooth microcontroller samples the PPG sensor, processes the signal and notifies a companion app. The main blocks are:',
    subsystems: ['PPG sensing', 'Signal processing', 'BLE communication', 'Companion app', 'Battery management'],
    components: [
      ['nRF52832', 'Processing and BLE'],
      ['MAX30102', 'Heart rate and SpO2'],
      ['MAX30205', 'Skin temperature'],
      ['LiPo 150 mAh', 'Power supply'],
    ],
    implementation: ['The firmware filters the PPG signal with a band-pass filter and detects peaks to compute the heart rate every 2 seconds.'],
    results: 'The device was tested on five volunteers at rest and during light walking.',
    discussion: ['Motion artifacts during walking increased the measurement error, which motivated an accelerometer-based correction as future work.'],
    limitations: ['Readings are unreliable during intense movement.'],
    conclusion: 'The prototype measures vital signs at rest and sends alerts reliably to the companion app.',
    future: ['Add accelerometer-based motion compensation.', 'Validate against a clinical reference device.'],
    references: ['Maxim Integrated, "MAX30102 Datasheet," 2018.', 'Nordic Semiconductor, "nRF52832 Product Specification," 2021.'],
    abbreviations: [
      ['BLE', 'Bluetooth Low Energy'],
      ['PPG', 'Photoplethysmography'],
      ['SpO2', 'Peripheral Oxygen Saturation'],
    ],
  },
  {
    id: 'irrigation',
    name: 'Smart Irrigation System',
    code: 'HW03',
    image: irrigationImage,
    students: [
      { name: 'Sara Nasser', id: '12111804' },
      { name: 'Majd Hamdan', id: '12113126' },
    ],
    department: 'Electrical Engineering',
    presentationSizeMb: 4.6,
    presentationAt: '2026-10-21T12:15',
    abstract: [
      'The Smart Irrigation System schedules watering from soil-moisture readings and weather forecasts to reduce water consumption in small farms.',
    ],
    background: 'Water scarcity makes efficient irrigation essential. Fixed-schedule irrigation often waters soil that is already moist.',
    problem:
      'Fixed timers irrigate regardless of soil condition or expected rain, wasting water. A controller is needed that waters only when the soil requires it.',
    objectives: [
      'Measure soil moisture in up to four zones.',
      'Skip irrigation when rain is forecast.',
      'Report water usage per zone.',
    ],
    requirements: ['The controller shall manage four irrigation zones.', 'Water usage shall be logged per zone daily.'],
    constraints: ['Cost: each zone sensor must cost under 10 USD.', 'Connectivity: operation must continue during internet outages.'],
    previousWork: [
      'Sensor-based irrigation reduces water use compared to timer-based systems by watering only below a moisture threshold.',
      'Few low-cost controllers combine soil sensing with weather forecasts; this project combines both.',
    ],
    architecture: 'An ESP32 controller reads zone sensors and switches solenoid valves, fetching forecasts when online. The main blocks are:',
    subsystems: ['Zone sensors', 'Valve control', 'Forecast service', 'Usage logging'],
    components: [
      ['ESP32', 'Control and Wi-Fi'],
      ['Capacitive soil sensors', 'Zone moisture'],
      ['12 V solenoid valves', 'Zone watering'],
      ['YF-S201 flow meter', 'Water usage'],
    ],
    implementation: ['The controller evaluates each zone every 15 minutes and opens its valve when moisture is below the threshold and no rain is forecast within 6 hours.'],
    parameters: [
      ['Evaluation interval', '15 min'],
      ['Moisture threshold', '35%'],
    ],
    results: 'Preliminary tests on two zones compared water usage against a fixed daily schedule over one week.',
    references: ['Open-Meteo, "Weather Forecast API Documentation," Open-Meteo.', ...sharedReferences.slice(2)],
    abbreviations: [['ESP', 'Espressif Microcontroller']],
  },
]

/** Maps each criterion to the report page that evidences it. */
const criterionPageSuffix: Record<AbetCriterionId, string> = {
  problem: 'intro-1',
  objectives: 'intro-2',
  requirements: 'intro-2',
  constraints: 'method-1',
  architecture: 'method-1',
  implementation: 'method-3',
  verification: 'results-2',
  results: 'results-1',
  discussion: 'discussion-1',
  conclusions: 'conclusions-1',
  references: 'references-1',
}

/** "Smart Greenhouse Monitor" → "Smart_Greenhouse_Monitor" for file names. */
const fileSlug = (name: string) => name.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')

export const finalReportProjects: FinalReportProject[] = specs.map((spec) => ({
  id: spec.id,
  name: spec.name,
  code: spec.code,
  image: spec.image,
  students: spec.students,
  year: '2026',
  pages: buildPages(spec),
  slides: buildSlides(spec),
  presentationFile: {
    fileName: `${fileSlug(spec.name)}_Final_Presentation.pdf`,
    submittedAt: spec.presentationAt,
    fileSizeMb: spec.presentationSizeMb,
    pageCount: buildSlides(spec).length,
  },
  criterionPages: Object.fromEntries(
    abetCriteria.map((criterion) => [criterion, `${spec.id}-${criterionPageSuffix[criterion]}`]),
  ) as Record<AbetCriterionId, string>,
}))

/** Metadata of one uploaded report PDF of a project. */
function reportFile(
  id: string,
  version: string,
  status: FinalReportStatus,
  submittedAt: string | null,
  fileSizeMb: number,
  reviewedAt: string | null = null,
): ReportSubmission {
  const project = finalReportProjects.find((item) => item.id === id)!
  return {
    version,
    fileName: `${fileSlug(project.name)}_Final_Report_${status === 'draft' ? 'Draft_' : ''}${version}.pdf`,
    submittedAt,
    fileSizeMb,
    pageCount: project.pages.length,
    status,
    reviewedAt,
  }
}

/** Each resubmitted PDF is a new major version: v1.0 → v2.0. */
export function nextMajorVersion(version: string) {
  const major = Number(/^v(\d+)/.exec(version)?.[1] ?? '0')
  return `v${major + 1}.0`
}

/** A team's new upload after a revision request (mock: the same PDF content under the next version). */
export function nextSubmission(id: string, previous: ReportSubmission, submittedAt: string): ReportSubmission {
  return reportFile(
    id,
    nextMajorVersion(previous.version),
    'submitted',
    submittedAt,
    Math.round((previous.fileSizeMb + 0.2) * 10) / 10,
  )
}

export const finalReportReviews: FinalReportReview[] = [
  {
    id: 'cropbot',
    submissions: [
      reportFile('cropbot', 'v1.0', 'revision', '2026-10-02T11:10', 2.1, '2026-10-05'),
      reportFile('cropbot', 'v2.0', 'submitted', '2026-10-15T14:20', 2.4),
    ],
    missing: ['conclusions'],
    criteria: {},
    feedback: [
      {
        id: 'cropbot-fb-1',
        version: 'v1.0',
        kind: 'revision',
        text: 'Chapter 3 needs a hardware summary table, and the design constraints must be stated explicitly. Please upload a revised PDF.',
        date: '2026-10-05',
      },
      {
        id: 'cropbot-fb-2',
        version: 'v2.0',
        kind: 'comment',
        text: 'The report is well organized. Please add more details in the Conclusions and Future Work section, and review the formatting of the references.',
        date: '2026-10-16',
      },
    ],
  },
  {
    id: 'delivery-robot',
    submissions: [reportFile('delivery-robot', 'v1.0', 'submitted', '2026-10-20T10:05', 3.1)],
    missing: ['verification'],
    criteria: {},
    feedback: [],
  },
  {
    id: 'greenhouse',
    submissions: [reportFile('greenhouse', 'v0.3', 'draft', null, 1.6)],
    missing: ['verification', 'results', 'discussion', 'conclusions'],
    criteria: {},
    feedback: [],
  },
  {
    id: 'weather-station',
    submissions: [
      reportFile('weather-station', 'v1.0', 'revision', '2026-09-24T09:00', 2.5, '2026-09-27'),
      reportFile('weather-station', 'v2.0', 'approved', '2026-10-08T09:30', 2.8, '2026-10-12'),
    ],
    missing: [],
    criteria: {},
    feedback: [
      {
        id: 'weather-fb-1',
        version: 'v1.0',
        kind: 'revision',
        text: 'Add the power budget analysis and the measured LoRa range to Chapter 4, then upload the revised PDF.',
        date: '2026-09-27',
      },
      {
        id: 'weather-fb-2',
        version: 'v2.0',
        kind: 'approval',
        text: 'Excellent final version. The verification table and power analysis are clear. Approved for the committee defense.',
        date: '2026-10-12',
      },
    ],
  },
  {
    id: 'wearable',
    submissions: [reportFile('wearable', 'v1.0', 'revision', '2026-10-10T16:45', 2.2, '2026-10-13')],
    missing: ['constraints', 'verification'],
    criteria: {},
    feedback: [
      {
        id: 'wearable-fb-1',
        version: 'v1.0',
        kind: 'revision',
        text: 'Please add the design constraints for battery life and skin-contact safety, and include a verification table with the measured heart-rate error against a reference device.',
        date: '2026-10-13',
      },
    ],
  },
  {
    id: 'irrigation',
    submissions: [reportFile('irrigation', 'v0.5', 'draft', null, 1.9)],
    missing: ['verification', 'discussion', 'conclusions'],
    criteria: {},
    feedback: [],
  },
]
