const fs = require('fs');
function fix(file) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/â€”/g, '-');
    content = content.replace(/LAUNCH PAD ACTIVE/g, 'Launch Pad Active');
    content = content.replace(/\.toUpperCase\(\)/g, '');
    content = content.replace(/LOG \{logMins\} MIN \{logType\}/g, 'Log {logMins} min {logType}');
    fs.writeFileSync(file, content, 'utf8');
}
fix('src/components/TodaysTasksShuffle.jsx');
fix('src/components/widgets/IOBalanceBar.jsx');
fix('src/components/modals/StatsModal.jsx');
fix('src/components/widgets/GoalsPanel.jsx');
