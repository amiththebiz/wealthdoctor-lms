import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CourseInput } from '@/lib/api/admin';

const VIDEO_BASE = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/';
const THUMB = (id: string) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&h=650&w=940`;

interface SampleLesson {
  title: string;
  description: string;
  video: string;
  minutes: number;
  preview?: boolean;
}

interface SampleModule {
  title: string;
  lessons: SampleLesson[];
}

interface SampleCourse extends CourseInput {
  slug: string;
  instructor_bio: string;
  rating: number;
  review_count: number;
  learning_outcomes: string[];
  modules: SampleModule[];
}

const SAMPLE_COURSES: SampleCourse[] = [
  {
    slug: 'stock-market-investing-masterclass',
    title: 'Stock Market Investing Masterclass',
    subtitle: 'Learn how to analyze companies, read markets, and build a resilient portfolio',
    description:
      'A practical, step-by-step program covering how markets work, how to value a company from its financial statements, and how to size positions and manage risk so your portfolio can survive downturns.',
    category: 'stock-market',
    level: 'Beginner',
    instructor_name: 'Daniel Reyes, CFA',
    instructor_title: 'Former Equity Analyst, 15 years on Wall Street',
    instructor_bio:
      'Daniel spent 15 years covering consumer and industrial stocks before founding Wealth Doctor. He teaches the same frameworks he used to manage institutional portfolios.',
    rating: 4.9,
    review_count: 2184,
    duration_hours: 12.5,
    price_cents: 19900,
    thumbnail_url: THUMB('16594725'),
    learning_outcomes: [
      'Explain how stocks are priced and traded',
      'Read and value a company from its financial statements',
      'Build a diversified portfolio with defined risk limits',
      'Avoid the most common behavioral mistakes investors make',
    ],
    is_published: true,
    modules: [
      {
        title: 'Market Foundations',
        lessons: [
          { title: 'How the Stock Market Actually Works', description: 'Exchanges, market makers, and who sets the price of a share.', video: 'ForBiggerBlazes.mp4', minutes: 14, preview: true },
          { title: 'Order Types and Execution', description: 'Market, limit, and stop orders, and when to use each one.', video: 'ForBiggerEscapes.mp4', minutes: 11 },
          { title: 'Reading a Quote and the Bid-Ask Spread', description: 'Interpreting real-time quotes, volume, and liquidity.', video: 'ForBiggerFun.mp4', minutes: 9 },
        ],
      },
      {
        title: 'Fundamental Analysis',
        lessons: [
          { title: 'Reading the Three Financial Statements', description: 'Income statement, balance sheet, and cash flow statement explained.', video: 'ForBiggerJoyrides.mp4', minutes: 18 },
          { title: 'Valuation Multiples: P/E, P/S, and EV/EBITDA', description: 'When each multiple is meaningful and when it misleads.', video: 'ForBiggerMeltdowns.mp4', minutes: 16 },
          { title: 'Free Cash Flow and Intrinsic Value', description: 'Estimating what a business is worth from the cash it produces.', video: 'Sintel.mp4', minutes: 20 },
        ],
      },
      {
        title: 'Portfolio Construction and Risk',
        lessons: [
          { title: 'Diversification That Actually Works', description: 'Correlation, sector exposure, and the limits of owning many stocks.', video: 'TearsOfSteel.mp4', minutes: 15 },
          { title: 'Position Sizing and Stop Discipline', description: 'How much to invest in each idea so one mistake cannot hurt you.', video: 'ElephantsDream.mp4', minutes: 13 },
          { title: 'Building Your Investment Policy', description: 'Write a simple plan covering goals, rules, and a review schedule.', video: 'BigBuckBunny.mp4', minutes: 12 },
        ],
      },
    ],
  },
  {
    slug: 'personal-financial-management',
    title: 'Personal Financial Management',
    subtitle: 'Take control of your cash flow, debt, and long-term savings',
    description:
      'A complete system for managing household money: budgeting that you will actually stick to, eliminating expensive debt, protecting your family with the right safety nets, and building a retirement plan that compounds.',
    category: 'personal-finance',
    level: 'Beginner',
    instructor_name: 'Priya Nair, CFP',
    instructor_title: 'Certified Financial Planner, Wealth Doctor Advisory',
    instructor_bio:
      'Priya has guided more than 900 families through budgeting, debt payoff, and retirement planning. She focuses on simple systems that work with real, busy lives.',
    rating: 4.8,
    review_count: 1632,
    duration_hours: 8,
    price_cents: 12900,
    thumbnail_url: THUMB('5900184'),
    learning_outcomes: [
      'Build a budget that fits your real spending',
      'Pay off debt faster and protect your credit score',
      'Set up an emergency fund and insurance safety net',
      'Start a retirement and investing plan with confidence',
    ],
    is_published: true,
    modules: [
      {
        title: 'Cash Flow and Budgeting',
        lessons: [
          { title: 'Your Money Map: Income, Expenses, and Net Worth', description: 'Build a snapshot of where your money stands today.', video: 'ForBiggerBlazes.mp4', minutes: 12, preview: true },
          { title: 'The 50/30/20 Budget and Its Variations', description: 'Choose a budgeting method and make it automatic.', video: 'ForBiggerEscapes.mp4', minutes: 10 },
          { title: 'Cutting Costs Without Feeling Deprived', description: 'Subscriptions, insurance, and the high-impact expense audit.', video: 'ForBiggerFun.mp4', minutes: 11 },
        ],
      },
      {
        title: 'Debt, Credit, and Protection',
        lessons: [
          { title: 'Credit Scores Demystified', description: 'What drives your score and how to improve it in six months.', video: 'ForBiggerJoyrides.mp4', minutes: 14 },
          { title: 'Debt Payoff: Avalanche vs. Snowball', description: 'Two proven strategies and how to choose between them.', video: 'ForBiggerMeltdowns.mp4', minutes: 13 },
          { title: 'Insurance and Your Emergency Fund', description: 'Protect income, health, and property before you invest.', video: 'Sintel.mp4', minutes: 12 },
        ],
      },
      {
        title: 'Saving, Investing, and Retirement',
        lessons: [
          { title: 'Compound Interest in Practice', description: 'Why starting early matters more than starting big.', video: 'TearsOfSteel.mp4', minutes: 11 },
          { title: 'Retirement Accounts and Employer Plans', description: 'Matching contributions, tax treatment, and withdrawal rules.', video: 'ElephantsDream.mp4', minutes: 15 },
          { title: 'Your First Long-Term Investment Plan', description: 'Index funds, dollar-cost averaging, and rebalancing.', video: 'BigBuckBunny.mp4', minutes: 13 },
        ],
      },
    ],
  },
  {
    slug: 'advanced-trading-strategies',
    title: 'Advanced Trading Strategies',
    subtitle: 'Structured setups, options income, and disciplined risk management for experienced traders',
    description:
      'An intensive program for traders who already understand the basics. Learn to read market structure, use options for income and hedging, and run a trading process built around risk rather than prediction.',
    category: 'advanced-trading',
    level: 'Advanced',
    instructor_name: 'Marcus Okafor',
    instructor_title: 'Head of Trading Education, Wealth Doctor',
    instructor_bio:
      'Marcus ran a proprietary trading desk for a decade and now trains traders on process, risk, and psychology.',
    rating: 4.7,
    review_count: 612,
    duration_hours: 15,
    price_cents: 34900,
    thumbnail_url: THUMB('5831259'),
    learning_outcomes: [
      'Identify market structure and high-probability setups',
      'Use defined-risk options strategies',
      'Build a trade journal and performance review routine',
      'Control emotion and overtrading under pressure',
    ],
    is_published: true,
    modules: [
      {
        title: 'Technical Market Structure',
        lessons: [
          { title: 'Trend, Range, and Market Structure', description: 'Higher highs, lower lows, and how structure defines the trade.', video: 'ForBiggerBlazes.mp4', minutes: 18, preview: true },
          { title: 'Support, Resistance, and Volume Profile', description: 'Mapping the levels where institutional orders cluster.', video: 'ForBiggerEscapes.mp4', minutes: 16 },
          { title: 'Building a Repeatable Setup Checklist', description: 'Turn a pattern into rules you can test and repeat.', video: 'ForBiggerFun.mp4', minutes: 14 },
        ],
      },
      {
        title: 'Options and Volatility Strategies',
        lessons: [
          { title: 'Options Greeks for Traders', description: 'Delta, gamma, theta, and vega in practical terms.', video: 'ForBiggerJoyrides.mp4', minutes: 22 },
          { title: 'Covered Calls and Cash-Secured Puts', description: 'Income strategies with clearly defined risk.', video: 'ForBiggerMeltdowns.mp4', minutes: 18 },
          { title: 'Spreads and Hedging Volatility', description: 'Vertical spreads and protecting a portfolio from sharp moves.', video: 'Sintel.mp4', minutes: 20 },
        ],
      },
      {
        title: 'Risk Management and Trading Psychology',
        lessons: [
          { title: 'Position Sizing and Maximum Drawdown', description: 'Survive losing streaks with a clear sizing model.', video: 'TearsOfSteel.mp4', minutes: 17 },
          { title: 'Keeping a Trading Journal That Improves You', description: 'Metrics, reviews, and turning mistakes into rules.', video: 'ElephantsDream.mp4', minutes: 13 },
          { title: 'Trading Psychology Under Pressure', description: 'Recognize revenge trading and build pre-trade routines.', video: 'BigBuckBunny.mp4', minutes: 15 },
        ],
      },
    ],
  },
];

export async function seedSampleCatalog(): Promise<boolean> {
  const firstSlug = SAMPLE_COURSES[0].slug;
  const existing = await getDoc(doc(db, 'courses', firstSlug));
  if (existing.exists()) return false;

  const batch = writeBatch(db);
  const createdAt = new Date().toISOString();

  for (const course of SAMPLE_COURSES) {
    const { modules, slug, ...courseFields } = course;
    const courseRef = doc(db, 'courses', slug);
    batch.set(courseRef, { ...courseFields, slug, created_at: createdAt });

    let position = 0;
    modules.forEach((module, moduleIndex) => {
      const moduleId = `${slug}-m${moduleIndex + 1}`;
      batch.set(doc(courseRef, 'modules', moduleId), {
        course_id: slug,
        title: module.title,
        position: moduleIndex + 1,
      });

      module.lessons.forEach((lesson) => {
        position += 1;
        const lessonRef = doc(courseRef, 'lessons', `${slug}-l${position}`);
        batch.set(lessonRef, {
          course_id: slug,
          module_id: moduleId,
          title: lesson.title,
          description: lesson.description,
          duration_minutes: lesson.minutes,
          position,
          is_preview: Boolean(lesson.preview),
        });
        batch.set(doc(db, 'lesson_media', lessonRef.id), {
          course_id: slug,
          video_url: `${VIDEO_BASE}${lesson.video}`,
        });
      });
    });
  }

  await batch.commit();
  return true;
}
