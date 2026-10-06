# Perspectra at PromptWars

## About PromptWars

PromptWars is a hackathon format run by Google for Developers and Hack2skill in which participants build vibe-coded solutions with Google Antigravity or Google AI Studio within limited time. It runs as virtual, in-person and community editions. More details are available on the [PromptWars website](https://promptwars.in/promptwars.html) and the [Hack2skill community page](https://hack2skill.com/pw-community/).

## The edition I took part in

| Detail | Value |
| --- | --- |
| Edition | In-person PromptWars |
| Host venue | St. Vincent Pallotti College of Engineering and Technology (SVPCET) |
| In collaboration with | Engineering India, Hack2skill, GDG, GDG Nagpur |
| Date | 4 October 2026 |
| Time to build | 3 hours. Solo participation. |
| Participants | 200+ |
| Judging | an AI-based score; only the top 16 were invited to pitch |

## The problem statement: The Blind Spot

People often decide based on the information most visible to them and may overlook important factors, rely on unstated assumptions, or fail to recognise conflicts within their own reasoning. The challenge was to build an AI-powered solution that helps users identify blind spots in their reasoning when considering a decision, encouraging them to examine their assumptions and explore questions that could lead to a more informed decision. The system must not make the decision for the user.

## What I built

I built Perspectra solo as a calm, structured web application that acts as a thinking tool rather than a decision-maker. Users describe a decision, their stated reasoning, and optional context across a step-by-step interview, and receive an exploratory breakdown highlighting unstated assumptions, overlooked factors, internal tensions, missing information, and premortem questions. Every finding is verified on the server against the user's exact words, with no verdicts, scores, rankings, or recommendations ever returned. The user triages each finding and gets a personal investigation checklist along with exportable plain-text notes. The application is built with the Next.js App Router and TypeScript, using Google services exclusively: the Gemini API via `@google/genai` on the server for structured analysis, and Firebase Authentication with Cloud Firestore for optional private cloud saving. Full details on the architecture, safety guards, and testing suite are documented in [README.md](./README.md).

- Repository: [https://github.com/nilesh0199/nileshthipe_promptwars](https://github.com/nilesh0199/nileshthipe_promptwars)
- Live demo: [https://nileshthipe-promptwars.vercel.app/](https://nileshthipe-promptwars.vercel.app/)

## Result

In the second submission, Perspectra achieved an overall score of 90.28 out of 100, ranking 45 out of about 300 participants, against a leaderboard top score of 96.9.

| Metric | Score (out of 100) |
| --- | --- |
| Efficiency | 100 |
| Security | 98 |
| Accessibility | 96 |
| Problem Statement Alignment | 94 |
| Code Quality | 86 |
| Testing | 54 |

I submitted twice and worked on testing between the two submissions.

## After the competition

I kept working on the project after the competition because I found the problem statement interesting. The score above belongs to the version I submitted on the day, not necessarily to the current code.

## Tools

Google Antigravity (the coding agent), Google services (Gemini API, Firebase Authentication, Cloud Firestore), and Vercel for deployment.

## What I learned

My biggest takeaway from the competition was time management. Building a project in just three hours taught me how to work under pressure. I also met some new people along the way, and the organising team was amazing.

## Credits

Thank you to the organising team at St. Vincent Pallotti College of Engineering and Technology (SVPCET), Engineering India, Hack2skill, GDG, and GDG Nagpur, as well as Google for Developers and Hack2skill for the PromptWars programme.

Built by Nilesh Thipe.
