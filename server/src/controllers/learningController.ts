import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { LearningProgress } from '../models/LearningProgress.js';

export interface ILearningModule {
  id: string;
  title: string;
  description: string;
  category: 'phishing' | 'passwords' | 'social_engineering' | 'urls' | 'account_takeover';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  points: number;
  badgeName: string;
  badgeIcon: string;
  lessons: string[];
  questions: {
    id: string;
    scenario: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export const LEARNING_MODULES: ILearningModule[] = [
  {
    id: 'phishing-101',
    title: 'Phishing Awareness & Deceptive Emails',
    description: 'Master the art of spotting weaponized emails, sender spoofing, and high-pressure psychological urgency.',
    category: 'phishing',
    difficulty: 'Beginner',
    points: 50,
    badgeName: 'Phish Buster',
    badgeIcon: '🎣',
    lessons: [
      'Attackers disguise sender headers to look like trusted brands (e.g. PayPal, Apple, your bank).',
      'High-pressure urgency ("Act in 10 minutes or lose access!") is designed to bypass your rational judgment.',
      'Hover over every hyperlinked button to verify the true destination URL before clicking.',
    ],
    questions: [
      {
        id: 'q1',
        scenario: 'You receive an urgent email from "support@paypa1-security.com" saying your account was suspended. The email demands you click a link within 1 hour to verify your credit card. What should you do?',
        options: [
          'Click the link immediately so your account does not get locked.',
          'Reply to the email asking for confirmation.',
          'Do not click the link; note the misspelled domain "paypa1", report as phishing, and check your PayPal account via the official app.',
          'Forward the email to friends to warn them with the link intact.'
        ],
        correctIndex: 2,
        explanation: 'The domain "paypa1-security.com" uses typosquatting (number 1 instead of lowercase L) and creates synthetic urgency. Official companies never demand card details via email.'
      },
      {
        id: 'q2',
        scenario: 'An email arrives with a PDF attachment named "Overdue_Invoice_98124.pdf.exe". What does this double extension indicate?',
        options: [
          'It is a high-definition PDF document.',
          'It is an executable malware program disguised as a PDF.',
          'It is a corrupted document that should be opened in Notepad.',
          'It is an Adobe Acrobat update.'
        ],
        correctIndex: 1,
        explanation: 'Windows often hides file extensions by default. Attackers use ".pdf.exe" so victims think it is a document when it is actually an executable payload.'
      }
    ]
  },
  {
    id: 'passwords-101',
    title: 'Password Hygiene & Vault Defense',
    description: 'Learn why password length beats complexity, how brute-force cracking works, and how to use passkeys.',
    category: 'passwords',
    difficulty: 'Beginner',
    points: 50,
    badgeName: 'Vault Master',
    badgeIcon: '🔐',
    lessons: [
      'Length > Complexity: A 16-character passphrase is orders of magnitude harder to crack than an 8-character complex password.',
      'Never reuse passwords across services; if one company suffers a breach, credential stuffers test your combination everywhere.',
      'Biometric passkeys (FIDO2/WebAuthn) eliminate the risk of credential theft completely.'
    ],
    questions: [
      {
        id: 'q1',
        scenario: 'Which of the following passwords takes the longest time for automated supercomputers to crack using dictionary and brute-force attacks?',
        options: [
          'P@ssw0rd!',
          'Tr0ub4dor&3',
          'correct-horse-battery-staple-2026',
          'Welcome123'
        ],
        correctIndex: 2,
        explanation: 'Long multi-word passphrases with high entropy (33 characters) take centuries to brute-force, whereas short leetspeak passwords like "P@ssw0rd!" exist in rainbow tables.'
      },
      {
        id: 'q2',
        scenario: 'What is the primary security advantage of WebAuthn Passkeys over traditional passwords?',
        options: [
          'Passkeys are easier to type on a keyboard.',
          'Passkeys are bound to the specific domain and can never be stolen by a phishing website.',
          'Passkeys are stored on paper in a safe.',
          'Passkeys expire every 24 hours.'
        ],
        correctIndex: 1,
        explanation: 'Passkeys use public-key cryptography origin-bound to the authentic domain. Even if you visit a fake lookalike website, the browser will refuse to release the credential.'
      }
    ]
  },
  {
    id: 'social-engineering-101',
    title: 'Social Engineering & Pretexting',
    description: 'Defend against phone pretexting (vishing), impersonation of IT administrators, and authority scams.',
    category: 'social_engineering',
    difficulty: 'Intermediate',
    points: 50,
    badgeName: 'Social Shield',
    badgeIcon: '🛡️',
    lessons: [
      'Social engineers exploit natural human helpfulness, fear of authority, and desire to avoid conflict.',
      'Legitimate IT staff never need your secret password or 2FA push notification to assist you.',
      'When in doubt, hang up and initiate communication back through verified official company directories.'
    ],
    questions: [
      {
        id: 'q1',
        scenario: 'Someone calling from an unknown number claims to be from SecurePulse IT Support. They say there is a suspicious breach on your account and ask you to read out the 6-digit OTP code just sent to your phone. How do you respond?',
        options: [
          'Read the code quickly so they can stop the hacker.',
          'Ask for their employee badge number and then give them the code.',
          'Refuse to share the code, hang up immediately, and report the unauthorized contact through the SecurePulse dashboard.',
          'Wait 5 minutes and then text them the code.'
        ],
        correctIndex: 2,
        explanation: 'Security OTPs are NEVER meant to be shared with anyone, including support agents. The caller is attempting an account takeover by triggering an OTP on your profile.'
      }
    ]
  },
  {
    id: 'urls-101',
    title: 'Suspicious URL & Homoglyph Identification',
    description: 'Deconstruct web links, identify internationalized homoglyph attacks, and recognize deceptive subdomains.',
    category: 'urls',
    difficulty: 'Intermediate',
    points: 50,
    badgeName: 'Domain Guardian',
    badgeIcon: '🌐',
    lessons: [
      'The true destination of a web link is determined by the root domain immediately preceding the first single slash (/), not what comes before it.',
      'In "https://google.com.attacker-controlled.net/login", the destination is "attacker-controlled.net", NOT Google.',
      'Punycode attacks use Cyrillic characters (like "а" U+0430) that look identical to Latin "a" to deceive victims.'
    ],
    questions: [
      {
        id: 'q1',
        scenario: 'What is the actual destination domain in the URL: "https://appleid.apple.com.verify-device-portal.xyz/auth/check"?',
        options: [
          'appleid.apple.com',
          'apple.com',
          'verify-device-portal.xyz',
          'check'
        ],
        correctIndex: 2,
        explanation: 'The root domain immediately before the path slash is "verify-device-portal.xyz". "appleid.apple.com" is merely a set of deceptive subdomains created by the attacker.'
      }
    ]
  },
  {
    id: 'takeover-101',
    title: 'Account Takeover Defense & Session Security',
    description: 'Learn how attackers steal session cookies, why public Wi-Fi without VPN is risky, and how emergency locks work.',
    category: 'account_takeover',
    difficulty: 'Advanced',
    points: 75,
    badgeName: 'Cyber Sentinel',
    badgeIcon: '⚡',
    lessons: [
      'Infostealers grab active session cookies straight from your local browser profile, bypassing passwords and 2FA.',
      'Emergency Account Lock acts as a digital circuit breaker, invalidating all sessions and trusted tokens instantly.',
      'Regularly audit active sessions and revoke any unknown device immediately.'
    ],
    questions: [
      {
        id: 'q1',
        scenario: 'You notice an active session in your dashboard originating from a city you have never visited. What is the immediate first action you should take?',
        options: [
          'Wait 24 hours to see if another login appears.',
          'Revoke that session immediately from the Active Sessions panel and change your password.',
          'Send an email to the unknown IP address.',
          'Ignore it because SecurePulse has a firewall.'
        ],
        correctIndex: 1,
        explanation: 'Terminate the rogue session immediately to cut off unauthorized token access, then rotate your password to prevent re-authentication.'
      }
    ]
  }
];

/**
 * GET /api/learning/modules
 * Returns all cybersecurity learning modules and challenges.
 */
export async function getLearningModules(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    let progress = await LearningProgress.findOne({ userId });

    if (!progress && userId) {
      progress = await LearningProgress.create({
        userId,
        completedModules: [],
        quizAttempts: [],
        totalPoints: 0,
        badges: [],
      });
    }

    const completedSet = new Set(progress?.completedModules || []);

    const sanitizedModules = LEARNING_MODULES.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      category: m.category,
      difficulty: m.difficulty,
      points: m.points,
      badgeName: m.badgeName,
      badgeIcon: m.badgeIcon,
      lessons: m.lessons,
      questionCount: m.questions.length,
      isCompleted: completedSet.has(m.id),
      questions: m.questions.map((q) => ({
        id: q.id,
        scenario: q.scenario,
        options: q.options,
        // Omit correctIndex and explanation until submitted
      })),
    }));

    res.status(200).json({
      success: true,
      modules: sanitizedModules,
      userProgress: {
        totalPoints: progress?.totalPoints || 0,
        badges: progress?.badges || [],
        completedCount: completedSet.size,
        totalModules: LEARNING_MODULES.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to load learning modules.' });
  }
}

/**
 * POST /api/learning/submit-quiz
 * Evaluates quiz answers, calculates score, grants points & badges, and returns educational explanations.
 */
export async function submitQuiz(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const { moduleId, answers } = req.body; // answers: { [questionId: string]: number }

    if (!moduleId || !answers || typeof answers !== 'object') {
      res.status(400).json({ success: false, message: 'Invalid submission format.' });
      return;
    }

    const mod = LEARNING_MODULES.find((m) => m.id === moduleId);
    if (!mod) {
      res.status(404).json({ success: false, message: 'Module not found.' });
      return;
    }

    let correctCount = 0;
    const results = mod.questions.map((q) => {
      const selectedIndex = answers[q.id];
      const isCorrect = selectedIndex === q.correctIndex;
      if (isCorrect) correctCount++;

      return {
        questionId: q.id,
        isCorrect,
        correctIndex: q.correctIndex,
        userIndex: selectedIndex,
        explanation: q.explanation,
      };
    });

    const passed = correctCount === mod.questions.length;
    let pointsAwarded = 0;
    let badgeEarned: string | null = null;

    let progress = await LearningProgress.findOne({ userId });
    if (!progress && userId) {
      progress = await LearningProgress.create({
        userId,
        completedModules: [],
        quizAttempts: [],
        totalPoints: 0,
        badges: [],
      });
    }

    if (progress) {
      const alreadyCompleted = progress.completedModules.includes(moduleId);
      if (passed && !alreadyCompleted) {
        pointsAwarded = mod.points;
        progress.completedModules.push(moduleId);
        progress.totalPoints += pointsAwarded;

        if (!progress.badges.includes(mod.badgeName)) {
          progress.badges.push(mod.badgeName);
          badgeEarned = mod.badgeName;
        }

        // Check if all modules completed for Grand Champion badge
        if (progress.completedModules.length >= LEARNING_MODULES.length) {
          if (!progress.badges.includes('Security Champion')) {
            progress.badges.push('Security Champion');
            progress.totalPoints += 100;
          }
        }
      }

      progress.quizAttempts.push({
        quizId: moduleId,
        score: correctCount,
        totalQuestions: mod.questions.length,
        completedAt: new Date(),
      });
      progress.lastActivityAt = new Date();
      await progress.save();
    }

    res.status(200).json({
      success: true,
      passed,
      score: `${correctCount} / ${mod.questions.length}`,
      pointsAwarded,
      badgeEarned,
      results,
      totalPoints: progress?.totalPoints || 0,
      badges: progress?.badges || [],
    });
  } catch (err: any) {
    console.error('[LEARNING_QUIZ_ERROR]:', err);
    res.status(500).json({ success: false, message: 'Failed to process quiz submission.' });
  }
}

