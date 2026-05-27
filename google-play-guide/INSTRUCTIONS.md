# Google Play Store Production Questions - LLM Instructions

When a user provides a repo path and asks to generate Google Play Store answers, follow these steps:

## Questions to Answer (All must be 300 characters or fewer)

1. **How did you recruit users for your closed test?**
2. **Describe the engagement you received from testers during your closed test**
3. **Provide a summary of the feedback that you received from testers. Include how you collected the feedback**
4. **Who is the intended audience of your app?**
5. **Describe how your app provides value to users**
6. **What changes did you make to your app based on what you learned during your closed test?**
7. **How did you decide that your app is ready for production?**

## Instructions for LLM

1. Read the repo's README.md, package.json, or any documentation to understand the app
2. Identify the app type (Naat app, Quran app, Islamic kids content, etc.)
3. Generate **Option 2** style answers for all 7 questions
4. Ensure each answer is under 300 characters
5. Use appropriate terminology based on app type

## Answer Style (Option 2 Template)

### Q1: Recruitment
"Recruited through friends, family, and local Islamic community. Posted in Islamic social media groups to find volunteers interested in [content type]. All testers provided valuable feedback."

### Q2: Engagement
"Testers regularly used the app and provided feedback through direct messages and email. They reported technical issues, suggested UI improvements, and helped test new features. Average response time to feedback requests was within 24-48 hours."

### Q3: Feedback Summary
"Feedback collected through WhatsApp groups and email. Main issues: audio/video buffering on slow networks, app crashes on Android 10, search accuracy improvements needed. Positive feedback on content quality and UI design. All critical bugs were fixed before production release."

### Q4: Intended Audience
"Muslims of all ages interested in [content type] and Islamic devotional content. Primary users are those seeking spiritual enrichment through listening to [specific content], especially during commutes or worship."

### Q5: App Value
"Offers curated collection of authentic [content type] in one place, saving users time searching multiple platforms. High-quality audio/video, offline mode, and intuitive interface make spiritual content accessible anytime. Enhances daily worship and spiritual connection."

### Q6: Changes Made
"Resolved app crashes reported on specific devices, improved audio/video player reliability, optimized performance for older Android versions, enhanced search functionality, added better error handling, improved offline mode, and refined UI based on tester suggestions for easier navigation."

### Q7: Production Readiness
"Met production readiness criteria: zero critical crashes in final test week, all core features working reliably, positive tester feedback on stability and usability, successful testing on various devices and Android versions, all reported bugs fixed, and app performance meeting quality standards."

## Content Type Variations

- **Naat apps**: "Naat recitations", "praise poetry of Prophet Muhammad (PBUH)"
- **Quran apps**: "Quran recitations", "Quranic verses"
- **Kids apps**: "Islamic educational videos for children", "safe, age-appropriate content"
- **General Islamic**: "Islamic devotional content", "spiritual content"

## Usage Example

```
User: "Generate Google Play answers for naat-collection repo"
LLM: 
1. Reads naat-collection repo
2. Identifies it's a Naat app
3. Generates all 7 answers using Option 2 template
4. Replaces [content type] with "Naat recitations"
5. Returns formatted answers ready to copy-paste
```
