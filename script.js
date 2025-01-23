const nameColors = new Map();

function generatePastelColor() {
    // Generate lighter pastel colors that are readable on dark backgrounds
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 75%)`; // High lightness for readability on dark background
}

function getColorForName(name) {
    if (!nameColors.has(name)) {
        nameColors.set(name, generatePastelColor());
    }
    return nameColors.get(name);
}

let quotes = [];
let isDemonHours = false;

function cleanQuotes(text) {
    if (!text) return text;
    // Handle only the curly/smart quotes, preserving apostrophes
    return text.replace(/[\u201C\u201D""]/g, '');
}

function processText(text) {
    // First remove everything after and including ~
    text = text.replace(/~.+$/, '');
    
    // Handle markdown
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // Bold
               .replace(/\*(.+?)\*/g, '<em>$1</em>')             // Italic
               .replace(/_(.+?)_/g, '<em>$1</em>');             // Underscore italic

    return text;
}

async function loadQuotes() {
    try {
        const response = await fetch('./Quoteddata.json');
        const data = await response.json();
        quotes = data.messages.map(message => ({
            quote: cleanQuotes(message.content),
            sender: message.author.name,
            quotedPerson: message.author.quoted || "Unknown",
            timestamp: message.timestamp,
            color: message.author.color
        })).filter(quote => quote.quote.length > 0); // Filter out empty messages
        
        console.log('Processed quotes:', quotes);
        initializeFilters();
        displayQuotes(quotes);
        displayLeaderboard(); // Add initial leaderboard display
        populateYearFilter(); // Call this when initializing your page
    } catch (error) {
        console.error('Error loading quotes:', error);
        document.getElementById('quoteContainer').innerHTML = 
            `<div class="message error">Error loading quotes: ${error.message}</div>`;
    }
}

function initializeFilters() {
    const senders = [...new Set(quotes.map(quote => quote.sender))];
    const quoted = [...new Set(quotes.map(quote => quote.quotedPerson))];
    
    const senderFilter = document.getElementById('senderFilter');
    const quotedFilter = document.getElementById('quotedFilter');
    
    populateSelect(senderFilter, senders);
    populateSelect(quotedFilter, quoted);
}

function populateSelect(select, options) {
    select.innerHTML = '<option value="">All</option>';
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        select.appendChild(opt);
    });
}

function displayQuotes(filteredQuotes) {
    const container = document.getElementById('quoteContainer');
    container.innerHTML = '';
    
    if (filteredQuotes.length === 0) {
        container.innerHTML = '<div class="message">No quotes found</div>';
        return;
    }
    
    filteredQuotes.forEach(quote => {
        const messageDiv = createMessageElement(quote);
        container.appendChild(messageDiv);
    });
}

function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';

    const timestamp = new Date(message.timestamp);
    const formattedDate = `${timestamp.getDate()}/${timestamp.getMonth() + 1}/${timestamp.getFullYear()} ${timestamp.getHours()}:${timestamp.getMinutes().toString().padStart(2, '0')}`;
    
    const processedContent = processText(message.quote);
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <strong style="color: ${getColorForName(message.quotedPerson)}">${message.quotedPerson}</strong>
            <span class="timestamp">${formattedDate}</span>
        </div>
        <div class="message-content">${processedContent}</div>
        <small>Quoted by: ${message.sender}</small>
    `;

    return messageDiv;
}

// Update the filterQuotes function to handle the number input
function filterQuotes() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedSender = document.getElementById('senderFilter').value;
    const selectedQuoted = document.getElementById('quotedFilter').value;
    const selectedYear = document.getElementById('yearFilter').value;
    const selectedMonth = document.getElementById('monthFilter').value;
    const selectedDay = document.getElementById('dayFilter').value;
    
    let filtered = quotes.filter(quote => {
        const matchesSearch = quote.quote.toLowerCase().includes(searchTerm);
        const matchesSender = !selectedSender || quote.sender === selectedSender;
        const matchesQuoted = !selectedQuoted || quote.quotedPerson === selectedQuoted;
        
        // Date filtering
        const date = new Date(quote.timestamp);
        const matchesYear = !selectedYear || date.getFullYear() === parseInt(selectedYear);
        const matchesMonth = selectedMonth === '' || date.getMonth() === parseInt(selectedMonth);
        const matchesDay = !selectedDay || date.getDate() === parseInt(selectedDay);
        
        const isDemonTime = !isDemonHours || (date.getHours() >= 0 && date.getHours() < 5);

        return matchesSearch && matchesSender && matchesQuoted && 
               matchesYear && matchesMonth && matchesDay && isDemonTime;
    });
    
    displayQuotes(filtered);
}

function getRandomQuote() {
    const selectedSender = document.getElementById('senderFilter').value;
    const selectedQuoted = document.getElementById('quotedFilter').value;
    
    let filtered = quotes.filter(quote => {
        const matchesSender = !selectedSender || quote.sender === selectedSender;
        const matchesQuoted = !selectedQuoted || quote.quotedPerson === selectedQuoted;
        return matchesSender && matchesQuoted;
    });
    
    if (filtered.length > 0) {
        const randomQuote = filtered[Math.floor(Math.random() * filtered.length)];
        displayQuotes([randomQuote]);
    }
}

function calculateLeaderboard() {
    const quotedCounts = {};
    const senderCounts = {};
    
    quotes.forEach(quote => {
        // Count quoted people
        if (quote.quotedPerson) {
            quotedCounts[quote.quotedPerson] = (quotedCounts[quote.quotedPerson] || 0) + 1;
        }
        
        // Count senders
        if (quote.sender) {
            senderCounts[quote.sender] = (senderCounts[quote.sender] || 0) + 1;
        }
    });
    
    return {
        quoted: Object.entries(quotedCounts)
            .sort(([,a], [,b]) => b - a),
        senders: Object.entries(senderCounts)
            .sort(([,a], [,b]) => b - a)
    };
}

function displayLeaderboard() {
    const leaderboard = calculateLeaderboard();
    const quotedLeaderboard = document.getElementById('quotedLeaderboard');
    const senderLeaderboard = document.getElementById('senderLeaderboard');
    
    // Display most quoted people
    quotedLeaderboard.innerHTML = leaderboard.quoted
        .map(([name, count]) => `
            <div class="leaderboard-item">
                <span>${name}</span>
                <span>${count}</span>
            </div>
        `).join('');
    
    // Display most active recorders
    senderLeaderboard.innerHTML = leaderboard.senders
        .map(([name, count]) => `
            <div class="leaderboard-item">
                <span>${name}</span>
                <span>${count}</span>
            </div>
        `).join('');
}

// Update resetFilters to include date filters
function resetFilters() {
    document.getElementById('senderFilter').value = '';
    document.getElementById('quotedFilter').value = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('yearFilter').value = '';
    document.getElementById('monthFilter').value = '';
    document.getElementById('dayFilter').value = '';
    displayQuotes(quotes);
}

// Event listeners
document.getElementById('searchInput').addEventListener('input', filterQuotes);
document.getElementById('senderFilter').addEventListener('change', filterQuotes);
document.getElementById('quotedFilter').addEventListener('change', filterQuotes);
document.getElementById('randomQuote').addEventListener('click', getRandomQuote);
document.getElementById('resetFilters').addEventListener('click', resetFilters);

// Add event listeners for date filters
document.getElementById('yearFilter').addEventListener('change', filterQuotes);
document.getElementById('monthFilter').addEventListener('change', filterQuotes);
document.getElementById('dayFilter').addEventListener('input', filterQuotes);

// Remove the FlameEffect class and replace the demon hours event listener with:
document.addEventListener('DOMContentLoaded', () => {
    const demonButton = document.getElementById('demonHours');
    
    demonButton.addEventListener('click', function() {
        isDemonHours = !isDemonHours;
        this.classList.toggle('active');
        filterQuotes();
    });
});

// Load quotes when page loads
document.addEventListener('DOMContentLoaded', loadQuotes);

function createQuoteElement(quote) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';

    // Format the timestamp to include date and time
    const timestamp = new Date(quote.timestamp);
    const formattedDate = `${timestamp.getDate()}/${timestamp.getMonth() + 1}/${timestamp.getFullYear()} ${timestamp.getHours()}:${timestamp.getMinutes().toString().padStart(2, '0')}`;

    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="author">${quote.author.name}</span>
            <span class="timestamp">${formattedDate}</span>
        </div>
        <div class="content">${quote.content}</div>
    `;
    return messageDiv;
}

// Helper function to parse dates from the JSON format
function parseDate(dateStr) {
    // Convert "2021-03-24T18:25:33.486+11:00" to Date object
    return new Date(dateStr);
}

// Populate year filter
function populateYearFilter() {
    const yearFilter = document.getElementById('yearFilter');
    const years = new Set();
    years.add(''); // Add empty option for "All"
    
    quotes.forEach(msg => {
        const date = parseDate(msg.timestamp);
        years.add(date.getFullYear());
    });
    
    const sortedYears = Array.from(years).sort();
    yearFilter.innerHTML = `<option value="">All</option>` +
        sortedYears.filter(year => year !== '').map(year => 
            `<option value="${year}">${year}</option>`).join('');
}

// Filter messages by date
function filterByDate(messages) {
    const year = document.getElementById('yearFilter').value;
    const month = document.getElementById('monthFilter').value;
    const day = document.getElementById('dayFilter').value;
    
    return messages.filter(msg => {
        const date = parseDate(msg.timestamp);
        
        if (year && date.getFullYear() !== parseInt(year)) return false;
        if (month !== '' && date.getMonth() !== parseInt(month)) return false;
        if (day && date.getDate() !== parseInt(day)) return false;
        
        return true;
    });
}

// Add these to your existing event listeners
document.getElementById('yearFilter').addEventListener('change', () => {
    filterAndDisplayMessages();
});

document.getElementById('monthFilter').addEventListener('change', () => {
    filterAndDisplayMessages();
});

document.getElementById('dayFilter').addEventListener('change', filterAndDisplayMessages);

// Modify your existing filterAndDisplayMessages function to include date filtering
function filterAndDisplayMessages() {
    let filtered = [...quotes];
    
    // Add date filtering to your existing filters
    filtered = filterByDate(filtered);
    
    // Your existing filter logic here
    filtered = filtered.filter(quote => {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const selectedSender = document.getElementById('senderFilter').value;
        const selectedQuoted = document.getElementById('quotedFilter').value;
        
        const matchesSearch = quote.quote.toLowerCase().includes(searchTerm);
        const matchesSender = !selectedSender || quote.sender === selectedSender;
        const matchesQuoted = !selectedQuoted || quote.quotedPerson === selectedQuoted;
        return matchesSearch && matchesSender && matchesQuoted;
    });
    
    displayQuotes(filtered);
}
