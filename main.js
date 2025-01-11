const GROQCLOUD_API_KEY  = 'your_groqcloud_api_key'
const DEEPL_API_KEY = 'your_deepl_api_key'
const DEFAULT_LANGUAGE = 'fr'

function sendDailySummary() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DailySummaryRecipients')
  // Get all rows from A2:B (skipping the header)
  const cells = sheet.getRange('A2:B' + sheet.getLastRow()).getValues()
  
  // Map rows to dictionaries and remove empty rows
  const datas = cells
    .filter(row => row[0] && row[1]) // Filter out rows where email or lg_code is empty
    .map(row => ({
      email: row[0],
      lg_code: row[1] || DEFAULT_LANGUAGE
    }));
  
  if (datas.length === 0) {
    Logger.log('No email addresses found!');
    return;
  }

  const wikipedia_url = 'https://fr.wikipedia.org/wiki/Sp%C3%A9cial:Page_au_hasard';
  const { title, content, url, image_url } = fetchRandomWikipediaArticle(wikipedia_url);
  
  if (!content) {
    Logger.log('Failed to fetch Wikipedia content!');
    return;
  }
  
  const prompt = 'Fournis un résumé clair, concis et informatif de l\'article suivant en français. Formate le texte en HTML. Exclue les références, citations, sections inutiles, et données non pertinentes. Mets en avant les informations principales et les points clés de manière structurée et facile à lire.'
  const summary = generateGroqCloudSummary(content, prompt,'llama-3.3-70b-versatile',1.2, 400);
  
  if (!summary) {
    Logger.log('Failed to generate summary!');
    return;
  }

  const emails = {}
  emails[DEFAULT_LANGUAGE] = {
      'object':`Résumé de l’article du jour: ${title}`,
      'message':`
          <p>Bonjour,</p>
          <p>Voici un résumé de l'article aléatoire du jour :</p>
          <p><strong>Titre : ${title}</strong></p>
          ${image_url ? `<p><img src="${image_url}" alt="${title}" style="max-width:100%; height:auto;"></p>` : ''}
          <p>Résumé : ${summary}</p>
          <p>Lien vers l'article complet : <a href="${url}">${url}</a></p>
          <p>Cordialement,</p>
          <p>Votre service de résumé quotidien.</p>
    `
    }

    

  datas.forEach(data => {
    if(!(data['lg_code'] in emails)){
      const object  = translateText(emails[DEFAULT_LANGUAGE]['object'], data['lg_code']) || emails[DEFAULT_LANGUAGE]['object']
      const message = translateText(emails[DEFAULT_LANGUAGE]['message'], data['lg_code'])|| emails[DEFAULT_LANGUAGE]['message']
      emails[data['lg_code']] = {'object':object, 'message':message}
    }
    GmailApp.sendEmail(
        data['email'],
        emails[data['lg_code']]['object'],
        '',
        {
          htmlBody:emails[data['lg_code']]['message']
        }
      );
    })

  Logger.log('Emails sent successfully!');
}

function fetchRandomWikipediaArticle(url) {
  try {
    let response = UrlFetchApp.fetch(url, { followRedirects: false })

    const headers = response.getHeaders();
    const redirected_url = headers['Location'];

    response = UrlFetchApp.fetch(redirected_url);
    
    let html = response.getContentText();

    // Extract title
    const title_match = html.match(/<title>(.*?)<\/title>/);
    const title = title_match ? title_match[1].replace(' — Wikipédia', '').trim() : 'Article sans titre';
  
    
    // Extract content (first few paragraphs)
    const content_match = html.match(/<main[\s\S]*?>([\s\S]*?)<\/main>/)

    if (!content_match) {
      Logger.log("Le contenu principal dans <main> n'a pas été trouvé.");
      return null;
    }

    // Get and clean the content
    let content = content_match[1]
    content = content.replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ')

    // Get article image
    const image_url = fetchWikipediaImage(title)
    
    return { title:title, content:content, url: redirected_url, image_url: image_url};
  } catch (e) {
    Logger.log('Error fetching Wikipedia article: ' + e.message);
    return { title: null, content: null, url: null, image_url:null};
  }
}

function fetchWikipediaImage(title) {
  try {
    const apiUrl = `https://fr.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      title
    )}&prop=pageimages&format=json&pithumbsize=600`;

    const response = UrlFetchApp.fetch(apiUrl);
    const data = JSON.parse(response.getContentText());
    const pages = data.query.pages;
    const page = Object.values(pages)[0];

    return page.thumbnail ? page.thumbnail.source : null;
  } catch (e) {
    Logger.log('Error fetching Wikipedia image: ' + e.message);
    return null;
  }
}

function generateGroqCloudSummary(text, prompt, model='llama-3.3-70b-versatile', temperature=0.7, max_tokens=300) {
  try {
    const payload = {
      model: model,
      "messages": [
      {
      "role": "user",
      "content": `${prompt} ${text}`,
      }],
      temperature: temperature,
      max_tokens: max_tokens,
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: `Bearer ${GROQCLOUD_API_KEY}`,
      },
      payload: JSON.stringify(payload),
    };

    const response = UrlFetchApp.fetch('https://api.groq.com/openai/v1/chat/completions', options);
    const result = JSON.parse(response.getContentText());

    return result.choices[0].message.content.trim();
  } catch (e) {
    Logger.log('Error generating GPT summary: ' + e.message);
    return null;
  }
}

function translateText(text, target_lang) {
  const url = 'https://api-free.deepl.com/v2/translate';
  const payload = {
    auth_key: DEEPL_API_KEY,
    text: text,
    target_lang: target_lang
  };
  
  const options = {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: payload
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    return result.translations[0].text;
  } catch (error) {
    Logger.log('Error during translation: ' + error.message);
    return null;
  }
}

// Set the script to run daily using a trigger
function createDailyTrigger(time=6) {
  ScriptApp.newTrigger('sendDailySummary')
    .timeBased()
    .everyDays(1)
    .atHour(time) 
    .create();
}
