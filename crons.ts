import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Generate daily quizzes and reading scripts at 00:00 UTC every day
crons.cron(
  "generate-daily-content",
  "0 0 * * *",
  internal.dailyQuizzes.generateAllDailyContent,
  {}
);

// Send daily reminders for employees who have not completed quizzes
crons.cron(
  "send-daily-quiz-reminders",
  "0 9 * * *",
  internal.dailyQuizzes.sendDailyQuizReminders,
  {}
);

// Send weekly summary to managers every Monday morning
crons.cron(
  "send-weekly-manager-quiz-summary",
  "0 10 * * 1",
  internal.dailyQuizzes.sendWeeklyManagerQuizSummary,
  {}
);

// Activate scheduled package downgrades once their effective date has passed
crons.cron(
  "activate-scheduled-downgrades",
  "0 * * * *",
  internal.packages.activateScheduledDowngrades,
  {}
);

export default crons;