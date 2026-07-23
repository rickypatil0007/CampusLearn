import { z } from "zod";

export const discussionSchema = z.object({
  subjectId: z.string().uuid(),
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(3).max(5000),
});
export type DiscussionInput = z.infer<typeof discussionSchema>;

export const replySchema = z.object({
  discussionId: z.string().uuid(),
  body: z.string().trim().min(1).max(3000),
});
export type ReplyInput = z.infer<typeof replySchema>;
