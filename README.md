# APA Citation Generator

A free, open-source tool for citing sources in APA Style, 7th edition. Fill in what you know about a source and get its reference-list entry and both kinds of in-text citation, with checks for the mistakes students make most often.

It is one web page. There is nothing to install, no account, no ads, and nothing is sent anywhere.

## Using it

Open `index.html` in any current browser, or use the hosted copy linked in this repository's About box.

1. Pick the source type. Each type asks only for what APA needs for it and can show an example.
2. Fill in the fields. The reference entry and the in-text citations build as you type.
3. Read the checks under the citations. **Fix** means something is missing or wrong, **Check** means look again, and **Note** is a reminder.
4. Copy what you need. Copy with italics keeps the formatting when you paste into Word or Google Docs.

Each **?** on the page explains the part beside it.

### Source types

Journal article · Book (including edited books) · Chapter in an edited book · Web page · Newspaper article · Magazine article · Report or government document · Dissertation or thesis · Conference presentation · Online video · Social media post · Data set · Dictionary or encyclopedia entry · AI-generated content

### In-text citations

Every source gets a parenthetical citation, (Doe & Rivera, 2022), and a narrative one, Doe and Rivera (2022). Under **In-text citation** you can:

- point to a page or page range, a paragraph, a section heading, or a timestamp
- mark the citation as a direct quotation, which then has to give a page or paragraph
- cite a source you read about in another source, which gives "as cited in"

Three or more authors become the first author and et al. from the first citation on.

### What the checks catch

- titles of works not in sentence case, with a button that converts them (proper nouns then need their capitals back)
- people's names typed first name first; the tool reads "Surname, Given names" as a person and anything else as a group
- library database links, which readers cannot open
- a missing or malformed DOI
- a missing URL for a web page, video, post, data set, or AI tool
- a retrieval date on a source that does not take one, or a missing one on an undated page
- a quotation with no page or paragraph
- a chapter with no editors, a thesis with no university, a post longer than 20 words, an AI citation with no version

### Reference list

**Add to my list** keeps sources in this browser. The list sorts itself the way APA sorts a reference list and adds 2020a and 2020b when one author has two works from the same year. You can:

- copy the whole list
- export it to Word, with the References heading, double spacing, and hanging indents already set, or to Markdown
- tick two or more sources to cite them together in one parenthesis, in alphabetical order
- save the list to a file and open it again later, on any computer

## Your data

The page runs entirely in your browser and makes no network requests. What you type is kept in your browser's local storage on your device. Clearing your browser's site data clears it, so save a list file if you want to keep a list.

## How accurate it is

The formatting is done by citeproc-js with the APA 7th edition style from the Citation Style Language project, the same style that Zotero and Mendeley use. The tool adds the APA rules that the style file leaves to the person entering data, such as leaving out a publisher that repeats the author and placing a social media handle after the name.

`Tests/run.js` checks the output against 19 reference entries modeled on the examples in APA's own guidance, covering every source type, plus in-text citations, the checks, and the file formats.

The tool formats what you give it. It cannot know whether a title is really a proper noun, or whether you found an article in a library database. Your instructor's requirements come first.

APA Citation Generator is not affiliated with or endorsed by the American Psychological Association.

## License

© 2026 G. Michael Rapp. This program is free software: you can redistribute it and modify it under the terms of the GNU Affero General Public License, version 3 or (at your option) any later version. See `LICENSE`.

It includes citeproc-js (AGPL) and the CSL APA style and en-US locale (Creative Commons Attribution-ShareAlike 3.0). See `NOTICE.md` for their authors and terms.

## Reporting a problem

Open an issue and choose **Wrong reference or citation** or **Missing source type**. Include what you entered, what the tool produced, and what APA Style calls for.

## For maintainers

`index.html` is built from the files in `src/`:

- `src/core.js` turns the form into CSL-JSON, applies the APA fixes, and runs the checks. The source types and their fields are in `TYPES` at the top.
- `src/ui.js` is the page: labels, hints, examples, and tips are in tables near its top.
- `src/page.html` holds the markup and styles.
- `src/vendor/` holds citeproc-js, the APA style, and the locale, unmodified.

After any change, rebuild and test:

```
python3 src/build.py
node Tests/run.js
```

Both need nothing beyond Python 3 and Node 18 or later. The tests also run on GitHub whenever a change is pushed.

To update the APA style, replace `src/vendor/apa.csl` with the current file from https://github.com/citation-style-language/styles, rebuild, and run the tests.
