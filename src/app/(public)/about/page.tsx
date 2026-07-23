import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-foreground">About CampusLearn</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          CampusLearn is the centralized academic learning portal for Thakur College of Engineering and Technology.
          It brings notes, assignments, quizzes, previous-year papers, announcements, and performance analytics into
          one platform built around how the college actually operates — departments, programmes, semesters,
          divisions, and subjects, with Students, Class Representatives, Faculty, and Administrators each getting
          the access appropriate to their role.
        </p>
        <p>
          The platform is built to make verified academic material easy to find, keep assessments fair by scoring
          quizzes on the server rather than the browser, and use AI in a way that stays grounded in resources the
          institution has actually approved — with citations, not guesses.
        </p>
        <p>
          Access is restricted to holders of a valid @tcetmumbai.in institutional email address, verified on the
          server for every registration.
        </p>
      </div>
    </div>
  );
}
