export type PortfolioProgress = {
  percentage: number;
  completed: number;
  total: number;
  label: string;
};

export function calculatePortfolioProgress(input: {
  hasProfile: boolean;
  hasSkills: boolean;
  hasPortfolioItem: boolean;
  hasVerifiedSkill: boolean;
}) : PortfolioProgress {
  const checks = [input.hasProfile, input.hasSkills, input.hasPortfolioItem, input.hasVerifiedSkill];
  const completed = checks.filter(Boolean).length;
  const total = checks.length;
  const percentage = Math.round((completed / total) * 100);
  return { percentage, completed, total, label: percentage === 100 ? "Portfolio complete" : "Portfolio progress" };
}
