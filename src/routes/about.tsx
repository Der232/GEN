import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
	component: About,
});

function About() {
	return (
		<main className="max-w-3xl mx-auto px-6 py-12 animate-fade-in space-y-6">
			<div className="gen-card p-6 sm:p-8 space-y-4">
				<h1 className="font-heading text-3xl font-bold text-[var(--text-primary)]">
					AI-Powered Academic Exam Platform
				</h1>
				<p className="text-sm text-[var(--text-secondary)] leading-relaxed">
					GEN is built for learners, educators, and autodidacts. It generates
					rigorous, multi-format exams on any subject using Groq AI, grades
					answers with step-by-step mathematical and conceptual proofs, and lets
					users practice anonymously with zero friction.
				</p>
			</div>
		</main>
	);
}
