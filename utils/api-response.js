// Structured Error Responses
export function sendError(res, status, message) {
  return res.status(status).json({ error: true, message });
}
