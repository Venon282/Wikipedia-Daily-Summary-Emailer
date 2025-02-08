const GROQCLOUD_API_KEY  = 'your_groqcloud_api_key'
const DEEPL_API_KEY = 'your_deepl_api_key'
const DEFAULT_LANGUAGE = 'fr'
const THEMES = [
    "Architecture", "Artisanat", "Dessin", "Cinéma", "Design", "Littérature", "Musique", "Photographie", "Sculpture", "Arts du spectacle", "Artiste", "Histoire de l'art", "Institution artistique", "Œuvre d'art", "Technique artistique", "Astronomie", "Biologie", "Chimie", "Mathématiques", "Physique", "Sciences de la Terre", "Anthropologie", "Archéologie", "Économie", "Géographie", "Histoire", "Linguistique", "Information", "Philosophie", "Psychologie", "Sociologie", "Chronologie", "Date", "Calendrier", "Siècle", "Année", "Événement", "Lieu", "Territoire", "Ville", "Continent", "Pays", "Alimentation", "Croyance", "Culture", "Divertissement", "Droit", "Éducation", "Idéologie", "Langue", "Médias", "Mode", "Organisation", "Groupe social", "Politique", "Santé", "Sexualité", "Sport", "Tourisme", "Travail", "Urbanisme", "Aéronautique", "Agriculture", "Astronautique", "Électricité", "Électronique", "Énergie", "Industrie", "Ingénierie", "Informatique", "Mécanique", "Médecine", "Métallurgie", "Plasturgie", "Robotique", "Sylviculture", "Télécommunications", "Transports", "Par période historique", "Par métier", "Par secteur d'activité", "Par nationalité"
  ]
const MAX_TRY = 15

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

  // Get article
  //const wikipedia_url = 'https://fr.wikipedia.org/wiki/Sp%C3%A9cial:Page_au_hasard';
  const theme = THEMES[Math.floor(Math.random() * THEMES.length)]
  let wikipedia_url = null
  i = 0
  while(wikipedia_url === null){
      if(i >= MAX_TRY)
          return
      wikipedia_url = getRandomArticleFromTheme(theme)
      i++
  }
  Logger.log('URL: '+wikipedia_url)


  const { title, content, image_url } = fetchRandomWikipediaArticle(wikipedia_url);
  
  if (!content) {
    Logger.log('Failed to fetch Wikipedia content!');
    return;
  }
  
  // const prompt = 'Fournis un résumé clair, concis et informatif de l\'article suivant en français. Formate le texte en HTML. Exclue les références, citations, sections inutiles, et données non pertinentes. Mets en avant les informations principales et les points clés de manière structurée et facile à lire.'

  const prompt = 'Fournis un résumé clair, simple et informatif de l\'article suivant en français, tout en expliquant les termes ou concepts complexes pour les rendre compréhensibles. Formate le texte en HTML. Ne conserve que les informations importantes et les points essentiels, tout en excluant les références, citations, données inutiles ou hors sujet. Si des informations contextuelles ou des explications supplémentaires sont nécessaires pour mieux comprendre, inclue-les directement dans le résumé de manière concise.'


  const summary = generateGroqCloudSummary(content, prompt,'llama-3.3-70b-versatile',1.3, 450);
  
  if (!summary) {
    Logger.log('Failed to generate summary!');
    return;
  }

  const emails = {}
  emails[DEFAULT_LANGUAGE] = {
      'object':`Résumé de l’article du jour: ${title}`,
      'message':`
          <p>Bonjour,</p>
          <p>Le thème du jour est : <strong style="font-size: 1.1em;">${theme}</strong></p>
          <p>Titre : <strong style="font-size: 1.1em;">${title}</strong></p>
          ${image_url ? `<p><img src="${image_url}" alt="${title}" style="max-width:100%; height:auto;"></p>` : ''}
          <p>Résumé : ${summary}</p>
          <p>Lien vers l'article complet : <a href="${wikipedia_url}">${wikipedia_url}</a></p>
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
    let response = UrlFetchApp.fetch(url)
    
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
    
    return { title:title, content:content, image_url: image_url};
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
function createDailyTrigger() {
  ScriptApp.newTrigger('sendDailySummary')
    .timeBased()
    .everyDays(1)
    .atHour(6) // Adjust to the desired time
    .create();
}
