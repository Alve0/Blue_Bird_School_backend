import { prisma } from "../../lib/prisma";

export interface CreateSubmissionInput {
  projectName: string;
  repoUrl: string;
  liveLink: string;
  description: string;
}

function duplicateSubmissionError(): Error & { statusCode: number } {
  return Object.assign(
    new Error("A submission for this repository URL already exists"),
    { statusCode: 409 },
  );
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function createSubmission(
  userId: string,
  input: CreateSubmissionInput,
) {
  const existingSubmission = await prisma.submission.findFirst({
    where: {
      repoUrl: {
        equals: input.repoUrl,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  if (existingSubmission) {
    throw duplicateSubmissionError();
  }

  try {
    return await prisma.submission.create({
      data: {
        ...input,
        userId,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw duplicateSubmissionError();
    }
    throw error;
  }
}

export async function getStudentSubmissions(input: {
  userId: string;
  page: number;
  limit: number;
}) {
  const where = { userId: input.userId };
  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where,
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

export async function getStudentSubmission(
  userId: string,
  submissionId: string,
) {
  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      userId,
    },
  });

  if (!submission) {
    throw Object.assign(new Error("Submission not found"), {
      statusCode: 404,
    });
  }

  return submission;
}
