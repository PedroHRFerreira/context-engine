export function formatCliError(error: unknown, debug = process.env.RODS_DEBUG): string {
  if (!(error instanceof Error)) return String(error);
  return debug === '1' ? (error.stack ?? error.message) : error.message;
}
