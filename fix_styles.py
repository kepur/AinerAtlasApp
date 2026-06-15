import re

with open('apps/web/src/styles.css', 'r') as f:
    css = f.read()

# 1. Fix .preference-save
if '.preference-save' not in css:
    css += '''
.preference-save {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--accent);
  color: #ffffff;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
  margin-top: 12px;
}
.preference-save:active {
  transform: scale(0.98);
}
.preference-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
'''

# 2. Fix .stat-card
stat_card_replacement = '''.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 4px;
  padding: 12px 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-glass);
  cursor: pointer;
  transition: border-color 0.2s;
  min-width: 0;
  word-break: break-word;
}
'''
css = re.sub(r'\.stat-card \{[\s\S]*?transition: border-color 0\.2s;\n\}', stat_card_replacement, css)

# 3. Fix .stat-card span
css = re.sub(r'\.stat-card span \{ font-size: 11px; color: var\(--text-muted\); \}', '.stat-card span { font-size: 10px; color: var(--text-muted); line-height: 1.2; }', css)

# 4. Fix .metric, .info
info_replacement = '''.metric, .info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-glass);
  min-width: 0;
  word-break: break-word;
}
'''
css = re.sub(r'\.metric, \.info \{[\s\S]*?background: var\(--bg-glass\);\n\}', info_replacement, css)

# 5. Fix .content-section
content_section_replacement = '''.content-section {
  margin: 16px;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}
'''
css = re.sub(r'\.content-section \{[\s\S]*?-webkit-backdrop-filter: var\(--glass-blur\);\n\}', content_section_replacement, css)

with open('apps/web/src/styles.css', 'w') as f:
    f.write(css)

print("CSS Fixed")
