import os

filepath = os.path.join(os.path.dirname(__file__), 'src/app/TableBoard.tsx')

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    (
        'import { getApiUrl, DEFAULT_SERVER_URL as SERVER_URL, authenticatedFetch } from "./apiUrl";',
        'import { getApiUrl, DEFAULT_SERVER_URL as SERVER_URL, authenticatedFetch, getAvatarUrl } from "./apiUrl";'
    ),
    (
        '<Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: \'#0073ea\' }}>\n                          {p.name ? p.name.charAt(0).toUpperCase() : \'?\'}\n                        </Avatar>',
        '<Avatar src={getAvatarUrl(p.avatar, p.name)} sx={{ width: 24, height: 24, fontSize: 12, bgcolor: \'#0073ea\' }}>{!p.avatar && (p.name ? p.name.charAt(0).toUpperCase() : \'?\')}</Avatar>'
    ),
    (
        '<Avatar sx={{ bgcolor: \'#0073ea\', width: 32, height: 32, fontSize: 14 }}>{user.name?.charAt(0).toUpperCase()}</Avatar>',
        '<Avatar src={getAvatarUrl(user.avatar, user.name)} sx={{ bgcolor: \'#0073ea\', width: 32, height: 32, fontSize: 14 }}>{!user.avatar && (user.name?.charAt(0).toUpperCase())}</Avatar>'
    ),
    (
        '<Avatar sx={{ width: 20, height: 20, mr: 1, fontSize: 10 }}>{option.name?.charAt(0).toUpperCase()}</Avatar>',
        '<Avatar src={getAvatarUrl(option.avatar, option.name)} sx={{ width: 20, height: 20, mr: 1, fontSize: 10 }}>{!option.avatar && (option.name?.charAt(0).toUpperCase())}</Avatar>'
    ),
    (
        'src={msg.senderAvatar ? (msg.senderAvatar.startsWith(\'http\') ? msg.senderAvatar : `${SERVER_URL}${msg.senderAvatar}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender)}&background=random&color=fff&bold=true`}',
        'src={getAvatarUrl(msg.senderAvatar, msg.sender)}'
    ),
    (
        'src={msg.senderAvatar ? (msg.senderAvatar.startsWith(\'http\') ? msg.senderAvatar : `${SERVER_URL}${msg.senderAvatar}`) : undefined}',
        'src={getAvatarUrl(msg.senderAvatar, msg.sender)}'
    ),
    (
        'src={act.userAvatar}',
        'src={getAvatarUrl(act.userAvatar, act.user)}'
    ),
    (
        'src={log.userAvatar ? (log.userAvatar.startsWith(\'http\') ? log.userAvatar : `${SERVER_URL}${log.userAvatar}`) : undefined}',
        'src={getAvatarUrl(log.userAvatar, log.user)}'
    ),
    (
        'src={comment.userAvatar ? (comment.userAvatar.startsWith(\'http\') ? comment.userAvatar : `${SERVER_URL}${comment.userAvatar}`) : undefined}',
        'src={getAvatarUrl(comment.userAvatar, comment.user)}'
    ),
    (
        'src={creator.avatar}',
        'src={getAvatarUrl(creator.avatar, creator.name)}'
    ),
    (
        'src={p.avatar}',
        'src={getAvatarUrl(p.avatar, p.name)}'
    ),
    (
        '<Avatar\n                      sx={{\n                        width: isMobile ? 24 : 28,\n                        height: isMobile ? 24 : 28,\n                        fontSize: isMobile ? 10 : 12,\n                        bgcolor: \'#0073ea\',\n                        border: `2px solid ${theme.palette.background.default}`,\n                        ml: i > 0 ? -1 : 0,\n                        zIndex: 10 - i\n                      }}\n                    >\n                      {p.name ? p.name.charAt(0).toUpperCase() : \'?\'}\n                    </Avatar>',
        '<Avatar src={getAvatarUrl(p.avatar, p.name)} sx={{ width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, fontSize: isMobile ? 10 : 12, bgcolor: \'#0073ea\', border: `2px solid ${theme.palette.background.default}`, ml: i > 0 ? -1 : 0, zIndex: 10 - i }}>{!p.avatar && (p.name ? p.name.charAt(0).toUpperCase() : \'?\')}</Avatar>'
    )
]

for src, dst in replacements:
    if src in content:
        content = content.replace(src, dst)
        print("Replaced:", repr(src[:30]))
    else:
        print("Not found:", repr(src[:30]))

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
