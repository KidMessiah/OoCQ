// Simple seeded random number generator
function seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// Global debug date variable
let debugDate = null;

// Global function to set debug date
window.setDebugDate = function(dateString) {
    debugDate = new Date(dateString);
    console.log('Debug date set to:', debugDate);
    // Reload quote with new date
    loadQuoteOfTheDay();
};

// Separate the quote loading logic into its own function
async function loadQuoteOfTheDay() {
    try {
        let today = debugDate || new Date();

        const response = await fetch('quoteddata.json');
        const data = await response.json();
        
        // Process quotes and preserve markdown and attribution
        const quotes = data.messages
            .filter(msg => msg.content && msg.content.includes('~'))
            .map(msg => {
                const content = msg.content;
                // Extract the quote part (before the ~) and attribution
                let [quote, attribution] = content.split('~').map(part => part.trim());
                // Remove surrounding quotes if present
                quote = quote.replace(/^["']|["']$/g, '');
                
                // Convert markdown to HTML
                quote = quote
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
                    .replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic
                
                // Keep the markdown formatting intact
                return {
                    text: quote,
                    attribution: attribution,
                    author: msg.author.quoted
                };
            })
            .filter(q => q.text && q.author); // Remove any empty quotes
        
        // Use UTC date components for consistent seed across timezones
        const seed = Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate()
        ) / 86400000; // Convert to days since epoch for a simpler seed
        
        console.log('Using seed:', seed, 'for date:', today.toISOString());

        // Use seeded random to select quote
        const randomIndex = Math.floor(seededRandom(seed) * quotes.length);
        const quoteOfTheDay = quotes[randomIndex];
        
        // Get quote of the day element and update it with formatting
        const quoteEl = document.getElementById('quoteOfTheDay');
        if (quoteEl) {
            quoteEl.innerHTML = `Quote of the Day:<br>"${quoteOfTheDay.text}" ~ ${quoteOfTheDay.author}`;
        }
    } catch (error) {
        console.error('Error loading quote of the day:', error);
    }
}

document.addEventListener('DOMContentLoaded', loadQuoteOfTheDay);
