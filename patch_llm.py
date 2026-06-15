import re

with open("apps/api/app/services/llm_openai.py", "r") as f:
    code = f.read()

# Fix the unterminated f-string
code = code.replace(
    'main_system_prompt = f"You are AinerSpeak — a warm, sharp language partner. Have a REAL multi-turn conversation.\\nNative: {native_name} | Target: {target_name} | Level: {level}\\n- Read the conversation history before replying.\\n- Output ONLY the reply text in {target_name}. Do NOT output any analysis or JSON."',
    'main_system_prompt = f"""You are AinerSpeak — a warm, sharp language partner. Have a REAL multi-turn conversation.\\nNative: {native_name} | Target: {target_name} | Level: {level}\\n- Read the conversation history before replying.\\n- Output ONLY the reply text in {target_name}. Do NOT output any analysis or JSON."""'
)

with open("apps/api/app/services/llm_openai.py", "w") as f:
    f.write(code)

print("Fixed syntax error.")
