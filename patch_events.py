import os

def patch_file(filename, replacements):
    filepath = os.path.join(os.path.dirname(__file__), 'src/app', filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    changed = False
    for src, dst in replacements:
        if src in content:
            content = content.replace(src, dst)
            changed = True
            print(f"[{filename}] Replaced:", repr(src[:30]))
        else:
            print(f"[{filename}] Not found:", repr(src[:30]))

    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

# Patch TableBoard.tsx
patch_file('TableBoard.tsx', [
    (
        '  // Socket.IO State',
        '  // User loading logic\n  useEffect(() => {\n    const loadUser = () => {\n      const userJson = localStorage.getItem("user");\n      if (userJson) {\n        setCurrentUser(JSON.parse(userJson));\n      }\n    };\n    loadUser();\n    window.addEventListener(\'profile-updated\', loadUser);\n    return () => window.removeEventListener(\'profile-updated\', loadUser);\n  }, []);\n\n  // Socket.IO State'
    )
])

# Patch TopBar.tsx
patch_file('TopBar.tsx', [
    (
        '    fetchProfile();\n  }, []);',
        '    fetchProfile();\n    window.addEventListener(\'profile-updated\', fetchProfile);\n    return () => window.removeEventListener(\'profile-updated\', fetchProfile);\n  }, []);'
    )
])

# Patch Sidebar.tsx
patch_file('Sidebar.tsx', [
    (
        '    fetchUser();\n  }, []);',
        '    fetchUser();\n    window.addEventListener(\'profile-updated\', fetchUser);\n    return () => window.removeEventListener(\'profile-updated\', fetchUser);\n  }, []);'
    )
])

print("Done patching events")
