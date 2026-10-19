import type { Status } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";

const submissionWithStudent = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

export async function getSubmissionStatistics() {
  const counts = await prisma.submission.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const countByStatus = new Map(
    counts.map(({ status, _count }) => [status, _count._all]),
  );

  const pending = countByStatus.get("PENDING") ?? 0;
  const approved = countByStatus.get("APPROVED") ?? 0;
  const rejected = countByStatus.get("REJECTED") ?? 0;

  return {
    total: pending + approved + rejected,
    pending,
    approved,
    rejected,
  };
}

export async function getSubmissions(input: {
  page: number;
  limit: number;
  status?: Status;
}) {
  const where = input.status ? { status: input.status } : {};
  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      include: submissionWithStudent,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.submission.count({ where }),
  ]);

  return {
    submissions,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit),
    },
  };
}

export async function reviewSubmission(
  submissionId: string,
  status: Exclude<Status, "PENDING">,
) {
  const update = await prisma.submission.updateMany({
    where: {
      id: submissionId,
      status: "PENDING",
    },
    data: { status },
  });

  if (update.count === 0) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { id: true },
    });

    if (!submission) {
      throw Object.assign(new Error("Submission not found"), {
        statusCode: 404,
      });
    }

    throw Object.assign(new Error("Only pending submissions can be reviewed"), {
      statusCode: 409,
    });
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: submissionWithStudent,
  });

  if (!submission) {
    throw new Error("Reviewed submission could not be loaded");
  }

  return submission;
}
