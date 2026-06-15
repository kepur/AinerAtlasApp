import re

with open('apps/web/src/MessageBubble.css', 'r') as f:
    css = f.read()

# Replace hardcoded colors with Lumina variables
css = re.sub(r'#6d28d9', 'var(--accent)', css)
css = re.sub(r'#5b21b6', 'var(--accent)', css)
css = re.sub(r'#3b1c8f', 'var(--text-primary)', css)
css = re.sub(r'#1a1a1a', 'var(--text-primary)', css)
css = re.sub(r'#111827', 'var(--text-primary)', css)
css = re.sub(r'#374151', 'var(--text-secondary)', css)
css = re.sub(r'#4b5563', 'var(--text-secondary)', css)
css = re.sub(r'#6b7280', 'var(--text-muted)', css)
css = re.sub(r'#9ca3af', 'var(--text-muted)', css)
css = re.sub(r'#a3a3a3', 'var(--text-muted)', css)
css = re.sub(r'#f5f3ff', 'rgba(79, 70, 229, 0.1)', css)
css = re.sub(r'#ede9fe', 'rgba(79, 70, 229, 0.15)', css)
css = re.sub(r'#f3f0ff', 'var(--border)', css)
css = re.sub(r'#f3f4f6', 'var(--border)', css)
css = re.sub(r'#fdfcff', 'rgba(255, 255, 255, 0.5)', css)
css = re.sub(r'#fff7ed', 'var(--success)', css)
css = re.sub(r'#c2410c', 'var(--success-text)', css)
css = re.sub(r'#10b981', 'var(--success-text)', css)
css = re.sub(r'#f59e0b', 'var(--accent-blue)', css)

# Update ai-card
css = re.sub(r'\.ai-card \{[\s\S]*?\}', '''.ai-card {
  background: var(--bg-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 24px rgba(0,0,0,0.04);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}''', css)

# Update composer
css = re.sub(r'\.chat-composer-rich \{[\s\S]*?\}', '''.chat-composer-rich {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  gap: 12px;
  border-top: 1px solid var(--border);
}''', css)

# Fix header
css = re.sub(r'\.chat-detail-header-rich \{[\s\S]*?\}', '''.chat-detail-header-rich {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid var(--border);
  z-index: 10;
}''', css)

with open('apps/web/src/MessageBubble.css', 'w') as f:
    f.write(css)

print("Updated MessageBubble.css")
