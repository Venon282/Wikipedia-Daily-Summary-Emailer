# Wikipedia Daily Summary Emailer  
A Google Apps Script project that sends daily summaries of random Wikipedia articles via email. Includes language translation, HTML email formatting, and optional article images for a polished presentation.  
Improve your knowledge a little more every day.
All api used have a free plan!

---

## Features
- Fetches a random Wikipedia article daily.
- Summarizes the content using a GroqCloud API.
- Translates the email content to the recipient's preferred language via the DeepL API.
- Includes the title, summary, link, and an optional article image in the email.
- Sends emails automatically to a list of recipients stored in a Google Sheet.
- Customizable for various use cases and requirements.

---

## Installation and Setup

### 1. Clone or copy the repository
Save the provided code into your Google Apps Script project.

### 2. Set up the Google Sheet
- Rename your sheet to **"DailySummaryRecipients"**.
- Add the following headers in **row 1**:
  - Column A: `Email`  
  - Column B: `Language Code (e.g., fr, en, es)`  
- Enter recipient details starting from row 2.

| Email              | Language Code |
|--------------------|---------------|
| example@email.com  | fr            |
| test@email.com     | en            |

### 3. Add your API keys
Replace the placeholders in the script with your actual API keys:
- `GROQCLOUD_API_KEY`: Your GroqCloud API key.
- `DEEPL_API_KEY`: Your DeepL API key.

### 4. Set the script to run daily
Run the `createDailyTrigger` function in the Google Apps Script editor to schedule daily execution.

---
 
## Dependencies
- Google Apps Script: Native for managing Sheets and sending emails.
- GroqCloud API: For summarizing article content.
- DeepL API: For translating text into the recipient's preferred language.

## Contributions
Feel free to fork, improve, and submit pull requests. Suggestions for new features and use cases are welcome!

## License
This project is licensed under the MIT License. See the LICENSE file for details.
