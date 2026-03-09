import type { FastifyReply, FastifyRequest } from "fastify";

export async function requireOrganizerAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const expected = process.env.JWT_SECRET;
  if (!expected) {
    return;
  }
  const supplied = request.headers["x-organizer-token"];
  if (supplied !== expected) {
    reply.status(401);
    throw new Error("Unauthorized organizer action.");
  }
}
