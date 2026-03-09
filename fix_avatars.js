const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/TableBoard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Restore import
content = content.replace(
  'import { getApiUrl, DEFAULT_SERVER_URL as SERVER_URL, authenticatedFetch } from "./apiUrl";',
  'import { getApiUrl, DEFAULT_SERVER_URL as SERVER_URL, authenticatedFetch, getAvatarUrl } from "./apiUrl";'
);

// 2. Fix Avatar src logic locally
content = content.replace(
  /<Avatar\\s*\\n\\s*sx={{([^}]*)}}\\s*>\\s*\\n\\s*\\{p\\.name \\? p\\.name\\.charAt\\(0\\)\\.toUpperCase\\(\\) : '\\?'\\}\\s*\\n\\s*<\\/Avatar>/g,
  '<Avatar src={getAvatarUrl(p.avatar, p.name)} sx={{$1}}>{!p.avatar && (p.name ? p.name.charAt(0).toUpperCase() : \'?\')}</Avatar>'
);

// We can just use simple string replace loop for exact strings
const replacements = [
  [
    "<Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: '#0073ea' }}>\\n                          {p.name ? p.name.charAt(0).toUpperCase() : '?'}\\n                        </Avatar>",
    "<Avatar src={getAvatarUrl(p.avatar, p.name)} sx={{ width: 24, height: 24, fontSize: 12, bgcolor: '#0073ea' }}>\\n                          {!p.avatar && (p.name ? p.name.charAt(0).toUpperCase() : '?')}\\n                        </Avatar>"
  ],
  [
    "<Avatar sx={{ bgcolor: '#0073ea', width: 32, height: 32, fontSize: 14 }}>{user.name?.charAt(0).toUpperCase()}</Avatar>",
    "<Avatar src={getAvatarUrl(user.avatar, user.name)} sx={{ bgcolor: '#0073ea', width: 32, height: 32, fontSize: 14 }}>{!user.avatar && (user.name?.charAt(0).toUpperCase())}</Avatar>"
  ],
  [
    "<Avatar sx={{ width: 20, height: 20, mr: 1, fontSize: 10 }}>{option.name?.charAt(0).toUpperCase()}</Avatar>",
    "<Avatar src={getAvatarUrl(option.avatar, option.name)} sx={{ width: 20, height: 20, mr: 1, fontSize: 10 }}>{!option.avatar && (option.name?.charAt(0).toUpperCase())}</Avatar>"
  ],
  [
    "src={msg.senderAvatar ? (msg.senderAvatar.startsWith('http') ? msg.senderAvatar : `${SERVER_URL}${msg.senderAvatar}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender)}&background=random&color=fff&bold=true`}",
    "src={getAvatarUrl(msg.senderAvatar, msg.sender)}"
  ],
  [
    "src={msg.senderAvatar ? (msg.senderAvatar.startsWith('http') ? msg.senderAvatar : `${SERVER_URL}${msg.senderAvatar}`) : undefined}",
    "src={getAvatarUrl(msg.senderAvatar, msg.sender)}"
  ],
  [
    "src={act.userAvatar}",
    "src={getAvatarUrl(act.userAvatar, act.user)}"
  ],
  [
    "src={log.userAvatar ? (log.userAvatar.startsWith('http') ? log.userAvatar : `${SERVER_URL}${log.userAvatar}`) : undefined}",
    "src={getAvatarUrl(log.userAvatar, log.user)}"
  ],
  [
    "src={comment.userAvatar ? (comment.userAvatar.startsWith('http') ? comment.userAvatar : `${SERVER_URL}${comment.userAvatar}`) : undefined}",
    "src={getAvatarUrl(comment.userAvatar, comment.user)}"
  ],
  [
    "src={creator.avatar}",
    "src={getAvatarUrl(creator.avatar, creator.name)}"
  ],
  [
    "src={p.avatar}",
    "src={getAvatarUrl(p.avatar, p.name)}"
  ],
  [
    "<Avatar\\n                      sx={{\\n                        width: isMobile ? 24 : 28,\\n                        height: isMobile ? 24 : 28,\\n                        fontSize: isMobile ? 10 : 12,\\n                        bgcolor: '#0073ea',\\n                        border: `2px solid ${theme.palette.background.default}`,\\n                        ml: i > 0 ? -1 : 0,\\n                        zIndex: 10 - i\\n                      }}\\n                    >\\n                      {p.name ? p.name.charAt(0).toUpperCase() : '?'}\\n                    </Avatar>",
    "<Avatar\\n                      src={getAvatarUrl(p.avatar, p.name)}\\n                      sx={{\\n                        width: isMobile ? 24 : 28,\\n                        height: isMobile ? 24 : 28,\\n                        fontSize: isMobile ? 10 : 12,\\n                        bgcolor: '#0073ea',\\n                        border: `2px solid ${theme.palette.background.default}`,\\n                        ml: i > 0 ? -1 : 0,\\n                        zIndex: 10 - i\\n                      }}\\n                    >\\n                      {!p.avatar && (p.name ? p.name.charAt(0).toUpperCase() : '?')}\\n                    </Avatar>"
  ]
];

replacements.forEach(([search, replace]) => {
  // Use split/join for global string replacement
  const parts = content.split(search.replace(/\\\\n/g, '\\n'));
  if (parts.length > 1) {
      content = parts.join(replace.replace(/\\\\n/g, '\\n'));
  } else {
      console.log("Could not find:", search);
  }
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed TableBoard.tsx avatars');
