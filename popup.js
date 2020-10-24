var bracketToggle = document.getElementById('toggleBoth');
bracketToggle.addEventListener('click', function(e) {
    if (this.innerText == 'Use TP & SL') { this.innerText = 'Stop Loss Only'; } else {this.innerText = 'Use TP & SL'; }
});
var trailingBtn = document.getElementById('useTrailing');
trailingBtn.addEventListener('click', function(e) {
    if (this.innerText == 'Use Trailing Stop') { this.innerText = 'Use Static Stop'; } else {this.innerText = 'Use Trailing Stop'; }
});
var notifsBtn = document.getElementById('useNotifications');
notifsBtn.addEventListener('click', function(e) {
    if (this.innerText == 'Use Notifications') { this.innerText = 'No Notifications'; } else {this.innerText = 'Use Notifications'; }
});
var useSoundBtn = document.getElementById('useSounds');
useSoundBtn.addEventListener('click', function(e) {
    if (this.innerText == 'Use Sound') { this.innerText = 'No Sound'; } else {this.innerText = 'Use Sound'; }
});
//chrome.browserAction.setBadgeText({text: 'ON'});
//chrome.browserAction.setBadgeBackgroundColor({color: '#4688F1'});
