# Islamic Learning

The public **Learn** menu opens `/learn`. `LearnModule` is lazy-loaded by the app router.

Routes:

- `/learn`: activities.
- `/learn/:topicId?filter=farz`: activity actions with only applicable ruling filters.
- `/learn/:topicId/:entryId`: action or guidance detail, image, references and related questions.
- `/learn/:topicId/:entryId?mode=steps`: teaching order from the JSON `sequence`.
- `/learn/:topicId/quiz`: questions with explanations and lesson links.

`assets/data/learn.json` contains versioned sample content, references, ordered lesson IDs, related IDs and quizzes. Content is available in English, Telugu, Arabic and Urdu. Other app languages use an explicit English fallback notice. UI text uses the existing ngx-translate dictionaries in all ten supported languages. Hanafi classifications are independent of the prayer calculation setting. Draft labels remain visible: the sample material has not been approved as a complete curriculum.

The `image` field accepts a local SVG, WebP, PNG or GIF URL. Replace the sample path with the future instructional image; remove/update the `LEARN.SAMPLE_IMAGE` caption when replacing the sample art. Failed images have a fallback and never hide written instructions.

To use an API, replace the `LEARN_DATA_URL` provider in `learn.module.ts`. Keep the `LearnCollection` contract, or normalize the API response inside `LearnDataService`; screens need no endpoint changes. Failed requests expose a retry action. No login is required.

Validate content and translations with `node tools/validate-learn.cjs`. Compile all routes/templates with `npx ng build --configuration production`.
