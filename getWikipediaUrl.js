/**
 * Retrieves a "page" (sample) of articles from a given category
 * using a random starting parameter (cmstartsortkey).
 *
 * @param {string} category_title - The full title of the category (e.g., "Catégorie:Culture")
 * @return {Array} - The list of retrieved articles (namespace 0)
 */
function getRandomArticlesWithRandomStart(category_title) {
  // Generate a random character from A-Z and 0-9
  let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let random_key = chars.charAt(Math.floor(Math.random() * chars.length));
  
  let params = {
    action: "query",
    list: "categorymembers",
    cmtitle: category_title,
    cmnamespace: "0", // articles
    format: "json",
    cmlimit: "max",
    cmstartsortkey: random_key
  };
  
  let query_parts = [];
  for (let key in params) {
    query_parts.push(key + "=" + encodeURIComponent(params[key]));
  }
  let url = "https://fr.wikipedia.org/w/api.php?" + query_parts.join("&");
  
  try {
    let response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    let json = JSON.parse(response.getContentText());
    return json.query.categorymembers;
  } catch (e) {
    Logger.log("Error for " + category_title + " : " + e);
    return [];
  }
}

/**
 * Retrieves the list of subcategories (namespace 14) of a given category.
 *
 * @param {string} category_title - The full title of the category (e.g., "Catégorie:Culture")
 * @return {Array} - The list of subcategories
 */
function getSubcategories(category_title) {
  let params = {
    action: "query",
    list: "categorymembers",
    cmtitle: category_title,
    cmnamespace: "14", // Subcategories
    format: "json",
    cmlimit: "max"
  };
  
  let query_parts = [];
  for (let key in params) {
    query_parts.push(key + "=" + encodeURIComponent(params[key]));
  }
  let url = "https://fr.wikipedia.org/w/api.php?" + query_parts.join("&");
  
  try {
    let response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    let json = JSON.parse(response.getContentText());
    return json.query.categorymembers;
  } catch (e) {
    Logger.log("Error retrieving subcategories for " + category_title + " : " + e);
    return [];
  }
}

/**
 * Recursively retrieves a random article URL from a given category.
 * It fetches a sample of articles and subcategories from the category,
 * then randomly selects one candidate. If it's an article (ns==0), returns its URL.
 * If it's a subcategory (ns==14), the function calls itself with that subcategory.
 *
 * @param {string} category_title - The full title of the category (e.g., "Catégorie:Culture")
 * @return {string|null} - The URL of the random article or null if none found.
 */
function getRandomArticleRecursive(category_title) {
  // Get a sample of articles from this category
  let articles = getRandomArticlesWithRandomStart(category_title);
  // Get the list of subcategories for this category
  let subcats = getSubcategories(category_title);
  
  // Combine both lists
  let combined = articles.concat(subcats);
  if (combined.length === 0) return null;
  
  // Randomly pick one candidate from the combined list
  let random_index = Math.floor(Math.random() * combined.length);
  let candidate = combined[random_index];
  
  // If candidate is an article (namespace 0), return its URL
  if (candidate.ns === 0) {
    return "https://fr.wikipedia.org/?curid=" + candidate.pageid;
  }
  // If candidate is a subcategory (namespace 14), recursively search in that subcategory
  else if (candidate.ns === 14) {
    return getRandomArticleRecursive(candidate.title);
  }
  else {
    return null;
  }
}

/**
 * For a general theme (e.g., "Culture"), retrieves a random article URL
 * from the main category and recursively from its subcategories.
 *
 * @param {string} theme - The general theme (e.g., "Culture", "Sport", etc.)
 * @return {string|null} - The URL of the random article, or null if no result.
 */
function getRandomArticleFromTheme(theme) {
  let main_category = "Catégorie:" + theme;
  return getRandomArticleRecursive(main_category);
}

/**
 * Test function that logs 10 random article URLs for the "Culture" theme.
 */
function test() {
  let themes = [
    "Architecture", "Artisanat", "Dessin", "Cinéma", "Design", "Littérature", "Musique", "Photographie", "Sculpture", "Arts du spectacle", "Artiste", "Histoire de l'art", "Institution artistique", "Œuvre d'art", "Technique artistique", "Astronomie", "Biologie", "Chimie", "Mathématiques", "Physique", "Sciences de la Terre", "Anthropologie", "Archéologie", "Économie", "Géographie", "Histoire", "Linguistique", "Information", "Philosophie", "Psychologie", "Sociologie", "Chronologie", "Date", "Calendrier", "Siècle", "Année", "Événement", "Lieu", "Territoire", "Ville", "Continent", "Pays", "Alimentation", "Croyance", "Culture", "Divertissement", "Droit", "Éducation", "Idéologie", "Langue", "Médias", "Mode", "Organisation", "Groupe social", "Politique", "Santé", "Sexualité", "Sport", "Tourisme", "Travail", "Urbanisme", "Aéronautique", "Agriculture", "Astronautique", "Électricité", "Électronique", "Énergie", "Industrie", "Ingénierie", "Informatique", "Mécanique", "Médecine", "Métallurgie", "Plasturgie", "Robotique", "Sylviculture", "Télécommunications", "Transports", "Par période historique", "Par métier", "Par secteur d'activité", "Par nationalité"
  ];
  
  random_theme = themes[Math.floor(Math.random() * themes.length)]
  Logger.log('Theme is '+ random_theme)
  for (let i = 0; i < 10; i++) {
      let link = getRandomArticleFromTheme(random_theme);
      Logger.log(link)
  }

}
